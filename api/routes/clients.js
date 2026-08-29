const { Router } = require('express');
const { listClients, getClientInfo, createClient } = require('../data');
const { hashPassword } = require('../auth');

const router = Router();

router.get('/', (req, res) => {
  const clients = listClients().map(getClientInfo);
  res.json(clients);
});

router.post('/', (req, res) => {
  const { id, name, adminName, adminEmail, adminPassword, role } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'Store id and name are required' });
  const clean = String(id).toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
  if (!/^[a-z0-9][a-z0-9-]{1,29}$/.test(clean)) {
    return res.status(400).json({ error: 'Store id must be 2–30 chars: lowercase letters, numbers, hyphens' });
  }

  const admin = (adminEmail && adminPassword)
    ? { name: adminName || name, email: adminEmail, passwordHash: hashPassword(adminPassword), role: role === 'super_admin' ? 'super_admin' : 'store_manager' }
    : null;

  try {
    const info = createClient({ id: clean, name, admin });
    res.status(201).json(info);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    res.json(getClientInfo(req.params.id));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

module.exports = router;