'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { AssignModal } from '@/components/requests/AssignModal';
import type { HelpRequest, RequestStatus, RequestPriority } from '@sahayasetu/types';

const STATUS_OPTIONS = ['', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'];
const PRIORITY_OPTIONS = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function RequestsPage() {
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(priorityFilter && { priority: priorityFilter }),
      });
      const res = await api.get(`/requests?${params}`);
      setRequests(res.data.data);
      setTotal(res.data.meta.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Requests
          <span className="ml-2 text-sm font-normal text-gray-400">({total})</span>
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search requests..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s || 'All Statuses'}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none"
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>{p || 'All Priorities'}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              {['Request #', 'Title', 'Category', 'Priority', 'Status', 'User', 'Created', 'Actions'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </td>
                  ))}
                </tr>
              ))
            ) : requests.map((req) => (
              <tr
                key={req.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="px-4 py-3 text-sm font-mono text-indigo-600 dark:text-indigo-400">
                  {req.requestNumber}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                  {req.title}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {req.category}
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={req.priority} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={req.status} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono text-xs">
                  {req.userId.slice(0, 8)}…
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(req.createdAt).toLocaleDateString('en-IN')}
                </td>
                <td className="px-4 py-3">
                  {req.status === 'PENDING' && (
                    <button
                      onClick={() => setAssigningId(req.id)}
                      className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                    >
                      Assign
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>Page {page} of {Math.ceil(total / 20)}</span>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-gray-300 px-3 py-1 disabled:opacity-40 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
          >
            ← Prev
          </button>
          <button
            disabled={page >= Math.ceil(total / 20)}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-300 px-3 py-1 disabled:opacity-40 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Assign Modal */}
      {assigningId && (
        <AssignModal
          requestId={assigningId}
          onClose={() => setAssigningId(null)}
          onAssigned={fetchRequests}
        />
      )}
    </div>
  );
}
