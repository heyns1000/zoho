# HSOMNI9000 - Deployment Guide

## 🚀 Deploy to GitHub & zoho.faa.zone

### Step 1: Create GitHub Repository

```bash
# Initialize git
cd zoho-faa-zone
git init

# Create GitHub repository (via CLI or web)
gh repo create zoho-faa-zone --public --source=. --remote=origin

# Or use web interface:
# Go to https://github.com/new
# Repository name: zoho-faa-zone
# Description: HSOMNI9000 Enterprise Cloud Architecture
```

### Step 2: Initial Commit & Push

```bash
git add .
git commit -m "Initial commit: HSOMNI9000 Vault Cloud Architecture"
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to repository Settings → Pages
2. Source: Deploy from branch
3. Branch: `main` / (root)
4. Click Save
5. Your site will be live at: `https://yourusername.github.io/zoho-faa-zone`

### Step 4: Add Custom Domain (zoho.faa.zone)

#### In Cloudflare:

1. Go to: https://dash.cloudflare.com
2. Select your `faa.zone` domain
3. DNS → Add record:
   - Type: `CNAME`
   - Name: `zoho`
   - Target: `yourusername.github.io`
   - Proxy status: Proxied (orange cloud)
4. Save

#### In GitHub:

1. Repository Settings → Pages
2. Custom domain: `zoho.faa.zone`
3. Click Save
4. Wait for DNS check (may take a few minutes)
5. ✅ Enable "Enforce HTTPS"

Your site will now be live at: **https://zoho.faa.zone** 🎉

---

## 📦 File Structure

```
zoho-faa-zone/
├── index.html                  # Main documentation (view in browser)
├── README.md                   # Repository overview
├── .gitignore                  # Git ignore rules
│
├── config/
│   └── credentials.example.env # Credentials template
│
├── scripts/
│   ├── sync-all.sh            # Master sync script
│   ├── cloudflare-dns-sync.py # DNS automation
│   └── setup.sh               # One-command setup
│
├── catalyst/
│   └── vault-to-r2-sync/      # Serverless function
│       ├── index.js
│       └── package.json
│
├── flows/
│   └── [Zoho Flow templates]
│
├── creator/
│   └── [Database schemas]
│
└── docs/
    ├── architecture.md
    ├── implementation.md
    └── api-reference.md
```

---

## 🔧 Local Development

### View Documentation Locally:

```bash
# Option 1: Python
cd zoho-faa-zone
python3 -m http.server 8000
# Open: http://localhost:8000

# Option 2: Node.js
npx http-server
# Open: http://localhost:8080

# Option 3: Just open in browser
open index.html
```

---

## 🌐 Updating the Site

```bash
# Make changes to files
git add .
git commit -m "Update: description of changes"
git push origin main

# GitHub Pages automatically rebuilds
# Wait 1-2 minutes, then visit: https://zoho.faa.zone
```

---

## 🔐 Security

**NEVER commit real credentials!**

The `.gitignore` file prevents sensitive files from being committed:
- `*.env` files
- `credentials.env`
- `*_export.json`
- `github-backup/`

Always use the template: `config/credentials.example.env`

---

## 📊 Continuous Integration (Optional)

Add GitHub Actions for automated testing:

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: .
```

---

## ✅ Verification Checklist

- [ ] GitHub repository created
- [ ] Initial commit pushed
- [ ] GitHub Pages enabled
- [ ] Custom domain configured in Cloudflare
- [ ] Custom domain added in GitHub
- [ ] HTTPS enforced
- [ ] Site accessible at https://zoho.faa.zone
- [ ] All links working
- [ ] Documentation readable
- [ ] Scripts executable

---

## 🆘 Troubleshooting

**Issue**: Custom domain not working  
**Fix**: 
- Check Cloudflare DNS (CNAME record)
- Wait 24-48 hours for DNS propagation
- Verify GitHub Pages settings

**Issue**: 404 errors  
**Fix**:
- Ensure `index.html` is in root directory
- Check branch name (should be `main`)
- Rebuild: Settings → Pages → Source → Save

**Issue**: HTTPS not enforced  
**Fix**:
- Wait for SSL certificate generation (can take 24h)
- Try disabling/re-enabling custom domain

---

## 📞 Support

For issues with:
- **GitHub**: https://github.com/contact
- **Cloudflare**: https://dash.cloudflare.com/support
- **This project**: Create an issue on GitHub

---

**One Mac • One Man • 9,000 Brands • Zero Limits** 🚀
