"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  X,
} from "lucide-react";

export type ColumnDef<T> = {
  id?: string;
  header: string;
  accessorKey?: keyof T | string;
  accessorFn?: (row: T) => unknown;
  cell?: (info: { row: T; value: unknown; index: number }) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
};

export type FilterOption = {
  label: string;
  value: string;
};

export type FilterDef<T> = {
  key: string;
  label: string;
  options: FilterOption[];
  filterFn?: (row: T, filterValue: string) => boolean;
};

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  filters?: FilterDef<T>[];
  initialFilters?: Record<string, string>;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  defaultPageSize?: number;
  emptyMessage?: string;
  actions?: React.ReactNode;
  rowKey?: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
}

function getCellValue<T>(row: T, col: ColumnDef<T>): unknown {
  if (col.accessorFn) return col.accessorFn(row);
  if (col.accessorKey) {
    const key = col.accessorKey as string;
    if (key.includes(".")) {
      const parts = key.split(".");
      let cur: unknown = row;
      for (const p of parts) {
        if (cur == null || typeof cur !== "object") return undefined;
        cur = (cur as Record<string, unknown>)[p];
      }
      return cur;
    }
    return (row as Record<string, unknown>)[key];
  }
  return undefined;
}

export function DataTable<T>({
  data,
  columns,
  filters = [],
  initialFilters,
  searchPlaceholder = "Search...",
  searchFilter,
  defaultPageSize = 10,
  emptyMessage = "No results found.",
  actions,
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>(initialFilters ?? {});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [currentPage, setCurrentPage] = useState(1);

  // Sync initial filters if changed externally (React recommended pattern for state derived from props)
  const [prevFiltersKey, setPrevFiltersKey] = useState(() => JSON.stringify(initialFilters));
  const currentFiltersKey = JSON.stringify(initialFilters);
  if (currentFiltersKey !== prevFiltersKey) {
    setPrevFiltersKey(currentFiltersKey);
    setFilterValues((prev) => ({ ...prev, ...(initialFilters ?? {}) }));
  }

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = search.trim() ? 1 : 0;
    for (const val of Object.values(filterValues)) {
      if (val && val !== "all") count++;
    }
    return count;
  }, [search, filterValues]);

  function handleFilterChange(key: string, value: string) {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }

  function resetAllFilters() {
    setSearch("");
    setFilterValues({});
    setSortKey(null);
    setCurrentPage(1);
  }

  function handleSort(colId: string) {
    if (sortKey === colId) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(colId);
      setSortDir("asc");
    }
    setCurrentPage(1);
  }

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Search filter
    const query = search.toLowerCase().trim();
    if (query) {
      if (searchFilter) {
        result = result.filter((row) => searchFilter(row, query));
      } else {
        result = result.filter((row) => {
          return columns.some((col) => {
            const val = getCellValue(row, col);
            if (val == null) return false;
            return String(val).toLowerCase().includes(query);
          });
        });
      }
    }

    // Dropdown filters
    for (const f of filters) {
      const val = filterValues[f.key];
      if (val && val !== "all") {
        if (f.filterFn) {
          result = result.filter((row) => f.filterFn!(row, val));
        } else {
          result = result.filter((row) => {
            const rowVal = (row as Record<string, unknown>)[f.key];
            return String(rowVal).toLowerCase() === val.toLowerCase();
          });
        }
      }
    }

    // Sorting
    if (sortKey) {
      const targetCol = columns.find((c) => (c.id || (c.accessorKey as string)) === sortKey);
      if (targetCol) {
        result.sort((a, b) => {
          const valA = getCellValue(a, targetCol);
          const valB = getCellValue(b, targetCol);

          if (valA == null && valB == null) return 0;
          if (valA == null) return 1;
          if (valB == null) return -1;

          if (typeof valA === "number" && typeof valB === "number") {
            return sortDir === "asc" ? valA - valB : valB - valA;
          }

          if (valA instanceof Date && valB instanceof Date) {
            return sortDir === "asc" ? valA.getTime() - valB.getTime() : valB.getTime() - valA.getTime();
          }

          const strA = String(valA).toLowerCase();
          const strB = String(valB).toLowerCase();
          return sortDir === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
        });
      }
    }

    return result;
  }, [data, search, searchFilter, filterValues, filters, sortKey, sortDir, columns]);

  // Pagination calculation
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedData = useMemo(() => {
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, startIndex, pageSize]);

  return (
    <div className="min-w-0 max-w-full overflow-hidden border border-stone-200 bg-[#fcfaf6] shadow-sm">
      {/* Table Toolbar / Controls */}
      <div className="flex flex-col gap-3 border-b border-stone-200 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full min-w-0 basis-full sm:max-w-sm sm:flex-1 sm:basis-[220px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="h-10 w-full border border-stone-300 bg-white pl-9 pr-8 text-xs text-stone-900 outline-none transition focus:border-stone-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Inbuilt Filters */}
          {filters.map((filter) => {
            const val = filterValues[filter.key] ?? "all";
            return (
              <div key={filter.key} className="flex min-w-0 flex-1 items-center gap-1.5 sm:flex-none">
                <select
                  value={val}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  className="h-11 w-full min-w-0 cursor-pointer border border-stone-300 bg-white px-3 text-sm text-stone-700 outline-none transition hover:border-stone-400 focus:border-stone-500 sm:h-10 sm:text-xs"
                  aria-label={filter.label}
                >
                  <option value="all">All {filter.label}</option>
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}

          {/* Reset Filters button when active */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex h-10 items-center gap-1.5 border border-dashed border-stone-300 bg-stone-100/70 px-3 text-xs font-medium text-stone-600 transition hover:bg-stone-200/80 hover:text-stone-900"
            >
              <RotateCcw className="size-3.5" />
              Reset ({activeFiltersCount})
            </button>
          )}
        </div>

        {/* Optional Custom Action Buttons (e.g. Export / Add) */}
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {/* Stacked records keep every field and action readable on phones. */}
      <div className="md:hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 p-4">
          <select
            aria-label="Sort records"
            value={sortKey ?? ""}
            onChange={(event) => { setSortKey(event.target.value || null); setCurrentPage(1); }}
            className="h-11 min-w-0 flex-1 border border-stone-300 bg-white px-3 text-sm"
          >
            <option value="">Default order</option>
            {columns.filter((col) => col.sortable !== false && (col.accessorKey || col.accessorFn)).map((col) => (
              <option key={col.id || String(col.accessorKey)} value={col.id || String(col.accessorKey)}>{col.header}</option>
            ))}
          </select>
          <button type="button" disabled={!sortKey} aria-label={sortDir === "asc" ? "Sort descending" : "Sort ascending"} onClick={() => { setSortDir(sortDir === "asc" ? "desc" : "asc"); setCurrentPage(1); }} className="grid size-11 shrink-0 place-items-center border border-stone-300 bg-white disabled:opacity-40">
            {sortDir === "asc" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
          </button>
        </div>
        <div className="divide-y divide-stone-200">
          {paginatedData.map((row, rowIdx) => (
            <dl key={rowKey ? rowKey(row, rowIdx) : `mobile-${rowIdx}`} onClick={() => onRowClick?.(row)} className="space-y-3 p-4 text-sm [overflow-wrap:anywhere]">
              {columns.map((col, colIdx) => {
                const value = getCellValue(row, col);
                return <div key={col.id || String(col.accessorKey) || colIdx} className="min-w-0">
                  <dt className="mb-1 text-[10px] font-semibold tracking-wide text-stone-500 uppercase">{col.header}</dt>
                  <dd className={`min-w-0 [&_input]:max-w-full [&_select]:max-w-full ${col.className ?? ""}`}>{col.cell ? col.cell({ row, value, index: rowIdx }) : (value as React.ReactNode)}</dd>
                </div>;
              })}
            </dl>
          ))}
          {paginatedData.length === 0 && <div className="p-6 text-center text-sm text-stone-500"><p>{emptyMessage}</p>{activeFiltersCount > 0 && <button type="button" onClick={resetAllFilters} className="mt-3 min-h-11 text-[#91412e] underline">Clear search and filters</button>}</div>}
        </div>
      </div>

      {/* Table Element */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-stone-200 bg-stone-50 text-[10px] font-semibold tracking-[.08em] text-stone-500 uppercase">
            <tr>
              {columns.map((col, idx) => {
                const colId = col.id || (col.accessorKey as string) || `col-${idx}`;
                const isSorted = sortKey === colId;
                const isSortable = col.sortable !== false && (col.accessorKey || col.accessorFn);

                return (
                  <th
                    key={colId}
                    className={`px-5 py-3.5 ${col.headerClassName ?? ""}`}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(colId)}
                        className="inline-flex items-center gap-1.5 font-semibold text-stone-600 transition hover:text-stone-900"
                      >
                        <span>{col.header}</span>
                        {isSorted ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="size-3 text-[#91412e]" />
                          ) : (
                            <ArrowDown className="size-3 text-[#91412e]" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3 opacity-40 hover:opacity-100" />
                        )}
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIdx) => {
                const key = rowKey ? rowKey(row, rowIdx) : `row-${rowIdx}`;
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={`transition hover:bg-[#f8f3eb] ${
                      onRowClick ? "cursor-pointer" : ""
                    }`}
                  >
                    {columns.map((col, colIdx) => {
                      const colId = col.id || (col.accessorKey as string) || `cell-${colIdx}`;
                      const val = getCellValue(row, col);
                      return (
                        <td
                          key={colId}
                          className={`px-5 py-3.5 ${col.className ?? ""}`}
                        >
                          {col.cell ? col.cell({ row, value: val, index: rowIdx }) : (val as React.ReactNode)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-12 text-center text-sm text-stone-500"
                >
                  <p>{emptyMessage}</p>
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="mt-2 text-xs font-semibold text-[#91412e] underline underline-offset-4 hover:text-[#733324]"
                    >
                      Clear search and filters
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-4 py-3 text-xs text-stone-500 sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <p>
            Showing{" "}
            <span className="font-semibold text-stone-900">
              {totalItems === 0 ? 0 : startIndex + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-stone-900">
              {Math.min(startIndex + pageSize, totalItems)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-stone-900">{totalItems}</span>{" "}
            {totalItems === 1 ? "entry" : "entries"}
            {data.length !== totalItems && ` (filtered from ${data.length})`}
          </p>

          {/* Page size dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-stone-400">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-7 border border-stone-300 bg-white px-2 text-xs text-stone-700 outline-none hover:border-stone-400"
            >
              {[10, 25, 50, 100].map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Page controls */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-8 items-center gap-1 border border-stone-300 bg-white px-2.5 text-xs text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-3.5" />
              <span>Prev</span>
            </button>

            <span className="px-3 text-xs text-stone-600">
              Page <span className="font-semibold text-stone-900">{safeCurrentPage}</span> of{" "}
              <span className="font-semibold text-stone-900">{totalPages}</span>
            </span>

            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-8 items-center gap-1 border border-stone-300 bg-white px-2.5 text-xs text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <span>Next</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
