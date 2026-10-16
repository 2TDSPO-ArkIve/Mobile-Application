import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { AppButton } from './AppButton';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTranslation } from '../i18n/useTranslation';
import { spacing } from '../styles/theme';

interface LoadMoreButtonProps {
  query: {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    isFetchNextPageError: boolean;
    fetchNextPage: () => unknown;
  };
}

/** "Carregar mais" for a `useInfiniteQuery` list; renders nothing on the last page. */
export function LoadMoreButton({ query }: LoadMoreButtonProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();

  if (!query.hasNextPage) return null;

  return (
    <>
      {query.isFetchNextPageError ? (
        <Text style={[styles.error, { color: colors.error }]}>{t('common.loadMoreError')}</Text>
      ) : null}
      <AppButton
        title={query.isFetchingNextPage ? t('common.loadingMore') : t('common.loadMore')}
        variant="outline"
        onPress={() => query.fetchNextPage()}
        loading={query.isFetchingNextPage}
        disabled={query.isFetchingNextPage}
        style={styles.button}
      />
    </>
  );
}

const styles = StyleSheet.create({
  error: { marginBottom: spacing.sm },
  button: { marginBottom: spacing.md },
});
