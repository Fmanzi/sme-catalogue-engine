/* Generate crawlable product pages from the shared product template. */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const client = process.argv[2] || 'meridian';
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'clients', client, 'catalogue.json'), 'utf8'));
const business = JSON.parse(fs.readFileSync(path.join(root, 'clients', client, 'business.json'), 'utf8'));
const template = fs.readFileSync(path.join(root, 'product.html'), 'utf8');
function esc(value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/* Only public (active) products get crawlable pages. Draft/archived products
   are hidden from the storefront data bundle, so skip them here too. */
const active = catalogue.products.filter(p => (p.status || 'active') === 'active');

for (const product of active) {
  const title = product.seo && product.seo.title || `${product.name} | ${business.name}`;
  const description = product.seo && product.seo.description || product.shortDescription || business.description;
  const canonical = (business.site.domain ? `https://${business.site.domain}` : '') + `/product/${product.slug}/`;
  const page = template
    .replace('<head>', `<head>\n  <base href="../../">`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace('</head>', `  <meta name="description" content="${esc(description)}">\n  <link rel="canonical" href="${esc(canonical)}">\n  <meta property="og:type" content="product">\n  <meta property="og:title" content="${esc(title)}">\n  <meta property="og:description" content="${esc(description)}">\n</head>`);
  const dir = path.join(root, 'product', product.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page);
}

/* Remove stale pages for products that are no longer active */
const buildDir = path.join(root, 'product');
if (fs.existsSync(buildDir)) {
  const slugs = new Set(active.map(p => p.slug));
  for (const entry of fs.readdirSync(buildDir)) {
    if (!slugs.has(entry)) fs.rmSync(path.join(buildDir, entry), { recursive: true, force: true });
  }
}

console.log(`Generated ${active.length} product pages for ${client} (${catalogue.products.length - active.length} hidden).`);
