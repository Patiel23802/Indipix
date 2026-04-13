import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { FirebaseAuthProvider } from '@/context/FirebaseAuthContext';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationDeepLinkHandler } from '@/components/NotificationDeepLinkHandler';
import { getDefaultStackScreenOptions } from '@/lib/navigationScreenOptions';

// Ensure native splash is hidden once the app is ready (fixes blank screen in Release)
SplashScreen.preventAutoHideAsync?.();

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function RootLayoutContent() {
  useFrameworkReady();

  useEffect(() => {
    // Hide native splash after first paint to avoid a white flash
    const t = setTimeout(() => {
      SplashScreen.hideAsync?.();
    }, 200);
    return () => clearTimeout(t);
  }, []);

  const rootStackOptions = getDefaultStackScreenOptions();

  return (
    <>
      <Stack screenOptions={rootStackOptions}>
        <Stack.Screen
          name="index"
          options={{
            animation: 'fade',
            animationDuration: Platform.OS !== 'web' ? 380 : undefined,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            animation: 'fade',
            animationDuration: Platform.OS !== 'web' ? 320 : undefined,
            animationTypeForReplace: 'push',
          }}
        />
        <Stack.Screen name="home" options={{ animationTypeForReplace: 'push' }} />
        <Stack.Screen name="profile" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="+not-found" options={{ animation: 'fade' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

function ReleaseErrorFallback({ error }: { error: Error }) {
  if (__DEV__) throw error;
  console.error('[RootLayout] Release error:', error?.message, error?.stack);
  return (
    <View style={releaseErrorStyles.container}>
      <Text style={releaseErrorStyles.title}>Something went wrong</Text>
      <Text style={releaseErrorStyles.message}>{error?.message ?? 'Unknown error'}</Text>
    </View>
  );
}

const releaseErrorStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#221015' },
  title: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 8 },
  message: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
});

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <ReleaseErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <RootErrorBoundary>
      <FirebaseAuthProvider>
        <AuthProvider>
          <NotificationDeepLinkHandler />
          <RootLayoutContent />
        </AuthProvider>
      </FirebaseAuthProvider>
    </RootErrorBoundary>
  );
}
