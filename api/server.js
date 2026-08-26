require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { authMiddleware } = require('./auth');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const catalogRoutes = require('./routes/catalog');
const settingsRoutes = require('./routes/settings');
const uploadRoutes = require('./routes/upload');
const { getAdminUsers, saveAdminUsers, uid, hashPassword } = require('./data');

const app = express();
const PORT = process.env.API_PORT || 3001;

/* ---------- middleware ---------- */
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* serve the admin panel */
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

/* serve the storefront */
app.use(express.static(path.join(__dirname, '..')));

/* ---------- routes ---------- */
app.use('/api/auth', authRoutes);
app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/catalog', authMiddleware, catalogRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);

/* health check */
app.get('/api/health', (req, res) => res.json({ ok: true, version: '1.0.0' }));

/* list clients */
app.get('/api/clients', (req, res) => {
  const dir = path.join(__dirname, '..', 'clients');
  const clients = fs.readdirSync(dir).filter(f => {
    const fp = path.join(dir, f);
    return fs.statSync(fp).isDirectory() && f !== 'schema' && f !== 'template';
  });
  res.json(clients);
});

/* ---------- ensure admin users exist ---------- */
function ensureAdminUsers() {
  const clients = ['meridian'];
  for (const clientId of clients) {
    const file = path.join(__dirname, '..', 'clients', clientId, 'admins.json');
    if (!fs.existsSync(file)) {
      const defaults = [
        { id: uid(), name: 'Admin', email: 'admin@meridianwatch.com', passwordHash: hashPassword('admin123'), role: 'super_admin', avatar: '', status: 'active', createdAt: new Date().toISOString(), lastLoginAt: null }
      ];
      fs.writeFileSync(file, JSON.stringify(defaults, null, 2), 'utf8');
      console.log(`[init] Created default admin users for ${clientId}`);
    }
  }
}

/* ---------- start ---------- */
ensureAdminUsers();

app.listen(PORT, () => {
  console.log(`\n  🚀  API running at http://localhost:${PORT}`);
  console.log(`  📂  Admin panel at http://localhost:${PORT}/admin/`);
  console.log(`  🛍️  Storefront at http://localhost:${PORT}/\n`);
});
