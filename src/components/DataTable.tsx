import React, { useMemo, useState } from 'react';
import { Search, ChevronUp, ChevronDown, Inbox, AlertCircle } from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  searchable?: boolean;
  accessor?: (row: T) => string | number;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  renderActions?: (row: T) => React.ReactNode;
  searchPlaceholder?: string;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  pageSizeOptions?: number[];
}

function cellValue<T>(col: DataTableColumn<T>, row: T): string | number {
  if (col.accessor) return col.accessor(row);
  return (row as any)[col.key] ?? '';
}

export default function DataTable<T>({
  columns, rows, getRowId, renderActions, searchPlaceholder = 'Search…',
  loading, error, emptyMessage = 'No records found', emptyIcon,
  pageSizeOptions = [10, 25, 50]
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0]);

  const searchableCols = columns.filter(c => c.searchable);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const term = search.toLowerCase();
    const cols = searchableCols.length > 0 ? searchableCols : columns;
    return rows.filter(row => cols.some(c => String(cellValue(c, row)).toLowerCase().includes(term)));
  }, [rows, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find(c => c.key === sortKey);
    if (!col) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = cellValue(col, a);
      const bv = cellValue(col, b);
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400"
        />
      </div>

      <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-700">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`p-3.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''} ${col.sortable ? 'cursor-pointer select-none hover:text-slate-200' : ''}`}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </span>
                </th>
              ))}
              {renderActions && <th className="p-3.5 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading && (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={columns.length + (renderActions ? 1 : 0)} className="p-3.5">
                    <div className="h-4 bg-slate-800 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            )}
            {!loading && error && (
              <tr>
                <td colSpan={columns.length + (renderActions ? 1 : 0)} className="p-8 text-center text-rose-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-60" />
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (renderActions ? 1 : 0)} className="p-12 text-center text-slate-400">
                  {emptyIcon || <Inbox className="w-10 h-10 mx-auto mb-2 opacity-30" />}
                  <p>{emptyMessage}</p>
                </td>
              </tr>
            )}
            {!loading && !error && pageRows.map(row => (
              <tr key={getRowId(row)} className="hover:bg-slate-800/70">
                {columns.map(col => (
                  <td key={col.key} className={`p-3.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                    {col.render ? col.render(row) : cellValue(col, row)}
                  </td>
                ))}
                {renderActions && <td className="p-3.5 text-right">{renderActions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && !error && sorted.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
            >
              {pageSizeOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>({sorted.length} total)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded disabled:opacity-40"
            >
              Prev
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
