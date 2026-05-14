'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

function buildPageRange(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = [];

  if (page <= 4) {
    // Show: 1 2 3 4 5 ... last
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('...');
    pages.push(totalPages);
  } else if (page >= totalPages - 3) {
    // Show: 1 ... last-4 last-3 last-2 last-1 last
    pages.push(1);
    pages.push('...');
    for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
  } else {
    // Show: 1 ... page-1 page page+1 ... last
    pages.push(1);
    pages.push('...');
    pages.push(page - 1);
    pages.push(page);
    pages.push(page + 1);
    pages.push('...');
    pages.push(totalPages);
  }

  return pages;
}

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pageRange = buildPageRange(page, totalPages);

  const btnBase =
    'inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300';
  const activeBtn = 'bg-blue-600 text-white shadow-sm';
  const inactiveBtn = 'text-gray-600 hover:bg-gray-100';
  const disabledBtn = 'text-gray-300 cursor-not-allowed';

  return (
    <nav
      className="flex items-center gap-1"
      aria-label="Pagination"
    >
      {/* Previous */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={[btnBase, page <= 1 ? disabledBtn : inactiveBtn].join(' ')}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Page numbers */}
      {pageRange.map((p, i) =>
        p === '...' ? (
          <span
            key={`ellipsis-${i}`}
            className="w-8 h-8 flex items-center justify-center text-sm text-gray-400"
          >
            &hellip;
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={[btnBase, p === page ? activeBtn : inactiveBtn].join(' ')}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={[btnBase, page >= totalPages ? disabledBtn : inactiveBtn].join(' ')}
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}
