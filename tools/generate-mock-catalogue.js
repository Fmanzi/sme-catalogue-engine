/* Expand a reference catalogue with deterministic mock products for storefront testing. */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const client = process.argv[2] || 'meridian';
const target = Number(process.argv[3] || 300);
const cataloguePath = path.join(root, 'clients', client, 'catalogue.json');

if (!Number.isInteger(target) || target < 1) throw new Error('Target product count must be a positive integer.');

const catalogue = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));
const baseProducts = catalogue.products.filter(product => !product.mockOf);

if (!baseProducts.length) throw new Error(`No base products found for ${client}.`);
if (target < baseProducts.length) throw new Error(`Target must be at least the ${baseProducts.length} base products.`);

const availability = ['in_stock', 'in_stock', 'in_stock', 'low_stock', 'out_of_stock'];
const editionLabels = ['Classic', 'Heritage', 'Signature', 'Limited', 'Reserve', 'Chronicle'];
const products = baseProducts.map(product => ({ ...product }));

for (let index = baseProducts.length; index < target; index += 1) {
  const source = baseProducts[index % baseProducts.length];
  const edition = Math.floor(index / baseProducts.length) + 1;
  const label = editionLabels[(edition - 1) % editionLabels.length];
  const slug = `${source.slug}-${label.toLowerCase()}-${edition}`;
  const priceFactor = 0.8 + ((index * 7) % 41) / 100;
  const price = Math.round(source.price * priceFactor / 100) * 100;
  const hasOffer = index % 3 === 0;
  const createdAt = new Date(Date.UTC(2026, 7, 1) - index * 86400000).toISOString();

  products.push({
    ...source,
    id: `mock-${source.id}-${edition}`,
    mockOf: source.id,
    slug,
    name: `${source.name} ${label} ${edition}`,
    sku: `${source.sku || source.id}-M${String(edition).padStart(2, '0')}`,
    price,
    compareAtPrice: hasOffer ? Math.round(price * 0.9 / 100) * 100 : null,
    shortDescription: `${source.shortDescription || source.name} — ${label} edition ${edition}.`,
    description: `${source.description || source.shortDescription || source.name} This is mock catalogue item ${index + 1}, created for storefront testing.`,
    images: (source.images || []).map((image, imageIndex) => ({
      ...image,
      id: `${slug}-${imageIndex + 1}`,
      alt: `${source.name} ${label} ${edition}${imageIndex ? ` — view ${imageIndex + 1}` : ''}`
    })),
    availability: availability[index % availability.length],
    featured: index % 11 === 0,
    newArrival: index % 7 === 0,
    bestSeller: index % 13 === 0,
    tags: [...new Set([...(source.tags || []).filter(tag => typeof tag === 'string'), 'mock', label.toLowerCase()])],
    seo: {
      title: `${source.name} ${label} ${edition}`,
      description: `${source.shortDescription || source.name} ${label} edition ${edition}.`
    },
    createdAt,
    updatedAt: createdAt
  });
}

catalogue.products = products;
fs.writeFileSync(cataloguePath, JSON.stringify(catalogue, null, 2) + '\n');
console.log(`Generated ${products.length} products for ${client} (${baseProducts.length} base products + ${products.length - baseProducts.length} mocks).`);
