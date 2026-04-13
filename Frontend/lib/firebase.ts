// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Firebase configuration (chitrakalaweb1 project)
const firebaseConfig = {
  apiKey: "AIzaSyA8Y3j8pdWRqBDUSZ9J2-KWQyEA3nDAcA0",
  authDomain: "chitrakalaweb1.firebaseapp.com",
  projectId: "chitrakalaweb1",
  storageBucket: "chitrakalaweb1.firebasestorage.app",
  messagingSenderId: "291033423885",
  appId: "1:291033423885:web:ec741675333d6182b3b544",
  measurementId: "G-FWRBHVFLZP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Set language code (optional)
auth.languageCode = 'en';

// Types
export interface FirebaseOTPResult {
  verificationId: string;
  error?: string;
}

// Store native confirmation results by verificationId for OTP confirmation.
const nativeConfirmationStore = new Map<string, any>();

function getWebLocationInfo() {
  const locationObj =
    typeof window !== 'undefined' && window.location ? window.location : null;
  return {
    domain: locationObj?.hostname ?? 'unknown',
    origin: locationObj?.origin ?? 'unknown',
  };
}

function isExpoGoRuntime() {
  if (Platform.OS === 'web') return false;
  const appOwnership = (Constants as any)?.appOwnership;
  const executionEnvironment = (Constants as any)?.executionEnvironment;
  return appOwnership === 'expo' || executionEnvironment === 'storeClient';
}

function getNativeFirebaseAuth() {
  if (isExpoGoRuntime()) {
    // Expo Go does not include native react-native-firebase modules.
    return null;
  }

  try {
    // Dynamically require so web bundles are unaffected.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rnFirebaseAuth = require('@react-native-firebase/auth').default;
    return rnFirebaseAuth;
  } catch (error) {
    return null;
  }
}

// Phone authentication functions
export const firebasePhoneAuth = {
  /**
   * Send OTP to phone number
   * @param phoneNumber - Full phone number with country code (e.g., +919876543210)
   * @param recaptchaVerifier - RecaptchaVerifier instance (for web only)
   */
  sendOTP: async (
    phoneNumber: string,
    recaptchaVerifier?: RecaptchaVerifier
  ): Promise<FirebaseOTPResult> => {
    try {
      // Format phone number to international format if needed
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      
      console.log('Sending OTP to:', formattedPhone);

      // Get current domain for better error messages
      const { domain: currentDomain } = getWebLocationInfo();

      // Native mobile (Android/iOS): use react-native-firebase auth directly.
      if (Platform.OS !== 'web') {
        const nativeAuth = getNativeFirebaseAuth();
        if (!nativeAuth) {
          return {
            verificationId: '',
            error:
              'Native Firebase Auth is not available in Expo Go. Using backend fallback for OTP.',
          };
        }

        const confirmation = await nativeAuth().signInWithPhoneNumber(formattedPhone);
        if (!confirmation?.verificationId) {
          throw new Error('Firebase did not return verificationId.');
        }

        nativeConfirmationStore.set(confirmation.verificationId, confirmation);
        return { verificationId: confirmation.verificationId };
      }

      // Web uses reCAPTCHA verifier.
      if (recaptchaVerifier) {
        // Verify the recaptcha verifier is valid
        if (!recaptchaVerifier || typeof recaptchaVerifier.verify !== 'function') {
          throw new Error('Invalid reCAPTCHA verifier. Please refresh the page and try again.');
        }

        const confirmationResult = await signInWithPhoneNumber(
          auth,
          formattedPhone,
          recaptchaVerifier
        );
        
        return {
          verificationId: confirmationResult.verificationId,
        };
      } else {
        throw new Error('RecaptchaVerifier is required for web. For native, use Firebase Native Auth.');
      }
    } catch (error: any) {
      const rawMessage = String(error?.message || '');
      const nativeModuleMissing =
        rawMessage.includes('RNFBAppModule') ||
        rawMessage.includes('Native module RNFBAppModule not found') ||
        rawMessage.includes('Native Firebase Auth is not available');
      if (nativeModuleMissing) {
        // Avoid noisy redbox logs for expected Expo Go fallback path.
        console.warn('Native Firebase module unavailable, using backend OTP fallback.');
      } else {
        console.error('Send OTP error:', error);
      }
      
      // Get current domain for better error messages
      const { domain: currentDomain } = getWebLocationInfo();
      
      // Provide more specific error messages
      // Check reCAPTCHA errors FIRST (most common issue)
      let errorMessage = error.message || 'Failed to send OTP';
      
      if (error.code === 'auth/invalid-recaptcha-token' || 
          error.message?.includes('invalid-recaptcha-token') || 
          error.message?.includes('recaptcha') ||
          error.message?.includes('reCAPTCHA is not configured')) {
        errorMessage = `reCAPTCHA configuration issue detected. Please ensure reCAPTCHA site keys are properly configured in Firebase Console → Authentication → Settings → reCAPTCHA. Click "Configure site keys" and verify the Web platform key is linked. Domain "${currentDomain}" is already authorized.`;
      } else if (error.code === 'auth/invalid-app-credential' || error.code === 'auth/invalid-verification-code') {
        // Check if domain is localhost (already authorized by default)
        if (currentDomain === 'localhost' || currentDomain === '127.0.0.1') {
          errorMessage = `Firebase configuration error. Domain "${currentDomain}" is already authorized. The issue is likely reCAPTCHA configuration. Please check Firebase Console → Authentication → Settings → reCAPTCHA and ensure site keys are properly configured.`;
        } else {
          errorMessage = `Firebase domain authorization error. Please add "${currentDomain}" to Firebase Console → Authentication → Settings → Authorized domains. Also ensure reCAPTCHA is configured (Authentication > Settings > reCAPTCHA).`;
        }
      } else if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format. Please check and try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage = 'SMS quota exceeded. Please contact support.';
      } else if (error.message?.includes('invalid-app-credential') || error.code === 400 || error.message?.includes('INVALID_APP_CREDENTIAL')) {
        // Check if domain is localhost (already authorized by default)
        if (currentDomain === 'localhost' || currentDomain === '127.0.0.1') {
          errorMessage = `Firebase configuration error. Domain "${currentDomain}" is already authorized. Please check Firebase Console → Authentication → Settings → reCAPTCHA and ensure site keys are properly configured.`;
        } else {
          errorMessage = `Firebase configuration error. Domain "${currentDomain}" may not be authorized. Please add it to Firebase Console → Authentication → Settings → Authorized domains and ensure reCAPTCHA is configured.`;
        }
      }
      
      return {
        verificationId: '',
        error: errorMessage,
      };
    }
  },

  /**
   * Verify OTP code
   * @param verificationId - Verification ID received from sendOTP
   * @param otpCode - 6-digit OTP code entered by user
   */
  verifyOTP: async (verificationId: string, otpCode: string) => {
    try {
      console.log('Verifying OTP:', { verificationId, otpCode });

      if (Platform.OS !== 'web') {
        const nativeAuth = getNativeFirebaseAuth();
        if (!nativeAuth) {
          return {
            success: false,
            error:
              'Native Firebase Auth is not available in Expo Go. Please use backend fallback OTP or run a development build.',
          };
        }

        const confirmation = nativeConfirmationStore.get(verificationId);
        let result: any;

        if (confirmation?.confirm) {
          result = await confirmation.confirm(otpCode);
        } else {
          const credential = nativeAuth.PhoneAuthProvider.credential(verificationId, otpCode);
          result = await nativeAuth().signInWithCredential(credential);
        }

        nativeConfirmationStore.delete(verificationId);

        return {
          success: true,
          user: result.user,
          phoneNumber: result.user.phoneNumber,
        };
      }

      // Create credential from verification ID and OTP code
      const credential = PhoneAuthProvider.credential(verificationId, otpCode);
      
      // Sign in with the credential
      const result = await signInWithCredential(auth, credential);
      
      console.log('OTP verified successfully:', result.user.uid);
      
      return {
        success: true,
        user: result.user,
        phoneNumber: result.user.phoneNumber,
      };
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      return {
        success: false,
        error: error.message || 'Invalid OTP code',
      };
    }
  },

  /**
   * Setup invisible reCAPTCHA for web
   * @param containerId - ID of the container element for reCAPTCHA
   */
  setupRecaptcha: (containerId: string = 'recaptcha-container'): RecaptchaVerifier => {
    try {
      // Ensure we're in a browser environment
      if (typeof document === 'undefined') {
        throw new Error('reCAPTCHA can only be set up in a browser environment');
      }

      // Clear any existing reCAPTCHA widgets in the container
      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(`reCAPTCHA container with id "${containerId}" not found. Please ensure it exists in your DOM.`);
      }

      // Remove any existing reCAPTCHA widgets
      const widgets = container.querySelectorAll('iframe[src*="recaptcha"], div[data-sitekey]');
      widgets.forEach(widget => widget.remove());

      // Clear any existing verifiers
      if (container.innerHTML) {
        container.innerHTML = '';
      }

      // Get current domain for debugging
      const { domain: currentDomain } = getWebLocationInfo();
      console.log(`Setting up reCAPTCHA for domain: ${currentDomain}`);

      // Configure reCAPTCHA verifier
      // Note: Firebase automatically uses the site key from Firebase Console
      // The site key "Chitrakalarecap" configured in Firebase Console should be automatically detected
      // For invisible reCAPTCHA, Firebase handles rendering automatically when signInWithPhoneNumber is called
      const verifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved successfully');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired, user needs to solve again');
        },
        'error-callback': (error: any) => {
          console.error('reCAPTCHA error callback:', error);
        },
      });

      console.log('reCAPTCHA verifier created successfully');

      return verifier;
    } catch (error: any) {
      console.error('Error setting up reCAPTCHA:', error);
      const { domain: currentDomain } = getWebLocationInfo();
      const helpfulMessage = error.message || `Failed to initialize reCAPTCHA. Please ensure "${currentDomain}" is added to Firebase authorized domains.`;
      throw new Error(helpfulMessage);
    }
  },

  /**
   * Get current user's Firebase ID token
   */
  getIdToken: async (): Promise<string | null> => {
    try {
      if (Platform.OS !== 'web') {
        const nativeAuth = getNativeFirebaseAuth();
        if (!nativeAuth) return null;
        const user = nativeAuth().currentUser;
        if (user) {
          return await user.getIdToken();
        }
        return null;
      }

      const user = auth.currentUser;
      if (user) {
        return await user.getIdToken();
      }
      return null;
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  },

  /**
   * Sign out current user
   */
  signOut: async () => {
    try {
      if (Platform.OS !== 'web') {
        const nativeAuth = getNativeFirebaseAuth();
        if (nativeAuth) {
          await nativeAuth().signOut();
        } else {
          await auth.signOut();
        }
      } else {
        await auth.signOut();
      }
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  },
};

export default firebasePhoneAuth;
