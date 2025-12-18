// HSOMNI9000 Vault-to-R2 Sync Function
// Zoho Catalyst Serverless Function
// Processes files and pushes to Cloudflare R2
// Author: Heyns Schoeman | Fruitful Global Planet

const catalyst = require('zcatalyst-sdk-node');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

// Initialize Cloudflare R2 client (S3-compatible)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Main function handler
 */
module.exports = async (context, basicIO) => {
  const catalystApp = catalyst.initialize(context);
  
  try {
    // Parse input
    const input = JSON.parse(basicIO.getInput());
    const { fileName, fileContent, brandId, sourcePlatform, metadata } = input;
    
    console.log(`Processing: ${fileName} from ${sourcePlatform} for brand ${brandId}`);
    
    // STAGE 1: Validation
    const fileBuffer = Buffer.from(fileContent, 'base64');
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const fileSize = fileBuffer.length;
    
    // Check file size (reject if > 5GB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${fileSize} bytes (max ${MAX_FILE_SIZE})`);
    }
    
    console.log(`✅ Validated: ${fileName} (${fileSize} bytes, checksum: ${checksum.substring(0, 16)}...)`);
    
    // STAGE 2: Check for duplicates
    const datastore = catalystApp.datastore();
    const indexTable = datastore.table('vault_cloud_index');
    
    const duplicateCheck = await indexTable.getRows({
      where: `checksum = '${checksum}'`
    });
    
    if (duplicateCheck.length > 0) {
      console.log(`⚠️  Duplicate found: ${fileName}`);
      basicIO.write(JSON.stringify({
        status: 'skipped',
        reason: 'duplicate',
        existing_id: duplicateCheck[0].ROWID,
        checksum: checksum
      }));
      return;
    }
    
    // STAGE 3: Secret scanning
    const secrets = [];
    const fileText = fileBuffer.toString('utf-8');
    
    // Regex patterns for common secrets
    const patterns = [
      /(?:api[_-]?key|token|secret)["\s:=]+([A-Za-z0-9_-]{20,})/gi,
      /sk-[A-Za-z0-9]{20,}/gi,  // OpenAI/Anthropic keys
      /ghp_[A-Za-z0-9]{36}/gi,  // GitHub tokens
      /AIza[A-Za-z0-9-_]{35}/gi, // Google API keys
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(fileText)) !== null) {
        secrets.push({
          type: 'api_key',
          value: match[0],
          position: match.index
        });
      }
    });
    
    console.log(`🔍 Found ${secrets.length} potential secrets`);
    
    // STAGE 4: Store secrets in Vault
    if (secrets.length > 0) {
      const vault = catalystApp.vault();
      const chamberName = `Brand_${brandId}`;
      
      try {
        for (let i = 0; i < Math.min(secrets.length, 10); i++) {
          const secret = secrets[i];
          await vault.addSecret({
            chamberName: chamberName,
            secretName: `auto_${Date.now()}_${i}`,
            secretValue: secret.value,
            notes: `Auto-detected in ${fileName} at position ${secret.position}`
          });
        }
        console.log(`🔐 Stored ${Math.min(secrets.length, 10)} secrets in Vault chamber: ${chamberName}`);
      } catch (vaultError) {
        console.error(`⚠️  Vault error: ${vaultError.message}`);
        // Continue even if vault fails
      }
    }
    
    // STAGE 5: Upload to Cloudflare R2
    const r2Key = `brands/${brandId}/${sourcePlatform}/${fileName}`;
    const uploadCommand = new PutObjectCommand({
      Bucket: 'hsomni9000-vault',
      Key: r2Key,
      Body: fileBuffer,
      Metadata: {
        'brand-id': brandId.toString(),
        'source': sourcePlatform,
        'checksum': checksum,
        'timestamp': new Date().toISOString(),
        'secrets-found': secrets.length.toString(),
        'original-size': fileSize.toString(),
        ...metadata
      },
      ContentType: getContentType(fileName)
    });
    
    await r2Client.send(uploadCommand);
    console.log(`☁️  Uploaded to R2: ${r2Key}`);
    
    // STAGE 6: Update Creator index
    await indexTable.insertRow({
      file_name: fileName,
      brand_id: brandId.toString(),
      source_platform: sourcePlatform,
      checksum: checksum,
      r2_key: r2Key,
      file_size: fileSize,
      upload_date: new Date().toISOString(),
      status: 'synced',
      secrets_found: secrets.length,
      metadata_json: JSON.stringify(metadata || {})
    });
    
    console.log(`📊 Updated Creator index`);
    
    // STAGE 7: Success response
    const response = {
      status: 'success',
      r2_url: `https://files.hsomni9000.com/${r2Key}`,
      checksum: checksum,
      file_size: fileSize,
      secrets_stored: Math.min(secrets.length, 10),
      timestamp: new Date().toISOString()
    };
    
    console.log(`✅ Processing complete for ${fileName}`);
    basicIO.write(JSON.stringify(response));
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
    
    // Log error to Creator for retry
    try {
      const errorTable = catalystApp.datastore().table('sync_errors');
      await errorTable.insertRow({
        file_name: input.fileName || 'unknown',
        brand_id: input.brandId || 'unknown',
        error_message: error.message,
        error_stack: error.stack,
        timestamp: new Date().toISOString(),
        retry_count: 0
      });
    } catch (logError) {
      console.error(`Failed to log error: ${logError.message}`);
    }
    
    basicIO.write(JSON.stringify({
      status: 'error',
      message: error.message
    }));
  }
};

/**
 * Get content type based on file extension
 */
function getContentType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const types = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'json': 'application/json',
    'xml': 'application/xml',
    'csv': 'text/csv',
    'zip': 'application/zip',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  return types[ext] || 'application/octet-stream';
}
