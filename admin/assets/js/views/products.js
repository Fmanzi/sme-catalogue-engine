/* ------------------------------------------------------------------ *
 *  views/products.js — product list with search/filter/pagination,
 *  CSV export, plus create/edit form.
 * ------------------------------------------------------------------ */

'use strict';

(function (global) {

  const Store = global.AnonStore;
  const UI = global.AdminUI;
  const esc = UI.esc;

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
          <div class="field full"><label>Image files (comma separated)</label><input type="text" name="imageList" value="${esc(p.images.join(', '))}">
            <div class="hint">Paths relative to assets/images, e.g. products/watch-07.svg, products/watch-07-b.svg</div></div>
          <div class="img-preview">${p.images.map(im => `<img src="${UI.img(im)}" alt="">`).join('')}</div>
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
      shortDescription: '', description: '', price: 0, salePrice: null, costPrice: 0, stockQuantity: 0,
      lowStockThreshold: 5, allowBackorders: false, tags: [], collectionIds: [], images: ['products/watch-01.svg'],
      status: 'draft', featured: false, newArrival: false, bestSeller: false, limited: false
    } : Store.get('products', ctx.params.id);

    if (!p) { root.innerHTML = UI.empty('alert-circle-outline', 'Product not found.', `<a href="#/products" class="btn-admin btn-secondary">Back to products</a>`); return; }

    root.innerHTML = `<div class="flex-between mb-12"><h2 style="font-family:var(--serif)">${isNew ? 'New product' : 'Edit product'}</h2><a href="#/products" class="btn-admin btn-ghost btn-sm"><ion-icon name="arrow-back-outline"></ion-icon> Back to products</a></div>${formHTML(p)}`;

    const form = $('[data-prod-form]', root);
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
        price: Number(f.get('price') || 0), salePrice: f.get('salePrice') ? Number(f.get('salePrice')) : null,
        costPrice: Number(f.get('cost') || 0), stockQuantity: Number(f.get('stockQuantity') || 0),
        lowStockThreshold: Number(f.get('lowStockThreshold') || 5), allowBackorders: !!f.get('allowBackorders'),
        tags: String(f.get('tags') || '').split(',').map(s => s.trim()).filter(Boolean),
        collectionIds: form.querySelectorAll('select[name="collectionIds"] option:checked').length ? Array.from(form.querySelectorAll('select[name="collectionIds"] option:checked')).map(o => o.value) : ['col-classic'],
        images: imageList.length ? imageList : [mainImage], mainImage,
        status: f.get('status'),
        featured: !!f.get('featured'), newArrival: !!f.get('newArrival'), bestSeller: !!f.get('bestSeller'), limited: !!f.get('limited')
      };
      const newStock = data.stockQuantity;
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

})(typeof window !== 'undefined' ? window : globalThis);
