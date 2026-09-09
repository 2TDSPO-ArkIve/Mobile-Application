import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { lightColors } from '../styles/colors';
import { AuthStack } from './AuthStack';
import { AppStack } from './AppStack';
import { BackendUnavailableScreen } from '../screens/BackendUnavailableScreen';
import { MandatoryPasswordChangeScreen } from '../screens/MandatoryPasswordChangeScreen';
import type { RootStackParamList } from '../interfaces/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { status } = useAuth();

  if (status === 'initializing') {
    // Whether this resolves to Login (forced light) or the authenticated
    // app (the user's real theme preference) isn't known yet — defaulting
    // this transient spinner to light avoids a dark->light flash for the
    // common case of a signed-out device with a previously-saved dark
    // preference, at the cost of a brief light->dark flash for a
    // dark-mode user staying logged in, which reads as ordinary splash
    // behavior rather than a visible glitch.
    return (
      <View style={[styles.loading, { backgroundColor: lightColors.background }]}>
        <ActivityIndicator size="large" color={lightColors.primary} />
      </View>
    );
  }

  // A stored credential exists but couldn't be confirmed against the
  // backend — never fall through to the login screen here, that would ask
  // for a password that may well still be correct.
  if (status === 'unreachable') {
    return <BackendUnavailableScreen />;
  }

  return (
    // On web, `NavigationContainer` sets `document.title` itself by default
    // (`useDocumentTitle`, active even with no `linking` prop) — falling
    // back to the raw internal route name whenever a screen doesn't set its
    // own `options.title` (none in this app do). That's what produced
    // malformed tab titles like the bare route name "InsightArkive"
    // (PascalCase, no branding) instead of anything resembling "ArkIve".
    // This app has no screen-aware web-title mechanism, so rather than add
    // one, `documentTitle` is disabled outright — `document.title` then
    // simply keeps the correct static "ArkIve" already set in
    // `web/index.html` (a single app-wide title, not per-screen). No-op on
    // native (`useDocumentTitle` is a documented noop off web).
    <NavigationContainer key={status} documentTitle={{ enabled: false }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {status === 'authenticated' ? (
          <Stack.Screen name="App" component={AppStack} />
        ) : status === 'password-change-required' ? (
          <Stack.Screen name="PasswordChange" component={MandatoryPasswordChangeScreen} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
