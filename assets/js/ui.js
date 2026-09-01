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
    if (/^clients\//.test(src)) return src;
    if (/^assets\//.test(src)) return src;
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
    const ariaHidden = (opts || {}).ariaHidden ? ' aria-hidden="true"' : '';
    return `<picture>${sources}<img src="${AnonUI.img(meta.src || image)}" alt="${AnonUI.escapeHtml(meta.alt || fallbackAlt)}" width="${meta.width || 300}" height="${meta.height || 300}" loading="${loading}" decoding="async" class="${className || ''}"${ariaHidden}></picture>`;
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

  AnonUI.soldCount = (n) => {
    const v = Number(n || 0);
    if (v >= 1000) return (v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'K';
    return String(v);
  };

  AnonUI.badges = (p) => {
    let b = '';
    if (p.bestSeller) b += '<p class="showcase-badge angle black">best seller</p>';
    if (p.salePrice && p.salePrice < p.price) b += `<p class="showcase-badge">${AnonUI.discount(p)}%</p>`;
    return b;
  };

  /* ---------- product card renderer (grid) ---------- */

  AnonUI.productCard = (p) => {
    const price = AnonUI.money(p.salePrice || p.price);
    const del = p.salePrice ? `<del>${AnonUI.money(p.price)}</del>` : '';
    const out = p.stockStatus === 'out_of_stock' || p.availability === 'out_of_stock';
    const low = !out && (p.stockStatus === 'low_stock' || (p.stockQuantity != null && p.stockQuantity > 0 && p.stockQuantity <= (p.lowStockThreshold || 5)));
    const sold = p.soldCount > 0 ? `<p class="showcase-sold">${AnonUI.soldCount(p.soldCount)}+ sold</p>` : '';
    const ratings = p.rating > 0 ? `<div class="showcase-rating">${AnonUI.stars(p.rating)}<span class="showcase-reviews">(${p.ratingCount || 0})</span></div>` : '';
    const cat = Store.category(p.categoryId);
    const imgs = p.imageMeta || [];
    const primary = imgs[0] || p.mainImage;
    const hasHover = imgs.length > 1 && !!(primary && imgs[1] && imgs[1].src !== primary.src);
    return `
    <div class="showcase">
      <div class="showcase-banner">
        <a href="${AnonUI.productUrl(p)}">
          ${AnonUI.responsiveImage(primary, p.name, 'product-img default')}
          ${hasHover ? AnonUI.responsiveImage(imgs[1], p.name, 'product-img hover', { ariaHidden: true }) : ''}
        </a>
        <div class="showcase-actions">
          <a class="btn-action" href="${AnonUI.productUrl(p)}" title="View product" aria-label="View product"><ion-icon name="eye-outline"></ion-icon></a>
          <button class="btn-action" data-add-cart="${p.id}" title="Add to cart" aria-label="Add to cart" ${out ? 'disabled' : ''}><ion-icon name="bag-add-outline"></ion-icon></button>
        </div>
        ${out ? '<p class="showcase-stock-tag">Out of stock</p>' : low ? `<p class="showcase-stock-tag is-low">Only ${p.stockQuantity} left</p>` : ''}
      </div>
      <div class="showcase-content">
        <a href="/?cat=${encodeURIComponent(p.categoryId)}" class="showcase-category">${cat ? AnonUI.escapeHtml(cat.name) : ''}</a>
        <a href="${AnonUI.productUrl(p)}"><h3 class="showcase-title">${AnonUI.escapeHtml(p.name)}</h3></a>
        ${ratings}
        <div class="price-box"><p class="price">${price}</p>${del}</div>
        ${sold}
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
    const contact = (business.contact || {});
    const categories = Store.list('categories').filter(category => category.status !== 'archived').slice(0, 6);
    const nav = s.nav || {};
    const gLabelA = nav.genderLabelA || "Men's";
    const gLabelB = nav.genderLabelB || "Women's";
    const gMobileA = nav.mobileLabelA || (gLabelA + ' Shop');
    const gMobileB = nav.mobileLabelB || (gLabelB + ' Shop');
    return `
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
        <a href="cart.html" class="action-btn" title="Shopping bag" aria-label="Shopping bag"><ion-icon name="bag-handle-outline"></ion-icon><span class="count" data-cart-count style="background:var(--gold);min-width:20px;height:20px;padding:0;display:grid;place-items:center;border-radius:50%;font-size:11px;font-weight:700;line-height:1">0</span></a>
      </div>
    </div>
  </div>

  <nav class="desktop-nav-bar">
    <div class="container">
      <ul class="desktop-nav-list">
        <li class="desktop-nav-item"><a href="/" class="desktop-nav-link">Shop All</a></li>
        <li class="desktop-nav-item"><a href="mens.html" class="desktop-nav-link">${AnonUI.escapeHtml(gLabelA)}</a></li>
        <li class="desktop-nav-item"><a href="womens.html" class="desktop-nav-link">${AnonUI.escapeHtml(gLabelB)}</a></li>
        <li class="desktop-nav-item"><a href="collections.html" class="desktop-nav-link">Collections</a></li>
        <li class="desktop-nav-item"><a href="best-sellers.html" class="desktop-nav-link">Best Sellers</a></li>
        <li class="desktop-nav-item"><a href="new-arrivals.html" class="desktop-nav-link">New Arrivals</a></li>
        <li class="desktop-nav-item"><a href="about.html" class="desktop-nav-link">About</a></li>
        <li class="desktop-nav-item"><a href="contact.html" class="desktop-nav-link">Contact</a></li>
      </ul>
    </div>
  </nav>

  <div class="mobile-bottom-navigation">
    <a href="/" class="action-btn" aria-label="Home"><ion-icon name="home-outline"></ion-icon></a>
    <a href="cart.html" class="action-btn"><ion-icon name="bag-handle-outline"></ion-icon><span class="count" data-cart-count style="background:var(--gold);min-width:20px;height:20px;padding:0;display:grid;place-items:center;border-radius:50%;font-size:11px;font-weight:700;line-height:1">0</span></a>
    <button class="action-btn" data-mobile-menu-open-btn><ion-icon name="menu-outline"></ion-icon></button>
  </div>

  <nav class="mobile-navigation-menu has-scrollbar" data-mobile-menu>
    <div class="menu-top">
      <a href="/" class="menu-title menu-brand">${AnonUI.escapeHtml(Store.settings().storeName)}</a>
      <button class="menu-close-btn" data-mobile-menu-close-btn><ion-icon name="close-outline"></ion-icon></button>
    </div>

    <form class="menu-search" data-mobile-menu-search>
      <input type="search" name="q" placeholder="Search watches" aria-label="Search watches">
      <button type="submit" aria-label="Search"><ion-icon name="search-outline"></ion-icon></button>
    </form>

    <ul class="mobile-menu-category-list">
      <li class="menu-category"><a href="/" class="menu-title">Shop All</a></li>
      <li class="menu-category"><a href="/?gender=men" class="menu-title">${AnonUI.escapeHtml(gMobileA)}</a></li>
      <li class="menu-category"><a href="/?gender=women" class="menu-title">${AnonUI.escapeHtml(gMobileB)}</a></li>
      <li class="menu-category"><a href="collections.html" class="menu-title">Collections</a></li>
      <li class="menu-category"><a href="/?status=new" class="menu-title">New Arrivals</a></li>
      <li class="menu-category"><a href="/?status=featured" class="menu-title">Best Sellers</a></li>
      ${categories.length ? `
      <li class="menu-category menu-cat-group">
        <button type="button" class="menu-title menu-cat-toggle">Categories <ion-icon class="menu-cat-chevron" name="chevron-down-outline"></ion-icon></button>
        <ul class="menu-cat-sublist" hidden>
          ${categories.map(category => `<li class="menu-category"><a href="/?cat=${encodeURIComponent(category.id)}" class="menu-title">${AnonUI.escapeHtml(category.name)}</a></li>`).join('')}
        </ul>
      </li>` : ''}
    </ul>

    <div class="menu-bottom">
      <ul class="menu-social-container">
        ${social.facebook ? `<li><a href="${social.facebook}" class="social-link"><ion-icon name="logo-facebook"></ion-icon></a></li>` : ''}
        ${social.instagram ? `<li><a href="${social.instagram}" class="social-link"><ion-icon name="logo-instagram"></ion-icon></a></li>` : ''}
      </ul>
      <div class="menu-contact">
        ${contact.phone ? `<a href="tel:${contact.phone.replace(/[^0-9+]/g, '')}" class="menu-contact-link"><ion-icon name="call-outline"></ion-icon>${AnonUI.escapeHtml(contact.phone)}</a>` : ''}
        ${contact.whatsapp ? `<a href="https://wa.me/${contact.whatsapp.replace(/\D/g, '')}" class="menu-contact-link" target="_blank" rel="noopener"><ion-icon name="logo-whatsapp"></ion-icon>WhatsApp</a>` : ''}
      </div>
    </div>
  </nav>`;
  };

  AnonUI.footerHTML = () => {
    const s = Store.settings();
    return `
  <div class="footer-bottom">
    <div class="container">
      <p class="copyright">
        Copyright &copy; <a href="index.html">${AnonUI.escapeHtml(s.storeName)}</a> all rights reserved.
      </p>
      <p class="footer-powered">
        Powered by <a href="https://catalogue.co.ke" target="_blank" rel="noopener">Catalogue.co.ke</a>
      </p>
    </div>
  </div>`;
  };

  AnonUI.injectChrome = () => {
    const header = $('#site-header');
    const footer = $('#site-footer');
    const page = (document.body.dataset.page || '');
    const searchPages = ['shop', 'listing', 'search', 'best-sellers', 'new-arrivals', 'collections', 'mens', 'womens', 'unisex', 'product'];
    if (header) header.innerHTML = AnonUI.headerHTML(searchPages.includes(page));
    if (footer) footer.innerHTML = AnonUI.footerHTML();
    AnonUI.updateBadges();
    bindChromeEvents();

    /* highlight current page in desktop nav */
    const currentPath = global.location.pathname;
    document.querySelectorAll('.desktop-nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      const linkPath = new URL(href, global.location.origin).pathname;
      if (currentPath === linkPath || (linkPath === '/' && (currentPath === '/index.html' || currentPath === '/shop'))) {
        link.classList.add('is-active');
      }
    });

    /* floating WhatsApp button */
    if (!document.querySelector('.wa-float')) {
      const waNum = ((Store.settings().business || {}).contact || {}).whatsapp || '';
      if (waNum) {
        const a = document.createElement('a');
        a.href = 'https://wa.me/' + waNum.replace(/\D/g, '');
        a.target = '_blank';
        a.rel = 'noopener';
        a.className = 'wa-float';
        a.setAttribute('aria-label', 'Chat on WhatsApp');
        a.innerHTML = '<ion-icon name="logo-whatsapp"></ion-icon>';
        document.body.appendChild(a);
      }
    }
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

    /* mobile menu: in-panel search */
    const menuSearch = document.querySelector('[data-mobile-menu-search]');
    if (menuSearch) {
      menuSearch.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = menuSearch.querySelector('input').value.trim();
        if (q) global.location.href = '/search?q=' + encodeURIComponent(q);
      });
    }

    /* mobile menu: collapsible categories */
    const catGroup = document.querySelector('.menu-cat-group');
    if (catGroup) {
      const toggle = catGroup.querySelector('.menu-cat-toggle');
      const sub = catGroup.querySelector('.menu-cat-sublist');
      toggle.addEventListener('click', () => {
        const open = sub.hidden;
        sub.hidden = !open;
        catGroup.classList.toggle('is-open', open);
      });
    }

    /* cart actions on product cards (delegated) */
    document.addEventListener('click', (e) => {
      const cartBtn = e.target.closest('[data-add-cart]');
      if (cartBtn) {
        const res = AnonUI.addToCart(cartBtn.getAttribute('data-add-cart'), 1);
        AnonUI.toast(res.msg, res.ok ? 'success' : 'error');
        if (res.ok) global.setTimeout(() => { global.location.href = 'cart.html'; }, 400);
        return;
      }
      const quickBtn = e.target.closest('[data-quick-add]');
      if (quickBtn) {
        const res = AnonUI.addToCart(quickBtn.getAttribute('data-quick-add'), 1);
        AnonUI.toast(res.msg, res.ok ? 'success' : 'error');
        if (res.ok) global.setTimeout(() => { global.location.href = 'cart.html'; }, 400);
      }
    });
  }

  AnonUI.renderProductGrid = (container, products) => {
    container.innerHTML = products.map(AnonUI.productCard).join('') ||
      `<div class="empty-state"><ion-icon name="time-outline"></ion-icon><p>No products match your selection.</p><a href="/" class="btn">Browse the collection</a></div>`;
  };

  /* ---------- loading presentation (skeleton + fade-in) ---------- */

  AnonUI.skeletonCard = () => `
    <div class="showcase skeleton-card" aria-hidden="true">
      <div class="showcase-banner"><div class="sk sk-img"></div></div>
      <div class="showcase-content">
        <div class="sk sk-line sk-line--sm"></div>
        <div class="sk sk-line"></div>
        <div class="sk sk-line sk-line--sm"></div>
        <div class="sk sk-line sk-line--btn"></div>
      </div>
    </div>`;

  AnonUI.skeletonGrid = (container, count) => {
    container.classList.add('is-loading');
    const skeletonCount = count || (global.innerWidth <= 767 ? 4 : global.innerWidth <= 1023 ? 6 : 10);
    container.innerHTML = Array.from({ length: skeletonCount }, AnonUI.skeletonCard).join('');
  };

  AnonUI.reveal = (el) => {
    el.classList.remove('is-loading');
    el.classList.remove('fade-in');
    void el.offsetWidth;
    el.classList.add('fade-in');
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
