/* ------------------------------------------------------------------ *
 *  ui.js
 *  Shared storefront UI: header/footer injection, cart
 *  helpers, product renderers, toasts, modal + mobile navigation.
 *  Depends on: models.js, store.js
 * ------------------------------------------------------------------ */

'use strict';

(function (global) {

  const Store = global.AnonStore;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const AnonUI = {};

  /* ---------- formatting helpers ---------- */

  AnonUI.escapeHtml = (str) => String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  AnonUI.money = (n) => {
    const s = Store.settings();
    const symbol = s.currencySymbol || '$';
    const digits = s.decimalFormat === '0' ? 0 : 2;
    return symbol + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  };

  AnonUI.img = (src) => {
    if (!src) return '';
    if (/^(https?:|data:|blob:)/.test(src)) return src;
    return 'assets/images/' + src.replace(/^(\.\/)?assets\/images\//, '');
  };

  AnonUI.productUrl = (p) => `product/${encodeURIComponent(p.slug || p.id)}/`;

  AnonUI.responsiveImage = (image, fallbackAlt, className, opts) => {
    const meta = typeof image === 'string' ? { src: image } : (image || {});
    const variants = meta.variants || [];
    const sources = ['avif', 'webp'].map(format => {
      const srcset = variants.filter(v => v.format === format).map(v => `${AnonUI.img(v.src)} ${v.width}w`).join(', ');
      return srcset ? `<source type="image/${format}" srcset="${srcset}" sizes="${(opts || {}).sizes || '(max-width: 600px) 50vw, 300px'}">` : '';
    }).join('');
    const loading = (opts || {}).priority ? 'eager' : 'lazy';
    return `<picture>${sources}<img src="${AnonUI.img(meta.src || image)}" alt="${AnonUI.escapeHtml(meta.alt || fallbackAlt)}" width="${meta.width || 300}" height="${meta.height || 300}" loading="${loading}" decoding="async" class="${className || ''}"></picture>`;
  };

  AnonUI.stars = (rating) => {
    const r = Math.round(Number(rating || 0));
    let html = '';
    for (let i = 1; i <= 5; i++) {
      html += i <= r ? '<ion-icon name="star"></ion-icon>' : '<ion-icon name="star-outline"></ion-icon>';
    }
    return html;
  };

  AnonUI.discount = (p) => p.salePrice && p.salePrice < p.price ? Math.round((1 - p.salePrice / p.price) * 100) : 0;

  AnonUI.badges = (p) => {
    let b = '';
    if (p.bestSeller) b += '<p class="showcase-badge angle black">best seller</p>';
    if (p.newArrival) b += '<p class="showcase-badge angle pink">new</p>';
    if (p.salePrice && p.salePrice < p.price) b += `<p class="showcase-badge">${AnonUI.discount(p)}%</p>`;
    return b;
  };

  /* ---------- product card renderer (grid) ---------- */

  AnonUI.productCard = (p) => {
    const price = AnonUI.money(p.salePrice || p.price);
    const del = p.salePrice ? `<del>${AnonUI.money(p.price)}</del>` : '';
    const out = p.stockStatus === 'out_of_stock' || p.availability === 'out_of_stock';
    const brand = Store.brand(p.brandId);
    const cat = Store.category(p.categoryId);
    return `
    <div class="showcase">
      <div class="showcase-banner">
        <a href="${AnonUI.productUrl(p)}">
          ${AnonUI.responsiveImage((p.imageMeta || [])[0] || p.mainImage, p.name, 'product-img default')}
        </a>
        ${AnonUI.badges(p)}
        <div class="showcase-actions">
          <a class="btn-action" href="${AnonUI.productUrl(p)}" title="View product" aria-label="View product"><ion-icon name="eye-outline"></ion-icon></a>
          <button class="btn-action" data-add-cart="${p.id}" title="Add to cart" aria-label="Add to cart" ${out ? 'disabled' : ''}><ion-icon name="bag-add-outline"></ion-icon></button>
        </div>
        ${out ? '<p class="showcase-stock-tag">Out of stock</p>' : ''}
      </div>
      <div class="showcase-content">
        <a href="/?cat=${encodeURIComponent(p.categoryId)}" class="showcase-category">${cat ? AnonUI.escapeHtml(cat.name) : ''}</a>
        <a href="${AnonUI.productUrl(p)}"><h3 class="showcase-title">${AnonUI.escapeHtml(p.name)}</h3></a>
        ${brand ? `<p class="showcase-brand">${AnonUI.escapeHtml(brand.name)}</p>` : ''}
        <div class="price-box"><p class="price">${price}</p>${del}</div>
      </div>
    </div>`;
  };

  /* ---------- mini product (sidebar rows) ---------- */

  AnonUI.miniProduct = (p) => `
    <div class="showcase">
      <a href="${AnonUI.productUrl(p)}" class="showcase-img-box">
        ${AnonUI.responsiveImage((p.imageMeta || [])[0] || p.mainImage, p.name, 'showcase-img', { sizes: '75px' })}
      </a>
      <div class="showcase-content">
        <a href="${AnonUI.productUrl(p)}"><h4 class="showcase-title">${AnonUI.escapeHtml(p.name)}</h4></a>
        <div class="price-box"><p class="price">${AnonUI.money(p.salePrice || p.price)}</p></div>
      </div>
    </div>`;

  /* ---------- cart (local state) ---------- */

  const KEY_CART = 'anon.cart';

  function lsGet(k) { try { return JSON.parse(global.localStorage.getItem(k) || '[]'); } catch (e) { return []; } }
  function lsSet(k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* noop */ } }

  AnonUI.getCart = () => lsGet(KEY_CART);
  AnonUI.cartCount = () => AnonUI.getCart().reduce((s, l) => s + l.quantity, 0);

  AnonUI.addToCart = (productId, qty) => {
    const cart = AnonUI.getCart();
    const line = cart.find(l => l.productId === productId);
    const p = Store.getProduct(productId);
    if (!p) return { ok: false, msg: 'Product not found.' };
    if (p.stockStatus === 'out_of_stock' && !p.allowBackorders) return { ok: false, msg: 'This product is currently out of stock.' };
    const current = line ? line.quantity : 0;
    if (!p.allowBackorders && current + qty > p.stockQuantity) {
      return { ok: false, msg: `Only ${Math.max(0, p.stockQuantity - current)} available in stock.` };
    }
    if (line) line.quantity += qty; else cart.push({ productId, quantity: qty });
    lsSet(KEY_CART, cart);
    AnonUI.updateBadges();
    return { ok: true, msg: `${p.name} added to your bag.` };
  };

  AnonUI.setCartQty = (productId, qty) => {
    let cart = AnonUI.getCart();
    const line = cart.find(l => l.productId === productId);
    if (!line) return;
    if (qty <= 0) cart = cart.filter(l => l.productId !== productId);
    else {
      const p = Store.getProduct(productId);
      if (p && !p.allowBackorders && qty > p.stockQuantity) qty = Math.max(0, p.stockQuantity);
      line.quantity = qty;
    }
    lsSet(KEY_CART, cart);
    AnonUI.updateBadges();
  };

  AnonUI.removeFromCart = (productId) => {
    lsSet(KEY_CART, AnonUI.getCart().filter(l => l.productId !== productId));
    AnonUI.updateBadges();
  };

  AnonUI.clearCart = () => lsSet(KEY_CART, []);

  AnonUI.cartDetail = () => {
    const cart = AnonUI.getCart();
    const items = cart.map(l => {
      const p = Store.getProduct(l.productId);
      return p ? { ...l, product: p, lineTotal: (p.salePrice || p.price) * l.quantity } : null;
    }).filter(Boolean);
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    return { items, subtotal };
  };

  AnonUI.updateBadges = () => {
    $$('[data-cart-count]').forEach(el => el.textContent = AnonUI.cartCount());
  };

  /* ---------- toast + modal ---------- */

  AnonUI.toast = (msg, type) => {
    const existing = $('.anon-toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'anon-toast ' + (type || 'success');
    t.setAttribute('role', 'status');
    t.innerHTML = `<ion-icon name="${type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}"></ion-icon>
      <span>${AnonUI.escapeHtml(msg)}</span>
      <button class="anon-toast-close"><ion-icon name="close-outline"></ion-icon></button>`;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    const close = () => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); };
    t.querySelector('.anon-toast-close').addEventListener('click', close);
    setTimeout(close, 3400);
  };

  AnonUI.openModal = (html) => {
    const m = document.createElement('div');
    m.className = 'anon-modal';
    m.innerHTML = `<div class="anon-modal-backdrop"></div><div class="anon-modal-card">${html}</div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.querySelector('.anon-modal-backdrop').addEventListener('click', close);
    m.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', close));
    return { el: m, close };
  };

  AnonUI.confirm = (message, title) => new Promise((resolve) => {
    const { el, close } = AnonUI.openModal(`
      <h3 class="anon-modal-title">${title || 'Please confirm'}</h3>
      <p class="anon-modal-text">${AnonUI.escapeHtml(message)}</p>
      <div class="anon-modal-actions">
        <button class="btn btn-secondary" data-close-modal>Cancel</button>
        <button class="btn btn-primary" data-confirm>Confirm</button>
      </div>`);
    el.querySelector('[data-confirm]').addEventListener('click', () => { close(); resolve(true); });
    el.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', () => resolve(false)));
  });

  /* ---------- header / footer ---------- */

  AnonUI.currentPage = () => global.location.pathname.split('/').pop().toLowerCase() || 'index.html';

  AnonUI.headerHTML = (showSearch) => {
    const s = Store.settings();
    const business = s.business || {};
    const social = ((business.site || {}).social) || {};
    const categories = Store.list('categories').filter(category => category.status !== 'archived').slice(0, 6);
    return `
  <div class="header-top">
    <div class="container">
      <ul class="header-social-container">
        ${social.facebook ? `<li><a href="${social.facebook}" class="social-link" aria-label="Facebook"><ion-icon name="logo-facebook"></ion-icon></a></li>` : ''}
        ${social.instagram ? `<li><a href="${social.instagram}" class="social-link" aria-label="Instagram"><ion-icon name="logo-instagram"></ion-icon></a></li>` : ''}
      </ul>
      <div class="header-alert-news">
        <p>${AnonUI.escapeHtml((business.commerce || {}).deliveryInfo || 'Order directly on WhatsApp')}</p>
      </div>
    </div>
  </div>

  <div class="header-main">
    <div class="container">
      <a href="/" class="header-logo">
        <img src="${AnonUI.escapeHtml(s.logo || 'assets/images/logo/logo.svg')}" alt="${AnonUI.escapeHtml(s.storeName)}" width="220" height="56">
      </a>
      ${showSearch ? `<form class="header-search-container" action="search.html" method="get" autocomplete="off">
        <input type="search" name="q" class="search-field" placeholder="Search products, brands and categories" aria-label="Search products">
        <button type="submit" class="search-btn"><ion-icon name="search-outline"></ion-icon></button>
      </form>` : ''}
      <div class="header-user-actions">
        <a href="cart.html" class="action-btn" title="Shopping bag" aria-label="Shopping bag"><ion-icon name="bag-handle-outline"></ion-icon><span class="count" data-cart-count>0</span></a>
      </div>
    </div>
  </div>

  <div class="mobile-bottom-navigation">
    <button class="action-btn" data-mobile-menu-open-btn><ion-icon name="menu-outline"></ion-icon></button>
    <a href="cart.html" class="action-btn"><ion-icon name="bag-handle-outline"></ion-icon><span class="count" data-cart-count>0</span></a>
    <a href="/" class="action-btn" aria-label="Shop"><ion-icon name="storefront-outline"></ion-icon></a>
  </div>

  <nav class="mobile-navigation-menu has-scrollbar" data-mobile-menu>
    <div class="menu-top">
      <h2 class="menu-title">Menu</h2>
      <button class="menu-close-btn" data-mobile-menu-close-btn><ion-icon name="close-outline"></ion-icon></button>
    </div>
    <ul class="mobile-menu-category-list">
      <li class="menu-category"><a href="/" class="menu-title">Shop All</a></li>
      ${categories.map(category => `<li class="menu-category"><a href="/?cat=${encodeURIComponent(category.id)}" class="menu-title">${AnonUI.escapeHtml(category.name)}</a></li>`).join('')}
      <li class="menu-category"><a href="search.html" class="menu-title">Search</a></li>
      <li class="menu-category"><a href="about.html" class="menu-title">About</a></li>
      <li class="menu-category"><a href="contact.html" class="menu-title">Contact</a></li>
    </ul>
    <div class="menu-bottom">
      <ul class="menu-social-container">
        <li><a href="#" class="social-link"><ion-icon name="logo-facebook"></ion-icon></a></li>
        <li><a href="#" class="social-link"><ion-icon name="logo-twitter"></ion-icon></a></li>
        <li><a href="#" class="social-link"><ion-icon name="logo-instagram"></ion-icon></a></li>
        <li><a href="#" class="social-link"><ion-icon name="logo-linkedin"></ion-icon></a></li>
      </ul>
    </div>
  </nav>`;
  };

  AnonUI.footerHTML = () => {
    const s = Store.settings();
    return `
  <div class="footer-bottom">
    <div class="container">
      <p class="copyright">
        Copyright &copy; <a href="/">${AnonUI.escapeHtml(s.storeName)}</a> all rights reserved.
      </p>
    </div>
  </div>`;
  };

  AnonUI.injectChrome = () => {
    const header = $('#site-header');
    const footer = $('#site-footer');
    const page = (document.body.dataset.page || '');
    const searchPages = ['home', 'shop', 'listing', 'search', 'best-sellers', 'new-arrivals', 'collections', 'mens', 'womens', 'unisex', 'product'];
    if (header) header.innerHTML = AnonUI.headerHTML(searchPages.includes(page));
    if (footer) footer.innerHTML = AnonUI.footerHTML();
    AnonUI.updateBadges();
    bindChromeEvents();
  };

  /* ---------- chrome interactions (delegated) ---------- */

  function bindChromeEvents() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.setAttribute('data-overlay', '');
    document.body.appendChild(overlay);

    const openMenu = () => {
      const m = document.querySelector('[data-mobile-menu]');
      if (m) { m.classList.add('active'); overlay.classList.add('active'); }
    };
    const closeMenu = () => {
      document.querySelectorAll('[data-mobile-menu]').forEach(m => m.classList.remove('active'));
      overlay.classList.remove('active');
    };

    $$('[data-mobile-menu-open-btn]').forEach(b => b.addEventListener('click', openMenu));
    $$('[data-mobile-menu-close-btn]').forEach(b => b.addEventListener('click', closeMenu));
    overlay.addEventListener('click', closeMenu);

    /* cart actions on product cards (delegated) */
    document.addEventListener('click', (e) => {
      const cartBtn = e.target.closest('[data-add-cart]');
      if (cartBtn) {
        const res = AnonUI.addToCart(cartBtn.getAttribute('data-add-cart'), 1);
        AnonUI.toast(res.msg, res.ok ? 'success' : 'error');
        return;
      }
      const quickBtn = e.target.closest('[data-quick-add]');
      if (quickBtn) {
        const res = AnonUI.addToCart(quickBtn.getAttribute('data-quick-add'), 1);
        AnonUI.toast(res.msg, res.ok ? 'success' : 'error');
      }
    });
  }

  AnonUI.renderProductGrid = (container, products) => {
    container.innerHTML = products.map(AnonUI.productCard).join('') ||
      `<div class="empty-state"><ion-icon name="time-outline"></ion-icon><p>No products match your selection.</p><a href="/" class="btn">Browse the collection</a></div>`;
  };

  AnonUI.renderSidebarBestSellers = (container) => {
    const best = Store.products().filter(p => p.bestSeller && p.status === 'active').slice(0, 4);
    container.innerHTML = best.map(AnonUI.miniProduct).join('');
  };

  /* init legacy behaviors still used by pages (countdown, etc.) */
  AnonUI.initLegacy = () => {
    const modal = $('[data-modal]');
    if (modal) {
      const close = () => modal.classList.add('closed');
      const overlayClose = $('[data-modal-overlay]');
      const closeBtn = $('[data-modal-close]');
      if (overlayClose) overlayClose.addEventListener('click', close);
      if (closeBtn) closeBtn.addEventListener('click', close);
    }
    const toast = $('[data-toast]');
    if (toast) {
      const tb = $('[data-toast-close]');
      if (tb) tb.addEventListener('click', () => toast.classList.add('closed'));
    }
    /* accordions (desktop + mobile) via delegation */
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-accordion-btn], .accordion-menu, .sidebar-accordion-menu');
      if (!btn) return;
      const panel = btn.nextElementSibling;
      if (panel && panel.classList.contains('active')) {
        panel.classList.remove('active');
        btn.classList.remove('active');
        return;
      }
      /* close siblings */
      const group = btn.closest('ul');
      if (group) {
        group.querySelectorAll('.active').forEach(el => {
          if (el !== panel) { el.classList.remove('active'); const b = el.previousElementSibling; if (b) b.classList.remove('active'); }
        });
      }
      if (panel) { panel.classList.add('active'); btn.classList.add('active'); }
    });
  };

  AnonUI.init = () => {
    AnonUI.injectChrome();
    AnonUI.initLegacy();
  };

  global.AnonUI = AnonUI;

})(typeof window !== 'undefined' ? window : globalThis);
