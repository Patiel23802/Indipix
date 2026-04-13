#!/usr/bin/env bash
# Builds the iOS Release JS bundle (main.jsbundle) so the app can run standalone without Metro.
# Run from project root: npm run bundle:ios
# Then build in Xcode with the Release scheme.

set -e
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

BUNDLE_DIR="$PROJECT_ROOT/ios/ReleaseBundle"
mkdir -p "$BUNDLE_DIR"

echo "Resolving app entry..."
ENTRY_FILE=$(node -e "
const p = require('@expo/config/paths');
const path = require('path');
console.log(path.resolve(p.resolveEntryPoint(process.cwd(), { platform: 'ios' })));
")
if [ -z "$ENTRY_FILE" ] || [ ! -f "$ENTRY_FILE" ]; then
  echo "Error: Could not resolve app entry. Is expo installed?" >&2
  exit 1
fi
echo "Entry file: $ENTRY_FILE"

echo "Building JS bundle with Expo..."
npx expo export:embed \
  --entry-file "$ENTRY_FILE" \
  --platform ios \
  --dev false \
  --bundle-output "$BUNDLE_DIR/main.jsbundle.tmp" \
  --assets-dest "$BUNDLE_DIR" \
  --reset-cache

# Compile with Hermes (iOS uses Hermes by default)
HERMESC="$PROJECT_ROOT/ios/Pods/hermes-engine/destroot/bin/hermesc"
if [ ! -f "$HERMESC" ]; then
  echo "Warning: hermesc not found. Using plain JS bundle. Run 'cd ios && pod install' for Hermes bytecode."
  mv "$BUNDLE_DIR/main.jsbundle.tmp" "$BUNDLE_DIR/main.jsbundle"
else
  echo "Compiling with Hermes..."
  "$HERMESC" -emit-binary -max-diagnostic-width=80 -O -out "$BUNDLE_DIR/main.jsbundle" "$BUNDLE_DIR/main.jsbundle.tmp"
  rm -f "$BUNDLE_DIR/main.jsbundle.tmp"
fi

echo "Done. Created $BUNDLE_DIR/main.jsbundle"
echo "Rebuild the app in Xcode with the Release scheme."
