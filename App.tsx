import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/query/queryClient';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { PendingShareProvider } from './src/context/PendingShareContext';
import { DeepLinkHandler } from './src/navigation/DeepLinkHandler';
import { NotificationBridge } from './src/components/NotificationBridge';
import { PushTapHandler } from './src/components/PushTapHandler';
import { I18nProvider } from './src/i18n/I18nContext';
import { RootNavigator } from './src/navigation/RootNavigator';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {/* Inside AuthProvider (unlike DeepLinkHandler, which must sit above
          it) — this needs useAuth() to gate notification polling to an
          authenticated session. */}
      <NotificationBridge />
      {/* Also needs useAuth() (to gate navigation on a confirmed session) —
          navigates via the shared navigationRef rather than needing to sit
          inside RootNavigator's own NavigationContainer subtree. */}
      <PushTapHandler />
      <RootNavigator />
    </>
  );
}

export default function App() {
  // Keys must match `fontFamilies` in src/styles/theme.ts.
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular: require('./src/assets/fonts/PlusJakartaSans_400Regular.ttf'),
    PlusJakartaSans_500Medium: require('./src/assets/fonts/PlusJakartaSans_500Medium.ttf'),
    PlusJakartaSans_600SemiBold: require('./src/assets/fonts/PlusJakartaSans_600SemiBold.ttf'),
    PlusJakartaSans_700Bold: require('./src/assets/fonts/PlusJakartaSans_700Bold.ttf'),
  });
  // A font load error falls back to the system font rather than blocking the app.
  const ready = fontsLoaded || fontError != null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ThemeProvider>
            {/* Above AuthProvider on purpose — see PendingShareContext's own
                note: a pending share token must survive every AuthStatus
                transition (including the full navigation remount on status
                change), so it cannot live inside anything AuthProvider owns. */}
            <PendingShareProvider>
              <DeepLinkHandler />
              <AuthProvider>
                <AppContent />
              </AuthProvider>
            </PendingShareProvider>
          </ThemeProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
