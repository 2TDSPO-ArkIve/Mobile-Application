import { Platform } from 'react-native';

/** Cards per page on paginated lists: 15 on web/desktop, 5 on mobile. */
export const LIST_PAGE_SIZE = Platform.OS === 'web' ? 15 : 5;

/** The fields this app reads from a Spring Data `Page`. */
export interface SpringPage<T> {
  content: T[];
  number: number;
  totalPages: number;
  totalElements: number;
}

/** `getNextPageParam` for `useInfiniteQuery` over a `SpringPage`. */
export function nextPageParam(page: SpringPage<unknown>): number | undefined {
  return page.number + 1 < page.totalPages ? page.number + 1 : undefined;
}
