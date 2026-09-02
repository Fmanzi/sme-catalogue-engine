const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getAdminUsers } = require('./data');

const JWT_SECRET = process.env.JWT_SECRET || 'anon-dev-secret-change-in-production';
const TOKEN_EXPIRY = '7d';
const BCRYPT_ROUNDS = 10;

function hashPassword(password) {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

function verifyPassword(password, storedHash) {
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    return bcrypt.compareSync(password, storedHash);
  }
  /* Legacy SHA-256 (first 8 hex chars) — auto-migrate on next login */
  const sha256 = require('crypto').createHash('sha256').update(password).digest('hex').slice(0, 8);
  return sha256 === storedHash;
}

function migratePasswordIfNeeded(user, clientId, newPassword) {
  if (user.passwordHash && !user.passwordHash.startsWith('$2')) {
    const newHash = hashPassword(newPassword);
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', 'clients', clientId, 'admins.json');
    const users = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      users[idx].passwordHash = newHash;
      fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
    }
  }
}

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, clientId: user.clientId || null }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const payload = verifyToken(header.slice(7));
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.user = payload;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function login(clientId, email, password) {
  const users = getAdminUsers(clientId);
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return { ok: false, error: 'No account found for that email.' };
  if (!verifyPassword(password, user.passwordHash)) return { ok: false, error: 'Incorrect password.' };
  if (user.status !== 'active') return { ok: false, error: 'Account disabled.' };
  migratePasswordIfNeeded(user, clientId, password);
  const token = generateToken({ ...user, clientId });
  const { passwordHash, ...publicUser } = user;
  return { ok: true, token, user: { ...publicUser, clientId } };
}

/* guards cross-store access — non-super admins may only touch their own store */
function storeScope(req, res, next) {
  if (req.user && req.user.role === 'super_admin') return next();
  const target = req.query.clientId || (req.body && req.body.clientId) || 'meridian';
  const mine = req.user && req.user.clientId;
  if (mine && target !== mine) return res.status(403).json({ error: 'Cross-store access denied' });
  next();
}

module.exports = { JWT_SECRET, hashPassword, verifyPassword, generateToken, verifyToken, authMiddleware, requireRole, login, storeScope };
