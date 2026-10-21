import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../hooks/useThemeColors';
import { commonStyles } from '../styles/common';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  /** Overrides the screen background (e.g. `aiTint` while the AI works). */
  background?: string;
  /** Enables pull-to-refresh; the spinner shows only for a pull, never for background refetches. */
  onRefresh?: () => Promise<unknown>;
}

export function ScreenContainer({
  children,
  scroll = true,
  style,
  edges = ['bottom'],
  background,
  onRefresh,
}: Props) {
  const colors = useThemeColors();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  };

  const content = scroll ? (
    <ScrollView
      style={commonStyles.screen}
      contentContainerStyle={[commonStyles.content, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      // iOS-only prop (silently ignored elsewhere) — lets the ScrollView
      // itself keep the focused input above the keyboard without a manual
      // height/offset calculation.
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.inkSecondary}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[commonStyles.screen, commonStyles.content, style]}>
      {children}
    </View>
  );

  // Android's default windowSoftInputMode already resizes the activity when
  // the keyboard opens, so wrapping it here too risks double-shrinking the
  // content; only iOS (which does nothing by default) needs this. Every
  // screen already reported keyboard-covering a field was on physical
  // iPhone, never Android.
  const body =
    scroll && Platform.OS === 'ios' ? (
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        {content}
      </KeyboardAvoidingView>
    ) : (
      content
    );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: background ?? colors.background }]}
      edges={edges}
    >
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
});
