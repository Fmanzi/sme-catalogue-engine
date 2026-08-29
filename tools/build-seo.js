/* Generate static crawl-control files from client data. */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const client = process.argv[2] || 'meridian';
const business = JSON.parse(fs.readFileSync(path.join(root, 'clients', client, 'business.json'), 'utf8'));
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'clients', client, 'catalogue.json'), 'utf8'));
const domain = String((business.site || {}).domain || '').replace(/^https?:\/\//, '').replace(/\/$/, '');

/* Always generate robots.txt */
const robotsLines = ['User-agent: *', 'Allow: /'];
if (domain) {
  robotsLines.push(`Sitemap: https://${domain}/sitemap.xml`);
} else {
  robotsLines.push('Sitemap: /sitemap.xml');
}
fs.writeFileSync(path.join(root, 'robots.txt'), robotsLines.join('\n') + '\n');

if (!domain) {
  console.warn('No site.domain set; generating sitemap with relative URLs.');
}

const base = domain ? `https://${domain}` : '';
const staticPages = ['/', '/home.html', '/mens.html', '/womens.html', '/unisex.html', '/collections.html', '/best-sellers.html', '/new-arrivals.html', '/about.html', '/contact.html', '/search.html'];
const activeProducts = catalogue.products.filter(p => (p.status || 'active') === 'active');
const urls = [...staticPages, ...activeProducts.map(product => `/product/${product.slug}/`)];
const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${base}${url}</loc></url>`).join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(root, 'sitemap.xml'), body);
console.log(`Generated sitemap.xml with ${urls.length} URLs and robots.txt.`);
