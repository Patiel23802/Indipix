import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Contacts from 'expo-contacts';
import * as Notifications from 'expo-notifications';

const CONTACTS_PROMPT_KEY = '@chitrakala/contacts_permission_prompted_v1';
const NOTIFICATIONS_PROMPT_KEY = '@chitrakala/notifications_permission_prompted_v1';

/**
 * One-time system prompt for alerts (iOS/Android). Uses Expo Notifications so it still runs when
 * @react-native-firebase/messaging is not loaded (e.g. Expo Go). Remote push still requires a dev/production build with FCM.
 */
export async function requestNotificationsPermissionOnceAfterInstall(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const done = await AsyncStorage.getItem(NOTIFICATIONS_PROMPT_KEY);
    if (done === '1') return;
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') {
      await AsyncStorage.setItem(NOTIFICATIONS_PROMPT_KEY, '1');
      return;
    }
    await Notifications.requestPermissionsAsync();
  } catch (e) {
    console.warn('[startupPermissions] notifications', e);
  } finally {
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_PROMPT_KEY, '1');
    } catch {
      /* ignore */
    }
  }
}

/**
 * One-time prompt for contacts after install / first home session so users don't have to
 * discover it only from Template Share. Safe to call repeatedly; runs the native request once.
 */
export async function requestContactsPermissionOnceAfterInstall(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const done = await AsyncStorage.getItem(CONTACTS_PROMPT_KEY);
    if (done === '1') return;
    await Contacts.requestPermissionsAsync();
  } catch (e) {
    console.warn('[startupPermissions] contacts', e);
  } finally {
    try {
      await AsyncStorage.setItem(CONTACTS_PROMPT_KEY, '1');
    } catch {
      /* ignore */
    }
  }
}
