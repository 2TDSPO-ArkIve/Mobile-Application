import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { AccessRequestDecisionModal } from '../components/AccessRequestDecisionModal';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useReceivedAccessRequests } from '../hooks/usePatientAccessRequests';
import { accessRequestStatusPresentation } from '../utils/accessRequestPresentation';
import { describeAccessRequestListError } from '../utils/errorMessages';
import { formatDateTime } from '../utils/localeFormat';
import { patientArkiveIdLine } from '../utils/patientDisplay';
import type { AccessRequestDto } from '../services/patientAccessRequestService';
import { spacing, fontSize } from '../styles/theme';

type RouteParamList = { SolicitacoesAcessoRecebidas: { focusRequestId?: number } | undefined };

/**
 * Chunk 7 — the authenticated Responsible's incoming access requests
 * (`GET /api/solicitacoes-acesso`, Java-scoped to only requests for animals
 * they currently hold an active/vigente `AnimalResponsavel` link for — i.e.
 * exactly the ones they're eligible to decide on). `animalNome`/
 * `resolvedByUserId` are always populated for this audience (confirmed
 * server-side), unlike the veterinarian's own view.
 *
 * `focusRequestId` (from a tapped `SOLICITACAO_ACESSO` notification) just
 * highlights the matching row with an accent border — the full, correctly-
 * scoped list is always fetched fresh via the normal list endpoint; there is
 * no separate single-request fetch (Java does have `GET /{id}`, but the list
 * already contains everything this Responsible may act on, so a second call
 * isn't needed here).
 */
function AccessRequestRow({
  request,
  highlighted,
  onApprove,
  onReject,
}: {
  request: AccessRequestDto;
  highlighted: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const presentation = accessRequestStatusPresentation(request.status);
  const requestedDate = new Date(request.requestedAt);
  const resolvedDate = request.resolvedAt ? new Date(request.resolvedAt) : null;
  const isPending = request.status === 'PENDING';

  return (
    <AppCard style={highlighted ? { borderColor: colors.primary, borderWidth: 2 } : undefined}>
      <View style={styles.headerRow}>
        <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
          {request.animalNome ?? '—'}
        </Text>
        <StatusBadge label={presentation.label} tone={presentation.tone} />
      </View>
      <Text style={[styles.arkiveIdText, { color: colors.textSecondary }]} selectable>
        {patientArkiveIdLine({ arkivePatientId: request.arkivePatientId })}
      </Text>

      <Text style={[styles.field, { color: colors.text }]}>
        {t('accessRequestsReceived.requesterLabel', { name: request.veterinarioNome })}
      </Text>
      <Text style={[styles.field, { color: colors.textSecondary }]}>
        {t('accessRequestsReceived.crmvLabel', { value: request.crmv })}
      </Text>
      {!Number.isNaN(requestedDate.getTime()) ? (
        <Text style={[styles.field, { color: colors.textSecondary }]}>
          {t('accessRequestsReceived.requestedAtLabel', { date: formatDateTime(requestedDate) })}
        </Text>
      ) : null}
      {resolvedDate && !Number.isNaN(resolvedDate.getTime()) ? (
        <Text style={[styles.field, { color: colors.textSecondary }]}>
          {t('accessRequestsReceived.resolvedAtLabel', { date: formatDateTime(resolvedDate) })}
        </Text>
      ) : null}

      {isPending ? (
        <View style={styles.actionsRow}>
          <AppButton title={t('accessRequestsReceived.approveButton')} onPress={onApprove} style={styles.actionButton} />
          <AppButton
            title={t('accessRequestsReceived.rejectButton')}
            variant="danger"
            onPress={onReject}
            style={styles.actionButton}
          />
        </View>
      ) : null}
    </AppCard>
  );
}

export function AccessRequestsScreen() {
  const route = useRoute<RouteProp<RouteParamList, 'SolicitacoesAcessoRecebidas'>>();
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { data, isPending, isError, error, refetch } = useReceivedAccessRequests();
  const [decisionTarget, setDecisionTarget] = useState<{ id: number; action: 'approve' | 'reject' } | null>(null);

  const focusRequestId = route.params?.focusRequestId;

  // Chunk 8 — a tapped SOLICITACAO_ACESSO notification must actually surface
  // the specific request, not just land on the general list: the matching
  // row (if still present — it may have already been decided elsewhere) is
  // moved to the top, in addition to the existing highlight border, so it's
  // immediately visible without relying on scroll position. Order among the
  // remaining rows is otherwise untouched.
  const orderedData = useMemo(() => {
    if (!data || focusRequestId == null) return data;
    const index = data.findIndex((request) => request.id === focusRequestId);
    if (index <= 0) return data;
    const copy = data.slice();
    const [focused] = copy.splice(index, 1);
    copy.unshift(focused);
    return copy;
  }, [data, focusRequestId]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('accessRequestsReceived.title')} />
      <ScreenContainer>
        {isPending ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>
            {t('accessRequestsReceived.loading')}
          </Text>
        ) : isError ? (
          <>
            <EmptyState
              title={t('accessRequestsReceived.loadErrorTitle')}
              message={describeAccessRequestListError(error)}
            />
            <AppButton title={t('common.tryAgain')} variant="outline" onPress={() => refetch()} />
          </>
        ) : !orderedData || orderedData.length === 0 ? (
          <EmptyState
            title={t('accessRequestsReceived.emptyTitle')}
            message={t('accessRequestsReceived.emptyMessage')}
          />
        ) : (
          orderedData.map((request) => (
            <AccessRequestRow
              key={request.id}
              request={request}
              highlighted={focusRequestId === request.id}
              onApprove={() => setDecisionTarget({ id: request.id, action: 'approve' })}
              onReject={() => setDecisionTarget({ id: request.id, action: 'reject' })}
            />
          ))
        )}
      </ScreenContainer>

      {decisionTarget ? (
        <AccessRequestDecisionModal
          visible
          requestId={decisionTarget.id}
          action={decisionTarget.action}
          onClose={() => setDecisionTarget(null)}
          onDecided={() => setDecisionTarget(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  patientName: { fontSize: fontSize.md, fontWeight: '700', flexShrink: 1 },
  arkiveIdText: { fontSize: fontSize.xs, fontFamily: 'monospace', marginTop: 2, marginBottom: spacing.sm },
  field: { fontSize: fontSize.sm, marginTop: spacing.xs },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionButton: { flex: 1 },
});
