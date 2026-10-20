import React from 'react';
import { View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useThemeColors } from '../hooks/useThemeColors';
import { radius, spacing } from '../styles/theme';

interface Props {
  /** The full value to encode — e.g. the result of `buildPatientShareUrl(token)`. This component has no idea what a "share" or a "token" is; it only renders whatever string it's given. Presentation only, no API/creation/redemption knowledge. */
  value: string;
  size?: number;
}

/**
 * Deliberately a fixed white background + black foreground, independent of
 * the app's light/dark theme — QR scanners need reliable high contrast, and
 * a QR rendered in this app's dark-mode palette risks failing to scan
 * reliably. Only the inner white quiet zone is theme-independent; it sits in
 * a themed `surface` card so the dark theme frames it.
 */
export function ShareQrCode({ value, size = 220 }: Props) {
  const colors = useThemeColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={styles.quietZone}>
        <QRCode value={value} size={size} color="#000000" backgroundColor="#FFFFFF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quietZone: { backgroundColor: '#FFFFFF', padding: spacing.md, borderRadius: radius.md },
});
