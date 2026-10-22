#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_PATH="$PROJECT_ROOT/src-tauri/target/release/bundle/macos/bokra.app"
OUTPUT_DMG="$HOME/Desktop/bokra.dmg"
TEMP_DMG="/tmp/bokra_rw.dmg"
STAGING_DIR="/tmp/bokra_dmg_staging"
VOL_NAME="bokra"

echo "🎨 Step 1: Generating high-resolution Retina background..."
python3 "$PROJECT_ROOT/scripts/create_dmg_background.py"
sips -s dpiWidth 144 -s dpiHeight 144 "$PROJECT_ROOT/src-tauri/assets/dmg-background@2x.png" > /dev/null
sips -s dpiWidth 72 -s dpiHeight 72 "$PROJECT_ROOT/src-tauri/assets/dmg-background.png" > /dev/null

echo "📦 Step 2: Preparing staging folder..."
rm -rf "$STAGING_DIR" "$TEMP_DMG" "$OUTPUT_DMG"
mkdir -p "$STAGING_DIR"

# Copy bokra.app
cp -R "$APP_PATH" "$STAGING_DIR/bokra.app"

# Create Applications shortcut link
ln -s /Applications "$STAGING_DIR/Applications"

# Calculate required size (in MB) with 30% padding
SIZE_MB=$(du -sm "$STAGING_DIR" | awk '{print int($1 * 1.3) + 20}')

echo "💾 Step 3: Creating temporary writable DMG (${SIZE_MB}MB)..."
hdiutil create -srcfolder "$STAGING_DIR" -volname "$VOL_NAME" -fs HFS+ -fsargs "-c c=64,a=16,e=16" -format UDRW -size "${SIZE_MB}m" "$TEMP_DMG"

echo "🔌 Step 4: Mounting DMG..."
# Detach any existing mounted volumes with the same name
hdiutil detach "/Volumes/$VOL_NAME" -force 2>/dev/null || true

MOUNT_OUTPUT=$(hdiutil attach -readwrite -noverify -noautoopen "$TEMP_DMG")
DEV_NAME=$(echo "$MOUNT_OUTPUT" | grep -E '^/dev/' | head -n 1 | awk '{print $1}')
MOUNT_DIR="/Volumes/$VOL_NAME"

echo "Mounted at $MOUNT_DIR ($DEV_NAME)"
sleep 1

# Copy custom assets into mounted volume
mkdir -p "$MOUNT_DIR/.background"
cp "$PROJECT_ROOT/src-tauri/assets/dmg-background.png" "$MOUNT_DIR/.background/background.png"
cp "$PROJECT_ROOT/src-tauri/assets/dmg-background@2x.png" "$MOUNT_DIR/.background/background@2x.png"

if [[ -f "$PROJECT_ROOT/src-tauri/icons/icon.icns" ]]; then
  cp "$PROJECT_ROOT/src-tauri/icons/icon.icns" "$MOUNT_DIR/.VolumeIcon.icns"
  SetFile -c icnC "$MOUNT_DIR/.VolumeIcon.icns" || true
  SetFile -a C "$MOUNT_DIR" || true
fi

echo "✨ Step 5: Applying Finder custom layout and aesthetics..."
osascript <<EOF
tell application "Finder"
  set d to disk "$VOL_NAME"
  open d
  set w to container window of d
  set current view of w to icon view
  set toolbar visible of w to false
  set statusbar visible of w to false
  set bounds of w to {200, 120, 860, 520}
  
  set opts to icon view options of w
  set icon size of opts to 128
  set text size of opts to 12
  set arrangement of opts to not arranged
  set background picture of opts to file ".background:background.png" of d
  
  set position of item "bokra.app" of w to {180, 185}
  set position of item "Applications" of w to {480, 185}
  
  close w
  open d
  update d without registering applications
  delay 2
end tell
EOF

# Hide background folder and volume icon
SetFile -a V "$MOUNT_DIR/.background" || true
SetFile -a V "$MOUNT_DIR/.VolumeIcon.icns" 2>/dev/null || true

# Sync changes to disk
sync
sleep 2

echo "🔒 Step 6: Finalizing and unmounting..."
hdiutil detach "$DEV_NAME" -force

echo "🚀 Step 7: Converting to compressed read-only UDZO DMG..."
hdiutil convert "$TEMP_DMG" -format UDZO -imagekey zlib-level=9 -o "$OUTPUT_DMG"

# Clean up temporary files
rm -rf "$TEMP_DMG" "$STAGING_DIR"

echo "✅ DMG created successfully at: $OUTPUT_DMG"
