import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { UserProfile, AuthState } from '@/types';

type AuthContextType = {
  state: AuthState;
  signUp: (phone: string, password: string) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  login: (phone: string, password: string) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  sendOTP: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOTP: (phone: string, otp: string) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  completeProfile: (data: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: false,
    error: null,
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const signUp = useCallback(async (phone: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const result = await api.signUp(phone, password);

      if (!result.success) {
        const errorMessage = result.error || 'Sign up failed';
        setState(prev => ({ ...prev, error: errorMessage }));
        return { success: false, error: errorMessage };
      }

      if (result.user) {
        setState(prev => ({ ...prev, user: result.user, error: null }));
        return { success: true, user: result.user };
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

  const login = useCallback(async (phone: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const result = await api.login(phone, password);

      if (!result.success) {
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

  const sendOTP = useCallback(async (phone: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const result = await api.sendOTP(phone);

      if (!result.success) {
        return { success: false, error: result.error || 'Failed to send OTP' };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP';
      return { success: false, error: message };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const verifyOTP = useCallback(async (phone: string, otp: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const result = await api.verifyOTP(phone, otp);

      if (!result.success) {
        const errorMessage = result.error || 'Invalid OTP';
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

  const logout = useCallback(async () => {
    setState({ user: null, loading: false, error: null });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        state,
        signUp,
        login,
        sendOTP,
        verifyOTP,
        completeProfile,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
