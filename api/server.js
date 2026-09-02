require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { authMiddleware, storeScope, requireRole, hashPassword } = require('./auth');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const catalogRoutes = require('./routes/catalog');
const settingsRoutes = require('./routes/settings');
const uploadRoutes = require('./routes/upload');
const publishRoutes = require('./routes/publish');
const genericRoutes = require('./routes/generic');
const clientRoutes = require('./routes/clients');
const orderNotifyRoutes = require('./routes/order-notify');
const { getAdminUsers, saveAdminUsers, uid, listClients } = require('./data');

const app = express();
const PORT = process.env.API_PORT || 3001;

/* ---------- middleware ---------- */
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* disable caching so browsers always get latest JS/CSS */
app.use((req, res, next) => {
  if (req.path.endsWith('.js') || req.path.endsWith('.css')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
  next();
});

/* serve the admin panel */
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

/* extensionless clean URLs for local dev (mirrors Cloudflare Pages clean URLs) */
const ROOT = path.join(__dirname, '..');
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const p = req.path;
  if (p.startsWith('/api') || p.startsWith('/admin') || p.endsWith('/') || path.extname(p)) return next();
  for (const c of [p + '.html', p + '/index.html']) {
    if (fs.existsSync(path.join(ROOT, c)) && fs.statSync(path.join(ROOT, c)).isFile()) {
      req.url = c + req.url.slice(p.length);
      break;
    }
  }
  next();
});

/* serve the storefront */
app.use(express.static(ROOT));

/* ---------- routes ---------- */
app.use('/api/auth', authRoutes);
app.use('/api/products', authMiddleware, storeScope, productRoutes);
app.use('/api/catalog', authMiddleware, storeScope, catalogRoutes);
app.use('/api/settings', authMiddleware, storeScope, settingsRoutes);
app.use('/api/upload', authMiddleware, storeScope, uploadRoutes);
app.use('/api/publish', authMiddleware, storeScope, publishRoutes);
app.use('/api/orders', authMiddleware, storeScope, genericRoutes('orders'));
app.use('/api/customers', authMiddleware, storeScope, genericRoutes('customers'));
app.use('/api/reviews', authMiddleware, storeScope, genericRoutes('reviews'));
app.use('/api/coupons', authMiddleware, storeScope, genericRoutes('coupons'));
app.use('/api/inventory', authMiddleware, storeScope, genericRoutes('inventory'));

/* order notification — public, storefront checkout posts here */
app.use('/api/order-notify', orderNotifyRoutes);

/* health check */
app.get('/api/health', (req, res) => res.json({ ok: true, version: '1.0.0' }));

/* store registry (platform super-admins only) */
app.use('/api/clients', authMiddleware, storeScope, requireRole('super_admin'), clientRoutes);

/* ---------- ensure admin users exist ---------- */
function ensureAdminUsers() {
  for (const clientId of listClients()) {
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
