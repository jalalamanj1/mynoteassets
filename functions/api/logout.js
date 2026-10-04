import { json, sessionCookie } from '../lib/auth.js';

export async function onRequestGet() {
  const res = json({ ok: true });
  res.headers.append('Set-Cookie', sessionCookie('', 0));
  return res;
}