#!/bin/bash

# Script to set production API URL for mobile app build
# Usage: ./set-production-api.sh https://api.yourdomain.com/api

if [ -z "$1" ]; then
    echo "Usage: ./set-production-api.sh <API_URL>"
    echo "Example: ./set-production-api.sh https://api.yourdomain.com/api"
    exit 1
fi

API_URL=$1

echo "Setting production API URL to: $API_URL"

# Create .env.production file
cat > .env.production << EOF
EXPO_PUBLIC_API_URL=$API_URL
EOF

echo "✅ Created .env.production file"
echo ""
echo "Now you can build your app with:"
echo "  npx expo build:android"
echo ""
echo "Or with EAS:"
echo "  eas build --platform android"
echo ""
echo "The API URL will be embedded in your app build."


