"""
Generate favicon.ico and icon.png from web/public/icon.svg

Steps:
1. Render full SVG (background + foreground) at high resolution
2. Auto-crop transparent margins (corners outside rounded rect)
3. Scale to fill 85-90% of canvas
4. Output:
   - web/app/icon.png (512x512)
   - web/app/favicon.ico (16x16, 32x32, 48x48, 64x64)
"""

import struct
import io
import re
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw


SVG_PATH = "web/public/icon.svg"
OUTPUT_PNG = "web/app/icon.png"
OUTPUT_ICO = "web/app/favicon.ico"
CANVAS_SIZE = 512
ICO_SIZES = [16, 32, 48, 64]
TARGET_FILL_RATIO = 0.87  # 87% fill (between 85-90%)
SCALE_FACTOR = 4  # Render at 4x for anti-aliasing


def parse_svg(svg_file):
    """Parse the SVG file and extract paths and colors."""
    tree = ET.parse(svg_file)
    root = tree.getroot()

    ns = {"svg": "http://www.w3.org/2000/svg"}

    # Get viewBox
    view_box = root.get("viewBox", "0 0 180 180")
    vb_parts = list(map(float, view_box.split()))
    vb_x, vb_y, vb_w, vb_h = vb_parts

    # Colors: light mode = black bg, white fg
    bg_color = (0, 0, 0, 255)
    fg_color = (255, 255, 255, 255)

    # Find all paths
    paths = []
    for path_elem in root.findall(".//svg:path", ns):
        d = path_elem.get("d", "")
        class_name = path_elem.get("class", "")
        paths.append({"d": d, "class": class_name})

    return {
        "view_box": (vb_x, vb_y, vb_w, vb_h),
        "bg_color": bg_color,
        "fg_color": fg_color,
        "paths": paths,
    }


def svg_path_to_polygons(d):
    """Convert SVG path 'd' attribute to list of polygon coordinates."""
    tokens = re.findall(r"[MLCZmlcz]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?", d)

    polygons = []
    current_poly = []
    i = 0
    current_pos = [0, 0]
    first_pos = None

    while i < len(tokens):
        token = tokens[i]
        if token.upper() == "M":
            if current_poly and len(current_poly) >= 4:
                polygons.append(current_poly)
            current_poly = []
            i += 1
            x = float(tokens[i])
            y = float(tokens[i + 1])
            current_pos = [x, y]
            first_pos = [x, y]
            current_poly.extend([x, y])
            i += 2
        elif token.upper() == "L":
            i += 1
            x = float(tokens[i])
            y = float(tokens[i + 1])
            current_pos = [x, y]
            current_poly.extend([x, y])
            i += 2
        elif token.upper() == "C":
            i += 1
            cp1x = float(tokens[i])
            cp1y = float(tokens[i + 1])
            cp2x = float(tokens[i + 2])
            cp2y = float(tokens[i + 3])
            x = float(tokens[i + 4])
            y = float(tokens[i + 5])

            steps = 20
            for t in range(1, steps + 1):
                t_norm = t / steps
                mt = 1 - t_norm
                bx = (
                    mt * mt * mt * current_pos[0]
                    + 3 * mt * mt * t_norm * cp1x
                    + 3 * mt * t_norm * t_norm * cp2x
                    + t_norm * t_norm * t_norm * x
                )
                by = (
                    mt * mt * mt * current_pos[1]
                    + 3 * mt * mt * t_norm * cp1y
                    + 3 * mt * t_norm * t_norm * cp2y
                    + t_norm * t_norm * t_norm * y
                )
                current_poly.extend([bx, by])

            current_pos = [x, y]
            i += 6
        elif token.upper() == "Z":
            if first_pos:
                current_poly.extend(first_pos)
            if current_poly and len(current_poly) >= 4:
                polygons.append(current_poly)
            current_poly = []
            i += 1
            first_pos = None
        else:
            i += 1

    if current_poly and len(current_poly) >= 4:
        polygons.append(current_poly)

    return polygons


def render_full_svg(svg_data, hi_res_size):
    """Render the complete SVG (background + foreground) at high resolution."""
    vb_x, vb_y, vb_w, vb_h = svg_data["view_box"]

    img = Image.new("RGBA", (hi_res_size, hi_res_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    scale_x = hi_res_size / vb_w
    scale_y = hi_res_size / vb_h
    scale = min(scale_x, scale_y)
    offset_x = (hi_res_size - vb_w * scale) / 2
    offset_y = (hi_res_size - vb_h * scale) / 2

    # Draw background rounded rectangle
    rx = 37 * scale
    rect_x = offset_x
    rect_y = offset_y
    rect_w = vb_w * scale
    rect_h = vb_h * scale

    draw.rounded_rectangle(
        [rect_x, rect_y, rect_x + rect_w, rect_y + rect_h],
        radius=rx,
        fill=svg_data["bg_color"],
    )

    # Draw foreground (W letter) with 95% scale transform
    center_x = hi_res_size / 2
    center_y = hi_res_size / 2
    fg_scale = 0.95

    for path_data in svg_data["paths"]:
        if path_data["class"] == "foreground":
            polygons = svg_path_to_polygons(path_data["d"])
            for poly in polygons:
                scaled_poly = []
                for j in range(0, len(poly), 2):
                    sx = poly[j] * scale
                    sy = poly[j + 1] * scale
                    # Apply 95% scale around center
                    sx = (sx - center_x) * fg_scale + center_x
                    sy = (sy - center_y) * fg_scale + center_y
                    # Add offset
                    sx += offset_x
                    sy += offset_y
                    scaled_poly.extend([sx, sy])
                draw.polygon(scaled_poly, fill=svg_data["fg_color"])

    return img


def crop_transparent(img):
    """Crop transparent margins from the image."""
    bbox = img.getbbox()
    if bbox:
        return img.crop(bbox)
    return img


def scale_to_canvas(content_img, target_size, fill_ratio):
    """
    Scale content image so it fills `fill_ratio` of target canvas,
    maintaining aspect ratio. Places centered on canvas.
    """
    bbox = content_img.getbbox()
    if not bbox:
        result = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
        result.paste(content_img, (0, 0))
        return result

    content_w = bbox[2] - bbox[0]
    content_h = bbox[3] - bbox[1]

    # Crop to content bounding box
    cropped = content_img.crop(bbox)

    # Scale so that the LARGER dimension fills fill_ratio of target
    target_content_size = int(target_size * fill_ratio)

    scale = target_content_size / max(content_w, content_h)
    new_w = int(content_w * scale)
    new_h = int(content_h * scale)

    scaled = cropped.resize((new_w, new_h), Image.LANCZOS)

    result = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
    paste_x = (target_size - new_w) // 2
    paste_y = (target_size - new_h) // 2
    result.paste(scaled, (paste_x, paste_y), scaled)

    return result


def create_ico(png_image, sizes):
    """Create ICO file with multiple sizes using PNG format entries."""
    ico_data = io.BytesIO()

    # ICO header: reserved(2), type(2)=1 for icon, count(2)
    ico_data.write(struct.pack("<HHH", 0, 1, len(sizes)))

    entries = []
    icon_datas = []

    for size in sizes:
        icon = png_image.resize((size, size), Image.LANCZOS)

        # Save as PNG
        png_buf = io.BytesIO()
        icon.save(png_buf, format="PNG")
        png_data = png_buf.getvalue()

        # ICO directory entry
        w = size if size < 256 else 0
        h = size if size < 256 else 0
        entry = struct.pack(
            "<BBBBHHII",
            w,
            h,
            0,  # palette colors
            0,  # reserved
            1,  # color planes
            32,  # bits per pixel
            len(png_data),
            0,  # offset placeholder
        )
        entries.append(entry)
        icon_datas.append(png_data)

    # Calculate offsets
    header_size = 6 + 16 * len(sizes)
    offset = header_size
    for i in range(len(sizes)):
        entries[i] = entries[i][:12] + struct.pack("<I", offset) + entries[i][16:]
        offset += len(icon_datas[i])

    # Write everything
    ico_data.seek(0)
    ico_data.write(struct.pack("<HHH", 0, 1, len(sizes)))
    for entry in entries:
        ico_data.write(entry)
    for data in icon_datas:
        ico_data.write(data)

    return ico_data.getvalue()


def main():
    print("=" * 60)
    print("Favicon & Icon Generator")
    print("=" * 60)

    # Parse SVG
    print(f"\n[1/5] Parsing SVG: {SVG_PATH}")
    svg_data = parse_svg(SVG_PATH)
    print(f"  ViewBox: {svg_data['view_box']}")
    print(f"  Paths: {len(svg_data['paths'])}")

    hi_res = CANVAS_SIZE * SCALE_FACTOR

    # Step 1: Render full SVG at high res
    print(f"\n[2/5] Rendering full SVG at {hi_res}x{hi_res}...")
    full_img = render_full_svg(svg_data, hi_res)
    full_bbox = full_img.getbbox()
    if full_bbox:
        print(f"  Full bbox: {full_bbox}")
        print(f"  Full content size: {full_bbox[2]-full_bbox[0]}x{full_bbox[3]-full_bbox[1]}")
    else:
        print(f"  Warning: No content found!")

    # Step 2: Crop transparent margins (corners outside rounded rect)
    print(f"\n[3/5] Cropping transparent margins...")
    cropped = crop_transparent(full_img)
    print(f"  Cropped size: {cropped.size}")

    # Step 3: Scale to fill 87% of 512x512 canvas
    print(f"\n[4/5] Scaling to fill {TARGET_FILL_RATIO*100:.0f}% of {CANVAS_SIZE}x{CANVAS_SIZE}...")
    final_img = scale_to_canvas(cropped, CANVAS_SIZE, TARGET_FILL_RATIO)

    # Verify fill ratio
    final_bbox = final_img.getbbox()
    if final_bbox:
        fw = final_bbox[2] - final_bbox[0]
        fh = final_bbox[3] - final_bbox[1]
        actual_fill = (fw * fh) / (CANVAS_SIZE * CANVAS_SIZE)
        print(f"  Final content: {fw}x{fh}")
        print(f"  Actual fill ratio: {actual_fill:.1%}")
    else:
        print(f"  Warning: No content!")

    # Save PNG
    print(f"\n  Saving PNG: {OUTPUT_PNG}")
    final_img.save(OUTPUT_PNG, format="PNG")
    print(f"  PNG saved ({CANVAS_SIZE}x{CANVAS_SIZE})")

    # Create and save ICO
    print(f"\n[5/5] Creating ICO with sizes: {ICO_SIZES}...")
    ico_bytes = create_ico(final_img, ICO_SIZES)
    with open(OUTPUT_ICO, "wb") as f:
        f.write(ico_bytes)
    print(f"  ICO saved: {OUTPUT_ICO} ({len(ico_bytes)} bytes)")

    # Verify ICO
    try:
        ico_img = Image.open(OUTPUT_ICO)
        print(f"  ICO verification:")
        # Try to access frames
        i = 0
        while True:
            ico_img.seek(i)
            print(f"    Frame {i}: {ico_img.size}")
            i += 1
    except EOFError:
        print(f"    (Total frames: {i})")
    except Exception as e:
        print(f"    (Note: {e})")

    print(f"\n{'=' * 60}")
    print(f"Done! Files generated:")
    print(f"  - {OUTPUT_PNG}")
    print(f"  - {OUTPUT_ICO}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
