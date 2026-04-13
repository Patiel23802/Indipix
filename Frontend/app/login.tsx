import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import { LoginSignUpTabs } from '@/components/LoginSignUpTabs';
import { ForgotPasswordPhone } from '@/components/ForgotPasswordPhone';
import { SetNewPasswordForm } from '@/components/SetNewPasswordForm';
import { OTPVerification } from '@/components/OTPVerification';
import { ProfileDetails } from '@/components/ProfileDetails';
import { SelectCategory } from '@/components/SelectCategory';
import { SelectLanguage } from '@/components/SelectLanguage';
import { ProfileCompletedModal } from '@/components/ProfileCompletedModal';

type Screen = 'auth' | 'otp' | 'profile' | 'category' | 'language' | 'forgot_phone' | 'forgot_new_password';

/** Survives app background / Android activity recreate while user reads the SMS OTP */
const PENDING_PHONE_AUTH_KEY = 'chitrakala_pending_phone_auth_v1';
const PENDING_PHONE_AUTH_TTL_MS = 30 * 60 * 1000;

type PendingPhoneAuth = {
  verificationId: string;
  phoneNumber: string;
  isSignupMode: boolean;
  /** Needed for signup verify call; cleared as soon as OTP succeeds or user cancels */
  password?: string;
  flow?: 'signup' | 'reset';
  savedAt: number;
};

async function clearPendingPhoneAuth() {
  try {
    await AsyncStorage.removeItem(PENDING_PHONE_AUTH_KEY);
  } catch {
    /* ignore */
  }
}

async function savePendingPhoneAuth(data: Omit<PendingPhoneAuth, 'savedAt'>) {
  const payload: PendingPhoneAuth = { ...data, savedAt: Date.now() };
  try {
    await AsyncStorage.setItem(PENDING_PHONE_AUTH_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

interface TempProfileData {
  title: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  alternate_phone: string;
  category: string;
  language: string;
}

export default function AuthFlow() {
  const router = useRouter();
  const { 
    state, 
    setError,
    checkPhoneExists,
    signUpWithPhone, 
    loginWithPhone, 
    sendFirebaseOTP, 
    verifyFirebaseOTP,
    verifyPhoneForPasswordReset,
    resetPasswordWithFirebase,
    clearFirebasePhoneSession,
    completeProfile, 
    clearError 
  } = useFirebaseAuth();
  
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [isPasswordResetFlow, setIsPasswordResetFlow] = useState(false);
  const [firebaseResetToken, setFirebaseResetToken] = useState<string | null>(null);
  const [resetVerificationId, setResetVerificationId] = useState('');
  const [tempData, setTempData] = useState<Partial<TempProfileData>>({
    title: 'Mr.',
    category: 'individual',
    language: 'en',
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (state.user && state.user.profile_complete) {
      clearPendingPhoneAuth();
      router.replace('/home');
    }
  }, [state.user, router]);

  /** Restore OTP step after process death / returning from SMS app */
  useEffect(() => {
    if (state.loading) return;
    if (state.user) return;

    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PENDING_PHONE_AUTH_KEY);
        if (!raw || cancelled) return;
        const p = JSON.parse(raw) as PendingPhoneAuth;
        if (!p?.verificationId || !p?.phoneNumber) {
          await clearPendingPhoneAuth();
          return;
        }
        if (Date.now() - (p.savedAt || 0) > PENDING_PHONE_AUTH_TTL_MS) {
          await clearPendingPhoneAuth();
          return;
        }
        if (cancelled) return;
        setVerificationId(p.verificationId);
        setPhoneNumber(p.phoneNumber);
        setIsSignupMode(!!p.isSignupMode);
        setIsPasswordResetFlow(p.flow === 'reset');
        if (p.password) setPassword(p.password);
        setCurrentScreen('otp');
      } catch {
        await clearPendingPhoneAuth();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state.loading, state.user]);

  /**
   * Handle Login Flow
   * 1. User enters phone and password
   * 2. Verify credentials with backend
   * 3. If user not found, show error and suggest signup
   * 4. If profile incomplete, go to category selection
   * 5. If profile complete, go to home
   */
  const handleLogin = async (phone: string, pwd: string) => {
    clearError();
    setPhoneNumber(phone);
    setPassword(pwd);

    const result = await loginWithPhone(phone, pwd);

    if (result.success) {
      await clearPendingPhoneAuth();
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
    
    // If login failed, error will be shown by LoginSignUpTabs
    // User should check credentials or switch to signup
  };

  /**
   * Handle Sign Up Flow
   * 1. User enters phone and password
   * 2. Check if phone already exists
   * 3. Send Firebase OTP (DO NOT create account yet)
   * 4. Verify OTP
   * 5. THEN create account after OTP verified
   * 6. Complete profile
   */
  const handleSignUp = async (phone: string, pwd: string) => {
    try {
      clearError();
      setPhoneNumber(phone);
      setPassword(pwd);
      setIsSignupMode(true);

      console.log('🔵 handleSignUp: Starting signup for', phone);

      // Step 1: Check if phone already exists
      let checkResult;
      try {
        checkResult = await checkPhoneExists(phone);
        console.log('🔵 handleSignUp: checkPhoneExists result', { exists: checkResult.exists, error: checkResult.error });
      } catch (checkError: any) {
        console.error('🔴 handleSignUp: checkPhoneExists threw exception', checkError);
        const errorMessage = checkError?.message || 'Failed to check phone number';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
      
      if (checkResult.exists) {
        // Phone already registered, show error
        setError('Phone number already registered. Please login instead.');
        return {
          success: false,
          error: 'Phone number already registered. Please login instead.'
        };
      }

      // Step 2: Send Firebase OTP FIRST (before creating account)
      let otpResult;
      try {
        console.log('🔵 handleSignUp: Calling sendFirebaseOTP');
        otpResult = await sendFirebaseOTP(phone);
        console.log('🔵 handleSignUp: sendFirebaseOTP result', { success: otpResult.success, hasVerificationId: !!otpResult.verificationId, error: otpResult.error });
      } catch (otpError: any) {
        console.error('🔴 handleSignUp: sendFirebaseOTP threw exception', otpError);
        const errorMessage = otpError?.message || 'Failed to send OTP';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
      
      if (otpResult.success && otpResult.verificationId) {
        console.log('✅ handleSignUp: Success, moving to OTP screen');
        setVerificationId(otpResult.verificationId);
        await savePendingPhoneAuth({
          verificationId: otpResult.verificationId,
          phoneNumber: phone,
          isSignupMode: true,
          password: pwd,
          flow: 'signup',
        });
        setCurrentScreen('otp');
        return { success: true };
      }
      const errorMessage = otpResult.error || 'Failed to send OTP';
      console.error('🔴 handleSignUp: OTP send failed', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } catch (err: any) {
      console.error('🔴 handleSignUp: Unexpected error', err);
      const errorMessage = err?.message || 'Signup failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Forgot password: send OTP to registered number
   */
  const handleForgotPasswordSendOtp = async (phone: string) => {
    clearError();
    const checkResult = await checkPhoneExists(phone);
    if (checkResult.error) {
      setError(checkResult.error);
      return;
    }
    if (!checkResult.exists) {
      setError('No account found for this number. Try signing up instead.');
      return;
    }

    const otpResult = await sendFirebaseOTP(phone);
    if (!otpResult.success || !otpResult.verificationId) {
      setError(otpResult.error || 'Failed to send OTP');
      return;
    }

    setPhoneNumber(phone);
    setPassword('');
    setIsSignupMode(false);
    setIsPasswordResetFlow(true);
    setVerificationId(otpResult.verificationId);
    await savePendingPhoneAuth({
      verificationId: otpResult.verificationId,
      phoneNumber: phone,
      isSignupMode: false,
      flow: 'reset',
    });
    setCurrentScreen('otp');
  };

  /**
   * Handle OTP Verification with Firebase
   * After OTP verified, backend creates account automatically (if password provided)
   */
  const handleOTPVerify = async (otp: string) => {
    clearError();

    if (isPasswordResetFlow) {
      const result = await verifyPhoneForPasswordReset(verificationId, otp, phoneNumber);
      if (!result.success) {
        return;
      }
      await clearPendingPhoneAuth();
      setFirebaseResetToken(result.firebaseIdToken ?? null);
      setResetVerificationId(result.verificationId || verificationId);
      setCurrentScreen('forgot_new_password');
      return;
    }

    // Verify OTP with Firebase - backend will create account if password provided (signup flow)
    const result = await verifyFirebaseOTP(
      verificationId, 
      otp, 
      phoneNumber,
      isSignupMode ? password : undefined // Pass password only for signup flow
    );
    
    if (!result.success) {
      // Error already set by verifyFirebaseOTP
      return;
    }

    await clearPendingPhoneAuth();

    // Navigate based on profile status
    if (result.user?.profile_complete) {
      router.replace('/home');
    } else {
      // After OTP verification and account creation, go to category selection
      setCurrentScreen('category');
    }
  };

  const handleNewPasswordAfterReset = async (newPassword: string) => {
    clearError();
    const result = await resetPasswordWithFirebase(
      phoneNumber,
      newPassword,
      firebaseResetToken,
      resetVerificationId || verificationId
    );
    if (!result.success) {
      return;
    }
    setFirebaseResetToken(null);
    setResetVerificationId('');
    setIsPasswordResetFlow(false);
    if (result.user?.profile_complete) {
      router.replace('/home');
    } else {
      setCurrentScreen('category');
    }
  };

  const handleBackFromForgotPhone = () => {
    clearError();
    setCurrentScreen('auth');
  };

  const handleBackFromNewPassword = async () => {
    clearError();
    await clearFirebasePhoneSession();
    setFirebaseResetToken(null);
    setResetVerificationId('');
    setIsPasswordResetFlow(false);
    setCurrentScreen('auth');
  };

  /**
   * Handle Profile Details Submission
   */
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
    // Combine all data: category, language, and profile details
    const finalData = {
      ...tempData,
      ...data,
    };
    
    const result = await completeProfile(finalData as Partial<any>);
    if (result.success) {
      setShowSuccessModal(true);
    } else if (result.error) {
      setError(result.error);
    }
  };

  /**
   * Handle Category Selection
   */
  const handleCategorySubmit = async (category: string) => {
    clearError();
    setTempData(prev => ({
      ...prev,
      category,
    }));
    setCurrentScreen('language');
  };

  /**
   * Handle Language Selection
   */
  const handleLanguageSubmit = async (language: string) => {
    clearError();
    setTempData(prev => ({
      ...prev,
      language,
    }));
    // After language selection, go to profile details
    setCurrentScreen('profile');
  };

  /**
   * Handle navigation to home after profile completion
   */
  const handleGoHome = () => {
    setShowSuccessModal(false);
    router.replace('/home');
  };

  /**
   * Handle back from OTP screen
   */
  const handleBackFromOTP = () => {
    const wasResetFlow = isPasswordResetFlow;
    clearPendingPhoneAuth();
    setIsPasswordResetFlow(false);
    setCurrentScreen(wasResetFlow ? 'forgot_phone' : 'auth');
    setIsSignupMode(false);
    clearError();
  };

  const handleOpenForgotPassword = () => {
    clearError();
    setCurrentScreen('forgot_phone');
  };

  return (
    <View style={styles.container}>
      {currentScreen === 'auth' && (
        <LoginSignUpTabs
          onLoginSubmit={handleLogin}
          onSignUpSubmit={handleSignUp}
          onForgotPassword={handleOpenForgotPassword}
          loading={state.loading}
          error={state.error}
        />
      )}

      {currentScreen === 'forgot_phone' && (
        <ForgotPasswordPhone
          onSendOtp={handleForgotPasswordSendOtp}
          onBack={handleBackFromForgotPhone}
          loading={state.loading}
          error={state.error}
        />
      )}

      {currentScreen === 'forgot_new_password' && (
        <SetNewPasswordForm
          phoneDisplay={phoneNumber.replace(/(\d{5})(\d{5})$/, '$1*****')}
          onSubmit={handleNewPasswordAfterReset}
          onBack={handleBackFromNewPassword}
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
          testMode={verificationId === 'test-mode'}
          variant={isPasswordResetFlow ? 'password_reset' : 'default'}
        />
      )}

      {currentScreen === 'profile' && (
        <ProfileDetails
          phone={phoneNumber}
          category={typeof tempData?.category === 'string' ? tempData.category : null}
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
    backgroundColor: '#221015', // backgroundDark
  },
});
