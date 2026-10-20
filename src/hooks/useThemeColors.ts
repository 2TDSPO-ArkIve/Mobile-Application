import { useTheme } from '../context/ThemeContext';
import { lightColors, darkColors } from '../styles/colors';

export function useThemeColors() {
  const { scheme } = useTheme();
  return scheme === 'dark' ? darkColors : lightColors;
}
