# -*- coding: utf-8 -*-
import os

project_root = os.getcwd()
universal_app = os.path.join(project_root, "src-tauri/target/universal-apple-darwin/release/bundle/macos/bokra.app")
release_app = os.path.join(project_root, "src-tauri/target/release/bundle/macos/bokra.app")
app_path = universal_app if os.path.exists(universal_app) else release_app
icon_path = os.path.join(project_root, "src-tauri/icons/icon.icns")
bg_path = os.path.join(project_root, "src-tauri/assets/dmg-background.png")

# 1. Volume & Content
volume_name = "bokra"

# Volume icon
if os.path.exists(icon_path):
    icon = icon_path
    badge_icon = icon_path

# Files to copy
files = [app_path]

# Standard Applications symlink
symlinks = {"Applications": "/Applications"}

# 2. Topographic Panoramic Background
background = bg_path

# 3. Window geometry (Generous widescreen bounds)
window_rect = ((120, 80), (1000, 560))

# 4. Icon locations - shifted upwards and balanced vertically
icon_locations = {
    "bokra.app": (280, 200),
    "Applications": (640, 200)
}

# 5. Finder view options
default_view = "icon-view"
icon_size = 128
text_size = 12

show_status_bar = False
show_tab_view = False
show_toolbar = False
show_pathbar = False
show_sidebar = False

# 6. Format
format = "UDZO"
compression_level = 9
