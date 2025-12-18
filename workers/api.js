/**
 * Cloudflare Workers API for HSOMNI9000
 * Provides REST API endpoints for R2 storage and Zoho integration
 */

// CORS headers for API access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Authentication check
    const authToken = request.headers.get('Authorization');
    if (!authToken || !await validateAuth(authToken, env)) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Route handling
    try {
      if (path.startsWith('/api/files')) {
        return await handleFiles(request, env, path);
      } else if (path.startsWith('/api/sync')) {
        return await handleSync(request, env, path);
      } else if (path.startsWith('/api/stats')) {
        return await handleStats(request, env, path);
      } else if (path.startsWith('/api/brands')) {
        return await handleBrands(request, env, path);
      } else {
        return jsonResponse({ error: 'Not found' }, 404);
      }
    } catch (error) {
      console.error('API Error:', error);
      return jsonResponse({ error: error.message }, 500);
    }
  }
};

/**
 * File Management Endpoints
 */
async function handleFiles(request, env, path) {
  const url = new URL(request.url);
  const method = request.method;

  // GET /api/files - List files
  if (method === 'GET' && path === '/api/files') {
    const prefix = url.searchParams.get('prefix') || '';
    const limit = parseInt(url.searchParams.get('limit') || '100');

    const list = await env.R2_BUCKET.list({
      prefix: prefix,
      limit: limit
    });

    return jsonResponse({
      files: list.objects.map(obj => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded,
        etag: obj.etag
      })),
      truncated: list.truncated,
      cursor: list.cursor
    });
  }

  // GET /api/files/{key} - Get specific file
  if (method === 'GET' && path.match(/^\/api\/files\/.+/)) {
    const key = path.replace('/api/files/', '');
    const object = await env.R2_BUCKET.get(key);

    if (!object) {
      return jsonResponse({ error: 'File not found' }, 404);
    }

    return new Response(object.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': object.httpMetadata.contentType || 'application/octet-stream',
        'Content-Length': object.size,
        'ETag': object.etag,
        'Last-Modified': object.uploaded.toUTCString()
      }
    });
  }

  // POST /api/files - Upload file
  if (method === 'POST' && path === '/api/files') {
    const formData = await request.formData();
    const file = formData.get('file');
    const key = formData.get('key') || file.name;
    const metadata = JSON.parse(formData.get('metadata') || '{}');

    await env.R2_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type
      },
      customMetadata: metadata
    });

    return jsonResponse({
      success: true,
      key: key,
      size: file.size,
      url: `${url.origin}/api/files/${key}`
    });
  }

  // DELETE /api/files/{key} - Delete file
  if (method === 'DELETE' && path.match(/^\/api\/files\/.+/)) {
    const key = path.replace('/api/files/', '');
    await env.R2_BUCKET.delete(key);

    return jsonResponse({
      success: true,
      message: 'File deleted'
    });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

/**
 * Sync Operations Endpoints
 */
async function handleSync(request, env, path) {
  const method = request.method;

  // POST /api/sync/google-drive
  if (method === 'POST' && path === '/api/sync/google-drive') {
    // Trigger Zoho Flow workflow
    const response = await fetch(env.ZOHO_FLOW_WEBHOOK_GOOGLE_DRIVE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'manual', timestamp: Date.now() })
    });

    return jsonResponse({
      success: true,
      message: 'Google Drive sync triggered',
      job_id: await response.text()
    });
  }

  // POST /api/sync/github
  if (method === 'POST' && path === '/api/sync/github') {
    const response = await fetch(env.ZOHO_FLOW_WEBHOOK_GITHUB, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'manual', timestamp: Date.now() })
    });

    return jsonResponse({
      success: true,
      message: 'GitHub sync triggered',
      job_id: await response.text()
    });
  }

  // POST /api/sync/all
  if (method === 'POST' && path === '/api/sync/all') {
    // Trigger all sync workflows
    const triggers = [
      fetch(env.ZOHO_FLOW_WEBHOOK_GOOGLE_DRIVE, { method: 'POST' }),
      fetch(env.ZOHO_FLOW_WEBHOOK_GITHUB, { method: 'POST' }),
      fetch(env.ZOHO_FLOW_WEBHOOK_ONEDRIVE, { method: 'POST' })
    ];

    await Promise.all(triggers);

    return jsonResponse({
      success: true,
      message: 'All syncs triggered',
      count: triggers.length
    });
  }

  // GET /api/sync/status
  if (method === 'GET' && path === '/api/sync/status') {
    // Query Zoho Creator for sync status
    const response = await fetch(
      `${env.ZOHO_CREATOR_API_URL}/HSOMNI9000_Index/Sync_Status`,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${env.ZOHO_ACCESS_TOKEN}`
        }
      }
    );

    const data = await response.json();
    return jsonResponse(data);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

/**
 * Statistics Endpoints
 */
async function handleStats(request, env, path) {
  const method = request.method;

  // GET /api/stats
  if (method === 'GET' && path === '/api/stats') {
    // Get overall statistics from R2
    const list = await env.R2_BUCKET.list({ limit: 1000 });

    let totalSize = 0;
    let fileCount = 0;

    for (const obj of list.objects) {
      totalSize += obj.size;
      fileCount++;
    }

    return jsonResponse({
      total_files: fileCount,
      total_size_bytes: totalSize,
      total_size_gb: (totalSize / 1024 / 1024 / 1024).toFixed(2),
      last_updated: new Date().toISOString()
    });
  }

  // GET /api/stats/storage
  if (method === 'GET' && path === '/api/stats/storage') {
    const list = await env.R2_BUCKET.list({ limit: 1000 });

    const byType = {};
    const byBrand = {};

    for (const obj of list.objects) {
      const parts = obj.key.split('/');
      const brand = parts[1] || 'unknown';
      const ext = obj.key.split('.').pop() || 'unknown';

      byBrand[brand] = (byBrand[brand] || 0) + obj.size;
      byType[ext] = (byType[ext] || 0) + obj.size;
    }

    return jsonResponse({
      by_brand: byBrand,
      by_type: byType
    });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

/**
 * Brand Management Endpoints
 */
async function handleBrands(request, env, path) {
  const method = request.method;

  // GET /api/brands
  if (method === 'GET' && path === '/api/brands') {
    const response = await fetch(
      `${env.ZOHO_CREATOR_API_URL}/HSOMNI9000_Index/Brands`,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${env.ZOHO_ACCESS_TOKEN}`
        }
      }
    );

    const data = await response.json();
    return jsonResponse(data);
  }

  // POST /api/brands - Create new brand
  if (method === 'POST' && path === '/api/brands') {
    const body = await request.json();

    // Create brand in Zoho Creator (will trigger onboarding flow)
    const response = await fetch(
      `${env.ZOHO_CREATOR_API_URL}/HSOMNI9000_Index/Brands`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${env.ZOHO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();
    return jsonResponse(data, 201);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

/**
 * Helper Functions
 */
async function validateAuth(authHeader, env) {
  // Simple token validation
  const token = authHeader.replace('Bearer ', '');
  return token === env.API_TOKEN;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status: status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
