import React, { useMemo } from "react";

/**
 * Pagination UI Component
 * Displays page numbers with ellipsis for large page counts
 */
const Pagination = React.memo(function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  loading = false,
  showInfo = true,
  totalCount = 0,
  pageSize = 6,
  itemLabel = "rooms",
  className = "",
}) {
  // Generate page numbers to display
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisible = 5;
    const halfVisible = Math.floor(maxVisible / 2);

    if (totalPages <= maxVisible + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate start and end of visible range
      let start = Math.max(2, currentPage - halfVisible);
      let end = Math.min(totalPages - 1, currentPage + halfVisible);

      // Adjust if at the beginning or end
      if (currentPage <= halfVisible + 1) {
        end = maxVisible;
      } else if (currentPage >= totalPages - halfVisible) {
        start = totalPages - maxVisible + 1;
      }

      // Add ellipsis before if needed
      if (start > 2) {
        pages.push("...");
      }

      // Add visible page numbers
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis after if needed
      if (end < totalPages - 1) {
        pages.push("...");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  if (totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className={`flex flex-col items-center gap-5 ${className}`}>
      {/* Page info */}
      {showInfo && totalCount > 0 && (
        <p className="text-sm tracking-wide text-muted dark:text-dark-muted">
          Showing{" "}
          <span className="font-semibold text-ink dark:text-dark-ink">
            {startItem}&ndash;{endItem}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-ink dark:text-dark-ink">
            {totalCount}
          </span>{" "}
          {itemLabel}
        </p>
      )}

      {/* Pagination controls */}
      <nav className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-panel/80 px-3 py-2 shadow-sm backdrop-blur dark:border-dark-border/60 dark:bg-dark-panel/80" aria-label="Pagination">
        {/* Previous button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-brand-900/30 dark:hover:text-brand-400"
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        <div className="mx-1 h-5 w-px bg-border/50 dark:bg-dark-border/50" />

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) =>
            page === "..." ? (
              <span
                key={`ellipsis-${index}`}
                className="flex h-9 w-6 items-center justify-center text-xs text-muted/60 dark:text-dark-muted/60"
              >
                &hellip;
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                disabled={loading}
                className={`flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl px-2 text-sm font-medium transition ${
                  page === currentPage
                    ? "bg-brand-600 text-white shadow-md shadow-brand-500/25 dark:bg-brand-500"
                    : "text-ink hover:bg-surface/80 hover:text-brand-600 dark:text-dark-ink dark:hover:bg-dark-surface/80 dark:hover:text-brand-400"
                } disabled:cursor-not-allowed disabled:opacity-30`}
                aria-label={`Page ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            )
          )}
        </div>

        <div className="mx-1 h-5 w-px bg-border/50 dark:bg-dark-border/50" />

        {/* Next button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || loading}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-brand-900/30 dark:hover:text-brand-400"
          aria-label="Next page"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
});

function ChevronLeftIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default Pagination;
