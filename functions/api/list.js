import { verifyToken, getSecret, getSessionToken, json } from '../lib/auth.js';

const SUBJECTS = ['Biology', 'Geography', 'Chemistry', 'General', 'Math', 'Physics', 'Science'];

function sanitize(name) {
  return String(name || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim();
}

export async function onRequestGet(context) {
  const { request, env } = context;

  const payload = await verifyToken(getSessionToken(request), getSecret(env));
  if (!payload) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const subject = url.searchParams.get('subject') || '';
  const category = sanitize(url.searchParams.get('category'));

  if (SUBJECTS.indexOf(subject) === -1) {
    return json({ error: 'Invalid subject' }, 400);
  }

  const repo = env.GITHUB_REPO || 'jalalamanj1/mynoteassets';
  const branch = env.GITHUB_BRANCH || 'main';

  if (!env.GITHUB_TOKEN) {
    return json({ error: 'GITHUB_TOKEN is not configured on the server' }, 500);
  }

  let path = 'diagrams/' + subject;
  if (category) path += '/' + category;

  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`,
    {
      headers: {
        Authorization: 'Bearer ' + env.GITHUB_TOKEN,
        Accept: 'application/vnd.github+json',
      },
    }
  );

  if (res.status === 404) {
    return json({ path: path, files: [], dirs: [] });
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return json({ error: err.message || 'Failed to list contents' }, res.status);
  }

  const entries = await res.json();
  const files = entries
    .filter((e) => e.type === 'file' && e.name !== '.gitkeep')
    .map((e) => ({ name: e.name, size: e.size, path: e.path }));
  const dirs = entries
    .filter((e) => e.type === 'dir')
    .map((e) => ({ name: e.name, path: e.path }));

  return json({ path: path, files: files, dirs: dirs });
}