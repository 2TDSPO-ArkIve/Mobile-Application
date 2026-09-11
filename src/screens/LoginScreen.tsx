import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../i18n/useTranslation';
import { lightColors } from '../styles/colors';
import type { AuthStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, radius } from '../styles/theme';
import { shadows } from '../styles/shadows';

/**
 * Login is a pre-authentication branding moment — it must look identical
 * regardless of the user's in-app dark-mode preference (a persisted toggle
 * in Settings, not the OS setting), so this screen deliberately uses the
 * fixed `lightColors` palette instead of `useThemeColors()`. Labels, input
 * text, and the logo are additionally forced to literal pure black rather
 * than the palette's `#1F2937`, and the status bar is pinned to dark icons,
 * since dark mode was otherwise turning all three light-colored here.
 *
 * `AppInput`/`AppButton` also get `colors={lightColors}` explicitly — both
 * read the app's live theme internally for their own background/border/text
 * color, so without this override those still rendered dark-mode-colored
 * (a dark input box, or an indigo-shifted "Entrar" button, inside this
 * otherwise-forced-light card) even though every other element on this
 * screen was already forced light.
 */
export function LoginScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const route = useRoute<RouteProp<AuthStackParamList, 'Login'>>();
  const { login } = useAuth();
  const { t } = useTranslation();
  const colors = lightColors;

  const [identifier, setIdentifier] = useState(route.params?.prefillIdentifier ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');

    const id = identifier.trim();

    if (!id || !password) {
      setError(t('auth.missingFields'));
      return;
    }

    setLoading(true);
    const err = await login(id, password);
    setLoading(false);

    if (err) setError(err);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
              shadows.md,
            ]}
          >
            <View style={styles.logoWrap}>
              <Image
                source={require('../assets/branding/definitive.png')}
                style={styles.logo}
                resizeMode="contain"
                // Forces the logo artwork to pure black regardless of source-asset
                // shading or theme — the PNG has a real alpha channel, so tintColor
                // only recolors the glyph itself, never the transparent background.
                tintColor="#000000"
              />
            </View>

            <AppInput
              label={t('auth.loginLabel')}
              labelColor="#000000"
              colors={lightColors}
              style={styles.inputText}
              placeholder={t('auth.loginPlaceholder')}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <AppInput
              label={t('auth.passwordLabel')}
              labelColor="#000000"
              colors={lightColors}
              style={styles.inputText}
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error ? (
              <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
            ) : null}

            <AppButton title={t('auth.loginButton')} onPress={handleLogin} loading={loading} colors={lightColors} />
          </View>

          <AppButton
            title={t('auth.createAccount')}
            variant="ghost"
            onPress={() => navigation.navigate('Cadastro')}
            style={styles.registerLink}
            colors={lightColors}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  // The wrapper OWNS the aspect ratio — never the Image itself. On web,
  // react-native-web injects the source asset's raw intrinsic dimensions
  // (1356x1160) into the Image's own style before this component's `style`
  // prop is merged; since that merge only overrides keys we actually set,
  // an Image style with `aspectRatio` but no explicit `height` leaves the
  // asset's raw height (1160) in the final computed style, and CSS ignores
  // aspect-ratio once height is already definite — producing a ~1160px-tall
  // image and a giant white card (the regression this replaced). Giving the
  // Image explicit width:100%/height:100% inside a plain View (never an
  // Image, so it never receives that intrinsic-dimension injection) avoids
  // the bug entirely.
  logoWrap: {
    // ~75% of the width of the inputs below it (same card, same padding —
    // the inputs stretch to 100% of that content width) rather than the
    // previous edge-to-edge stretch, with room to breathe on either side.
    width: '75%',
    maxWidth: 260,
    // Real asset ratio (1356x1160) — height derives from width so the mark
    // never crops or distorts regardless of screen size.
    aspectRatio: 1356 / 1160,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  inputText: { color: '#000000' },
  error: { fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.sm },
  registerLink: { marginTop: spacing.sm },
});
