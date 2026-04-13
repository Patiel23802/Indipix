#!/bin/bash

# Script to set up API URL for mobile development with Expo Go
# This detects your local IP and sets it in .env.local

echo "🔍 Detecting local IP address..."

# Try to detect local IP (works on macOS and Linux)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    LOCAL_IP=$(hostname -I | awk '{print $1}')
else
    echo "❌ Unsupported OS. Please set EXPO_PUBLIC_API_URL manually."
    exit 1
fi

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Could not detect local IP address."
    echo "Please set EXPO_PUBLIC_API_URL manually in .env.local"
    exit 1
fi

API_URL="http://${LOCAL_IP}:3000/api"

echo "✅ Detected local IP: $LOCAL_IP"
echo "📝 Setting API URL to: $API_URL"

# Create .env file (Expo reads this automatically)
cat > .env << EOF
EXPO_PUBLIC_API_URL=$API_URL
EOF

echo ""
echo "✅ Created .env file"
echo ""
echo "⚠️  IMPORTANT: Make sure your backend is running on port 3000"
echo "   Run this command in the backend directory:"
echo "   cd ../backend && npm start"
echo ""
echo "📱 Now you can run: npm run dev"
echo "   And connect your Expo Go app on your mobile device"
echo ""
echo "🔒 Make sure your mobile device and computer are on the same WiFi network!"

