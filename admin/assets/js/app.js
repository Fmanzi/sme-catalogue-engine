/* ------------------------------------------------------------------ *
 *  app.js — admin SPA shell: auth guard, hash router, sidebar nav.
 *  Depends on: models.js, store.js, components.js
 * ------------------------------------------------------------------ */

'use strict';

(function (global) {

  const Store = global.AnonStore;
  const UI = global.AdminUI;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const AdminApp = {
    views: {},
    navGroups: [],
    routes: [],
    params: {},
    hash: '#/dashboard',
    content: null
  };

  /* ---------- views registry ---------- */

  AdminApp.register = (name, view) => { AdminApp.views[name] = view; };

  /* ---------- navigation ---------- */

  const NAV_GROUPS = [
    { label: 'Overview', items: [{ name: 'dashboard', label: 'Dashboard', icon: 'grid-outline', hash: '#/dashboard', perm: 'dashboard' }] },
    {
      label: 'Catalogue', items: [
        { name: 'products', label: 'Products', icon: 'watch-outline', hash: '#/products', perm: 'products' },
        { name: 'categories', label: 'Categories', icon: 'layers-outline', hash: '#/categories', perm: 'catalog' },
        { name: 'collections', label: 'Collections', icon: 'albums-outline', hash: '#/collections', perm: 'catalog' },
        { name: 'brands', label: 'Brands', icon: 'pricetags-outline', hash: '#/brands', perm: 'catalog' },
        { name: 'inventory', label: 'Inventory', icon: 'cube-outline', hash: '#/inventory', perm: 'inventory' }
      ]
    },
    {
      label: 'Sales', items: [
        { name: 'orders', label: 'Orders', icon: 'receipt-outline', hash: '#/orders', perm: 'orders' },
        { name: 'customers', label: 'Customers', icon: 'people-outline', hash: '#/customers', perm: 'customers' }
      ]
    },
    {
      label: 'Marketing', items: [
        { name: 'coupons', label: 'Coupons', icon: 'ticket-outline', hash: '#/coupons', perm: 'coupons' },
        { name: 'reviews', label: 'Reviews', icon: 'star-outline', hash: '#/reviews', perm: 'reviews' },
        { name: 'content', label: 'Content', icon: 'create-outline', hash: '#/content', perm: 'content' }
      ]
    },
    {
      label: 'Analytics', items: [
        { name: 'reports', label: 'Reports', icon: 'stats-chart-outline', hash: '#/reports', perm: 'reports' }
      ]
    },
    {
      label: 'System', items: [
        { name: 'settings', label: 'Settings', icon: 'settings-outline', hash: '#/settings', perm: 'settings' }
      ]
    }
  ];

  function can(perm) {
    return perm === 'dashboard' || Store.hasPermission(perm);
  }

  function renderNav() {
    const nav = $('#sidebar-nav');
    if (!nav) return;
    const perms = Store.permissions();
    const isSuper = perms.includes('*');
    const html = NAV_GROUPS.map(g => {
      const items = g.items.filter(i => isSuper || can(i.perm));
      if (!items.length) return '';
      return `<div class="nav-section-label">${g.label}</div>` + items.map(i => `
        <a href="${i.hash}" class="${AdminApp.hash === i.hash || AdminApp.hash.indexOf(i.hash + '/') === 0 ? 'active' : ''}">
          <ion-icon name="${i.icon}"></ion-icon>${i.label}</a>`).join('');
    }).join('');
    nav.innerHTML = html;
  }

  function renderUser() {
    const box = $('#sidebar-user');
    if (!box) return;
    const s = Store.adminSession();
    if (!s) return;
    const u = s.user;
    const role = (global.AnonModels.Roles[u.role] || {}).label || u.role;
    box.innerHTML = `<div class="avatar">${UI.initials(u.name)}</div>
      <div><div class="su-name">${UI.esc(u.name)}</div><div class="su-role">${UI.esc(role)}</div></div>`;
  }

  /* ---------- routes ---------- */

  function defineRoute(hashPattern, viewName, perm) {
    AdminApp.routes.push({ re: new RegExp('^' + hashPattern.replace(/:[^/]+/g, '([^/]+)') + '$'), viewName, perm, keys: (hashPattern.match(/:[^/]+/g) || []).map(k => k.slice(1)) });
  }

  defineRoute('#/dashboard', 'dashboard', 'dashboard');
  defineRoute('#/products', 'products', 'products');
  defineRoute('#/products/new', 'product-form', 'products');
  defineRoute('#/products/:id', 'product-form', 'products');
  defineRoute('#/categories', 'categories', 'catalog');
  defineRoute('#/collections', 'collections', 'catalog');
  defineRoute('#/brands', 'brands', 'catalog');
  defineRoute('#/inventory', 'inventory', 'inventory');
  defineRoute('#/orders', 'orders', 'orders');
  defineRoute('#/orders/:id', 'order-detail', 'orders');
  defineRoute('#/customers', 'customers', 'customers');
  defineRoute('#/customers/:id', 'customer-detail', 'customers');
  defineRoute('#/coupons', 'coupons', 'coupons');
  defineRoute('#/reviews', 'reviews', 'reviews');
  defineRoute('#/content', 'content', 'content');
  defineRoute('#/reports', 'reports', 'reports');
  defineRoute('#/settings', 'settings', 'settings');

  function matchRoute(hash) {
    for (const r of AdminApp.routes) {
      const m = hash.match(r.re);
      if (m) {
        const params = {};
        r.keys.forEach((k, i) => params[k] = decodeURIComponent(m[i + 1]));
        return { viewName: r.viewName, perm: r.perm, params };
      }
    }
    return null;
  }

  /* ---------- rendering ---------- */

  const TITLES = {
    dashboard: 'Dashboard', products: 'Products', 'product-form': 'Product',
    categories: 'Categories', collections: 'Collections', brands: 'Brands', inventory: 'Inventory',
    orders: 'Orders', 'order-detail': 'Order', customers: 'Customers', 'customer-detail': 'Customer',
    coupons: 'Coupons', reviews: 'Reviews', content: 'Content', reports: 'Reports', settings: 'Settings'
  };

  AdminApp.refresh = () => { render(true); };

  function render(fromRefresh) {
    const root = AdminApp.content;
    if (!root) return;
    const session = Store.adminSession();
    if (!session) { global.location.href = 'login.html'; return; }

    const hash = (global.location.hash || '#/dashboard').replace(/^#/, '#');
    AdminApp.hash = hash;

    const route = matchRoute(hash);
    if (!route) { root.innerHTML = UI.empty('alert-circle-outline', 'Page not found.'); return; }
    AdminApp.params = route.params;

    if (!can(route.perm)) {
      root.innerHTML = UI.empty('lock-closed-outline', 'You do not have permission to view this page.', `<a href="#/dashboard" class="btn-admin btn-secondary">Go to dashboard</a>`);
      return;
    }

    const view = AdminApp.views[route.viewName];
    const title = TITLES[route.viewName] || route.viewName;
    const titleEl = $('#page-title');
    if (titleEl) titleEl.textContent = title;
    document.title = `${title} · ${Store.settings().storeName} Admin`;

    renderNav();

    if (!view) { root.innerHTML = UI.empty('construct-outline', 'View not implemented yet.'); return; }

    if (!fromRefresh) root.innerHTML = '<div class="admin-loading">Loading…</div>';
    try {
      const done = view(root, {
        params: AdminApp.params,
        hash,
        viewName: route.viewName,
        refresh: AdminApp.refresh
      });
      if (done && typeof done.then === 'function') done.catch(err => {
        console.error('View error:', err);
        root.innerHTML = UI.empty('alert-circle-outline', 'An error occurred while rendering this view.');
      });
    } catch (err) {
      console.error('View error:', err);
      root.innerHTML = UI.empty('alert-circle-outline', 'An error occurred while rendering this view.');
    }
  }

  /* ---------- shell interactions ---------- */

  function bindShell() {
    const toggle = $('[data-sidebar-toggle]');
    const sidebar = $('[data-sidebar]');
    const overlay = $('[data-sidebar-close]');
    const closeSidebar = () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); };
    if (toggle) toggle.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('open'); });
    if (overlay) overlay.addEventListener('click', closeSidebar);

    const logout = $('[data-logout]');
    if (logout) logout.addEventListener('click', () => {
      Store.logout();
      global.location.href = 'login.html';
    });

    const reset = $('[data-reset-demo]');
    if (reset) reset.addEventListener('click', () => {
      UI.confirm('Restore all demo data? Your local changes to products, orders, settings and inventory will be overwritten.', 'Reset demo data').then(ok => {
        if (!ok) return;
        Store.reset();
        UI.toast('Demo data restored.');
        AdminApp.refresh();
      });
    });

    const demoClose = $('[data-demo-close]');
    const demoBanner = $('[data-demo-banner]');
    if (demoClose && demoBanner) demoClose.addEventListener('click', () => demoBanner.classList.add('hide'));

    renderUser();

    global.addEventListener('hashchange', () => render());
  }

  /* ---------- boot ---------- */

  function boot() {
    console.log('[App] boot() — adminSession:', !!Store.adminSession());
    if (!Store.adminSession()) { global.location.href = 'login.html'; return; }
    AdminApp.content = $('#app-content');
    bindShell();

    /* In API mode, preload data from the server before rendering */
    const useApiInit = (global.AnonAPI && global.AnonAPI.api && global.AnonAPI.api.base);
    console.log('[App] useApiInit:', !!useApiInit, 'api.base:', useApiInit ? global.AnonAPI.api.base : 'N/A');
    const apiReady = useApiInit
      ? global.AnonAPI.init()
      : Promise.resolve();

    apiReady.then(() => {
      console.log('[App] init complete, rendering...');
      render();
    }).catch(err => {
      console.error('[App] init failed:', err);
      render();
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', boot);
  }

  global.AdminApp = AdminApp;

})(typeof window !== 'undefined' ? window : globalThis);
