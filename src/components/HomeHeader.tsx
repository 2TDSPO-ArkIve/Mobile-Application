import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTheme } from '../context/ThemeContext';
import { spacing, fontSize, radius } from '../styles/theme';
import type { AppStackParamList } from '../interfaces/navigation';

/**
 * White surface with a thin bottom border, matching AppHeader — one coherent
 * header system app-wide.
 */
export function HomeHeader() {
  const colors = useThemeColors();
  const { mode } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + spacing.sm,
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.inner}>
        <Image
          source={require('../assets/branding/favicon.png')}
          style={styles.logo}
          resizeMode="contain"
          // Unlike the pre-auth Login/Register screens (deliberately pinned
          // to pure black regardless of theme), this header is in-app and
          // already follows the user's dark-mode preference — the mark must
          // flip to white in night mode or it disappears against the dark
          // surface behind it.
          tintColor={mode === 'dark' ? '#FFFFFF' : '#000000'}
        />
        <Text style={[styles.brand, { color: colors.text }]} numberOfLines={1}>
          ArkIve
        </Text>

        <Pressable
          onPress={() => navigation.navigate('Perfil')}
          style={[styles.iconBtn, { borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Perfil"
        >
          <Ionicons name="person-circle-outline" size={26} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  inner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
  },
  brand: { flex: 1, fontSize: fontSize.xl, fontWeight: '800' },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
