const { Router } = require('express');
const { getCatalogue, saveCatalogue, uid, slugify, scheduleRebuild } = require('../data');

const router = Router();

router.get('/', (req, res) => {
  const { clientId = 'meridian', status, featured, newArrival, bestSeller, category, brand, q } = req.query;
  const cat = getCatalogue(clientId);
  let products = cat.products || [];

  if (status) products = products.filter(p => p.availability === status || p.status === status);
  if (featured === 'true') products = products.filter(p => p.featured);
  if (newArrival === 'true') products = products.filter(p => p.newArrival);
  if (bestSeller === 'true') products = products.filter(p => p.bestSeller);
  if (category) products = products.filter(p => p.categoryId === category);
  if (brand) products = products.filter(p => p.brandId === brand);
  if (q) {
    const lower = q.toLowerCase();
    products = products.filter(p =>
      (p.name || '').toLowerCase().includes(lower) ||
      (p.sku || '').toLowerCase().includes(lower) ||
      (p.description || '').toLowerCase().includes(lower)
    );
  }

  res.json({
    total: products.length,
    products,
    categories: cat.categories || [],
    brands: cat.brands || []
  });
});

router.get('/:id', (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const cat = getCatalogue(clientId);
  const product = (cat.products || []).find(p => p.id === req.params.id || p.slug === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

router.post('/', (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const cat = getCatalogue(clientId);
  if (!cat.products) cat.products = [];

  const product = {
    id: uid(),
    slug: slugify(req.body.name || 'untitled'),
    name: 'Untitled Product',
    price: 0,
    categoryId: null,
    brandId: null,
    images: [],
    availability: 'in_stock',
    featured: false,
    newArrival: false,
    bestSeller: false,
    variants: [],
    attributes: {},
    tags: [],
    seo: { title: '', description: '' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...req.body
  };

  if (!product.slug || product.slug === 'untitled') {
    product.slug = slugify(product.name) + '-' + product.id.slice(-4);
  }

  cat.products.push(product);
  saveCatalogue(clientId, cat);
  scheduleRebuild(clientId);
  res.status(201).json(product);
});

router.put('/:id', (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const cat = getCatalogue(clientId);
  const idx = (cat.products || []).findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });

  const updated = {
    ...cat.products[idx],
    ...req.body,
    id: cat.products[idx].id,
    updatedAt: new Date().toISOString()
  };

  if (req.body.name && !req.body.slug) {
    updated.slug = slugify(req.body.name);
  }

  cat.products[idx] = updated;
  saveCatalogue(clientId, cat);
  scheduleRebuild(clientId);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const cat = getCatalogue(clientId);
  const idx = (cat.products || []).findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });

  cat.products.splice(idx, 1);
  saveCatalogue(clientId, cat);
  scheduleRebuild(clientId);
  res.json({ ok: true });
});

/* bulk operations */
router.post('/bulk', (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const { action, ids, data } = req.body;
  const cat = getCatalogue(clientId);

  if (action === 'delete') {
    cat.products = (cat.products || []).filter(p => !ids.includes(p.id));
    saveCatalogue(clientId, cat);
    scheduleRebuild(clientId);
    return res.json({ ok: true, deleted: ids.length });
  }

  if (action === 'update') {
    let updated = 0;
    cat.products = (cat.products || []).map(p => {
      if (ids.includes(p.id)) { updated++; return { ...p, ...data, updatedAt: new Date().toISOString() }; }
      return p;
    });
    saveCatalogue(clientId, cat);
    scheduleRebuild(clientId);
    return res.json({ ok: true, updated });
  }

  res.status(400).json({ error: 'Unknown bulk action' });
});

module.exports = router;
