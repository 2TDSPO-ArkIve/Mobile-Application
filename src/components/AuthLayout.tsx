import React from 'react';
import {
  View,
  Text,
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
import { useTranslation } from '../i18n/useTranslation';
import { spacing, radius, font } from '../styles/theme';

interface Props {
  /** Share of the window height the `accent` panel takes on phone and tablet. */
  panelHeight: number;
  children: React.ReactNode;
}

/**
 * Login and Cadastro shell: `accent` panel with the ArkIve wordmark on top
 * and the form on `surface` below; on wide windows, panel on the left (2/5)
 * and the form in a card of up to 400 px on the right (3/5).
 */
export function AuthLayout({ panelHeight, children }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = useBreakpoint() === 'wide';
  const { t } = useTranslation();
  const panelMinHeight = height * panelHeight;
  // The wordmark runs about 3.4 font sizes wide; this fills ~80% of the panel.
  const wordSize = wide ? Math.min(width * 0.4 * 0.24, 180) : Math.min(width * 0.24, panelMinHeight * 0.45, 120);
  const wordStyle = [styles.word, { fontSize: wordSize, lineHeight: wordSize * 1.1, letterSpacing: wordSize * -0.04, color: colors.onInk }];

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
            wide ? styles.panelWide : { minHeight: panelMinHeight },
            { backgroundColor: colors.accent, paddingTop: insets.top },
          ]}
        >
          {/* Same wordmark as the engine's home page: the logo stands in for
              the "I". The wrapper OWNS the glyph's size, never the Image:
              on web, react-native-web injects the asset's intrinsic
              dimensions into the Image's own style. */}
          <View accessible accessibilityRole="header" accessibilityLabel={t('common.appName')} style={styles.wordmark}>
            <Text style={wordStyle} importantForAccessibility="no">Ark</Text>
            <View
              style={{
                width: wordSize * 0.9,
                height: wordSize * 0.9,
                marginLeft: wordSize * -0.04,
                marginRight: wordSize * -0.07,
                marginBottom: wordSize * 0.14,
              }}
            >
              <Image
                source={require('../assets/branding/definitive-square.png')}
                style={styles.glyph}
                resizeMode="contain"
                // The PNG has a real alpha channel, so tintColor only recolors
                // the glyph, never the transparent background.
                tintColor={colors.onInk}
              />
            </View>
            <Text style={wordStyle} importantForAccessibility="no">ve</Text>
          </View>
        </View>

        <View style={[styles.formSide, wide && styles.formWide, { paddingBottom: insets.bottom + spacing.lg }]}>
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
  panelWide: { flex: 2 },
  formWide: { flex: 3 },
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
  wordmark: { flexDirection: 'row', alignItems: 'flex-end' },
  word: { ...font('bold') },
  glyph: { width: '100%', height: '100%' },
});
