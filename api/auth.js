const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getAdminUsers } = require('./data');

const JWT_SECRET = process.env.JWT_SECRET || 'anon-dev-secret-change-in-production';
const TOKEN_EXPIRY = '7d';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex').slice(0, 8);
}

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
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
  if (hashPassword(password) !== user.passwordHash) return { ok: false, error: 'Incorrect password.' };
  if (user.status !== 'active') return { ok: false, error: 'Account disabled.' };
  const token = generateToken(user);
  const { passwordHash, ...publicUser } = user;
  return { ok: true, token, user: publicUser };
}

module.exports = { JWT_SECRET, hashPassword, generateToken, verifyToken, authMiddleware, requireRole, login };
