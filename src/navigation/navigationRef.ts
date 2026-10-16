import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * Chunk 5 — lets code OUTSIDE any screen component (specifically
 * `PushTapHandler`, reacting to a tapped native/local notification) navigate
 * once `RootNavigator`'s `NavigationContainer` is ready. The standard React
 * Navigation pattern for "navigate without a navigation prop"
 * (https://reactnavigation.org/docs/navigating-without-navigation-prop/).
 *
 * Deliberately untyped against the full nested stack shape: the only two
 * screen names ever navigated to this way (`ConsultaDetalhe`,
 * `HistoricoPaciente`) are the exact same ones `NotificationsScreen` already
 * navigates to directly, and React Navigation's own `navigate(name, params)`
 * searches the CURRENTLY ACTIVE navigator tree for a matching screen name at
 * any depth — it does not require this ref to know about `AppStack`/
 * `ResponsavelAppStack`'s nested structure. Always guarded by
 * `navigationRef.isReady()` before use.
 */
export const navigationRef = createNavigationContainerRef<Record<string, object | undefined>>();
