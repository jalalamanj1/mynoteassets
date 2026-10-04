import { verifyToken, getSecret, getSessionToken, json } from '../lib/auth.js';

const MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  eps: 'application/postscript',
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  obj: 'text/plain',
  fbx: 'application/octet-stream',
  blend: 'application/octet-stream',
};

export async function onRequestGet(context) {
  const { request, env } = context;

  const payload = await verifyToken(getSessionToken(request), getSecret(env));
  if (!payload) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const path = url.searchParams.get('path') || '';
  const download = url.searchParams.get('download') === '1';

  if (!path || path.indexOf('diagrams/') !== 0) {
    return json({ error: 'Invalid path' }, 400);
  }

  const repo = env.GITHUB_REPO || 'jalalamanj1/mynoteassets';
  const branch = env.GITHUB_BRANCH || 'main';

  if (!env.GITHUB_TOKEN) {
    return json({ error: 'GITHUB_TOKEN is not configured on the server' }, 500);
  }

  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`,
    {
      headers: {
        Authorization: 'Bearer ' + env.GITHUB_TOKEN,
        Accept: 'application/vnd.github+json',
      },
    }
  );

  if (!res.ok) {
    return json({ error: 'File not found' }, 404);
  }

  const data = await res.json();
  if (data.type !== 'file') {
    return json({ error: 'Not a file' }, 400);
  }

  let bytes;
  try {
    bytes = Uint8Array.from(atob(data.content), (c) => c.charCodeAt(0));
  } catch (e) {
    return json({ error: 'Failed to decode file' }, 500);
  }

  const ext = path.split('.').pop().toLowerCase();
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': String(bytes.length),
    'Cache-Control': 'no-store',
  };

  if (download) {
    const filename = path.split('/').pop();
    headers['Content-Disposition'] = 'attachment; filename="' + filename.replace(/"/g, '') + '"';
  }

  return new Response(bytes, { status: 200, headers: headers });
}