/* ------------------------------------------------------------------ *
 *  pages.js
 *  Storefront page behaviours, dispatched by <body data-page="...">.
 *  Depends on: models.js, store.js, ui.js
 * ------------------------------------------------------------------ */

'use strict';

(function (global) {

  const Store = global.AnonStore;
  const UI = global.AnonUI;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const qs = (k) => new URLSearchParams(global.location.search).get(k);
  const esc = UI.escapeHtml;
  let initialized = false;

  const AnonPages = {};

  /* ---------- helpers ---------- */

  const activeProducts = () => Store.products().filter(p => p.status === 'active');

  const waNumber = () => String(((Store.settings().business || {}).contact || {}).whatsapp || ((Store.settings().paymentProviders || {}).whatsapp || {}).number || '').replace(/\D/g, '');
  const waOrderLink = (items, subtotal, opts) => {
    const lines = [
      `Hello ${Store.settings().storeName || 'there'}, I would like to place an order:`,
      '',
      ...items.map((i, idx) => `${idx + 1}) ${i.product.name} — Qty ${i.quantity} × ${UI.money(i.product.salePrice || i.product.price)} = ${UI.money(i.lineTotal)}`)
    ];
    if (opts && opts.shipping) {
      lines.push('', `Shipping: ${opts.shipping.label} — ${opts.shipping.fee ? UI.money(opts.shipping.fee) : 'Free'}`);
    }
    if (opts && opts.note) lines.push(`Note: ${opts.note}`);
    const shipFee = (opts && opts.shipping) ? opts.shipping.fee : 0;
    lines.push('', `Subtotal: ${UI.money(subtotal)}`);
    if (shipFee) lines.push(`Shipping: ${UI.money(shipFee)}`);
    lines.push(`Total: ${UI.money(subtotal + shipFee)}`, '', 'Please confirm availability and delivery. Thank you!');
    return 'https://wa.me/' + waNumber() + '?text=' + encodeURIComponent(lines.join('\n'));
  };

  function renderDealOfDay() {
    const el = $('#deal-of-day');
    if (!el) return;
    const deals = activeProducts().filter(p => p.salePrice).sort((a, b) => a.soldCount - b.soldCount);
    const p = deals[0] || activeProducts()[0];
    if (!p) { el.innerHTML = ''; return; }
    const sold = p.soldCount || 10;
    const available = Math.max(0, p.stockQuantity);
    const pct = available + sold > 0 ? Math.round((sold / (sold + available)) * 100) : 0;
    el.innerHTML = `
      <div class="showcase">
        <div class="showcase-banner">
          <a href="product.html?id=${encodeURIComponent(p.id)}"><img src="${UI.img(p.mainImage)}" alt="${esc(p.name)}" class="showcase-img"></a>
        </div>
        <div class="showcase-content">
          <a href="product.html?id=${encodeURIComponent(p.id)}"><h3 class="showcase-title">${esc(p.name)}</h3></a>
          <p class="showcase-desc">${esc(p.shortDescription)}</p>
          <div class="price-box"><p class="price">${UI.money(p.salePrice)}</p><del>${UI.money(p.price)}</del></div>
          <a href="product.html?id=${encodeURIComponent(p.id)}" class="add-cart-btn">view product</a>
          <div class="showcase-status">
            <div class="wrapper">
              <p>already sold: <b>${sold}</b></p>
              <p>available: <b>${available}</b></p>
            </div>
            <div class="showcase-status-bar"><span style="width:${Math.min(100, pct)}%"></span></div>
          </div>
          <div class="countdown-box">
            <p class="countdown-desc">Hurry Up! Offer ends in:</p>
            <div class="countdown" data-countdown></div>
          </div>
        </div>
      </div>`;
    startCountdown($('[data-countdown]', el));
  }

  function startCountdown(el) {
    if (!el) return;
    let target = new Date();
    target.setHours(23, 59, 59, 0);
    const tick = () => {
      let diff = Math.max(0, target - new Date());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      el.innerHTML = `
        <div class="countdown-content"><p class="display-number">${String(h).padStart(2, '0')}</p><p class="display-text">Hours</p></div>
        <div class="countdown-content"><p class="display-number">${String(m).padStart(2, '0')}</p><p class="display-text">Min</p></div>
        <div class="countdown-content"><p class="display-number">${String(s).padStart(2, '0')}</p><p class="display-text">Sec</p></div>`;
    };
    tick();
    setInterval(tick, 1000);
  }

  function renderHero() {
    const wrap = $('#hero-slider');
    if (!wrap) return;
    const s = Store.settings();
    const heroSlides = (s.hero && s.hero.slides) || [];
    const slides = heroSlides.length ? heroSlides : [
      { bg: 'watch/hero-1.svg', kicker: 'Welcome', title: s.storeName || 'Shop', text: s.description || '', buttonText: 'Shop now' }
    ];
    wrap.innerHTML = slides.map((sl, i) => `
      <div class="hero-slide ${i === 0 ? 'is-active' : ''}" data-hero-slide="${i}">
        <img src="assets/images/${sl.bg}" alt="${esc(sl.title)}" class="hero-bg">
        <div class="container"><div class="hero-content">
          <p class="hero-kicker">${esc(sl.kicker)}</p>
          <h2 class="hero-title">${esc(sl.title)}</h2>
          <p class="hero-text">${esc(sl.text)}</p>
          <a href="/" class="hero-btn">${esc(sl.buttonText || sl.btn)} <ion-icon name="arrow-forward-outline"></ion-icon></a>
        </div></div>
      </div>`).join('');
    wrap.insertAdjacentHTML('afterend', `<div class="hero-dots">${slides.map((_, i) => `<button type="button" data-hero-dot="${i}" class="${i === 0 ? 'active' : ''}" aria-label="Slide ${i + 1}"></button>`).join('')}</div>`);

    let current = 0;
    const show = (i) => {
      current = i;
      $$('[data-hero-slide]', wrap).forEach((el, j) => el.classList.toggle('is-active', j === i));
      $$('[data-hero-dot]').forEach(d => d.classList.toggle('active', Number(d.dataset.heroDot) === i));
    };
    $$('[data-hero-dot]').forEach(d => d.addEventListener('click', () => show(Number(d.dataset.heroDot))));
    setInterval(() => show((current + 1) % slides.length), 6000);
  }

  function renderShopBanner() {
    const el = $('#hero-section') || $('#shop-banner');
    if (!el) return;
    const s = Store.settings();
    const b = s.business || {};
    const heroSlides = (b.hero && b.hero.slides) || [];

    if (!heroSlides.length) {
      el.style.display = 'none';
      return;
    }

    el.innerHTML = `
      <div class="hero-carousel" data-hero-carousel>
        ${heroSlides.map((sl, i) => `
          <div class="hero-slide${i === 0 ? ' is-active' : ''}" data-slide="${i}" ${sl.bg ? `style="background-image:url('${/^(assets|https?:|data:)/.test(sl.bg) ? sl.bg : 'assets/images/' + sl.bg}')"` : ''}>
          <div class="hero-slide-overlay"></div>
          <div class="container-wide hero-slide-content">
            ${sl.kicker ? `<span class="hero-kicker">${esc(sl.kicker)}</span>` : ''}
            <h2 class="hero-title">${esc(sl.title)}</h2>
            ${sl.text ? `<p class="hero-text">${esc(sl.text)}</p>` : ''}
            ${sl.buttonText ? `<a href="index.html" class="hero-btn">${esc(sl.buttonText)} <ion-icon name="arrow-forward-outline"></ion-icon></a>` : ''}
          </div>
          </div>`).join('')}
        <div class="hero-dots container-wide" data-hero-dots>
          ${heroSlides.map((_, i) => `<button type="button" data-dot="${i}" class="${i === 0 ? 'active' : ''}" aria-label="Slide ${i + 1}"></button>`).join('')}
          <div class="hero-arrows" style="margin-left:auto;display:flex;gap:14px">
            <button type="button" data-hero-prev class="hero-arrow" aria-label="Previous slide" style="width:32px;height:32px;border-radius:0;background:#e3c273;border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.25)"><ion-icon name="chevron-back-outline" style="font-size:18px;color:#fff;pointer-events:none"></ion-icon></button>
            <button type="button" data-hero-next class="hero-arrow" aria-label="Next slide" style="width:32px;height:32px;border-radius:0;background:#e3c273;border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.25)"><ion-icon name="chevron-forward-outline" style="font-size:18px;color:#fff;pointer-events:none"></ion-icon></button>
          </div>
        </div>
      </div>`;

    const carousel = el.querySelector('[data-hero-carousel]');
    const slides = carousel.querySelectorAll('.hero-slide');
    const dots = carousel.querySelectorAll('[data-dot]');
    let current = 0;
    let timer;

    function show(idx) {
      current = idx;
      slides.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    }

    function next() { show((current + 1) % slides.length); }
    function prev() { show((current - 1 + slides.length) % slides.length); }

    function startTimer() { timer = setInterval(next, 5000); }
    function resetTimer() { clearInterval(timer); startTimer(); }

    dots.forEach(d => d.addEventListener('click', () => {
      show(Number(d.dataset.dot));
      resetTimer();
    }));

    el.querySelector('[data-hero-prev]')?.addEventListener('click', () => { prev(); resetTimer(); });
    el.querySelector('[data-hero-next]')?.addEventListener('click', () => { next(); resetTimer(); });

    startTimer();
  }

  function renderHome() {
    renderShopBanner();

    const mensGrid = $('#mens-picks-grid');
    if (mensGrid) {
      const mens = activeProducts().filter(p => p.gender === 'men').sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.soldCount - a.soldCount).slice(0, 8);
      UI.renderProductGrid(mensGrid, mens);
    }

    const womensGrid = $('#womens-picks-grid');
    if (womensGrid) {
      const womens = activeProducts().filter(p => p.gender === 'women').sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.soldCount - a.soldCount).slice(0, 8);
      UI.renderProductGrid(womensGrid, womens);
    }

    const newArrivals = $('#new-arrivals-grid');
    if (newArrivals) UI.renderProductGrid(newArrivals, activeProducts().filter(p => p.newArrival).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8));

    const featured = $('#featured-timepieces-grid');
    if (featured) UI.renderProductGrid(featured, activeProducts().filter(p => p.featured).slice(0, 8));
  }

  /* ---------- shop / listing ---------- */

  const PRICE_PAGES = [
    [0, 2000], [2000, 4000], [4000, 6000], [6000, 8000], [8000, Infinity]
  ];

  function filteredProducts(paramsOverride) {
    const params = paramsOverride || new URLSearchParams(global.location.search);
    let list = activeProducts();
    const q = params.get('q');
    if (q) {
      const ql = q.toLowerCase();
      list = list.filter(p => [p.name, (Store.brand(p.brandId) || {}).name, p.sku, ...(p.tags || []), ...Object.values(p.attributes || {})].join(' ').toLowerCase().includes(ql));
    }
    const cat = params.get('cat');
    if (cat) list = list.filter(p => p.categoryId === cat);
    const brand = params.get('brand');
    if (brand) { const ids = brand.split(','); list = list.filter(p => ids.includes(p.brandId)); }
    const gender = params.get('gender');
    if (gender) list = list.filter(p => p.gender === gender);
    const status = params.get('status');
    if (status === 'sale') list = list.filter(p => p.salePrice && p.salePrice < p.price);
    if (status === 'new') list = list.filter(p => p.newArrival);
    if (status === 'best') list = list.filter(p => p.bestSeller);
    if (status === 'featured') list = list.filter(p => p.featured);
    const min = params.get('min'), max = params.get('max');
    if (min !== null) list = list.filter(p => (p.salePrice || p.price) >= Number(min));
    if (max !== null) list = list.filter(p => (p.salePrice || p.price) <= Number(max));
    const coll = params.get('collection');
    if (coll) list = list.filter(p => p.collectionIds.includes(coll));
    return list;
  }

  function renderShop() {
    const grid = $('#shop-grid');
    if (!grid) return;
    /* merge page-level default filters (e.g. mens.html → gender=men) */
    const defaults = grid.dataset.defaultFilter ? JSON.parse(grid.dataset.defaultFilter) : {};
    const merged = new URLSearchParams(global.location.search);
    Object.keys(defaults).forEach(k => { if (!merged.get(k)) merged.set(k, defaults[k]); });
    const params = merged;

    const sort = params.get('sort') || 'featured';
    let list = filteredProducts(params);

    switch (sort) {
      case 'price-asc': list = list.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price)); break;
      case 'price-desc': list = list.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price)); break;
      case 'rating': list = list.sort((a, b) => b.rating - a.rating); break;
      case 'newest': list = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      case 'name': list = list.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: list = list.sort((a, b) => (b.featured - a.featured) || (b.soldCount - a.soldCount));
    }

    const countEl = $('#result-count');
    if (countEl) countEl.textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;

    const chips = $('#filter-chips');
    if (chips) {
      const chipHtml = [];
      if (params.get('q')) chipHtml.push(`<span class="chip">Search: ${esc(params.get('q'))} <a class="chip-close" href="/"><ion-icon name="close"></ion-icon></a></span>`);
      const cat = params.get('cat') ? Store.category(params.get('cat')) : null;
      if (cat) chipHtml.push(`<span class="chip">${esc(cat.name)} <a class="chip-close" href="${stripParam('cat')}"><ion-icon name="close"></ion-icon></a></span>`);
      const brand = params.get('brand') ? Store.brand(params.get('brand')) : null;
      if (brand) chipHtml.push(`<span class="chip">${esc(brand.name)} <a class="chip-close" href="${stripParam('brand')}"><ion-icon name="close"></ion-icon></a></span>`);
      const gender = params.get('gender');
      if (gender) { const gLabel = { men: "Men's", women: "Women's", unisex: 'Unisex' }[gender] || gender; chipHtml.push(`<span class="chip">${esc(gLabel)} <a class="chip-close" href="${stripParam('gender')}"><ion-icon name="close"></ion-icon></a></span>`); }
      const min = params.get('min'), max = params.get('max');
      if (min || max) chipHtml.push(`<span class="chip">${UI.money(min || 0)} – ${UI.money(max || '∞')} <a class="chip-close" href="${stripParam('min', 'max')}"><ion-icon name="close"></ion-icon></a></span>`);
      if (params.get('status')) chipHtml.push(`<span class="chip">${esc(params.get('status'))} <a class="chip-close" href="${stripParam('status')}"><ion-icon name="close"></ion-icon></a></span>`);
      const coll = params.get('collection') ? Store.collection(params.get('collection')) : null;
      if (coll) chipHtml.push(`<span class="chip">${esc(coll.name)} <a class="chip-close" href="${stripParam('collection')}"><ion-icon name="close"></ion-icon></a></span>`);
      chips.innerHTML = chipHtml.join('');
    }

    const sortSel = $('#shop-sort');
    if (sortSel) {
      sortSel.value = sort;
      sortSel.addEventListener('change', () => {
        const u = new URLSearchParams(params);
        u.set('sort', sortSel.value);
        global.location.href = '/?' + u.toString();
      });
    }

    /* pagination */
    const perPage = 12;
    const page = Math.max(1, Number(params.get('page')) || 1);
    const totalPages = Math.max(1, Math.ceil(list.length / perPage));
    const slice = list.slice((page - 1) * perPage, page * perPage);
    UI.renderProductGrid(grid, slice);

    const pag = $('#shop-pagination');
    if (pag) {
      const mk = (p, label, disabled) => `<button class="btn btn-outline pag-btn" ${disabled ? 'disabled' : ''} data-page="${p}">${label}</button>`;
      pag.innerHTML = mk(page - 1, '&laquo;', page <= 1) + `<span class="pag-info">Page ${page} of ${totalPages}</span>` + mk(page + 1, '&raquo;', page >= totalPages);
      $$('.pag-btn', pag).forEach(b => b.addEventListener('click', () => {
        const u = new URLSearchParams(params);
        u.set('page', b.dataset.page);
        global.location.href = '/?' + u.toString();
      }));
    }
  }

  function stripParam(...names) {
    const u = new URLSearchParams(global.location.search);
    names.forEach(n => u.delete(n));
    u.delete('page');
    return '/?' + u.toString();
  }

  function initShopFilters() {
    const panel = $('#shop-filters');
    if (!panel) return;
    const params = new URLSearchParams(global.location.search);

    /* mobile collapsible filter panel */
    const toggleBtn = $('#filter-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const open = panel.classList.toggle('is-open');
        toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      /* auto-expand when a filter has already been applied (e.g. deep links from a category) — desktop only */
      const hasActiveFilters = ['q', 'cat', 'gender', 'brand', 'movement', 'status', 'min', 'max', 'collection'].some(k => params.get(k));
      if (hasActiveFilters && global.innerWidth > 1023) {
        panel.classList.add('is-open');
        toggleBtn.setAttribute('aria-expanded', 'true');
      }
    }

    const catsEl = $('#filter-cats');
    if (catsEl) {
      const catOpts = Store.list('categories').filter(c => c.status === 'active').sort((a, b) => a.order - b.order);
      catsEl.innerHTML = catOpts.map(c => `
        <label class="filter-option"><input type="radio" name="f-cat" value="${c.id}" ${params.get('cat') === c.id ? 'checked' : ''}>${esc(c.name)}<span class="count">${activeProducts().filter(p => p.categoryId === c.id).length}</span></label>`).join('');
    }

    const genderEl = $('#filter-gender');
    if (genderEl) {
      const genderOpts = [['men', 'Men'], ['women', 'Women'], ['unisex', 'Unisex']];
      genderEl.innerHTML = genderOpts.map(g => `
        <label class="filter-option"><input type="radio" name="f-gender" value="${g[0]}" ${params.get('gender') === g[0] ? 'checked' : ''}>${g[1]}<span class="count">${activeProducts().filter(p => p.gender === g[0]).length}</span></label>`).join('');
    }

    const brandsEl = $('#filter-brands');
    if (brandsEl) {
      const brandOpts = Store.list('brands').filter(b => activeProducts().some(p => p.brandId === b.id)).sort((a, b) => a.name.localeCompare(b.name));
      const selectedBrands = (params.get('brand') || '').split(',').filter(Boolean);
      brandsEl.innerHTML = brandOpts.map(b => `
        <label class="filter-option"><input type="checkbox" name="f-brand" value="${b.id}" ${selectedBrands.includes(b.id) ? 'checked' : ''}>${esc(b.name)}<span class="count">${activeProducts().filter(p => p.brandId === b.id).length}</span></label>`).join('');
    }

    const movEl = $('#filter-movement');
    if (movEl) {
      const movOpts = ['automatic', 'mechanical', 'quartz', 'chronograph', 'solar'];
      movEl.innerHTML = movOpts.map(m => `
        <label class="filter-option"><input type="radio" name="f-movement" value="${m}" ${params.get('movement') === m ? 'checked' : ''}>${m[0].toUpperCase() + m.slice(1)}<span class="count">${activeProducts().filter(p => p.movement === m).length}</span></label>`).join('');
    }

    const statusEl = $('#filter-status');
    if (statusEl) {
      statusEl.innerHTML = `
        <label class="filter-option"><input type="checkbox" name="f-sale" ${params.get('status') === 'sale' ? 'checked' : ''}>On sale only</label>
        <label class="filter-option"><input type="checkbox" name="f-new" ${params.get('status') === 'new' ? 'checked' : ''}>New arrivals</label>
        <label class="filter-option"><input type="checkbox" name="f-best" ${params.get('status') === 'best' ? 'checked' : ''}>Best sellers</label>`;
    }

    const priceEl = $('#filter-price');
    if (priceEl) {
      priceEl.innerHTML = PRICE_PAGES.map(r => {
        const label = r[1] === Infinity ? `${UI.money(r[0])}+` : `${UI.money(r[0])} – ${UI.money(r[1])}`;
        return `<label class="filter-option"><input type="radio" name="f-price" value="${r[0]}|${r[1]}" ${params.get('min') == r[0] && params.get('max') == r[1] ? 'checked' : ''}>${label}</label>`;
      }).join('');
    }

    const apply = (mutator) => {
      const u = new URLSearchParams();
      mutator(u);
      global.location.search = u.toString();
    };

    $$('input[name="f-cat"]', panel).forEach(i => i.addEventListener('change', () => apply(u => {
      if (i.checked) u.set('cat', i.value); else u.delete('cat');
    })));
    $$('input[name="f-gender"]', panel).forEach(i => i.addEventListener('change', () => apply(u => {
      if (i.checked) u.set('gender', i.value); else u.delete('gender');
    })));
    $$('input[name="f-movement"]', panel).forEach(i => i.addEventListener('change', () => apply(u => {
      if (i.checked) u.set('movement', i.value); else u.delete('movement');
    })));
    $$('input[name="f-price"]', panel).forEach(i => i.addEventListener('change', () => apply(u => {
      if (i.checked) { const [min, max] = i.value.split('|'); u.set('min', min); u.set('max', max); } else { u.delete('min'); u.delete('max'); }
    })));
    $$('input[name="f-brand"]', panel).forEach(i => i.addEventListener('change', () => apply(u => {
      const checked = $$('input[name="f-brand"]', panel).filter(x => x.checked);
      u.set('brand', checked.map(x => x.value).join(','));
      if (!checked.length) u.delete('brand');
    })));
    [[$('input[name="f-sale"]', panel), 'sale'], [$('input[name="f-new"]', panel), 'new'], [$('input[name="f-best"]', panel), 'best']].forEach(([box, key]) => {
      if (!box) return;
      box.addEventListener('change', () => apply(u => {
        const map = {
          sale: $('input[name="f-sale"]', panel) ? $('input[name="f-sale"]', panel).checked : false,
          new: $('input[name="f-new"]', panel) ? $('input[name="f-new"]', panel).checked : false,
          best: $('input[name="f-best"]', panel) ? $('input[name="f-best"]', panel).checked : false
        };
        const activeKey = Object.keys(map).find(k => map[k]);
        if (activeKey) u.set('status', activeKey); else u.delete('status');
      }));
    });

    const clear = $('#filter-clear');
    if (clear) clear.addEventListener('click', () => { global.location.href = '/'; });
  }

  /* ---------- collections ---------- */

  function initCollections() {
    const grid = $('#collections-grid');
    if (!grid) return;
    grid.innerHTML = Store.list('collections').filter(c => c.status === 'active').map((c, i) => `
      <a href="#${esc(c.slug)}" class="collection-card">
        <img src="assets/images/watch/collection-${(i % 6) + 1}.svg" alt="${esc(c.name)}">
        <div class="collection-overlay">
          <h3 class="collection-name">${esc(c.name)}</h3>
          <p class="collection-desc">${esc(c.description)}</p>
          <span class="collection-link">Explore</span>
        </div>
      </a>`).join('');

    const detail = $('#collections-detail');
    if (detail) {
      detail.innerHTML = Store.list('collections').filter(c => c.status === 'active').map((c, i) => {
        const items = activeProducts().filter(p => p.collectionIds.includes(c.id));
        return `
        <section class="collection-section" id="${esc(c.slug)}">
          <div class="collection-section-head">
            <div>
              <h2>${esc(c.name)}</h2>
              <p>${esc(c.description)}</p>
            </div>
            <a href="/?collection=${encodeURIComponent(c.id)}" class="btn btn-outline">View all</a>
          </div>
          <div class="product-grid collection-products">${items.slice(0, 4).map(UI.productCard).join('')}</div>
        </section>`;
      }).join('');
    }
  }

  /* ---------- product page ---------- */

  function initProduct() {
    const pathSlug = (global.location.pathname.match(/\/product\/([^/]+)\/?$/) || [])[1];
    const id = qs('id');
    const root = $('#product-root');
    if (!root) return;
    const p = pathSlug ? Store.products().find(product => product.slug === decodeURIComponent(pathSlug)) : Store.getProduct(id);
    if (!p) {
      root.innerHTML = `<div class="empty-state"><ion-icon name="cube-outline"></ion-icon><p>The requested product could not be found.</p><a href="/" class="btn btn-primary">Back to shop</a></div>`;
      return;
    }
    const brand = p.brand;
    const cat = p.category;
    const sale = p.salePrice && p.salePrice < p.price;

    root.innerHTML = `
    <div class="product-layout">
      <div class="product-gallery">
        <div class="gallery-main" id="gallery-main-wrap">${UI.responsiveImage(p.mainImage, p.name, '', { priority: true, sizes: '(max-width: 600px) 100vw, 50vw' })}</div>
        <div class="gallery-thumbs" data-thumbs>
          ${p.images.map((im, i) => `<img src="${UI.img(im)}" alt="${esc(((p.imageMeta || [])[i] || {}).alt || `${p.name} — view ${i + 1}`)}" loading="lazy" decoding="async" class="${im === p.mainImage ? 'active' : ''}" data-thumb="${UI.img(im)}" data-thumb-idx="${i}">`).join('')}
        </div>
      </div>
      <div class="product-info">
        <p class="product-brand">${brand ? esc(brand.name) : ''}</p>
        <h1 class="product-name">${esc(p.name)}</h1>
        <p class="product-meta">${p.sku ? `SKU ${esc(p.sku)}` : ''}</p>
        <div class="product-price">
          <p class="price">${UI.money(sale ? p.salePrice : p.price)}</p>
          ${sale ? `<del>${UI.money(p.price)}</del><span style="color:var(--gold);font-size:var(--fs-7);font-weight:600">Save ${UI.money(p.price - p.salePrice)}</span>` : ''}
        </div>
        <p class="product-desc">${esc(p.shortDescription)}</p>
        ${Object.keys(p.attributes || {}).length ? `<div class="product-specs">${Object.entries(p.attributes).map(([label, value]) => `<div class="spec-row"><span class="spec-label">${esc(label)}</span><span class="spec-value">${esc(value)}</span></div>`).join('')}</div>` : ''}
        <div class="product-actions">
          <div class="qty-box">
            <button data-qty-minus aria-label="decrease">−</button>
            <input type="number" value="1" min="1" max="99" data-qty-input aria-label="quantity">
            <button data-qty-plus aria-label="increase">+</button>
          </div>
          <button class="add-to-bag-btn" data-add-bag="${p.id}" ${p.stockStatus === 'out_of_stock' && !p.allowBackorders ? 'disabled' : ''}>
            ${p.stockStatus === 'out_of_stock' && !p.allowBackorders ? 'Out of stock' : 'Add to Cart'}
          </button>
        </div>
        ${p.stockStatus === 'low_stock' ? `<p style="color:#c0392b;font-size:var(--fs-8)">Only ${p.stockQuantity} left in stock</p>` : ''}
        <div class="product-trust">
          <span class="trust-item"><ion-icon name="wallet-outline"></ion-icon> Pay on delivery — M-Pesa or cash</span>
          <span class="trust-item"><ion-icon name="bicycle-outline"></ion-icon> ${esc(((Store.settings().business || {}).commerce || {}).deliveryInfo || 'Delivery arranged via WhatsApp')}</span>
        </div>
      </div>
    </div>
    <div class="related-section">
      <h2 class="section-title" style="font-family:Georgia,serif;color:var(--ink)">You may also like</h2>
      <div class="product-grid related-products" data-related-products></div>
    </div>`;

    /* gallery */
    $$('[data-thumb]', root).forEach(t => t.addEventListener('click', () => {
      const idx = Number(t.dataset.thumbIdx);
      const meta = (p.imageMeta || [])[idx] || { src: t.dataset.thumb };
      const wrap = $('#gallery-main-wrap', root);
      if (wrap) wrap.innerHTML = UI.responsiveImage(meta, p.name, '', { priority: true, sizes: '(max-width: 600px) 100vw, 50vw' }).replace(/<\/?picture>/g, '');
      $$('[data-thumb]', root).forEach(x => x.classList.remove('active'));
      t.classList.add('active');
    }));

    /* qty */
    const qtyInput = $('[data-qty-input]', root);
    $('[data-qty-minus]', root).addEventListener('click', () => { qtyInput.value = Math.max(1, Number(qtyInput.value) - 1); });
    $('[data-qty-plus]', root).addEventListener('click', () => { qtyInput.value = Math.min(99, Number(qtyInput.value) + 1); });

    /* add to bag */
    $('[data-add-bag]', root).addEventListener('click', () => {
      const res = UI.addToCart(p.id, Math.max(1, Number(qtyInput.value) || 1));
      UI.toast(res.msg, res.ok ? 'success' : 'error');
    });

    /* related timepieces — ~8 other watches */
    const related = $('[data-related-products]', root);
    if (related) {
      const pool = activeProducts().filter(x => x.id !== p.id)
        .sort((a, b) =>
          (b.categoryId === p.categoryId) - (a.categoryId === p.categoryId) ||
          (b.collectionIds.some(c => p.collectionIds.includes(c))) - (a.collectionIds.some(c => p.collectionIds.includes(c))) ||
          (b.brandId === p.brandId) - (a.brandId === p.brandId))
        .slice(0, 8);
      UI.renderProductGrid(related, pool);
    }
  }

  /* ---------- wishlist ---------- */

  function initWishlist() {
    const grid = $('#wishlist-grid') || $('#wishlist-root');
    if (!grid) return;
    grid.innerHTML = `<div class="empty-state"><ion-icon name="time-outline"></ion-icon><p>Wishlists are no longer available.</p><a href="/" class="btn btn-primary">Browse products</a></div>`;
  }

  /* ---------- cart ---------- */

  function initCart() {
    const wrap = $('#cart-root');
    if (!wrap) return;
    const { items, subtotal } = UI.cartDetail();

    if (!items.length) {
      wrap.innerHTML = `<div class="empty-state"><ion-icon name="bag-handle-outline"></ion-icon><p>Your bag is empty.</p><a href="/" class="btn btn-primary">Start shopping</a></div>`;
      return;
    }

    const cards = items.map(i => `
      <div class="cart-card" data-cart-row="${i.productId}">
        <a href="product.html?id=${encodeURIComponent(i.productId)}" class="cart-card-img">
          <img src="${UI.img(i.product.mainImage)}" alt="${esc(i.product.name)}">
        </a>
        <div class="cart-card-top">
          <a href="product.html?id=${encodeURIComponent(i.productId)}" class="cart-card-name">${esc(i.product.name)}</a>
          <button class="cart-card-remove" data-cart-remove="${i.productId}" aria-label="Remove"><ion-icon name="trash-outline"></ion-icon></button>
        </div>
        <div class="cart-card-row">
          <span class="cart-card-price">${UI.money(i.product.salePrice || i.product.price)}</span>
          <div class="qty-box">
            <button data-cart-dec="${i.productId}">−</button>
            <input value="${i.quantity}" data-cart-qty="${i.productId}" inputmode="numeric">
            <button data-cart-inc="${i.productId}">+</button>
          </div>
          <span class="cart-card-total">${UI.money(i.lineTotal)}</span>
        </div>
      </div>`).join('');

    wrap.innerHTML = `
      <div class="cart-layout">
        <div class="cart-items">
          ${cards}
          <a href="/" class="btn btn-outline cart-continue"><ion-icon name="arrow-back-outline"></ion-icon> Continue shopping</a>
        </div>
        <aside class="summary-card">
          <h3>Order Summary</h3>
          <div class="summary-row"><span>Subtotal</span><span data-sum-subtotal>${UI.money(subtotal)}</span></div>
          <div class="summary-row"><span>Shipping</span><span data-sum-shipping>Calculated at checkout</span></div>
          <div class="summary-row total"><span>Estimated total</span><span data-sum-total>${UI.money(subtotal)}</span></div>
          <p class="pod-note"><ion-icon name="wallet-outline"></ion-icon> Pay on delivery — M-Pesa or cash.</p>
          <a href="checkout.html" class="btn btn-outline btn-block" style="margin-top:10px">Proceed to Checkout</a>
        </aside>
      </div>`;

    /* qty & remove */
    document.querySelectorAll('[data-cart-inc]').forEach(b => b.addEventListener('click', () => {
      UI.setCartQty(b.dataset.cartInc, Number($(`[data-cart-qty="${b.dataset.cartInc}"]`).value) + 1); reinitCart();
    }));
    document.querySelectorAll('[data-cart-dec]').forEach(b => b.addEventListener('click', () => {
      UI.setCartQty(b.dataset.cartDec, Number($(`[data-cart-qty="${b.dataset.cartDec}"]`).value) - 1); reinitCart();
    }));
    document.querySelectorAll('[data-cart-qty]').forEach(inp => inp.addEventListener('change', () => {
      UI.setCartQty(inp.dataset.cartQty, Number(inp.value) || 1); reinitCart();
    }));
    document.querySelectorAll('[data-cart-remove]').forEach(b => b.addEventListener('click', () => {
      UI.removeFromCart(b.dataset.cartRemove); reinitCart();
    }));
  }

  let reinitCart = () => { initCart(); };

  /* ---------- checkout ---------- */

  function initCheckout() {
    const { items, subtotal } = UI.cartDetail();
    if (!items.length) {
      const wrap = $('#checkout-root');
      if (wrap) wrap.innerHTML = `<div class="empty-state"><ion-icon name="bag-handle-outline"></ion-icon><p>Your bag is empty — nothing to check out.</p><a href="/" class="btn btn-primary">Start shopping</a></div>`;
      return;
    }
    const settings = Store.settings();
    const cust = Store.currentCustomer();

    const shippingMethods = settings.shippingMethods;
    const tax = +((subtotal) * settings.taxRates.standard / 100).toFixed(2);

    const wrap = $('#checkout-root');
    wrap.innerHTML = `
    <div class="checkout-layout">
      <div>
        <form data-checkout-form>
          <div class="form-section">
            <h3><span class="step-num">1</span> Your details</h3>
            <div class="form-grid">
              <div class="form-field"><label>First name <span class="req">*</span></label><input name="firstName" value="${esc(cust ? cust.firstName : '')}" required></div>
              <div class="form-field"><label>Last name <span class="req">*</span></label><input name="lastName" value="${esc(cust ? cust.lastName : '')}" required></div>
              <div class="form-field full"><label>Email (optional)</label><input type="email" name="email" value="${esc(cust ? cust.email : '')}"></div>
              <div class="form-field full"><label>Phone <span class="req">*</span></label><input name="phone" value="${esc(cust ? cust.phone : '')}" required></div>
            </div>
          </div>
          <div class="form-section">
            <h3><span class="step-num">2</span> Delivery</h3>
            <div class="form-grid">
              <div class="form-field full"><label>Address <span class="req">*</span></label><input name="line1" required></div>
              <div class="form-field"><label>City / Town <span class="req">*</span></label><input name="city" required></div>
              <div class="form-field"><label>Country <span class="req">*</span></label><input name="country" required></div>
              <div class="form-field full"><label>Delivery method</label>
                ${shippingMethods.map((m, i) => `
                  <label class="pay-option ${i === 0 ? 'selected' : ''}">
                    <input type="radio" name="shippingMethod" value="${esc(m.name)}" ${i === 0 ? 'checked' : ''}>
                    <span><span class="pay-label">${esc(m.name)}</span><br><span class="pay-note">${esc(m.deliveryDays)} · ${m.fee === 0 ? 'Free' : UI.money(m.fee)}</span></span>
                  </label>`).join('')}
              </div>
            </div>
          </div>
          <div class="form-section">
            <h3><span class="step-num">3</span> Payment — on delivery</h3>
            <p class="pod-banner"><ion-icon name="wallet-outline"></ion-icon> Payment is on delivery — pay with M-Pesa or cash when your order arrives.</p>
            <label class="pay-option selected"><input type="radio" name="paymentMethod" value="M-Pesa on delivery" checked><span><span class="pay-label">M-Pesa — pay on delivery</span><br><span class="pay-note">We send the M-Pesa payment request when your order arrives</span></span></label>
            <label class="pay-option"><input type="radio" name="paymentMethod" value="Cash on delivery"><span><span class="pay-label">Cash on delivery</span><br><span class="pay-note">Pay cash to the rider or at store pickup</span></span></label>
            <div class="form-field" style="margin-top:12px"><label>Order notes (optional)</label><textarea name="notes" rows="2"></textarea></div>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Place order — pay ${UI.money(total())} on delivery</button>
          <button type="button" class="btn wa-btn btn-block" data-wa-checkout>Complete order via WhatsApp</button>
        </form>
      </div>
      <aside class="summary-card order-summary">
        <h3>Your Order</h3>
        ${items.map(i => `
          <div class="summary-item">
            <img src="${UI.img(i.product.mainImage)}" alt="${esc(i.product.name)}">
            <div><p class="si-name">${esc(i.product.name)}</p><p class="si-meta">Qty ${i.quantity} × ${UI.money(i.product.salePrice || i.product.price)}</p></div>
          </div>`).join('')}
        <div class="summary-row" style="margin-top:12px"><span>Subtotal</span><span>${UI.money(subtotal)}</span></div>
        <div class="summary-row"><span>Shipping</span><span data-shipping-display></span></div>
        <div class="summary-row"><span>Tax (${settings.taxRates.standard}%)</span><span>${UI.money(tax)}</span></div>
        <div class="summary-row total"><span>Total</span><span data-checkout-total>${UI.money(total())}</span></div>
        <p class="pod-note"><ion-icon name="wallet-outline"></ion-icon> Pay on delivery — M-Pesa or cash.</p>
      </aside>
    </div>`;

    function total() { return Math.max(0, subtotal + shippingFee() + tax); }
    function shippingFee() {
      const method = $$('input[name="shippingMethod"]', wrap).find(r => r.checked);
      if (!method) return shippingMethods[0] ? shippingMethods[0].fee : 0;
      const m = shippingMethods.find(x => x.name === method.value);
      return m ? m.fee : (shippingMethods[0] ? shippingMethods[0].fee : 0);
    }
    function currentShipping() {
      const method = $$('input[name="shippingMethod"]', wrap).find(r => r.checked);
      return method ? shippingMethods.find(x => x.name === method.value) : shippingMethods[0];
    }
    $$('input[name="shippingMethod"]', wrap).forEach(r => r.addEventListener('change', () => {
      $$('.pay-option', wrap).forEach(o => o.classList.remove('selected'));
      r.closest('.pay-option').classList.add('selected');
      const m = shippingMethods.find(x => x.name === r.value);
      const el = $('[data-shipping-display]', wrap);
      if (el) el.textContent = m ? (m.fee === 0 ? 'Free' : UI.money(m.fee)) : '';
      const t = $('[data-checkout-total]', wrap);
      if (t) t.textContent = UI.money(total());
    }));
    $$('input[name="paymentMethod"]', wrap).forEach(r => r.addEventListener('change', () => {
      $$('.pay-option', wrap).forEach(o => o.classList.remove('selected'));
      r.closest('.pay-option').classList.add('selected');
    }));
    const shipInit = $$('input[name="shippingMethod"]', wrap)[0];
    if (shipInit) {
      const m = shippingMethods.find(x => x.name === shipInit.value);
      const el = $('[data-shipping-display]', wrap);
      if (el) el.textContent = m && m.fee === 0 ? 'Free' : (m ? UI.money(m.fee) : UI.money(0));
    }

    const readForm = () => {
      const f = new FormData($('[data-checkout-form]', wrap));
      const method = $('input[name="shippingMethod"]:checked', wrap).value;
      const m = shippingMethods.find(x => x.name === method);
      return {
        f, method, m,
        address: {
          firstName: f.get('firstName'), lastName: f.get('lastName'), email: f.get('email'),
          phone: f.get('phone'), line1: f.get('line1'), line2: f.get('line2'),
          city: f.get('city'), postalCode: '', country: f.get('country')
        },
        addressText: [f.get('line1'), f.get('line2'), f.get('city'), f.get('country')].filter(Boolean).join(', ')
      };
    };
    const submitOrder = (data) => {
      const order = Store.placeOrder({
        customer: cust,
        cart: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        address: data.address,
        shippingMethod: data.method,
        paymentMethod: $('input[name="paymentMethod"]:checked', wrap).value,
        couponCode: null,
        notes: data.f.get('notes')
      });
      UI.clearCart();
      UI.toast('Order placed successfully! Pay on delivery.');
      setTimeout(() => { global.location.href = 'order-confirmation.html?order=' + encodeURIComponent(order.orderNumber); }, 400);
      return order;
    };

    $('[data-checkout-form]', wrap).addEventListener('submit', (e) => {
      e.preventDefault();
      submitOrder(readForm());
    });
    $('[data-wa-checkout]', wrap).addEventListener('click', () => {
      const data = readForm();
      const m = data.m;
      const link = waOrderLink(items, subtotal, {
        shippingLabel: m ? m.name : '',
        shippingFee: m ? (m.fee === 0 ? 'Free' : UI.money(m.fee)) : '',
        address: data.addressText,
        total: total()
      });
      global.open(link, '_blank', 'noopener');
      UI.toast('Opening WhatsApp — send the message to confirm your order.', 'neutral');
      submitOrder(data);
    });
  }

  const SHIPPING_OPTIONS = [
    { id: 'rider-nairobi', label: 'Rider — Nairobi', fee: 300, icon: 'bicycle-outline', desc: 'Delivered to your door by rider' },
    { id: 'g4s-outside', label: 'G4S — outside Nairobi', fee: 600, icon: 'car-outline', desc: 'Countrywide via G4S courier' },
    { id: 'pickup', label: 'Pickup at shop', fee: 0, icon: 'storefront-outline', desc: 'Collect from our store, free' }
  ];

  function initWhatsAppCheckout() {
    const { items, subtotal } = UI.cartDetail();
    const wrap = $('#checkout-root');
    if (!wrap) return;
    if (!items.length) { wrap.innerHTML = `<div class="empty-state"><ion-icon name="bag-handle-outline"></ion-icon><p>Your cart is empty.</p><a href="/" class="btn btn-primary">Browse products</a></div>`; return; }
    const initFee = SHIPPING_OPTIONS[0].fee;

    const shipCards = SHIPPING_OPTIONS.map((opt, idx) => `
      <label class="ship-card${idx === 0 ? ' selected' : ''}">
        <input type="radio" name="shipping" value="${opt.id}" ${idx === 0 ? 'checked' : ''}>
        <span class="ship-card-label">${esc(opt.label)}</span>
        <span class="ship-card-fee">${opt.fee ? UI.money(opt.fee) : 'Free'}</span>
        <span class="ship-card-desc">${esc(opt.desc)}</span>
      </label>`).join('');

    wrap.innerHTML = `
      <div class="checkout-layout">
        <div class="form-section ck-left">
          <p class="pod-banner"><ion-icon name="wallet-outline"></ion-icon> Pay on delivery — M-Pesa or cash.</p>

          <h3>Shipping method</h3>
          <div class="ship-grid">${shipCards}</div>

          <div class="form-field-row" style="margin-top:28px">
            <div class="form-field">
              <label for="ck-name">Name</label>
              <input type="text" id="ck-name" name="name" placeholder="e.g. Jane Doe">
            </div>
            <div class="form-field">
              <label for="ck-phone">Phone number <span class="req">*</span></label>
              <input type="tel" id="ck-phone" name="phone" placeholder="e.g. 0712 345 678" required>
            </div>
          </div>

          <button type="button" class="btn wa-btn btn-block" data-wa-checkout style="margin-top:20px">
            <ion-icon name="logo-whatsapp"></ion-icon> Place order via WhatsApp
          </button>

          <button type="button" class="btn btn-primary btn-block" data-web-order style="margin-top:10px">Place order via website</button>
        </div>

        <aside class="summary-card order-summary ck-right">
          <h3>Your cart + shipping costs</h3>
          ${items.map(item => `
            <div class="summary-item">
              <img src="${UI.img(item.product.mainImage)}" alt="${esc(item.product.name)}" loading="lazy">
              <div>
                <p class="si-name">${esc(item.product.name)}</p>
                <p class="si-meta">Qty ${item.quantity} × ${UI.money(item.product.salePrice || item.product.price)}</p>
              </div>
            </div>`).join('')}
          <div class="summary-row"><span>Subtotal</span><span>${UI.money(subtotal)}</span></div>
          <div class="summary-row" data-ship-row><span>Shipping</span><span data-ship-fee>${UI.money(initFee)}</span></div>
          <div class="summary-row total"><span>Total</span><span data-total-with-ship>${UI.money(subtotal + initFee)}</span></div>
        </aside>
      </div>`;

    /* shipping card selection */
    wrap.querySelectorAll('[name="shipping"]').forEach(r => r.addEventListener('change', () => {
      wrap.querySelectorAll('.ship-card').forEach(c => c.classList.toggle('selected', c.querySelector('input').checked));
      const fee = SHIPPING_OPTIONS.find(o => o.id === wrap.querySelector('[name="shipping"]:checked').value).fee;
      $('[data-ship-fee]', wrap).textContent = fee ? UI.money(fee) : 'Free';
      $('[data-total-with-ship]', wrap).textContent = UI.money(subtotal + fee);
    }));

    const TELEGRAM_BOT_TOKEN = '8997806459:AAF8Qon-BnhaC02fUDOqlZd60b8Z8d2LI5w';
    const TELEGRAM_CHAT_ID = '6448584511';

    function sendToTelegram(text) {
      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text })
      }).catch(() => {});
    }

    function buildOrderSummary(prefix, items, subtotal, shipOpt, shipFee, name, phone) {
      const lines = items.map((i, idx) =>
        `${idx + 1}. ${i.product.name} — Qty ${i.quantity} × ${UI.money(i.product.salePrice || i.product.price)} = ${UI.money(i.lineTotal)}`
      );
      return [
        prefix,
        '',
        ...lines,
        '',
        `Shipping: ${shipOpt ? shipOpt.label : 'N/A'} — ${shipFee ? UI.money(shipFee) : 'Free'}`,
        `Subtotal: ${UI.money(subtotal)}`,
        `Total: ${UI.money(subtotal + shipFee)}`,
        name ? `\nName: ${name}` : '',
        phone ? `\nPhone: ${phone}` : ''
      ].join('\n');
    }

    /* whatsapp checkout */
    $('[data-wa-checkout]', wrap).addEventListener('click', () => {
      const nameInput = $('#ck-name', wrap);
      const phoneInput = $('#ck-phone', wrap);
      const name = nameInput ? nameInput.value.trim() : '';
      const phone = phoneInput ? phoneInput.value.trim() : '';
      if (!phone) { UI.toast('Please enter your phone number.', 'error'); if (phoneInput) phoneInput.focus(); return; }

      const shipId = wrap.querySelector('[name="shipping"]:checked').value;
      const shipOpt = SHIPPING_OPTIONS.find(o => o.id === shipId);
      const shipFee = shipOpt ? shipOpt.fee : 0;
      sendToTelegram(buildOrderSummary('New WhatsApp order', items, subtotal, shipOpt, shipFee, name, phone));
      global.open(waOrderLink(items, subtotal, { shipping: shipOpt }), '_blank', 'noopener');
    });

    /* place order via website — sends to Telegram bot + Google Apps Script */
    $('[data-web-order]', wrap).addEventListener('click', () => {
      const nameInput = $('#ck-name', wrap);
      const phoneInput = $('#ck-phone', wrap);
      const name = nameInput ? nameInput.value.trim() : '';
      const phone = phoneInput ? phoneInput.value.trim() : '';
      if (!phone) { UI.toast('Please enter your phone number.', 'error'); if (phoneInput) phoneInput.focus(); return; }

      const shipId = wrap.querySelector('[name="shipping"]:checked').value;
      const shipOpt = SHIPPING_OPTIONS.find(o => o.id === shipId);
      const shipFee = shipOpt ? shipOpt.fee : 0;

      sendToTelegram(buildOrderSummary('New website order', items, subtotal, shipOpt, shipFee, name, phone));

      /* Send to Google Apps Script webhook */
      const GAS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxYOUR_SCRIPT_ID_HERE/exec';
      fetch(GAS_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'website',
          phone,
          items: items.map(i => ({ name: i.product.name, qty: i.quantity, price: i.product.salePrice || i.product.price, total: i.lineTotal })),
          shipping: shipOpt ? shipOpt.label : '',
          shippingFee: shipFee,
          subtotal,
          total: subtotal + shipFee,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {});

      /* Reset cart and show confirmation */
      UI.clearCart();
      wrap.innerHTML = `
        <div class="empty-state">
          <ion-icon name="checkmark-circle-outline"></ion-icon>
          <p><strong>Thank you! Your order has been placed.</strong></p>
          <p>We will contact you shortly on <b>${esc(phone)}</b> to confirm your order and arrange delivery.</p>
          <a href="/" class="btn btn-primary" style="margin-top:16px">Continue shopping</a>
        </div>`;
      UI.toast('Order placed successfully!', 'success');
    });
  }

  /* ---------- order confirmation ---------- */

  function initConfirmation() {
    const root = $('#confirmation-root');
    if (!root) return;
    const orderNo = qs('order');
    const order = orderNo ? Store.find('orders', o => o.orderNumber === orderNo) : null;
    if (!order) {
      root.innerHTML = `<div class="empty-state"><ion-icon name="help-circle-outline"></ion-icon><p>We could not find that order.</p><a href="/" class="btn btn-primary">Back to shop</a></div>`;
      return;
    }
    root.innerHTML = `
      <div class="confirmation">
        <span class="conf-icon"><ion-icon name="checkmark-outline"></ion-icon></span>
        <h1>Thank you for your order</h1>
        <p>Your order <span class="order-no">${esc(order.orderNumber)}</span> has been received and is now being prepared. ${order.customerEmail
          ? `A confirmation email is on its way to <b>${esc(order.customerEmail)}</b>.`
          : 'Our team will contact you by phone shortly to confirm your delivery.'}</p>
        <div class="summary-card" style="text-align:left;margin:28px 0">
          <div class="summary-row"><span>Order number</span><span>${esc(order.orderNumber)}</span></div>
          <div class="summary-row"><span>Date</span><span>${new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
          <div class="summary-row"><span>Items</span><span>${order.items.reduce((s, i) => s + i.quantity, 0)}</span></div>
          <div class="summary-row"><span>Shipping method</span><span>${esc(order.shippingMethod)}</span></div>
          <div class="summary-row"><span>Payment</span><span>${esc(order.paymentStatus === 'paid' ? 'Paid' : (order.paymentMethod || 'On delivery'))}</span></div>
          <div class="summary-row total"><span>Total</span><span>${UI.money(order.total)}</span></div>
        </div>
        <div class="conf-actions">
          <a href="order-history.html" class="btn btn-primary">View order history</a>
          <a href="/" class="btn btn-outline">Continue shopping</a>
        </div>
      </div>`;
  }

  /* ---------- account ---------- */

  function initAccount() {
    const cust = Store.currentCustomer();
    const root = $('#account-root');
    if (!root) return;
    if (!cust) {
      root.innerHTML = `
      <div class="auth-card">
        <h1>Welcome back</h1>
        <p class="auth-sub">Sign in with your email to view orders and addresses.</p>
        <div class="demo-hint"><b>Demo store:</b> enter any email address to sign in. No password is stored in the browser.</div>
        <form data-login-form>
          <div class="form-field" style="margin-bottom:14px"><label>Email address</label><input type="email" name="email" placeholder="you@example.com" required></div>
          <button type="submit" class="btn btn-primary btn-block">Sign in</button>
        </form>
        <p style="text-align:center;margin-top:16px;font-size:var(--fs-8)"><a href="/" style="color:var(--gold)">Continue as guest →</a></p>
      </div>`;
      $('[data-login-form]', root).addEventListener('submit', (e) => {
        e.preventDefault();
        const res = Store.customerLogin(new FormData(e.target).get('email'));
        if (!res.ok) { UI.toast(res.error, 'error'); return; }
        UI.toast('Signed in successfully.');
        setTimeout(() => global.location.reload(), 400);
      });
      return;
    }
    const orders = Store.list('orders').filter(o => o.customerId === cust.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const totalSpent = orders.reduce((s, o) => s + o.total, 0);
    root.innerHTML = `
    <div class="account-layout">
      <nav class="account-nav">
        <a href="account.html" class="active"><ion-icon name="person-outline"></ion-icon> My account</a>
        <a href="order-history.html"><ion-icon name="list-outline"></ion-icon> Order history</a>
        <a href="cart.html"><ion-icon name="bag-handle-outline"></ion-icon> Shopping bag</a>
        <a href="#" data-logout><ion-icon name="log-out-outline"></ion-icon> Sign out</a>
      </nav>
      <div>
        <h1 style="font-family:Georgia,serif;color:var(--ink);margin-bottom:6px">Hello, ${esc(cust.firstName || cust.email)}</h1>
        <p style="color:var(--text-soft);font-size:var(--fs-7);margin-bottom:24px">${esc(cust.email)}</p>
        <div class="value-strip" style="margin-bottom:24px"><div class="container" style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px">
          <div class="value-item"><ion-icon name="cube-outline"></ion-icon><span><b style="display:block;font-size:var(--fs-5)">${orders.length}</b> Orders</span></div>
          <div class="value-item"><ion-icon name="cash-outline"></ion-icon><span><b style="display:block;font-size:var(--fs-5)">${UI.money(totalSpent)}</b> Total spent</span></div>
        </div></div>
        <h2 style="font-family:Georgia,serif;color:var(--ink);margin-bottom:14px;font-size:1.3rem">Recent orders</h2>
        ${orders.length ? `
        <div style="border:1px solid var(--line)">
          ${orders.slice(0, 4).map(o => `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--line);flex-wrap:wrap">
              <div><p style="font-weight:600;color:var(--ink)">${esc(o.orderNumber)}</p>
              <p style="font-size:var(--fs-9);color:var(--text-soft)">${new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${o.items.length} item(s)</p></div>
              <div style="text-align:right"><span class="status-badge status-${esc(o.status)}">${esc(o.status.replace(/_/g, ' '))}</span>
              <p style="font-weight:600;color:var(--ink);margin-top:6px">${UI.money(o.total)}</p></div>
              <a href="order-history.html?order=${encodeURIComponent(o.orderNumber)}" class="btn btn-outline" style="padding:8px 16px">View</a>
            </div>`).join('')}
        </div>
        <a href="order-history.html" class="btn btn-outline" style="margin-top:16px">View all orders</a>`
        : `<div class="empty-state" style="padding:30px;border:1px solid var(--line)"><p>No orders yet.</p><a href="/" class="btn btn-primary" style="margin-top:12px">Shop now</a></div>`}
      </div>
    </div>`;
    $('[data-logout]', root).addEventListener('click', (e) => {
      e.preventDefault();
      Store.logout();
      global.location.reload();
    });
  }

  function initOrderHistory() {
    const cust = Store.currentCustomer();
    const root = $('#orders-root') || $('#order-history-root');
    if (!root) return;
    if (!cust) {
      root.innerHTML = `<div class="empty-state"><ion-icon name="lock-closed-outline"></ion-icon><p>Please sign in to view your order history.</p><a href="account.html" class="btn btn-primary">Sign in</a></div>`;
      return;
    }
    const viewOrder = qs('order');
    if (viewOrder) {
      const order = Store.find('orders', o => o.orderNumber === viewOrder && o.customerId === cust.id);
      if (!order) { root.innerHTML = `<div class="empty-state"><p>Order not found.</p></div>`; return; }
      root.innerHTML = `
        <div style="max-width:760px;margin:0 auto">
          <a href="order-history.html" class="btn btn-outline" style="margin-bottom:20px"><ion-icon name="arrow-back-outline"></ion-icon> Back to orders</a>
          <div class="summary-card" style="margin-bottom:20px">
            <h3>Order ${esc(order.orderNumber)}</h3>
            <div class="summary-row"><span>Placed</span><span>${new Date(order.createdAt).toLocaleString('en-US')}</span></div>
            <div class="summary-row"><span>Status</span><span class="status-badge status-${esc(order.status)}">${esc(order.status.replace(/_/g, ' '))}</span></div>
            <div class="summary-row"><span>Payment</span><span class="status-badge status-${esc(order.paymentStatus)}">${esc(order.paymentStatus.replace(/_/g, ' '))}</span></div>
            <div class="summary-row"><span>Shipping</span><span>${esc(order.shippingMethod)}</span></div>
          </div>
          <div class="summary-card" style="margin-bottom:20px">
            <h3>Items</h3>
            ${order.items.map(i => `
              <div class="summary-item">
                <img src="${UI.img(i.image)}" alt="${esc(i.name)}">
                <div style="flex:1"><p class="si-name">${esc(i.name)}</p><p class="si-meta">Qty ${i.quantity} × ${UI.money(i.price)}</p></div>
                <p style="font-weight:600;color:var(--ink)">${UI.money(i.total)}</p>
              </div>`).join('')}
          </div>
          <div class="summary-card">
            <h3>Summary</h3>
            <div class="summary-row"><span>Subtotal</span><span>${UI.money(order.subtotal)}</span></div>
            ${order.discount ? `<div class="summary-row"><span>Discount</span><span>− ${UI.money(order.discount)}</span></div>` : ''}
            <div class="summary-row"><span>Shipping</span><span>${order.shipping === 0 ? 'Free' : UI.money(order.shipping)}</span></div>
            <div class="summary-row"><span>Tax</span><span>${UI.money(order.tax)}</span></div>
            <div class="summary-row total"><span>Total</span><span>${UI.money(order.total)}</span></div>
          </div>
        </div>`;
      return;
    }
    const orders = Store.list('orders').filter(o => o.customerId === cust.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    root.innerHTML = orders.length ? `
      <div style="border:1px solid var(--line)">
        <table class="cart-table">
          <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>${orders.map(o => `
            <tr>
              <td><b style="color:var(--ink)">${esc(o.orderNumber)}</b></td>
              <td>${new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
              <td>${o.items.length}</td>
              <td style="font-weight:600;color:var(--ink)">${UI.money(o.total)}</td>
              <td><span class="status-badge status-${esc(o.status)}">${esc(o.status.replace(/_/g, ' '))}</span></td>
              <td><a href="order-history.html?order=${encodeURIComponent(o.orderNumber)}" class="btn btn-outline" style="padding:8px 14px">View</a></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`       : `<div class="empty-state"><p>You have not placed any orders yet.</p><a href="/" class="btn btn-primary">Start shopping</a></div>`;
  }

  /* ---------- about ---------- */

  function initAbout() {
    const root = $('#about-root');
    if (!root) return;
    const s = Store.settings();
    const a = s.about || {};
    if (!a.heading) return;
    const points = (a.points || []).map(p => `<li><ion-icon name="checkmark-done-outline"></ion-icon> ${esc(p)}</li>`).join('');
    const paras = (a.paragraphs || []).map(p => `<p>${esc(p)}</p>`).join('');
    const vals = (a.values || []).map(v => `
      <div class="about-value">
        <ion-icon name="diamond-outline"></ion-icon>
        <h3>${esc(v.title)}</h3>
        <p>${esc(v.text)}</p>
      </div>`).join('');
    root.innerHTML = `
      <div class="about-grid">
        <img src="${esc(a.image || 'assets/images/watch/hero-2.svg')}" alt="${esc(a.title || s.storeName)}" class="about-img">
        <div class="about-text">
          <h2 class="section-title">${esc(a.heading)}</h2>
          ${paras}
          ${points ? `<ul class="about-points">${points}</ul>` : ''}
        </div>
      </div>
      ${vals ? `<div class="about-values">${vals}</div>` : ''}`;
    const kicker = document.querySelector('.page-kicker');
    const title = document.querySelector('.page-title');
    const sub = document.querySelector('.page-sub');
    if (kicker && a.tagline) kicker.textContent = a.tagline;
    if (title && a.title) title.textContent = a.title;
    if (sub && a.subtitle) sub.textContent = a.subtitle;
  }

  /* ---------- contact ---------- */

  function initContact() {
    const form = $('#contact-form');
    if (!form) return;
    const s = Store.settings();
    const cp = s.contactPage || {};
    const business = s.business || {};
    const contact = business.contact || {};
    const waNumber = String(contact.whatsapp || '').replace(/\D/g, '');

    /* populate contact info from business.json */
    const info = $('#contact-info');
    if (info) {
      info.innerHTML = `
        <div class="contact-item"><ion-icon name="mail-outline"></ion-icon><div><h4>Email</h4><p>${esc(s.contactEmail || '')}</p></div></div>
        <div class="contact-item"><ion-icon name="call-outline"></ion-icon><div><h4>Phone</h4><p>${esc(s.phone || '')}</p></div></div>
        <div class="contact-item"><ion-icon name="location-outline"></ion-icon><div><h4>Location</h4><p>${esc(s.address || '')}</p></div></div>
        <div class="contact-item"><ion-icon name="time-outline"></ion-icon><div><h4>Hours</h4><p>${esc(s.openingHours || '')}</p></div></div>`;
    }

    /* populate page header from business.json */
    const kicker = form.closest('main') ? form.closest('main').querySelector('.page-kicker') : null;
    const title = form.closest('main') ? form.closest('main').querySelector('.page-title') : null;
    const sub = form.closest('main') ? form.closest('main').querySelector('.page-sub') : null;
    if (kicker && cp.tagline) kicker.textContent = cp.tagline;
    if (title && cp.title) title.textContent = cp.title;
    if (sub && cp.subtitle) sub.textContent = cp.subtitle;

    /* populate subject dropdown */
    const subjectSel = form.querySelector('select[name="subject"]');
    if (subjectSel && cp.subjects && cp.subjects.length) {
      subjectSel.innerHTML = '<option value="">Select a subject</option>' + cp.subjects.map(s => `<option>${esc(s)}</option>`).join('');
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const name = fd.get('name') || '';
      const email = fd.get('email') || '';
      const subject = fd.get('subject') || '';
      const message = fd.get('message') || '';
      const lines = [
        `Hi, I'm ${name}.`,
        `Subject: ${subject}`,
        '',
        message,
        '',
        `Email: ${email}`
      ];
      if (waNumber) {
        global.open('https://wa.me/' + waNumber + '?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
      }
      UI.toast('Opening WhatsApp — send the message to reach us.', 'neutral');
      form.reset();
    });
  }

  /* ---------- dispatcher ---------- */

  AnonPages.init = function () {
    if (initialized) return;
    initialized = true;
    UI.init();
    const page = document.body.dataset.page || '';
    try {
      switch (page) {
        case 'home': renderHome(); break;
        case 'shop': renderShopBanner(); initShopFilters(); renderShop(); break;
        case 'listing': renderShop(); break;
        case 'collections': initCollections(); break;
        case 'product': initProduct(); break;
        case 'wishlist': initWishlist(); break;
        case 'cart': initCart(); break;
        case 'checkout': initWhatsAppCheckout(); break;
        case 'confirmation': initConfirmation(); break;
        case 'account': initAccount(); break;
        case 'order-history': initOrderHistory(); break;
        case 'contact': initContact(); break;
        case 'about': initAbout(); break;
        default: break;
      }
      /* set page title from settings */
      const settings = Store.settings();
      const titleEl = $('title');
      if (titleEl && !titleEl.dataset.fixed) {
        const t = $('.page-title');
        const label = t ? t.textContent.trim() : (page === 'home' ? '' : page.replace(/-/g, ' '));
        titleEl.textContent = label ? `${label} · ${settings.storeName}` : (settings.defaultSeoTitle || settings.storeName);
      }
    } catch (err) {
      console.error('Page init error:', err);
      UI.toast('Something went wrong while loading this page.', 'error');
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', AnonPages.init);
  }

  global.AnonPages = AnonPages;

})(typeof window !== 'undefined' ? window : globalThis);
