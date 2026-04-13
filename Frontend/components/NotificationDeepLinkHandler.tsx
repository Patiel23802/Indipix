import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';

const PENDING_CATEGORY_KEY = '@chitrakala/pending_notification_category_slug';

function extractCategorySlug(remoteMessage: { data?: Record<string, string> } | null | undefined): string | null {
  const d = remoteMessage?.data;
  if (!d) return null;
  const raw = d.category_slug ?? d.categorySlug;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return raw.trim();
}

/**
 * Stores category slug from FCM when user opens a push, then navigates to /home?openCategory=…
 * once auth is ready (or after login).
 */
export function NotificationDeepLinkHandler() {
  const router = useRouter();
  const { state } = useFirebaseAuth();
  const handledInitialRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let messaging: { (): { onNotificationOpenedApp: (cb: (m: any) => void) => () => void; getInitialNotification: () => Promise<any> } } | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      messaging = require('@react-native-firebase/messaging').default;
    } catch {
      return;
    }

    const persistSlug = async (slug: string) => {
      await AsyncStorage.setItem(PENDING_CATEGORY_KEY, slug);
    };

    const handleOpen = async (remoteMessage: { data?: Record<string, string> } | null | undefined) => {
      const slug = extractCategorySlug(remoteMessage);
      if (slug) await persistSlug(slug);
    };

    const sub = messaging().onNotificationOpenedApp(handleOpen);

    if (!handledInitialRef.current) {
      handledInitialRef.current = true;
      messaging()
        .getInitialNotification()
        .then((msg) => {
          if (msg) return handleOpen(msg);
        })
        .catch(() => {});
    }

    return () => sub();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (state.loading) return;
    if (!state.user) return;

    let cancelled = false;
    (async () => {
      const slug = await AsyncStorage.getItem(PENDING_CATEGORY_KEY);
      if (!slug || cancelled) return;
      await AsyncStorage.removeItem(PENDING_CATEGORY_KEY);
      router.replace(`/home?openCategory=${encodeURIComponent(slug)}` as any);
    })();

    return () => {
      cancelled = true;
    };
  }, [state.loading, state.user?.id, router]);

  return null;
}
