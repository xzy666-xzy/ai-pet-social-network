"""Generate Android launcher icons from wepet-logo-source.png"""
from PIL import Image
import os

SOURCE = "web/app/wepet-logo-source.png"
OUTPUT_DIR = "android/app/src/main/res"

# Android mipmap density sizes (launcher icon sizes)
SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

img = Image.open(SOURCE)
print(f"Source image: {img.size}, mode={img.mode}")

for folder, size in SIZES.items():
    resized = img.resize((size, size), Image.LANCZOS)
    
    # Convert RGBA to RGB if needed for PNG
    if resized.mode not in ("RGBA", "RGB"):
        resized = resized.convert("RGBA")
    
    for name in ("ic_launcher.png", "ic_launcher_round.png"):
        path = os.path.join(OUTPUT_DIR, folder, name)
        resized.save(path, "PNG")
        print(f"  Saved: {path} ({size}x{size})")

print("Done! All Android launcher icons regenerated.")
