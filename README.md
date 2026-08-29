# SME Catalogue + WhatsApp Commerce Engine

A static, multi-tenant storefront engine for Kenyan SMEs. No backend, no database, no payment gateway. Clients sell via WhatsApp.

## Architecture

```
anon-website/
├── assets/
│   ├── css/                    # Storefront styles
│   ├── images/                 # SVG illustrations, logos, product placeholders
│   ├── js/
│   │   ├── script.js           # Bootloader
│   │   ├── store.js            # Data layer + Cart + Settings builder
│   │   ├── models.js           # Data model definitions
│   │   ├── pages.js            # Page renderers (hero, product, about, contact, etc.)
│   │   ├── ui.js               # UI utilities (toast, modals, empty states)
│   │   └── client-data.js      # GENERATED — do not edit
│   └── media/<client-id>/      # GENERATED — optimised product images
├── clients/
│   ├── <client-id>/
│   │   ├── business.json       # Brand, contact, commerce, hero, about, SEO
│   │   ├── catalogue.json      # Products, categories, brands (generated from CSV)
│   │   └── media/originals/    # Source product images (private)
│   ├── template/               # Starter config for new clients
│   └── schema/                 # JSON Schema files for validation
├── tools/
│   ├── import-catalogue.js     # CSV → catalogue.json
│   ├── validate-client.js      # Validate business.json + catalogue.json
│   ├── build-client-data.js    # Generate assets/js/client-data.js
│   ├── build-static-pages.js   # Generate product/<slug>/index.html per product
│   ├── build-seo.js            # Generate robots.txt + sitemap.xml
│   └── process-images.js       # Sharp-based image optimiser
├── product/                    # GENERATED — static product pages (gitignored)
├── index.html                  # Homepage
├── shop.html                   # Full catalogue with filters
├── product.html                # Product detail page (client-data driven)
├── cart.html                   # Shopping cart
├── checkout.html               # WhatsApp checkout
├── contact.html                # Contact form → WhatsApp
├── about.html                  # About page → business.json
├── _headers                    # Cloudflare Pages headers (blocks /admin/*)
├── _redirects                  # Cloudflare Pages redirects
└── 404.html                    # Custom 404 page
```

## Quick start — onboard a new client

See `onboarding_process.md` for the full step-by-step guide.

```bash
# 1. Copy template
cp -r clients/template clients/<client-id>

# 2. Fill in clients/<client-id>/business.json with client info

# 3. Import products from CSV
npm run import:catalogue -- <client-id> /path/to/products.csv

# 4. Validate
npm run validate -- <client-id>

# 5. Build everything
npm run build:data -- <client-id>
npm run build:pages -- <client-id>
npm run build:seo -- <client-id>
```

## All commands

| Command | Description |
|---------|-------------|
| `npm run validate -- <id>` | Validate business.json + catalogue.json |
| `npm run import:catalogue -- <id> file.csv` | Convert CSV spreadsheet to catalogue.json |
| `npm run images:process -- <id>` | Optimise source images to WebP/AVIF at 400/800/1400px |
| `npm run build:data -- <id>` | Generate assets/js/client-data.js |
| `npm run build:pages -- <id>` | Generate static product pages (one per product) |
| `npm run build:seo -- <id>` | Generate robots.txt + sitemap.xml |
| `npm run export:meridian` | Export meridian client data (legacy) |
| `npm run mock:catalogue -- <id> <n>` | Generate n mock products for testing |

Full rebuild (all steps):
```bash
npm run validate -- <id> && npm run build:data -- <id> && npm run build:pages -- <id> && npm run build:seo -- <id>
```

## GitHub & deployment

### Repository setup

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

**Suggested repo name:** `sme-catalogue-engine`

### Cloudflare Pages deployment

1. Go to Cloudflare Dashboard → Pages → Create a project
2. Connect your GitHub repo
3. Configure the build:
   - **Production branch:** `main`
   - **Build command:**
     ```
     npm run build:data -- <client-id> && npm run build:pages -- <client-id> && npm run build:seo -- <client-id>
     ```
   - **Build output directory:** `/` (root)
   - **Node.js version:** (set in environment if needed) `18` or higher

4. Deploy

The `product/` directory (300 static pages) is generated during the Cloudflare Pages build, not stored in git. This keeps the repo small.

### Per-client deployment workflow

Each client gets its own Cloudflare Pages project (or a subdirectory on a shared project). The build command references the client ID:

**For Meridian (first client):**
```
npm run build:data -- meridian && npm run build:pages -- meridian && npm run build:seo -- meridian
```

**For a new client (e.g. acme-electronics):**
```
npm run build:data -- acme-electronics && npm run build:pages -- acme-electronics && npm run build:seo -- acme-electronics
```

### Custom domains

Once a client has a domain:

1. Update `clients/<client-id>/business.json`:
   ```json
   "site": {
     "domain": "their-domain.co.ke"
   }
   ```
2. Rebuild SEO: `npm run build:seo -- <client-id>`
3. In Cloudflare Pages → their project → Custom domains → add the domain
4. Update DNS records as instructed by Cloudflare (automatic if domain is on Cloudflare)

### Gitignored files (not in repo)

- `node_modules/`
- `admin/` — local prototype, not for deployment
- `product/` — generated during build
- `assets/js/client-data.js` — generated during build
- `robots.txt`, `sitemap.xml` — generated during build
- `.env` / `.env.*` — secrets

## Client data structure

### business.json (what we collect from each client)

| Section | Fields |
|---------|--------|
| **Identity** | `storeName`, `description`, `logo`, `favicon` |
| **Contact** | `whatsapp`, `phone`, `email`, `address`, `openingHours` |
| **Commerce** | `currency`, `currencySymbol`, `deliveryInfo`, `returnPolicy` |
| **Branding** | `brand.primary`, `brand.secondary`, `brand.accent` |
| **SEO** | `site.domain`, `seo.defaultSeoTitle`, `seo.defaultSeoDescription` |
| **Social** | `social.instagram`, `social.facebook` |
| **Hero** | `hero.slides[]` — kicker, title, text, buttonText, bg |
| **About** | `about.tagline`, `about.title`, `about.paragraphs[]`, `about.points[]`, `about.values[]` |
| **Contact page** | `contactPage.tagline`, `contactPage.title`, `contactPage.subjects[]` |

### catalogue.csv (product spreadsheet)

Required columns: `id`, `name`, `price`, `category`, `shortDescription`, `images`

See `clients/template/catalogue.csv` for the full template with all supported columns.

## Checkout flow

Checkout is WhatsApp-only. The cart builds an order summary message and opens `wa.me/<number>` with the pre-filled text. No payment processing, no backend.

## Contact form

The contact form pre-fills a WhatsApp message with name, email, subject, and message, then opens `wa.me/<number>`.

## Notes

- The `clients/meridian/` directory contains the reference client (watch store) with 300 products
- Product pages are generated statically for SEO — one HTML file per product
- Hero images, about content, and contact info all come from `business.json`
- The admin panel (`admin/`) is blocked from deployment via `_headers` and gitignored
- `package-lock.json` is committed for reproducible installs
- Images use WebP/AVIF formats for performance; original JPGs stay in `clients/<id>/media/originals/`

## Multi-store & CSV import (admin)

- **Multi-store**: a platform super-admin can create stores from the admin panel
  (System → Stores). Each store gets its own `clients/<id>/` catalogue, business
  config, staff logins and publish pipeline. Owners default to `store_manager`
  (scoped to their own store); sign in at `/admin/login.html` and enter the store
  slug. Cross-store access is blocked server-side (`storeScope`).
- **CSV import**: Products → **Import CSV**. Pick a spreadsheet, columns are
  matched automatically by header name (name, sku, price, category, brand,
  description, images, tags…), then import in create / update / create-or-update
  modes. `POST /api/products/import`.
- **Auto-publish**: the API commits rebuilt catalogue + media to git on publish.
  Set `GIT_PAT` in `api/.env` (fine-grained PAT, Contents: Read+Write on this
  repo) so Cloudflare Pages auto-rebuilds the live site.
- **Cloudflare Worker gate** (`worker/`): optional production replacement for the
  Node API — commits saves to GitHub and forwards orders to Telegram with no server.
