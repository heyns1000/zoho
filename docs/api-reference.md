# HSOMNI9000 API Reference

**Base URL**: `https://api.zoho.faa.zone`
**Version**: 1.0
**Authentication**: Bearer Token

## Authentication

All API requests require authentication via Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
  https://api.zoho.faa.zone/api/stats
```

## File Management

### List Files

```http
GET /api/files
```

**Query Parameters**:
- `prefix` (optional): Filter by path prefix
- `limit` (optional): Max results (default: 100, max: 1000)
- `cursor` (optional): Pagination cursor

**Example**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  "https://api.zoho.faa.zone/api/files?prefix=brands/BRD000001&limit=50"
```

**Response**:
```json
{
  "files": [
    {
      "key": "brands/BRD000001/assets/logo.png",
      "size": 45632,
      "uploaded": "2025-01-01T12:00:00Z",
      "etag": "abc123"
    }
  ],
  "truncated": false,
  "cursor": null
}
```

### Get File

```http
GET /api/files/{key}
```

**Example**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  "https://api.zoho.faa.zone/api/files/brands/BRD000001/logo.png" \
  -o logo.png
```

**Response**: Binary file content

### Upload File

```http
POST /api/files
```

**Content-Type**: `multipart/form-data`

**Form Fields**:
- `file`: File to upload (required)
- `key`: Destination path (optional, defaults to filename)
- `metadata`: JSON metadata (optional)

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@document.pdf" \
  -F "key=brands/BRD000001/documents/contract.pdf" \
  -F "metadata={\"brand\":\"BRD000001\",\"type\":\"contract\"}" \
  https://api.zoho.faa.zone/api/files
```

**Response**:
```json
{
  "success": true,
  "key": "brands/BRD000001/documents/contract.pdf",
  "size": 123456,
  "url": "https://api.zoho.faa.zone/api/files/brands/BRD000001/documents/contract.pdf"
}
```

### Delete File

```http
DELETE /api/files/{key}
```

**Example**:
```bash
curl -X DELETE \
  -H "Authorization: Bearer TOKEN" \
  "https://api.zoho.faa.zone/api/files/brands/BRD000001/old-file.pdf"
```

**Response**:
```json
{
  "success": true,
  "message": "File deleted"
}
```

## Sync Operations

### Trigger Google Drive Sync

```http
POST /api/sync/google-drive
```

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  https://api.zoho.faa.zone/api/sync/google-drive
```

**Response**:
```json
{
  "success": true,
  "message": "Google Drive sync triggered",
  "job_id": "sync_1234567890"
}
```

### Trigger GitHub Sync

```http
POST /api/sync/github
```

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  https://api.zoho.faa.zone/api/sync/github
```

### Trigger All Syncs

```http
POST /api/sync/all
```

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  https://api.zoho.faa.zone/api/sync/all
```

**Response**:
```json
{
  "success": true,
  "message": "All syncs triggered",
  "count": 3
}
```

### Get Sync Status

```http
GET /api/sync/status
```

**Example**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://api.zoho.faa.zone/api/sync/status
```

**Response**:
```json
{
  "google_drive": {
    "last_sync": "2025-01-01T12:00:00Z",
    "status": "completed",
    "files_synced": 1234
  },
  "github": {
    "last_sync": "2025-01-01T11:30:00Z",
    "status": "completed",
    "repos_backed_up": 45
  }
}
```

## Statistics

### Get Overall Stats

```http
GET /api/stats
```

**Example**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://api.zoho.faa.zone/api/stats
```

**Response**:
```json
{
  "total_files": 1234567,
  "total_size_bytes": 10737418240,
  "total_size_gb": "10.00",
  "last_updated": "2025-01-01T12:00:00Z"
}
```

### Get Storage Stats

```http
GET /api/stats/storage
```

**Example**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://api.zoho.faa.zone/api/stats/storage
```

**Response**:
```json
{
  "by_brand": {
    "BRD000001": 1073741824,
    "BRD000002": 536870912
  },
  "by_type": {
    "pdf": 2147483648,
    "png": 1073741824,
    "jpg": 536870912
  }
}
```

## Brand Management

### List Brands

```http
GET /api/brands
```

**Example**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://api.zoho.faa.zone/api/brands
```

**Response**:
```json
{
  "brands": [
    {
      "Brand_ID": "BRD000001",
      "Brand_Name": "Example Brand",
      "Domain": "example.com",
      "Status": "active",
      "Total_Files": 1234,
      "Total_Storage_GB": 5.67
    }
  ]
}
```

### Create Brand

```http
POST /api/brands
```

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "Brand_Name": "New Brand",
  "Domain": "newbrand.com",
  "Owner_Email": "owner@newbrand.com",
  "Setup_Email": true,
  "Industry": "Technology"
}
```

**Example**:
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"Brand_Name":"New Brand","Domain":"newbrand.com","Owner_Email":"owner@newbrand.com"}' \
  https://api.zoho.faa.zone/api/brands
```

**Response**:
```json
{
  "success": true,
  "Brand_ID": "BRD009001",
  "message": "Brand created successfully. Onboarding workflow triggered."
}
```

## Error Responses

### Error Format

```json
{
  "error": "Error message here",
  "code": "ERROR_CODE",
  "details": {}
}
```

### HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: Missing or invalid auth token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `405 Method Not Allowed`: HTTP method not supported
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Common Error Codes

```json
{
  "error": "Unauthorized",
  "code": "AUTH_REQUIRED"
}
```

```json
{
  "error": "File not found",
  "code": "FILE_NOT_FOUND"
}
```

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT",
  "details": {
    "limit": 1000,
    "reset": "2025-01-01T13:00:00Z"
  }
}
```

## Rate Limits

- **Per API Key**: 1,000 requests/hour
- **Daily Limit**: 10,000 requests/day
- **Burst**: 100 requests/minute

**Rate Limit Headers**:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1704117600
```

## SDKs & Libraries

### JavaScript/Node.js

```javascript
const HSOMNI9000 = require('@hsomni9000/api-client');

const client = new HSOMNI9000({
  apiKey: 'YOUR_API_TOKEN',
  baseUrl: 'https://api.zoho.faa.zone'
});

// List files
const files = await client.files.list({ prefix: 'brands/BRD000001' });

// Upload file
const upload = await client.files.upload('path/to/file.pdf', {
  key: 'brands/BRD000001/documents/file.pdf',
  metadata: { type: 'document' }
});

// Trigger sync
await client.sync.googleDrive();
```

### Python

```python
from hsomni9000 import Client

client = Client(
    api_key='YOUR_API_TOKEN',
    base_url='https://api.zoho.faa.zone'
)

# List files
files = client.files.list(prefix='brands/BRD000001')

# Upload file
upload = client.files.upload(
    file_path='path/to/file.pdf',
    key='brands/BRD000001/documents/file.pdf',
    metadata={'type': 'document'}
)

# Trigger sync
client.sync.google_drive()
```

### cURL Examples

**List files with pagination**:
```bash
#!/bin/bash
API_TOKEN="your_token_here"
CURSOR=""

while true; do
  RESPONSE=$(curl -s -H "Authorization: Bearer $API_TOKEN" \
    "https://api.zoho.faa.zone/api/files?limit=100&cursor=$CURSOR")

  echo "$RESPONSE" | jq '.files[]'

  TRUNCATED=$(echo "$RESPONSE" | jq -r '.truncated')
  if [ "$TRUNCATED" != "true" ]; then
    break
  fi

  CURSOR=$(echo "$RESPONSE" | jq -r '.cursor')
done
```

**Bulk upload**:
```bash
#!/bin/bash
API_TOKEN="your_token_here"

for file in ./uploads/*; do
  filename=$(basename "$file")

  curl -X POST \
    -H "Authorization: Bearer $API_TOKEN" \
    -F "file=@$file" \
    -F "key=brands/BRD000001/uploads/$filename" \
    https://api.zoho.faa.zone/api/files

  echo "Uploaded: $filename"
done
```

## Webhooks

### Configuring Webhooks

Set up webhooks to receive notifications about events:

**Supported Events**:
- `file.uploaded`
- `file.deleted`
- `sync.completed`
- `sync.failed`
- `brand.created`

**Webhook Payload**:
```json
{
  "event": "file.uploaded",
  "timestamp": "2025-01-01T12:00:00Z",
  "data": {
    "key": "brands/BRD000001/document.pdf",
    "size": 123456,
    "brand_id": "BRD000001"
  }
}
```

**Setting up webhook** (via Zoho Creator):
```
Settings → Webhooks → Add Webhook
URL: https://your-app.com/webhook
Events: file.uploaded, sync.completed
```

---

**Last Updated**: 2025-01-01
**Version**: 1.0
**Support**: heyns@fruitful-global-planet.com
