import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createPatientShare,
  previewPatientShare,
  redeemPatientShare,
  type PatientAccessRole,
} from '../services/shareService';
import { queryKeys } from '../query/queryKeys';
import { usePendingShare } from '../context/PendingShareContext';

/**
 * Create, preview, and redeem are all mutations, not queries — deliberately,
 * even for preview (a read). A `useQuery` would require a query key, and a
 * raw share token must never become part of a (persisted, debuggable)
 * TanStack Query key or cache entry. A mutation has no key at all; the
 * result only ever lives in whichever screen called `.mutate()`.
 */
export function useCreatePatientShare(animalId: number) {
  return useMutation({
    mutationFn: (invitationType: PatientAccessRole) => createPatientShare(animalId, invitationType),
  });
}

export function usePreviewPatientShare() {
  return useMutation({
    mutationFn: (token: string) => previewPatientShare(token),
  });
}

/**
 * Invalidating `queryKeys.patients.all` covers both the VETERINARIO
 * (`patients.mine`) and RESPONSAVEL (`patients.accessible`) branches in one
 * call, plus any mounted `patients.detail` query for the newly-shared
 * animal — all three share the same `['patients']` key prefix, and
 * `invalidateQueries` matches by prefix by default.
 */
export function useRedeemPatientShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => redeemPatientShare(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
    },
  });
}

/**
 * Once an authenticated shell (VETERINARIO's `AppStack` or RESPONSAVEL's
 * `ResponsavelAppStack`) mounts its root screen, this guides the user back to
 * a still-pending invitation — WITHOUT auto-redeeming it (the user must
 * explicitly accept on the preview screen).
 *
 * `navigation` is typed loosely on purpose (just the one call this hook
 * makes) so either stack's own root screen can pass its real
 * `useNavigation()` result — the same pattern already used elsewhere in this
 * app for navigating to a route the immediate param list doesn't declare
 * (e.g. `HomeHeader.tsx`'s `navigate('Perfil')`); React Navigation forwards
 * an unrecognized route name up to the parent navigator that does own it.
 *
 * `restored` gates this so it never fires before the SecureStore read on
 * mount resolves (which would otherwise read `pendingToken` as `null` on a
 * fresh app launch and skip a real pending invitation). `hasBeenPresented`
 * prevents re-opening the preview screen every time the user navigates back
 * to this root screen within the same app session — it does NOT prevent
 * re-presenting on a fresh app launch, which is deliberate: an
 * unredeemed, still-pending invitation should keep guiding the user back
 * until they explicitly accept or discard it.
 */
export function usePendingShareAutoReturn(navigation: { navigate: (route: 'ConvitePaciente') => void }) {
  const { pendingToken, restored, hasBeenPresented, markPresented } = usePendingShare();

  useEffect(() => {
    if (!restored || !pendingToken) return;
    if (hasBeenPresented(pendingToken)) return;
    markPresented(pendingToken);
    navigation.navigate('ConvitePaciente');
    // `navigation` is a stable object from useNavigation(); only the token
    // (and restoration completing) should actually re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, pendingToken, hasBeenPresented, markPresented]);
}
