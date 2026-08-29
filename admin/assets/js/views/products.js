/* ------------------------------------------------------------------ *
 *  views/products.js — product list with search/filter/pagination,
 *  CSV export, plus create/edit form.
 * ------------------------------------------------------------------ */

'use strict';

(function (global) {

  const Store = global.AnonStore;
  const UI = global.AdminUI;
  const esc = UI.esc;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.from((r || document).querySelectorAll(s)); }

  const listState = { q: '', cat: '', status: '', page: 1 };

  function filtered() {
    let list = Store.products();
    const q = listState.q.toLowerCase();
    if (q) list = list.filter(p => (p.name + ' ' + p.sku + ' ' + ((p.brand || {}).name || '')).toLowerCase().includes(q));
    if (listState.cat) list = list.filter(p => p.categoryId === listState.cat);
    if (listState.status) list = list.filter(p => p.status === listState.status);
    return list;
  }

  AdminApp.register('products', function (root, ctx) {
    const cats = Store.list('categories');
    const perPage = 12;
    const all = filtered();
    const pages = Math.max(1, Math.ceil(all.length / perPage));
    const page = Math.min(listState.page, pages);
    const slice = all.slice((page - 1) * perPage, page * perPage);

    root.innerHTML = `
      <div class="toolbar">
        <input type="search" placeholder="Search by name, SKU or brand…" value="${esc(listState.q)}" data-prod-search>
        <select data-prod-cat>
          <option value="">All categories</option>
          ${cats.map(c => `<option value="${c.id}" ${listState.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select>
        <select data-prod-status>
          <option value="">All statuses</option>
          ${['active', 'draft', 'archived'].map(s => `<option value="${s}" ${listState.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}
        </select>
        <div class="spacer"></div>
        <button class="btn-admin btn-ghost" data-prod-import><ion-icon name="cloud-upload-outline"></ion-icon> Import CSV</button>
        <button class="btn-admin btn-ghost" data-prod-export><ion-icon name="download-outline"></ion-icon> Export CSV</button>
        <a href="#/products/new" class="btn-admin btn-primary"><ion-icon name="add-outline"></ion-icon> New product</a>
      </div>

      <div class="card">
        ${all.length ? `
        <div class="table-wrap">
          <table class="admin-table">
            <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Sold</th><th>Status</th><th></th></tr></thead>
            <tbody>${slice.map(p => `
              <tr>
                <td><div class="prod-cell"><img src="${UI.img(p.mainImage)}" alt=""><div><div class="pc-name">${esc(p.name)}</div><div class="pc-meta">${esc(p.sku)} · ${esc((p.brand || {}).name || '')}</div></div></div></td>
                <td>${esc((p.category || {}).name || '—')}</td>
                <td>${p.salePrice && p.salePrice < p.price ? `<div class="cell-strong">${UI.money(p.salePrice)}</div><div class="cell-sub"><del>${UI.money(p.price)}</del></div>` : UI.money(p.price)}</td>
                <td>${p.stockQuantity}</td>
                <td>${p.soldCount}</td>
                <td>${UI.badge(p.status)} ${UI.badge(p.stockStatus)}</td>
                <td><div class="row-actions">
                  <a href="#/products/${encodeURIComponent(p.id)}" class="btn-admin btn-ghost btn-sm">Edit</a>
                  <button class="btn-admin btn-ghost btn-sm" data-toggle-status="${p.id}" data-status="${p.status}">${p.status === 'active' ? 'Hide' : 'Show'}</button>
                  <button class="btn-admin btn-ghost btn-sm" data-dup="${p.id}">Duplicate</button>
                  <button class="btn-admin btn-danger btn-sm" data-del="${p.id}">Delete</button>
                </div></td>
              </tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="pagination" data-prod-pagination></div>`
        : UI.empty('watch-outline', 'No products match your filters.', `<a href="#/products/new" class="btn-admin btn-primary">Add a product</a>`)}
      </div>`;

    const search = $('[data-prod-search]', root);
    const catSel = $('[data-prod-cat]', root);
    const statusSel = $('[data-prod-status]', root);
    const apply = () => { listState.page = 1; ctx.refresh(); };
    if (search) search.addEventListener('input', () => { listState.q = search.value; listState.page = 1; clearTimeout(apply._t); apply._t = setTimeout(apply, 250); });
    if (catSel) catSel.addEventListener('change', () => { listState.cat = catSel.value; apply(); });
    if (statusSel) statusSel.addEventListener('change', () => { listState.status = statusSel.value; apply(); });
    UI.pagination($('[data-prod-pagination]', root), page, pages, p => { listState.page = p; ctx.refresh(); });

    $$('[data-del]', root).forEach(b => b.addEventListener('click', () => {
      UI.confirm('Delete this product permanently? This cannot be undone.', 'Delete product').then(ok => {
        if (!ok) return;
        Store.remove('products', b.dataset.del);
        UI.toast('Product deleted.');
        ctx.refresh();
      });
    }));

    $$('[data-toggle-status]', root).forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.toggleStatus;
      const current = b.dataset.status === 'active' ? 'active' : 'draft';
      const next = current === 'active' ? 'draft' : 'active';
      Store.update('products', id, { status: next });
      UI.toast(next === 'active' ? 'Product is now visible on the store.' : 'Product is now hidden from the store.');
      ctx.refresh();
    }));

    $$('[data-dup]', root).forEach(b => b.addEventListener('click', () => {
      const src = Store.get('products', b.dataset.dup);
      if (!src) return;
      const copy = {
        ...src,
        id: '',
        name: src.name + ' (Copy)',
        sku: src.sku + '-copy',
        status: 'draft',
        soldCount: 0,
        createdAt: new Date().toISOString()
      };
      const created = Store.create('products', copy);
      UI.toast('Product duplicated — edit the copy then publish.');
      global.location.hash = '#/products/' + encodeURIComponent(created.id);
    }));

    $('[data-prod-import]', root).addEventListener('click', () => renderImportWizard(root, ctx));
    $('[data-prod-export]', root).addEventListener('click', () => {
      UI.downloadCSV('meridian-products.csv', [['ID', 'Name', 'SKU', 'Reference', 'Brand', 'Category', 'Gender', 'Movement', 'Price', 'SalePrice', 'Stock', 'Sold', 'Status', 'Rating']]
        .concat(all.map(p => [p.id, p.name, p.sku, p.reference, (p.brand || {}).name || '', (p.category || {}).name || '', p.gender, p.movement, p.price, p.salePrice || '', p.stockQuantity, p.soldCount, p.status, p.rating])));
      UI.toast('CSV exported.');
    });
  });

  /* ---------------- product form ---------------- */

  function formHTML(p) {
    const brands = Store.list('brands');
    const cats = Store.list('categories');
    const colls = Store.list('collections');
    const flags = [
      ['featured', 'Featured'], ['newArrival', 'New arrival'], ['bestSeller', 'Best seller'], ['limited', 'Limited edition']
    ];
    const specs = [
      ['movementType', 'Movement type', p.movementType], ['caseSize', 'Case size', p.caseSize], ['caseMaterial', 'Case material', p.caseMaterial],
      ['crystal', 'Crystal', p.crystal], ['waterResistance', 'Water resistance', p.waterResistance], ['dialColor', 'Dial color', p.dialColor],
      ['strapColor', 'Strap color', p.strapColor], ['strapMaterial', 'Strap material', p.strapMaterial], ['powerReserve', 'Power reserve', p.powerReserve]
    ];
    const checked = (flag) => p[flag] ? 'checked' : '';
    return `
    <form data-prod-form>
      <div class="grid-3 mb-20">
        <div class="card">
          <div class="card-title">Basics</div>
          <div class="form-grid">
            <div class="field full"><label>Product name <span class="req">*</span></label><input type="text" name="name" value="${esc(p.name)}" required></div>
            <div class="field"><label>Brand</label><select name="brandId">
              <option value="">— None —</option>
              ${brands.map(b => `<option value="${b.id}" ${p.brandId === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}
            </select></div>
            <div class="field"><label>Category <span class="req">*</span></label><select name="categoryId" required>
              <option value="">— Select —</option>
              ${cats.map(c => `<option value="${c.id}" ${p.categoryId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
            </select></div>
            <div class="field"><label>Gender</label><select name="gender">
              ${['men', 'women', 'unisex'].map(g => `<option value="${g}" ${p.gender === g ? 'selected' : ''}>${g[0].toUpperCase() + g.slice(1)}</option>`).join('')}
            </select></div>
            <div class="field"><label>Movement</label><select name="movement">
              ${['automatic', 'mechanical', 'quartz', 'chronograph', 'solar'].map(m => `<option value="${m}" ${p.movement === m ? 'selected' : ''}>${m[0].toUpperCase() + m.slice(1)}</option>`).join('')}
            </select></div>
            <div class="field"><label>Collections</label>
              <select name="collectionIds" multiple size="4">
                ${colls.map(c => `<option value="${c.id}" ${p.collectionIds.includes(c.id) ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
              </select>
              <div class="hint">Hold Ctrl/Cmd to select multiple.</div>
            </div>
            <div class="field full"><label>Short description</label><textarea name="shortDescription" rows="3">${esc(p.shortDescription)}</textarea></div>
            <div class="field full"><label>Full description</label><textarea name="description" rows="5">${esc(p.description)}</textarea></div>
            <div class="field full"><label>Tags (comma separated)</label><input type="text" name="tags" value="${esc(p.tags.join(', '))}"></div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Pricing &amp; stock</div>
          <div class="form-grid">
            <div class="field"><label>Price <span class="req">*</span></label><input type="number" name="price" step="0.01" min="0" value="${p.price}" required></div>
            <div class="field"><label>Sale price</label><input type="number" name="salePrice" step="0.01" min="0" value="${p.salePrice || ''}"></div>
            <div class="field"><label>Cost</label><input type="number" name="cost" step="0.01" min="0" value="${p.costPrice || p.cost || ''}"></div>
            <div class="field"><label>Stock quantity</label><input type="number" name="stockQuantity" min="0" value="${p.stockQuantity}"></div>
            <div class="field"><label>Stock status</label><select name="availability">
              ${['in_stock', 'low_stock', 'out_of_stock', 'backorder'].map(a => `<option value="${a}" ${(p.availability || p.stockStatus) === a ? 'selected' : ''}>${a.replace(/_/g, ' ').replace(/^./, s => s.toUpperCase())}</option>`).join('')}
            </select></div>
            <div class="field"><label>Low stock threshold</label><input type="number" name="lowStockThreshold" min="0" value="${p.lowStockThreshold}"></div>
            <div class="field"><label>Warranty period</label><input type="text" name="warrantyPeriod" value="${esc(p.warrantyPeriod)}"></div>
          </div>
          <div class="field" style="margin-top:14px">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" name="allowBackorders" ${p.allowBackorders ? 'checked' : ''}> Allow backorders</label>
          </div>
          <div class="divider"></div>
          <div class="form-grid">
            <div class="field full"><label>SKU <span class="req">*</span></label><input type="text" name="sku" value="${esc(p.sku)}" required></div>
            <div class="field"><label>Reference</label><input type="text" name="reference" value="${esc(p.reference)}"></div>
            <div class="field"><label>Status</label><select name="status">
              ${['active', 'draft', 'archived'].map(s => `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}
            </select></div>
          </div>
          <div class="divider"></div>
          <label style="font-size:12.5px;color:var(--text-soft);display:block;margin-bottom:6px">Badges</label>
          <div class="chip-row">
            ${flags.map(f => `<label class="chip" style="cursor:pointer"><input type="checkbox" name="${f[0]}" ${checked(f[0])} style="accent-color:var(--gold)"> ${f[1]}</label>`).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-title">Specifications</div>
          <div class="form-grid">
            ${specs.map(s => `<div class="field"><label>${s[1]}</label><input type="text" name="${s[0]}" value="${esc(s[2])}"></div>`).join('')}
          </div>
          <div class="divider"></div>
          <div class="field full"><label>Images <span class="hint-inline">first photo is the main one</span></label>
            <div class="img-grid" data-img-grid></div>
            <label class="upload-zone">
              <ion-icon name="cloud-upload-outline"></ion-icon>
              <span>Add photos</span>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" multiple data-img-file class="upload-input">
            </label>
            <p class="hint" data-img-status>Upload from your phone or computer — images are auto-optimised (WebP/AVIF) and published to the store.</p>
          </div>
          <div class="field full"><label>…or paste image paths</label><input type="text" name="imageList" value="${esc(p.images.join(', '))}" placeholder="products/watch-01.svg, products/watch-01-b.svg">
            <div class="hint">Paths relative to assets/images, e.g. products/watch-07.svg</div></div>
          <div class="img-preview is-hidden" data-legacy-preview>${p.images.map(im => `<img src="${UI.img(im)}" alt="">`).join('')}</div>
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn-admin btn-primary">${p.id ? 'Save changes' : 'Create product'}</button>
        <a href="#/products" class="btn-admin btn-secondary">Cancel</a>
      </div>
    </form>`;
  }

  AdminApp.register('product-form', function (root, ctx) {
    const isNew = !ctx.params.id || ctx.params.id === 'new';
    const p = isNew ? {
      id: '', name: '', sku: '', reference: '', brandId: '', categoryId: '', gender: 'men', movement: 'automatic',
      movementType: '', caseSize: '', caseMaterial: '', crystal: '', waterResistance: '', dialColor: '',
      strapColor: '', strapMaterial: '', powerReserve: '', warrantyPeriod: '2 years',
      shortDescription: '', description: '', price: 0, salePrice: null, compareAtPrice: null, costPrice: 0,
      stockQuantity: 0, availability: 'in_stock', lowStockThreshold: 5, allowBackorders: false,
      tags: [], collectionIds: [], images: ['products/watch-01.svg'],
      status: 'draft', featured: false, newArrival: false, bestSeller: false, limited: false
    } : Store.get('products', ctx.params.id);

    if (!p) { root.innerHTML = UI.empty('alert-circle-outline', 'Product not found.', `<a href="#/products" class="btn-admin btn-secondary">Back to products</a>`); return; }

    root.innerHTML = `<div class="flex-between mb-12"><h2 style="font-family:var(--serif)">${isNew ? 'New product' : 'Edit product'}</h2><a href="#/products" class="btn-admin btn-ghost btn-sm"><ion-icon name="arrow-back-outline"></ion-icon> Back to products</a></div>${formHTML(p)}`;

    const form = $('[data-prod-form]', root);

    /* ---------- image upload + gallery manager ---------- */

    const imgInput = $('input[name="imageList"]', root);
    const grid = $('[data-img-grid]', root);
    const fileInput = $('[data-img-file]', root);
    const imgStatus = $('[data-img-status]', root);
    const apiUp = global.AnonAPI && global.AnonAPI.api && global.AnonAPI.api.base ? global.AnonAPI : null;

    let images = String((imgInput && imgInput.value) || '').split(',').filter(Boolean).map(s => s.trim());
    if (!images.length) images = ['products/watch-01.svg'];

    const previewSrc = (src) => /^(https?:|data:|blob:|\/)/.test(src) ? src : '/' + src.replace(/^\.?\//, '');

    function setImgStatus(text) {
      if (imgStatus) imgStatus.textContent = text;
    }

    function renderGrid() {
      if (!grid) return;
      grid.innerHTML = images.map((src, i) => `
        <div class="img-tile${i === 0 ? ' main' : ''}">
          <img src="${UI.esc(previewSrc(src))}" alt="" loading="lazy">
          ${i !== 0 ? `<button type="button" class="img-act" data-main="${i}" title="Make this the main photo"><ion-icon name="star-outline"></ion-icon></button>` : ''}
          <button type="button" class="img-act img-remove" data-rm="${i}" title="Remove photo"><ion-icon name="close-outline"></ion-icon></button>
          ${i === 0 ? '<span class="img-tag">Main</span>' : ''}
        </div>`).join('');
      if (imgInput) imgInput.value = images.join(', ');
      if (fileInput) {
        fileInput.disabled = !apiUp;
        const zone = fileInput.closest('.upload-zone');
        if (zone) zone.classList.toggle('online', !!apiUp);
      }
    }

    if (grid) grid.addEventListener('click', (e) => {
      const mainBtn = e.target.closest('[data-main]');
      const rmBtn = e.target.closest('[data-rm]');
      if (mainBtn) {
        const i = +mainBtn.dataset.main;
        images.unshift(images.splice(i, 1)[0]);
        renderGrid();
        UI.toast('Main photo updated.');
      }
      if (rmBtn) {
        images.splice(+rmBtn.dataset.rm, 1);
        if (!images.length) images = ['products/watch-01.svg'];
        renderGrid();
      }
    });

    if (fileInput) fileInput.addEventListener('change', async () => {
      const files = Array.from(fileInput.files || []);
      if (!files.length) return;
      if (!apiUp) {
        UI.toast('Photo upload needs the API running — start it with "npm run api", or paste image paths below.', 'error');
        return;
      }
      const pid = p.id || 'tmp';
      setImgStatus('Uploading ' + files.length + ' photo(s)…');
      fileInput.disabled = true;
      let ok = 0;
      for (const f of files) {
        try {
          const up = await apiUp.uploadImage(f, pid);
          if (up && up.src) { images.push(up.src); ok++; }
        } catch (err) {
          console.warn('[upload]', f.name, err);
          UI.toast('Upload failed for "' + f.name + '": ' + (err.message || 'unknown error'), 'error');
        }
      }
      fileInput.value = '';
      renderGrid();
      setImgStatus(ok ? (ok === 1 ? '1 photo added.' : ok + ' photos added.') : ok === 0 && files.length ? 'None uploaded — please retry.' : '');
      if (ok) setTimeout(() => setImgStatus(''), 4000);
      fileInput.disabled = false;
    });

    renderGrid();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const imageList = String(f.get('imageList') || '').split(',').map(s => s.trim()).filter(Boolean);
      const mainImage = imageList[0] || 'products/watch-01.svg';
      const data = {
        name: f.get('name'), sku: f.get('sku'), reference: f.get('reference'),
        brandId: f.get('brandId'), categoryId: f.get('categoryId'), gender: f.get('gender'), movement: f.get('movement'),
        movementType: f.get('movementType'), caseSize: f.get('caseSize'), caseMaterial: f.get('caseMaterial'),
        crystal: f.get('crystal'), waterResistance: f.get('waterResistance'), dialColor: f.get('dialColor'),
        strapColor: f.get('strapColor'), strapMaterial: f.get('strapMaterial'), powerReserve: f.get('powerReserve'),
        warrantyPeriod: f.get('warrantyPeriod'), shortDescription: f.get('shortDescription'), description: f.get('description'),
        price: Number(f.get('price') || 0),
        /* canonical fields — storefront reads compareAtPrice + availability */
        compareAtPrice: f.get('salePrice') ? Number(f.get('salePrice')) : null,
        costPrice: Number(f.get('cost') || 0),
        stockQuantity: Number(f.get('stockQuantity') || 0),
        lowStockThreshold: Number(f.get('lowStockThreshold') || 5), allowBackorders: !!f.get('allowBackorders'),
        availability: f.get('availability'),
        tags: String(f.get('tags') || '').split(',').map(s => s.trim()).filter(Boolean),
        collectionIds: form.querySelectorAll('select[name="collectionIds"] option:checked').length ? Array.from(form.querySelectorAll('select[name="collectionIds"] option:checked')).map(o => o.value) : ['col-classic'],
        images: imageList.length ? imageList : [mainImage], mainImage,
        status: f.get('status'),
        featured: !!f.get('featured'), newArrival: !!f.get('newArrival'), bestSeller: !!f.get('bestSeller'), limited: !!f.get('limited')
      };

      /* keep availability consistent with stockQuantity when not explicitly overridden */
      const q = data.stockQuantity;
      if (q === 0 && data.availability === 'in_stock') data.availability = 'out_of_stock';
      else if (q > 0 && data.availability === 'out_of_stock') data.availability = q <= data.lowStockThreshold ? 'low_stock' : 'in_stock';
      const newStock = q;
      data.stockStatus = newStock === 0 ? 'out_of_stock' : newStock <= data.lowStockThreshold ? 'low_stock' : 'in_stock';

      if (isNew) {
        const created = Store.create('products', data);
        Store.create('inventory', { productId: created.id, type: 'restock', quantity: data.stockQuantity, note: 'Initial stock', adminName: (Store.adminSession().user || {}).name || 'Admin' });
        UI.toast('Product created.');
      } else {
        Store.update('products', p.id, data);
        UI.toast('Product saved.');
      }
      global.location.hash = '#/products';
    });
  });

  /* ---------------- CSV import wizard ---------------- */

  const HEADER_ALIASES = {
    id: ['id'],
    slug: ['slug', 'url slug', 'handle', 'product url'],
    name: ['name', 'product', 'product name', 'title', 'item name'],
    sku: ['sku', 'code', 'product code', 'item code'],
    price: ['price', 'unit price', 'price kes', 'price ugx'],
    compareAtPrice: ['compareatprice', 'compare at price', 'sale price', 'old price', 'was price'],
    currency: ['currency'],
    category: ['category', 'category name', 'product type', 'department'],
    subcategory: ['subcategory', 'sub category', 'collection'],
    brand: ['brand', 'brand name', 'manufacturer'],
    shortDescription: ['shortdescription', 'short description', 'summary', 'excerpt'],
    description: ['description', 'long description', 'full description', 'details', 'product description'],
    availability: ['availability', 'stock status', 'stock', 'in stock'],
    status: ['status', 'state'],
    featured: ['featured', 'featured product', 'show on homepage'],
    newArrival: ['newarrival', 'new arrival'],
    bestSeller: ['bestseller', 'best seller'],
    tags: ['tags', 'tag'],
    attributes: ['attributes', 'specs', 'specifications', 'properties'],
    images: ['images', 'image', 'photo', 'photos', 'image urls', 'image urls pipe', 'gallery'],
    seoTitle: ['seotitle', 'seo title', 'meta title'],
    seoDescription: ['seodescription', 'seo description', 'meta description']
  };

  function parseCsv(text) {
    const rows = []; let row = []; let cell = ''; let quote = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i]; const next = text[i + 1];
      if (char === '"' && quote && next === '"') { cell += '"'; i++; }
      else if (char === '"') quote = !quote;
      else if (char === ',' && !quote) { row.push(cell); cell = ''; }
      else if ((char === '\n' || char === '\r') && !quote) {
        if (char === '\r' && next === '\n') i++;
        row.push(cell);
        if (row.some(Boolean)) rows.push(row);
        row = []; cell = '';
      }
      else cell += char;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    if (!rows.length) throw new Error('empty file');
    const [headers, ...values] = rows;
    return values.map(v => Object.fromEntries(headers.map((h, col) => [h.trim(), (v[col] || '').trim()])));
  }

  function normHeader(h) {
    return String(h || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/^\s+|\s+$/g, '');
  }

  function matchHeader(h) {
    const key = normHeader(h);
    if (!key) return null;
    for (const canon of Object.keys(HEADER_ALIASES)) {
      if (HEADER_ALIASES[canon].map(normHeader).includes(key)) return canon;
    }
    return null;
  }

  function renderImportWizard(root, ctx) {
    let parsed = { headers: [], rows: [] };
    root.innerHTML = `
      <div class="toolbar">
        <a href="#/products" class="btn-admin btn-ghost"><ion-icon name="arrow-back-outline"></ion-icon> Products</a>
        <div class="tb-hint">Import products from a CSV file.</div>
        <div class="spacer"></div>
      </div>
      <div class="card">
        <div class="card-title">Import products from CSV</div>
        <p class="hint-inline">Pick a CSV with a header row on line 1 — the one from <b>Export CSV</b> works perfectly. Headers are matched by name (name, sku, price, category, brand, description, images, tags…). Existing products are matched by SKU, id or slug.</p>
        <div class="form-grid">
          <div class="field full"><label>CSV file</label><input type="file" accept=".csv,text/csv,text/plain" data-import-file class="upload-input"></div>
          <div class="field"><label>Matching</label><select data-import-mode>
            <option value="create_or_update">Create new + update existing</option>
            <option value="create">Create new only (skip existing)</option>
            <option value="update">Update existing only (skip new)</option>
          </select></div>
        </div>
        <div data-import-preview></div>
        <div class="form-actions">
          <button class="btn-admin btn-primary" data-import-run disabled>Choose a file first</button>
        </div>
        <p class="form-error" data-import-error></p>
      </div>`;

    const file = $('[data-import-file]', root);
    const modeSel = $('[data-import-mode]', root);
    const preview = $('[data-import-preview]', root);
    const run = $('[data-import-run]', root);
    const errEl = $('[data-import-error]', root);

    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      if (!f) return;
      errEl.textContent = '';
      const reader = new FileReader();
      reader.onload = () => {
        try {
          parsed.rows = parseCsv(String(reader.result || ''));
          parsed.headers = (parsed.rows[0] ? Object.keys(parsed.rows[0]) : []).filter(matchHeader);
          drawPreview();
        } catch (e) {
          errEl.textContent = 'Could not read the CSV: ' + e.message;
        }
      };
      reader.readAsText(f);
    });

    function drawPreview() {
      const unmapped = Object.keys(parsed.rows[0] || {}).filter(h => !matchHeader(h));
      preview.innerHTML = `
        <div class="divider"></div>
        <p class="hint-inline"><b>${parsed.rows.length}</b> rows · ${parsed.headers.length} columns matched.
        ${unmapped.length ? `<span class="pub-error">Ignoring unrecognised columns: ${unmapped.map(esc).join(', ')}</span>` : ''}</p>
        ${parsed.rows.length ? `
        <div class="table-wrap">
          <table class="admin-table">
            <thead><tr>${parsed.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
            <tbody>${parsed.rows.slice(0, 8).map(r => `
              <tr>${parsed.headers.map(h => `<td>${esc(String(r[h] || '')).slice(0, 80)}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        </div>` : UI.empty('document-outline', 'No usable rows found.')}`;
      run.disabled = !parsed.rows.length;
      run.innerHTML = `<ion-icon name="cloud-upload-outline"></ion-icon> Import ${parsed.rows.length} products`;
    }

    run.addEventListener('click', async () => {
      const api = (global.AnonAPI && global.AnonAPI.api) ? global.AnonAPI.api : null;
      if (!api) { errEl.textContent = 'API not connected — start it with "npm run api".'; return; }
      const rows = parsed.rows.map(r => {
        const out = {};
        parsed.headers.forEach(h => { out[matchHeader(h)] = r[h]; });
        return out;
      });
      run.disabled = true;
      run.textContent = 'Importing…';
      errEl.textContent = '';
      try {
        const res = await api.request('POST', '/api/products/import', { rows, mode: modeSel.value });
        const errors = (res.errors || []);
        UI.toast(`Import complete: ${res.created} created, ${res.updated} updated, ${res.skipped} skipped.`);
        if (errors.length) {
          errEl.textContent = 'Skipped rows: ' + errors.slice(0, 8).map(e => `row ${e.row}: ${e.error}`).join(' · ') + (errors.length > 8 ? ' · …' : '');
        }
        global.location.hash = '#/products';
      } catch (e) {
        errEl.textContent = e.message;
        run.disabled = false;
        run.innerHTML = `<ion-icon name="cloud-upload-outline"></ion-icon> Import ${parsed.rows.length} products`;
      }
    });
  }

})(typeof window !== 'undefined' ? window : globalThis);
