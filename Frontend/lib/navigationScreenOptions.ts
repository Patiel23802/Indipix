import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

/** Matches primary app surfaces (home, editor) to avoid flash between transitions */
export const STACK_CONTENT_BACKGROUND = '#FFFFFF';

/**
 * Defaults tuned for a native feel: iOS keeps system transitions; Android uses an iOS-style
 * horizontal push so pushes match iOS. Web skips native-only animation props.
 */
export function getDefaultStackScreenOptions(
  overrides?: NativeStackNavigationOptions
): NativeStackNavigationOptions {
  const base: NativeStackNavigationOptions = {
    headerShown: false,
    contentStyle: { backgroundColor: STACK_CONTENT_BACKGROUND },
  };

  if (Platform.OS === 'web') {
    return { ...base, ...overrides };
  }

  return {
    ...base,
    animation: Platform.OS === 'android' ? 'ios_from_right' : 'default',
    animationDuration: 300,
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
    ...overrides,
  };
}
