import { Platform, PermissionsAndroid } from 'react-native';
import Constants from 'expo-constants';
import { api } from '@/lib/api';

let cachedToken: string | null = null;

async function ensureAndroidNotificationPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const apiLevel =
    typeof Platform.Version === 'number'
      ? Platform.Version
      : parseInt(String(Platform.Version), 10);
  if (apiLevel < 33) return;
  try {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  } catch (e) {
    console.warn('[push] POST_NOTIFICATIONS request failed', e);
  }
}

const isExpoGoRuntime = () => {
  if (Platform.OS === 'web') return false;
  const appOwnership = (Constants as any)?.appOwnership;
  const executionEnvironment = (Constants as any)?.executionEnvironment;
  return appOwnership === 'expo' || executionEnvironment === 'storeClient';
};

const getNativeMessaging = () => {
  if (Platform.OS === 'web' || isExpoGoRuntime()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-firebase/messaging').default;
  } catch (error) {
    return null;
  }
};

export const registerPushForUser = async (userId: string) => {
  try {
    // Run before FCM check so Android 13+ still gets POST_NOTIFICATIONS when Firebase
    // is unavailable (e.g. Expo Go) or fails to load.
    await ensureAndroidNotificationPermission();

    const messaging = getNativeMessaging();
    if (!messaging || !userId) return { success: false, skipped: true as const };

    await messaging().registerDeviceForRemoteMessages();
    const permissionStatus = await messaging().requestPermission();
    const enabled =
      permissionStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      permissionStatus === messaging.AuthorizationStatus.PROVISIONAL;
    if (!enabled) return { success: false, skipped: true as const, reason: 'permission-denied' };

    const token = await messaging().getToken();
    if (!token) return { success: false, skipped: true as const, reason: 'missing-token' };

    cachedToken = token;
    const appVersion = Constants.expoConfig?.version || null;
    const res = await api.registerPushToken({
      userId,
      token,
      platform: Platform.OS,
      appVersion: appVersion || undefined,
    });
    return { success: !!res?.success, token };
  } catch (error) {
    console.error('Push registration failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Push registration failed' };
  }
};

export const unregisterCurrentPushToken = async () => {
  try {
    if (!cachedToken) return { success: true, skipped: true as const };
    await api.unregisterPushToken(cachedToken);
    cachedToken = null;
    return { success: true };
  } catch (error) {
    console.warn('Push token unregister failed:', error);
    return { success: false };
  }
};
