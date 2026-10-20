import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { useAuth } from '../hooks/useAuth';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { usePendingShareAutoReturn } from '../hooks/useShares';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import type { AuthStackParamList } from '../interfaces/navigation';
import { spacing, fontSize, radius } from '../styles/theme';

export function LoginScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const route = useRoute<RouteProp<AuthStackParamList, 'Login'>>();
  const { login } = useAuth();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const wide = useBreakpoint() === 'wide';

  // Login is AuthStack's default/initial screen, so it's the reliable single
  // mount point to present a pending share invitation to an unauthenticated
  // visitor (a deep link tapped before ever opening the app, or a QR scanned
  // from this same screen) — see usePendingShareAutoReturn's own note.
  usePendingShareAutoReturn(navigation);

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
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: wide ? colors.background : colors.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Icons sit on the `accent` panel in both themes. */}
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, wide && styles.row]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.panel,
            wide ? styles.flex : { minHeight: height * 0.35 },
            { backgroundColor: colors.accent, paddingTop: insets.top },
          ]}
        >
          <View style={styles.logoWrap}>
            <Image
              source={require('../assets/branding/definitive.png')}
              style={styles.logo}
              resizeMode="contain"
              // The PNG has a real alpha channel, so tintColor only recolors
              // the glyph, never the transparent background.
              tintColor={colors.onInk}
            />
          </View>
        </View>

        <View style={[styles.formSide, wide && styles.flex, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View
            style={[
              styles.form,
              wide && [styles.card, { backgroundColor: colors.surface }],
            ]}
          >
            <AppInput
              label={t('auth.loginLabel')}
              placeholder={t('auth.loginPlaceholder')}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <AppInput
              label={t('auth.passwordLabel')}
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error ? (
              <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
            ) : null}

            <AppButton title={t('auth.loginButton')} onPress={handleLogin} loading={loading} />

            {/* Chunk 2: ONE unified entry point — the destination screen itself
                now offers the Veterinário | Responsável selector, replacing
                the previous two separate "Criar conta" / "Cadastro de tutor"
                buttons. */}
            <AppButton
              title={t('auth.createAccount')}
              variant="ghost"
              onPress={() => navigation.navigate('Cadastro')}
              style={styles.registerLink}
            />

            <AppButton
              title={t('scanShareQr.entryLink')}
              variant="ghost"
              size="small"
              onPress={() => navigation.navigate('EscanearConvite')}
              style={styles.registerLink}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  row: { flexDirection: 'row' },
  panel: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  formSide: {
    justifyContent: 'center',
    padding: spacing.lg,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  card: {
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  // The wrapper OWNS the aspect ratio — never the Image itself. On web,
  // react-native-web injects the source asset's raw intrinsic dimensions
  // (1356x1160) into the Image's own style before this component's `style`
  // prop is merged; since that merge only overrides keys we actually set,
  // an Image style with `aspectRatio` but no explicit `height` leaves the
  // asset's raw height (1160) in the final computed style, and CSS ignores
  // aspect-ratio once height is already definite — producing a ~1160px-tall
  // image (the regression this replaced). Giving the Image explicit
  // width:100%/height:100% inside a plain View (never an Image, so it never
  // receives that intrinsic-dimension injection) avoids the bug entirely.
  logoWrap: {
    width: '50%',
    maxWidth: 220,
    // Real asset ratio (1356x1160) — height derives from width so the mark
    // never crops or distorts regardless of screen size.
    aspectRatio: 1356 / 1160,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  error: { fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.sm },
  registerLink: { marginTop: spacing.sm },
});
