import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AdminSidebarNavContent } from './AdminSidebarNav';

type SuggestionRow = {
  id: string | number;
  user_id: string;
  subject: string | null;
  body: string;
  created_at: string;
  phone_number?: string | null;
  user_display_name?: string | null;
};

const SuggestionsManager: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rows, setRows] = useState<SuggestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = (await api.getSuggestions()) as { success?: boolean; data?: SuggestionRow[] };
      if (res?.success && Array.isArray(res.data)) {
        setRows(res.data);
      } else {
        setRows([]);
        setError('Unexpected response from server');
      }
    } catch (e: unknown) {
      setRows([]);
      setError(e instanceof Error ? e.message : 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const formatWhen = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/40 z-10 md:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`flex w-64 flex-col bg-white dark:bg-[#111418] border-r border-border-light dark:border-border-dark flex-shrink-0 fixed h-full z-20 overflow-y-auto transition-transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <AdminSidebarNavContent theme="dashboard" onNavigate={() => setSidebarOpen(false)} />
      </aside>

      <div className="flex-1 md:ml-64 min-h-screen bg-background-light dark:bg-background-dark">
        <header className="sticky top-0 z-[5] flex items-center gap-3 border-b border-border-light dark:border-border-dark bg-white/95 dark:bg-[#111418]/95 backdrop-blur px-4 py-3 md:px-8">
          <button
            type="button"
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#283039]"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">User suggestions</h1>
            <p className="text-xs text-slate-500 dark:text-[#9dabb9]">
              Messages sent from the app Contact tab
            </p>
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="ml-auto text-sm font-medium text-primary hover:underline"
            disabled={loading}
          >
            Refresh
          </button>
        </header>

        <main className="p-4 md:p-8 max-w-4xl">
          {loading ? (
            <p className="text-slate-500 dark:text-[#9dabb9]">Loading…</p>
          ) : error ? (
            <p className="text-red-600 dark:text-red-400">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-slate-500 dark:text-[#9dabb9]">No suggestions yet.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {rows.map((row) => (
                <li
                  key={String(row.id)}
                  className="rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-[#1a1f26] p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-[#9dabb9]">
                      {formatWhen(row.created_at)}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      {row.phone_number ? (
                        <>
                          <span className="font-mono">{row.phone_number}</span>
                          {row.user_display_name?.trim() ? (
                            <span className="ml-2 text-slate-500">· {row.user_display_name.trim()}</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="font-mono text-slate-400" title={row.user_id}>
                          User {row.user_id.slice(0, 8)}…
                        </span>
                      )}
                    </span>
                  </div>
                  {row.subject ? (
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{row.subject}</p>
                  ) : null}
                  <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{row.body}</p>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
};

export default SuggestionsManager;
