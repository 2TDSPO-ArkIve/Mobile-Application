import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, Animated, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../hooks/useThemeColors';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTranslation } from '../i18n/useTranslation';
import { spacing, fontSize, font } from '../styles/theme';

export type VoiceOrbMode = 'idle' | 'recording' | 'transcribing' | 'analyzing';

interface Props {
  mode: VoiceOrbMode;
  /** Only meaningful in `recording` mode. */
  durationSeconds?: number;
  /** 0..1, only meaningful in `recording` mode — real mic input level when available (see useClinicalVoiceRecording's meteringLevel), a plain recording-state pulse otherwise. */
  meteringLevel?: number;
  /** Tap toggles start (idle) / stop (recording). Ignored in transcribing/analyzing. */
  onPress?: () => void;
  disabled?: boolean;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const ORB_MIN = 120;
const ORB_MAX = 150;

/**
 * Scales the orb off the viewport width instead of a hardcoded device size —
 * clamped to a comfortable range so it reads as a real hero element on small
 * phones and doesn't balloon past a sensible size on tablets/web.
 */
function useOrbSizes() {
  const { width } = useWindowDimensions();
  return useMemo(() => {
    const orb = Math.round(Math.min(ORB_MAX, Math.max(ORB_MIN, width * 0.34)));
    const ringOuter = Math.round(orb * 1.7);
    const ringInner = Math.round(orb * 1.32);
    return { orb, ringOuter, ringInner };
  }, [width]);
}

/**
 * The signature ArkIve voice interaction — an `ink` orb (`accent` while recording, never `ai`) with a
 * microphone at rest, visibly alive while recording, and a shared pulsing
 * language for transcription/analysis waiting states. Built entirely on
 * React Native's own `Animated` API (no WebGL/canvas/extra dependency).
 *
 * `analyzing` mode intentionally renders no label/timer of its own — the
 * dedicated analysis screen supplies its own rotating status text around
 * this same orb so the two experiences share one visual language.
 */
export function VoiceOrb({ mode, durationSeconds = 0, meteringLevel = 0, onPress, disabled }: Props) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const { orb: ORB_SIZE, ringOuter: RING_OUTER, ringInner: RING_INNER } = useOrbSizes();
  const reducedMotion = useReducedMotion();

  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  // Real audio-reactive value — set directly from the live meteringLevel
  // prop (not part of a decorative loop) so the center orb genuinely
  // responds to mic input while recording.
  const meter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(meter, {
      toValue: mode === 'recording' ? meteringLevel : 0,
      duration: 120,
      useNativeDriver: true,
    }).start();
  }, [meteringLevel, mode, meter]);

  // Decorative concentric-ring pulse for every non-idle mode.
  useEffect(() => {
    if (mode === 'idle' || reducedMotion) return;
    ring1.setValue(0);
    ring2.setValue(0);
    const duration = mode === 'recording' ? 1400 : 1800;
    const loop1 = Animated.loop(Animated.timing(ring1, { toValue: 1, duration, useNativeDriver: true }));
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(duration / 2),
        Animated.timing(ring2, { toValue: 1, duration, useNativeDriver: true }),
      ])
    );
    loop1.start();
    loop2.start();
    return () => {
      loop1.stop();
      loop2.stop();
    };
  }, [mode, reducedMotion, ring1, ring2]);

  // Gentle breathing on the center itself while idle.
  useEffect(() => {
    if (mode !== 'idle' || reducedMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [mode, reducedMotion, breathe]);

  const orbColor = mode === 'recording' ? colors.accent : colors.ink;

  const centerScale = Animated.add(
    breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }),
    meter.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] })
  );

  const ringStyle = (anim: Animated.Value, size: number) => ({
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: orbColor,
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
  });

  const label =
    mode === 'recording'
      ? t('voiceOrb.recording')
      : mode === 'transcribing'
        ? t('voiceOrb.transcribing')
        : mode === 'idle'
          ? t('voiceOrb.idle')
          : null;

  const accessibilityLabel =
    mode === 'recording' ? t('voiceOrb.stopAccessibilityLabel') : t('voiceOrb.startAccessibilityLabel');
  const interactive = (mode === 'idle' || mode === 'recording') && !disabled;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={interactive ? onPress : undefined}
        disabled={!interactive}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[styles.orbArea, { width: RING_OUTER, height: RING_OUTER }]}
      >
        {mode !== 'idle' && !reducedMotion ? (
          <>
            <Animated.View style={ringStyle(ring1, RING_OUTER)} />
            <Animated.View style={ringStyle(ring2, RING_INNER)} />
          </>
        ) : null}

        <Animated.View
          style={[
            styles.center,
            {
              width: ORB_SIZE,
              height: ORB_SIZE,
              borderRadius: ORB_SIZE / 2,
              backgroundColor: orbColor,
              transform: [{ scale: centerScale }],
            },
          ]}
        >
          {mode === 'transcribing' || mode === 'analyzing' ? (
            <ActivityIndicator color={colors.onInk} />
          ) : (
            <Ionicons name={mode === 'recording' ? 'mic' : 'mic-outline'} size={36} color={colors.onInk} />
          )}
        </Animated.View>
      </Pressable>

      {label ? (
        <View style={styles.labelRow}>
          {mode === 'recording' ? <View style={[styles.recDot, { backgroundColor: colors.error }]} /> : null}
          <Text style={[styles.label, { color: mode === 'recording' ? colors.error : colors.inkSecondary }]}>
            {label}
          </Text>
        </View>
      ) : null}

      {mode === 'recording' ? (
        <Text style={[styles.timer, { color: colors.ink }]}>{formatDuration(durationSeconds)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xl },
  orbArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  recDot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: fontSize.md, ...font('semibold'), textAlign: 'center' },
  timer: { fontSize: fontSize.lg, ...font('bold'), marginTop: spacing.xs, fontVariant: ['tabular-nums'] },
});
