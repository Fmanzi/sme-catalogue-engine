# Client Onboarding Process

Step-by-step guide for launching a new business on the SME Catalogue Engine.

---

## What We Need From Each Client

### 1. Business Identity
| Field | Example | Required |
|-------|---------|----------|
| Business name | `Acme Electronics` | Yes |
| Short description (1–2 sentences) | `Quality electronics delivered to your door in Nairobi.` | Yes |
| Logo file (SVG preferred, or PNG) | `logo.svg` | Yes |
| Favicon file (SVG preferred) | `favicon.svg` | Yes |

### 2. Contact Details
| Field | Example | Required |
|-------|---------|----------|
| WhatsApp number (digits only, with country code) | `254712345678` | Yes |
| Phone number (display format) | `0712 345 678` | Yes |
| Email address | `info@acme.co.ke` | Yes |
| Physical address | `Westlands, Nairobi` | Yes |
| Opening hours | `Mon–Sat, 9am–6pm` | No |
| Google Maps URL | `https://maps.google.com/...` | No |

### 3. Commerce Details
| Field | Example | Required |
|-------|---------|----------|
| Currency code | `KES` | Yes (default: KES) |
| Currency symbol | `KSh ` | Yes (default: KSh ) |
| Delivery information text | `Same-day delivery in Nairobi. Countrywide via courier.` | Yes |
| Return policy text | `7-day return policy. Contact us on WhatsApp.` | Yes |

### 4. Branding
| Field | Example | Required |
|-------|---------|----------|
| Primary color (hex) | `#1a73e8` | Yes |
| Secondary color (hex) | `#1a1a2e` | Yes |
| Accent color (hex) | `#e8a317` | Yes |

### 5. Website & SEO
| Field | Example | Required |
|-------|---------|----------|
| Domain name | `acme.co.ke` | No (set before launch) |
| SEO title | `Acme Electronics — Shop on WhatsApp` | Yes |
| SEO description | `Browse Acme's collection and order on WhatsApp.` | Yes |
| Instagram URL | `https://instagram.com/acme` | No |
| Facebook URL | `https://facebook.com/acme` | No |

### 6. Hero Slides (Homepage Banner)
Provide 1–3 slides. Each slide needs:
| Field | Example | Required |
|-------|---------|----------|
| Background image | Provided by us (SVG illustrations) | No (we default to generic) |
| Kicker text (small label above title) | `New Arrivals` | Yes |
| Title (large heading) | `Tech for Everyone` | Yes |
| Description text | `Latest phones, laptops and accessories.` | Yes |
| Button text | `Shop now` | Yes |

### 7. About Page
| Field | Example | Required |
|-------|---------|----------|
| Page tagline | `Our story` | Yes |
| Page title | `About Acme` | Yes |
| Page subtitle | `Nairobi's trusted electronics store since 2018.` | Yes |
| Section heading | `Built on trust` | Yes |
| Paragraphs (1–3) | `Acme started in a small shop in downtown Nairobi...` | Yes |
| Bullet points (3) | `Genuine products only`, `Free delivery over KSh 5,000`, `1-year warranty` | Yes |
| Values (3 items with title + text) | `Quality / We source directly from manufacturers.` | No |
| About page image | Client provides or we use a default | No |

### 8. Contact Page
| Field | Example | Required |
|-------|---------|----------|
| Page tagline | `Get in touch` | Yes |
| Page title | `Contact Us` | Yes |
| Page subtitle | `We reply within one business day.` | Yes |
| Subject options | `Order enquiry`, `Returns`, `Warranty`, `Other` | Yes |

### 9. Product Catalogue (CSV)
Provide a CSV spreadsheet with one row per product:

| Column | Description | Required | Example |
|--------|-------------|----------|---------|
| `id` | Unique product ID | Yes | `phone-001` |
| `slug` | URL-friendly identifier | Yes (or auto-generated) | `samsung-galaxy-s24` |
| `name` | Product name | Yes | `Samsung Galaxy S24` |
| `sku` | Stock keeping unit | No | `SAM-S24-128` |
| `price` | Price in KES (number) | Yes | `85000` |
| `compareAtPrice` | Original price if on sale | No | `95000` |
| `currency` | Currency code | No (default: KES) | `KES` |
| `category` | Product category | Yes | `Phones` |
| `subcategory` | Sub-category | No | `Android` |
| `brand` | Brand name | No | `Samsung` |
| `shortDescription` | 1-line description | Yes | `128GB, 6.2-inch display` |
| `description` | Full description | No | (detailed text) |
| `availability` | `in_stock`, `low_stock`, `out_of_stock` | No (default: in_stock) | `in_stock` |
| `featured` | `true` or `false` | No (default: false) | `true` |
| `tags` | Comma-separated tags | No | `phone, android, samsung` |
| `attributes` | Pipe-separated key=value pairs | No | `storage=128GB\|colour=Black\|screen=6.2 inch` |
| `images` | Pipe-separated image filenames | Yes | `galaxy-s24-main.jpg\|galaxy-s24-side.jpg` |
| `seoTitle` | SEO page title | No (uses product name) | `Samsung Galaxy S24 — Buy on WhatsApp` |
| `seoDescription` | SEO meta description | No (uses short description) | `Shop the Samsung Galaxy S24...` |

**Image notes:**
- Place product images in `clients/<id>/media/originals/`
- First image in the list is the primary/cover image
- Run `npm run images:process -- <id>` to generate optimised WebP/AVIF variants

---

## Onboarding Steps

### Step 1: Create the client folder

```bash
cp -r clients/template clients/<client-id>
```

The `<client-id>` must be lowercase with hyphens only (e.g. `acme-electronics`).

### Step 2: Fill in business.json

Edit `clients/<client-id>/business.json` with all the information from sections 1–8 above.

Key fields to get right:
- `contact.whatsapp` — digits only, with country code (e.g. `254712345678`)
- `brand.primary` — hex color for buttons, links, accents
- `hero.slides` — at least one slide for the homepage banner
- `about` — full content for the about page
- `contactPage` — subject options for the contact form

### Step 3: Prepare the product catalogue

Create a CSV file following the template at `clients/template/catalogue.csv`.

Required columns: `id`, `name`, `price`, `category`, `shortDescription`, `images`.

**Tips:**
- Keep `id` short and unique (e.g. `laptop-001`)
- `slug` is auto-generated from `name` if left blank
- Use `|` (pipe) as the separator inside `attributes` and `images` fields
- Wrap fields containing commas or pipes in double quotes

### Step 4: Import the catalogue

```bash
npm run import:catalogue -- <client-id> /path/to/products.csv
```

This generates `clients/<client-id>/catalogue.json` with categories and brands extracted automatically from the CSV.

### Step 5: Add product images

Place original images in:
```
clients/<client-id>/media/originals/
```

Then process them:
```bash
npm run images:process -- <client-id>
```

This creates optimised WebP and AVIF variants at multiple sizes (400px, 800px, 1400px) in `assets/media/<client-id>/products/`.

**If you don't have product images yet**, you can skip this step and use placeholder images. The system will fall back to the default watch SVGs until real images are provided.

### Step 6: Validate

```bash
npm run validate -- <client-id>
```

Fix any errors reported. Common issues:
- Duplicate product IDs or slugs
- Missing required fields (name, price, category, images)
- `categoryId` referencing a category that doesn't exist
- WhatsApp number not in digit-only format

### Step 7: Build all assets

```bash
npm run build:data -- <client-id>
npm run build:pages -- <client-id>
npm run build:seo -- <client-id>
```

This produces:
- `assets/js/client-data.js` — the data bundle the storefront loads
- `product/<slug>/index.html` — one static page per product (for SEO)
- `robots.txt` — crawl instructions
- `sitemap.xml` — (only when `site.domain` is set in business.json)

### Step 8: Set the domain

Once the client has a domain, update `clients/<client-id>/business.json`:

```json
"site": {
  "domain": "acme.co.ke",
  ...
}
```

Then rebuild SEO:
```bash
npm run build:seo -- <client-id>
```

### Step 9: Test locally

Open `index.html` in a browser (or use a local server). Check:
- [ ] Homepage hero slider works and shows correct text
- [ ] Products load and display correctly
- [ ] Filters (category, brand, price) work
- [ ] Product detail page shows correct info, images, price
- [ ] Add to cart works
- [ ] Cart shows correct items and totals
- [ ] WhatsApp checkout opens with correct order message
- [ ] Contact form opens WhatsApp with pre-filled message
- [ ] About page shows correct content
- [ ] Page titles show business name (not "MERIDIAN")
- [ ] Mobile responsive layout works

### Step 10: Deploy to Cloudflare Pages

1. Commit and push to GitHub:
   ```bash
   git add -A && git commit -m "feat: add <client-id> client"
   git push origin main
   ```
2. In Cloudflare Dashboard → Pages → Create a project → Connect the GitHub repo
3. Configure the build:
   - **Production branch:** `main`
   - **Build command:**
     ```
     npm run build:data -- <client-id> && npm run build:pages -- <client-id> && npm run build:seo -- <client-id>
     ```
   - **Build output directory:** `/` (root)
4. Deploy
5. Add custom domain in Cloudflare Pages → project → Custom domains

### Step 11: Set up custom domain

Once the client has a domain:

1. Update `clients/<client-id>/business.json`:
   ```json
   "site": {
     "domain": "their-domain.co.ke"
   }
   ```
2. Rebuild SEO: `npm run build:seo -- <client-id>`
3. Commit and push: `git add -A && git commit -m "feat: set domain for <client-id>" && git push`
4. In Cloudflare Pages → Custom domains → add the domain
5. Update DNS records as instructed by Cloudflare (automatic if domain is on Cloudflare)

---

## GitHub & Deployment Reference

### Repository setup (first time)

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

**Suggested repo name:** `sme-catalogue-engine`

### How deployment works

- The repo is deployed to **Cloudflare Pages** (free tier is fine)
- Each push to `main` triggers a new deployment
- The build command generates `client-data.js`, product pages, and SEO files
- The `product/` directory (300 static pages) is generated during build, not stored in git
- Each client gets its own Cloudflare Pages project (or a subdirectory on a shared project)

### Per-client build commands

| Client | Build command |
|--------|---------------|
| Meridian | `npm run build:data -- meridian && npm run build:pages -- meridian && npm run build:seo -- meridian` |
| Acme Electronics | `npm run build:data -- acme-electronics && npm run build:pages -- acme-electronics && npm run build:seo -- acme-electronics` |
| Any client | `npm run build:data -- <id> && npm run build:pages -- <id> && npm run build:seo -- <id>` |

### Gitignored files (not in repo, generated during build)

- `node_modules/`
- `admin/` — local prototype, not for deployment
- `product/` — static product pages
- `assets/js/client-data.js` — the data bundle
- `robots.txt`, `sitemap.xml` — SEO files
- `.env` / `.env.*` — secrets

---

## Quick Reference: All Commands

```bash
# Validate client data
npm run validate -- <client-id>

# Import products from CSV
npm run import:catalogue -- <client-id> /path/to/products.csv

# Process product images
npm run images:process -- <client-id>

# Build data bundle
npm run build:data -- <client-id>

# Build static product pages
npm run build:pages -- <client-id>

# Build SEO files (sitemap, robots.txt)
npm run build:seo -- <client-id>

# Full rebuild (all steps above)
npm run validate -- <client-id> && npm run build:data -- <client-id> && npm run build:pages -- <client-id> && npm run build:seo -- <client-id>
```

---

## File Structure Per Client

```
clients/
  <client-id>/
    business.json          # Brand, contact, commerce, hero, about, contact page config
    catalogue.json         # Generated from CSV — categories, brands, products
    media/
      originals/           # Source product images (before processing)
```

---

## Updating an Existing Client

1. Edit `clients/<client-id>/business.json` for brand/contact/content changes
2. Edit `clients/<client-id>/catalogue.json` for product changes (or re-import from CSV)
3. Run the full rebuild:
   ```bash
   npm run validate -- <client-id> && npm run build:data -- <client-id> && npm run build:pages -- <client-id> && npm run build:seo -- <client-id>
   ```
4. Commit and push to deploy
