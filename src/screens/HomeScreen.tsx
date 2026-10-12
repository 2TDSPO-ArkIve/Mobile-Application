import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeHeader } from '../components/HomeHeader';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppCard } from '../components/AppCard';
import { AppButton } from '../components/AppButton';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useConsultas } from '../hooks/useConsultas';
import { usePendingShareAutoReturn } from '../hooks/useShares';
import { consultaStatusPresentation } from '../utils/statusPresentation';
import { formatTime } from '../utils/localeFormat';
import type { AppStackParamList } from '../interfaces/navigation';
import type { ConsultaDto } from '../services/consultaService';
import { spacing, fontSize } from '../styles/theme';
import { commonStyles } from '../styles/common';

function isSameDayAsNow(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function formatHora(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return formatTime(date);
}

export function HomeScreen() {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  // Home is AppStack's default/initial tab, so it's the reliable single
  // mount point to guide the veterinarian back to a still-pending share
  // invitation once authenticated — see usePendingShareAutoReturn's own note.
  usePendingShareAutoReturn(navigation);

  const IN_PROGRESS_COPY: Record<string, string> = {
    EP: t('home.continueAttendance'),
    AP: t('home.reviewSupport'),
  };

  // GET /api/consultas — same TanStack Query cache ConsultasScreen already
  // populates, scoped server-side to the authenticated veterinarian. This
  // replaced a Node-era `/appointments` widget whose endpoint no longer
  // exists on the Spring backend and crashed every visit to this screen with
  // an unhandled promise rejection.
  const { data: consultas, isPending, isError } = useConsultas();

  const todayConsultas = useMemo(() => {
    if (!consultas) return [];
    return consultas
      .filter((c) => c.status !== 'CA' && isSameDayAsNow(c.dataHora))
      .sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  }, [consultas]);

  // "Em andamento": consultations that genuinely need the veterinarian's
  // attention right now — EP (narrative/AI step) or AP (awaiting the vet's
  // conclusion) — regardless of date. Deliberately independent of
  // `todayConsultas`: a same-day EP/AP consultation legitimately appears in
  // both lists (once as "today's schedule", once as "needs action").
  const inProgressConsultas = useMemo(() => {
    if (!consultas) return [];
    return consultas
      .filter((c) => c.status === 'EP' || c.status === 'AP')
      .sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  }, [consultas]);

  // `veterinarioNome` comes straight from ConsultaDto (GET /api/consultas,
  // already fetched above) — the real Spring-sourced display name, confirmed
  // against `ConsultaResponse.veterinarioNome` / `Veterinario.getNome()`.
  // Deliberately replaces the old `useAuth().user.name` source: that field
  // is a documented compatibility shim mirroring the login username/email.
  // Falls back to a name-free greeting (never the email) when this account
  // has no consultation yet to read a name from.
  const veterinarioNome = consultas && consultas.length > 0 ? consultas[0].veterinarioNome : null;
  const greeting = veterinarioNome
    ? t('home.greetingWithName', { name: veterinarioNome })
    : t('home.greetingFallback');

  const goToConsulta = (consultaId: number) => {
    navigation.navigate('ConsultaDetalhe', { consultaId });
  };

  const renderConsultaCard = (consulta: ConsultaDto, actionLabel?: string) => (
    <AppCard key={consulta.id} onPress={() => goToConsulta(consulta.id)} style={styles.consultaCard}>
      <View style={commonStyles.rowBetween}>
        <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
          {consulta.animalNome}
        </Text>
        <StatusBadge
          label={consulta.statusDescricao}
          tone={consultaStatusPresentation(consulta.status).tone}
        />
      </View>

      {actionLabel ? (
        <View style={[commonStyles.rowBetween, styles.actionRow]}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </View>
      ) : (
        <Text style={{ color: colors.textSecondary }}>
          {formatHora(consulta.dataHora)}
          {' · '}
          {consulta.modalidade === 'PRESENCIAL' ? t('home.presencial') : t('home.remota')}
        </Text>
      )}
    </AppCard>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <HomeHeader />

      <ScreenContainer style={styles.content}>
        <Text style={[styles.greeting, { color: colors.text }]} numberOfLines={2}>
          {greeting}
        </Text>

        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {t('home.description')}
        </Text>

        {inProgressConsultas.length > 0 ? (
          <>
            <Text style={[commonStyles.eyebrow, { color: colors.primary, marginBottom: spacing.sm }]}>
              {t('home.inProgressSection')}
            </Text>
            {inProgressConsultas.map((consulta) =>
              renderConsultaCard(consulta, IN_PROGRESS_COPY[consulta.status])
            )}
          </>
        ) : null}

        <Text
          style={[
            commonStyles.eyebrow,
            { color: colors.primary, marginBottom: spacing.sm, marginTop: spacing.md },
          ]}
        >
          {t('home.todaySection')}
        </Text>

        {isPending ? (
          <Text style={{ color: colors.textSecondary }}>{t('home.loadingConsultas')}</Text>
        ) : isError ? (
          <Text style={{ color: colors.error }}>{t('home.loadError')}</Text>
        ) : todayConsultas.length === 0 ? (
          <EmptyState title={t('home.emptyTodayTitle')} message={t('home.emptyTodayMessage')} />
        ) : (
          todayConsultas.map((consulta) => renderConsultaCard(consulta))
        )}

        <Text
          style={[
            commonStyles.eyebrow,
            { color: colors.primary, marginBottom: spacing.sm, marginTop: spacing.md },
          ]}
        >
          {t('home.actionsSection')}
        </Text>

        <AppButton
          title={t('home.newConsulta')}
          icon="add"
          onPress={() => navigation.navigate('CriarConsulta')}
        />

        <AppButton
          title={t('home.registerPatient')}
          variant="outline"
          icon="paw-outline"
          onPress={() => navigation.navigate('NovoPaciente')}
        />
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.md },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  consultaCard: {
    marginBottom: spacing.sm,
  },
  patientName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  actionRow: {
    marginTop: spacing.xs,
  },
});
