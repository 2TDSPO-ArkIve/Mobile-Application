import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { NotificationBell } from './NotificationBell';
import { useThemeColors } from '../hooks/useThemeColors';
import { spacing, fontSize, radius, font, layout } from '../styles/theme';
import type { AppStackParamList } from '../interfaces/navigation';

/**
 * White surface with a thin bottom border, matching AppHeader — one coherent
 * header system app-wide.
 */
export function HomeHeader() {
  const colors = useThemeColors();
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
          borderBottomColor: colors.line,
        },
      ]}
    >
      <View style={styles.inner}>
        <Image
          source={require('../assets/branding/favicon.png')}
          style={styles.logo}
          resizeMode="contain"
          tintColor={colors.ink}
        />
        <Text style={[styles.brand, { color: colors.ink }]} numberOfLines={1}>
          ArkIve
        </Text>

        <NotificationBell onPress={() => navigation.navigate('Notificacoes')} />

        <Pressable
          onPress={() => navigation.navigate('Perfil')}
          style={[styles.iconBtn, { borderColor: colors.line }]}
          accessibilityRole="button"
          accessibilityLabel="Perfil"
        >
          <Ionicons name="person-circle-outline" size={26} color={colors.ink} />
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
    maxWidth: layout.contentMax,
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
  brand: { flex: 1, fontSize: fontSize.xl, ...font('bold') },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
