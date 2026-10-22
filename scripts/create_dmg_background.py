import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_dmg_background():
    # 2x Retina canvas: 660pt x 400pt => 1320px x 800px
    WIDTH = 1320
    HEIGHT = 800
    S = 2 # Scale factor

    # Base dark gradient (top: #0F1117 -> bottom: #08090C)
    img = Image.new("RGBA", (WIDTH, HEIGHT), (12, 14, 18, 255))
    draw = ImageDraw.Draw(img)

    for y in range(HEIGHT):
        ratio = y / HEIGHT
        r = int(16 * (1 - ratio) + 8 * ratio)
        g = int(18 * (1 - ratio) + 9 * ratio)
        b = int(24 * (1 - ratio) + 12 * ratio)
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b, 255))

    # Glow Layer
    glow_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)

    app_cx, app_cy = 180 * S, 185 * S
    apps_cx, apps_cy = 480 * S, 185 * S

    # Warm amber glow under bokra.app
    for r in range(240, 10, -15):
        alpha = int(24 * (1 - r / 240))
        glow_draw.ellipse([app_cx - r, app_cy - r, app_cx + r, app_cy + r], fill=(255, 159, 10, alpha))

    # Electric Blue glow under Applications
    for r in range(240, 10, -15):
        alpha = int(28 * (1 - r / 240))
        glow_draw.ellipse([apps_cx - r, apps_cy - r, apps_cx + r, apps_cy + r], fill=(10, 132, 255, alpha))

    # Center soft violet glow
    for r in range(180, 10, -15):
        alpha = int(12 * (1 - r / 180))
        glow_draw.ellipse([WIDTH//2 - r, app_cy - r, WIDTH//2 + r, app_cy + r], fill=(140, 100, 255, alpha))

    # Blur glows
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(60))
    img = Image.alpha_composite(img, glow_layer)
    draw = ImageDraw.Draw(img)

    # Glass Pedestals / Dock bases
    ped_w = 140 * S
    ped_h = 140 * S
    ped_r = 24 * S

    # Left Pedestal (App Dock)
    left_ped_box = [app_cx - ped_w // 2, app_cy - ped_h // 2, app_cx + ped_w // 2, app_cy + ped_h // 2]
    ped_fill = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    ped_draw = ImageDraw.Draw(ped_fill)
    # Subtle liquid glass fill
    ped_draw.rounded_rectangle(left_ped_box, radius=ped_r, fill=(255, 255, 255, 6), outline=(255, 255, 255, 30), width=2)
    img = Image.alpha_composite(img, ped_fill)

    # Right Pedestal (Applications Target Dropzone)
    right_ped_box = [apps_cx - ped_w // 2, apps_cy - ped_h // 2, apps_cx + ped_w // 2, apps_cy + ped_h // 2]
    right_fill = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    right_draw = ImageDraw.Draw(right_fill)
    right_draw.rounded_rectangle(right_ped_box, radius=ped_r, fill=(10, 132, 255, 8), outline=(10, 132, 255, 60), width=2)
    img = Image.alpha_composite(img, right_fill)

    draw = ImageDraw.Draw(img)

    # Fonts
    font_bold_path = "/System/Library/Fonts/SFNS.ttf"
    font_reg_path = "/System/Library/Fonts/SFNS.ttf"
    if not os.path.exists(font_bold_path):
        font_bold_path = "/System/Library/Fonts/Helvetica.ttc"
        font_reg_path = "/System/Library/Fonts/Helvetica.ttc"

    font_title = ImageFont.truetype(font_bold_path, 36 * S)
    font_subtitle = ImageFont.truetype(font_reg_path, 13 * S)
    font_badge = ImageFont.truetype(font_bold_path, 10 * S)
    font_footer = ImageFont.truetype(font_reg_path, 10 * S)

    # Header Branding
    title_text = "bokra"
    title_bbox = draw.textbbox((0, 0), title_text, font=font_title)
    title_w = title_bbox[2] - title_bbox[0]
    
    title_x = (WIDTH - title_w) // 2 - 8 * S
    title_y = 52 * S
    draw.text((title_x, title_y), title_text, font=font_title, fill=(255, 255, 255, 255))
    
    # Glowing dot
    dot_x = title_x + title_w + 4 * S
    dot_y = title_y + 10 * S
    draw.ellipse([dot_x, dot_y, dot_x + 10 * S, dot_y + 10 * S], fill=(255, 159, 10, 255))

    # Subtitle
    subtitle_text = "Drag bokra to Applications to install"
    sub_bbox = draw.textbbox((0, 0), subtitle_text, font=font_subtitle)
    sub_w = sub_bbox[2] - sub_bbox[0]
    sub_x = (WIDTH - sub_w) // 2
    sub_y = title_y + 46 * S
    draw.text((sub_x, sub_y), subtitle_text, font=font_subtitle, fill=(160, 166, 178, 220))

    # Center trajectory arrow and pill badge
    center_x = WIDTH // 2
    line_y = app_cy

    # Connecting arrow track
    track_start_x = int(app_cx + ped_w // 2 + 16 * S)
    track_end_x = int(apps_cx - ped_w // 2 - 16 * S)

    # Dashed gradient track
    dash_len = 8 * S
    gap_len = 6 * S
    curr_x = track_start_x

    while curr_x < track_end_x - 14 * S:
        progress = (curr_x - track_start_x) / (track_end_x - track_start_x)
        r = int(255 * (1 - progress) + 10 * progress)
        g = int(159 * (1 - progress) + 132 * progress)
        b = int(10 * (1 - progress) + 255 * progress)
        draw.line([(curr_x, line_y), (min(curr_x + dash_len, track_end_x - 14 * S), line_y)], fill=(r, g, b, 200), width=3)
        curr_x += dash_len + gap_len

    # Modern glowing Arrowhead
    ah_size = 9 * S
    ah_tip_x = track_end_x
    draw.polygon([
        (ah_tip_x, line_y),
        (ah_tip_x - ah_size, line_y - ah_size + 1),
        (ah_tip_x - int(ah_size * 0.4), line_y),
        (ah_tip_x - ah_size, line_y + ah_size - 1)
    ], fill=(10, 132, 255, 240))

    # Pill badge above the arrow
    badge_text = "DRAG TO INSTALL"
    badge_bbox = draw.textbbox((0, 0), badge_text, font=font_badge)
    b_text_w = badge_bbox[2] - badge_bbox[0]
    b_text_h = badge_bbox[3] - badge_bbox[1]
    
    badge_pad_x = 16 * S
    badge_pad_y = 7 * S
    b_box_w = b_text_w + badge_pad_x * 2
    b_box_h = b_text_h + badge_pad_y * 2
    b_box_x = center_x - b_box_w // 2
    b_box_y = line_y - b_box_h - 22 * S

    # Badge background
    badge_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(badge_layer)
    b_draw.rounded_rectangle(
        [b_box_x, b_box_y, b_box_x + b_box_w, b_box_y + b_box_h],
        radius=b_box_h // 2,
        fill=(255, 255, 255, 14),
        outline=(255, 255, 255, 30),
        width=1
    )
    img = Image.alpha_composite(img, badge_layer)
    draw = ImageDraw.Draw(img)

    # Badge text
    draw.text(
        (b_box_x + badge_pad_x, b_box_y + badge_pad_y - 1),
        badge_text,
        font=font_badge,
        fill=(240, 242, 246, 230)
    )

    # Footer
    footer_text = "bokra • Habit & Routine Architecture for macOS"
    footer_bbox = draw.textbbox((0, 0), footer_text, font=font_footer)
    footer_w = footer_bbox[2] - footer_bbox[0]
    footer_x = (WIDTH - footer_w) // 2
    footer_y = HEIGHT - 36 * S
    draw.text((footer_x, footer_y), footer_text, font=font_footer, fill=(100, 106, 120, 160))

    # Save 2x Retina PNG
    os.makedirs("src-tauri/assets", exist_ok=True)
    out_2x = "src-tauri/assets/dmg-background@2x.png"
    out_1x = "src-tauri/assets/dmg-background.png"
    
    img.save(out_2x, "PNG")
    
    # Save 1x downscaled PNG (660x400)
    img_1x = img.resize((660, 400), Image.Resampling.LANCZOS)
    img_1x.save(out_1x, "PNG")
    
    print(f"Generated {out_2x} ({WIDTH}x{HEIGHT}) and {out_1x} (660x400)")

if __name__ == "__main__":
    create_dmg_background()
