import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AdminSidebarNavContent } from './AdminSidebarNav';

type PartyRow = {
  id: string | number;
  name: string;
  short_name?: string | null;
  logo_url?: string | null;
  color?: string | null;
};

const PoliticalPartiesAdmin: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rows, setRows] = useState<PartyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<number | string | null>(null);
  const [uploadHint, setUploadHint] = useState<string | null>(null);

  const staticBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

  const resolveLogoUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${staticBaseUrl}${url.startsWith('/') ? url : `/${url}`}`;
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = (await api.getPoliticalPartiesAdmin()) as {
        success?: boolean;
        data?: PartyRow[];
      };
      if (res?.success && Array.isArray(res.data)) {
        setRows(res.data);
      } else {
        setRows([]);
        setError('Unexpected response from server');
      }
    } catch (e: unknown) {
      setRows([]);
      setError(e instanceof Error ? e.message : 'Failed to load parties');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogoChange = async (partyId: number | string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingId(partyId);
    setUploadHint(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = (await api.uploadPoliticalPartyLogoAdmin(partyId, fd)) as {
        success?: boolean;
        data?: PartyRow;
        error?: string;
      };
      if (res?.success && res.data) {
        setRows((prev) =>
          prev.map((row) => (String(row.id) === String(partyId) ? { ...row, logo_url: res.data!.logo_url } : row))
        );
        setUploadHint(`Logo updated for ${res.data.name || 'party'}.`);
      } else {
        setUploadHint(res?.error || 'Upload failed');
      }
    } catch (err: unknown) {
      setUploadHint(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingId(null);
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

      <div className="flex-1 flex flex-col md:pl-64 min-h-screen">
        <header className="flex items-center justify-between border-b border-border-light dark:border-border-dark bg-white dark:bg-[#111418] px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="md:hidden p-2 text-slate-600 dark:text-white"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div>
              <h2 className="text-slate-900 dark:text-white text-xl font-bold">Political parties</h2>
              <p className="text-slate-500 dark:text-[#9dabb9] text-sm mt-0.5">
                Logos are stored in <code className="text-xs">political_parties.logo_url</code> and shown in the app
                where users pick a party.
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          {uploadHint && (
            <div className="mb-4 rounded-lg border border-border-light dark:border-[#3b4754] bg-slate-50 dark:bg-[#111418] text-slate-700 dark:text-slate-200 text-sm px-4 py-3">
              {uploadHint}
            </div>
          )}
          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
            </div>
          )}
          {error && !loading && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-sm px-4 py-3">
              {error}
            </div>
          )}
          {!loading && !error && rows.length === 0 && (
            <p className="text-slate-600 dark:text-slate-400">No parties returned.</p>
          )}
          {!loading && rows.length > 0 && (
            <div className="rounded-xl border border-border-light dark:border-border-dark overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-slate-50 dark:bg-[#1c242e] text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium w-[200px]">Logo</th>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Short</th>
                    <th className="px-4 py-2 font-medium w-[100px]">Color</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const src = resolveLogoUrl(r.logo_url);
                    const busy = uploadingId !== null && String(uploadingId) === String(r.id);
                    return (
                      <tr
                        key={String(r.id)}
                        className="border-t border-border-light dark:border-border-dark align-middle"
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="shrink-0">
                              {src ? (
                                <img
                                  src={src}
                                  alt=""
                                  className="h-12 w-12 rounded-lg object-contain bg-white dark:bg-[#0d1117] border border-border-light dark:border-[#3b4754]"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-lg border border-dashed border-border-light dark:border-[#3b4754] flex items-center justify-center text-[10px] text-slate-400 text-center px-1">
                                  No logo
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <input
                                id={`party-logo-${r.id}`}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                disabled={busy}
                                onChange={(e) => handleLogoChange(r.id, e)}
                              />
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => document.getElementById(`party-logo-${r.id}`)?.click()}
                                className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                  busy
                                    ? 'bg-slate-200 text-slate-500 cursor-wait dark:bg-[#283039] dark:text-slate-400'
                                    : 'bg-primary text-white hover:bg-primary/90'
                                }`}
                              >
                                {busy ? 'Uploading…' : src ? 'Change logo' : 'Add logo'}
                              </button>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">JPEG, PNG, WebP · max 4MB</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">{r.name}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.short_name || '—'}</td>
                        <td className="px-4 py-3">
                          {r.color ? (
                            <span
                              className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"
                              title={r.color}
                            >
                              <span
                                className="inline-block h-6 w-6 rounded border border-border-light dark:border-[#3b4754]"
                                style={{ backgroundColor: r.color }}
                              />
                              {r.color}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PoliticalPartiesAdmin;
