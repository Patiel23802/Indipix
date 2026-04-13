#!/bin/bash
# Build the app and install to your connected iPhone (run this in Terminal)
set -e
cd "$(dirname "$0")"
WORKSPACE="boltexponativewind.xcworkspace"
SCHEME="boltexponativewind"
DESTINATION="id=00008120-000415E13EF8A01E"

echo "Building app (this may take a few minutes)..."
xcodebuild -workspace "$WORKSPACE" -scheme "$SCHEME" \
  -destination "$DESTINATION" \
  -configuration Debug \
  -allowProvisioningUpdates \
  build

echo ""
echo "Locating built app..."
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "boltexponativewind.app" -path "*/Build/Products/*" 2>/dev/null | head -1)
if [ -z "$APP_PATH" ]; then
  echo "Could not find built app. Try opening Xcode and building once from the Product menu."
  exit 1
fi

echo "Installing to iPhone..."
xcrun devicectl device install app --device 00008120-000415E13EF8A01E "$APP_PATH"

echo ""
echo "Done. The app should launch on your iPhone."
