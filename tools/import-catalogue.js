/* Convert a spreadsheet CSV into the portable catalogue schema. No storefront code depends on CSV. */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const [client, csvPath] = process.argv.slice(2);
if (!client || !csvPath) throw new Error('Usage: npm run import:catalogue -- <client-id> <catalogue.csv>');
function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let quote = false;
  for (let i = 0; i < text.length; i++) { const char = text[i]; const next = text[i + 1];
    if (char === '"' && quote && next === '"') { cell += '"'; i++; }
    else if (char === '"') quote = !quote;
    else if (char === ',' && !quote) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quote) { if (char === '\r' && next === '\n') i++; row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [headers, ...values] = rows;
  return values.map((values, index) => Object.fromEntries(headers.map((header, column) => [header.trim(), (values[column] || '').trim(), index])));
}
function bool(value) { return /^(true|yes|1)$/i.test(value); }
function split(value, delimiter) { return value ? value.split(delimiter).map(x => x.trim()).filter(Boolean) : []; }
function slugify(value) { return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-'); }
function attributes(value) { return Object.fromEntries(split(value, '|').map(part => { const index = part.indexOf('='); return index > 0 ? [part.slice(0, index).trim(), part.slice(index + 1).trim()] : null; }).filter(Boolean)); }
const rows = parseCsv(fs.readFileSync(path.resolve(csvPath), 'utf8'));
const categories = new Map(), brands = new Map();
const products = rows.map((row, index) => {
  const categoryName = row.category || 'Uncategorised'; const categoryId = slugify(categoryName);
  categories.set(categoryId, { id: categoryId, name: categoryName, slug: categoryId, parentId: row.subcategory ? null : null, status: 'active' });
  let brandId = null;
  if (row.brand) { brandId = slugify(row.brand); brands.set(brandId, { id: brandId, name: row.brand, slug: brandId }); }
  const slug = row.slug || slugify(row.name);
  return { id: row.id || slug, slug, name: row.name, sku: row.sku || '', price: Number(row.price), compareAtPrice: row.compareAtPrice ? Number(row.compareAtPrice) : null,
    currency: row.currency || 'KES', categoryId, subcategoryId: row.subcategory ? slugify(row.subcategory) : null, brandId, shortDescription: row.shortDescription || '', description: row.description || '',
    images: split(row.images, '|').map((file, imageIndex) => { const imageId = path.basename(file, path.extname(file)); return { id: imageId, source: `originals/${file}`, src: `assets/media/${client}/products/${imageId}/${imageId}-medium.webp`, alt: imageIndex ? `${row.name} — view ${imageIndex + 1}` : row.name, primary: imageIndex === 0 }; }),
    availability: row.availability || 'in_stock', featured: bool(row.featured), variants: [], attributes: attributes(row.attributes), tags: split(row.tags, ','), seo: { title: row.seoTitle || row.name, description: row.seoDescription || row.shortDescription || row.description || '' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), _row: index + 2 };
});
const output = { categories: [...categories.values()], brands: [...brands.values()], products };
const outputDir = path.join(root, 'clients', client);
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'catalogue.json'), JSON.stringify(output, null, 2) + '\n');
console.log(`Imported ${products.length} products, ${categories.size} categories and ${brands.size} brands.`);
