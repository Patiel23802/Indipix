#!/usr/bin/env bash
# Builds a release APK for Android.
# Run from project root: npm run build:apk
# Output: android/app/build/outputs/apk/release/app-release.apk
#
# No custom keystore required; uses the project's debug keystore.

set -e
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Check for Java (required for Gradle)
if ! command -v java &>/dev/null; then
  echo "Error: Java is not installed. Android build requires a Java Runtime." >&2
  echo "" >&2
  echo "Install Java 17 (recommended for this project):" >&2
  echo "  brew install openjdk@17" >&2
  echo "  echo 'export PATH=\"/opt/homebrew/opt/openjdk@17/bin:\$PATH\"' >> ~/.zshrc" >&2
  echo "  source ~/.zshrc" >&2
  echo "" >&2
  echo "Then run: npm run build:apk" >&2
  exit 1
fi

if [ ! -d "android" ]; then
  echo "Error: android/ folder not found. Run 'npx expo prebuild --platform android' first." >&2
  exit 1
fi

# Ensure Android SDK location is set (Gradle reads android/local.properties)
if [ -n "${ANDROID_HOME:-}" ] && [ -d "$ANDROID_HOME" ]; then
  ANDROID_SDK_ROOT="$ANDROID_HOME"
elif [ -d "$HOME/Android/Sdk" ]; then
  ANDROID_SDK_ROOT="$HOME/Android/Sdk"
elif [ -d "$HOME/Library/Android/sdk" ]; then
  ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
else
  ANDROID_SDK_ROOT="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
fi
if [ ! -d "$ANDROID_SDK_ROOT" ]; then
  echo "Error: Android SDK not found at: $ANDROID_SDK_ROOT" >&2
  echo "" >&2
  echo "Install the Android SDK first:" >&2
  echo "  1. Install Android Studio: https://developer.android.com/studio" >&2
  echo "  2. Open Android Studio → Settings → Android SDK, and install SDK (default location is fine)." >&2
  echo "  3. Set ANDROID_HOME (typical paths):" >&2
  echo "     Linux:  export ANDROID_HOME=\$HOME/Android/Sdk" >&2
  echo "     macOS:  export ANDROID_HOME=\$HOME/Library/Android/sdk" >&2
  echo "     export PATH=\$ANDROID_HOME/platform-tools:\$PATH" >&2
  echo "" >&2
  echo "If your SDK is elsewhere, set ANDROID_HOME to that path and run this script again." >&2
  exit 1
fi

LOCAL_PROPERTIES="$PROJECT_ROOT/android/local.properties"
echo "sdk.dir=$ANDROID_SDK_ROOT" > "$LOCAL_PROPERTIES"

# React Native 0.81+ ships "hermes" in osx-bin but the build expects "hermesc". Create symlink if missing.
HERMES_OSX_BIN="$PROJECT_ROOT/node_modules/react-native/sdks/hermesc/osx-bin"
if [ -d "$HERMES_OSX_BIN" ] && [ -f "$HERMES_OSX_BIN/hermes" ] && [ ! -f "$HERMES_OSX_BIN/hermesc" ]; then
  ln -sf hermes "$HERMES_OSX_BIN/hermesc"
  echo "Created hermesc symlink for macOS build."
fi

# Remove macOS quarantine so Gatekeeper doesn't block "hermes" / "hermesc" (avoids "could not verify" dialog).
if [[ "$(uname -s)" == "Darwin" ]] && [ -d "$HERMES_OSX_BIN" ]; then
  xattr -cr "$HERMES_OSX_BIN" 2>/dev/null || true
fi

echo "Building Android release APK..."
echo "Using single ABI (arm64-v8a) to reduce memory use and avoid hermesc OOM (exit 137)."
cd android
# Stop any existing daemon so new gradle.properties memory settings take effect
./gradlew --stop 2>/dev/null || true
# Single ABI = less parallel native build = more free RAM for Hermes compiler (avoids exit 137)
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
cd "$PROJECT_ROOT"

APK_PATH="$PROJECT_ROOT/android/app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
  echo ""
  echo "Done. APK created at:"
  echo "  $APK_PATH"
  echo ""
  echo "No keystore setup needed — signed with the built-in debug keystore. Suitable for local testing and sideloading."
else
  echo "Error: APK was not created at expected path." >&2
  exit 1
fi
