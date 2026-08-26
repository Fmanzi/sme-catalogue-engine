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

    configure(baseUrl) {
      this.base = (baseUrl || '').replace(/\/+$/, '');
      const saved = sessionStorage.getItem('anon.api_token');
      if (saved) this.token = saved;
    },

    setToken(t) {
      this.token = t;
      if (t) sessionStorage.setItem('anon.api_token', t);
      else sessionStorage.removeItem('anon.api_token');
    },

    async request(method, path, body) {
      const opts = { method, headers: { 'Content-Type': 'application/json' } };
      if (this.token) opts.headers['Authorization'] = 'Bearer ' + this.token;
      if (body !== undefined) opts.body = JSON.stringify(body);
      const res = await fetch(this.base + path, opts);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request failed');
      return json;
    },

    endpoint(name) {
      const map = {
        products: '/api/products',
        categories: '/api/catalog/categories',
        brands: '/api/catalog/brands',
        collections: '/api/catalog/brands',
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
      try {
        const token = sessionStorage.getItem('anon.api_token');
        if (!token) return;  /* not logged in yet */
        API.token = token;

        const collections = ['categories', 'brands', 'products', 'settings'];
        const results = await Promise.all(
          collections.map(name => {
            const ep = API.endpoint(name);
            return ep ? API.request('GET', ep) : Promise.resolve([]);
          })
        );

        collections.forEach((name, i) => {
          const data = results[i];
          if (name === 'products' && data && data.products) {
            _cache[name] = data.products;
          } else {
            _cache[name] = data;
          }
        });

        _initialized.value = true;
      } catch (err) {
        console.warn('[API adapter] init failed:', err.message, '— falling back to localStorage');
      }
    },

    /* ---------- synchronous read (from cache) ---------- */

    list(name) {
      return Array.isArray(_cache[name]) ? _cache[name] : [];
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

    /* ---------- write-through (API + cache) ---------- */

    async create(name, obj) {
      const ep = API.endpoint(name);
      if (!ep) throw new Error(`No endpoint for ${name}`);
      const result = (name === 'settings')
        ? await API.request('PUT', ep, obj)
        : await API.request('POST', ep, obj);
      if (Array.isArray(_cache[name])) _cache[name].push(result);
      else _cache[name] = result;
      return result;
    },

    async update(name, id, patch) {
      const ep = API.endpoint(name);
      if (!ep) throw new Error(`No endpoint for ${name}`);
      const result = (name === 'settings')
        ? await API.request('PUT', ep, patch)
        : await API.request('PUT', `${ep}/${id}`, patch);
      if (Array.isArray(_cache[name])) {
        const idx = _cache[name].findIndex(x => x.id === id);
        if (idx !== -1) _cache[name][idx] = result;
      } else {
        _cache[name] = result;
      }
      return result;
    },

    async remove(name, id) {
      const ep = API.endpoint(name);
      if (!ep) throw new Error(`No endpoint for ${name}`);
      await API.request('DELETE', `${ep}/${id}`);
      if (Array.isArray(_cache[name])) {
        _cache[name] = _cache[name].filter(x => x.id !== id);
      }
      return { ok: true };
    },

    /* ---------- auth ---------- */

    async login(email, password, clientId) {
      return await API.request('POST', '/api/auth/login', { email, password, clientId });
    },

    async me() {
      return await API.request('GET', '/api/auth/me');
    },

    /* ---------- image upload ---------- */

    async uploadImage(file, productId, alt, isPrimary) {
      const form = new FormData();
      form.append('image', file);
      form.append('productId', productId || 'misc');
      if (alt) form.append('alt', alt);
      if (isPrimary) form.append('primary', 'true');
      const res = await fetch(API.base + '/api/upload/meridian', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + API.token },
        body: form
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      return json;
    },

    /* ---------- cache refresh ---------- */

    async refresh(name) {
      const ep = API.endpoint(name);
      if (!ep) return;
      const data = await API.request('GET', ep);
      _cache[name] = (name === 'products' && data && data.products) ? data.products : data;
    },

    api: API
  };

  global.AnonAPI = Adapter;

})(typeof window !== 'undefined' ? window : globalThis);
