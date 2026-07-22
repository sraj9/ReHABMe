import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  /** Noun for the "Showing X–Y of Z" label, e.g. "patients" */
  label?: string
}

export default function Pagination({ page, pageSize, total, onPageChange, label = 'items' }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
      <p className="text-xs text-gray-500">
        Showing {from}–{to} of {total} {label}
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-xs text-gray-600 px-2">
            Page {page} of {pageCount}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
