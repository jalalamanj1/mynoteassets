import { verifyToken, getSecret, getSessionToken, json } from '../lib/auth.js';

export async function onRequestGet(context) {
  const payload = await verifyToken(getSessionToken(context.request), getSecret(context.env));
  if (!payload) {
    return json({ error: 'Unauthorized' }, 401);
  }
  return json({ ok: true, username: payload.u });
}