from pathlib import Path
import json

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSET_DIR = ROOT / 'data' / 'question-assets'
MANIFEST_PATH = ROOT / 'data' / 'question-assets-manifest.json'

Image.MAX_IMAGE_PIXELS = None


def optimize_png(asset_path: Path):
    target_path = asset_path.with_suffix('.webp')
    with Image.open(asset_path) as image:
        image.save(target_path, 'WEBP', lossless=True, method=6)
    original_size = asset_path.stat().st_size
    new_size = target_path.stat().st_size
    if new_size < original_size:
        asset_path.unlink()
        return target_path.name, original_size, new_size, True
    target_path.unlink(missing_ok=True)
    return asset_path.name, original_size, original_size, False


def main():
    manifest = {}
    if MANIFEST_PATH.exists():
        manifest = json.loads(MANIFEST_PATH.read_text())

    renamed = {}
    before_total = 0
    after_total = 0
    converted = 0

    for asset_path in sorted(ASSET_DIR.glob('*.png')):
        file_name, before_size, after_size, changed = optimize_png(asset_path)
        before_total += before_size
        after_total += after_size
        if changed:
            converted += 1
            renamed[asset_path.name] = file_name

    if renamed and manifest:
        for meta in manifest.values():
            file_name = meta.get('file')
            if file_name in renamed:
                new_name = renamed[file_name]
                meta['file'] = new_name
                meta['contentType'] = 'image/webp'
                meta['size'] = (ASSET_DIR / new_name).stat().st_size
        MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

    print(json.dumps({
        'converted': converted,
        'saved_bytes': before_total - after_total,
        'before_bytes': before_total,
        'after_bytes': after_total,
        'ratio': round(after_total / before_total, 4) if before_total else 1,
    }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
