import { useState, useMemo, useCallback } from 'react';

export interface UsePaginationOptions {
  initialPage?: number;
  pageSize?: number;
}

/**
 * usePagination hook (Logic-only - No UI changes)
 * Provides pagination state and item slicing under the hood.
 */
export function usePagination<T>(items: T[], options: UsePaginationOptions = {}) {
  const { initialPage = 1, pageSize = 25 } = options;
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [currentPageSize, setCurrentPageSize] = useState<number>(pageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / currentPageSize));

  // Ensure current page is within valid range
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    const startIndex = (safePage - 1) * currentPageSize;
    return items.slice(startIndex, startIndex + currentPageSize);
  }, [items, safePage, currentPageSize]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  return {
    currentPage: safePage,
    totalPages,
    totalItems,
    pageSize: currentPageSize,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    setPageSize: setCurrentPageSize,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
}

export default usePagination;
