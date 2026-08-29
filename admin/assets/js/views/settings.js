/* ------------------------------------------------------------------ *
 *  views/settings.js
 *  Store settings bound to the canonical business.json shape.
 *  Every section edits a real storefront feature (brand/colours,
 *  contact, commerce & shipping, payments, homepage & hero,
 *  navigation, filters, static pages, SEO/social) plus staff.
 * ------------------------------------------------------------------ */

'use strict';

(function (global) {

  const Store = global.AnonStore;
  const UI = global.AdminUI;
  const esc = UI.esc;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const ROLES = [
    { id: 'super_admin', label: 'Super Admin' },
    { id: 'store_manager', label: 'Store Manager' },
    { id: 'order_manager', label: 'Order Manager' },
    { id: 'catalog_manager', label: 'Catalog Manager' }
  ];

  AdminApp.register('settings', function (root, ctx) {
    const s = Store.settings();
    const b = s.business || {};
    const contact = b.contact || {};
    const commerce = b.commerce || {};
    const site = b.site || {};
    const canStaff = Store.hasPermission('*') || Store.hasPermission('settings');
    const admins = Store.list('adminUsers');

    const heroSlides = (s.hero && s.hero.slides) || [];
    const shopBanner = s.shopBanner || {};
    const home = s.home || {};
    const nav = s.nav || {};
    const shopFilters = s.shopFilters || {};
    const about = s.about || {};
    const contactPage = s.contactPage || {};
    const pay = s.paymentProviders || {};

    const row = (label, inner) => `<div class="field"><label>${label}</label>${inner}</div>`;
    const input = (name, value, type) => `<input type="${type || 'text'}" name="${name}" value="${esc(value == null ? '' : value)}">`;
    const textarea = (name, value, rows) => `<textarea name="${name}" rows="${rows || 3}">${esc(value || '')}</textarea>`;
    const sel = (name, opts, current) => `<select name="${name}">${opts.map(o => `<option value="${o}" ${current === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;

    const save = (patch) => {
      Store.updateSettings(patch);
      UI.toast('Saved. Storefront updates when the rebuild finishes.');
      setTimeout(() => {
        const api = global.AnonAPI;
        if (api && api.refresh) api.refresh('settings').then(() => ctx.refresh()).catch(() => ctx.refresh());
        else ctx.refresh();
      }, 250);
    };

    root.innerHTML = `
      <div class="grid-2 mb-20">
        <div class="card">
          <div class="card-title">Branding</div>
          <form data-branding>
            <div class="form-grid">
              ${row('Store name', input('storeName', s.storeName))}
              ${row('Short description', input('description', s.description))}
              ${row('Logo path', input('logo', s.logo))}
              ${row('Favicon path', input('favicon', s.favicon))}
            </div>
            <div class="form-actions"><button type="submit" class="btn-admin btn-primary">Save branding</button></div>
          </form>
        </div>

        <div class="card">
          <div class="card-title">Theme colours <small>primary, secondary and accent drive every store style</small></div>
          <form data-theme>
            <div class="theme-row" style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:14px">
              ${[['primary', 'Primary'], ['secondary', 'Secondary'], ['accent', 'Accent']].map(([k, label]) => `
                <label style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--text-soft)">
                  ${label}
                  <input type="color" name="${k}" value="${esc(s.brand[k] || '#b8874a')}" style="width:64px;height:40px;padding:0;border:1px solid var(--line);border-radius:6px;background:var(--ink)">
                </label>`).join('')}
              <div class="theme-preview" style="flex:1;min-width:120px;border-radius:8px;padding:14px;border:1px solid var(--line)">
                <div style="font-size:12.5px;color:var(--text-soft);margin-bottom:8px">Preview</div>
                <div style="display:flex;gap:8px;align-items:center">
                  <span class="preview-primary" style="width:42px;height:42px;border-radius:8px;background:${esc(s.brand.primary || '#b8874a')}"></span>
                  <span class="preview-secondary" style="width:42px;height:42px;border-radius:8px;background:${esc(s.brand.secondary || '#141519')}"></span>
                  <span class="preview-accent" style="width:42px;height:42px;border-radius:8px;background:${esc(s.brand.accent || '#b8874a')}"></span>
                </div>
                <p class="muted mt-8" style="font-size:11.5px">Primary = buttons/links, Secondary = header/footer, Accent = highlights</p>
              </div>
            </div>
            <div class="form-actions"><button type="submit" class="btn-admin btn-primary">Save colours</button></div>
          </form>
        </div>
      </div>

      <div class="grid-2 mb-20">
        <div class="card">
          <div class="card-title">Contact details</div>
          <form data-contact>
            <div class="form-grid">
              ${row('Contact email', input('email', s.contactEmail, 'email'))}
              ${row('Phone', input('phone', s.phone))}
              ${row('WhatsApp number <small>(international, e.g. 2547…)</small>', input('whatsapp', s.whatsapp))}
              ${row('Address', input('address', s.address))}
              ${row('Opening hours', input('openingHours', s.openingHours))}
              ${row('Google Maps URL', input('mapsUrl', s.mapsUrl))}
            </div>
            <div class="form-actions"><button type="submit" class="btn-admin btn-primary">Save contact</button></div>
          </form>
        </div>

        <div class="card">
          <div class="card-title">Commerce</div>
          <form data-commerce>
            <div class="form-grid">
              ${row('Currency code', input('currency', s.currency))}
              ${row('Currency symbol', input('currencySymbol', s.currencySymbol))}
              <div class="field"><label>Decimal format</label>${sel('decimalFormat', ['0', '2'], s.decimalFormat)}</div>
              ${row('Free shipping threshold (0 = never)', input('freeShippingThreshold', s.freeShippingThreshold, 'number'))}
              ${row('Delivery note <small>(shown in header bar)</small>', input('deliveryInfo', s.deliveryInfo))}
              ${row('Return policy', textarea('returnPolicy', s.returnPolicy, 2))}
            </div>
            <div class="form-actions"><button type="submit" class="btn-admin btn-primary">Save commerce</button></div>
          </form>
        </div>
      </div>

      <div class="grid-2 mb-20">
        <div class="card">
          <div class="card-title">Shipping methods</div>
          <form data-shipping>
            <div id="ship-list">
              ${s.shippingMethods.map((m, i) => `
                <div class="ship-row" style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
                  <input type="text" name="name" value="${esc(m.name)}" placeholder="Method name" style="flex:1;min-width:140px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:13px">
                  <input type="number" name="fee" value="${m.fee}" step="0.01" min="0" placeholder="Fee" style="width:90px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:13px">
                  <input type="text" name="deliveryDays" value="${esc(m.deliveryDays)}" placeholder="Delivery time" style="flex:1;min-width:120px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:13px">
                  <button type="button" class="btn-admin btn-danger btn-sm" data-remove-ship>Remove</button>
                </div>`).join('')}
            </div>
            <button type="button" class="btn-admin btn-ghost btn-sm mb-12" data-add-ship><ion-icon name="add-outline"></ion-icon> Add method</button>
            <div class="form-actions"><button type="submit" class="btn-admin btn-primary">Save shipping</button></div>
          </form>
        </div>

        <div class="card">
          <div class="card-title">Payments <small>pay on delivery — no prepayment</small></div>
          <form data-payments>
            ${['mpesa', 'cash', 'whatsapp'].map(key => {
              const p = pay[key] || {};
              const label = { mpesa: 'M-Pesa on delivery', cash: 'Cash on delivery', whatsapp: 'WhatsApp orders' }[key];
              return `
              <div class="ship-row" style="display:flex;gap:14px;align-items:center;padding:14px;border:1px solid var(--line);border-radius:8px;margin-bottom:12px;flex-wrap:wrap">
                <label style="display:flex;align-items:center;gap:8px;min-width:170px;cursor:pointer">
                  <input type="checkbox" name="enabled_${key}" ${p.enabled ? 'checked' : ''}> <b>${label}</b>
                </label>
                ${key === 'whatsapp' ? `<input type="text" name="number_${key}" value="${esc(p.number || '')}" placeholder="International number, e.g. 254728580415" style="flex:1;min-width:200px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:13px">` : ''}
                ${key === 'mpesa' ? `<input type="text" name="phone_${key}" value="${esc(p.phone || '')}" placeholder="M-Pesa number" style="flex:1;min-width:200px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:13px">` : ''}
              </div>`;
            }).join('')}
            <div class="form-actions"><button type="submit" class="btn-admin btn-primary">Save payment options</button></div>
          </form>
        </div>
      </div>

      <div class="card mb-20">
        <div class="card-title">Homepage &amp; hero</div>
        <form data-hero>
          <div class="card-title" style="font-size:13px">Hero slides</div>
          <div id="hero-list">
            ${heroSlides.length ? heroSlides.map((sl, i) => heroRow(sl, i)).join('') : `<div class="muted" style="font-size:12.5px;padding:10px 0">No slides yet — add one below.</div>`}
          </div>
          <button type="button" class="btn-admin btn-ghost btn-sm mb-12" data-add-hero><ion-icon name="add-outline"></ion-icon> Add slide</button>

          <div class="divider"></div>
          <div class="card-title" style="font-size:13px">Shop banner (under the hero)</div>
          <div class="form-grid">
            ${row('Kicker', input('bKicker', shopBanner.kicker))}
            ${row('Title', input('bTitle', shopBanner.title))}
            ${row('Text', textarea('bText', shopBanner.text, 2))}
            ${row('Button text', input('bButtonText', shopBanner.buttonText))}
            ${row('Button link', input('bLink', shopBanner.link))}
            ${row('Background image', input('bBg', shopBanner.bg))}
          </div>

          <div class="divider"></div>
          <div class="card-title" style="font-size:13px">Home section titles</div>
          <div class="form-grid">
            ${row('Men\'s kicker', input('gA_kicker', (home.genderA || {}).kicker))}
            ${row('Men\'s title', input('gA_title', (home.genderA || {}).title))}
            ${row('Women\'s kicker', input('gB_kicker', (home.genderB || {}).kicker))}
            ${row('Women\'s title', input('gB_title', (home.genderB || {}).title))}
            ${row('New arrivals kicker', input('na_kicker', (home.newArrivals || {}).kicker))}
            ${row('New arrivals title', input('na_title', (home.newArrivals || {}).title))}
            ${row('Featured kicker', input('fe_kicker', (home.featured || {}).kicker))}
            ${row('Featured title', input('fe_title', (home.featured || {}).title))}
          </div>
          <div class="form-actions"><button type="submit" class="btn-admin btn-primary">Save homepage</button></div>
        </form>
      </div>

      <div class="grid-2 mb-20">
        <div class="card">
          <div class="card-title">Navigation</div>
          <form data-nav>
            <div class="form-grid">
              ${row('Men\'s nav label', input('genderLabelA', nav.genderLabelA))}
              ${row('Women\'s nav label', input('genderLabelB', nav.genderLabelB))}
              ${row('Mobile men\'s label', input('mobileLabelA', nav.mobileLabelA))}
              ${row('Mobile women\'s label', input('mobileLabelB', nav.mobileLabelB))}
            </div>
            <div class="form-actions"><button type="submit" class="btn-admin btn-primary">Save navigation</button></div>
          </form>
        </div>

        <div class="card">
          <div class="card-title">Shop filters</div>
          <form data-filters>
            ${row('Filterable product attributes <small>(comma-separated)</small>', input('attributes', (shopFilters.attributes || []).join(', ')))}
            <p class="muted mt-8" style="font-size:12px">Each attribute listed here appears as a filter on the shop page, e.g. movement, caseMaterial.</p>
            <div class="form-actions"><button type="submit" class="btn-admin btn-primary">Save filters</button></div>
          </form>
        </div>
      </div>

      <div class="grid-2 mb-20">
        <div class="card">
          <div class="card-title">About page</div>
          <form data-about>
            <div class="form-grid">
              ${row('Tagline', input('aTagline', about.tagline))}
              ${row('Title', input('aTitle', about.title))}
              ${row('Subtitle', input('aSubtitle', about.subtitle))}
              ${row('Heading', input('aHeading', about.heading))}
              ${row('Paragraphs <small>(one per line)</small>', textarea('aParagraphs', (about.paragraphs || []).join('\n'), 4))}
              ${row('Points <small>(one per line)</small>', textarea('aPoints', (about.points || []).join('\n'), 4))}
              ${row('Values <small>(Title | text per line)</small>', textarea('aValues', (about.values || []).map(v => `${v.title} | ${v.text}`).join('\n'), 3))}
              ${row('Image path', input('aImage', about.image))}
            </div>
            <div class="form-actions"><button type="submit" class="btn-admin btn-primary">Save about</button></div>
          </form>
        </div>

        <div class="card">
          <div class="card-title">Contact page</div>
          <form data-contactpage>
            <div class="form-grid">
              ${row('Tagline', input('cTagline', contactPage.tagline))}
              ${row('Title', input('cTitle', contactPage.title))}
              ${row('Subtitle', textarea('cSubtitle', contactPage.subtitle, 2))}
              ${row('Enquiry subjects <small>(one per line)</small>', textarea('cSubjects', (contactPage.subjects || []).join('\n'), 4))}
            </div>
            <div class="form-actions"><button type="submit" class="btn-admin btn-primary">Save contact page</button></div>
          </form>
        </div>
      </div>

      <div class="card mb-20">
        <div class="card-title">SEO &amp; social</div>
        <form data-seo>
          <div class="form-grid">
            ${row('Site domain <small>(no https://, used for canonical URLs + sitemap)</small>', input('domain', s.domain))}
            ${row('Default SEO title', input('defaultSeoTitle', s.defaultSeoTitle))}
            ${row('Default SEO description', textarea('defaultSeoDescription', s.defaultSeoDescription, 2))}
            ${row('Instagram URL', input('instagram', (s.social || {}).instagram))}
            ${row('Facebook URL', input('facebook', (s.social || {}).facebook))}
          </div>
          <div class="form-actions"><button type="submit" class="btn-admin btn-primary">Save SEO</button></div>
        </form>
      </div>

      ${canStaff ? `
      <div class="card">
        <div class="card-title">Staff &amp; roles</div>
        <div class="table-wrap">
          <table class="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>${admins.map(a => `
              <tr>
                <td><div class="prod-cell"><div class="avatar" style="width:32px;height:32px;font-size:11px">${UI.initials(a.name)}</div><div class="pc-name">${esc(a.name)}</div></div></td>
                <td>${esc(a.email)}</td>
                <td>${esc(((global.AnonModels.Roles[a.role] || {}).label) || a.role)}</td>
                <td>${UI.badge(a.status)}</td>
                <td><div class="row-actions">
                  <button class="btn-admin btn-ghost btn-sm" data-edit-admin="${a.id}">Edit</button>
                  ${a.status === 'active' ? `<button class="btn-admin btn-danger btn-sm" data-disable-admin="${a.id}">Disable</button>` : `<button class="btn-admin btn-secondary btn-sm" data-enable-admin="${a.id}">Enable</button>`}
                </div></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="mt-12"><button class="btn-admin btn-primary" data-new-admin><ion-icon name="add-outline"></ion-icon> Add staff member</button></div>
      </div>` : ''}
      `;

    function heroRow(sl, i) {
      return `
      <div class="ship-row hero-row" style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;padding:12px;border:1px solid var(--line);border-radius:8px">
        <input type="text" name="hBg" value="${esc(sl.bg || '')}" placeholder="Background image path" style="flex:1;min-width:180px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:12.5px">
        <input type="text" name="hKicker" value="${esc(sl.kicker || '')}" placeholder="Kicker" style="flex:1;min-width:120px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:12.5px">
        <input type="text" name="hTitle" value="${esc(sl.title || '')}" placeholder="Title" style="flex:1;min-width:140px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:12.5px">
        <input type="text" name="hText" value="${esc(sl.text || '')}" placeholder="Text" style="flex:1;min-width:200px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:12.5px">
        <input type="text" name="hButton" value="${esc(sl.buttonText || '')}" placeholder="Button text" style="flex:1;min-width:110px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:12.5px">
        <button type="button" class="btn-admin btn-danger btn-sm" data-remove-hero>Remove</button>
      </div>`;
    }

    const heroPills = root.querySelector('#hero-list');
    root.querySelector('[data-add-hero]').addEventListener('click', () => {
      heroPills.insertAdjacentHTML('beforeend', heroRow({}, -1));
    });

    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-remove-hero]');
      if (b) b.closest('.hero-row').remove();
      const s2 = e.target.closest('[data-remove-ship]');
      if (s2) s2.closest('.ship-row').remove();
    });

    const themeSwatches = { primary: null, secondary: null, accent: null };
    const previewEls = {
      primary: root.querySelector('.preview-primary'),
      secondary: root.querySelector('.preview-secondary'),
      accent: root.querySelector('.preview-accent')
    };
    ['primary', 'secondary', 'accent'].forEach(key => {
      const inp = root.querySelector(`[data-theme] input[name="${key}"]`);
      themeSwatches[key] = inp;
      if (inp && previewEls[key]) inp.addEventListener('input', () => { previewEls[key].style.background = inp.value; });
    });

    /* branding */
    root.querySelector('[data-branding]').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      save({ name: f.get('storeName'), description: f.get('description'), logo: f.get('logo'), favicon: f.get('favicon') });
    });

    /* theme */
    root.querySelector('[data-theme]').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      save({ brand: { primary: f.get('primary'), secondary: f.get('secondary'), accent: f.get('accent') || f.get('primary') } });
    });

    /* contact */
    root.querySelector('[data-contact]').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      save({ contact: {
        ...contact,
        email: f.get('email'), phone: f.get('phone'), whatsapp: f.get('whatsapp'),
        address: f.get('address'), openingHours: f.get('openingHours'), mapsUrl: f.get('mapsUrl')
      } });
    });

    /* commerce */
    root.querySelector('[data-commerce]').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      save({ commerce: {
        ...commerce,
        currency: f.get('currency'), currencySymbol: f.get('currencySymbol'),
        decimalFormat: f.get('decimalFormat'), deliveryInfo: f.get('deliveryInfo'),
        returnPolicy: f.get('returnPolicy'), freeShippingThreshold: Number(f.get('freeShippingThreshold') || 0)
      } });
    });

    /* shipping */
    const shipList = root.querySelector('#ship-list');
    root.querySelector('[data-add-ship]').addEventListener('click', () => {
      shipList.insertAdjacentHTML('beforeend', `
        <div class="ship-row" style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
          <input type="text" name="name" placeholder="Method name" style="flex:1;min-width:140px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:13px">
          <input type="number" name="fee" value="0" step="0.01" min="0" placeholder="Fee" style="width:90px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:13px">
          <input type="text" name="deliveryDays" placeholder="Delivery time" style="flex:1;min-width:120px;background:var(--ink);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-size:13px">
          <button type="button" class="btn-admin btn-danger btn-sm" data-remove-ship>Remove</button>
        </div>`);
    });
    root.querySelector('[data-shipping]').addEventListener('submit', (e) => {
      e.preventDefault();
      const methods = Array.from(shipList.querySelectorAll('.ship-row')).map((r, i) => {
        const name = r.querySelector('[name=name]').value || 'Shipping method';
        return {
          id: r.dataset.shipId || 'ship-' + (i + 1),
          name, label: name, fee: Number(r.querySelector('[name=fee]').value || 0),
          deliveryDays: r.querySelector('[name=deliveryDays]').value || '5–7 business days'
        };
      });
      save({ commerce: { ...commerce, shippingMethods: methods } });
    });

    /* payments */
    root.querySelector('[data-payments]').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const providers = {};
      ['mpesa', 'cash', 'whatsapp'].forEach(key => {
        const prev = pay[key] || {};
        providers[key] = { ...prev, enabled: !!f.get('enabled_' + key) };
        if (key === 'mpesa') providers[key].phone = f.get('phone_mpesa');
        if (key === 'whatsapp') providers[key].number = f.get('number_whatsapp');
        providers[key].connected = providers[key].enabled;
      });
      save({ commerce: { ...commerce, paymentProviders: providers } });
    });

    /* hero + banner + home titles */
    root.querySelector('[data-hero]').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const slides = Array.from(heroPills.querySelectorAll('.hero-row')).map(r => ({
        bg: r.querySelector('[name=hBg]').value,
        kicker: r.querySelector('[name=hKicker]').value,
        title: r.querySelector('[name=hTitle]').value,
        text: r.querySelector('[name=hText]').value,
        buttonText: r.querySelector('[name=hButton]').value
      })).filter(sl => sl.title || sl.kicker || sl.bg);
      save({
        hero: { slides },
        shopBanner: {
          ...shopBanner, kicker: f.get('bKicker'), title: f.get('bTitle'), text: f.get('bText'),
          buttonText: f.get('bButtonText'), link: f.get('bLink'), bg: f.get('bBg')
        },
        home: {
          genderA: { kicker: f.get('gA_kicker'), title: f.get('gA_title') },
          genderB: { kicker: f.get('gB_kicker'), title: f.get('gB_title') },
          newArrivals: { kicker: f.get('na_kicker'), title: f.get('na_title') },
          featured: { kicker: f.get('fe_kicker'), title: f.get('fe_title') }
        }
      });
    });

    /* nav */
    root.querySelector('[data-nav]').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      save({ nav: {
        genderLabelA: f.get('genderLabelA'), genderLabelB: f.get('genderLabelB'),
        mobileLabelA: f.get('mobileLabelA'), mobileLabelB: f.get('mobileLabelB')
      } });
    });

    /* filters */
    root.querySelector('[data-filters]').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      save({ shopFilters: { ...shopFilters, attributes: String(f.get('attributes') || '').split(',').map(x => x.trim()).filter(Boolean) } });
    });

    /* about */
    root.querySelector('[data-about]').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      save({ about: {
        tagline: f.get('aTagline'), title: f.get('aTitle'), subtitle: f.get('aSubtitle'), heading: f.get('aHeading'),
        paragraphs: String(f.get('aParagraphs') || '').split('\n').map(x => x.trim()).filter(Boolean),
        points: String(f.get('aPoints') || '').split('\n').map(x => x.trim()).filter(Boolean),
        values: String(f.get('aValues') || '').split('\n').map(x => x.trim()).filter(Boolean).map(l => {
          const sep = l.indexOf('|');
          return sep === -1 ? { title: l, text: '' } : { title: l.slice(0, sep).trim(), text: l.slice(sep + 1).trim() };
        }),
        image: f.get('aImage')
      } });
    });

    /* contact page */
    root.querySelector('[data-contactpage]').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      save({ contactPage: {
        tagline: f.get('cTagline'), title: f.get('cTitle'), subtitle: f.get('cSubtitle'),
        subjects: String(f.get('cSubjects') || '').split('\n').map(x => x.trim()).filter(Boolean)
      } });
    });

    /* seo */
    root.querySelector('[data-seo]').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      save({ site: {
        ...site, domain: f.get('domain').replace(/^https?:\/\//, '').replace(/\/+$/, ''),
        defaultSeoTitle: f.get('defaultSeoTitle'), defaultSeoDescription: f.get('defaultSeoDescription'),
        social: { instagram: f.get('instagram'), facebook: f.get('facebook') }
      } });
    });

    /* staff */
    if (canStaff) {
      const openStaffForm = (admin) => {
        const { el, close } = UI.openModal(`
          <h3 class="admin-modal-title">${admin ? 'Edit staff member' : 'Add staff member'}</h3>
          <form data-admin-form>
            <div class="field"><label>Name <span class="req">*</span></label><input type="text" name="name" value="${admin ? esc(admin.name) : ''}" required></div>
            <div class="field"><label>Email <span class="req">*</span></label><input type="email" name="email" value="${admin ? esc(admin.email) : ''}" required></div>
            ${!admin ? `<div class="field"><label>Password <span class="req">*</span></label><input type="text" name="password" value="admin123" required></div>` : ''}
            <div class="field"><label>Role</label><select name="role">
              ${ROLES.map(r => `<option value="${r.id}" ${admin && admin.role === r.id ? 'selected' : ''}>${r.label}</option>`).join('')}
            </select></div>
            <div class="field"><label>Status</label><select name="status">
              ${['active', 'disabled'].map(x => `<option value="${x}" ${admin && admin.status === x ? 'selected' : ''}>${x[0].toUpperCase() + x.slice(1)}</option>`).join('')}
            </select></div>
            <div class="admin-modal-actions">
              <button type="button" class="btn-admin btn-secondary" data-close-modal>Cancel</button>
              <button type="submit" class="btn-admin btn-primary">Save</button>
            </div>
          </form>`);
        $('[data-admin-form]', el).addEventListener('submit', (e) => {
          e.preventDefault();
          const f = new FormData(e.target);
          if (admin) {
            Store.update('adminUsers', admin.id, { name: f.get('name'), email: f.get('email'), role: f.get('role'), status: f.get('status') });
            UI.toast('Staff member updated.');
          } else {
            Store.create('adminUsers', { name: f.get('name'), email: f.get('email'), role: f.get('role'), status: f.get('status'), password: f.get('password'), avatar: '' });
            UI.toast('Staff member created.');
          }
          close(); setTimeout(() => { const api = global.AnonAPI; if (api && api.refresh) api.refresh('adminUsers').then(() => ctx.refresh()).catch(() => ctx.refresh()); else ctx.refresh(); }, 250);
        });
      };
      root.querySelector('[data-new-admin]').addEventListener('click', () => openStaffForm(null));
      $$('[data-edit-admin]', root).forEach(b => b.addEventListener('click', () => openStaffForm(Store.get('adminUsers', b.dataset.editAdmin))));
      $$('[data-disable-admin]', root).forEach(b => b.addEventListener('click', () => {
        Store.update('adminUsers', b.dataset.disableAdmin, { status: 'disabled' }); UI.toast('Account disabled.');
        setTimeout(() => { const api = global.AnonAPI; if (api && api.refresh) api.refresh('adminUsers').then(() => ctx.refresh()).catch(() => ctx.refresh()); else ctx.refresh(); }, 250);
      }));
      $$('[data-enable-admin]', root).forEach(b => b.addEventListener('click', () => {
        Store.update('adminUsers', b.dataset.enableAdmin, { status: 'active' }); UI.toast('Account enabled.');
        setTimeout(() => { const api = global.AnonAPI; if (api && api.refresh) api.refresh('adminUsers').then(() => ctx.refresh()).catch(() => ctx.refresh()); else ctx.refresh(); }, 250);
      }));
    }
  });

})(typeof window !== 'undefined' ? window : globalThis);