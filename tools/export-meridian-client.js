/* Export the legacy watch demo into the portable catalogue schema. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const context = { console, globalThis: {} };
context.globalThis.globalThis = context.globalThis;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/models.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/store.js'), 'utf8'), context);
const store = context.globalThis.AnonStore;
const state = store.getDemoState();
const catalogue = {
  categories: state.categories.map(({ id, name, slug, description, parentId, status, order }) => ({ id, name, slug, description, parentId, status, order })),
  brands: state.brands.map(({ id, name, slug, description, logo }) => ({ id, name, slug, description, logo })),
  products: state.products.map((p) => ({
    id: p.id, slug: p.slug, name: p.name, sku: p.sku, price: p.price,
    compareAtPrice: p.salePrice || null, currency: p.currency || 'KES', categoryId: p.categoryId,
    brandId: p.brandId || null, shortDescription: p.shortDescription, description: p.description,
    images: p.images.map((src, index) => ({ id: `${p.slug}-${index + 1}`, src: `assets/images/${src}`, alt: `${p.name}${index ? ` — view ${index + 1}` : ''}`, primary: index === 0 })),
    availability: p.stockStatus === 'out_of_stock' ? 'out_of_stock' : p.stockStatus === 'low_stock' ? 'low_stock' : 'in_stock',
    featured: Boolean(p.featured), newArrival: Boolean(p.newArrival), bestSeller: Boolean(p.bestSeller),
    variants: [],
    attributes: Object.fromEntries(Object.entries({
      Movement: p.movementType || p.movement, 'Case material': p.caseMaterial, 'Case size': p.caseSize,
      Dial: p.dialColor, Strap: [p.strapColor, p.strapMaterial].filter(Boolean).join(' '), Crystal: p.crystal,
      'Water resistance': p.waterResistance, 'Power reserve': p.powerReserve, Warranty: p.warrantyPeriod
    }).filter(([, value]) => value)),
    tags: p.tags || [],
    seo: { title: p.name, description: p.shortDescription || p.description || '' },
    createdAt: p.createdAt, updatedAt: p.updatedAt
  }))
};
const output = path.join(root, 'clients/meridian/catalogue.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(catalogue, null, 2) + '\n');
console.log(`Exported ${catalogue.products.length} products to ${path.relative(root, output)}`);
