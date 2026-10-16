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
    /** Paged status groups of `ConsultasScreen` — nested under `list()`, so invalidating the list also refetches them. */
    statusGroups: () => [...queryKeys.consultas.list(), 'status'] as const,
    byStatus: (status: string) => [...queryKeys.consultas.statusGroups(), status] as const,
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
    /** `GET /api/animais/{id}/observacao-responsavel` — the RESPONSAVEL's pending note for this one animal; never shared across animal ids. */
    observacao: (id: string | number) => [...queryKeys.patients.all, 'observacao', id] as const,
  },
  /**
   * New permanent report history (`GET`/`POST /api/animais/{id}/relatos`) —
   * deliberately a SEPARATE top-level namespace from `patients`, not nested
   * under it, even though both are animal-scoped: `byAnimal` is the shared
   * prefix invalidated on a successful create (covers every paginated/
   * searched list AND the lightweight presence check below in one call),
   * while `list`/`presence` are kept as distinct sub-keys so a presence
   * check's cached `{page:0,size:1}` result can never be read back as if it
   * were a real page-0 list for the UI (they cache the same shape of data
   * but serve different purposes and different staleness needs).
   */
  animalReports: {
    all: ['animalReports'] as const,
    byAnimal: (animalId: string | number) => [...queryKeys.animalReports.all, animalId] as const,
    list: (animalId: string | number, busca: string) =>
      [...queryKeys.animalReports.byAnimal(animalId), 'list', busca] as const,
    /** `page=0&size=1`, read only for `totalElements` — backs the veterinarian's eye-icon visibility without ever loading the full history. */
    presence: (animalId: string | number) => [...queryKeys.animalReports.byAnimal(animalId), 'presence'] as const,
  },
  especies: {
    all: ['especies'] as const,
    list: () => [...queryKeys.especies.all, 'list'] as const,
    search: (nome: string) => [...queryKeys.especies.list(), 'search', nome] as const,
  },
  racas: {
    all: ['racas'] as const,
    byEspecie: (especieId: number) => [...queryKeys.racas.all, 'by-especie', especieId] as const,
    search: (especieId: number, nome: string) => [...queryKeys.racas.byEspecie(especieId), 'search', nome] as const,
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
    /** `GET /api/veterinarios/me` — the authenticated veterinarian's own profile, no id involved. */
    me: () => [...queryKeys.veterinarios.all, 'me'] as const,
    /** `GET /api/veterinarios/me/custos` (Chunk 6) — the authenticated veterinarian's own financial dashboard. No id involved; never shared across accounts. */
    ownCosts: () => [...queryKeys.veterinarios.all, 'own-costs'] as const,
  },
  prescricoes: {
    all: ['prescricoes'] as const,
    byConsulta: (consultaId: string | number) =>
      [...queryKeys.prescricoes.all, 'by-consulta', consultaId] as const,
    detail: (id: string | number) => [...queryKeys.prescricoes.all, 'detail', id] as const,
  },
  /**
   * Chunk 7 — `GET /api/solicitacoes-acesso` returns a role-scoped view
   * (Java branches internally: a veterinarian's own outgoing requests, or a
   * responsible person's incoming/eligible-to-decide requests). `mine`/
   * `received` are kept as SEPARATE key prefixes rather than one shared list
   * key, even though both call the identical service function — a vet and a
   * responsible person must never share a cache entry for what is, from each
   * role's perspective, a conceptually different list.
   */
  accessRequests: {
    all: ['accessRequests'] as const,
    mine: (params?: { status?: string; page?: number; size?: number }) =>
      [...queryKeys.accessRequests.all, 'mine', params ?? {}] as const,
    received: (params?: { status?: string; page?: number; size?: number }) =>
      [...queryKeys.accessRequests.all, 'received', params ?? {}] as const,
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
