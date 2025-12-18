#!/usr/bin/env node
/**
 * Silent Node Orbit - Background Sync Daemon
 * Connects HotStack Omnidrop with HSOMNI9000 infrastructure
 *
 * Features:
 * - Real-time file monitoring
 * - Automatic R2 upload
 * - Zoho Creator indexing
 * - Secret scanning
 * - Mac Spotlight integration
 * - Cross-platform search enablement
 */

const chokidar = require('chokidar');
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuration
const CONFIG = {
  hotstack_watch_dir: process.env.HOTSTACK_WATCH_DIR || '/tmp/hotstack-uploads',
  r2_bucket: 'hsomni9000-vault',
  zoho_creator_api: 'https://creator.zoho.com/api/v2',
  zoho_vault_api: 'https://vault.zoho.com/api/json',
  sync_interval: 5000, // 5 seconds
  silent_mode: true,
  max_file_size: 100 * 1024 * 1024, // 100MB
  supported_extensions: ['.html', '.pdf', '.json', '.txt', '.md', '.zip', '.tar.gz']
};

// Initialize R2 client (S3-compatible)
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CF_R2_ENDPOINT || `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CF_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CF_R2_SECRET_KEY
  }
});

// Statistics
const stats = {
  filesProcessed: 0,
  duplicatesSkipped: 0,
  secretsFound: 0,
  errors: 0,
  startTime: Date.now()
};

// Secret patterns
const SECRET_PATTERNS = [
  { name: 'OpenAI API Key', pattern: /sk-[a-zA-Z0-9]{48}/g },
  { name: 'GitHub Token', pattern: /ghp_[a-zA-Z0-9]{36}/g },
  { name: 'Google API Key', pattern: /AIza[a-zA-Z0-9-_]{35}/g },
  { name: 'Generic API Key', pattern: /api_[a-zA-Z0-9]{32}/g },
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g },
  { name: 'Private Key', pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'Password in Code', pattern: /password\s*=\s*["'][^"']{8,}["']/gi },
  { name: 'Bearer Token', pattern: /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/g }
];

class SilentNodeOrbit {
  constructor() {
    this.watcher = null;
    this.processingQueue = new Set();
    this.setupWatcher();
  }

  setupWatcher() {
    // Create watch directory if it doesn't exist
    if (!fs.existsSync(CONFIG.hotstack_watch_dir)) {
      fs.mkdirSync(CONFIG.hotstack_watch_dir, { recursive: true });
      this.log('📁 Created watch directory:', CONFIG.hotstack_watch_dir);
    }

    // Initialize file watcher
    this.watcher = chokidar.watch(CONFIG.hotstack_watch_dir, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      },
      ignored: /(^|[\/\\])\../ // ignore dotfiles
    });

    // Event handlers
    this.watcher
      .on('add', filePath => this.handleFile(filePath, 'upload'))
      .on('change', filePath => this.handleFile(filePath, 'update'))
      .on('unlink', filePath => this.handleFile(filePath, 'delete'))
      .on('error', error => this.log('❌ Watcher error:', error));

    this.log('👁️  Watching:', CONFIG.hotstack_watch_dir);
  }

  async handleFile(filePath, action) {
    // Prevent duplicate processing
    if (this.processingQueue.has(filePath)) {
      return;
    }

    this.processingQueue.add(filePath);

    try {
      await this.processFile(filePath, action);
    } catch (error) {
      this.log('❌ Error processing file:', filePath, error.message);
      stats.errors++;
    } finally {
      this.processingQueue.delete(filePath);
    }
  }

  async processFile(filePath, action) {
    const fileName = path.basename(filePath);
    const fileExt = path.extname(filePath);

    // Check file extension
    if (!CONFIG.supported_extensions.includes(fileExt)) {
      this.log(`⏭️  Skipped (unsupported extension): ${fileName}`);
      return;
    }

    // Check file exists
    if (!fs.existsSync(filePath)) {
      this.log(`⏭️  Skipped (file not found): ${fileName}`);
      return;
    }

    // Check file size
    const fileStats = fs.statSync(filePath);
    if (fileStats.size > CONFIG.max_file_size) {
      this.log(`⏭️  Skipped (too large): ${fileName} (${fileStats.size} bytes)`);
      return;
    }

    // Read file
    const fileData = fs.readFileSync(filePath);
    const fileHash = crypto.createHash('sha256').update(fileData).digest('hex');

    this.log(`🔄 Processing: ${fileName} (${action})`);

    // Check for duplicates
    const isDuplicate = await this.checkDuplicate(fileHash);
    if (isDuplicate && action === 'upload') {
      this.log(`⏭️  Skipped duplicate: ${fileName}`);
      stats.duplicatesSkipped++;
      return;
    }

    // Scan for secrets
    const secrets = await this.scanSecrets(fileData.toString('utf8'));
    if (secrets.length > 0) {
      this.log(`🔐 Found ${secrets.length} secrets in: ${fileName}`);
      await this.storeSecretsInVault(secrets, fileName);
      stats.secretsFound += secrets.length;
    }

    // Generate R2 path
    const date = new Date().toISOString().split('T')[0];
    const r2Path = `hotstack/${date}/${fileHash.substring(0, 8)}_${fileName}`;

    // Upload to R2
    await this.uploadToR2(fileData, r2Path, {
      originalName: fileName,
      hash: fileHash,
      source: 'hotstack',
      hasSecrets: secrets.length > 0,
      uploadDate: new Date().toISOString(),
      fileSize: fileStats.size.toString()
    });

    // Index in Zoho Creator
    await this.indexInCreator({
      File_Name: fileName,
      File_Hash: fileHash,
      File_Size: fileStats.size,
      File_Type: fileExt.replace('.', ''),
      Source: 'hotstack',
      R2_Path: r2Path,
      Has_Secrets: secrets.length > 0,
      Secrets_Count: secrets.length,
      Upload_Date: new Date().toISOString(),
      Processing_Status: 'completed'
    });

    // Update Mac Spotlight metadata (macOS only)
    if (process.platform === 'darwin') {
      await this.updateSpotlight(filePath, {
        kMDItemDisplayName: fileName,
        kMDItemKeywords: 'hotstack,hsomni9000,synced,searchable',
        kMDItemComment: `Synced to R2: ${r2Path}`,
        kMDItemDescription: `HotStack upload synced to HSOMNI9000 vault`
      });
    }

    this.log(`✅ Synced: ${fileName} → ${r2Path}`);
    stats.filesProcessed++;
  }

  async checkDuplicate(hash) {
    try {
      const response = await axios.get(
        `${CONFIG.zoho_creator_api}/HSOMNI9000_Index/report/All_Files`,
        {
          params: { criteria: `File_Hash == "${hash}"` },
          headers: {
            'Authorization': `Zoho-oauthtoken ${process.env.ZOHO_ACCESS_TOKEN}`
          }
        }
      );
      return response.data && response.data.data && response.data.data.length > 0;
    } catch (error) {
      this.log('⚠️  Duplicate check failed:', error.message);
      return false;
    }
  }

  async scanSecrets(content) {
    const found = [];

    for (const { name, pattern } of SECRET_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(secret => {
          found.push({
            type: name,
            value: secret,
            preview: secret.substring(0, 20) + '...'
          });
        });
      }
    }

    return found;
  }

  async storeSecretsInVault(secrets, fileName) {
    try {
      const chamberName = `hotstack_${Date.now()}`;

      await axios.post(
        `${CONFIG.zoho_vault_api}/secrets/create`,
        {
          SECRETNAME: `${fileName}_secrets`,
          CHAMBERNAME: chamberName,
          SECRETDATA: JSON.stringify(secrets),
          SECRETTYPE: 'password'
        },
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${process.env.ZOHO_ACCESS_TOKEN}`
          }
        }
      );

      this.log(`🔐 Secrets stored in Vault: ${chamberName}`);
    } catch (error) {
      this.log('⚠️  Failed to store secrets in Vault:', error.message);
    }
  }

  async uploadToR2(data, key, metadata) {
    const command = new PutObjectCommand({
      Bucket: CONFIG.r2_bucket,
      Key: key,
      Body: data,
      Metadata: metadata,
      ContentType: this.getContentType(key)
    });

    await r2.send(command);
  }

  async indexInCreator(data) {
    try {
      await axios.post(
        `${CONFIG.zoho_creator_api}/HSOMNI9000_Index/form/Files`,
        { data },
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${process.env.ZOHO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      this.log('⚠️  Failed to index in Creator:', error.message);
    }
  }

  async updateSpotlight(filePath, attributes) {
    try {
      const attrArgs = Object.entries(attributes)
        .map(([key, value]) => `-attr ${key} "${value}"`)
        .join(' ');

      await execPromise(`mdimport ${attrArgs} "${filePath}"`);
    } catch (error) {
      // Spotlight update is non-critical
    }
  }

  getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const types = {
      '.html': 'text/html',
      '.pdf': 'application/pdf',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.zip': 'application/zip',
      '.tar.gz': 'application/gzip'
    };
    return types[ext] || 'application/octet-stream';
  }

  log(...args) {
    if (!CONFIG.silent_mode) {
      console.log(`[${new Date().toISOString()}]`, ...args);
    }
  }

  printStats() {
    const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║         Silent Node Orbit - Statistics                  ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Uptime:             ${uptime}s`);
    console.log(`║  Files Processed:    ${stats.filesProcessed}`);
    console.log(`║  Duplicates Skipped: ${stats.duplicatesSkipped}`);
    console.log(`║  Secrets Found:      ${stats.secretsFound}`);
    console.log(`║  Errors:             ${stats.errors}`);
    console.log('╚══════════════════════════════════════════════════════════╝\n');
  }
}

// Start daemon
const orbit = new SilentNodeOrbit();

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║       🛸 Silent Node Orbit - Started                    ║');
console.log('╠══════════════════════════════════════════════════════════╣');
console.log(`║  Watch Directory:  ${CONFIG.hotstack_watch_dir}`);
console.log(`║  R2 Bucket:        ${CONFIG.r2_bucket}`);
console.log(`║  Search:           Enabled (ScrollBinder)`);
console.log(`║  Mac Integration:  ${process.platform === 'darwin' ? 'Yes' : 'No'}`);
console.log('╚══════════════════════════════════════════════════════════╝\n');

// Print stats every 5 minutes
setInterval(() => orbit.printStats(), 5 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛸 Shutting down Silent Node Orbit...');
  orbit.printStats();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛸 Shutting down Silent Node Orbit...');
  orbit.printStats();
  process.exit(0);
});
