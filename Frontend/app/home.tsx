import React, { useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import { HomePage } from '@/components/HomePage';
import { registerPushForUser } from '@/lib/pushNotifications';
import {
  requestContactsPermissionOnceAfterInstall,
  requestNotificationsPermissionOnceAfterInstall,
} from '@/lib/startupPermissions';

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ openCategory?: string | string[] }>();
  const openCategorySlug = useMemo(() => {
    const v = params.openCategory;
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (Array.isArray(v) && v[0] && String(v[0]).trim()) return String(v[0]).trim();
    return undefined;
  }, [params.openCategory]);

  const { state, logout } = useFirebaseAuth();

  const clearOpenCategoryParam = useCallback(() => {
    router.setParams({ openCategory: undefined });
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleNavigate = (screen: string, params?: any) => {
    if (screen === 'profile') {
      router.push('/profile');
    } else if (screen === 'notifications') {
      router.push('/notifications' as any);
    } else if (screen === 'template' && params?.id) {
      if (params?.edit) {
        const continueParam = params?.continue === 'true' ? '?continue=true' : '';
        router.push(`/template/${params.id}/edit${continueParam}`);
      } else {
        const q = new URLSearchParams();
        if (params.category) q.set('category', params.category);
        if (params.sort === 'trending') q.set('sort', 'trending');
        if (params.source === 'liked') q.set('source', 'liked');
        const qs = q.toString();
        router.push(`/template/${params.id}${qs ? `?${qs}` : ''}`);
      }
    }
  };

  useEffect(() => {
    if (state.loading) return;
    if (!state.user) {
      router.replace('/login');
    }
  }, [state.user, state.loading, router]);

  useEffect(() => {
    if (!state.user?.id) return;
    const uid = String(state.user.id);
    let cancelled = false;

    (async () => {
      await requestNotificationsPermissionOnceAfterInstall();
      if (cancelled) return;
      await registerPushForUser(uid);
      if (cancelled) return;
      await new Promise((r) => setTimeout(r, 450));
      if (cancelled) return;
      await requestContactsPermissionOnceAfterInstall();
    })();

    return () => {
      cancelled = true;
    };
  }, [state.user?.id]);

  if (!state.user) {
    return null;
  }

  return (
    <View style={styles.container}>
      <HomePage
        user={state.user}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        initialOpenCategorySlug={openCategorySlug}
        onClearOpenCategoryParam={clearOpenCategoryParam}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#221015', // backgroundDark
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
