import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { avaliarInsightIa, listDiagnosticosByConsulta } from '../services/diagnosticoService';
import type { ClinicalSupportResponse } from '../services/consultaService';
import { queryKeys } from '../query/queryKeys';

/** Gate `enabled` to `FI` consultations — there's no confirmed diagnosis to fetch before finalization. */
export function useConsultaDiagnosticos(consultaId: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.diagnosticos.byConsulta(consultaId),
    queryFn: () => listDiagnosticosByConsulta(consultaId),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Veterinarian feedback on an AI-generated insight ("was this useful?") —
 * `consultaId` identifies which clinical-support cache entry to patch on
 * success; `diagnosticoId` (the mutation variable) is the actual PATCH
 * target, since a consultation's clinical support and its underlying
 * Diagnostico record have different ids.
 *
 * On success, the clinical-support cache is updated DIRECTLY via
 * `setQueryData` — not invalidated — so the already-rendered
 * `ClinicalSupportCard` reflects the new `validacaoVet` immediately, with no
 * refetch and no extra diagnosis-list fetch just to recover state the
 * response already gave us.
 */
export function useAvaliarInsightIa(consultaId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diagnosticoId, util }: { diagnosticoId: number; util: boolean }) =>
      avaliarInsightIa(diagnosticoId, util),
    onSuccess: (updated) => {
      queryClient.setQueryData<ClinicalSupportResponse>(queryKeys.consultas.clinicalSupport(consultaId), (current) =>
        current ? { ...current, validacaoVet: updated.validacaoVet } : current
      );
    },
  });
}
