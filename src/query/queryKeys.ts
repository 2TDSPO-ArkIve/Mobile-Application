/**
 * Centralized query-key factory. Grouping keys this way (rather than
 * scattering ['consultas'] / ['consultas', id] string arrays across feature
 * hooks) is what makes queryClient.invalidateQueries(...) predictable once
 * CRUD mutations land in the next phase.
 */
export const queryKeys = {
  consultas: {
    all: ['consultas'] as const,
    list: () => [...queryKeys.consultas.all, 'list'] as const,
    detail: (id: string | number) => [...queryKeys.consultas.all, 'detail', id] as const,
    clinicalSupport: (id: string | number) =>
      [...queryKeys.consultas.all, 'clinical-support', id] as const,
  },
  patients: {
    all: ['patients'] as const,
    /** `GET /api/animais/me` — this veterinarian's own patient registry (see `listMyPatients`). */
    mine: (filters?: { nome?: string; especieId?: number; racaId?: number }) =>
      [...queryKeys.patients.all, 'mine', filters ?? {}] as const,
    /** `GET /api/animais` — this RESPONSAVEL's backend-authorized animal list (see `listAccessibleAnimals`). */
    accessible: (filters?: { nome?: string; especieId?: number; racaId?: number }) =>
      [...queryKeys.patients.all, 'accessible', filters ?? {}] as const,
    detail: (id: string | number) => [...queryKeys.patients.all, 'detail', id] as const,
    /** `GET /api/animais/{id}/historico` — includes `id` so one patient's cached history can never leak into another's. */
    history: (id: string | number) => [...queryKeys.patients.all, 'history', id] as const,
    /** `GET /api/animais/{id}/custos` — same per-patient scoping as `history`. */
    costs: (id: string | number) => [...queryKeys.patients.all, 'costs', id] as const,
  },
  especies: {
    all: ['especies'] as const,
    list: () => [...queryKeys.especies.all, 'list'] as const,
  },
  racas: {
    all: ['racas'] as const,
    byEspecie: (especieId: number) => [...queryKeys.racas.all, 'by-especie', especieId] as const,
  },
  responsaveis: {
    all: ['responsaveis'] as const,
    search: (busca: string) => [...queryKeys.responsaveis.all, 'search', busca] as const,
  },
  animalResponsaveis: {
    all: ['animalResponsaveis'] as const,
    byAnimal: (animalId: number) => [...queryKeys.animalResponsaveis.all, 'by-animal', animalId] as const,
  },
  diagnosticos: {
    all: ['diagnosticos'] as const,
    byConsulta: (consultaId: string | number) =>
      [...queryKeys.diagnosticos.all, 'by-consulta', consultaId] as const,
  },
  veterinarios: {
    all: ['veterinarios'] as const,
    detail: (id: string | number) => [...queryKeys.veterinarios.all, 'detail', id] as const,
  },
  prescricoes: {
    all: ['prescricoes'] as const,
    byConsulta: (consultaId: string | number) =>
      [...queryKeys.prescricoes.all, 'by-consulta', consultaId] as const,
    detail: (id: string | number) => [...queryKeys.prescricoes.all, 'detail', id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    /**
     * A STABLE prefix covering every list-shaped query (any `naoLidas`/
     * paging combination) and ONLY list-shaped queries — deliberately
     * separate from `unreadCount` below, which caches a plain `number`, not
     * a `NotificationDto[]`. `useNotifications.ts`'s cache-patching mutations
     * (`setQueriesData` with an array-mapping updater) must target THIS key,
     * never `all` — matching against `all` would also hit the unread-count
     * cache entry and call `.map` on a number, throwing at runtime.
     */
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (params?: { naoLidas?: boolean; page?: number; size?: number }) =>
      [...queryKeys.notifications.lists(), params ?? {}] as const,
    /** `GET /api/notificacoes/nao-lidas/contagem` — the header bell badge's own polled query. Caches a plain `number`, never patched via an array-shaped updater. */
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
  },
};
