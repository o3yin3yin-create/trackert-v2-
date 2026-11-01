#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

build_one_dmg() {
  local ARCH="$1"
  local APP_PATH=""
  local OUTPUT_DMG=""

  local PKG_VER=$(node -p "require('./package.json').version" 2>/dev/null || echo "0.1.1")
  if [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
    APP_PATH="$PROJECT_ROOT/src-tauri/target/aarch64-apple-darwin/release/bundle/macos/bokra.app"
    if [ ! -d "$APP_PATH" ]; then
      APP_PATH="$PROJECT_ROOT/src-tauri/target/release/bundle/macos/bokra.app"
    fi
    OUTPUT_DMG="$HOME/Desktop/bokra_${PKG_VER}_aarch64.dmg"
    echo "Building DMG for Apple Silicon (ARM64 / M-series)..."
  elif [ "$ARCH" = "x64" ] || [ "$ARCH" = "x86_64" ] || [ "$ARCH" = "intel" ]; then
    APP_PATH="$PROJECT_ROOT/src-tauri/target/x86_64-apple-darwin/release/bundle/macos/bokra.app"
    OUTPUT_DMG="$HOME/Desktop/bokra_${PKG_VER}_x64.dmg"
    echo "Building DMG for Intel (x86_64)..."
  else
    echo "Unknown architecture: $ARCH"
    exit 1
  fi

  if [ ! -d "$APP_PATH" ]; then
    echo "Error: App bundle not found at: $APP_PATH"
    return 1
  fi

  echo "Generating Retina background..."
  python3 "$PROJECT_ROOT/scripts/create_dmg_background.py"

  echo "Detaching any existing bokra volumes..."
  hdiutil detach "/Volumes/bokra" -force 2>/dev/null || true
  rm -f "$OUTPUT_DMG"

  echo "Running dmgbuild for $ARCH..."
  cd "$PROJECT_ROOT"
  DMG_APP_PATH="$APP_PATH" dmgbuild -s "$PROJECT_ROOT/scripts/dmg_settings.py" "bokra" "$OUTPUT_DMG"

  echo "DMG created successfully at: $OUTPUT_DMG"
}

TARGET_ARCH="${1:-all}"

if [ "$TARGET_ARCH" = "all" ]; then
  if [ -d "$PROJECT_ROOT/src-tauri/target/aarch64-apple-darwin/release/bundle/macos/bokra.app" ] || [ -d "$PROJECT_ROOT/src-tauri/target/release/bundle/macos/bokra.app" ]; then
    build_one_dmg "arm64"
  fi
  if [ -d "$PROJECT_ROOT/src-tauri/target/x86_64-apple-darwin/release/bundle/macos/bokra.app" ]; then
    build_one_dmg "x64"
  fi
else
  build_one_dmg "$TARGET_ARCH"
fi
