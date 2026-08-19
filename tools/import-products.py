#!/usr/bin/env python3
"""
Import extracted Telegram products into catalogue.json

Reads tools/extracted-products.json (produced by extract-telegram-products.py),
auto-assigns brands/categories, and merges into clients/meridian/catalogue.json.

Usage:
    python tools/import-products.py
    python tools/import-products.py --replace   # Replace catalogue entirely
    python tools/import-products.py --dry-run   # Preview without writing
"""

import json
import re
import sys
from pathlib import Path
from datetime import datetime

TOOLS_DIR = Path(__file__).parent
PROJECT_ROOT = TOOLS_DIR.parent
EXTRACTED_FILE = TOOLS_DIR / "extracted-products.json"
CATALOGUE_FILE = PROJECT_ROOT / "clients" / "meridian" / "catalogue.json"
SCHEMA_DIR = PROJECT_ROOT / "clients" / "schema"

# Categories to auto-assign based on product name/features
CATEGORY_KEYWORDS = {
    "cat-chronograph": ["chronograph", "chrono", "stopwatch"],
    "cat-dive": ["dive", "diver", "diving", "water resist"],
    "cat-sports": ["sport", "racing", "gents", "military", "army"],
    "cat-dress": ["dress", "formal", "elegant", "slim"],
    "cat-luxury": ["luxury", "premium", "gold", "diamond"],
    "cat-automatic": ["automatic", "self-winding", "auto"],
    "cat-mechanical": ["mechanical", "hand-wound", "hand wound"],
    "cat-quartz": ["quartz", "battery"],
    "cat-classic": ["classic", "vintage", "retro"],
    "cat-smart": ["smart", "digital", "bluetooth"],
    "cat-pocket": ["pocket"],
}


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')


def _extract_brand_from_name(name: str) -> str:
    """Extract brand name from product name, handling multi-word brands."""
    # Known multi-word brands
    multi_word_brands = [
        'HANNAH MARTIN', 'DANIEL WELLINGTON', 'TOMMY HILFIGER',
        'MICHAEL KORS', 'TED BAKER', 'RAYMOND WEIL', 'EMPORIO ARMANI',
        'PATek PHILIPPE',
    ]

    # Descriptors that are NOT brands
    not_brands = {
        'ladies', 'gents', 'gent', 'men', 'women', 'unisex',
        'kids', 'boy', 'girl', 'new', 'original', 'genuine',
        'classic', 'vintage', 'sport', 'luxury', 'smart', 'digital',
        'analog', 'set', 'watch', 'watches', 'chronograph', 'automatic',
        'portable', 'stainless', 'steel', 'engravable', 'gift',
    }

    upper = name.upper()

    # Check multi-word brands first
    for brand in multi_word_brands:
        if upper.startswith(brand):
            return brand.title()

    # Split and check first word
    parts = name.split()
    if parts:
        if parts[0].lower() in not_brands and len(parts) > 1:
            # Skip descriptor, try next word
            if parts[1].lower() in not_brands and len(parts) > 2:
                return parts[2].title()
            return parts[1].title()
        return parts[0].title()

    return "Unknown"


def is_watch_product(name: str, features: list[str]) -> bool:
    """Check if a product is actually a watch (not accessories, sunglasses, etc.)."""
    non_watch_keywords = [
        'laptop stand', 'bracelet', 'sunglasses', 'jewellery', 'jewelry',
        'earring', 'necklace', 'ring', 'bangle', 'chain', 'cable',
        'charger', 'phone case', 'wallet', 'bag', 'perfume',
        'portable aluminium', 'steel bracelet', 'gift set', 'giftset',
        'gift pack', 'stock in', 'smartwatch set', 'jewellery set',
        'necklace', 'hypoallergenic', 'couple sets', 'gift',
    ]
    combined = (name + ' ' + ' '.join(features)).lower()
    for kw in non_watch_keywords:
        if kw in combined:
            return False
    return True


def auto_categorize(name: str, features: list[str]) -> str:
    """Assign category based on product name and features."""
    combined = (name + ' ' + ' '.join(features)).lower()

    scores = {}
    for cat_id, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in combined)
        if score > 0:
            scores[cat_id] = score

    if scores:
        return max(scores, key=scores.get)
    return "cat-sports"  # Default fallback


def build_brand_map(catalogue: dict) -> dict:
    """Build a case-insensitive lookup for existing brands."""
    return {b['name'].lower(): b for b in catalogue.get('brands', [])}


def get_or_create_brand(catalogue: dict, brand_name: str, brand_map: dict) -> str:
    """Get existing brand ID or create a new brand."""
    key = brand_name.lower()

    if key in brand_map:
        return brand_map[key]['id']

    # Create new brand
    brand_id = f"br-{slugify(brand_name)}"
    new_brand = {
        "id": brand_id,
        "name": brand_name,
        "slug": slugify(brand_name),
        "description": f"{brand_name} watches sourced from our supplier network.",
        "logo": ""
    }
    catalogue['brands'].append(new_brand)
    brand_map[key] = new_brand
    print(f"  + New brand: {brand_name} ({brand_id})")
    return brand_id


def get_next_product_id(catalogue: dict) -> int:
    """Get the next available product ID number."""
    max_id = 0
    for p in catalogue.get('products', []):
        match = re.search(r'prd-(\d+)', p.get('id', ''))
        if match:
            num = int(match.group(1))
            if num > max_id:
                max_id = num
    return max_id + 1


def import_products(dry_run: bool = False, replace: bool = False):
    """Main import logic."""
    # Load extracted products
    if not EXTRACTED_FILE.exists():
        print(f"ERROR: {EXTRACTED_FILE} not found.")
        print("Run extract-telegram-products.py first.")
        sys.exit(1)

    with open(EXTRACTED_FILE, 'r', encoding='utf-8') as f:
        extracted = json.load(f)

    products = extracted.get('products', [])
    if not products:
        print("No products found in extracted data.")
        sys.exit(0)

    print(f"Found {len(products)} extracted products.\n")

    # Load existing catalogue
    if replace:
        catalogue = {
            "categories": [],
            "brands": [],
            "products": []
        }
        print("Replacing entire catalogue.\n")
    else:
        with open(CATALOGUE_FILE, 'r', encoding='utf-8') as f:
            catalogue = json.load(f)

    brand_map = build_brand_map(catalogue)
    next_id = get_next_product_id(catalogue)

    # Track existing product slugs to avoid duplicates
    existing_slugs = {p['slug'] for p in catalogue.get('products', [])}
    existing_names = {p['name'].lower() for p in catalogue.get('products', [])}

    imported = 0
    skipped = 0

    for prod in products:
        name = prod.get('name', 'Unknown')

        # Skip duplicates
        if name.lower() in existing_names:
            print(f"  SKIP (duplicate): {name}")
            skipped += 1
            continue

        # Skip non-watch products
        source = prod.get('_source', {})
        features = source.get('raw_features', [])
        if not is_watch_product(name, features):
            print(f"  SKIP (not a watch): {name}")
            skipped += 1
            continue

        # Skip products with suspiciously low prices (likely parsing errors)
        if prod.get('price', 0) < 500:
            print(f"  SKIP (price too low): {name} — KSh {prod.get('price', 0)}")
            skipped += 1
            continue

        # Auto-assign brand
        source = prod.get('_source', {})
        brand_name = _extract_brand_from_name(name)
        brand_id = get_or_create_brand(catalogue, brand_name, brand_map)

        # Auto-assign category
        category_id = auto_categorize(name, features)

        # Ensure category exists
        cat_exists = any(c['id'] == category_id for c in catalogue.get('categories', []))
        if not cat_exists:
            # Create category from keyword map
            cat_name = category_id.replace('cat-', '').replace('-', ' ').title() + ' Watches'
            new_cat = {
                "id": category_id,
                "name": cat_name,
                "slug": slugify(cat_name),
                "description": f"{cat_name} collection.",
                "parentId": None,
                "status": "active",
                "order": len(catalogue.get('categories', [])) + 1
            }
            catalogue.setdefault('categories', []).append(new_cat)
            print(f"  + New category: {cat_name}")

        # Build final product
        product_id = f"prd-{next_id}"
        next_id += 1

        final_product = {
            "id": product_id,
            "slug": prod.get('slug', slugify(name)),
            "name": name,
            "sku": prod.get('sku', f"MER-{next_id:04d}"),
            "price": prod.get('price', 0),
            "compareAtPrice": None,
            "currency": "KES",
            "categoryId": category_id,
            "brandId": brand_id,
            "shortDescription": prod.get('shortDescription', ''),
            "description": prod.get('description', ''),
            "images": prod.get('images', []),
            "availability": prod.get('availability', 'in_stock'),
            "featured": False,
            "newArrival": True,
            "bestSeller": False,
            "variants": [],
            "attributes": prod.get('attributes', {}),
            "tags": prod.get('tags', []),
            "seo": prod.get('seo', {
                "title": name,
                "description": prod.get('shortDescription', '')
            }),
            "createdAt": datetime.utcnow().isoformat() + "Z",
            "updatedAt": datetime.utcnow().isoformat() + "Z"
        }

        # Handle colors as variants
        colors = source.get('colors', [])
        color_values = [c for c in colors if c != f"{len(colors)} colors available" and len(c) < 20]
        if color_values:
            final_product['variants'] = [{
                "id": f"var-{product_id}",
                "type": "color",
                "options": color_values
            }]

        # Add _source info for reference (will be stripped on final build)
        final_product['_source'] = {
            "wholesale_price": source.get('wholesale_price', 0),
            "retail_price": prod.get('price', 0)
        }

        catalogue['products'].append(final_product)
        existing_slugs.add(final_product['slug'])
        existing_names.add(name.lower())
        imported += 1

        print(f"  + {name} — KSh {prod.get('price', 0):,}")

    # Summary
    print(f"\n{'='*60}")
    print(f"Import complete!")
    print(f"  Imported: {imported}")
    print(f"  Skipped:  {skipped}")
    print(f"  Total products in catalogue: {len(catalogue['products'])}")
    print(f"  Total brands: {len(catalogue['brands'])}")
    print(f"  Total categories: {len(catalogue['categories'])}")
    print(f"{'='*60}")

    if dry_run:
        print("\nDry run — no files written.")
        return

    # Write catalogue
    with open(CATALOGUE_FILE, 'w', encoding='utf-8') as f:
        json.dump(catalogue, f, indent=2, ensure_ascii=False)

    print(f"\nCatalogue saved to: {CATALOGUE_FILE}")
    print(f"\nNext steps:")
    print(f"  1. npm run build:data     # Regenerate client-data.js")
    print(f"  2. npm run images:process  # Optimize product images")
    print(f"  3. npm run build:pages     # Generate static product pages")
    print(f"  4. npm run build:seo       # Generate sitemap + robots.txt")


if __name__ == '__main__':
    dry_run = '--dry-run' in sys.argv
    replace = '--replace' in sys.argv
    import_products(dry_run=dry_run, replace=replace)
