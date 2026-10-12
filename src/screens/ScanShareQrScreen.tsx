import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppButton } from '../components/AppButton';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { usePendingShare } from '../context/PendingShareContext';
import { parsePatientShareUrl } from '../utils/shareLink';
import { spacing } from '../styles/theme';

/**
 * QR scanning only (`barcodeTypes: ['qr']`) — never logs scanned content,
 * never calls preview/redeem directly. A scanned value is parsed through the
 * exact same `parsePatientShareUrl` the deep-link handler uses; on a valid
 * ArkIve link, the token goes into `PendingShareContext` and this screen
 * hands off to the one shared `SharePreviewScreen` — there is no separate
 * "scanner preview".
 *
 * `navigation.replace` (not `navigate`) on a successful scan: a native-stack
 * navigator keeps previous screens mounted by default, and leaving this
 * screen mounted in the background would leave its camera active. Replacing
 * it instead unmounts the camera immediately and correctly, and there is no
 * reason to navigate "back" into a scanner that already did its job.
 */
type ScanShareQrNavigationParamList = { ConvitePaciente: undefined };

export function ScanShareQrScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ScanShareQrNavigationParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { setPendingToken, markPresented } = usePendingShare();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanError, setScanError] = useState('');
  const scanLockedRef = useRef(false);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanLockedRef.current) return;
    scanLockedRef.current = true;

    const token = parsePatientShareUrl(result.data);
    if (!token) {
      setScanError(t('scanShareQr.invalidQr'));
      return;
    }

    setPendingToken(token);
    // Marked presented BEFORE navigating: this screen performs the
    // navigation itself, so a still-mounted root screen beneath it (Login,
    // Home, MeusAnimais) must not ALSO auto-navigate via
    // usePendingShareAutoReturn once this same token change reaches it.
    markPresented(token);
    navigation.replace('ConvitePaciente');
  };

  const handleScanAgain = () => {
    setScanError('');
    scanLockedRef.current = false;
  };

  if (!permission) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('scanShareQr.title')} />
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>
          {t('scanShareQr.checkingPermission')}
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title={t('scanShareQr.title')} />
        <ScreenContainer>
          <Text style={{ color: colors.text, marginBottom: spacing.md, lineHeight: 20 }}>
            {permission.canAskAgain
              ? t('scanShareQr.permissionExplanation')
              : t('scanShareQr.permissionDeniedPermanently')}
          </Text>
          {permission.canAskAgain ? (
            <AppButton title={t('scanShareQr.requestPermission')} onPress={requestPermission} />
          ) : null}
        </ScreenContainer>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('scanShareQr.title')} />
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={styles.frameOverlay} pointerEvents="none">
          <View style={[styles.frame, { borderColor: '#FFFFFF' }]} />
        </View>
      </View>
      <ScreenContainer>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.sm }}>
          {t('scanShareQr.instructions')}
        </Text>
        {scanError ? (
          <>
            <Text style={{ color: colors.error, textAlign: 'center', marginBottom: spacing.sm }}>
              {scanError}
            </Text>
            <AppButton title={t('scanShareQr.scanAgain')} variant="outline" onPress={handleScanAgain} />
          </>
        ) : null}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cameraWrap: {
    height: 320,
    overflow: 'hidden',
  },
  frameOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 220,
    height: 220,
    borderWidth: 3,
    borderRadius: 16,
  },
});
