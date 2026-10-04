import { verifyToken, getSecret, bearerToken, json } from '../lib/auth.js';

const SUBJECTS = ['Biology', 'Geography', 'Chemistry', 'General', 'Math', 'Physics', 'Science'];

function sanitize(name) {
  return String(name || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[^\w.\- ]/g, '_')
    .trim()
    .replace(/^\.+$/, '');
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const payload = await verifyToken(bearerToken(request), getSecret(env));
  if (!payload) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const subject = sanitize(body.subject);
  const category = sanitize(body.category);
  const filename = sanitize(body.filename);
  const content = String(body.content || '');

  if (SUBJECTS.indexOf(subject) === -1) {
    return json({ error: 'Invalid subject' }, 400);
  }
  if (!filename || filename === '') {
    return json({ error: 'filename is required' }, 400);
  }
  if (!content) {
    return json({ error: 'content is required' }, 400);
  }
  if (content.length > 70 * 1024 * 1024) {
    return json({ error: 'File too large (max ~50 MB)' }, 413);
  }

  let filePath = 'diagrams/' + subject;
  if (category) filePath += '/' + category;
  filePath += '/' + filename;

  const repo = env.GITHUB_REPO || 'jalalamanj1/mynoteassets';
  const branch = env.GITHUB_BRANCH || 'main';

  if (!env.GITHUB_TOKEN) {
    return json({ error: 'GITHUB_TOKEN is not configured on the server' }, 500);
  }

  const headers = {
    Authorization: 'Bearer ' + env.GITHUB_TOKEN,
    Accept: 'application/vnd.github+json',
  };

  // Fetch existing file (if any) so we can overwrite instead of conflict.
  let sha;
  const encodedPath = encodeURIComponent(filePath);
  const getRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
    { headers }
  );
  if (getRes.ok) {
    const existing = await getRes.json();
    sha = existing.sha;
  }

  const putRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${encodedPath}`,
    {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Upload ${filePath} via admin portal`,
        content: content,
        branch: branch,
        sha: sha,
      }),
    }
  );

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    const msg = err.message || err.errors || 'Upload failed';
    return json({ error: Array.isArray(msg) ? msg.join('; ') : msg }, putRes.status);
  }

  const created = await putRes.json();
  return json({ ok: true, path: filePath, commit: created.commit && created.commit.sha });
}