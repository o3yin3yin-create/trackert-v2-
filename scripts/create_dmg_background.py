import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def make_squircle_mask(w, h, n=4.4):
    """Generates an authentic Apple squircle mask using Lamé curve with 4x supersampling."""
    scale = 4
    sw, sh = w * scale, h * scale
    a, b = sw / 2.0, sh / 2.0
    
    points = []
    steps = 720
    for i in range(steps):
        theta = 2.0 * math.pi * i / steps
        cos_t = math.cos(theta)
        sin_t = math.sin(theta)
        
        sign_x = 1.0 if cos_t >= 0 else -1.0
        sign_y = 1.0 if sin_t >= 0 else -1.0
        
        px = a + a * sign_x * (abs(cos_t) ** (2.0 / n))
        py = b + b * sign_y * (abs(sin_t) ** (2.0 / n))
        points.append((px, py))
        
    mask = Image.new("L", (sw, sh), 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(points, fill=255)
    return mask.resize((w, h), Image.Resampling.LANCZOS)

def create_liquid_glass_squircle(w, h, fill_rgba, border_rgba, border_width=2):
    """Creates a liquid-glass Apple squircle with specular highlight gradient."""
    outer_mask = make_squircle_mask(w, h)
    inner_mask = make_squircle_mask(w - border_width * 2, h - border_width * 2)
    
    # Fill layer
    fill_layer = Image.new("RGBA", (w, h), fill_rgba)
    
    # Subtle vertical specular gradient
    grad = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(grad)
    for y in range(h):
        alpha = int(22 * (1.0 - y / h))
        g_draw.line([(0, y), (w, y)], fill=(255, 255, 255, alpha))
    fill_layer = Image.alpha_composite(fill_layer, grad)
    
    # Border layer
    border_layer = Image.new("RGBA", (w, h), border_rgba)
    
    # Highlight on top border
    b_grad = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(b_grad)
    for y in range(int(h * 0.45)):
        alpha = int(45 * (1.0 - y / (h * 0.45)))
        bg_draw.line([(0, y), (w, y)], fill=(255, 255, 255, alpha))
    border_layer = Image.alpha_composite(border_layer, b_grad)
    
    # Cut out inner hole
    border_alpha = Image.new("L", (w, h), 0)
    border_alpha.paste(outer_mask, (0, 0))
    border_alpha.paste(0, (border_width, border_width), inner_mask)
    
    border_result = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    border_result.paste(border_layer, (0, 0), border_alpha)
    
    # Final panel
    panel = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    panel.paste(fill_layer, (0, 0), outer_mask)
    panel = Image.alpha_composite(panel, border_result)
    return panel

def generate_background():
    # 2x Retina: 660pt x 400pt => 1320px x 800px
    W = 1320
    H = 800
    S = 2

    # 1. Base dark obsidian canvas
    canvas = Image.new("RGBA", (W, H), (5, 5, 8, 255))

    # 2. Aurora Mesh Gradient Layer (Matching .dark .mesh-bg in globals.css)
    aurora = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    a_draw = ImageDraw.Draw(aurora)
    
    # Warm amber/orange orb (hsla 22, 100%, 77%)
    a_draw.ellipse([-80, -80, 580, 480], fill=(255, 170, 110, 24))
    # Electric cyan (hsla 189, 100%, 56%)
    a_draw.ellipse([820, -40, 1420, 520], fill=(50, 200, 255, 22))
    # Subtle indigo (hsla 242, 100%, 70%)
    a_draw.ellipse([380, 360, 1000, 820], fill=(120, 110, 255, 18))
    # Rose/magenta accent (hsla 340, 100%, 76%)
    a_draw.ellipse([-40, 460, 480, 880], fill=(255, 110, 170, 14))
    
    aurora = aurora.filter(ImageFilter.GaussianBlur(100))
    canvas = Image.alpha_composite(canvas, aurora)

    # 3. Soft atmospheric luminous spotlights
    app_cx, app_cy = 180 * S, 200 * S
    apps_cx, apps_cy = 480 * S, 200 * S

    spots = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(spots)
    
    # Amber spotlight under bokra.app
    for r in range(240, 20, -20):
        alpha = int(22 * (1.0 - r / 240.0))
        s_draw.ellipse([app_cx - r, app_cy - r, app_cx + r, app_cy + r], fill=(255, 165, 30, alpha))
        
    # Blue spotlight under Applications
    for r in range(240, 20, -20):
        alpha = int(26 * (1.0 - r / 240.0))
        s_draw.ellipse([apps_cx - r, apps_cy - r, apps_cx + r, apps_cy + r], fill=(70, 165, 255, alpha))
        
    spots = spots.filter(ImageFilter.GaussianBlur(60))
    canvas = Image.alpha_composite(canvas, spots)

    # 4. Authentic Apple Squircles (Liquid Glass Panels)
    pad_size = 142 * S
    
    # Left Dock Pad (bokra.app)
    left_dock = create_liquid_glass_squircle(
        pad_size, pad_size,
        fill_rgba=(18, 18, 24, 85),
        border_rgba=(255, 255, 255, 36),
        border_width=2
    )
    canvas.paste(left_dock, (app_cx - pad_size // 2, app_cy - pad_size // 2), left_dock)
    
    # Right Dock Pad (Applications dropzone)
    right_dock = create_liquid_glass_squircle(
        pad_size, pad_size,
        fill_rgba=(12, 22, 42, 85),
        border_rgba=(70, 160, 255, 70),
        border_width=2
    )
    canvas.paste(right_dock, (apps_cx - pad_size // 2, apps_cy - pad_size // 2), right_dock)

    draw = ImageDraw.Draw(canvas)

    # 5. Header: The Real Celestial Logo + bokra Brand
    logo_path = "public/logo-transparent.png"
    if os.path.exists(logo_path):
        logo_img = Image.open(logo_path).convert("RGBA")
        target_h = int(32 * S)
        target_w = int(logo_img.width * (target_h / logo_img.height))
        logo_resized = logo_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        logo_x = (W - target_w) // 2
        logo_y = int(24 * S)
        canvas.paste(logo_resized, (logo_x, logo_y), logo_resized)

    # Fonts
    font_bold = ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", 24 * S)
    font_sub = ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", 12 * S)
    font_badge = ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", 9 * S)
    font_footer = ImageFont.truetype("/System/Library/Fonts/SFNS.ttf", 9 * S)

    # Brand Name: "bokra" (lowercase, tight tracking)
    brand_text = "bokra"
    b_bbox = draw.textbbox((0, 0), brand_text, font=font_bold)
    b_w = b_bbox[2] - b_bbox[0]
    brand_x = (W - b_w) // 2
    brand_y = int(62 * S)
    draw.text((brand_x, brand_y), brand_text, font=font_bold, fill=(255, 255, 255, 255))

    # Subtitle
    sub_text = "Drag bokra to Applications to install"
    s_bbox = draw.textbbox((0, 0), sub_text, font=font_sub)
    s_w = s_bbox[2] - s_bbox[0]
    sub_x = (W - s_w) // 2
    sub_y = brand_y + int(30 * S)
    draw.text((sub_x, sub_y), sub_text, font=font_sub, fill=(156, 163, 175, 210))

    # 6. Connecting Trajectory & Fluid Flow Arrow
    start_x = app_cx + pad_size // 2 + int(16 * S)
    end_x = apps_cx - pad_size // 2 - int(16 * S)
    arrow_y = app_cy

    flow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    f_draw = ImageDraw.Draw(flow_layer)

    num_dots = 16
    for i in range(num_dots):
        t = i / (num_dots - 1)
        px = start_x + t * (end_x - start_x)
        py = arrow_y
        
        if t < 0.5:
            r = int(255 * (1.0 - t * 2) + 240 * (t * 2))
            g = int(170 * (1.0 - t * 2) + 240 * (t * 2))
            b = int(40 * (1.0 - t * 2) + 255 * (t * 2))
        else:
            t2 = (t - 0.5) * 2
            r = int(240 * (1.0 - t2) + 60 * t2)
            g = int(240 * (1.0 - t2) + 180 * t2)
            b = int(255 * (1.0 - t2) + 255 * t2)
            
        dot_r = int(2.5 * S)
        alpha = int(140 + 115 * math.sin(t * math.pi))
        f_draw.ellipse([px - dot_r, py - dot_r, px + dot_r, py + dot_r], fill=(r, g, b, alpha))

    # Modern rounded chevron arrowhead
    chevron_tip_x = end_x + int(4 * S)
    c_size = int(8 * S)
    f_draw.polygon([
        (chevron_tip_x, arrow_y),
        (chevron_tip_x - c_size, arrow_y - c_size + 1),
        (chevron_tip_x - int(c_size * 0.45), arrow_y),
        (chevron_tip_x - c_size, arrow_y + c_size - 1)
    ], fill=(70, 180, 255, 240))

    canvas = Image.alpha_composite(canvas, flow_layer)

    # 7. Floating Glass Pill Badge
    badge_text = "DRAG TO INSTALL"
    badge_bbox = font_badge.getbbox(badge_text)
    badge_w = badge_bbox[2] - badge_bbox[0]
    badge_h = badge_bbox[3] - badge_bbox[1]

    pill_pad_x = int(14 * S)
    pill_pad_y = int(6 * S)
    pill_w = badge_w + pill_pad_x * 2
    pill_h = badge_h + pill_pad_y * 2
    pill_x = (W - pill_w) // 2
    pill_y = arrow_y - pill_h - int(18 * S)

    pill_panel = create_liquid_glass_squircle(
        pill_w, pill_h,
        fill_rgba=(22, 24, 32, 175),
        border_rgba=(255, 255, 255, 38),
        border_width=1
    )
    canvas.paste(pill_panel, (pill_x, pill_y), pill_panel)

    draw = ImageDraw.Draw(canvas)
    draw.text(
        (pill_x + pill_pad_x, pill_y + pill_pad_y - 1),
        badge_text,
        font=font_badge,
        fill=(235, 238, 245, 220)
    )

    # 8. Subtle footer
    footer_text = "bokra • Habit & Routine Architecture for macOS"
    ft_bbox = draw.textbbox((0, 0), footer_text, font=font_footer)
    ft_w = ft_bbox[2] - ft_bbox[0]
    ft_x = (W - ft_w) // 2
    ft_y = H - int(28 * S)
    draw.text((ft_x, ft_y), footer_text, font=font_footer, fill=(90, 96, 110, 160))

    # Save outputs
    out_2x = "src-tauri/assets/dmg-background@2x.png"
    out_1x = "src-tauri/assets/dmg-background.png"

    canvas.save(out_2x, "PNG")

    canvas_1x = canvas.resize((660, 400), Image.Resampling.LANCZOS)
    canvas_1x.save(out_1x, "PNG")

    print("✅ Successfully generated authentic bokra Retina background with perfect breathing room!")

if __name__ == "__main__":
    generate_background()
