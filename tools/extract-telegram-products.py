#!/usr/bin/env python3
"""
Telegram Supplier Group → Product Catalogue Extractor

Reads messages from a Telegram supplier group, pairs images with
product descriptions, and outputs structured product data for
import into the MERIDIAN catalogue.

Usage:
    1. Set up .env with your Telegram API credentials
    2. Run: python tools/extract-telegram-products.py
    3. Review tools/extracted-products.json
    4. Run with --import flag to merge into catalogue.json
"""

import os
import re
import sys
import json
import asyncio
import hashlib
import io
from pathlib import Path
from datetime import datetime

# Fix Windows console encoding for emoji/unicode
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from telethon import TelegramClient
from telethon.tl.types import MessageMediaPhoto, MessageMediaDocument
from dotenv import load_dotenv

# Paths
TOOLS_DIR = Path(__file__).parent
PROJECT_ROOT = TOOLS_DIR.parent
OUTPUT_FILE = TOOLS_DIR / "extracted-products.json"
IMAGES_DIR = PROJECT_ROOT / "clients" / "meridian" / "media" / "originals"
SESSION_FILE = TOOLS_DIR / ".tg_session"

# Retail price formula: retail = (wholesale × 2) + 400
RETAIL_MULTIPLIER = 2
RETAIL_FLAT_FEE = 400

# Load environment
load_dotenv(TOOLS_DIR / ".env")


def calculate_retail(wholesale_price: int) -> int:
    """Convert wholesale price to retail."""
    return (wholesale_price * RETAIL_MULTIPLIER) + RETAIL_FLAT_FEE


def parse_price(text: str) -> int | None:
    """Extract price from text. Handles formats like 'KSH 1600', 'KSh 1,600', '1600', etc."""
    patterns = [
        r'(?:KSH|KSh|price)\s*[:\-]?\s*([\d,]+)',
        r'(?:price|cost)\s*[:\-]?\s*[\$]?\s*([\d,]+)',
        r'([\d,]+)\s*(?:KSH|KSh|bob|only)',
        r'(?:Retail|retail)\s*(?:price)?\s*[:\-]?\s*([\d,]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            price_str = match.group(1).replace(',', '')
            try:
                return int(price_str)
            except ValueError:
                continue
    return None


def parse_brand_model(text: str) -> tuple[str, str]:
    """
    Extract brand and model from product text.
    Looks for the first significant line (often bold) containing the product name.
    """
    # Remove emoji and clean up
    lines = text.strip().split('\n')

    # Noise words - skip these lines entirely
    skip_words = (
        'restocked', 'new arrival', 'new arrivals', 'new stock', 'new stock in',
        'in stock', 'available', 'hot', 'trending', 'order now', 'limited time',
        'coming soon', 'stock in', 'back in stock', 'newarrival', 'newarrival',
        'now available', 'backinstock', 'new in', 'newinstock', 'newstock',
        'back in', 'newnew', 'stock in',
    )

    # Look for the product name line - usually the first bold line or prominent text
    for line in lines:
        line = line.strip()
        # Skip empty lines, intro words, contact lines
        if not line:
            continue
        # Clean emoji for comparison
        clean_compare = re.sub(r'[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B50\u2764\uFE0F\u200D]+', '', line).strip().lower()
        clean_compare = re.sub(r'[*_`]+', '', clean_compare).strip()
        if clean_compare in skip_words:
            continue
        if any(x in clean_compare for x in ('contact', 'order', 'enquir', 'whatsapp', 'delivery', '0711', '0722', '0712', '0110')):
            continue
        # Skip lines that are just announcements
        if re.match(r'^(?:♨️|🔥|🎀|✅|✳️|📌|💰|\s)+$', line):
            continue

        # Clean markdown bold markers
        clean = re.sub(r'[*_`]+', '', line).strip()
        # Strip emoji from the name
        clean = re.sub(r'[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B50\u2764\uFE0F\u200D]+', '', clean).strip()
        clean = re.sub(r'[\u2600-\u27BF]+', '', clean).strip()

        # Skip lines that are just emoji or short noise
        if len(clean) < 3:
            continue

        # Strip price from the name line (e.g. "Cartier LADIES WATCH KSH 1500")
        clean = re.sub(r'\s*(?:KSH|KSh|price)\s*[\d,]+', '', clean, flags=re.IGNORECASE).strip()

        # This is likely the product name line
        # Try to split brand from model
        # Common patterns: "POEDAGAR GENTS 690", "CASIO G-Shock GA-2100"
        return _split_brand_model(clean)

    return ("Unknown", "Unknown Product")


def _split_brand_model(name: str) -> tuple[str, str]:
    """Split a product name into brand and model components."""
    # Remove common prefixes
    name = re.sub(r'^(?:🔥|✳️|✅|\s)+', '', name).strip()

    # Common known watch brands (add more as needed)
    known_brands = [
        'POEDAGAR', 'CASIO', 'G-SHOCK', 'ROLEX', 'SEIKO', 'OMEGA',
        'CITIZEN', 'TIMEX', 'SKMEI', 'NAVIFORCE', 'BENYAR', 'SMAEL',
        'GUANQIN', 'TED BAKER', 'DANIEL WELLINGTON', 'FOSSIL',
        'TOMMY HILFIGER', 'HUBLOT', 'PATEK', 'IWC', 'PANERAI',
        'BREITLING', 'TAG HEUER', 'CARTIER', 'AUDEMARS', 'TUDOR',
        'ORIENT', 'TISSOT', 'LONGINES', 'HAMILTON', 'MIDO',
        'BERTHOLD', 'AEROWATCH', 'ALPINA', 'RAYMOND WEIL',
        'MICHAEL KORS', 'DIESEL', 'ARMANI', 'BOSS',
        'VERSACE', 'CHANEL', 'DIOR', 'MONTBLANC', 'BULGARI',
        'TOMMY', 'ROTTARY', 'INGEROLL', 'OLEVS', 'CRRJU',
        'CURREN', 'HANNAH MARTIN', 'HANNAH', 'POEDAGAR',
    ]

    # Words that are NOT brands - they're descriptors (gender, type, etc.)
    not_brands = [
        'ladies', 'gents', 'gent', 'men', 'men\'s', 'women', 'women\'s',
        'unisex', 'kids', 'boy', 'girl', 'new', 'original', 'genuine',
        'classic', 'vintage', 'sport', 'luxury', 'smart', 'digital',
        'analog', 'quartz', 'automatic', 'mechanical', 'chronograph',
        'set', 'watch', 'watches',
    ]

    upper_name = name.upper()

    # Try to match a known brand at the start
    for brand in known_brands:
        if upper_name.startswith(brand):
            model = name[len(brand):].strip(' -–—')
            return (brand.title(), model if model else name)

    # If no known brand, try splitting on first space
    parts = name.split(None, 1)
    if len(parts) == 2:
        # Check if the first word is actually a descriptor, not a brand
        if parts[0].lower() in not_brands:
            # The whole thing is likely the model name with no known brand
            return ("Unknown", name)
        return (parts[0].title(), parts[1])

    return ("Unknown", name)


def parse_features(text: str) -> list[str]:
    """Extract feature bullet points from text."""
    features = []
    lines = text.split('\n')

    for line in lines:
        line = line.strip()
        # Match lines starting with ✳️ or similar bullet markers
        if re.match(r'^[✳️🔸•▪️\-\*]+\s*', line):
            feature = re.sub(r'^[✳️🔸•▪️\-\*]+\s*', '', line).strip()
            if feature:
                # Skip contact/order lines
                if any(x in feature.lower() for x in ('contact', 'order', 'enquir', 'whatsapp', 'delivery', '0711', '0722', '0712', '0110')):
                    continue
                features.append(feature)

    return features


def parse_colors(text: str) -> list[str]:
    """Extract available color options."""
    colors = []
    # Look for lines mentioning colors
    color_pattern = re.compile(r'(\d+)\s*colou?rs?\s*(?:option|available)?', re.IGNORECASE)
    color_list_pattern = re.compile(r'(?:colou?rs?\s*(?:available|option)?)\s*[:\-]\s*(.+)', re.IGNORECASE)

    for line in text.split('\n'):
        match = color_pattern.search(line)
        if match:
            count = match.group(1)
            colors.append(f"{count} colors available")

        match2 = color_list_pattern.search(line)
        if match2:
            color_text = match2.group(1).strip()
            # Split on common delimiters
            for c in re.split(r'[,/&|]', color_text):
                c = c.strip().strip('*').strip()
                if c and len(c) < 30 and len(c) > 1:
                    colors.append(c)

    return colors


def should_skip_accessories(text: str) -> bool:
    """Check if a line is about accessories/branded boxes (to be excluded)."""
    skip_patterns = [
        r'branded?\s*box',
        r'box\s*available',
        r'packaging',
        r'accessor',
        r'extra\s*strap',
        r'spare\s*part',
        r' charger ',
        r'cable',
    ]
    for pattern in skip_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def clean_product_description(text: str, brand: str, model: str) -> str:
    """Build a clean description from features and text, excluding noise."""
    lines = text.strip().split('\n')
    desc_parts = []

    # Announcement/noise patterns to skip
    noise_patterns = (
        'restocked', 'new arrival', 'new arrivals', 'new stock', 'new stock in',
        'in stock', 'available', 'hot', 'trending', 'order now', 'limited time',
        'coming soon', 'stock in', 'back in stock', 'newarrival',
    )

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Strip emoji for comparison
        stripped = re.sub(r'[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B50\u2764\uFE0F\u200D]+', '', line)
        stripped = re.sub(r'[*_`]+', '', stripped).strip().lower()

        # Skip intro/noise lines
        if stripped in noise_patterns:
            continue

        # Skip emoji-only lines
        clean = re.sub(r'[\s\W]+', '', line)
        if len(clean) < 2:
            continue

        # Skip contact/order lines
        if any(x in line.lower() for x in ('contact', 'order', 'enquir', 'whatsapp', 'delivery', '0711', '0722', '0712', '0110')):
            continue

        # Skip location/address lines
        if any(x in line.lower() for x in ('trade center', 'floor', 'shop t', 'accra')):
            continue

        # Skip branded boxes / accessories
        if should_skip_accessories(line):
            continue

        # Skip the product name line (already captured)
        cleaned_name = re.sub(r'[*_`\U0001F300-\U0001FAFF\u2600-\u27BF]+', '', line).strip()
        if brand.upper() in cleaned_name.upper() and model.upper() in cleaned_name.upper():
            continue

        # Skip price lines
        if parse_price(line) is not None:
            continue

        # Skip color-only lines
        if re.match(r'^\d+\s*color', line, re.IGNORECASE):
            continue

        # Clean up the line
        line = re.sub(r'[*_`]+', '', line).strip()
        if line:
            desc_parts.append(line)

    return '. '.join(desc_parts)


def is_video_message(message) -> bool:
    """Check if a message contains a video."""
    if message.media and isinstance(message.media, MessageMediaDocument):
        if message.media.document:
            for attr in message.media.document.attributes:
                if hasattr(attr, 'video_duration') or hasattr(attr, 'supports_streaming'):
                    return True
    return False


def is_photo_message(message) -> bool:
    """Check if a message contains a photo."""
    return message.media is not None and isinstance(message.media, MessageMediaPhoto)


def build_product(brand: str, model: str, wholesale_price: int,
                  features: list[str], colors: list[str],
                  description: str, images: list[str],
                  tg_msg_ids: list[int] = None) -> dict:
    """Build a catalogue-compatible product object."""
    full_name = f"{brand} {model}".strip()
    # Strip any remaining emoji from the name
    full_name = re.sub(r'[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B50\u2764\uFE0F\u200D]+', '', full_name).strip()
    full_name = re.sub(r'[\u2600-\u27BF]+', '', full_name).strip()
    slug = re.sub(r'[^a-z0-9]+', '-', full_name.lower()).strip('-')
    sku = f"MER-{hashlib.md5(full_name.encode()).hexdigest()[:6].upper()}"

    retail_price = calculate_retail(wholesale_price)

    # Build short description from first few features
    short_desc = f"{full_name}"
    if features:
        short_desc += " — " + ", ".join(features[:3]) + "."

    # Build attributes from features
    attributes = {}
    for feature in features:
        if ':' in feature:
            key, val = feature.split(':', 1)
            attributes[key.strip()] = val.strip()

    return {
        "id": None,  # Will be assigned on import
        "slug": slug,
        "name": full_name,
        "sku": sku,
        "price": retail_price,
        "compareAtPrice": None,
        "currency": "KES",
        "categoryId": None,  # Will be auto-assigned
        "brandId": None,  # Will be auto-assigned
        "shortDescription": short_desc,
        "description": description,
        "images": images,
        "availability": "in_stock",
        "featured": False,
        "newArrival": True,
        "bestSeller": False,
        "variants": [],
        "attributes": attributes,
        "tags": [f.lower() for f in features[:5]] if features else [brand.lower()],
        "seo": {
            "title": full_name,
            "description": short_desc
        },
        "_source": {
            "wholesale_price": wholesale_price,
            "retail_price": retail_price,
            "colors": colors,
            "raw_features": features,
            "tg_msg_ids": tg_msg_ids or []
        }
    }


async def main():
    # Check for required env vars
    api_id = os.getenv('TG_API_ID')
    api_hash = os.getenv('TG_API_HASH')
    group = os.getenv('TG_GROUP')

    if not api_id or not api_hash:
        print("ERROR: Missing Telegram API credentials.")
        print("Please create tools/.env with TG_API_ID, TG_API_HASH, and TG_GROUP.")
        print()
        print("Get API credentials from: https://my.telegram.org")
        sys.exit(1)

    if not group:
        print("ERROR: Missing TG_GROUP in .env.")
        print("Set TG_GROUP to the supplier group name or ID.")
        sys.exit(1)

    api_id = int(api_id)

    # Check for verification code in args (--code 12345)
    code = None
    if '--code' in sys.argv:
        idx = sys.argv.index('--code')
        if idx + 1 < len(sys.argv):
            code = sys.argv[idx + 1]

    print("Connecting to Telegram...")
    client = TelegramClient(str(SESSION_FILE), api_id, api_hash)
    if code:
        await client.start(phone=os.getenv('TG_PHONE'), code_callback=lambda: code)
    else:
        await client.start(phone=os.getenv('TG_PHONE'))
    print("Connected!\n")

    # Resolve the group
    entity = None
    try:
        # Try as numeric ID first
        group_id = int(group)
        entity = await client.get_entity(group_id)
    except (ValueError, Exception):
        # Try as string name
        try:
            entity = await client.get_entity(group)
        except Exception:
            pass

    if not entity:
        # Fallback: search through dialogs
        async for dialog in client.iter_dialogs():
            if dialog.id == int(group) if group.lstrip('-').isdigit() else False:
                entity = dialog.entity
                break
            if group.lower() in (dialog.name or '').lower():
                entity = dialog.entity
                break

    if not entity:
        print(f"ERROR: Could not find group '{group}'")
        await client.disconnect()
        sys.exit(1)

    print(f"Found group: {getattr(entity, 'title', group)}")

    # Parse message limit from args (--limit 100)
    msg_limit = 200
    if '--limit' in sys.argv:
        idx = sys.argv.index('--limit')
        if idx + 1 < len(sys.argv):
            msg_limit = int(sys.argv[idx + 1])

    skip_download = '--skip-download' in sys.argv

    # Fetch messages
    print(f"Fetching last {msg_limit} messages...")
    messages = []
    async for message in client.iter_messages(entity, limit=msg_limit):
        messages.append(message)

    print(f"Retrieved {len(messages)} messages total.\n")

    # Process messages: pair image groups with text descriptions
    products = []
    images_dir = IMAGES_DIR
    images_dir.mkdir(parents=True, exist_ok=True)

    # Strategy: scan forward, collect image groups, then attach the next text post
    pending_images = []
    pending_text = None

    # We'll process in reverse (newest first) then pair image→text
    # Actually, let's process forward and look for image→text pairs
    sorted_msgs = sorted(messages, key=lambda m: m.date)

    i = 0
    while i < len(sorted_msgs):
        msg = sorted_msgs[i]

        # Skip service messages
        if msg.action:
            i += 1
            continue

        # Skip videos
        if msg.media and is_video_message(msg):
            i += 1
            continue

        # Photo message - collect images
        if msg.media and is_photo_message(msg):
            if not pending_images:
                pending_images = []
            pending_images.append(msg)
            i += 1
            continue

        # Text message
        if msg.text and msg.text.strip():
            text = msg.text.strip()

            # Check if this is a product description (has price or features)
            has_price = parse_price(text) is not None
            has_features = bool(re.search(r'[✳️🔸•▪️]', text))

            if has_price or has_features:
                # This is a product description!
                # Pair with pending images if any
                brand, model = parse_brand_model(text)
                wholesale_price = parse_price(text)
                features = parse_features(text)
                colors = parse_colors(text)
                description = clean_product_description(text, brand, model)

                # Skip if we couldn't identify a real product name
                if brand == "Unknown" and model == "Unknown Product":
                    print(f"  Skipping (unidentified product): {text[:60].strip()}...")
                    pending_images = []
                    i += 1
                    continue

                # Download images
                image_paths = []
                if skip_download:
                    for idx, img_msg in enumerate(pending_images):
                        image_paths.append(f"clients/meridian/media/originals/{slugify(brand + '-' + model)}-{idx + 1}.jpg")
                else:
                    for idx, img_msg in enumerate(pending_images):
                        try:
                            filename = f"{slugify(brand + '-' + model)}-{idx + 1}.jpg"
                            filepath = images_dir / filename
                            await client.download_media(img_msg, str(filepath))
                            image_paths.append(f"clients/meridian/media/originals/{filename}")
                            print(f"  Downloaded: {filename}")
                        except Exception as e:
                            print(f"  Warning: Failed to download image {idx + 1}: {e}")

                if not image_paths and wholesale_price:
                    print(f"  Skipping (no images): {brand} {model}")
                    pending_images = []
                    i += 1
                    continue

                if wholesale_price:
                    # Collect Telegram message IDs for image download later
                    tg_msg_ids = [img_msg.id for img_msg in pending_images]
                    product = build_product(
                        brand=brand,
                        model=model,
                        wholesale_price=wholesale_price,
                        features=features,
                        colors=colors,
                        description=description,
                        images=image_paths,
                        tg_msg_ids=tg_msg_ids
                    )
                    products.append(product)
                    print(f"  Found: {brand} {model} — KSh {wholesale_price} → KSh {product['price']}")
                else:
                    print(f"  Skipping (no price found): {brand} {model}")

                pending_images = []
            else:
                # Not a product description (could be general chat)
                # If we have pending images and this doesn't look product-related, reset
                if pending_images and not has_price:
                    pass  # Keep pending images in case next message is the description

        i += 1

    await client.disconnect()

    # Save results
    output = {
        "extractedAt": datetime.utcnow().isoformat() + "Z",
        "source": "telegram",
        "group": group,
        "retailFormula": f"(wholesale × {RETAIL_MULTIPLIER}) + {RETAIL_FLAT_FEE}",
        "totalProducts": len(products),
        "products": products
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"Extraction complete!")
    print(f"Products found: {len(products)}")
    print(f"Output saved to: {OUTPUT_FILE}")
    print(f"{'='*60}")
    print(f"\nNext steps:")
    print(f"  1. Review {OUTPUT_FILE}")
    print(f"  2. Run: python tools/extract-telegram-products.py --import")


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug."""
    text = text.lower().strip()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')


if __name__ == '__main__':
    asyncio.run(main())
