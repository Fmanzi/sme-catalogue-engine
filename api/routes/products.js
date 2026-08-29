const { Router } = require('express');
const path = require('path');
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
    compareAtPrice: req.body.compareAtPrice != null ? req.body.compareAtPrice : (req.body.salePrice != null ? Number(req.body.salePrice) : null),
    categoryId: null,
    brandId: null,
    collectionIds: [],
    images: [],
    availability: 'in_stock',
    status: 'draft',
    stockQuantity: 0,
    lowStockThreshold: 5,
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

  if (product.salePrice != null && product.compareAtPrice == null) {
    product.compareAtPrice = Number(product.salePrice);
  }
  if (product.stockStatus && !product.availability) {
    product.availability = product.stockStatus;
  }

  if (!product.slug || product.slug === 'untitled') {
    product.slug = uniqueSlug(cat, slugify(product.name));
  }
  product.slug = uniqueSlug(cat, product.slug);

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
    updated.slug = uniqueSlug(cat, slugify(req.body.name), req.body.id);
  } else if (req.body.slug) {
    updated.slug = uniqueSlug(cat, slugify(req.body.slug), req.body.id);
  }

  if (req.body.salePrice != null && req.body.compareAtPrice == null) {
    updated.compareAtPrice = Number(req.body.salePrice);
    delete updated.salePrice;
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

/* CSV import — rows are flat catalogue.csv-style objects (already parsed client-side) */
router.post('/import', (req, res) => {
  const { clientId = 'meridian' } = req.query;
  const { rows = [], mode = 'create_or_update' } = req.body;
  if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ error: 'No rows to import' });
  if (!['create', 'update', 'create_or_update'].includes(mode)) return res.status(400).json({ error: 'Unknown mode' });

  const cat = getCatalogue(clientId);
  cat.products = cat.products || [];
  cat.categories = cat.categories || [];
  cat.brands = cat.brands || [];

  const categories = cat.categories;
  const brands = cat.brands;
  const bySlug = { categories: {}, brands: {} };
  categories.forEach(c => { bySlug.categories[c.slug] = c; });
  brands.forEach(b => { bySlug.brands[b.slug] = b; });
  const byId = {};
  cat.products.forEach(p => { byId[p.id] = p; });
  const bySku = {};
  cat.products.forEach(p => { if (p.sku) bySku[String(p.sku).toLowerCase()] = p; });

  const stats = { created: 0, updated: 0, skipped: 0, categoriesCreated: 0, brandsCreated: 0 };
  const errors = [];

  rows.forEach((raw, idx) => {
    const line = idx + 2; /* header is row 1 */
    const name = String((raw && raw.name) || '').trim();
    if (!name) { stats.skipped++; errors.push({ row: line, error: 'Missing product name' }); return; }
    const price = Number(raw.price);
    if (!Number.isFinite(price) || price < 0) { stats.skipped++; errors.push({ row: line, error: `Invalid price "${raw.price}"` }); return; }

    const categoryName = String((raw.category || '').trim() || 'Uncategorised');
    const categorySlug = slugify(categoryName);
    let category = bySlug.categories[categorySlug];
    if (!category) {
      category = { id: categorySlug, name: categoryName, slug: categorySlug, description: '', parentId: null, status: 'active', order: categories.length };
      categories.push(category);
      bySlug.categories[categorySlug] = category;
      stats.categoriesCreated++;
    }

    let brandId = null;
    if (raw.brand) {
      const brandName = String(raw.brand).trim();
      const brandSlug = slugify(brandName);
      let brand = bySlug.brands[brandSlug];
      if (!brand) {
        brand = { id: brandSlug, name: brandName, slug: brandSlug, description: '', logo: '', status: 'active' };
        brands.push(brand);
        bySlug.brands[brandSlug] = brand;
        stats.brandsCreated++;
      }
      brandId = brand.id;
    }

    const images = split(String(raw.images || ''), '|')
      .filter(Boolean)
      .map((file, i) => {
        const imageId = path.basename(String(file).replace(/#[^/]*$/, ''), path.extname(String(file)));
        return {
          id: imageId || `img-${i}`,
          source: String(file),
          src: `assets/media/${clientId}/products/${imageId || `img-${i}`}/${imageId || `img-${i}`}-medium.webp`,
          alt: i ? `${name} — view ${i + 1}` : name,
          primary: i === 0
        };
      });

    const row = {
      id: String((raw.id || '').trim() || slugify(name)),
      slug: slugify(String((raw.slug || '').trim() || name)),
      name,
      sku: String((raw.sku || '').trim() || ''),
      price,
      compareAtPrice: raw.compareAtPrice !== undefined && raw.compareAtPrice !== '' ? Number(raw.compareAtPrice) || null : null,
      currency: String(raw.currency || '').trim() || 'KES',
      categoryId: category.id,
      subcategoryId: raw.subcategory ? slugify(String(raw.subcategory)) : null,
      brandId,
      shortDescription: String(raw.shortDescription || raw.short_description || '').trim(),
      description: String(raw.description || '').trim(),
      images,
      availability: String(raw.availability || 'in_stock').trim(),
      status: String((raw.status || '').trim() || 'draft'),
      featured: bool(raw.featured),
      newArrival: bool(raw.newArrival),
      bestSeller: bool(raw.bestSeller),
      variants: [],
      attributes: attributes(String(raw.attributes || '')),
      tags: split(String(raw.tags || ''), ','),
      seo: {
        title: String((raw.seoTitle || raw.seo_title || '').trim() || name),
        description: String((raw.seoDescription || raw.seo_description || '').trim() || raw.shortDescription || raw.description || '')
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const skuKey = row.sku ? String(row.sku).toLowerCase() : null;
    const existing = (skuKey && bySku[skuKey]) || byId[row.id] || (cat.products.find(p => p.slug === row.slug) || null);

    if (existing) {
      if (mode === 'create') { stats.skipped++; errors.push({ row: line, error: `"${name}" already exists (mode: create only)` }); return; }
      const merged = { ...existing, ...row, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
      merged.slug = uniqueSlug(cat, row.slug, existing.id);
      const ei = cat.products.findIndex(p => p.id === existing.id);
      cat.products[ei] = merged;
      if (merged.sku) bySku[skuKey] = merged;
      byId[merged.id] = merged;
      stats.updated++;
      return;
    }

    while (byId[row.id] || cat.products.some(p => p.slug === row.slug)) row.id = uid();
    row.slug = uniqueSlug(cat, row.slug);
    cat.products.push(row);
    byId[row.id] = row;
    if (row.sku) bySku[skuKey] = row;
    stats.created++;
  });

  saveCatalogue(clientId, cat);
  scheduleRebuild(clientId);
  res.json({ ok: true, ...stats, errors });
});

function split(value, sep) {
  return String(value || '').split(sep).map(s => s.trim()).filter(Boolean);
}

function bool(value) {
  if (typeof value === 'boolean') return value;
  return /^(true|1|yes|y|on)$/i.test(String(value).trim());
}

function attributes(str) {
  if (!str) return {};
  const out = {};
  split(str, '|').forEach(pair => {
    const eq = pair.indexOf('=');
    if (eq === -1) { out[pair.trim()] = true; return; }
    out[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  });
  return out;
}

function uniqueSlug(cat, base, exceptId) {
  const parts = [base || 'untitled', 'untitled'];
  let s = parts[0] || 'untitled';
  const taken = (cat.products || []).filter(p => p.id !== exceptId).some(p => p.slug === s);
  let n = 2;
  while (taken) {
    s = parts[0] + '-' + n++;
    if (!(cat.products || []).filter(p => p.id !== exceptId).some(p => p.slug === s)) break;
  }
  return s;
}

module.exports = router;
