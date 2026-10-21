import React, { useState } from 'react';
import {
  NativeSyntheticEvent,
  StyleSheet,
  TextInput,
  TextInputSubmitEditingEventData,
  View,
} from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { fontSize, radius, spacing } from '../styles/theme';
import { noWebOutline } from '../styles/interaction';

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
  const [focused, setFocused] = useState(false);

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
        placeholderTextColor={colors.inkSecondary}
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={handleSubmit}
        style={[
          styles.input,
          noWebOutline,
          {
            backgroundColor: colors.sunken,
            // Same focus border as AppInput, now that the browser outline is gone.
            borderColor: focused ? colors.ink : 'transparent',
            color: colors.ink,
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
