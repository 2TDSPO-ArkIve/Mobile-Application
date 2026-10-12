import React from 'react';
import { View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
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
 * reliably. Only this small card is theme-independent; the screen around it
 * still follows `ThemeContext` normally (see `CreateShareScreen`).
 */
export function ShareQrCode({ value, size = 220 }: Props) {
  return (
    <View style={styles.card}>
      <QRCode value={value} size={size} color="#000000" backgroundColor="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: radius.md,
  },
});
