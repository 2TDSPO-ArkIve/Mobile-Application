import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/query/queryClient';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { PendingShareProvider } from './src/context/PendingShareContext';
import { DeepLinkHandler } from './src/navigation/DeepLinkHandler';
import { NotificationBridge } from './src/components/NotificationBridge';
import { I18nProvider } from './src/i18n/I18nContext';
import { RootNavigator } from './src/navigation/RootNavigator';

function AppContent() {
  const { mode } = useTheme();
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {/* Inside AuthProvider (unlike DeepLinkHandler, which must sit above
          it) — this needs useAuth() to gate notification polling to an
          authenticated session. */}
      <NotificationBridge />
      <RootNavigator />
    </>
  );
}

export default function App() {
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
