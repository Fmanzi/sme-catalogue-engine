# Project Journey & Decision Log

A running log of what we did, the options we considered, and why we chose what we
chose — so we can look back and see how the SME Catalogue Engine grew.

> Add a dated entry at the top of the log whenever we make a significant change or
> decision. Each entry should note: what we did, the options considered, the decision,
> and anything left for later.

---

## 29 Aug 2026 — Merchant self-management, free publish pipeline, multi-store

The biggest working session so far. Turning the system from "a site we build for a
client" into "a platform store owners run themselves, at zero cost."

### The conversation that shaped this
- The user's top priority: **store owners must upload products (with photos), add /
  remove categories / collections / brands, and manage their store from the admin panel.**
- Hard constraint: **cost**. "This system is meant for small businesses in Nairobi, and
  cost is their number one decision driver." Only free options were on the table.
- Earlier order-intake options were revisited: **A) email attachment, B) WhatsApp
  message forwarding, C) Telegram-only mailbox.** Chosen: **C — Telegram-only mailbox**,
  **Pay on delivery only**, plus **Telegram alerts** to the admin. (Order-stream wiring
  is still pending; see "Open items".)

### Free architecture (the plan we're building towards)
- **GitHub repo = the database.** Free, private, version history doubles as backups.
- **Cloudflare Pages = free hosting** for both the storefront and the admin panel.
- **Cloudflare Worker = free API gate** that holds a single scoped GitHub token, commits
  admin saves to the repo, and lets Pages auto-rebuild. Can also forward orders to Telegram.
- **Local Node API (`npm run api`, port 3001) stays as the dev/demo harness** — the
  Worker is its production equivalent.
- Merchant flow: open `store.pages.dev/admin` → sign in → edit → "Save & Publish" →
  Pages rebuilds the live site in 1–2 minutes.

### What we built (all verified end-to-end)
1. **Publish loop** (`api/data.js`, `api/routes/publish.js`):
   `runRebuild` → build bundle → `pushToGit(clientId)` → Cloudflare deploy hook →
   status tracked as `idle|queued|building|pushing|deploying|live|error`.
   - Git push is env-gated: `REBUILD_PUSH=0` disables; uses `GIT_PAT`/`GH_TOKEN`,
     stages the store's files, commits via `GIT_USER`/`GIT_EMAIL`, pushes with an
     inline base64 auth header up to `GIT_BRANCH` (default `main`).
   - `GET /api/publish/status` + `POST /api/publish` behind auth; dashboard got a
     **Live site** card (status, last published, deploy-hook status, "Publish now").
2. **Product photo upload UX** (products view, api-adapter, admin CSS):
   drag/drop multi-file upload, thumbnail grid, set-main photo, remove, plus a
   "Duplicate product" button. Uploads go through `POST /api/upload/:clientId`
   which creates optimised WebP/AVIF variants.
3. **Multi-store + onboarding wizard**:
   - Files born: `api/routes/clients.js`, `admin/assets/js/views/stores.js`.
   - New **System → Stores** page (super-admin only) lists every store and has a
     **New store** wizard → creates `clients/<id>/` from the template with an empty
     catalogue + a scoped owner account.
   - JWTs now carry `clientId`; a `storeScope` middleware returns **403 for
     cross-store access**. New stores default the owner to **store_manager** (full
     tools for their own store, cannot see others). Platform super-admins can manage
     all stores.
   - Login page gained a **Store** field; the API adapter appends `?clientId=` to
     every request, so a signed-in store only ever edits itself.
4. **CSV import wizard** (Products → Import CSV, `POST /api/products/import`):
   upload a spreadsheet, columns auto-matched by header name, preview first 8 rows,
   then import in **create / update / create-or-update** modes. The server
   normalises each row, auto-creates categories/brands, builds canonical image
   records, dedupes by SKU/id/slug.
5. **Cloudflare Worker gate** (`worker/`): scaffold that commits files to GitHub via
   the Git Data API (Pages auto-rebuilds) and forwards orders to Telegram. Optional
   / deploy-time only — cannot be tested locally, documented in `worker/README.md`.

### Bugs found & fixed on the day
- `storeScope` crashed on GETs because `req.body` was `undefined` → optional-guard added.
- `createClient` hardcoded `role: 'super_admin'` regardless of input → fixed to honour
  the requested role (default `store_manager`).
- **Empty dashboard mystery:** a login token issued before the server's `JWT_SECRET`
  was reset made `/api/auth/me` fail with 401, but the old adapter only looked for the
  literal text `"401"` in the error message, so it swallowed the failure and rendered
  the dashboard from an **empty cache**. Fixed: `request()` now sets `err.status`, and
  init redirects to login on 401. Symptom was "I can't see the products in the dashboard"
  while the API clearly returned 147 products.

### Open items / future steps
- **`GIT_PAT` must be added to `api/.env`** for auto-publish to reach the live site
  (currently `pushSkipped: true`). Needs the user's GitHub fine-grained token
  (Contents: Read+Write on this repo).
- **Per-store live deployment:** each new store needs its own Cloudflare Pages project
  (or repo branch) to get its own domain. Considered a per-store deploy helper script.
- **Order stream (Option C / Telegram):** wire the pending `TODO` hooks in
  `assets/js/pages.js` so orders reach a Telegram mailbox — ideally through the Worker
  so the bot token never ships in browser bundles.

---

## 26 Aug 2026 — Real admin → REST API (multi-tenant parameterisation)

- Parameterised the engine for multi-tenant use: `clients/` directory per store,
  `clients/template/` as the starter (business.json + catalogue.csv), `business.json`
  + `catalogue.json` as the canonical data sources.
- Added the **REST API server** (`api/`, port 3001) and wired the admin panel to it:
  API-mode detection by URL path, product/catalog/settings/upload/orders/customers/
  reviews/coupons/inventory/auth routes, JWT login with role permissions
  (super_admin / store_manager / order_manager / catalog_manager), staff management.
- Fixed bugs: API-mode detection regex missed `admin/index.html`; stale-session
  redirect; admin data loading + missing routes.
- `_headers` blocks `/admin/*` and `/clients/*` from static hosts (admin is a private
  tool; client data must never go public). SEO cleanup + `.gitignore` pass.

## 24 Aug 2026 — Phase 1 production readiness

- Commit `d509608`: "Phase 1: Production readiness fixes." Baseline hardening before
  the API/admin work began.

## 20–21 Aug 2026 — Design & catalogue model

- 20 Aug: AVIF/WebP image optimisation, gallery overflow fix, removed "new" badge,
  replaced dummy products with supplier's real images, hero + checkout improvements,
  cart badge redesign, hover states, sticky footer.
- 21 Aug: gender classification (Men's / Women's), homepage "Men's Picks / Women's
  Picks", shop filter sidebar, desktop nav, mobile bottom nav, floating WhatsApp
  button, gold category accents.

## 18–19 Aug 2026 — Inception & first real data

- 18 Aug: project born as **SME catalogue engine — multi-tenant WhatsApp storefront**.
  Multi-store folder layout, comprehensive README with deployment guide, shop banner,
  cart/checkout redesign with prices, first GitHub + Cloudflare Pages onboarding guide.
- 19 Aug: **156 real watches from the supplier** replaced dummy products; checkout
  page redesign, hero carousel; **Telegram notifications for both WhatsApp and web
  orders** — the seed of the later order-intake discussion.

---

## Cheat sheet: how things work today

- **Run locally:** `npm run api` → API + storefront (`:3001/`) + admin (`:3001/admin/`).
- **Sign in (meridian demo):** Store `meridian`, `admin@meridianwatch.com` / `admin123`.
- **Publish:** Dashboard → "Publish now" → rebuild + (with `GIT_PAT`) git push +
  (with `CF_DEPLOY_HOOK`) Pages deploy.
- **New store:** System → Stores → New store. Owner defaults to store_manager (scoped).
- **Bulk products:** Products → Import CSV, or `clients/template/catalogue.csv` locally.
- **Credentials for live publishing:** `GIT_PAT` (and optionally `CF_DEPLOY_HOOK`) in
  `api/.env` — see `api/.env.example`.