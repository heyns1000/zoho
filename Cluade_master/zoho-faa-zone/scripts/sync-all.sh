#!/bin/bash

# HSOMNI9000 Master Sync Script
# Syncs all platforms to Cloudflare R2
# Author: Heyns Schoeman | Fruitful Global Planet

set -e  # Exit on error

# Load credentials
if [ -f ~/.hsomni9000/credentials.env ]; then
    source ~/.hsomni9000/credentials.env
else
    echo "❌ Credentials file not found!"
    echo "Please copy config/credentials.example.env to ~/.hsomni9000/credentials.env"
    exit 1
fi

LOG_FILE=~/r2-sync.log
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "========================================" | tee -a $LOG_FILE
echo "🚀 HSOMNI9000 Full Sync Started" | tee -a $LOG_FILE
echo "📅 $TIMESTAMP" | tee -a $LOG_FILE
echo "========================================" | tee -a $LOG_FILE

# Function to log with timestamp
log() {
    echo "$(date '+%H:%M:%S') $1" | tee -a $LOG_FILE
}

# Function to sync with error handling
safe_sync() {
    local source=$1
    local dest=$2
    local name=$3
    
    log "📁 Syncing $name..."
    if rclone sync "$source" "$dest" --log-file=$LOG_FILE --stats-one-line 2>&1; then
        log "✅ $name synced successfully"
    else
        log "❌ $name sync failed"
        return 1
    fi
}

# 1. Sync Mac local folders
log "🖥️  Mac Folders"
safe_sync ~/Documents cloudflare-r2:hsomni9000-vault/mac-documents "Documents"
safe_sync ~/Desktop cloudflare-r2:hsomni9000-vault/mac-desktop "Desktop"
safe_sync ~/Downloads cloudflare-r2:hsomni9000-vault/mac-downloads "Downloads"

# 2. Sync Google Drive (if configured)
if rclone listremotes | grep -q "google-drive"; then
    log "☁️  Google Drive"
    safe_sync google-drive: cloudflare-r2:hsomni9000-vault/google-drive "Google Drive"
else
    log "⚠️  Google Drive not configured, skipping"
fi

# 3. Sync OneDrive (if configured)
if rclone listremotes | grep -q "onedrive"; then
    log "☁️  OneDrive"
    safe_sync onedrive: cloudflare-r2:hsomni9000-vault/onedrive "OneDrive"
else
    log "⚠️  OneDrive not configured, skipping"
fi

# 4. Sync iCloud Drive
if [ -d "$HOME/Library/Mobile Documents/com~apple~CloudDocs" ]; then
    log "☁️  iCloud Drive"
    safe_sync "$HOME/Library/Mobile Documents/com~apple~CloudDocs/" \
        cloudflare-r2:hsomni9000-vault/icloud-drive "iCloud Drive"
else
    log "⚠️  iCloud Drive not found, skipping"
fi

# 5. Backup GitHub repos (if gh CLI installed)
if command -v gh &> /dev/null; then
    log "💻 GitHub Repositories"
    mkdir -p ~/github-backup
    cd ~/github-backup
    
    # Get list of repos and clone/update
    gh repo list --limit 1000 --json nameWithOwner | \
        jq -r '.[].nameWithOwner' | while read repo; do
        repo_dir=$(basename $repo)
        if [ -d "$repo_dir" ]; then
            log "  Updating $repo"
            cd "$repo_dir" && git pull && cd ..
        else
            log "  Cloning $repo"
            git clone "git@github.com:$repo.git"
        fi
    done
    
    # Sync to R2
    safe_sync ~/github-backup cloudflare-r2:hsomni9000-vault/github-repos "GitHub Repos"
else
    log "⚠️  GitHub CLI not installed, skipping"
fi

# 6. Export Zoho data (if Python installed)
if command -v python3 &> /dev/null; then
    log "📧 Zoho Data Export"
    if [ -f scripts/zoho-export.py ]; then
        python3 scripts/zoho-export.py
        rclone copy zoho_*_export.json cloudflare-r2:hsomni9000-vault/zoho-data/
        rm zoho_*_export.json
        log "✅ Zoho data exported"
    else
        log "⚠️  Zoho export script not found"
    fi
fi

# 7. Generate sync report
log "📊 Generating sync report..."
TOTAL_SIZE=$(rclone size cloudflare-r2:hsomni9000-vault --json | jq -r '.bytes')
TOTAL_FILES=$(rclone size cloudflare-r2:hsomni9000-vault --json | jq -r '.count')
TOTAL_SIZE_GB=$(echo "scale=2; $TOTAL_SIZE / 1024 / 1024 / 1024" | bc)

log "========================================" 
log "✅ Sync Complete!" 
log "📦 Total Files: $TOTAL_FILES"
log "💾 Total Size: ${TOTAL_SIZE_GB}GB"
log "🕐 Completed: $(date '+%Y-%m-%d %H:%M:%S')"
log "========================================" 

# Send notification (optional - requires Zoho Cliq webhook)
if [ ! -z "$ZOHO_CLIQ_WEBHOOK" ]; then
    curl -X POST "$ZOHO_CLIQ_WEBHOOK" \
        -H "Content-Type: application/json" \
        -d "{\"text\": \"✅ HSOMNI9000 Sync Complete\n📦 $TOTAL_FILES files\n💾 ${TOTAL_SIZE_GB}GB\"}"
fi

exit 0
