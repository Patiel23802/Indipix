#!/bin/bash
# Stream logs from your iPhone to see app crashes and errors

echo "📱 Streaming logs from Vedant's iPhone..."
echo "   Filtering for: boltexponativewind, com.chitrakala.app, Firebase, OTP"
echo "   Press Ctrl+C to stop"
echo ""

# Stream system logs and filter for our app
log stream --predicate 'processImagePath contains "boltexponativewind" OR processImagePath contains "Chitrakala" OR messageText contains "Firebase" OR messageText contains "OTP" OR messageText contains "🔴" OR messageText contains "🔵" OR messageText contains "sendFirebaseOTP" OR messageText contains "checkPhoneExists"' --level=debug --style=compact 2>&1 | grep -i -E "(boltexponativewind|chitrakala|firebase|otp|🔴|🔵|sendFirebaseOTP|checkPhoneExists|error|exception|crash)" --color=always
