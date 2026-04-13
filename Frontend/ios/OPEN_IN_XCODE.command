#!/bin/bash
# Double-click this file to open the project in Xcode
# (Uses .xcodeproj because .xcworkspace does not open properly on Xcode 26)
cd "$(dirname "$0")"
if [ -d "/Applications/Xcode.app" ]; then
  open -a Xcode "$(pwd)/boltexponativewind.xcodeproj"
  echo "Opening in Xcode..."
else
  echo "Xcode not found at /Applications/Xcode.app"
  open .
fi
