import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listAnimalReports,
  createAnimalReport,
  type AnimalReportPage,
  type CreateAnimalReportInput,
} from '../services/animalReportService';
import { queryKeys } from '../query/queryKeys';
import { useAuth } from './useAuth';

export const ANIMAL_REPORTS_PAGE_SIZE = 20;

/**
 * Paginated, searchable report history for one animal — `useInfiniteQuery`
 * (not a plain growing-array `useState`) because Java's own
 * `dataCriacao DESC, id DESC` ordering plus a real `totalElements`/
 * `totalPages` response is exactly the shape this hook is built for: each
 * `page.number`/`page.totalPages` pair tells the caller whether another
 * "Carregar mais" fetch is possible, without the screen ever re-deriving
 * that itself. `busca` is part of the query key so changing the search term
 * starts an entirely fresh page sequence — never appends page 2 of a NEW
 * search term onto page 1 of the OLD one.
 */
export function useAnimalReports(animalId: number, busca: string) {
  const { status } = useAuth();

  return useInfiniteQuery({
    queryKey: queryKeys.animalReports.list(animalId, busca),
    queryFn: ({ pageParam }) =>
      listAnimalReports(animalId, {
        busca: busca || undefined,
        page: pageParam,
        size: ANIMAL_REPORTS_PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: AnimalReportPage) =>
      lastPage.number + 1 < lastPage.totalPages ? lastPage.number + 1 : undefined,
    enabled: status === 'authenticated' && Number.isFinite(animalId),
  });
}

/**
 * Lightweight `page=0&size=1` presence check backing the veterinarian's
 * eye-icon visibility on `ConsultaDetailScreen` — deliberately never loads
 * the full history just to decide whether an icon should render. A longer
 * `staleTime` than the rest of this app's reads is intentional here: this is
 * pure UI-affordance data (not a value the user reads directly), so a few
 * minutes of staleness is an acceptable trade for not refetching on every
 * ConsultaDetailScreen visit.
 */
export function useAnimalReportsPresence(animalId: number | null) {
  const { status } = useAuth();

  return useQuery({
    queryKey: queryKeys.animalReports.presence(animalId ?? 'none'),
    queryFn: () => listAnimalReports(animalId as number, { page: 0, size: 1 }),
    enabled: status === 'authenticated' && animalId != null && Number.isFinite(animalId),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * `POST /api/animais/{id}/relatos`. `retry: false` — a state-changing POST
 * must never be silently repeated on an uncertain network outcome, same
 * invariant as every other mutation in this app. On success, invalidates
 * the ENTIRE `byAnimal` prefix (every cached search/page AND the presence
 * check) so a newly-created report appears on the next render of any of
 * them — never surgically patched into a specific cached page, since the
 * new report's correct position depends on the current sort/search/page
 * state, which this mutation has no way to know.
 */
export function useCreateAnimalReport(animalId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAnimalReportInput) => createAnimalReport(animalId, input),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.animalReports.byAnimal(animalId) });
    },
  });
}
