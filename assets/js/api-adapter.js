/* ------------------------------------------------------------------ *
 *  api-adapter.js
 *  REST client with an in-memory cache so the rest of the application
 *  can keep using synchronous Store.list() / Store.get() calls.
 *
 *  Flow:
 *    1. On admin page load, Adapter.init() fetches all collections.
 *    2. Data is stored in memory (Adapter._cache).
 *    3. Store.list/get/find/filter/count read from the cache (sync).
 *    4. Store.create/update/remove write to the API AND update the cache.
 *    5. After each write, scheduleRebuild() is called on the server.
 * ------------------------------------------------------------------ */
'use strict';

(function (global) {

  const API = {
    base: '',
    token: null,
    _clientId: 'meridian',

    configure(baseUrl) {
      this.base = (baseUrl || '').replace(/\/+$/, '');
      const saved = sessionStorage.getItem('anon.api_token');
      if (saved) this.token = saved;
      this._clientId = sessionStorage.getItem('anon.api_client') || 'meridian';
    },

    setToken(t) {
      this.token = t;
      if (t) sessionStorage.setItem('anon.api_token', t);
      else sessionStorage.removeItem('anon.api_token');
    },

    setClient(cid) {
      this._clientId = cid || 'meridian';
      sessionStorage.setItem('anon.api_client', this._clientId);
    },

    currentClient() {
      return this._clientId;
    },

    withClient(path) {
      const sep = String(path).includes('?') ? '&' : '?';
      return path + sep + 'clientId=' + encodeURIComponent(this._clientId);
    },

    async request(method, path, body) {
      const opts = { method, headers: { 'Content-Type': 'application/json' } };
      if (this.token) opts.headers['Authorization'] = 'Bearer ' + this.token;
      if (body !== undefined) opts.body = JSON.stringify(body);
      const res = await fetch(this.base + this.withClient(path), opts);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(json.error || ('Request failed (' + res.status + ')'));
        err.status = res.status;
        throw err;
      }
      return json;
    },

    endpoint(name) {
      const map = {
        products: '/api/products',
        categories: '/api/catalog/categories',
        brands: '/api/catalog/brands',
        collections: '/api/catalog/collections',
        settings: '/api/settings',
        orders: '/api/orders',
        customers: '/api/customers',
        reviews: '/api/reviews',
        coupons: '/api/coupons',
        adminUsers: '/api/auth/users',
        inventory: '/api/inventory'
      };
      return map[name];
    }
  };

  /* ---------- in-memory cache ---------- */
  const _cache = {};
  const _initialized = { value: false };

  const Adapter = {

    cache: _cache,
    initialized: _initialized,

    /* called once on admin page load — fetches everything */
    async init() {
      if (_initialized.value) return;
      console.log('[API] init() starting...');
      try {
        const token = sessionStorage.getItem('anon.api_token');
        if (!token) {
          console.log('[API] No token — old session detected, clearing and redirecting to login');
          sessionStorage.removeItem('anon.api_token');
          /* clear stale localStorage session from pre-API era */
          try { localStorage.removeItem('anon.session.v1'); } catch(e) {}
          window.location.href = 'login.html';
          return;
        }
        API.token = token;
        console.log('[API] Token found, verifying...');

        /* verify token is still valid */
        await API.request('GET', '/api/auth/me');
        console.log('[API] Token valid, loading collections...');

        const collections = ['categories', 'brands', 'collections', 'products', 'settings', 'orders', 'customers', 'reviews', 'coupons', 'inventory', 'adminUsers'];
        const results = await Promise.all(
          collections.map(name => {
            const ep = API.endpoint(name);
            return ep ? API.request('GET', ep).catch(() => []) : Promise.resolve([]);
          })
        );

        collections.forEach((name, i) => {
          const data = results[i];
          const normalizeSettings = (global.AnonModels && global.AnonModels.normalizeSettings) || (x => x);
          const normalize = (global.AnonModels && global.AnonModels.normalizeProduct) || (x => x);
          const normalizeColl = (global.AnonModels && global.AnonModels.normalizeCollection) || (x => x);
          if (name === 'products') {
            /* normalise canonical catalogue records into the UI shape */
            const items = (data && data.products) ? data.products : (Array.isArray(data) ? data : []);
            _cache[name] = items.map(normalize);
          } else if (name === 'collections') {
            _cache[name] = (Array.isArray(data) ? data : []).map(normalizeColl);
          } else if (name === 'settings') {
            _cache[name] = normalizeSettings(data);
          } else {
            _cache[name] = data;
          }
        });

        /* hybrid collection membership: rules + manual override → product.collectionIds */
        const materialize = global.AnonModels && global.AnonModels.materializeCollections;
        if (materialize && Array.isArray(_cache.products)) {
          _cache.products = materialize(_cache.products, _cache.collections || []).products;
        }

        _initialized.value = true;
        console.log('[API] init() complete. Cache:', Object.keys(_cache).map(k => k + ':' + (Array.isArray(_cache[k]) ? _cache[k].length : typeof _cache[k])).join(', '));
      } catch (err) {
        console.error('[API] init() error:', err);
        if (err.status === 401) {
          sessionStorage.removeItem('anon.api_token');
          window.location.href = 'login.html';
          return;
        }
        console.warn('[API adapter] init failed:', err.message, '— falling back to empty state');
      }
    },

    /* ---------- synchronous read (from cache) ---------- */

    list(name) {
      const data = Array.isArray(_cache[name]) ? _cache[name] : [];
      console.log('[API]', 'list(' + name + ')', '→', data.length, 'items');
      return data;
    },

    get(name, id) {
      return this.list(name).find(x => x.id === id) || null;
    },

    find(name, fn) {
      return this.list(name).find(fn) || null;
    },

    filter(name, fn) {
      return this.list(name).filter(fn);
    },

    count(name) {
      return this.list(name).length;
    },

    /* ---------- write-through (API + cache, optimistic) ---------- */

    create(name, obj) {
      const ep = API.endpoint(name);
      if (!ep) throw new Error(`No endpoint for ${name}`);
      const item = { id: obj.id || 'id_' + Math.random().toString(36).slice(2, 10), createdAt: new Date().toISOString(), ...obj };
      if (Array.isArray(_cache[name])) _cache[name].push(item);
      else _cache[name] = item;
      /* fire API in background */
      const url = (name === 'settings') ? ep : ep;
      const method = (name === 'settings') ? 'PUT' : 'POST';
      API.request(method, url, obj).then(serverItem => {
        if (Array.isArray(_cache[name])) {
          const idx = _cache[name].findIndex(x => x.id === item.id);
          if (idx !== -1) _cache[name][idx] = serverItem;
        }
      }).catch(err => console.warn('[API] create failed:', err.message));
      return item;
    },

    update(name, id, patch) {
      const ep = API.endpoint(name);
      if (!ep) throw new Error(`No endpoint for ${name}`);
      let updated;
      if (Array.isArray(_cache[name])) {
        const idx = _cache[name].findIndex(x => x.id === id);
        if (idx !== -1) {
          _cache[name][idx] = { ..._cache[name][idx], ...patch, updatedAt: new Date().toISOString() };
          updated = _cache[name][idx];
        }
      } else if (name === 'settings') {
        _cache[name] = { ...(_cache[name] || {}), ...patch };
        updated = _cache[name];
      }
      /* fire API in background */
      const url = (name === 'settings') ? ep : `${ep}/${id}`;
      API.request('PUT', url, patch).catch(err => console.warn('[API] update failed:', err.message));
      return updated || patch;
    },

    remove(name, id) {
      const ep = API.endpoint(name);
      if (!ep) throw new Error(`No endpoint for ${name}`);
      if (Array.isArray(_cache[name])) {
        _cache[name] = _cache[name].filter(x => x.id !== id);
      }
      /* fire API in background */
      API.request('DELETE', `${ep}/${id}`).catch(err => console.warn('[API] remove failed:', err.message));
      return { ok: true };
    },

    /* ---------- auth ---------- */

    async login(email, password, clientId) {
      const result = await API.request('POST', '/api/auth/login', { email, password, clientId });
      if (clientId) API.setClient(clientId);
      return result;
    },

    async me() {
      return await API.request('GET', '/api/auth/me');
    },

    /* ---------- image upload ---------- */

    async uploadImage(file, productId, alt, isPrimary, clientId) {
      const cid = clientId || API.currentClient();
      const form = new FormData();
      form.append('image', file);
      form.append('productId', productId || 'misc');
      if (alt) form.append('alt', alt);
      if (isPrimary) form.append('primary', 'true');
      const res = await fetch(API.base + '/api/upload/' + cid, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + API.token },
        body: form
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      return json;
    },

    /* ---------- publish (repo -> live site) ---------- */

    async publishStatus() {
      return await API.request('GET', '/api/publish/status');
    },

    async publishNow() {
      return await API.request('POST', '/api/publish');
    },

    /* ---------- cache refresh ---------- */

    setToken(t) { API.setToken(t); },
    setClient(cid) { API.setClient(cid); },
    clientId() { return API.currentClient(); },

    async refresh(name) {
      const ep = API.endpoint(name);
      if (!ep) return;
      const data = await API.request('GET', ep);
      const normalizeSettings = (global.AnonModels && global.AnonModels.normalizeSettings) || (x => x);
      const normalize = (global.AnonModels && global.AnonModels.normalizeProduct) || (x => x);
      const normalizeColl = (global.AnonModels && global.AnonModels.normalizeCollection) || (x => x);
      if (name === 'products') {
        const items = (data && data.products) ? data.products : (Array.isArray(data) ? data : []);
        _cache[name] = items.map(normalize);
      } else if (name === 'collections') {
        _cache[name] = (Array.isArray(data) ? data : []).map(normalizeColl);
      } else if (name === 'settings') {
        _cache[name] = normalizeSettings(data);
      } else {
        _cache[name] = (name === 'products' && data && data.products) ? data.products : data;
      }
      if (name === 'products' || name === 'collections') {
        const materialize = global.AnonModels && global.AnonModels.materializeCollections;
        if (materialize && Array.isArray(_cache.products)) {
          _cache.products = materialize(_cache.products, _cache.collections || []).products;
        }
      }
    },

    api: API
  };

  global.AnonAPI = Adapter;

})(typeof window !== 'undefined' ? window : globalThis);
