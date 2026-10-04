import { signToken, getSecret, json } from '../lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const username = String(body.username || '').trim();
  const password = String(body.password || '');

  if (username !== env.CAG_USER || password !== env.CAG_PASS) {
    return json({ error: 'Invalid username or password' }, 401);
  }

  const token = await signToken(
    { u: username, exp: Date.now() + 24 * 60 * 60 * 1000 },
    getSecret(env)
  );

  return json({ token, username });
}