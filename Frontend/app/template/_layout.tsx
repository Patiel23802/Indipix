import { Stack } from 'expo-router';
import { getDefaultStackScreenOptions } from '@/lib/navigationScreenOptions';

/**
 * Nested stack so preview → editor uses a dedicated push/pop animation (smoother than
 * flattening both onto the root stack on some devices).
 */
export default function TemplateLayout() {
  return <Stack screenOptions={getDefaultStackScreenOptions()} />;
}
