import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_monochrome_dmg_background():
    # 2x Retina canvas: 660pt x 400pt => 1320px x 800px
    WIDTH = 1320
    HEIGHT = 800
    S = 2  # Retina scale factor

    # 1. Pitch black background (#050507 deep obsidian)
    img = Image.new("RGBA", (WIDTH, HEIGHT), (5, 5, 7, 255))

    # 2. Subtle monochrome specular spotlight in the center (pure white / grey, 0 colors)
    spot = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(spot)
    for r in range(480, 40, -30):
        alpha = int(16 * (1.0 - r / 480.0))
        s_draw.ellipse([WIDTH//2 - r, HEIGHT//2 - int(r * 0.6), WIDTH//2 + r, HEIGHT//2 + int(r * 0.6)], fill=(255, 255, 255, alpha))
    spot = spot.filter(ImageFilter.GaussianBlur(90))
    img = Image.alpha_composite(img, spot)

    # Coordinates for Finder icons (180pt, 200pt) and (480pt, 200pt)
    app_cx, app_cy = 180 * S, 200 * S
    apps_cx, apps_cy = 480 * S, 200 * S

    # 3. Crisp Rounded Rectangles (Apple card corner radius: 20pt = 40px at 2x)
    # Size: 144pt = 288px.
    card_w = 144 * S
    card_h = 144 * S
    radius = 20 * S

    def draw_glass_card(cx, cy, is_dropzone=False):
        card = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        c_draw = ImageDraw.Draw(card)
        box = [cx - card_w // 2, cy - card_h // 2, cx + card_w // 2, cy + card_h // 2]

        # Subtle translucent dark glass
        c_draw.rounded_rectangle(box, radius=radius, fill=(255, 255, 255, 10))

        if not is_dropzone:
            # Crisp elegant border
            c_draw.rounded_rectangle(box, radius=radius, outline=(255, 255, 255, 45), width=2)
            # Top specular catchlight highlight
            top_y = cy - card_h // 2
            c_draw.line([(cx - card_w // 3, top_y), (cx + card_w // 3, top_y)], fill=(255, 255, 255, 120), width=2)
        else:
            # Dropzone target card
            c_draw.rounded_rectangle(box, radius=radius, outline=(255, 255, 255, 65), width=2)
            top_y = cy - card_h // 2
            c_draw.line([(cx - card_w // 3, top_y), (cx + card_w // 3, top_y)], fill=(255, 255, 255, 140), width=2)

            # Minimalist Corner Drop Target Brackets
            corner_len = 16 * S
            inset = 12 * S
            bx1, by1, bx2, by2 = box
            bracket_color = (255, 255, 255, 150)
            bw = 2 * S

            # Top-Left Bracket
            c_draw.line([(bx1 + inset, by1 + inset), (bx1 + inset + corner_len, by1 + inset)], fill=bracket_color, width=bw)
            c_draw.line([(bx1 + inset, by1 + inset), (bx1 + inset, by1 + inset + corner_len)], fill=bracket_color, width=bw)

            # Top-Right Bracket
            c_draw.line([(bx2 - inset, by1 + inset), (bx2 - inset - corner_len, by1 + inset)], fill=bracket_color, width=bw)
            c_draw.line([(bx2 - inset, by1 + inset), (bx2 - inset, by1 + inset + corner_len)], fill=bracket_color, width=bw)

            # Bottom-Left Bracket
            c_draw.line([(bx1 + inset, by2 - inset), (bx1 + inset + corner_len, by2 - inset)], fill=bracket_color, width=bw)
            c_draw.line([(bx1 + inset, by2 - inset), (bx1 + inset, by2 - inset - corner_len)], fill=bracket_color, width=bw)

            # Bottom-Right Bracket
            c_draw.line([(bx2 - inset, by2 - inset), (bx2 - inset - corner_len, by2 - inset)], fill=bracket_color, width=bw)
            c_draw.line([(bx2 - inset, by2 - inset), (bx2 - inset, by2 - inset - corner_len)], fill=bracket_color, width=bw)

        return card

    # Composite Left & Right Glass Cards
    img = Image.alpha_composite(img, draw_glass_card(app_cx, app_cy, is_dropzone=False))
    img = Image.alpha_composite(img, draw_glass_card(apps_cx, apps_cy, is_dropzone=True))

    # 4. Minimalist Directional Arrow (Sleek, Monochromatic, Elegant)
    arrow_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    a_draw = ImageDraw.Draw(arrow_layer)

    arrow_start_x = app_cx + card_w // 2 + 24 * S
    arrow_end_x = apps_cx - card_w // 2 - 24 * S
    arrow_y = app_cy
    ah_len = 14 * S
    ah_w = 8 * S

    # Solid crisp gradient track line (height = 3px at 2x)
    for x in range(arrow_start_x, arrow_end_x - ah_len):
        progress = (x - arrow_start_x) / max(1, (arrow_end_x - ah_len - arrow_start_x))
        alpha = int(45 + 185 * progress)
        a_draw.rectangle([x, arrow_y - 1, x + 1, arrow_y + 1], fill=(255, 255, 255, alpha))

    # Sharp Minimalist Chevron Arrowhead
    a_draw.polygon([
        (arrow_end_x, arrow_y),
        (arrow_end_x - ah_len, arrow_y - ah_w),
        (arrow_end_x - int(ah_len * 0.45), arrow_y),
        (arrow_end_x - ah_len, arrow_y + ah_w)
    ], fill=(255, 255, 255, 245))

    img = Image.alpha_composite(img, arrow_layer)

    # 5. Top Center: Pure Celestial Toggle Logo (ZERO text, pure brand mark)
    logo_path = "public/logo-transparent.png"
    if os.path.exists(logo_path):
        logo_img = Image.open(logo_path).convert("RGBA")
        target_h = int(44 * S)
        target_w = int(logo_img.width * (target_h / logo_img.height))
        logo_resized = logo_img.resize((target_w, target_h), Image.Resampling.LANCZOS)

        logo_x = (WIDTH - target_w) // 2
        logo_y = int(46 * S)
        img.paste(logo_resized, (logo_x, logo_y), logo_resized)

    # 6. Save Retina @2x and 1x Standard Assets as pure RGB (macOS Finder requires no alpha for backgrounds)
    os.makedirs("src-tauri/assets", exist_ok=True)
    out_2x = "src-tauri/assets/dmg-background@2x.png"
    out_1x = "src-tauri/assets/dmg-background.png"

    img_rgb = img.convert("RGB")
    img_rgb.save(out_2x, "PNG")

    img_1x = img_rgb.resize((660, 400), Image.Resampling.LANCZOS)
    img_1x.save(out_1x, "PNG")

    print(f"✅ Generated DMG background: {out_2x} & {out_1x}")

if __name__ == "__main__":
    create_monochrome_dmg_background()
