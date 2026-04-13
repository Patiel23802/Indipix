import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearAdminToken, getAdminToken, setAdminToken } from '../lib/api';

export type AdminRole = 'admin' | 'designer' | 'creative_head';

export type AdminUser = {
  id: number | string;
  username: string;
  email: string;
  name: string | null;
  role: AdminRole;
};

type AdminAuthContextValue = {
  user: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  isAdmin: boolean;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const token = getAdminToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.adminMe();
      if (res?.success && res.user) {
        setUser(res.user as AdminUser);
      } else {
        clearAdminToken();
        setUser(null);
      }
    } catch {
      clearAdminToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.adminLogin(username, password);
    if (!res?.success || !res.token || !res.user) {
      throw new Error((res as { error?: string })?.error || 'Login failed');
    }
    setAdminToken(res.token);
    setUser(res.user as AdminUser);
  }, []);

  const logout = useCallback(() => {
    clearAdminToken();
    setUser(null);
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshMe,
      isAdmin: user?.role === 'admin',
    }),
    [user, loading, login, logout, refreshMe]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return ctx;
}
