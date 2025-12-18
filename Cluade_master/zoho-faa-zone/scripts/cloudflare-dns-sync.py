#!/usr/bin/env python3
"""
Cloudflare DNS Automation for Zoho Mail
Automatically configures DNS records for all domains to point to Zoho Mail
Author: Heyns Schoeman | Fruitful Global Planet
"""

import requests
import csv
import os
import time
import sys
from typing import Dict, List

# Load credentials
CF_API_TOKEN = os.getenv('CF_API_TOKEN')
CF_ACCOUNT_ID = os.getenv('CF_ACCOUNT_ID')

if not CF_API_TOKEN:
    print("❌ CF_API_TOKEN not found in environment!")
    print("Please source your credentials file:")
    print("  source ~/.hsomni9000/credentials.env")
    sys.exit(1)

CLOUDFLARE_API = "https://api.cloudflare.com/client/v4"
HEADERS = {
    'Authorization': f'Bearer {CF_API_TOKEN}',
    'Content-Type': 'application/json'
}

# Zoho Mail DNS records template
ZOHO_MX_RECORDS = [
    {'priority': 10, 'content': 'mx.zoho.com'},
    {'priority': 20, 'content': 'mx2.zoho.com'},
    {'priority': 50, 'content': 'mx3.zoho.com'}
]

def get_zone_id(domain_name: str) -> str:
    """Get Cloudflare zone ID for a domain"""
    response = requests.get(
        f'{CLOUDFLARE_API}/zones',
        params={'name': domain_name},
        headers=HEADERS
    )
    
    if response.status_code != 200:
        print(f"❌ Error getting zone for {domain_name}: {response.text}")
        return None
    
    data = response.json()
    if data['result']:
        return data['result'][0]['id']
    
    # Zone doesn't exist, create it
    print(f"  Creating new zone for {domain_name}...")
    create_response = requests.post(
        f'{CLOUDFLARE_API}/zones',
        headers=HEADERS,
        json={
            'name': domain_name,
            'account': {'id': CF_ACCOUNT_ID},
            'jump_start': False
        }
    )
    
    if create_response.status_code == 200:
        return create_response.json()['result']['id']
    else:
        print(f"❌ Failed to create zone: {create_response.text}")
        return None

def create_dns_record(zone_id: str, record_type: str, name: str, content: str, priority: int = None) -> bool:
    """Create a DNS record in Cloudflare"""
    payload = {
        'type': record_type,
        'name': name,
        'content': content,
        'ttl': 3600,
        'proxied': False  # Don't proxy email records
    }
    
    if priority is not None:
        payload['priority'] = priority
    
    response = requests.post(
        f'{CLOUDFLARE_API}/zones/{zone_id}/dns_records',
        headers=HEADERS,
        json=payload
    )
    
    if response.status_code == 200:
        return True
    else:
        # Check if record already exists
        if 'already exists' in response.text.lower():
            print(f"    ℹ️  Record already exists: {record_type} {name}")
            return True
        print(f"    ❌ Failed to create {record_type} record: {response.text}")
        return False

def configure_zoho_dns(domain_name: str, zone_id: str, verification_code: str = None):
    """Configure all required DNS records for Zoho Mail"""
    print(f"\n📧 Configuring DNS for {domain_name}")
    
    success_count = 0
    total_records = 0
    
    # MX Records
    print("  Adding MX records...")
    for mx in ZOHO_MX_RECORDS:
        total_records += 1
        if create_dns_record(zone_id, 'MX', '@', mx['content'], mx['priority']):
            success_count += 1
            print(f"    ✅ MX {mx['priority']}: {mx['content']}")
    
    # SPF Record
    print("  Adding SPF record...")
    total_records += 1
    if create_dns_record(zone_id, 'TXT', '@', 'v=spf1 include:zoho.com ~all'):
        success_count += 1
        print("    ✅ SPF: v=spf1 include:zoho.com ~all")
    
    # Zoho Verification (if provided)
    if verification_code:
        print("  Adding verification record...")
        total_records += 1
        if create_dns_record(zone_id, 'TXT', '@', f'zoho-verification={verification_code}'):
            success_count += 1
            print(f"    ✅ Verification: {verification_code[:20]}...")
    
    # DMARC Record
    print("  Adding DMARC record...")
    total_records += 1
    dmarc_content = f'v=DMARC1; p=quarantine; rua=mailto:dmarc@{domain_name}'
    if create_dns_record(zone_id, 'TXT', '_dmarc', dmarc_content):
        success_count += 1
        print("    ✅ DMARC configured")
    
    print(f"  📊 {success_count}/{total_records} records configured")
    return success_count == total_records

def bulk_configure_from_csv(csv_file: str):
    """Configure DNS for all domains in CSV file"""
    print(f"🚀 Starting bulk DNS configuration from {csv_file}")
    print("=" * 60)
    
    if not os.path.exists(csv_file):
        print(f"❌ File not found: {csv_file}")
        return
    
    success = 0
    failed = 0
    
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            domain_name = row.get('domain_name')
            verification_code = row.get('verification_code', '')
            
            if not domain_name:
                continue
            
            try:
                zone_id = get_zone_id(domain_name)
                if zone_id:
                    if configure_zoho_dns(domain_name, zone_id, verification_code):
                        success += 1
                    else:
                        failed += 1
                else:
                    failed += 1
                
                # Rate limiting
                time.sleep(0.5)
                
            except Exception as e:
                print(f"❌ Error configuring {domain_name}: {str(e)}")
                failed += 1
    
    print("\n" + "=" * 60)
    print("✅ Bulk DNS Configuration Complete!")
    print(f"📊 Success: {success} domains")
    print(f"❌ Failed: {failed} domains")
    print("=" * 60)

def configure_single_domain(domain_name: str, verification_code: str = None):
    """Configure DNS for a single domain"""
    zone_id = get_zone_id(domain_name)
    if zone_id:
        configure_zoho_dns(domain_name, zone_id, verification_code)
    else:
        print(f"❌ Failed to get/create zone for {domain_name}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Configure Cloudflare DNS for Zoho Mail')
    parser.add_argument('--domain', help='Single domain to configure')
    parser.add_argument('--verification', help='Zoho verification code')
    parser.add_argument('--csv', help='CSV file with domains to configure')
    parser.add_argument('--test', action='store_true', help='Test with fruitful-global-planet.com')
    
    args = parser.parse_args()
    
    if args.test:
        print("🧪 Testing with fruitful-global-planet.com")
        configure_single_domain('fruitful-global-planet.com', 'test123')
    elif args.domain:
        configure_single_domain(args.domain, args.verification)
    elif args.csv:
        bulk_configure_from_csv(args.csv)
    else:
        print("Usage:")
        print("  Single domain: python cloudflare-dns-sync.py --domain example.com --verification abc123")
        print("  Bulk from CSV: python cloudflare-dns-sync.py --csv domains.csv")
        print("  Test: python cloudflare-dns-sync.py --test")
