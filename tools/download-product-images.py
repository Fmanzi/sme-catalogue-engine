#!/usr/bin/env python3
"""
Download images for extracted products from Telegram.

Reads tools/extracted-products.json and uses saved Telegram message IDs
to download all product images.

Usage:
    python tools/download-product-images.py
    python tools/download-product-images.py --limit 5
"""

import os
import sys
import json
import asyncio
from pathlib import Path

from telethon import TelegramClient
from dotenv import load_dotenv

TOOLS_DIR = Path(__file__).parent
PROJECT_ROOT = TOOLS_DIR.parent
EXTRACTED_FILE = TOOLS_DIR / "extracted-products.json"
IMAGES_DIR = PROJECT_ROOT / "clients" / "meridian" / "media" / "originals"
SESSION_FILE = TOOLS_DIR / ".tg_session"

load_dotenv(TOOLS_DIR / ".env")


async def main():
    api_id = int(os.getenv('TG_API_ID'))
    api_hash = os.getenv('TG_API_HASH')

    if not EXTRACTED_FILE.exists():
        print(f"ERROR: {EXTRACTED_FILE} not found.")
        sys.exit(1)

    with open(EXTRACTED_FILE, 'r', encoding='utf-8') as f:
        extracted = json.load(f)

    products = extracted.get('products', [])
    if not products:
        print("No products to download.")
        sys.exit(0)

    # Limit
    if '--limit' in sys.argv:
        idx = sys.argv.index('--limit')
        if idx + 1 < len(sys.argv):
            limit = int(sys.argv[idx + 1])
            products = products[:limit]

    print(f"Connecting to Telegram...")
    client = TelegramClient(str(SESSION_FILE), api_id, api_hash)
    await client.start(code_callback=lambda: '')
    print("Connected!\n")

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    total_downloaded = 0
    total_skipped = 0

    for prod in products:
        name = prod.get('name', 'Unknown')
        source = prod.get('_source', {})
        msg_ids = source.get('tg_msg_ids', [])
        images = prod.get('images', [])

        if not msg_ids:
            print(f"  {name}: no message IDs, skipping")
            continue

        print(f"  {name} ({len(msg_ids)} images)")

        for idx, msg_id in enumerate(msg_ids):
            if idx >= len(images):
                break

            img_path = images[idx]
            filename = Path(img_path).name
            filepath = IMAGES_DIR / filename

            if filepath.exists():
                print(f"    [exists] {filename}")
                total_skipped += 1
                continue

            try:
                msg = await client.get_messages(None, ids=msg_id)
                if msg and msg.media:
                    await client.download_media(msg, str(filepath))
                    print(f"    [downloaded] {filename}")
                    total_downloaded += 1
                else:
                    print(f"    [missing] {filename} (message {msg_id} has no media)")
            except Exception as e:
                print(f"    [error] {filename}: {e}")

    await client.disconnect()
    print(f"\nDone! Downloaded: {total_downloaded}, Already existed: {total_skipped}")


if __name__ == '__main__':
    asyncio.run(main())
