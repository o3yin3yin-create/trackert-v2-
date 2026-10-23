#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image, ImageDraw

def create_monochrome_topo_dmg_background():
    # Ultra-wide panoramic canvas: 1800pt x 1000pt => 3600px x 2000px at 2x Retina
    W_PT = 1800
    H_PT = 1000
    S = 2  # Retina 2x factor
    WIDTH = W_PT * S
    HEIGHT = H_PT * S

    # 1. Generate High-Precision Vector Topographic Map
    fig, ax = plt.subplots(figsize=(W_PT / 72, H_PT / 72), dpi=72 * S)
    fig.patch.set_facecolor('#050507')
    ax.set_facecolor('#050507')

    x = np.linspace(-6.0, 6.0, 1200)
    y = np.linspace(-3.33, 3.33, 667)
    X, Y = np.meshgrid(x, y)

    # Organic topographic ridges, summits, and valleys
    Z1 = 1.5 * np.exp(-((X + 2.5)**2 + (Y - 0.5)**2) / 3.0)
    Z2 = 1.7 * np.exp(-((X - 2.8)**2 + (Y + 0.6)**2) / 3.5)
    Z3 = 1.1 * np.exp(-((0.3 * X + Y)**2) / 1.5)
    Z4 = 1.3 * np.exp(-((X + 0.2)**2 + (Y + 1.8)**2) / 2.5)
    Z5 = 0.35 * np.sin(2.0 * X + 1.0 * Y) * np.cos(1.5 * Y - 0.6 * X)
    Z6 = 0.18 * np.sin(4.0 * X - 2.0 * Y)

    Z = Z1 + Z2 + Z3 + Z4 + Z5 + Z6

    levels = np.linspace(Z.min() + 0.05, Z.max() - 0.05, 42)

    # Intermediate contours (delicate monochrome white)
    ax.contour(X, Y, Z, levels=levels[::1], colors='white', linewidths=0.75 * S, alpha=0.18)

    # Index contours (every 4th line slightly bolder)
    ax.contour(X, Y, Z, levels=levels[::4], colors='white', linewidths=1.35 * S, alpha=0.45)

    ax.set_xlim(x.min(), x.max())
    ax.set_ylim(y.min(), y.max())
    ax.axis('off')
    fig.subplots_adjust(left=0, right=1, bottom=0, top=1)

    temp_topo = '/tmp/pano_topo_dmg.png'
    fig.savefig(temp_topo, facecolor='#050507', edgecolor='none', pad_inches=0)
    plt.close(fig)

    img = Image.open(temp_topo).convert('RGBA')

    # 2. Sleek Minimalist Directional Arrow
    # Shifted upwards to match icon y=200 (visual arrow at y=185)
    arrow_layer = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    a_draw = ImageDraw.Draw(arrow_layer)

    arrow_start_x = 380 * S
    arrow_end_x = 540 * S
    arrow_y = 185 * S
    ah_len = 14 * S
    ah_w = 8 * S

    for px in range(arrow_start_x, arrow_end_x - ah_len):
        progress = (px - arrow_start_x) / max(1, (arrow_end_x - ah_len - arrow_start_x))
        alpha = int(40 + 195 * progress)
        a_draw.rectangle([px, arrow_y - 1, px + 1, arrow_y + 1], fill=(255, 255, 255, alpha))

    a_draw.polygon([
        (arrow_end_x, arrow_y),
        (arrow_end_x - ah_len, arrow_y - ah_w),
        (arrow_end_x - int(ah_len * 0.45), arrow_y),
        (arrow_end_x - ah_len, arrow_y + ah_w)
    ], fill=(255, 255, 255, 245))

    img = Image.alpha_composite(img, arrow_layer)

    # 3. Top Center: Brand Celestial Toggle Logo
    # Adjusted logo_y slightly to maintain proportional breathing room (y=45)
    logo_path = 'public/logo-transparent.png'
    if os.path.exists(logo_path):
        logo_img = Image.open(logo_path).convert('RGBA')
        target_h = int(36 * S)
        target_w = int(logo_img.width * (target_h / logo_img.height))
        logo_resized = logo_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        logo_x = 460 * S - target_w // 2
        logo_y = int(45 * S)
        img.paste(logo_resized, (logo_x, logo_y), logo_resized)

    # 4. Save Retina @2x and 1x Standard Assets as RGB
    os.makedirs('src-tauri/assets', exist_ok=True)
    out_2x = 'src-tauri/assets/dmg-background@2x.png'
    out_1x = 'src-tauri/assets/dmg-background.png'

    img_rgb = img.convert('RGB')
    img_rgb.save(out_2x, 'PNG')

    img_1x = img_rgb.resize((W_PT, H_PT), Image.Resampling.LANCZOS)
    img_1x.save(out_1x, 'PNG')

    print(f'✅ Generated Panoramic Topographic DMG background: {out_2x} & {out_1x}')

if __name__ == '__main__':
    create_monochrome_topo_dmg_background()
