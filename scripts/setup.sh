#!/bin/bash

# HSOMNI9000 Quick Setup Script
# One-command setup for the entire infrastructure
# Author: Heyns Schoeman | Fruitful Global Planet

set -e

echo "========================================="
echo "🚀 HSOMNI9000 QUICK SETUP"
echo "========================================="
echo ""

# Check if running on Mac
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "⚠️  This script is designed for macOS"
    echo "Some features may not work on other systems"
    echo ""
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install if missing
install_if_missing() {
    if ! command_exists "$1"; then
        echo "📦 Installing $1..."
        brew install "$1"
    else
        echo "✅ $1 already installed"
    fi
}

echo "Step 1: Checking dependencies..."
echo "-----------------------------------"

# Check for Homebrew
if ! command_exists brew; then
    echo "📦 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "✅ Homebrew already installed"
fi

# Install required tools
install_if_missing rclone
install_if_missing python3
install_if_missing jq
install_if_missing gh

echo ""
echo "Step 2: Creating directory structure..."
echo "-----------------------------------"

mkdir -p ~/.hsomni9000
mkdir -p ~/github-backup
mkdir -p ~/zoho-exports

echo "✅ Directories created"

echo ""
echo "Step 3: Setting up credentials file..."
echo "-----------------------------------"

if [ ! -f ~/.hsomni9000/credentials.env ]; then
    cp config/credentials.example.env ~/.hsomni9000/credentials.env
    chmod 600 ~/.hsomni9000/credentials.env
    echo "✅ Credentials template created at: ~/.hsomni9000/credentials.env"
    echo "⚠️  IMPORTANT: Edit this file with your actual API keys!"
    echo ""
    read -p "Press Enter to open the file in your default editor..."
    ${EDITOR:-nano} ~/.hsomni9000/credentials.env
else
    echo "✅ Credentials file already exists"
fi

echo ""
echo "Step 4: Configuring Rclone..."
echo "-----------------------------------"

if ! rclone listremotes | grep -q "cloudflare-r2"; then
    echo "🔧 Configuring Cloudflare R2..."
    echo ""
    echo "You'll need:"
    echo "  1. R2 Access Key ID"
    echo "  2. R2 Secret Access Key"
    echo "  3. R2 Endpoint URL"
    echo ""
    read -p "Press Enter to start Rclone config..."
    rclone config
else
    echo "✅ Cloudflare R2 already configured"
fi

echo ""
echo "Step 5: Testing R2 connection..."
echo "-----------------------------------"

if rclone lsd cloudflare-r2: >/dev/null 2>&1; then
    echo "✅ R2 connection successful!"
    rclone lsd cloudflare-r2:
else
    echo "❌ R2 connection failed"
    echo "Please check your credentials and run: rclone config"
fi

echo ""
echo "Step 6: Setting up cron job..."
echo "-----------------------------------"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "hsomni9000-sync-all.sh"; then
    echo "✅ Cron job already configured"
else
    echo "📅 Adding cron job for automatic sync (every 6 hours)..."
    (crontab -l 2>/dev/null; echo "0 */6 * * * $(pwd)/scripts/sync-all.sh >> ~/r2-sync.log 2>&1") | crontab -
    echo "✅ Cron job added"
fi

echo ""
echo "Step 7: Making scripts executable..."
echo "-----------------------------------"

chmod +x scripts/*.sh scripts/*.py 2>/dev/null || true
echo "✅ Scripts are now executable"

echo ""
echo "========================================="
echo "✅ SETUP COMPLETE!"
echo "========================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Configure Zoho:"
echo "   - Sign up: https://www.zoho.com/one/signup.html"
echo "   - Get API keys: https://api-console.zoho.com"
echo ""
echo "2. Set up Cloudflare:"
echo "   - Create account: https://dash.cloudflare.com/sign-up"
echo "   - Enable R2 and create bucket"
echo ""
echo "3. Test the sync:"
echo "   ./scripts/sync-all.sh"
echo ""
echo "4. View documentation:"
echo "   open index.html"
echo ""
echo "5. Deploy to GitHub:"
echo "   git init"
echo "   gh repo create zoho-faa-zone --public"
echo "   git add ."
echo "   git commit -m 'Initial commit'"
echo "   git push -u origin main"
echo ""
echo "📚 Full guide: open index.html in your browser"
echo "📧 Questions: heyns@fruitful-global-planet.com"
echo ""
echo "🚀 One Mac • One Man • 9,000 Brands • Zero Limits"
echo "========================================="
