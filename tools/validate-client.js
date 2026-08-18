/* Validate generated catalogue data without needing a database or frontend runtime. */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const client = process.argv[2] || 'meridian';
const dir = path.join(root, 'clients', client);
const business = JSON.parse(fs.readFileSync(path.join(dir, 'business.json'), 'utf8'));
const catalogue = JSON.parse(fs.readFileSync(path.join(dir, 'catalogue.json'), 'utf8'));
const errors = []; const unique = (values, label) => values.forEach((value, index) => { if (!value) errors.push(`${label} at row ${index + 1} is required`); if (values.indexOf(value) !== index) errors.push(`Duplicate ${label}: ${value}`); });
if (!business.id || !business.name) errors.push('business.id and business.name are required');
if (!/^\d{8,15}$/.test(String((business.contact || {}).whatsapp || ''))) errors.push('business.contact.whatsapp must contain 8–15 digits');
unique(catalogue.products.map(p => p.id), 'product id'); unique(catalogue.products.map(p => p.slug), 'product slug');
const categories = new Set(catalogue.categories.map(c => c.id)); const brands = new Set((catalogue.brands || []).map(b => b.id));
catalogue.products.forEach((product, index) => {
  const at = `product ${index + 1} (${product.name || product.id || 'unnamed'})`;
  if (!product.name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug || '')) errors.push(`${at}: valid name and slug are required`);
  if (!Number.isFinite(product.price) || product.price < 0) errors.push(`${at}: price must be a non-negative number`);
  if (!categories.has(product.categoryId)) errors.push(`${at}: categoryId does not exist`);
  if (product.brandId && !brands.has(product.brandId)) errors.push(`${at}: brandId does not exist`);
  if (!Array.isArray(product.images) || !product.images.length) errors.push(`${at}: at least one image is required`);
  if ((product.images || []).filter(image => image.primary).length !== 1) errors.push(`${at}: exactly one primary image is required`);
});
if (errors.length) { console.error(errors.map(error => `• ${error}`).join('\n')); process.exitCode = 1; } else console.log(`✓ ${client}: ${catalogue.products.length} products validated`);
