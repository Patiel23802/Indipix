import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AdminSidebarNavContent } from './AdminSidebarNav';

type Slide = {
  id: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
};

function publicAssetUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/api$/, '');
  return `${base}${path}`;
}

const HomeCarouselManager: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAdminHomeCarouselSlides();
      if (res?.success && Array.isArray(res.data)) {
        setSlides(res.data);
      } else {
        setSlides([]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setSlides([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (slides.length >= 3) {
      setUploadError('Maximum 3 images. Delete one to add another.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.createHomeCarouselSlide(fd);
      await load();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onSortBlur = async (id: string, value: string) => {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return;
    try {
      await api.updateHomeCarouselSlide(id, { sort_order: n });
      await load();
    } catch {
      await load();
    }
  };

  const toggleActive = async (s: Slide) => {
    try {
      await api.updateHomeCarouselSlide(s.id, { is_active: !s.is_active });
      await load();
    } catch {
      await load();
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this carousel image?')) return;
    try {
      await api.deleteHomeCarouselSlide(id);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
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

      <div className="flex-1 flex flex-col md:pl-64 h-screen overflow-hidden">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-border-light dark:border-border-dark bg-white dark:bg-[#111418] px-6 py-4 flex-shrink-0 z-10">
          <div className="flex items-center gap-4 w-full max-w-xl">
            <button
              type="button"
              className="md:hidden p-2 text-slate-600 dark:text-white"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="flex flex-col">
              <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight">Home carousel</h2>
              <p className="text-slate-500 dark:text-[#9dabb9] text-sm">
                Up to 3 images for the app home screen (auto-rotate every 2 seconds)
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-[#0d1114]">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="max-w-3xl rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-[#111418] p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <p className="text-sm text-slate-600 dark:text-[#9dabb9]">
                  {slides.length} / 3 images
                </p>
                {uploadError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{uploadError}</p>
                )}
              </div>
              <label
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary cursor-pointer hover:opacity-90 ${
                  slides.length >= 3 || uploading ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                {uploading ? 'Uploading…' : 'Add image'}
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={onFile} disabled={slides.length >= 3 || uploading} />
              </label>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
              </div>
            ) : slides.length === 0 ? (
              <p className="text-slate-500 dark:text-[#9dabb9] text-sm text-center py-8">
                No images yet. Add up to three; they appear on the mobile app home tab.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {slides.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-[#1a2229]"
                  >
                    <div className="shrink-0 w-full sm:w-48 aspect-[2/1] rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800">
                      <img
                        src={publicAssetUrl(s.image_url)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-3 min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="text-xs font-medium text-slate-500 dark:text-[#9dabb9] flex items-center gap-2">
                          Sort order
                          <input
                            type="number"
                            defaultValue={s.sort_order}
                            className="w-20 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#111418] text-slate-900 dark:text-white text-sm"
                            onBlur={(ev) => onSortBlur(s.id, ev.target.value)}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => toggleActive(s)}
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            s.is_active
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {s.is_active ? 'Active (shown in app)' : 'Inactive (hidden)'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate font-mono">{s.image_url}</p>
                      <div className="mt-auto">
                        <button
                          type="button"
                          onClick={() => remove(s.id)}
                          className="text-sm font-semibold text-red-600 dark:text-red-400 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default HomeCarouselManager;
