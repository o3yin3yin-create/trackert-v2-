#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DMG="$HOME/Desktop/bokra.dmg"
if [ -d "$PROJECT_ROOT/src-tauri/target/universal-apple-darwin/release/bundle/macos/bokra.app" ]; then
  APP_PATH="$PROJECT_ROOT/src-tauri/target/universal-apple-darwin/release/bundle/macos/bokra.app"
  echo "📦 Using Universal macOS App Bundle (Intel x86_64 + Apple Silicon ARM64)"
elif [ -d "$PROJECT_ROOT/src-tauri/target/release/bundle/macos/bokra.app" ]; then
  APP_PATH="$PROJECT_ROOT/src-tauri/target/release/bundle/macos/bokra.app"
  echo "📦 Using Release macOS App Bundle"
else
  echo "❌ Error: bokra.app not found. Please build the app first."
  exit 1
fi

echo "🎨 Step 1: Generating high-resolution monochrome Retina background..."
python3 "$PROJECT_ROOT/scripts/create_dmg_background.py"

echo "🧹 Step 2: Cleaning old DMG mounts and artifacts..."
hdiutil detach "/Volumes/bokra" -force 2>/dev/null || true
rm -f "$OUTPUT_DMG" "$PROJECT_ROOT/bokra.dmg"

echo "🚀 Step 3: Building DMG with custom monochrome layout via dmgbuild..."
cd "$PROJECT_ROOT"
dmgbuild -s "$PROJECT_ROOT/scripts/dmg_settings.py" "bokra" "$OUTPUT_DMG"

echo "✅ DMG created successfully at: $OUTPUT_DMG"
