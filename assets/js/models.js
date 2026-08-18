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

  const Product = {
    id: null,
    name: '',
    brandId: null,
    sku: '',
    slug: '',
    shortDescription: '',
    description: '',
    status: ProductStatus.ACTIVE,
    featured: false,
    newArrival: false,
    bestSeller: false,
    /* pricing */
    price: 0,
    salePrice: null,
    costPrice: 0,
    currency: Currency.KES,
    taxClass: TaxClass.STANDARD,
    /* inventory */
    stockQuantity: 0,
    reservedStock: 0,
    lowStockThreshold: 5,
    stockStatus: StockStatus.IN_STOCK,
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

  return {
    Product, Category, Collection, Brand, Customer, Order, OrderItem, Review, Coupon,
    InventoryRecord, AdminUser, StoreSettings,
    ProductStatus, StockStatus, OrderStatus, PaymentStatus, FulfillmentStatus,
    Gender, MovementType, ReviewStatus, CouponType, Role, TaxClass, CustomerStatus, Currency, Roles
  };

})( );

  global.AnonModels = AnonModels;
})(typeof window !== 'undefined' ? window : globalThis);
