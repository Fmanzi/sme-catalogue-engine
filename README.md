# SME Catalogue + WhatsApp Commerce Engine

This repository is a static, reusable catalogue for Kenyan SMEs. It has no production backend, database, customer accounts, payment gateway, or public product-management API.

## Architecture

- `assets/js/` is the reusable storefront core. `client-data.js` is generated and never manually edited.
- `clients/<client>/business.json` contains branding, contact, commerce, and SEO configuration.
- `clients/<client>/catalogue.json` is the portable catalogue schema consumed by the storefront.
- `clients/<client>/media/originals/` holds private source images; optimized public variants go to `assets/media/<client>/`.
- `admin/` is a retained **local prototype/reference only**. It must not be linked from the public site or deployed as a production administration system.

## Onboard a client

1. Copy `clients/template` to `clients/<client-id>` and complete `business.json`.
2. Fill a CSV using `clients/template/catalogue.csv`.
3. Put source photographs in `clients/<client-id>/media/originals/` using the names listed in the CSV.
4. Run `npm install`, then:

   ```sh
   npm run import:catalogue -- <client-id> path/to/catalogue.csv
   npm run validate -- <client-id>
   npm run images:process -- <client-id>
   npm run build:data -- <client-id>
   npm run build:pages -- <client-id>
   npm run build:seo -- <client-id>
   ```

The CSV importer is a content-source adapter, not a storefront dependency. A later Decap CMS or API can emit the same `catalogue.json` schema.

## Images

`npm run images:process` uses Sharp to create 400px, 800px, and 1400px WebP/AVIF variants plus `image-manifest.json`. Product components read only image URLs/variants from catalogue data, so changing from Pages assets to R2 only changes the generated image URLs/manifest—not components or catalogue logic.

Use descriptive source names such as `oak-dining-chair-main.jpg`. Supply meaningful product and image alt text in the source spreadsheet; the importer creates a useful fallback.

## Meridian reference client

The existing watch demo has been exported to `clients/meridian/catalogue.json`. Refresh its public bundle after data changes with:

```sh
npm run export:meridian
npm run validate -- meridian
npm run build:data -- meridian
npm run build:pages -- meridian
```

For storefront testing, create a deterministic 300-product mock catalogue that reuses the existing Meridian product imagery:

```sh
npm run mock:catalogue -- meridian 300
npm run validate -- meridian
npm run build:data -- meridian
npm run build:pages -- meridian
```

The mock generator retains the original products and marks generated records with `mockOf`, so it can be run again without multiplying prior mock products.

## Deploy

Deploy the repository root to Cloudflare Pages. Configure the client domain in `business.json`, run `build:seo`, and commit the generated static files. `_headers` sets conservative browser/security headers and long-lived caching for optimized media. Configure the client’s domain and DNS in Cloudflare; configure email separately through an email provider using MX/SPF/DKIM/DMARC records.
