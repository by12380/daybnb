import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient.js";

/**
 * Custom hook for paginated data fetching from Supabase
 * Optimized to minimize re-renders and fetch only needed data
 */
export function usePagination({
  table,
  pageSize = 10,
  orderBy = "created_at",
  orderAsc = false,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Cache to store fetched pages and avoid refetching
  const pageCache = useRef(new Map());
  const isMountedRef = useRef(true);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Fetch total count once on mount
  useEffect(() => {
    isMountedRef.current = true;

    const fetchCount = async () => {
      if (!supabase) {
        setError("Supabase not configured");
        setLoading(false);
        return;
      }

      try {
        const { count, error: countError } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        if (!isMountedRef.current) return;

        if (countError) {
          console.error("Error fetching count:", countError);
          setError(countError.message);
        } else {
          setTotalCount(count || 0);
        }
      } catch (err) {
        if (isMountedRef.current) {
          console.error("Unexpected error:", err);
          setError(err.message);
        }
      }
    };

    fetchCount();

    return () => {
      isMountedRef.current = false;
    };
  }, [table]);

  // Fetch page data
  const fetchPage = useCallback(
    async (page) => {
      if (!supabase) {
        setError("Supabase not configured");
        setLoading(false);
        return;
      }

      // Check cache first
      const cacheKey = `${page}`;
      if (pageCache.current.has(cacheKey)) {
        setData(pageCache.current.get(cacheKey));
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data: pageData, error: fetchError } = await supabase
          .from(table)
          .select("*")
          .order(orderBy, { ascending: orderAsc })
          .range(from, to);

        if (!isMountedRef.current) return;

        if (fetchError) {
          console.error("Error fetching page:", fetchError);
          setError(fetchError.message);
        } else {
          const result = pageData || [];
          // Cache the result
          pageCache.current.set(cacheKey, result);
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (isMountedRef.current) {
          console.error("Unexpected error:", err);
          setError(err.message);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [table, pageSize, orderBy, orderAsc]
  );

  // Fetch initial page and when page changes
  useEffect(() => {
    fetchPage(currentPage);
  }, [currentPage, fetchPage]);

  // Navigation functions
  const goToPage = useCallback(
    (page) => {
      const validPage = Math.max(1, Math.min(page, totalPages || 1));
      if (validPage !== currentPage) {
        setCurrentPage(validPage);
      }
    },
    [currentPage, totalPages]
  );

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);

  // Clear cache (useful when data is modified)
  const clearCache = useCallback(() => {
    pageCache.current.clear();
  }, []);

  // Refresh current page
  const refresh = useCallback(() => {
    pageCache.current.delete(`${currentPage}`);
    fetchPage(currentPage);
  }, [currentPage, fetchPage]);

  return {
    data,
    loading,
    error,
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    clearCache,
    refresh,
  };
}

export default usePagination;
