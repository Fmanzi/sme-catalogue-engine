const { Router } = require('express');
const { getCatalogue, saveCatalogue, uid, slugify, scheduleRebuild } = require('../data');

const router = Router();

/* ---------- categories ---------- */
router.get('/categories', (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const cat = getCatalogue(clientId);
  res.json(cat.categories || []);
});

router.post('/categories', (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const cat = getCatalogue(clientId);
  if (!cat.categories) cat.categories = [];
  const item = {
    id: uid(),
    slug: slugify(req.body.name || 'untitled'),
    name: 'Untitled Category',
    description: '',
    parentId: null,
    status: 'active',
    order: cat.categories.length + 1,
    ...req.body
  };
  cat.categories.push(item);
  saveCatalogue(clientId, cat);
  scheduleRebuild(clientId);
  res.status(201).json(item);
});

router.put('/categories/:id', (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const cat = getCatalogue(clientId);
  const idx = (cat.categories || []).findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Category not found' });
  cat.categories[idx] = { ...cat.categories[idx], ...req.body, id: cat.categories[idx].id };
  saveCatalogue(clientId, cat);
  scheduleRebuild(clientId);
  res.json(cat.categories[idx]);
});

router.delete('/categories/:id', (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const cat = getCatalogue(clientId);
  const idx = (cat.categories || []).findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Category not found' });
  cat.categories.splice(idx, 1);
  saveCatalogue(clientId, cat);
  scheduleRebuild(clientId);
  res.json({ ok: true });
});

/* ---------- brands ---------- */
router.get('/brands', (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const cat = getCatalogue(clientId);
  res.json(cat.brands || []);
});

router.post('/brands', (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const cat = getCatalogue(clientId);
  if (!cat.brands) cat.brands = [];
  const item = {
    id: uid(),
    slug: slugify(req.body.name || 'untitled'),
    name: 'Untitled Brand',
    description: '',
    logo: '',
    ...req.body
  };
  cat.brands.push(item);
  saveCatalogue(clientId, cat);
  scheduleRebuild(clientId);
  res.status(201).json(item);
});

router.put('/brands/:id', (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const cat = getCatalogue(clientId);
  const idx = (cat.brands || []).findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Brand not found' });
  cat.brands[idx] = { ...cat.brands[idx], ...req.body, id: cat.brands[idx].id };
  saveCatalogue(clientId, cat);
  scheduleRebuild(clientId);
  res.json(cat.brands[idx]);
});

router.delete('/brands/:id', (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const cat = getCatalogue(clientId);
  const idx = (cat.brands || []).findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Brand not found' });
  cat.brands.splice(idx, 1);
  saveCatalogue(clientId, cat);
  scheduleRebuild(clientId);
  res.json({ ok: true });
});

module.exports = router;
