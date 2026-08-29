/* ------------------------------------------------------------------ *
 *  models.js
 *  Shared data model definitions for the watch e-commerce platform.
 *  Plain JS "interfaces" — documents the shape of every entity the
 *  storefront and the admin dashboard both consume.
 *
 *  NOTE: In a real deployment these map 1:1 to backend/API resources.
 * ------------------------------------------------------------------ */

'use strict';

(function (global) {
  const AnonModels = (function () {

  /* ---------- enums ---------- */

  const ProductStatus = Object.freeze({
    ACTIVE: 'active',
    DRAFT: 'draft',
    ARCHIVED: 'archived'
  });

  const StockStatus = Object.freeze({
    IN_STOCK: 'in_stock',
    LOW_STOCK: 'low_stock',
    OUT_OF_STOCK: 'out_of_stock',
    BACKORDER: 'backorder'
  });

  const OrderStatus = Object.freeze({
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
    RETURNED: 'returned'
  });

  const PaymentStatus = Object.freeze({
    UNPAID: 'unpaid',
    PAID: 'paid',
    REFUNDED: 'refunded',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
  });

  const FulfillmentStatus = Object.freeze({
    UNFULFILLED: 'unfulfilled',
    FULFILLED: 'fulfilled',
    PARTIALLY_FULFILLED: 'partially_fulfilled',
    CANCELLED: 'cancelled'
  });

  const Gender = Object.freeze({ MALE: 'men', FEMALE: 'women', UNISEX: 'unisex' });

  const MovementType = Object.freeze({
    AUTOMATIC: 'automatic',
    MECHANICAL: 'mechanical',
    QUARTZ: 'quartz',
    CHRONOGRAPH: 'chronograph',
    SOLAR: 'solar'
  });

  const ReviewStatus = Object.freeze({ PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' });

  const CouponType = Object.freeze({
    PERCENTAGE: 'percentage',
    FIXED: 'fixed',
    PRODUCT: 'product',
    CATEGORY: 'category',
    COLLECTION: 'collection',
    MINIMUM_ORDER: 'minimum_order',
    FIRST_ORDER: 'first_order',
    FREE_SHIPPING: 'free_shipping'
  });

  const Role = Object.freeze({
    SUPER_ADMIN: 'super_admin',
    STORE_MANAGER: 'store_manager',
    ORDER_MANAGER: 'order_manager',
    CATALOG_MANAGER: 'catalog_manager'
  });

  const TaxClass = Object.freeze({ STANDARD: 'standard', REDUCED: 'reduced', ZERO: 'zero' });

  const CustomerStatus = Object.freeze({ ACTIVE: 'active', DISABLED: 'disabled' });

  const Currency = Object.freeze({ USD: 'USD', EUR: 'EUR', GBP: 'GBP', KES: 'KES' });

  /* ---------- entity shapes (documentation + defaults) ---------- */

  /* CANONICAL product record. This is the shape persisted in catalogue.json
     and consumed by the storefront + the admin API. The `Product` object below
     documents it; optional fields used by the old demo SEED are kept for
     back-compat and normalised away by AnonModels.normalizeProduct(). */
  const Product = {
    id: null,
    name: '',
    brandId: null,
    sku: '',
    slug: '',
    shortDescription: '',
    description: '',
    /* show/hide control — 'active' (visible), 'draft' (hidden), 'archived' */
    status: ProductStatus.ACTIVE,
    featured: false,
    newArrival: false,
    bestSeller: false,
    /* pricing — salePrice is stored canonically as compareAtPrice */
    price: 0,
    salePrice: null,
    compareAtPrice: null,
    costPrice: 0,
    currency: Currency.KES,
    taxClass: TaxClass.STANDARD,
    /* inventory — stock status is stored canonically as availability */
    stockQuantity: 0,
    reservedStock: 0,
    lowStockThreshold: 5,
    stockStatus: StockStatus.IN_STOCK,
    availability: StockStatus.IN_STOCK,
    allowBackorders: false,
    /* watch specifications */
    model: '',
    reference: '',
    movement: MovementType.QUARTZ,
    movementType: '',
    caseSize: '',
    caseMaterial: '',
    caseShape: '',
    dialColor: '',
    strapMaterial: '',
    strapColor: '',
    crystal: '',
    waterResistance: '',
    powerReserve: '',
    functions: '',
    warrantyPeriod: '',
    /* categorization */
    categoryId: null,
    collectionIds: [],
    gender: Gender.UNISEX,
    tags: [],
    /* images */
    images: [],
    mainImage: '',
    /* metadata */
    rating: 0,
    ratingCount: 0,
    soldCount: 0,
    createdAt: null,
    updatedAt: null
  };

  const Category = {
    id: null, name: '', slug: '', description: '', image: '', status: 'active', order: 0, parentId: null, productCount: 0
  };

  const Collection = {
    id: null, name: '', slug: '', description: '', image: '', featured: false, productIds: [], status: 'active', createdAt: null
  };

  const Brand = {
    id: null, name: '', slug: '', description: '', logo: '', status: 'active', country: '', founded: ''
  };

  const Customer = {
    id: null, firstName: '', lastName: '', email: '', phone: '', passwordHash: null,
    status: CustomerStatus.ACTIVE, createdAt: null,
    addresses: [], wishlist: [], orderIds: []
  };

  const OrderItem = {
    productId: null, name: '', sku: '', image: '', price: 0, quantity: 1, total: 0
  };

  const Order = {
    id: null, orderNumber: '', customerId: null, customerName: '', customerEmail: '',
    items: [], subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0,
    status: OrderStatus.PENDING, paymentStatus: PaymentStatus.UNPAID,
    fulfillmentStatus: FulfillmentStatus.UNFULFILLED, shippingStatus: '',
    couponCode: null, shippingMethod: '', shippingAddress: null, billingAddress: null,
    notes: '', internalNotes: '', timeline: [], createdAt: null
  };

  const Review = {
    id: null, customerId: null, customerName: '', productId: null, rating: 5, comment: '', status: ReviewStatus.PENDING, createdAt: null
  };

  const Coupon = {
    id: null, code: '', type: CouponType.PERCENTAGE, amount: 0, minimumOrder: 0, maximumDiscount: 0,
    startDate: null, endDate: null, usageLimit: 0, perCustomerLimit: 0,
    productIds: [], categoryIds: [], collectionIds: [], status: 'active', createdAt: null
  };

  const InventoryRecord = {
    id: null, productId: null, type: 'adjustment', quantity: 0, note: '', adminName: '', createdAt: null
  };

  const AdminUser = {
    id: null, name: '', email: '', passwordHash: null, role: Role.STORE_MANAGER, avatar: '', status: 'active', createdAt: null, lastLoginAt: null
  };

  const StoreSettings = {
    storeName: '', logo: '', favicon: '', description: '', contactEmail: '', phone: '', address: '',
    social: { facebook: '', twitter: '', instagram: '', linkedin: '' },
    currency: Currency.KES, currencySymbol: 'Ksh ', decimalFormat: '0',
    shippingMethods: [], freeShippingThreshold: 0, taxRates: { standard: 16, reduced: 8 }, taxDisplay: 'inclusive',
    paymentProviders: { whatsapp: { enabled: true, number: '254728580415', label: '0728 580 415' }, mpesa: { enabled: true, phone: '0728580415', connected: true }, cash: { enabled: true, connected: true } },
    hero: { title: '', subtitle: '', text: '', buttonText: '' },
    aboutContent: '', contactInfo: '', footerText: ''
  };

  const Roles = Object.freeze({
    [Role.SUPER_ADMIN]: { label: 'Super Admin', permissions: ['*'] },
    [Role.STORE_MANAGER]: { label: 'Store Manager', permissions: ['dashboard','products','catalog','inventory','orders','customers','content','reviews','coupons','reports','settings'] },
    [Role.ORDER_MANAGER]: { label: 'Order Manager', permissions: ['dashboard','orders','customers','reports'] },
    [Role.CATALOG_MANAGER]: { label: 'Catalog Manager', permissions: ['dashboard','products','catalog','inventory','reviews'] }
  });

  /* ---------- canonical → UI normalisation ---------- */

  const AVAILABILITIES = ['in_stock', 'low_stock', 'out_of_stock', 'backorder', 'preorder'];

  function normalizeStockStatus(p) {
    if (AVAILABILITIES.includes(p.availability)) return p.availability;
    if (AVAILABILITIES.includes(p.stockStatus)) return p.stockStatus;
    const q = p.stockQuantity;
    if (q === 0) return 'out_of_stock';
    if (q != null && q <= (p.lowStockThreshold || 5)) return 'low_stock';
    return 'in_stock';
  }

  function primaryImage(p) {
    const imgs = (p && p.images) || [];
    const primary = imgs.find(im => im && im.primary) || imgs[0] || (p && p.mainImage) || '';
    return typeof primary === 'string' ? primary : (primary && primary.src) || '';
  }

  /* Maps a canonical catalogue product (or old SEED product) into the shape
     the storefront and admin UI consume. Both api-adapter.js and store.js
     call this so the raw catalogue and the running app always agree. */
  function normalizeProduct(p) {
    if (!p) return null;
    const { _source, _row, ...rest } = p;
    const images = (p.images || []).map(im => typeof im === 'string' ? im : (im && im.src) || '').filter(Boolean);
    const imageMeta = (p.images || []).map(im => typeof im === 'string' ? { src: im, alt: p.name } : im);
    const mainImage = p.mainImage || primaryImage(p) || images[0] || '';
    const availability = normalizeStockStatus(p);
    return {
      ...rest,
      /* pricing */
      salePrice: p.compareAtPrice || null,
      costPrice: p.costPrice != null ? p.costPrice : (p.cost != null ? p.cost : 0),
      /* stock — availability is the authority for badge level */
      stockQuantity: p.stockQuantity != null ? p.stockQuantity : (availability === 'out_of_stock' ? 0 : 10),
      reservedStock: p.reservedStock || 0,
      lowStockThreshold: p.lowStockThreshold != null ? p.lowStockThreshold : 5,
      stockStatus: availability,
      availability,
      status: p.status || 'active',
      /* images */
      mainImage,
      images,
      imageMeta,
      /* categorization */
      brandId: p.brandId || null,
      categoryId: p.categoryId || null,
      collectionIds: p.collectionIds || [],
      attributes: p.attributes || {},
      tags: p.tags || [],
      /* metadata defaults */
      reference: p.reference || '',
      soldCount: p.soldCount || 0,
      rating: p.rating || 0,
      ratingCount: p.ratingCount || 0,
      createdAt: p.createdAt || null,
      updatedAt: p.updatedAt || null
    };
  }

  /* ---------- settings (business.json) — canonical → UI ---------- */

  function hexToRgb(hex) {
    const h = normalizeHex(hex);
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }

  function normalizeHex(hex) {
    let h = String(hex || '').trim();
    if (!h) return '#b8874a';
    if (h[0] !== '#') h = '#' + h;
    if (/^#[0-9a-fA-F]{3}$/.test(h)) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    return /^#[0-9a-fA-F]{6}$/.test(h) ? h.toLowerCase() : '#b8874a';
  }

  function mix(c1, c2, t) {
    const a = hexToRgb(c1);
    const b = hexToRgb(c2);
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  /* pct = percent toward white */
  function lighten(hex, pct) { return mix(hex, '#ffffff', Math.min(1, pct / 100)); }
  /* pct = percent toward black */
  function darken(hex, pct) { return mix(hex, '#000000', Math.min(1, pct / 100)); }

  const DEFAULT_THEME = { primary: '#b8874a', secondary: '#141519', accent: '#b8874a' };

  function themeVars(business) {
    const brand = (business && business.brand) || {};
    const gold = normalizeHex(brand.primary || DEFAULT_THEME.primary);
    const ink = normalizeHex(brand.secondary || DEFAULT_THEME.secondary);
    return {
      gold,
      goldDark: darken(gold, 22),
      goldLight: lighten(gold, 26),
      ink,
      inkSoft: lighten(ink, 8)
    };
  }

  /* Apply build-independent theme: storefront pages read client-data.js, so
     brand colours can be applied at runtime the moment settings change. */
  function applyTheme(business, doc) {
    const v = themeVars(business);
    const rootEl = (doc || (typeof document !== 'undefined' ? document : null)) || { documentElement: null };
    const root = rootEl.documentElement;
    if (!root || !root.style) return;
    root.style.setProperty('--gold', v.gold);
    root.style.setProperty('--gold-dark', v.goldDark);
    root.style.setProperty('--gold-light', v.goldLight);
    root.style.setProperty('--ink', v.ink);
    root.style.setProperty('--ink-soft', v.inkSoft);
  }

  /* Maps raw business.json into the flat settings shape both the admin and
     the storefront consume. Keeps the raw business object under `business`
     for storefront reads that still reference nested sections directly. */
  function normalizeSettings(b) {
    b = b || {};
    const contact = b.contact || {};
    const commerce = b.commerce || {};
    const site = b.site || {};
    const brand = b.brand || {};
    const decimalFormat = (commerce.decimalFormat != null && String(commerce.decimalFormat) !== '0') ? '2' : '0';
    const shippingMethods = (commerce.shippingMethods || []).map(m => {
      const name = m.name || m.label || 'Shipping method';
      return { ...m, name, label: m.label || name, deliveryDays: m.deliveryDays || '' };
    });
    const paymentProviders = commerce.paymentProviders || {
      whatsapp: { enabled: true, number: contact.whatsapp || '', label: contact.phone || '' },
      mpesa: { enabled: true, phone: '', connected: false },
      cash: { enabled: true, connected: true }
    };
    return {
      storeName: b.name || '',
      tagline: b.description || '',
      description: b.description || '',
      logo: b.logo || '',
      favicon: b.favicon || '',
      contactEmail: contact.email || '',
      phone: contact.phone || '',
      whatsapp: contact.whatsapp || '',
      address: contact.address || '',
      mapsUrl: contact.mapsUrl || '',
      openingHours: contact.openingHours || '',
      currency: commerce.currency || 'KES',
      currencySymbol: commerce.currencySymbol || 'KSh ',
      decimalFormat,
      deliveryInfo: commerce.deliveryInfo || '',
      returnPolicy: commerce.returnPolicy || '',
      freeShippingThreshold: commerce.freeShippingThreshold || 0,
      taxRates: commerce.taxRates || { standard: 0, reduced: 0 },
      paymentProviders,
      shippingMethods,
      social: site.social || {},
      defaultSeoTitle: site.defaultSeoTitle || '',
      defaultSeoDescription: site.defaultSeoDescription || '',
      domain: site.domain || '',
      brand: {
        primary: normalizeHex(brand.primary || DEFAULT_THEME.primary),
        secondary: normalizeHex(brand.secondary || DEFAULT_THEME.secondary),
        accent: normalizeHex(brand.accent || brand.primary || DEFAULT_THEME.accent)
      },
      hero: b.hero || {},
      about: b.about || {},
      contactPage: b.contactPage || {},
      shopBanner: b.shopBanner || {},
      nav: b.nav || {},
      home: b.home || {},
      shopFilters: b.shopFilters || {},
      business: b
    };
  }

  /* ---------- collections (hybrid: rules + manual override) ---------- */

  function normalizeCollection(c) {
    const base = c || {};
    const manual = base.manual || {};
    return {
      id: base.id || '',
      name: base.name || 'Untitled Collection',
      slug: base.slug || '',
      description: base.description || '',
      image: base.image || '',
      status: base.status || 'active',
      featured: !!base.featured,
      order: base.order || 0,
      createdAt: base.createdAt || null,
      rules: base.rules || {},
      manual: { include: manual.include || [], exclude: manual.exclude || [] }
    };
  }

  /* Does product p satisfy every rule of collection c? Rule keys supported:
     categoryId, brandId, gender, priceMin, priceMax */
  function collectionMatches(c, p) {
    const r = c.rules || {};
    if (r.categoryId && p.categoryId !== r.categoryId) return false;
    if (r.brandId && p.brandId !== r.brandId) return false;
    if (r.gender && (p.gender || '').toLowerCase() !== String(r.gender).toLowerCase()) return false;
    const price = Number(p.price) || 0;
    if (r.priceMin != null && r.priceMin !== '' && price < Number(r.priceMin)) return false;
    if (r.priceMax != null && r.priceMax !== '' && price > Number(r.priceMax)) return false;
    return true;
  }

  /* Hybrid membership:
     members = product-assigned (p.collectionIds) ∪ collection manual.include ∪ rules match
               − collection manual.exclude
     Returns { products, collections } so both api-adapter and store share one source. */
  function materializeCollections(products, collections) {
    const list = (collections || []).map(normalizeCollection);
    const out = (products || []).map(p => {
      const ids = [];
      for (const c of list) {
        const manualByProduct = (p.collectionIds || []).indexOf(c.id) !== -1;
        const manualByCollection = (c.manual.include || []).indexOf(p.id) !== -1;
        const excluded = (c.manual.exclude || []).indexOf(p.id) !== -1;
        if ((manualByProduct || manualByCollection || collectionMatches(c, p)) && !excluded) ids.push(c.id);
      }
      return { ...p, collectionIds: ids };
    });
    return { products: out, collections: list };
  }

  return {
    Product, Category, Collection, Brand, Customer, Order, OrderItem, Review, Coupon,
    InventoryRecord, AdminUser, StoreSettings,
    ProductStatus, StockStatus, OrderStatus, PaymentStatus, FulfillmentStatus,
    Gender, MovementType, ReviewStatus, CouponType, Role, TaxClass, CustomerStatus, Currency, Roles,
    normalizeProduct, normalizeStockStatus,
    normalizeCollection, collectionMatches, materializeCollections,
    normalizeSettings, applyTheme, themeVars, normalizeHex, hexToRgb, lighten, darken, mix
  };

})( );

  global.AnonModels = AnonModels;
})(typeof window !== 'undefined' ? window : globalThis);
