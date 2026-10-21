import React, { useRef, useState } from 'react';
import { View, Text, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ListRow } from '../components/ListRow';
import { EnterShareCodeScreen } from './EnterShareCodeScreen';
import { useAuth } from '../hooks/useAuth';
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
type ScanShareQrNavigationParamList = { ConvitePaciente: undefined; InserirCodigoConvite: undefined };

/** Web has no webcam reader (P4): sharing there goes through the text code only. */
export function ScanShareQrScreen() {
  return Platform.OS === 'web' ? <EnterShareCodeScreen /> : <CameraScanner />;
}

function CameraScanner() {
  // Up to 320, never more than 45% of the window, never below the 220 scan frame plus a margin.
  const { height: windowHeight } = useWindowDimensions();
  const cameraHeight = Math.max(260, Math.min(320, windowHeight * 0.45));
  const navigation = useNavigation<NativeStackNavigationProp<ScanShareQrNavigationParamList>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { setPendingToken, markPresented } = usePendingShare();
  const { status } = useAuth();
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
        <Text style={{ color: colors.inkSecondary, textAlign: 'center', marginTop: spacing.xl }}>
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
          <Text style={{ color: colors.ink, marginBottom: spacing.md, lineHeight: 20 }}>
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
      <View style={[styles.cameraWrap, { height: cameraHeight }]}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={styles.frameOverlay} pointerEvents="none">
          <View style={[styles.frame, { borderColor: colors.onCamera }]} />
        </View>
      </View>
      <ScreenContainer>
        <Text style={{ color: colors.inkSecondary, textAlign: 'center', marginBottom: spacing.sm }}>
          {t('scanShareQr.instructions')}
        </Text>
        {scanError ? (
          <>
            <Text style={{ color: colors.error, textAlign: 'center', marginBottom: spacing.sm }}>
              {scanError}
            </Text>
            <AppButton title={t('scanShareQr.scanAgain')} variant="secondary" onPress={handleScanAgain} />
          </>
        ) : null}
        {status === 'authenticated' ? (
          <AppCard style={styles.footerCard}>
            <ListRow
              icon="keypad-outline"
              title={t('enterShareCode.entryLink')}
              onPress={() => navigation.navigate('InserirCodigoConvite')}
            />
          </AppCard>
        ) : null}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cameraWrap: { overflow: 'hidden' },
  frameOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 220,
    height: 220,
    borderWidth: 3,
    borderRadius: 20,
  },
  footerCard: { padding: 0, overflow: 'hidden', marginTop: spacing.md },
});
