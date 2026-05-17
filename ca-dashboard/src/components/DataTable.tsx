"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  sortable?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  searchable?: boolean
  searchKeys?: string[]
  pageSize?: number
  onRowClick?: (item: T) => void
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading,
  emptyMessage = "No data found.",
  searchable = false,
  searchKeys,
  pageSize = 10,
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)

  const filtered = searchable && searchKeys
    ? data.filter((item) =>
        searchKeys.some((key) =>
          String(item[key]).toLowerCase().includes(search.toLowerCase())
        )
      )
    : data

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const aVal = a[sortKey]
        const bVal = b[sortKey]
        if (aVal == null) return 1
        if (bVal == null) return -1
        const cmp = String(aVal).localeCompare(String(bVal))
        return sortDir === "asc" ? cmp : -cmp
      })
    : filtered

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border">
        <div className="p-4">
          {searchable && (
            <div className="mb-4 h-10 w-full animate-pulse rounded bg-muted" />
          )}
          <table className="w-full">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <div className="p-4">
        {searchable && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-md border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {paginated.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={cn(
                          "px-4 py-3 text-left text-sm font-medium text-muted-foreground",
                          col.sortable && "cursor-pointer select-none hover:text-foreground"
                        )}
                        onClick={() => col.sortable && handleSort(col.key)}
                      >
                        <div className="flex items-center gap-1">
                          {col.header}
                          {col.sortable && (
                            <span className="inline-flex flex-col">
                              {sortKey === col.key ? (
                                sortDir === "asc" ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )
                              ) : (
                                <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((item, idx) => (
                    <tr
                      key={idx}
                      className={cn(
                        "border-t transition-colors hover:bg-muted/50",
                        onRowClick && "cursor-pointer"
                      )}
                      onClick={() => onRowClick?.(item)}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3 text-sm">
                          {col.render ? col.render(item) : String(item[col.key] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-md border bg-background px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-md border bg-background px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
