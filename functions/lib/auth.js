// Shared auth helpers for Cloudflare Pages Functions.
// Tokens are signed (HMAC-SHA256) so uploads can be authenticated
// without sending the password on every request.

const enc = new TextEncoder();

function toB64(bytes) {
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

function fromB64(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function signToken(payload, secret) {
  const data = toB64(enc.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return data + '.' + toB64(new Uint8Array(sig));
}

export async function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sigB64] = parts;

  let expected;
  try {
    expected = fromB64(sigB64);
  } catch (e) {
    return null;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const valid = await crypto.subtle.verify('HMAC', key, expected, enc.encode(data));
  if (!valid) return null;

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromB64(data)));
  } catch (e) {
    return null;
  }

  if (!payload || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
  return payload;
}

export function getSecret(env) {
  return env.SESSION_SECRET || env.CAG_PASS || 'dev-secret-change-me';
}

export function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function bearerToken(request) {
  const auth = request.headers.get('Authorization') || '';
  return auth.replace(/^Bearer\s+/i, '').trim();
}