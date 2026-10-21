import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { spacing } from '../styles/theme';

/** The screen stays up only while the server is asleep; retrying this often is cheap. */
const AUTO_RETRY_MS = 15000;

/**
 * Shown when a stored credential exists but the backend couldn't be reached
 * to confirm it (Render cold start, dropped connection, 5xx) — distinct from
 * "unauthenticated", so the veterinarian isn't asked to log in again just
 * because the server was briefly asleep.
 */
export function BackendUnavailableScreen() {
  const { refreshUser } = useAuth();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [retrying, setRetrying] = useState(false);
  const busy = useRef(false);

  const handleRetry = async () => {
    if (busy.current) return;
    busy.current = true;
    setRetrying(true);
    await refreshUser();
    busy.current = false;
    setRetrying(false);
  };

  // A cold start takes tens of seconds; keep knocking so the person doesn't have to.
  useEffect(() => {
    const id = setInterval(handleRetry, AUTO_RETRY_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenContainer>
        <View style={styles.center}>
          <EmptyState
            title={t('backendUnavailable.title')}
            message={`${t('backendUnavailable.message')} ${t('backendUnavailable.autoRetry')}`}
            actionLabel={t('common.tryAgain')}
            onAction={handleRetry}
            actionLoading={retrying}
          />
        </View>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
});
