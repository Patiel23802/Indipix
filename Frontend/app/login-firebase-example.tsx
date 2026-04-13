/**
 * Example Login Flow with Firebase Phone Authentication
 * 
 * This is an example showing how to integrate Firebase OTP
 * Copy the necessary parts to your actual login.tsx
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import { LoginSignUpTabs } from '@/components/LoginSignUpTabs';
import { OTPVerification } from '@/components/OTPVerification';
import { ProfileDetails } from '@/components/ProfileDetails';
import { SelectCategory } from '@/components/SelectCategory';
import { SelectLanguage } from '@/components/SelectLanguage';
import { ProfileCompletedModal } from '@/components/ProfileCompletedModal';

type Screen = 'auth' | 'otp' | 'profile' | 'category' | 'language';

interface TempProfileData {
  title: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  alternate_phone: string;
  category: string;
  language: string;
}

export default function FirebaseAuthFlow() {
  const router = useRouter();
  const { 
    state, 
    signUpWithPhone, 
    loginWithPhone, 
    sendFirebaseOTP, 
    verifyFirebaseOTP, 
    completeProfile, 
    clearError 
  } = useFirebaseAuth();

  const [currentScreen, setCurrentScreen] = useState<Screen>('auth');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [tempData, setTempData] = useState<Partial<TempProfileData>>({
    title: 'Mr.',
    category: 'individual',
    language: 'en',
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (state.user && state.user.profile_complete) {
      router.replace('/home');
    }
  }, [state.user, router]);

  /**
   * Handle Sign Up or Login
   * For signup, we create account then send Firebase OTP
   * For login, we verify credentials first
   */
  const handleAuthSubmit = async (isLogin: boolean, phone: string, password: string) => {
    clearError();
    setPhoneNumber(phone);

    if (isLogin) {
      // Login flow: verify credentials
      const result = await loginWithPhone(phone, password);

      if (result.success) {
        if (result.user?.profile_complete) {
          // User with complete profile can login directly
          router.replace('/home');
          return;
        } else {
          // Profile incomplete, go to category selection
          setCurrentScreen('category');
          return;
        }
      }
    } else {
      // Sign up flow: create account then send OTP
      const signUpResult = await signUpWithPhone(phone, password);

      if (signUpResult.success) {
        // After successful signup, send Firebase OTP
        const otpResult = await sendFirebaseOTP(phone);
        
        if (otpResult.success && otpResult.verificationId) {
          setVerificationId(otpResult.verificationId || '');
          setCurrentScreen('otp');
        }
      }
    }
  };

  /**
   * Handle OTP Verification with Firebase
   */
  const handleOTPVerify = async (otp: string) => {
    clearError();
    
    // For testing without Firebase token (development mode)
    // In production, you'd get the Firebase ID token from the client
    const result = await verifyFirebaseOTP(verificationId, otp, phoneNumber);
    
    if (result.success) {
      if (result.user?.profile_complete) {
        router.replace('/home');
      } else {
        // After OTP verification, go to category selection
        setCurrentScreen('category');
      }
    }
  };

  const handleProfileSubmit = async (data: {
    title: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    alternate_phone: string;
    email?: string;
    state?: string;
    district?: string;
    tahsil?: string;
    designation?: string;
    political_party?: string;
    profile_photo_url?: string;
  }) => {
    clearError();
    
    const finalData = {
      ...tempData,
      ...data,
    };
    
    const result = await completeProfile(finalData as Partial<any>);
    if (result.success) {
      setShowSuccessModal(true);
    }
  };

  const handleCategorySubmit = async (category: string) => {
    clearError();
    setTempData(prev => ({ ...prev, category }));
    setCurrentScreen('language');
  };

  const handleLanguageSubmit = async (language: string) => {
    clearError();
    setTempData(prev => ({ ...prev, language }));
    setCurrentScreen('profile');
  };

  const handleGoHome = () => {
    setShowSuccessModal(false);
    router.replace('/home');
  };

  const handleBackFromOTP = () => {
    setCurrentScreen('auth');
    clearError();
  };

  return (
    <View style={styles.container}>
      {/* Firebase reCAPTCHA container (invisible, required for web) */}
      <div id="recaptcha-container" style={{ display: 'none' }} />

      {currentScreen === 'auth' && (
        <LoginSignUpTabs
          onLoginSubmit={(phone, password) => handleAuthSubmit(true, phone, password)}
          onSignUpSubmit={(phone, password) => handleAuthSubmit(false, phone, password)}
          loading={state.loading}
          error={state.error}
        />
      )}

      {currentScreen === 'otp' && (
        <OTPVerification
          phone={phoneNumber}
          onVerify={handleOTPVerify}
          onBack={handleBackFromOTP}
          loading={state.loading}
          error={state.error}
        />
      )}

      {currentScreen === 'profile' && (
        <ProfileDetails
          phone={phoneNumber}
          onContinue={handleProfileSubmit}
          loading={state.loading}
          error={state.error}
        />
      )}

      {currentScreen === 'category' && (
        <SelectCategory
          onContinue={handleCategorySubmit}
          loading={state.loading}
          error={state.error}
        />
      )}

      {currentScreen === 'language' && (
        <SelectLanguage
          onContinue={handleLanguageSubmit}
          loading={state.loading}
          error={state.error}
        />
      )}

      <ProfileCompletedModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onGoHome={handleGoHome}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#221015',
  },
});

/**
 * IMPLEMENTATION NOTES:
 * 
 * 1. To use this in your app:
 *    - Update app/_layout.tsx to use FirebaseAuthProvider instead of AuthProvider
 *    - Replace your current login.tsx with this file (or merge the logic)
 * 
 * 2. For native apps (React Native):
 *    - Consider using @react-native-firebase/auth for better performance
 *    - Web Firebase SDK works but is optimized for web
 * 
 * 3. Testing:
 *    - Use Firebase Console test phone numbers for development
 *    - Backend has fallback mode if Firebase token is not provided
 * 
 * 4. Production:
 *    - Get actual Firebase ID token after OTP verification
 *    - Pass it to verifyFirebaseOTP for server-side validation
 */
