import { Platform, StyleSheet } from 'react-native';
import { spacing, radius, fontSize, font } from './theme';
import { shadows } from './shadows';

export const commonStyles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  // `commonStyles.content` is only ever consumed by ScreenContainer.tsx
  // (confirmed — no other file references it), so this is the single,
  // safe place to establish the app's responsive content strategy: on a
  // phone (every device in the target matrix tops out at 430px) `maxWidth`
  // never engages, so there is zero visual change there. It only takes
  // effect on tablets/web, where content centers instead of stretching
  // edge-to-edge.
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: fontSize.xxl,
    ...font('bold'),
  },
  subtitle: {
    fontSize: fontSize.md,
    ...font('medium'),
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    ...font('bold'),
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  /** Small uppercase section label, e.g. above a card group on Consultation Detail. */
  eyebrow: {
    fontSize: fontSize.xs,
    ...font('bold'),
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  card: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    ...font('semibold'),
    marginBottom: spacing.xs,
  },
  helperText: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.xs,
    ...font('semibold'),
    marginTop: spacing.xs,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  /**
   * ArkIve ID (`ARK-PET-…`, 38 characters): Jakarta 500 with tabular digits
   * (decisão P3), breaking at any character so it never overflows.
   */
  arkiveId: {
    ...font('medium'),
    fontVariant: ['tabular-nums'],
    ...(Platform.OS === 'web' ? ({ wordBreak: 'break-all' } as object) : null),
  },
});
