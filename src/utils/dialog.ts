import { Alert, Platform } from 'react-native';

/**
 * `react-native-web`'s `Alert.alert` is a no-op — it never shows anything and
 * never invokes a button callback — so any action gated behind an Alert
 * button silently never runs on the Vercel web deployment. These helpers use
 * the browser's own blocking dialogs on web and keep `Alert.alert` on native.
 */
export function confirmAction(options: {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  destructive?: boolean;
  onConfirm: () => void;
}): void {
  if (Platform.OS === 'web') {
    if (window.confirm(`${options.title}\n\n${options.message}`)) options.onConfirm();
    return;
  }
  Alert.alert(options.title, options.message, [
    { text: options.cancelText, style: 'cancel' },
    { text: options.confirmText, style: options.destructive ? 'destructive' : 'default', onPress: options.onConfirm },
  ]);
}

export function notify(title: string, message: string, buttonText: string, onDismiss: () => void): void {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    onDismiss();
    return;
  }
  Alert.alert(title, message, [{ text: buttonText, onPress: onDismiss }]);
}
