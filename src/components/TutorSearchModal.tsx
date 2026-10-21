import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import { SearchBar } from './SearchBar';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { useSearchResponsaveis } from '../hooks/useTutores';
import type { ResponsavelLookupDto } from '../services/responsavelService';
import { spacing, radius, fontSize, font } from '../styles/theme';
import { LoadingState } from './LoadingState';
import { focusRing, isActive, type InteractionState } from '../styles/interaction';

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (tutor: ResponsavelLookupDto) => void;
}

/**
 * Full-screen search sheet over `GET /api/responsaveis/busca` — the only
 * fields it ever shows (`id`/`nome`/`email`) are the only ones that endpoint
 * returns. Used both right after patient creation (deferred link) and from
 * patient edit (immediate link/replace) — the modal itself has no opinion on
 * when the selection takes effect, that's the caller's `onSelect`.
 */
export function TutorSearchModal({ visible, onClose, onSelect }: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setDebounced('');
    }
  }, [visible]);

  const trimmed = debounced.trim();
  const { data, isPending, isFetching } = useSearchResponsaveis(trimmed);

  const handleSelect = (tutor: ResponsavelLookupDto) => {
    onSelect(tutor);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.line }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{t('tutor.searchModalTitle')}</Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={(state: InteractionState) => [styles.close, isActive(state) && { backgroundColor: colors.sunken }, focusRing(state, colors)]}
          >
            <Text style={{ color: colors.accent, ...font('bold') }}>{t('common.close')}</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <SearchBar value={query} onChangeText={setQuery} placeholder={t('tutor.searchPlaceholder')} />

          {trimmed.length < MIN_QUERY_LENGTH ? (
            <Text style={{ color: colors.inkSecondary }}>{t('tutor.searchMinLength')}</Text>
          ) : isPending || isFetching ? (
            <LoadingState message={t('tutor.searchLoading')} />
          ) : data && data.length > 0 ? (
            <ScrollView>
              {data.map((tutor) => (
                <Pressable
                  key={tutor.id}
                  onPress={() => handleSelect(tutor)}
                  accessibilityRole="button"
                  style={(state: InteractionState) => [
                    styles.row,
                    { backgroundColor: isActive(state) ? colors.sunken : colors.surface, borderColor: colors.line },
                    focusRing(state, colors),
                  ]}
                >
                  <Text style={{ color: colors.ink, ...font('bold') }}>{tutor.nome}</Text>
                  <Text style={{ color: colors.inkSecondary, fontSize: fontSize.sm }}>{tutor.email}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Text style={{ color: colors.inkSecondary }}>{t('tutor.searchNoResults')}</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: spacing.xl,
    borderBottomWidth: 1,
  },
  title: { fontSize: fontSize.lg, ...font('bold') },
  body: { flex: 1, padding: spacing.lg },
  close: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.md },
  row: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});
