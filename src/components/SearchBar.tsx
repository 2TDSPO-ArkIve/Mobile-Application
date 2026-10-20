import React from 'react';
import {
  NativeSyntheticEvent,
  StyleSheet,
  TextInput,
  TextInputSubmitEditingEventData,
  View,
} from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { fontSize, radius, spacing } from '../styles/theme';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Pesquisar...',
  onSubmit,
}: Props) {
  const colors = useThemeColors();

  const handleSubmit = (
    _event: NativeSyntheticEvent<TextInputSubmitEditingEventData>
  ) => {
    onSubmit?.();
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        returnKeyType="search"
        onSubmitEditing={handleSubmit}
        style={[
          styles.input,
          {
            backgroundColor: colors.sunken,
            borderColor: 'transparent',
            color: colors.text,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  input: {
    minHeight: 44,
    borderWidth: 1.5,
    borderRadius: radius.field,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
  },
});
