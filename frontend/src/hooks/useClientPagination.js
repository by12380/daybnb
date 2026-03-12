import { useCallback, useEffect, useMemo, useState } from "react";

export default function useClientPagination(items, pageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    setCurrentPage((prevPage) => Math.min(prevPage, totalPages));
  }, [totalPages]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, currentPage, pageSize]);

  const goToPage = useCallback((page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  }, [totalPages]);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    paginatedItems,
    goToPage,
    resetPagination,
  };
}
