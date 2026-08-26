/* ------------------------------------------------------------------ *
 *  store.js
 *  Shared data layer for the watch e-commerce platform.
 *
 *  - Seed data lives in SEED (clearly labelled DEMO data).
 *  - AnonStore is a small localStorage-backed repository exposing the
 *    same CRUD surface a REST/GraphQL backend would later expose.
 *  - Both the storefront and the admin dashboard talk to AnonStore,
 *    so changes made in the admin are reflected on the storefront.
 *
 *  INTEGRATION POINT:
 *  Replace the bodies of the repository methods (all/create/update/
 *  remove/find) with fetch() calls to your real API. The rest of the
 *  application does not need to change.
 * ------------------------------------------------------------------ */

'use strict';

(function (global) {

  const STORAGE_KEY = 'anon.watchstore.v1';
  const SESSION_KEY = 'anon.session.v1';

  /* ---------- API mode detection ---------- */
  /* When the admin panel is open and the API server is running,
     all CRUD goes through the REST API instead of localStorage. */
  const _isLocalAdmin = /\/admin\//.test(global.location && global.location.pathname);
  const _apiUrl = (global.ANON_API_URL || (_isLocalAdmin ? 'http://localhost:3001' : ''));
  const _useApi = !!(global.AnonAPI && _apiUrl);

  if (_useApi) {
    global.AnonAPI.api.configure(_apiUrl);
  }

  const hasStorage = (function () {
    try { const t = '__anon_test__'; global.localStorage.setItem(t, '1'); global.localStorage.removeItem(t); return true; }
    catch (e) { return false; }
  })();

  const memory = { data: null };

  /* ---------- tiny utilities ---------- */

  const uid = () => 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  /* deterministic PRNG so demo data is stable */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function daysAgo(n, hourOffset) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    if (hourOffset !== undefined) d.setHours(hourOffset, Math.floor(Math.random() * 60), 0, 0);
    else d.setHours(10 + (n % 9), 30, 0, 0);
    return d.toISOString();
  }

  const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

  /* ---------- DEMO SEED DATA (mock data, clearly separated) ---------- */

  const SEED = (function () {
    const rnd = mulberry32(20260816);

    const brands = [
      { id: 'br-aurelia', name: 'Aurelia', slug: 'aurelia', description: 'Swiss-precision dress and automatic timepieces crafted for those who value quiet luxury.', logo: '', country: 'Switzerland', founded: 1958, status: 'active' },
      { id: 'br-nocturne', name: 'Nocturne', slug: 'nocturne', description: 'Vintage-inspired mechanical watches with moonphase complications and hand-finished dials.', logo: '', country: 'Germany', founded: 1967, status: 'active' },
      { id: 'br-helios', name: 'Helios', slug: 'helios', description: 'Modern sport and dive watches engineered for performance above and below the surface.', logo: '', country: 'Switzerland', founded: 1984, status: 'active' },
      { id: 'br-obsidian', name: 'Obsidian', slug: 'obsidian', description: 'Haute horlogerie maison producing limited luxury watches with in-house calibers.', logo: '', country: 'Switzerland', founded: 1921, status: 'active' },
      { id: 'br-meridian', name: 'Meridian', slug: 'meridian', description: 'The house brand — everyday automatic and quartz watches built on heritage foundations.', logo: '', country: 'United Kingdom', founded: 1904, status: 'active' },
      { id: 'br-velocita', name: 'Velocità', slug: 'velocita', description: 'Italian-influenced chronographs for motorsport enthusiasts and collectors.', logo: '', country: 'Italy', founded: 1972, status: 'active' }
    ];

    const categories = [
      { id: 'cat-dress', name: 'Dress Watches', slug: 'dress-watches', description: 'Refined timepieces for formal occasions.', status: 'active', order: 1, parentId: null },
      { id: 'cat-dive', name: 'Dive Watches', slug: 'dive-watches', description: 'Water-resistant watches built for the deep.', status: 'active', order: 2, parentId: null },
      { id: 'cat-sports', name: 'Sports Watches', slug: 'sports-watches', description: 'Rugged and ready for anything.', status: 'active', order: 3, parentId: null },
      { id: 'cat-luxury', name: 'Luxury Watches', slug: 'luxury-watches', description: 'Exceptional craftsmanship and materials.', status: 'active', order: 4, parentId: null },
      { id: 'cat-automatic', name: 'Automatic Watches', slug: 'automatic-watches', description: 'Self-winding mechanical precision.', status: 'active', order: 5, parentId: null },
      { id: 'cat-mechanical', name: 'Mechanical Watches', slug: 'mechanical-watches', description: 'Hand-wound movements for purists.', status: 'active', order: 6, parentId: null },
      { id: 'cat-quartz', name: 'Quartz Watches', slug: 'quartz-watches', description: 'Battery-powered accuracy at a friendly price.', status: 'active', order: 7, parentId: null },
      { id: 'cat-chronograph', name: 'Chronograph Watches', slug: 'chronograph-watches', description: 'Stopwatch complications for timing life.', status: 'active', order: 8, parentId: null },
      { id: 'cat-limited', name: 'Limited Edition', slug: 'limited-edition', description: 'Numbered pieces for the discerning collector.', status: 'active', order: 9, parentId: null },
      { id: 'cat-classic', name: 'Classic Watches', slug: 'classic-watches', description: 'Timeless silhouettes that never go out of style.', status: 'active', order: 10, parentId: null },
      { id: 'cat-smart', name: 'Smart Watches', slug: 'smart-watches', description: 'Connected wearables with modern flair.', status: 'active', order: 11, parentId: null },
      { id: 'cat-pocket', name: 'Pocket Watches', slug: 'pocket-watches', description: 'A nostalgic nod to a bygone era.', status: 'active', order: 12, parentId: null }
    ];

    const collections = [
      { id: 'col-classic', name: 'Classic Collection', slug: 'classic', description: 'Quietly elegant watches for the office and evening alike.', featured: true, status: 'active' },
      { id: 'col-heritage', name: 'Heritage Collection', slug: 'heritage', description: 'Reissues and homages celebrating our archival designs.', featured: true, status: 'active' },
      { id: 'col-executive', name: 'Executive Collection', slug: 'executive', description: 'Statement pieces for leaders and decision-makers.', featured: true, status: 'active' },
      { id: 'col-sport', name: 'Sport Collection', slug: 'sport', description: 'Built to be worn hard, wherever the adventure takes you.', featured: true, status: 'active' },
      { id: 'col-luxury', name: 'Luxury Collection', slug: 'luxury', description: 'Our most precious materials and most complex movements.', featured: true, status: 'active' },
      { id: 'col-limited', name: 'Limited Edition', slug: 'limited-edition', description: 'Numbered editions that will never be produced again.', featured: false, status: 'active' }
    ];

    /* [name, brandId, catId, gender, movement, movementType, caseSize, caseMaterial,
        dialColor, strapMaterial, strapColor, crystal, wr, power, functions, warranty,
        price, salePrice, stock, cost, featured, newArrival, bestSeller, limited, rating, imgIndex ] */
    const rows = [
      ['Aurelia Monarch 38', 'br-aurelia', 'cat-dress', 'men', 'automatic', 'Self-winding', '38mm', 'Stainless steel', 'Silver sunray', 'Alligator leather', 'Black', 'Sapphire', '5 ATM', '40 hours', 'Date, small seconds', '2 years', 245700, 206700, 14, 127400, 1, 1, 0, 0, 4.9, 1],
      ['Aurelia Celestine 34', 'br-aurelia', 'cat-dress', 'women', 'quartz', 'Swiss quartz', '34mm', 'Steel & gold', 'Mother of pearl', 'Leather', 'Ivory', 'Sapphire', '3 ATM', '—', 'Date', '2 years', 188500, null, 9, 98800, 1, 1, 0, 0, 4.7, 2],
      ['Nocturne Heritage 36', 'br-nocturne', 'cat-mechanical', 'unisex', 'mechanical', 'Hand-wound', '36mm', 'Yellow gold', 'Cream enamel', 'Calfskin', 'Brown', 'Domed acrylic', '3 ATM', '38 hours', 'Small seconds', '2 years', 286000, 253500, 6, 156000, 1, 0, 0, 1, 4.8, 3],
      ['Helios Diver Pro 300', 'br-helios', 'cat-dive', 'men', 'automatic', 'Self-winding', '42mm', 'Brushed steel', 'Deep blue', 'Steel bracelet', 'Steel', 'Sapphire', '30 ATM', '70 hours', 'Date, uni-directional bezel', '5 years', 149500, 115700, 24, 83200, 1, 1, 0, 1, 4.8, 4],
      ['Obsidian Royale', 'br-obsidian', 'cat-luxury', 'men', 'mechanical', 'Hand-wound', '40mm', '18k white gold', 'Guilloché silver', 'Alligator leather', 'Black', 'Sapphire', '5 ATM', '72 hours', 'Power reserve indicator', '5 years', 1664000, null, 3, 1144000, 1, 0, 0, 0, 5.0, 5],
      ['Meridian Executive 40', 'br-meridian', 'cat-dress', 'men', 'automatic', 'Self-winding', '40mm', 'Stainless steel', 'Opaline silver', 'Steel bracelet', 'Steel', 'Sapphire', '10 ATM', '50 hours', 'Date, day', '3 years', 127400, 101400, 32, 62400, 1, 1, 0, 0, 4.6, 6],
      ['Velocità GT Chrono', 'br-velocita', 'cat-chronograph', 'men', 'chronograph', 'Quartz chrono', '43mm', 'Steel & carbon', 'Black', 'Leather', 'Black', 'Sapphire', '10 ATM', '—', 'Chronograph, tachymeter', '2 years', 98800, 77870, 18, 49400, 1, 0, 1, 0, 4.5, 7],
      ['Helios AeroSport', 'br-helios', 'cat-sports', 'unisex', 'quartz', 'Swiss quartz', '41mm', 'Titanium', 'Grey', 'Rubber', 'Black', 'Sapphire', '20 ATM', '—', 'Date, chronograph', '3 years', 89700, null, 21, 42900, 1, 0, 1, 0, 4.4, 8],
      ['Aurelia Lumiere 32', 'br-aurelia', 'cat-dress', 'women', 'quartz', 'Swiss quartz', '32mm', '18k rose gold', 'White pearl', 'Silk satin', 'Rose', 'Sapphire', '3 ATM', '—', 'Date', '2 years', 273000, null, 7, 149500, 1, 1, 0, 1, 4.7, 9],
      ['Nocturne Classic 37', 'br-nocturne', 'cat-classic', 'unisex', 'mechanical', 'Hand-wound', '37mm', 'Steel', 'White', 'Calfskin', 'Tan', 'Sapphire', '3 ATM', '42 hours', 'Small seconds', '2 years', 175500, 154700, 11, 91000, 1, 0, 1, 0, 4.6, 10],
      ['Obsidian Eclipse Tourbillon', 'br-obsidian', 'cat-luxury', 'men', 'mechanical', 'Tourbillon', '42mm', 'Platinum', 'Openwork', 'Alligator leather', 'Brown', 'Sapphire', '5 ATM', '96 hours', 'Tourbillon, power reserve', '5 years', 5980000, null, 1, 4160000, 1, 0, 0, 1, 5.0, 11],
      ['Meridian Classic 36', 'br-meridian', 'cat-classic', 'unisex', 'quartz', 'Swiss quartz', '36mm', 'Stainless steel', 'Black', 'Leather', 'Black', 'Mineral', '3 ATM', '—', 'Date', '2 years', 62400, 51870, 40, 27300, 1, 0, 0, 0, 4.3, 12],
      ['Velocità Veloce Racing', 'br-velocita', 'cat-chronograph', 'men', 'chronograph', 'Automatic chrono', '44mm', 'Steel', 'Racing green', 'Leather', 'Green', 'Sapphire', '10 ATM', '46 hours', 'Chronograph, tachymeter', '3 years', 188500, 156000, 8, 106600, 1, 0, 0, 1, 4.7, 13],
      ['Helios Deep Blue 42', 'br-helios', 'cat-dive', 'men', 'automatic', 'Self-winding', '42mm', 'Steel', 'Navy blue', 'Steel bracelet', 'Steel', 'Sapphire', '50 ATM', '70 hours', 'Date, helium escape valve', '5 years', 162500, 129870, 5, 91000, 1, 1, 0, 0, 4.9, 14],
      ['Aurelia Petite 28', 'br-aurelia', 'cat-dress', 'women', 'quartz', 'Swiss quartz', '28mm', 'Steel', 'Champagne', 'Mesh bracelet', 'Gold', 'Sapphire', '3 ATM', '—', 'Date', '2 years', 115700, null, 16, 55900, 1, 1, 0, 0, 4.5, 15],
      ['Nocturne Moonphase', 'br-nocturne', 'cat-mechanical', 'unisex', 'mechanical', 'Hand-wound', '39mm', 'Steel', 'Midnight blue', 'Calfskin', 'Dark brown', 'Sapphire', '3 ATM', '46 hours', 'Moonphase, date', '3 years', 344500, null, 4, 195000, 1, 0, 0, 0, 4.9, 16],
      ['Obsidian Sapphire 39', 'br-obsidian', 'cat-luxury', 'unisex', 'automatic', 'Self-winding', '39mm', '18k rose gold', 'Blue', 'Leather', 'Brown', 'Sapphire', '5 ATM', '68 hours', 'Date', '5 years', 1157000, 1014000, 2, 728000, 1, 0, 0, 0, 4.8, 17],
      ['Meridian Sport 41', 'br-meridian', 'cat-sports', 'men', 'quartz', 'Swiss quartz', '41mm', 'Steel', 'Green', 'Steel bracelet', 'Steel', 'Sapphire', '10 ATM', '—', 'Date, stopwatch', '2 years', 70200, 58370, 26, 31200, 1, 0, 1, 0, 4.4, 18],
      ['Velocità Rond Classic', 'br-velocita', 'cat-classic', 'women', 'quartz', 'Swiss quartz', '33mm', 'Steel & gold', 'Ivory', 'Mesh bracelet', 'Silver', 'Sapphire', '3 ATM', '—', 'Date', '2 years', 80600, null, 13, 39000, 1, 0, 0, 0, 4.3, 19],
      ['Helios Trail Runner', 'br-helios', 'cat-sports', 'unisex', 'solar', 'Solar quartz', '40mm', 'Titanium', 'Orange', 'Rubber', 'Black', 'Sapphire', '20 ATM', '6 months reserve', 'Date, compass bezel', '3 years', 106600, 93600, 10, 54600, 1, 1, 1, 0, 4.6, 20],
      ['Aurelia Grand Automatic 40', 'br-aurelia', 'cat-automatic', 'men', 'automatic', 'Self-winding', '40mm', 'Steel', 'Silver', 'Leather', 'Brown', 'Sapphire', '5 ATM', '60 hours', 'Date, exhibition back', '3 years', 214500, 180700, 7, 117000, 1, 1, 0, 1, 4.8, 21],
      ['Nocturne Pocket Watch', 'br-nocturne', 'cat-pocket', 'men', 'mechanical', 'Hand-wound', '50mm', 'Silver', 'White enamel', 'Chain', 'Silver', 'Acrylic', '1 ATM', '40 hours', 'Hour, minute, seconds', '2 years', 127400, 110500, 6, 67600, 1, 0, 0, 0, 4.5, 22],
      ['Meridian Heritage Limited 001', 'br-meridian', 'cat-limited', 'unisex', 'mechanical', 'Hand-wound', '38mm', 'Steel', 'Salmon', 'Calfskin', 'Brown', 'Sapphire', '3 ATM', '44 hours', 'Numbered edition of 300', '5 years', 318500, null, 12, 182000, 1, 0, 1, 1, 4.9, 23],
      ['Obsidian Noir 40', 'br-obsidian', 'cat-luxury', 'men', 'automatic', 'Self-winding', '40mm', 'Black PVD steel', 'Black', 'Leather', 'Black', 'Sapphire', '5 ATM', '68 hours', 'Date, power reserve', '5 years', 936000, 845000, 2, 572000, 1, 1, 0, 1, 4.9, 24]
    ];

    const genderMap = { men: 'men', women: 'women', unisex: 'unisex' };

    const products = rows.map((r, i) => {
      const id = 'prd-' + (i + 1);
      const name = r[0];
      const collectionByCat = {
        'cat-dress': ['col-classic', 'col-executive'],
        'cat-luxury': ['col-luxury', 'col-classic'],
        'cat-mechanical': ['col-heritage', 'col-classic'],
        'cat-dive': ['col-sport'],
        'cat-sports': ['col-sport'],
        'cat-chronograph': ['col-sport', 'col-executive'],
        'cat-classic': ['col-classic', 'col-heritage'],
        'cat-limited': ['col-limited', 'col-heritage'],
        'cat-automatic': ['col-executive', 'col-classic'],
        'cat-quartz': ['col-classic'],
        'cat-smart': ['col-sport'],
        'cat-pocket': ['col-heritage']
      };
      const img = String(r[25]).padStart(2, '0');
      const tags = [r[4], r[8], r[9], r[16]];
      if (r[23]) tags.push('limited');
      return {
        id, name,
        brandId: r[1], sku: 'MER-' + String(1000 + i * 7),
        slug: slugify(name),
        shortDescription: `${r[0]} — ${r[4]} ${r[8]} watch, ${r[10]} strap, ${r[12]} water resistance.`,
        description: `The ${name} pairs a ${r[8]} dial with a ${r[6]} ${r[7]} case and a ${r[10]} ${r[9]} strap. Its ${r[4]} ${r[5]} movement delivers dependable timekeeping, protected by a ${r[11]} crystal. Finished by hand and guaranteed for ${r[15]}, it is an heirloom-quality timepiece for the modern collector.`,
        status: 'active',
        featured: !!r[20],
        newArrival: !!r[21],
        bestSeller: !!r[22],
        price: r[16], salePrice: r[17], costPrice: r[19], currency: 'KES', taxClass: 'standard',
        stockQuantity: r[18], reservedStock: 0, lowStockThreshold: 5,
        stockStatus: r[18] === 0 ? 'out_of_stock' : r[18] <= 5 ? 'low_stock' : 'in_stock',
        allowBackorders: false,
        model: name, reference: 'REF-' + String(1100 + i * 13),
        movement: r[4], movementType: r[5], caseSize: r[6], caseMaterial: r[7],
        caseShape: 'Round', dialColor: r[8], strapMaterial: r[9], strapColor: r[10],
        crystal: r[11], waterResistance: r[12], powerReserve: r[13], functions: r[14],
        warrantyPeriod: r[15],
        categoryId: r[2], collectionIds: collectionByCat[r[2]] || ['col-classic'],
        gender: r[3], tags,
        images: ['products/watch-' + img + '.svg', 'products/watch-' + img + '-b.svg'],
        mainImage: 'products/watch-' + img + '.svg',
        rating: r[24], ratingCount: 4 + (i % 60),
        soldCount: 10 + Math.floor(rnd() * 220),
        createdAt: daysAgo(10 + (i % 40)),
        updatedAt: daysAgo(1 + (i % 6))
      };
    });

    /* -------- customers (demo) -------- */
    const customers = [
      ['Ava', 'Lindqvist', 'ava.lindqvist@example.com', '+46 70 123 45 67', 'Stockholm, Sweden'],
      ['Liam', "O'Connor", 'liam.oconnor@example.com', '+353 85 000 1122', 'Dublin, Ireland'],
      ['Sofia', 'Mancini', 'sofia.mancini@example.com', '+39 320 555 0199', 'Milan, Italy'],
      ['Noah', 'Weber', 'noah.weber@example.com', '+49 151 2345 678', 'Munich, Germany'],
      ['Emma', 'Van Dijk', 'emma.vandijk@example.com', '+31 6 1234 5678', 'Amsterdam, Netherlands'],
      ['Ethan', 'Bennett', 'ethan.bennett@example.com', '+44 7700 900123', 'London, UK'],
      ['Isla', 'Fraser', 'isla.fraser@example.com', '+1 555 010 2233', 'Toronto, Canada'],
      ['Lucas', 'Silva', 'lucas.silva@example.com', '+55 11 98765 4321', 'São Paulo, Brazil'],
      ['Mia', 'Tanaka', 'mia.tanaka@example.com', '+81 90 1234 5678', 'Tokyo, Japan'],
      ['Oliver', 'Smith', 'oliver.smith@example.com', '+1 555 014 7788', 'New York, USA'],
      ['Chloe', 'Dubois', 'chloe.dubois@example.com', '+33 6 12 34 56 78', 'Paris, France'],
      ['Kai', 'Nakamura', 'kai.nakamura@example.com', '+81 80 9876 5432', 'Osaka, Japan'],
      ['Zoe', 'Christensen', 'zoe.christensen@example.com', '+45 20 12 34 56', 'Copenhagen, Denmark'],
      ['Amara', 'Okafor', 'amara.okafor@example.com', '+234 803 123 4567', 'Lagos, Nigeria']
    ].map((c, i) => ({
      id: 'cus-' + (i + 1), firstName: c[0], lastName: c[1], email: c[2], phone: c[3],
      passwordHash: null, status: 'active', createdAt: daysAgo(40 + i * 6),
      addresses: [{
        id: uid(), label: 'Home', line1: '12 Aventurine Street', line2: '',
        city: c[4].split(',')[0] || c[4], region: '', postalCode: '00000', country: c[4].split(', ')[1] || 'International', phone: c[3]
      }],
      wishlist: [], orderIds: []
    }));

    /* -------- orders (demo) -------- */
    const orderStatusPool = ['delivered', 'delivered', 'delivered', 'shipped', 'processing', 'pending', 'cancelled', 'refunded', 'confirmed'];
    const paymentPool = ['paid', 'paid', 'paid', 'paid', 'unpaid', 'paid', 'refunded'];
    const orderNumbers = [];
    const orders = [];

    for (let i = 0; i < 60; i++) {
      const n = String(1000 + i);
      orderNumbers.push(n);
      const orderNo = 'MW-' + n;
      const customer = customers[i % customers.length];
      const itemCount = 1 + Math.floor(rnd() * 3);
      const items = [];
      let subtotal = 0;
      const used = new Set();
      for (let j = 0; j < itemCount; j++) {
        let p = products[Math.floor(rnd() * products.length)];
        while (used.has(p.id)) p = products[Math.floor(rnd() * products.length)];
        used.add(p.id);
        const qty = 1 + Math.floor(rnd() * 2);
        const unit = p.salePrice || p.price;
        items.push({
          productId: p.id, name: p.name, sku: p.sku, image: p.mainImage,
          price: unit, quantity: qty, total: +(unit * qty).toFixed(2)
        });
        subtotal += unit * qty;
      }
      const discount = i % 5 === 0 ? +(subtotal * 0.1).toFixed(2) : 0;
      const shipping = subtotal > 500 ? 0 : 25;
      const tax = +((subtotal - discount) * 0.08).toFixed(2);
      const total = +((subtotal - discount) + shipping + tax).toFixed(2);
      const status = orderStatusPool[Math.floor(rnd() * orderStatusPool.length)];
      const created = daysAgo(Math.floor(rnd() * 80), 9 + Math.floor(rnd() * 11));
      const timeline = [{
        label: 'Order placed', at: created,
        status: 'Order received and awaiting confirmation.'
      }];
      if (status !== 'pending') timeline.push({ label: 'Order confirmed', at: daysAgo(Math.floor(rnd() * 75) + 1), status: 'Payment verified.' });
      if (['processing', 'shipped', 'delivered'].includes(status)) timeline.push({ label: 'Processing', at: daysAgo(Math.floor(rnd() * 70) + 2), status: 'Preparing your timepiece.' });
      if (['shipped', 'delivered'].includes(status)) timeline.push({ label: 'Shipped', at: daysAgo(Math.floor(rnd() * 60) + 3), status: 'Handed to the courier.' });
      if (status === 'delivered') timeline.push({ label: 'Delivered', at: daysAgo(Math.floor(rnd() * 55) + 4), status: 'Signed for by customer.' });

      orders.push({
        id: 'ord-' + (i + 1), orderNumber: orderNo,
        customerId: customer.id,
        customerName: customer.firstName + ' ' + customer.lastName,
        customerEmail: customer.email,
        items, subtotal: +subtotal.toFixed(2), discount, shipping, tax, total,
        status, paymentStatus: status === 'cancelled' ? 'cancelled' : status === 'refunded' ? 'refunded' : paymentPool[Math.floor(rnd() * paymentPool.length)],
        fulfillmentStatus: status === 'delivered' ? 'fulfilled' : status === 'shipped' ? 'partially_fulfilled' : status === 'cancelled' ? 'cancelled' : 'unfulfilled',
        shippingStatus: status === 'delivered' ? 'Delivered' : status === 'shipped' ? 'Shipped' : status === 'processing' ? 'In processing' : status === 'pending' ? 'Awaiting dispatch' : 'N/A',
        couponCode: null, shippingMethod: 'Rider delivery (Nairobi)',
        shippingAddress: customer.addresses[0],
        billingAddress: customer.addresses[0],
        notes: '', internalNotes: '',
        timeline, createdAt: created
      });
    }
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    orders.forEach((o, i) => { o.orderNumber = 'MW-' + String(1000 + i); });
    const ordersByCustomer = {};
    orders.forEach(o => {
      const c = customers.find(c => c.id === o.customerId);
      if (c) { c.orderIds.push(o.id); ordersByCustomer[c.id] = (ordersByCustomer[c.id] || 0) + 1; }
    });

    /* -------- reviews (demo) -------- */
    const reviewComments = [
      'Exceptional finishing and a dial that plays with light beautifully.',
      'Wears smaller than the case size suggests — very comfortable.',
      'Accuracy is superb out of the box. Highly recommended.',
      'The strap feels premium and the deployment clasp is secure.',
      'Gorgeous timepiece, though the lume could be brighter.',
      'Bought as a gift — recipient was absolutely thrilled.',
      'Beautiful movement visible through the exhibition caseback.',
      'Great value for a Swiss automatic at this price point.',
      'Service from the boutique was flawless from order to delivery.',
      'The water resistance gives me total confidence for swimming.'
    ];
    const reviews = [];
    for (let i = 0; i < 40; i++) {
      const p = products[i % products.length];
      const c = customers[(i * 3) % customers.length];
      reviews.push({
        id: 'rev-' + (i + 1),
        customerId: c.id, customerName: c.firstName + ' ' + c.lastName,
        productId: p.id,
        rating: 3 + Math.floor(rnd() * 3),
        comment: reviewComments[i % reviewComments.length],
        status: i % 4 === 0 ? 'pending' : 'approved',
        createdAt: daysAgo(3 + (i % 50))
      });
    }

    /* -------- coupons (demo) -------- */
    const coupons = [
      { id: 'cup-1', code: 'WELCOME10', type: 'first_order', amount: 1300, minimumOrder: 26000, maximumDiscount: 13000, startDate: daysAgo(30), endDate: daysAgo(-60), usageLimit: 500, perCustomerLimit: 1, productIds: [], categoryIds: [], collectionIds: [], status: 'active', createdAt: daysAgo(30) },
      { id: 'cup-2', code: 'SUMMER25', type: 'percentage', amount: 25, minimumOrder: 0, maximumDiscount: 39000, startDate: daysAgo(10), endDate: daysAgo(-20), usageLimit: 200, perCustomerLimit: 2, productIds: [], categoryIds: ['cat-sports', 'cat-dive'], collectionIds: ['col-sport'], status: 'active', createdAt: daysAgo(10) },
      { id: 'cup-3', code: 'HERITAGE150', type: 'fixed', amount: 19500, minimumOrder: 130000, maximumDiscount: 0, startDate: daysAgo(5), endDate: daysAgo(-25), usageLimit: 100, perCustomerLimit: 1, productIds: [], categoryIds: ['cat-mechanical', 'cat-classic'], collectionIds: ['col-heritage'], status: 'active', createdAt: daysAgo(5) },
      { id: 'cup-4', code: 'FREESHIP', type: 'free_shipping', amount: 0, minimumOrder: 39000, maximumDiscount: 0, startDate: daysAgo(2), endDate: daysAgo(-40), usageLimit: 0, perCustomerLimit: 0, productIds: [], categoryIds: [], collectionIds: [], status: 'active', createdAt: daysAgo(2) },
      { id: 'cup-5', code: 'LUXE200', type: 'category', amount: 26000, minimumOrder: 390000, maximumDiscount: 65000, startDate: daysAgo(1), endDate: daysAgo(-90), usageLimit: 50, perCustomerLimit: 1, productIds: [], categoryIds: ['cat-luxury'], collectionIds: [], status: 'active', createdAt: daysAgo(1) },
      { id: 'cup-6', code: 'OLDCODE', type: 'percentage', amount: 5, minimumOrder: 0, maximumDiscount: 0, startDate: daysAgo(-120), endDate: daysAgo(-90), usageLimit: 10, perCustomerLimit: 1, productIds: [], categoryIds: [], collectionIds: [], status: 'inactive', createdAt: daysAgo(-120) }
    ];

    /* -------- admin users (demo only) -------- */
    const adminUsers = [
      { id: 'adm-1', name: 'Eleanor Voss', email: 'admin@meridianwatch.com', passwordHash: '185030e4', role: 'super_admin', avatar: '', status: 'active', createdAt: daysAgo(400), lastLoginAt: daysAgo(1) },
      { id: 'adm-2', name: 'Marcus Reed', email: 'manager@meridianwatch.com', passwordHash: '185030e4', role: 'store_manager', avatar: '', status: 'active', createdAt: daysAgo(300), lastLoginAt: daysAgo(3) },
      { id: 'adm-3', name: 'Priya Nair', email: 'orders@meridianwatch.com', passwordHash: '185030e4', role: 'order_manager', avatar: '', status: 'active', createdAt: daysAgo(250), lastLoginAt: daysAgo(6) },
      { id: 'adm-4', name: 'Jonas Berg', email: 'catalog@meridianwatch.com', passwordHash: '185030e4', role: 'catalog_manager', avatar: '', status: 'active', createdAt: daysAgo(180), lastLoginAt: daysAgo(12) }
    ];

    /* -------- settings (demo) -------- */
    const settings = {
      storeName: 'MERIDIAN',
      tagline: 'Fine Timepieces',
      logo: 'logo/logo.svg', favicon: 'logo/favicon.svg',
      description: 'MERIDIAN is a boutique watch house crafting automatic, mechanical and quartz timepieces for collectors who value precision, heritage and quiet luxury.',
      contactEmail: 'concierge@meridianwatch.com', phone: '+44 20 7946 0123',
      address: '12 Savile Row, Mayfair, London W1S 3PR, United Kingdom',
      social: { facebook: '#', twitter: '#', instagram: '#', linkedin: '#' },
      currency: 'KES', currencySymbol: 'Ksh ', decimalFormat: '0',
      shippingMethods: [
        { id: 'ship-1', name: 'Rider delivery (Nairobi)', fee: 300, deliveryDays: 'Same day within Nairobi' },
        { id: 'ship-2', name: 'G4S courier', fee: 600, deliveryDays: '2–3 business days countrywide' },
        { id: 'ship-3', name: 'Store pickup — Nairobi CBD', fee: 0, deliveryDays: 'Ready for pickup within 24 hours' }
      ],
      freeShippingThreshold: 0,
      taxRates: { standard: 16, reduced: 8 }, taxDisplay: 'inclusive',
      paymentProviders: {
        whatsapp: { enabled: true, number: '254728580415', label: '0728 580 415' },
        mpesa: { enabled: true, phone: '0728580415', connected: true },
        cash: { enabled: true, connected: true }
      },
      hero: {
        title: 'Time, Perfected',
        subtitle: 'The New Collection 2026',
        text: 'Automatic and mechanical timepieces, assembled by hand and finished to Swiss standards. Pay on delivery — Nairobi rider, G4S countrywide or store pickup.',
        buttonText: 'Shop the collection'
      },
      aboutContent: 'Founded in 1904, MERIDIAN has spent more than a century perfecting the art of fine watchmaking. From our atelier in Mayfair we assemble movements, dials and cases into timepieces designed to be worn daily and inherited for generations. Every watch passes through more than two hundred hands-on quality checks before it reaches you.',
      contactInfo: 'Our concierge team is available Monday to Saturday, 9am to 6pm GMT.',
      footerText: 'MERIDIAN Fine Timepieces. Crafted for those who value time itself.'
    };

    /* -------- inventory history (demo) -------- */
    const inventory = [
      { id: 'inv-1', productId: 'prd-4', type: 'restock', quantity: 10, note: 'Initial stock', adminName: 'Marcus Reed', createdAt: daysAgo(40) },
      { id: 'inv-2', productId: 'prd-14', type: 'sale', quantity: -3, note: 'Order MW-1001', adminName: 'System', createdAt: daysAgo(8) },
      { id: 'inv-3', productId: 'prd-5', type: 'adjustment', quantity: 1, note: 'Showroom display', adminName: 'Eleanor Voss', createdAt: daysAgo(5) },
      { id: 'inv-4', productId: 'prd-24', type: 'restock', quantity: 2, note: 'Supplier delivery', adminName: 'Jonas Berg', createdAt: daysAgo(3) }
    ];

    return { brands, categories, collections, products, customers, orders, reviews, coupons, adminUsers, settings, inventory };
  })();

  /* ---------- persistence ---------- */

  function loadFromStorage() {
    if (!hasStorage) return null;
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveToStorage(data) {
    if (!hasStorage) return;
    try { global.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* storage full / private mode */ }
  }

  function getState() {
    if (!memory.data) {
      /* Public storefront data is generated from clients/<client>. The admin
         prototype does not load this bundle and therefore retains its demo data. */
      if (global.CatalogueData && global.CatalogueData.catalogue) {
        const source = global.CatalogueData;
        const catalogue = source.catalogue;
        const business = source.business || {};
        const products = (catalogue.products || []).map(p => ({
          ...p,
          salePrice: p.compareAtPrice || null,
          mainImage: (() => { const im = (p.images || []).find(x => x.primary) || (p.images || [])[0]; return typeof im === 'string' ? im : (im && im.src) || ''; })(),
          images: (p.images || []).map(im => typeof im === 'string' ? im : im.src),
          imageMeta: (p.images || []).map(im => typeof im === 'string' ? { src: im, alt: p.name } : im),
          stockStatus: p.availability || 'in_stock',
          status: p.status || 'active',
          brandId: p.brandId || null,
          categoryId: p.categoryId || null,
          collectionIds: p.collectionIds || [],
          attributes: p.attributes || {},
          tags: p.tags || [],
          stockQuantity: p.stockQuantity != null ? p.stockQuantity : 10
        }));
        memory.data = {
          version: 3, products, categories: catalogue.categories || [], brands: catalogue.brands || [], collections: [],
          settings: {
            storeName: business.name || '', description: business.description || '', logo: business.logo || '', favicon: business.favicon || '',
            contactEmail: (business.contact || {}).email || '', phone: (business.contact || {}).phone || '',
            address: (business.contact || {}).address || '', openingHours: (business.contact || {}).openingHours || '',
            currency: (business.commerce || {}).currency || 'KES', currencySymbol: (business.commerce || {}).currencySymbol || 'KSh ', decimalFormat: '0',
            deliveryInfo: (business.commerce || {}).deliveryInfo || '', returnPolicy: (business.commerce || {}).returnPolicy || '',
            paymentProviders: { whatsapp: { enabled: true, number: (business.contact || {}).whatsapp || '', label: (business.contact || {}).phone || '' },
            },
            hero: business.hero || {}, about: business.about || {}, contactPage: business.contactPage || {},
            shopBanner: business.shopBanner || {}, nav: business.nav || {}, home: business.home || {},
            shopFilters: business.shopFilters || {},
            shippingMethods: (business.commerce || {}).shippingMethods || [],
            social: (business.site || {}).social || {},
            defaultSeoTitle: (business.site || {}).defaultSeoTitle || '', defaultSeoDescription: (business.site || {}).defaultSeoDescription || '',
            business
          }, customers: [], orders: [], reviews: [], coupons: [], adminUsers: [], inventory: []
        };
        return memory.data;
      }
      let data = loadFromStorage();
      if (!data || !data.version || data.version < 2) {
        data = { version: 2, ...JSON.parse(JSON.stringify(SEED)) };
        saveToStorage(data);
      }
      memory.data = data;
    }
    return memory.data;
  }

  /* ---------- helpers ---------- */

  function computed(list) {
    return list.map ? list : [];
  }

  function toPublicAdminUser(u) {
    const { passwordHash, ...rest } = u;
    return rest;
  }

  /* ---------- repository ---------- */

  const listeners = new Set();
  const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
  function notify() { listeners.forEach(fn => { try { fn(); } catch (e) { /* noop */ } }); }

  function commit() {
    saveToStorage(getState());
    notify();
  }

  const COLLECTIONS = ['products', 'categories', 'collections', 'brands', 'customers', 'orders', 'reviews', 'coupons', 'adminUsers', 'inventory'];

  const Store = {
    /* meta */
    isDemo: true,
    version: '1.0.0',
    subscribe,

    /* --- repository methods: API mode reads from cache, writes via API --- */
    list(name) {
      if (_useApi && name !== 'adminUsers') return AnonAPI.list(name);
      return computed(getState()[name] || []);
    },
    get(name, id) {
      if (_useApi && name !== 'adminUsers') return AnonAPI.get(name, id);
      return computed(getState()[name] || []).find(x => x.id === id) || null;
    },
    find(name, fn) {
      if (_useApi && name !== 'adminUsers') return AnonAPI.find(name, fn);
      return computed(getState()[name] || []).find(fn) || null;
    },
    filter(name, fn) {
      if (_useApi && name !== 'adminUsers') return AnonAPI.filter(name, fn);
      return computed(getState()[name] || []).filter(fn);
    },
    count(name) {
      if (_useApi && name !== 'adminUsers') return AnonAPI.count(name);
      return computed(getState()[name] || []).length;
    },

    create(name, obj) {
      if (_useApi) return AnonAPI.create(name, obj);
      const s = getState();
      const row = { id: obj.id || uid(), createdAt: obj.createdAt || new Date().toISOString(), ...obj };
      s[name].push(row);
      commit();
      return row;
    },

    update(name, id, patch) {
      if (_useApi) return AnonAPI.update(name, id, patch);
      const s = getState();
      if (id === null) {
        if (typeof s[name] === 'object' && !Array.isArray(s[name])) {
          s[name] = { ...s[name], ...patch, updatedAt: new Date().toISOString() };
          commit();
          return s[name];
        }
        return null;
      }
      const i = s[name].findIndex(x => x.id === id);
      if (i === -1) return null;
      const before = s[name][i];
      s[name][i] = { ...before, ...patch, id, updatedAt: new Date().toISOString() };
      commit();
      return s[name][i];
    },

    remove(name, id) {
      if (_useApi) return AnonAPI.remove(name, id);
      const s = getState();
      const i = s[name].findIndex(x => x.id === id);
      if (i === -1) return false;
      s[name].splice(i, 1);
      commit();
      return true;
    },

    reset() {
      memory.data = null;
      if (hasStorage) global.localStorage.removeItem(STORAGE_KEY);
      getState();
      notify();
    },

    /* ---------- domain helpers ---------- */

    settings() {
      if (_useApi) return AnonAPI.get('settings', null) || getState().settings;
      return getState().settings;
    },
    updateSettings(patch) { return this.update('settings', null, patch); },

    products(extra) {
      let list = _useApi ? AnonAPI.list('products') : computed(getState().products || []);
      if (extra && extra.activeOnly) list = list.filter(p => p.status === 'active');
      return list.map(p => ({ ...p, brand: this.get('brands', p.brandId), category: this.get('categories', p.categoryId) }));
    },

    getProduct(id) {
      const p = this.get('products', id);
      if (!p) return null;
      return { ...p, category: this.get('categories', p.categoryId), brand: this.get('brands', p.brandId) };
    },

    brand(id) { return this.get('brands', id); },
    category(id) { return this.get('categories', id); },
    collection(id) { return this.get('collections', id); },

    productImage(p) { return p.mainImage || (p.images && p.images[0]) || 'products/watch-01.svg'; },
    resolveImage(src) {
      if (!src) return '';
      if (/^(https?:|data:)/.test(src)) return src;
      if (/^(clients|assets)\//.test(src)) return src;
      return (global.location && global.location.pathname.endsWith('/admin/index.html'))
        ? '../assets/images/' + src
        : 'assets/images/' + src;
    },

    /* stock computation */
    availableStock(p) { return Math.max(0, (p.stockQuantity || 0) - (p.reservedStock || 0)); },

    /* order status helpers */
    orderCountByStatus(status) {
      const orders = _useApi ? AnonAPI.list('orders') : computed(getState().orders || []);
      return orders.filter(o => o.status === status).length;
    },
    revenue(filterFn) {
      const orders = _useApi ? AnonAPI.list('orders') : computed(getState().orders || []);
      return orders
        .filter(filterFn || (() => true))
        .reduce((s, o) => s + o.total, 0);
    },

    /* ---------- order placement ---------- */

    validateCoupon(code, subtotal, customerId) {
      if (!code) return { valid: false, reason: 'No code provided' };
      const c = computed(getState().coupons || []).find(x => x.code.toLowerCase() === code.toLowerCase());
      if (!c) return { valid: false, reason: 'Coupon not found' };
      if (c.status !== 'active') return { valid: false, reason: 'Coupon is inactive' };
      const now = Date.now();
      if (c.startDate && new Date(c.startDate).getTime() > now) return { valid: false, reason: 'Coupon not yet active' };
      if (c.endDate && new Date(c.endDate).getTime() < now) return { valid: false, reason: 'Coupon has expired' };
      if (c.minimumOrder && subtotal < c.minimumOrder) return { valid: false, reason: `Minimum order of ${c.minimumOrder} required` };
      return { valid: true, coupon: c };
    },

    calculateCoupon(coupon, subtotal) {
      if (!coupon) return { discount: 0, freeShipping: false };
      const { type, amount, maximumDiscount } = coupon;
      if (type === 'percentage') {
        const d = +(subtotal * amount / 100).toFixed(2);
        return { discount: maximumDiscount ? Math.min(d, maximumDiscount) : d, freeShipping: false };
      }
      if (type === 'free_shipping') return { discount: 0, freeShipping: true };
      if (type === 'fixed') return { discount: Math.min(amount, subtotal), freeShipping: false };
      if (type === 'first_order' || type === 'category' || type === 'collection' || type === 'product' || type === 'minimum_order') {
        return { discount: Math.min(amount, subtotal), freeShipping: false };
      }
      return { discount: 0, freeShipping: false };
    },

    placeOrder({ customer, cart, address, shippingMethod, couponCode, notes, paymentMethod }) {
      const s = getState();
      const products = s.products;
      const items = [];
      let subtotal = 0;

      for (const line of cart) {
        const p = products.find(x => x.id === line.productId);
        if (!p) continue;
        const unit = p.salePrice || p.price;
        const qty = line.quantity;
        const total = +(unit * qty).toFixed(2);
        items.push({ productId: p.id, name: p.name, sku: p.sku, image: p.mainImage, price: unit, quantity: qty, total });
        subtotal += total;
        const idx = products.findIndex(x => x.id === p.id);
        const newStock = Math.max(0, (p.stockQuantity || 0) - qty);
        products[idx] = {
          ...p, stockQuantity: newStock,
          stockStatus: newStock === 0 ? 'out_of_stock' : newStock <= p.lowStockThreshold ? 'low_stock' : 'in_stock',
          soldCount: (p.soldCount || 0) + qty
        };
        s.inventory.push({
          id: uid(), productId: p.id, type: 'sale', quantity: -qty, note: 'Order placed', adminName: 'System', createdAt: new Date().toISOString()
        });
      }

      subtotal = +subtotal.toFixed(2);
      const coupon = couponCode ? computed(s.coupons).find(x => x.code.toLowerCase() === couponCode.toLowerCase()) : null;
      const applied = this.calculateCoupon(coupon, subtotal);
      const discount = +applied.discount.toFixed(2);
      const st = getState().settings;
      let shippingFee = 0;
      if (!applied.freeShipping && !(st.freeShippingThreshold && subtotal >= st.freeShippingThreshold)) {
        const m = computed(st.shippingMethods).find(x => x.name === shippingMethod);
        shippingFee = m ? m.fee : 25;
      }
      const tax = +((subtotal - discount) * (st.taxRates.standard / 100)).toFixed(2);
      const total = +((subtotal - discount) + shippingFee + tax).toFixed(2);

      const id = 'ord-' + (s.orders.length + 1);
      const order = {
        id, orderNumber: 'MW-' + String(1000 + s.orders.length),
        customerId: customer ? customer.id : null,
        customerName: customer ? customer.firstName + ' ' + customer.lastName : (address ? [address.firstName, address.lastName].filter(Boolean).join(' ') : 'Guest'),
        customerEmail: customer ? customer.email : (address ? address.email : ''),
        items, subtotal, discount, shipping: shippingFee, tax, total,
        status: 'pending', paymentStatus: 'unpaid', fulfillmentStatus: 'unfulfilled', shippingStatus: 'Awaiting dispatch',
        couponCode: couponCode || null, shippingMethod, paymentMethod: paymentMethod || null,
        shippingAddress: address, billingAddress: address,
        notes: notes || '', internalNotes: '',
        timeline: [{ label: 'Order placed', at: new Date().toISOString(), status: 'Order received and awaiting confirmation.' }],
        createdAt: new Date().toISOString()
      };
      s.orders.unshift(order);

      if (customer) {
        const c = s.customers.find(x => x.id === customer.id);
        if (c) c.orderIds.push(order.id);
      }
      commit();
      return order;
    },

    shippingCost(subtotal) {
      const st = getState().settings;
      const method = computed(st.shippingMethods)[0];
      if (st.freeShippingThreshold && subtotal >= st.freeShippingThreshold) return 0;
      return method ? method.fee : 25;
    },

    /* ---------- admin auth (MOCK) ---------- */
    /* SECURITY NOTE: this is a front-end demonstration. Real auth MUST be
       implemented on a backend (JWT/session). The hash used here is a simple
       placeholder and never ships real credentials. */
    adminLogin(email, password) {
      if (_useApi) {
        return AnonAPI.login(email, password, 'meridian').then(result => {
          if (result.ok) {
            AnonAPI.setToken(result.token);
            this.setSession({ role: 'admin', user: result.user });
          }
          return result;
        });
      }
      const user = computed(getState().adminUsers || []).find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) return { ok: false, error: 'No admin account found for that email.' };
      if (simpleHash(password) !== user.passwordHash) return { ok: false, error: 'Incorrect password.' };
      if (user.status !== 'active') return { ok: false, error: 'This account is disabled.' };
      const pub = toPublicAdminUser(user);
      this.setSession({ role: 'admin', user: pub });
      this.update('adminUsers', user.id, { lastLoginAt: new Date().toISOString() });
      return { ok: true, user: pub };
    },

    adminSession() {
      if (!hasStorage) return null;
      try { const s = JSON.parse(global.localStorage.getItem(SESSION_KEY)); return s && s.role === 'admin' ? s : null; } catch (e) { return null; }
    },

    setSession(session) {
      if (!hasStorage) return;
      if (session) global.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else global.localStorage.removeItem(SESSION_KEY);
    },

    logout() { this.setSession(null); },

    hasPermission(section) {
      const session = this.adminSession();
      if (!session) return false;
      const user = session.user;
      const role = AnonModels.Roles[user.role];
      if (!role) return false;
      return role.permissions.includes('*') || role.permissions.includes(section);
    },

    permissions() {
      const session = this.adminSession();
      if (!session) return [];
      const role = AnonModels.Roles[session.user.role];
      if (!role) return [];
      return role.permissions.includes('*') ? ['*'] : role.permissions;
    },

    /* ---------- customer account (MOCK) ---------- */
    customerLogin(email) {
      let c = computed(getState().customers || []).find(x => x.email.toLowerCase() === email.toLowerCase());
      if (!c) {
        c = this.create('customers', {
          firstName: email.split('@')[0], lastName: '', email, phone: '', status: 'active',
          addresses: [], wishlist: [], orderIds: []
        });
      }
      if (c.status === 'disabled') return { ok: false, error: 'Account disabled.' };
      this.setSession({ role: 'customer', user: { id: c.id, name: c.firstName + ' ' + c.lastName, email: c.email } });
      return { ok: true, user: { id: c.id, name: c.firstName + ' ' + c.lastName, email: c.email } };
    },

    currentCustomer() {
      const s = this.adminSession();
      if (!s || s.role !== 'customer' || !s.user) return null;
      const c = this.get('customers', s.user.id);
      if (c && c.status === 'disabled') return null;
      return c;
    },

    /* ---------- misc ---------- */
    getDemoState() { return JSON.parse(JSON.stringify(getState())); },
    exportJson() { return JSON.stringify(getState(), null, 2); }
  };

  /* placeholder hash — replace with real backend authentication */
  function simpleHash(str) {
    let h = 5381;
    const s = String(str);
    for (let i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) | 0; }
    return (h >>> 0).toString(16);
  }

  global.AnonModels = global.AnonModels || (function () { return {}; }());
  global.AnonStore = Store;

})(typeof window !== 'undefined' ? window : globalThis);
