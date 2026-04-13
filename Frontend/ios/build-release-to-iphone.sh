#!/bin/bash
# Build Release version and install to your connected iPhone (standalone app, no Metro needed)
set -e
cd "$(dirname "$0")"
WORKSPACE="boltexponativewind.xcworkspace"
SCHEME="boltexponativewind"
DESTINATION="id=00008120-000415E13EF8A01E"

echo "⚠️  Note: Release builds may fail due to expo-dev-launcher compatibility."
echo "   If it fails, use Xcode GUI instead (Edit Scheme → Release → ⌘R)"
echo ""
echo "Building Release app (this may take a few minutes)..."
echo ""

# Try to build Release, but skip expo-dev-launcher if it fails
xcodebuild -workspace "$WORKSPACE" -scheme "$SCHEME" \
  -destination "$DESTINATION" \
  -configuration Release \
  -allowProvisioningUpdates \
  build 2>&1 | tee /tmp/xcodebuild-release.log

# Check if build succeeded
if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo ""
  echo "❌ Build failed. This is likely because expo-dev-launcher doesn't support Release builds."
  echo ""
  echo "✅ Solution: Use Xcode GUI instead:"
  echo "   1. Open: open boltexponativewind.xcodeproj"
  echo "   2. Click scheme dropdown → Edit Scheme..."
  echo "   3. Run → Build Configuration → Release"
  echo "   4. Press ⌘R to build"
  echo ""
  echo "   Xcode GUI handles Release builds better than terminal."
  exit 1
fi

echo ""
echo "Locating built app..."
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "boltexponativewind.app" -path "*/Release-iphoneos/*" 2>/dev/null | head -1)
if [ -z "$APP_PATH" ]; then
  echo "Could not find built app. Try opening Xcode and building once from the Product menu."
  exit 1
fi

echo "Installing to iPhone..."
xcrun devicectl device install app --device 00008120-000415E13EF8A01E "$APP_PATH"

echo ""
echo "✅ Done! The app should launch on your iPhone."
echo "   This is a standalone Release build - no Metro or Wi‑Fi needed!"
