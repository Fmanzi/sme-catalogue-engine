# sms-gate — Cloudflare Worker

Optional, deploy-time-only component. It lets a store publish with **no Node server**:

1. The admin panel posts the rebuilt catalog to the Worker.
2. The Worker commits the files to your GitHub repo (Git Data API).
3. Cloudflare Pages auto-rebuilds the static site from the pushed commit.

It also forwards new orders to a Telegram chat.

## When to use it

- **Development / demo:** skip this. Run `npm run api` (Node) — it does the same
  job locally, including the git push (`pushToGit`), using `GIT_PAT` in `api/.env`.
- **Production:** this Worker replaces the Node API. Point the admin panel's API
  base at the Worker URL and set an `x-api-token` per store.

## Deploy

1. `cd worker && npm i -g wrangler` (or use the Cloudflare dashboard "Workers").
2. `wrangler deploy`.
3. Set secrets (dashboard → Workers → sms-gate → Settings → Variables & Secrets):
   - `GITHUB_TOKEN` — fine-grained PAT with **Contents: Read + Write** on your repo.
   - `REPO_OWNER` / `REPO_NAME` — the repo that backs the store's Pages project.
   - `API_TOKEN` — shared secret; the admin panel must send `x-api-token: <token>`.
   - `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — for order forwarding (optional).

## Routes

| Method | Path | Body | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/publish` | `{ clientId, files: { "path": "content" } }` | Commit files as one commit → Pages rebuilds |
| `GET`  | `/api/publish/status?clientId=…` | — | Latest commit that touched a store |
| `POST` | `/api/orders` | order object | Forward order to Telegram |
| `POST` | `/api/order-notify` | order object | Same-origin order alert (see below) |

> **Order notification wiring (recommended).** The storefront checkout posts a new
> order to **`/api/order-notify`** (same-origin). The bot token is read **server-side**
> from env and is never shipped in the browser bundle. There are three implementations
> of this one endpoint — pick the one that matches your deployment:
> - **Cloudflare Pages Function** — `functions/api/order-notify.js` (free tier,
>   same-origin, runs automatically with the Pages deploy). **Preferred for production.**
> - **This Worker** — the `/api/order-notify` route above (if you route `/api/*` here).
> - **Local Node API** — `api/routes/order-notify.js` via `npm run api` (dev only).

## Points-payment gate (optional)

Only `OPTIONS`/`CORS` and the commit limits are free-tier relevant. Cloudflare's
free Workers plan (100k requests/day) comfortably covers SME traffic.

> **Note:** `worker/` is intentionally NOT wired into the local `npm run api`
> flow. It is a deployment artifact; changes here cannot be verified in the
> local harness and should be tested by posting directly to the deployed URL.