import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, radius } from '../styles/theme';

interface Props {
  /** Share of the window height the `accent` panel takes on phone and tablet. */
  panelHeight: number;
  children: React.ReactNode;
}

/**
 * Login and Cadastro shell: `accent` panel with the logo on top and the form
 * on `surface` below; on wide windows, panel on the left and the form in a
 * card of up to 400 px on the right.
 */
export function AuthLayout({ panelHeight, children }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const wide = useBreakpoint() === 'wide';
  const panelMinHeight = height * panelHeight;

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
            wide ? styles.flex : { minHeight: panelMinHeight },
            { backgroundColor: colors.accent, paddingTop: insets.top },
          ]}
        >
          {/* The wrapper OWNS the size — never the Image itself. On web,
              react-native-web injects the asset's intrinsic dimensions
              (1356x1160) into the Image's own style, so an Image sized only by
              aspectRatio rendered ~1160px tall. A plain View with the ratio,
              and the Image at 100%/100% inside it, avoids that. */}
          <View style={[styles.logoWrap, { height: wide ? 190 : Math.min(panelMinHeight * 0.6, 190) }]}>
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
          <View style={[styles.form, wide && [styles.card, { backgroundColor: colors.surface }]]}>
            {children}
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
  // Real asset ratio (1356x1160): width derives from height, so the mark
  // never crops or distorts.
  logoWrap: { aspectRatio: 1356 / 1160 },
  logo: { width: '100%', height: '100%' },
});
