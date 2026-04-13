# Firebase Phone Authentication Setup Guide

This guide will help you integrate Firebase Phone Authentication for OTP verification in the Chitrakala app.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" or select existing project
3. Enter project name: `Chitrakala` (or your preferred name)
4. Follow the setup wizard

## Step 2: Enable Phone Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click on **Phone** provider
3. Toggle **Enable** switch
4. Save changes

## Step 3: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click on the **Web** icon (`</>`) to add a web app
4. Register your app with a nickname (e.g., "Chitrakala Web")
5. Copy the `firebaseConfig` object

## Step 4: Configure Frontend

1. Open `/var/www/Chitrakala/Frontend/lib/firebase.ts`
2. Replace the `firebaseConfig` object with your Firebase project config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

3. Update `.env` file (optional - for environment-based config):

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Step 5: Install Firebase Packages

Run in the Frontend directory:

```bash
cd /var/www/Chitrakala/Frontend
npm install firebase
```

For native mobile builds with React Native Firebase (optional, better performance):

```bash
npm install @react-native-firebase/app @react-native-firebase/auth
```

## Step 6: Setup Backend Firebase Admin SDK

Your backend needs Firebase Admin SDK to verify OTP tokens server-side.

### Install Firebase Admin in Backend:

```bash
cd /var/www/Chitrakala/backend
npm install firebase-admin
```

### Get Service Account Key:

1. In Firebase Console → **Project Settings** → **Service Accounts**
2. Click **Generate New Private Key**
3. Save the JSON file as `/var/www/Chitrakala/backend/firebase-service-account.json`
4. **IMPORTANT**: Add this file to `.gitignore` to keep it secure!

### Create Backend Firebase Service:

Create `/var/www/Chitrakala/backend/services/firebaseService.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = {
  verifyIdToken: async (idToken) => {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return { success: true, uid: decodedToken.uid, phone: decodedToken.phone_number };
    } catch (error) {
      console.error('Error verifying Firebase token:', error);
      return { success: false, error: error.message };
    }
  },

  getUser: async (uid) => {
    try {
      const userRecord = await admin.auth().getUser(uid);
      return { success: true, user: userRecord };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
```

## Step 7: Update Backend Endpoints

Add these endpoints to `/var/www/Chitrakala/backend/server.js`:

```javascript
const firebaseService = require('./services/firebaseService');

// Send Firebase OTP (mobile client handles actual sending)
app.post('/api/auth/send-firebase-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    
    // Mobile client will handle sending OTP via Firebase SDK
    // Backend just needs to acknowledge
    res.json({ 
      success: true, 
      message: 'OTP will be sent via Firebase' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify Firebase OTP
app.post('/api/auth/verify-firebase-otp', async (req, res) => {
  try {
    const { phone, firebaseIdToken } = req.body;
    
    // Verify Firebase ID token
    const verification = await firebaseService.verifyIdToken(firebaseIdToken);
    
    if (!verification.success) {
      return res.status(401).json({ success: false, error: 'Invalid Firebase token' });
    }
    
    // Check if phone matches
    if (verification.phone !== phone) {
      return res.status(401).json({ success: false, error: 'Phone number mismatch' });
    }
    
    // Get or create user in your database
    let user = await pool.query(
      'SELECT * FROM profiles WHERE phone_number = $1',
      [phone]
    );
    
    if (user.rows.length === 0) {
      // Create new user
      user = await pool.query(
        'INSERT INTO profiles (phone_number, firebase_uid) VALUES ($1, $2) RETURNING *',
        [phone, verification.uid]
      );
    } else {
      // Update Firebase UID if needed
      user = await pool.query(
        'UPDATE profiles SET firebase_uid = $1 WHERE phone_number = $2 RETURNING *',
        [verification.uid, phone]
      );
    }
    
    res.json({ 
      success: true, 
      user: user.rows[0],
      message: 'Phone verified successfully' 
    });
  } catch (error) {
    console.error('Verify Firebase OTP error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## Step 8: Add reCAPTCHA for Web (Required by Firebase)

For web version, Firebase requires reCAPTCHA verification. Add this to your login page:

```tsx
// In your login component
import { useEffect, useRef } from 'react';
import { firebasePhoneAuth } from '@/lib/firebase';

// Add invisible reCAPTCHA container
<div id="recaptcha-container"></div>

// Setup reCAPTCHA
useEffect(() => {
  if (typeof window !== 'undefined') {
    const recaptchaVerifier = firebasePhoneAuth.setupRecaptcha('recaptcha-container');
    // Store reference for later use
  }
}, []);
```

## Step 9: Update Database Schema

Add Firebase UID column to profiles table:

```sql
ALTER TABLE profiles ADD COLUMN firebase_uid VARCHAR(255);
CREATE INDEX idx_profiles_firebase_uid ON profiles(firebase_uid);
```

## Step 10: Switch to Firebase Auth Context

Update your app's root layout to use Firebase auth:

```tsx
// In app/_layout.tsx or equivalent
import { FirebaseAuthProvider } from '@/context/FirebaseAuthContext';

export default function RootLayout() {
  return (
    <FirebaseAuthProvider>
      {/* Your app components */}
    </FirebaseAuthProvider>
  );
}
```

## Testing

### Test Phone Numbers (Provided by Firebase)

Firebase allows you to configure test phone numbers for development:

1. Go to **Authentication** → **Sign-in method** → **Phone**
2. Scroll to "Phone numbers for testing"
3. Add test numbers like:
   - Phone: `+1 650-555-3434`, Code: `123456`
   - Phone: `+91 98765 43210`, Code: `123456`

### Production Notes

⚠️ **Important for Production:**

1. **Enable App Verification:**
   - iOS: Set up APNs (Apple Push Notification service)
   - Android: Add SHA-256 fingerprint in Firebase Console

2. **Set Usage Limits:**
   - Firebase has free tier limits for phone auth
   - Monitor usage in Firebase Console

3. **Enable SafetyNet (Android) / DeviceCheck (iOS):**
   - Prevents abuse of phone auth

4. **Security Rules:**
   - Implement rate limiting on backend
   - Add CAPTCHA for suspicious requests

## Troubleshooting

### "reCAPTCHA verification failed"
- Ensure reCAPTCHA container is present in DOM
- Check Firebase project settings for correct domain

### "Auth domain not whitelisted"
- Add your domain to Firebase Console → Authentication → Settings → Authorized domains

### OTP not received
- Check phone number format (+91XXXXXXXXXX)
- Verify Firebase Phone Auth is enabled
- Check Firebase Console logs for errors

### "quota exceeded"
- Firebase free tier: 10k verifications/month
- Upgrade to Blaze plan if needed

## Files Modified

- ✅ `Frontend/lib/firebase.ts` - Firebase initialization
- ✅ `Frontend/context/FirebaseAuthContext.tsx` - Auth context with Firebase
- ✅ `Frontend/lib/api.ts` - Added Firebase OTP API methods
- 🔄 `backend/server.js` - Add Firebase OTP endpoints (Step 7)
- 🔄 `backend/services/firebaseService.js` - Create this file (Step 6)

## Next Steps

1. Get Firebase credentials and update `firebase.ts`
2. Install Firebase packages (`npm install firebase`)
3. Setup backend Firebase Admin SDK
4. Add backend endpoints for Firebase OTP
5. Test with Firebase test phone numbers
6. Deploy and configure production settings
