import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebasePhoneAuth } from '@/lib/firebase';
import { api } from '@/lib/api';
import { unregisterCurrentPushToken } from '@/lib/pushNotifications';
import { UserProfile, AuthState } from '@/types';

type FirebaseAuthContextType = {
  state: AuthState;
  setError: (message: string | null) => void;
  checkPhoneExists: (phone: string) => Promise<{ exists: boolean; error?: string }>;
  signUpWithPhone: (phone: string, password: string) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  loginWithPhone: (phone: string, password: string) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  sendFirebaseOTP: (phone: string) => Promise<{ success: boolean; verificationId?: string; error?: string }>;
  verifyFirebaseOTP: (verificationId: string, otp: string, phone: string, password?: string) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  /** After OTP; does not set session until password is reset */
  verifyPhoneForPasswordReset: (
    verificationId: string,
    otp: string,
    phone: string
  ) => Promise<{
    success: boolean;
    firebaseIdToken?: string | null;
    verificationId?: string;
    error?: string;
  }>;
  resetPasswordWithFirebase: (
    phone: string,
    newPassword: string,
    firebaseIdToken: string | null,
    verificationId: string
  ) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  clearFirebasePhoneSession: () => Promise<void>;
  completeProfile: (data: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const FirebaseAuthContext = createContext<FirebaseAuthContextType | undefined>(undefined);
const AUTH_USER_STORAGE_KEY = 'auth_user_v1';
/** Same key as login.tsx — cleared on logout so signup OTP state cannot resume wrongly */
const PENDING_PHONE_AUTH_KEY = 'chitrakala_pending_phone_auth_v1';

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });
  const [hydrated, setHydrated] = useState(false);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_USER_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as UserProfile;
        if (!parsed?.id) {
          await AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY);
          return;
        }

        const profileResult = await api.getProfile(String(parsed.id));
        if (profileResult?.success && profileResult?.user) {
          if (!isMounted) return;
          setState((prev) => ({ ...prev, user: profileResult.user, error: null }));
        } else {
          await AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY);
        }
      } catch (error) {
        console.warn('Session hydrate failed:', error);
      } finally {
        if (!isMounted) return;
        setHydrated(true);
        setState((prev) => ({ ...prev, loading: false }));
      }
    };

    hydrateSession();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const persistUser = async () => {
      try {
        if (state.user) {
          await AsyncStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(state.user));
        } else {
          await AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY);
        }
      } catch (error) {
        console.warn('Session persistence failed:', error);
      }
    };
    persistUser();
  }, [state.user, hydrated]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const setError = useCallback((message: string | null) => {
    setState(prev => ({ ...prev, error: message }));
  }, []);

  /**
   * Check if phone number exists in database
   */
  const checkPhoneExists = useCallback(async (phone: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const result = await api.checkPhoneExists(phone);

      if (!result.success && result.error) {
        return { exists: false, error: result.error };
      }

      return { exists: result.exists || false };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check phone number';
      return { exists: false, error: message };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  /**
   * Sign up: Create account in backend first, then send Firebase OTP
   */
  const signUpWithPhone = useCallback(async (phone: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Step 1: Create account in your backend
      const signUpResult = await api.signUp(phone, password);

      if (!signUpResult.success) {
        const errorMessage = signUpResult.error || 'Sign up failed';
        setState(prev => ({ ...prev, error: errorMessage }));
        return { success: false, error: errorMessage };
      }

      // Store user from backend
      if (signUpResult.user) {
        setState(prev => ({ ...prev, user: signUpResult.user }));
        return { success: true, user: signUpResult.user };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      setState(prev => ({ ...prev, error: message }));
      return { success: false, error: message };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  /**
   * Login: Verify credentials in backend
   * If user doesn't exist, returns error with requiresSignup flag
   */
  const loginWithPhone = useCallback(async (phone: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const result = await api.login(phone, password);

      if (!result.success) {
        // Check if this is a "not registered" error
        if (result.requiresSignup) {
          const errorMessage = 'Phone number not registered. Please sign up first.';
          setState(prev => ({ ...prev, error: errorMessage }));
          return { success: false, error: errorMessage, requiresSignup: true };
        }
        
        const errorMessage = result.error || 'Invalid phone or password';
        setState(prev => ({ ...prev, error: errorMessage }));
        return { success: false, error: errorMessage };
      }

      if (result.user) {
        setState(prev => ({ ...prev, user: result.user, error: null }));
        return { success: true, user: result.user };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      console.error('Login error:', err);
      setState(prev => ({ ...prev, error: message }));
      return { success: false, error: message };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  /**
   * Send OTP via Firebase
   * Returns verificationId needed for OTP verification
   */
  const sendFirebaseOTP = useCallback(async (phone: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Format phone number
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const isDevRuntime = typeof __DEV__ !== 'undefined' && __DEV__;

      console.log('🔵 sendFirebaseOTP: Starting OTP send for', formattedPhone);

      // Mobile-first Firebase flow: send OTP from client SDK.
      let otpResult;
      try {
        otpResult = await firebasePhoneAuth.sendOTP(formattedPhone);
        console.log('🔵 sendFirebaseOTP: Firebase result', { 
          hasVerificationId: !!otpResult?.verificationId, 
          error: otpResult?.error 
        });
      } catch (firebaseError: any) {
        console.error('🔴 sendFirebaseOTP: Firebase threw exception', firebaseError);
        const errorMessage = firebaseError?.message || firebaseError?.toString() || 'Firebase error occurred';
        if (!isDevRuntime) {
          setState(prev => ({ ...prev, error: errorMessage }));
          return { success: false, error: errorMessage };
        }
        // In dev, try fallback
        otpResult = { error: errorMessage };
      }

      if (!otpResult.error && otpResult.verificationId) {
        console.log('✅ sendFirebaseOTP: Success, verificationId received');
        return { success: true, verificationId: otpResult.verificationId };
      }

      // For release/testing of real OTP, do not use test-mode backend fallback.
      // Keep fallback only in local dev runtime for easier debugging.
      if (!isDevRuntime) {
        const errorMessage = otpResult.error || 'Failed to send OTP';
        console.error('🔴 sendFirebaseOTP: Failed in Release mode', errorMessage);
        setState(prev => ({ ...prev, error: errorMessage }));
        return { success: false, error: errorMessage };
      }

      console.log('🟡 sendFirebaseOTP: Trying backend fallback');
      const fallbackResult = await api.sendFirebaseOTP(formattedPhone, true);
      if (fallbackResult.success && fallbackResult.verificationId) {
        return { success: true, verificationId: fallbackResult.verificationId };
      }

      const errorMessage = otpResult.error || fallbackResult.error || 'Failed to send OTP';
      setState(prev => ({ ...prev, error: errorMessage }));
      return { success: false, error: errorMessage };
    } catch (err) {
      console.error('🔴 sendFirebaseOTP: Unexpected error', err);
      const message = err instanceof Error ? err.message : 'Failed to send OTP';
      setState(prev => ({ ...prev, error: message }));
      return { success: false, error: message };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  /**
   * Verify Firebase OTP
   * @param password - Optional. Required for new user signup (account created after OTP verification)
   */
  const verifyFirebaseOTP = useCallback(async (verificationId: string, otp: string, phone: string, password?: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const isDevRuntime = typeof __DEV__ !== 'undefined' && __DEV__;

      // Test-mode fallback is allowed only in local dev runtime.
      if (verificationId === 'test-mode' && isDevRuntime) {
        const result = await api.verifyFirebaseOTP({ phone, verificationId, password });
        if (!result.success) {
          const errorMessage = result.error || 'OTP verification failed';
          setState(prev => ({ ...prev, error: errorMessage }));
          return { success: false, error: errorMessage };
        }

        if (result.user) {
          setState(prev => ({ ...prev, user: result.user, error: null }));
          return { success: true, user: result.user };
        }

        return { success: true };
      }

      // Real Firebase OTP verification: verify in client, then validate token in backend.
      const firebaseResult = await firebasePhoneAuth.verifyOTP(verificationId, otp);
      if (!firebaseResult.success) {
        const msg = firebaseResult.error || 'Invalid OTP';
        setState(prev => ({ ...prev, error: msg }));
        return { success: false, error: msg };
      }

      const firebaseIdToken = await firebasePhoneAuth.getIdToken();
      if (!firebaseIdToken) {
        const msg = 'Failed to get Firebase token. Please try again.';
        setState(prev => ({ ...prev, error: msg }));
        return { success: false, error: msg };
      }

      const result = await api.verifyFirebaseOTP({ phone, firebaseIdToken, verificationId, password });
      if (!result.success) {
        const errorMessage = result.error || 'OTP verification failed';
        setState(prev => ({ ...prev, error: errorMessage }));
        return { success: false, error: errorMessage };
      }

      if (result.user) {
        setState(prev => ({ ...prev, user: result.user, error: null }));
        return { success: true, user: result.user };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OTP verification failed';
      setState(prev => ({ ...prev, error: message }));
      return { success: false, error: message };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const verifyPhoneForPasswordReset = useCallback(
    async (verificationId: string, otp: string, phone: string) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        const isDevRuntime = typeof __DEV__ !== 'undefined' && __DEV__;

        if (verificationId === 'test-mode' && isDevRuntime) {
          const result = (await api.verifyPhoneForReset({ phone, verificationId })) as {
            success?: boolean;
            error?: string;
          };
          if (!result.success) {
            const errorMessage = result.error || 'Verification failed';
            setState(prev => ({ ...prev, error: errorMessage }));
            return { success: false as const, error: errorMessage };
          }
          return { success: true as const, firebaseIdToken: null as string | null, verificationId };
        }

        const firebaseResult = await firebasePhoneAuth.verifyOTP(verificationId, otp);
        if (!firebaseResult.success) {
          const msg = firebaseResult.error || 'Invalid OTP';
          setState(prev => ({ ...prev, error: msg }));
          return { success: false as const, error: msg };
        }

        const firebaseIdToken = await firebasePhoneAuth.getIdToken();
        if (!firebaseIdToken) {
          const msg = 'Failed to get Firebase token. Please try again.';
          setState(prev => ({ ...prev, error: msg }));
          return { success: false as const, error: msg };
        }

        const result = (await api.verifyPhoneForReset({
          phone,
          firebaseIdToken,
          verificationId,
        })) as { success?: boolean; error?: string };
        if (!result.success) {
          const errorMessage = result.error || 'Verification failed';
          setState(prev => ({ ...prev, error: errorMessage }));
          return { success: false as const, error: errorMessage };
        }

        return { success: true as const, firebaseIdToken, verificationId };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Verification failed';
        setState(prev => ({ ...prev, error: message }));
        return { success: false as const, error: message };
      } finally {
        setState(prev => ({ ...prev, loading: false }));
      }
    },
    []
  );

  const resetPasswordWithFirebase = useCallback(
    async (
      phone: string,
      newPassword: string,
      firebaseIdToken: string | null,
      verificationId: string
    ) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const result = (await api.resetPassword({
          phone,
          newPassword,
          verificationId,
          ...(firebaseIdToken ? { firebaseIdToken } : {}),
        })) as { success?: boolean; user?: UserProfile; error?: string };

        if (!result.success) {
          const errMsg = result.error || 'Failed to reset password';
          setState(prev => ({ ...prev, error: errMsg }));
          return { success: false as const, error: errMsg };
        }

        await firebasePhoneAuth.signOut();

        const user = result.user;
        if (user) {
          setState(prev => ({ ...prev, user, error: null }));
        }

        return { success: true as const, user };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to reset password';
        setState(prev => ({ ...prev, error: message }));
        return { success: false as const, error: message };
      } finally {
        setState(prev => ({ ...prev, loading: false }));
      }
    },
    []
  );

  const clearFirebasePhoneSession = useCallback(async () => {
    await firebasePhoneAuth.signOut();
  }, []);

  /**
   * Complete user profile
   */
  const completeProfile = useCallback(async (data: Partial<UserProfile>) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const user = stateRef.current.user;
      if (!user?.id) {
        const msg = 'No user logged in';
        setState(prev => ({ ...prev, error: msg }));
        return { success: false, error: msg };
      }

      const result = await api.completeProfile(String(user.id), data);

      if (!result.success) {
        const errMsg = result.error || 'Failed to update profile';
        setState(prev => ({ ...prev, error: errMsg }));
        return { success: false, error: errMsg };
      }

      if (result.user) {
        setState(prev => ({ ...prev, user: result.user, error: null }));
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setState(prev => ({ ...prev, error: message }));
      return { success: false, error: message };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    await unregisterCurrentPushToken();
    await firebasePhoneAuth.signOut();
    try {
      await AsyncStorage.removeItem(PENDING_PHONE_AUTH_KEY);
    } catch {
      /* ignore */
    }
    setState({ user: null, loading: false, error: null });
  }, []);

  return (
    <FirebaseAuthContext.Provider
      value={{
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
        logout,
        clearError,
      }}
    >
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);
  if (!context) {
    throw new Error('useFirebaseAuth must be used within FirebaseAuthProvider');
  }
  return context;
}
