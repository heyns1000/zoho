# HSOMNI9000 Architecture Documentation

## System Overview

HSOMNI9000 is a hybrid cloud architecture combining Cloudflare's global infrastructure with Zoho's business applications to create an enterprise-grade data management system capable of handling 9,000+ brands and 100M+ data points.

## Architecture Layers

### Layer 1: Cloudflare Foundation

**Purpose**: Global infrastructure, storage, and security

**Components**:
- **DNS Management**: Authoritative DNS for all 9,000 domains
- **R2 Object Storage**: Primary data lake (S3-compatible)
- **Workers**: Edge compute for API endpoints
- **Zero Trust**: Identity-based access control
- **CDN**: Global content delivery

**Data Flow**:
```
Client Request → Cloudflare Edge → Workers API → R2 Storage
                                              → Zoho Integration
```

### Layer 2: Zoho Intelligence Hub

**Purpose**: Data processing, workflows, and business logic

**Components**:
- **Catalyst**: Serverless functions (Node.js)
- **Flow**: Workflow automation and orchestration
- **Creator**: Searchable database (100M record index)
- **Vault**: Encrypted credential storage
- **WorkDrive**: Temporary file staging
- **Mail**: Unified email dashboard
- **Analytics**: Monitoring and reporting

**Processing Pipeline**:
```
1. Intake (Flow webhook)
2. Validation (Catalyst function)
3. Deduplication (Creator lookup)
4. Enrichment (Metadata extraction)
5. Secret Scanning (Regex detection)
6. Upload to R2 (S3 API)
7. Indexing (Creator record)
8. Cleanup (Delete staging)
```

### Layer 3: External Data Sources

**Purpose**: Integration with platforms and services

**Sources**:
- Google Drive, Workspace, Gmail
- GitHub repositories
- Microsoft OneDrive, Outlook
- Vercel, Replit deployments
- Alibaba Cloud OSS
- OpenAI, Claude, Gemini, Grok APIs
- iCloud Drive
- Payment gateways, CRM systems

## Data Flow Architecture

### Complete Flow Diagram

```
┌────────────────────────────────────────────────────┐
│ External Platform (e.g., Google Drive)             │
│ - File created/modified                            │
│ - Webhook triggered                                │
└────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────┐
│ Zoho Flow                                          │
│ - Receives webhook                                 │
│ - Downloads file                                   │
│ - Stages in WorkDrive                              │
└────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────┐
│ Zoho Catalyst Function: vault-to-r2-sync          │
│ Step 1: Validate (checksum, size, format)         │
│ Step 2: Check duplicates (SHA-256 hash)           │
│ Step 3: Scan for secrets (regex patterns)         │
│ Step 4: Extract metadata (EXIF, properties)       │
│ Step 5: Sanitize (remove secrets)                 │
└────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────┐
│ Secrets Found?                                     │
│ Yes → Store in Zoho Vault (encrypted)             │
│ No  → Continue                                     │
└────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────┐
│ Cloudflare R2 Upload                               │
│ - Path: /brands/{id}/{source}/{file}              │
│ - Metadata in object headers                       │
│ - Global replication automatic                     │
└────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────┐
│ Zoho Creator Index                                 │
│ - Create searchable record                         │
│ - Link to R2 path                                  │
│ - Store metadata                                   │
└────────────────────────────────────────────────────┘
                    ↓
┌────────────────────────────────────────────────────┐
│ Cleanup & Notification                             │
│ - Delete from WorkDrive staging                    │
│ - Send Cliq notification                           │
│ - Update Analytics dashboard                       │
└────────────────────────────────────────────────────┘
```

## Security Architecture

### Authentication & Authorization

**Cloudflare Zero Trust**:
```
User Request → Zero Trust Check → Identity Verification
                                → Policy Evaluation
                                → Access Grant/Deny
```

**Access Policies**:
- Owner (Heyns): Full access, MFA required
- Brand Managers: Read-only to own brand
- Automation: Service tokens, Workers only
- Audit: Read-only all, extensive logging

### Encryption Standards

**Data in Transit**:
- TLS 1.3 for all connections
- Certificate pinning for critical APIs
- Perfect forward secrecy

**Data at Rest**:
- R2: AES-256-GCM (Cloudflare managed)
- Vault: AES-256 (Zoho managed)
- Application-level: Field encryption for PII

### Secret Management

**Workflow**:
```
1. File scanned for patterns:
   - API keys (sk-, api_, AIza, etc.)
   - Tokens (ghp_, pk_, Bearer)
   - Passwords (password=, pwd=)
   - Private keys (BEGIN PRIVATE KEY)

2. Secrets extracted and stored:
   - Zoho Vault chamber per brand
   - Encrypted at rest
   - Access logged

3. File sanitized:
   - Secrets replaced with placeholders
   - Original stored in separate secure location
   - Sanitized version uploaded to R2
```

## Scalability Design

### Current Capacity

- **Files**: 100M+ indexed records
- **Storage**: 10TB (expandable to petabytes)
- **Domains**: 9,000 (expandable infinitely)
- **Brands**: 9,000 (expandable infinitely)
- **API Requests**: 10M/day (Workers: 100K requests/day free, unlimited paid)

### Scaling Strategy

**Horizontal Scaling**:
- R2: Unlimited capacity, no manual scaling
- Workers: Auto-scales to billions of requests
- Catalyst: Auto-scales based on load

**Vertical Scaling**:
- Creator: Upgrade to higher tiers for more records
- Flow: Upgrade for more workflow executions

### Performance Optimization

**Caching**:
```
Level 1: Cloudflare CDN (global edge cache)
Level 2: Workers KV (key-value store)
Level 3: R2 (origin storage)
```

**Deduplication**:
- SHA-256 hash comparison
- Content-based matching
- Version detection
- Saves 30-40% storage

## Disaster Recovery

### Backup Strategy

**R2 Data**:
- Versioning enabled (30-day retention)
- Cross-region replication
- Weekly snapshots to separate bucket

**Zoho Data**:
- Daily exports via API
- Stored in R2
- 90-day retention

**Configuration**:
- Git repository (this repo)
- Version controlled
- Automated backups

### Recovery Procedures

**RTO (Recovery Time Objective)**: 4 hours
**RPO (Recovery Point Objective)**: 24 hours

**Recovery Steps**:
1. Spin up new Workers deployment
2. Point DNS to new Workers
3. Restore R2 from latest snapshot
4. Re-import Zoho data from backups
5. Verify integrity
6. Resume operations

## Monitoring Architecture

### Metrics Collection

**Infrastructure Metrics**:
- R2: Storage used, bandwidth, request count
- Workers: Request rate, error rate, execution time
- Catalyst: Function invocations, errors, duration

**Application Metrics**:
- Sync success rate
- Deduplication rate
- Secret detection rate
- File processing time

### Alerting Rules

```yaml
Storage Alert:
  condition: storage_used_percent > 90
  severity: warning
  notification: email + cliq

Sync Failure Alert:
  condition: failed_syncs > 100/day
  severity: critical
  notification: email + cliq + sms

API Error Alert:
  condition: error_rate > 5%
  severity: warning
  notification: cliq

Secret Detection:
  condition: secrets_found > 0
  severity: info
  notification: cliq
```

### Dashboards

**Zoho Analytics Dashboards**:
1. **Overview**: Total files, storage, sync status
2. **Performance**: Sync times, error rates, throughput
3. **Security**: Secrets detected, access logs
4. **Cost**: Storage costs, API usage, projections

## Cost Architecture

### Infrastructure Costs

| Component | Free Tier | Paid Usage | Monthly Cost |
|-----------|-----------|------------|--------------|
| R2 Storage | 10 GB | 10 TB | $150 |
| R2 Operations | 1M Class A | 10M/month | Included |
| Workers | 100K req/day | Unlimited | $5 |
| Zero Trust | 50 users | 1 user | $0 |
| Zoho One | - | 1 user | $45 |
| **Total** | | | **$200** |

### Cost Optimization

**Strategies**:
1. Aggressive deduplication (saves 30-40%)
2. Lifecycle policies (archive old files to cheaper storage)
3. Cache frequently accessed files
4. Bulk API requests to reduce operation costs
5. Negotiate Zoho volume discount

**Projected Savings**:
- Deduplication: $45-60/month
- Lifecycle: $20-30/month
- Bulk discount: $15-20/month
- **Total optimized**: ~$150-175/month

## Technology Stack

### Core Technologies

**Frontend**:
- HTML5, CSS3, JavaScript
- GitHub Pages (static hosting)
- Custom domain (zoho.faa.zone)

**Backend**:
- Cloudflare Workers (JavaScript/V8)
- Zoho Catalyst (Node.js)
- Python (automation scripts)

**Storage**:
- Cloudflare R2 (S3-compatible object storage)
- Zoho Creator (relational database)
- Zoho Vault (encrypted key-value)

**Automation**:
- Zoho Flow (visual workflows)
- Rclone (cloud sync)
- Cron (scheduled tasks)

### Development Tools

- Git (version control)
- GitHub (repository hosting)
- VS Code (development)
- Wrangler (Workers deployment)
- Zoho CLI (Catalyst deployment)

## API Architecture

### RESTful Endpoints

**Base URL**: `https://api.zoho.faa.zone`

**Authentication**: Bearer token in Authorization header

**Endpoints**:
```
Files:
  GET    /api/files              # List files
  GET    /api/files/{key}        # Get file
  POST   /api/files              # Upload file
  DELETE /api/files/{key}        # Delete file

Sync:
  POST   /api/sync/google-drive  # Trigger Google Drive sync
  POST   /api/sync/github        # Trigger GitHub sync
  POST   /api/sync/all           # Trigger all syncs
  GET    /api/sync/status        # Get sync status

Stats:
  GET    /api/stats              # Overall statistics
  GET    /api/stats/storage      # Storage metrics

Brands:
  GET    /api/brands             # List brands
  POST   /api/brands             # Create brand
```

### Rate Limiting

- 1,000 requests/hour per API key
- 10,000 requests/day per API key
- Burst: 100 requests/minute

### Response Format

```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2025-01-01T00:00:00Z",
    "version": "1.0"
  }
}
```

---

**Last Updated**: 2025-01-01
**Version**: 1.0
**Maintained By**: Heyns Schoeman | Fruitful Global Planet
