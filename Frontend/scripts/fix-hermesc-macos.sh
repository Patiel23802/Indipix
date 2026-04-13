#!/usr/bin/env bash
# Creates hermesc symlink on macOS if missing (React Native 0.81+ ships "hermes" in osx-bin).
# No-op on other platforms. Run automatically via postinstall.
set -e
[[ "$(uname -s)" != "Darwin" ]] && exit 0
HERMES_BIN="$(cd "$(dirname "$0")/.." && pwd)/node_modules/react-native/sdks/hermesc/osx-bin"
[[ ! -d "$HERMES_BIN" ]] && exit 0
[[ ! -f "$HERMES_BIN/hermes" ]] && exit 0
[[ -f "$HERMES_BIN/hermesc" ]] && exit 0
ln -sf hermes "$HERMES_BIN/hermesc"
echo "Fixed: created hermesc symlink for Android build on macOS."
