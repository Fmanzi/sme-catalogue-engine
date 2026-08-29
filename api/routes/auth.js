const { Router } = require('express');
const { login, hashPassword } = require('../auth');
const { getAdminUsers, saveAdminUsers, uid } = require('../data');
const { authMiddleware, requireRole } = require('../auth');

const router = Router();

router.post('/login', (req, res) => {
  const { clientId = 'meridian', email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const result = login(clientId, email, password);
  if (!result.ok) return res.status(401).json({ error: result.error });
  res.json(result);
});

router.get('/me', authMiddleware, (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const users = getAdminUsers(clientId);
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, ...publicUser } = user;
  res.json(publicUser);
});

router.get('/users', authMiddleware, requireRole('super_admin'), (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const users = getAdminUsers(clientId).map(({ passwordHash, ...u }) => u);
  res.json(users);
});

router.post('/users', authMiddleware, requireRole('super_admin'), (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password required' });
  const users = getAdminUsers(clientId);
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'Email already exists' });
  }
  const user = {
    id: uid(), name, email, role: role || 'catalog_manager',
    passwordHash: hashPassword(password),
    avatar: '', status: 'active',
    createdAt: new Date().toISOString(), lastLoginAt: null
  };
  users.push(user);
  saveAdminUsers(clientId, users);
  const { passwordHash, ...publicUser } = user;
  res.status(201).json(publicUser);
});

router.put('/users/:id', authMiddleware, requireRole('super_admin'), (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const users = getAdminUsers(clientId);
  const idx = users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  const { password, passwordHash, ...rest } = req.body;
  users[idx] = { ...users[idx], ...rest, id: users[idx].id };
  if (password) users[idx].passwordHash = hashPassword(password);
  saveAdminUsers(clientId, users);
  const { passwordHash: _ph, ...publicUser } = users[idx];
  res.json(publicUser);
});

router.delete('/users/:id', authMiddleware, requireRole('super_admin'), (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const users = getAdminUsers(clientId);
  const idx = users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  users.splice(idx, 1);
  saveAdminUsers(clientId, users);
  res.json({ ok: true });
});

module.exports = router;
