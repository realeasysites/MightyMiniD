const crypto = require('crypto');

const COOKIE = 'mmd_admin';
const SESSION_HOURS = 12;

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

function sign(payload) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('base64url');
}

function passwordMatches(attempt) {
  // Hash both sides so lengths match, then compare in constant time.
  return crypto.timingSafeEqual(sha256(attempt || ''), sha256(process.env.ADMIN_PASSWORD));
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function setSession(req, res) {
  const expires = Date.now() + SESSION_HOURS * 3600 * 1000;
  const token = `${expires}.${sign(String(expires))}`;
  const parts = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    'Path=/admin',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${SESSION_HOURS * 3600}`
  ];
  if (req.secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=0`);
}

function isAuthed(req) {
  const token = readCookie(req, COOKIE);
  if (!token) return false;
  const [expires, sig] = token.split('.');
  if (!expires || !sig || Number(expires) < Date.now()) return false;
  const expected = Buffer.from(sign(expires));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

function requireAuth(req, res, next) {
  if (isAuthed(req)) return next();
  res.status(401).json({ error: 'Please log in again.' });
}

module.exports = { passwordMatches, setSession, clearSession, requireAuth, isAuthed };
