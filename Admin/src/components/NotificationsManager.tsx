import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { AdminSidebarNavContent } from './AdminSidebarNav';

type LocationItem = { id: number | string; name: string };

type NotificationItem = {
  id: number | string;
  title: string;
  body: string;
  data?: any;
  language: string | null;
  state: string | null;
  district: string | null;
  tahsil: string | null;
  created_at: string;
};

type CategoryOption = { id: number | string; name: string; slug: string };

const NotificationsManager: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    body: '',
    language: '',
    state: '',
    district: '',
    tahsil: '',
    dataJson: '',
    categorySlug: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [states, setStates] = useState<LocationItem[]>([]);
  const [districts, setDistricts] = useState<LocationItem[]>([]);
  const [tehsils, setTehsils] = useState<LocationItem[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingTehsils, setLoadingTehsils] = useState(false);
  const [selectedStateId, setSelectedStateId] = useState<string>('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const parsedData = useMemo(() => {
    const raw = form.dataJson.trim();
    if (!raw) return { ok: true as const, value: undefined as any };
    try {
      return { ok: true as const, value: JSON.parse(raw) };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || 'Invalid JSON' };
    }
  }, [form.dataJson]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setListError(null);
      const res = await api.getNotifications();
      if (res?.success && res.data) {
        setItems(Array.isArray(res.data) ? res.data : []);
      } else {
        setItems([]);
      }
    } catch (e: any) {
      setListError(e?.message || 'Failed to load notifications');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const res = (await api.getCategories()) as { success?: boolean; data?: any[] };
        const rows = res?.data && Array.isArray(res.data) ? res.data : [];
        setCategories(
          rows
            .filter((c: any) => c && c.slug && c.name)
            .map((c: any) => ({
              id: c.id,
              name: String(c.name),
              slug: String(c.slug),
            }))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      } catch {
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadStates = async () => {
      try {
        setLoadingStates(true);
        const res = await api.getStates();
        const rows = res?.data && Array.isArray(res.data) ? res.data : [];
        setStates(
          rows
            .filter((r: any) => r && (r.id !== undefined) && r.name)
            .map((r: any) => ({ id: r.id, name: String(r.name) }))
        );
      } catch {
        setStates([]);
      } finally {
        setLoadingStates(false);
      }
    };
    loadStates();
  }, []);

  useEffect(() => {
    const loadDistricts = async () => {
      if (!selectedStateId) {
        setDistricts([]);
        return;
      }
      try {
        setLoadingDistricts(true);
        const res = await api.getDistricts(selectedStateId);
        const rows = res?.data && Array.isArray(res.data) ? res.data : [];
        setDistricts(
          rows
            .filter((r: any) => r && (r.id !== undefined) && r.name)
            .map((r: any) => ({ id: r.id, name: String(r.name) }))
        );
      } catch {
        setDistricts([]);
      } finally {
        setLoadingDistricts(false);
      }
    };
    loadDistricts();
  }, [selectedStateId]);

  useEffect(() => {
    const loadTehsils = async () => {
      if (!selectedDistrictId) {
        setTehsils([]);
        return;
      }
      try {
        setLoadingTehsils(true);
        const res = await api.getTehsils(selectedDistrictId);
        const rows = res?.data && Array.isArray(res.data) ? res.data : [];
        setTehsils(
          rows
            .filter((r: any) => r && (r.id !== undefined) && r.name)
            .map((r: any) => ({ id: r.id, name: String(r.name) }))
        );
      } catch {
        setTehsils([]);
      } finally {
        setLoadingTehsils(false);
      }
    };
    loadTehsils();
  }, [selectedDistrictId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!form.title.trim() || !form.body.trim()) {
      setSubmitError('Title and message are required.');
      return;
    }
    if (!parsedData.ok) {
      setSubmitError(`Data JSON error: ${parsedData.error}`);
      return;
    }

    setSubmitting(true);
    try {
      await api.createNotification({
        title: form.title.trim(),
        body: form.body.trim(),
        data: parsedData.value,
        language: form.language.trim() ? form.language.trim() : null,
        state: form.state.trim() ? form.state.trim() : null,
        district: form.district.trim() ? form.district.trim() : null,
        tahsil: form.tahsil.trim() ? form.tahsil.trim() : null,
        ...(form.categorySlug.trim() ? { category_slug: form.categorySlug.trim() } : {}),
      });

      setSubmitSuccess('Notification created.');
      setForm(prev => ({ ...prev, title: '', body: '', dataJson: '', categorySlug: '' }));
      await fetchNotifications();
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to create notification');
    } finally {
      setSubmitting(false);
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

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col md:pl-64 h-screen overflow-hidden">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-border-light dark:border-border-dark bg-white dark:bg-[#111418] px-6 py-4 flex-shrink-0 z-10">
          <div className="flex items-center gap-4 w-full max-w-xl">
            <button
              className="md:hidden p-2 text-slate-600 dark:text-white"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="flex flex-col">
              <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight">Notifications</h2>
              <p className="text-slate-500 dark:text-[#9dabb9] text-sm">Create notifications filtered by language/state/district/tahsil</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-6">
          <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form */}
              <div className="rounded-xl bg-white dark:bg-[#181b21] border border-border-light dark:border-[#3b4754] p-6 shadow-sm">
                <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-4">Create Notification</h3>

                {submitError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                    {submitError}
                  </div>
                )}
                {submitSuccess && (
                  <div className="mb-4 rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm">
                    {submitSuccess}
                  </div>
                )}

                <form onSubmit={onSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Title</label>
                    <input
                      className="w-full rounded-lg border border-border-light dark:border-[#3b4754] bg-white dark:bg-[#111418] px-3 py-2 text-slate-900 dark:text-white outline-none"
                      value={form.title}
                      onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Eg: New festival templates available"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Message</label>
                    <textarea
                      className="w-full min-h-[110px] rounded-lg border border-border-light dark:border-[#3b4754] bg-white dark:bg-[#111418] px-3 py-2 text-slate-900 dark:text-white outline-none"
                      value={form.body}
                      onChange={(e) => setForm(prev => ({ ...prev, body: e.target.value }))}
                      placeholder="Write the notification message…"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Open template category on tap (optional)
                    </label>
                    <select
                      className="w-full rounded-lg border border-border-light dark:border-[#3b4754] bg-white dark:bg-[#111418] px-3 py-2 text-slate-900 dark:text-white outline-none"
                      value={form.categorySlug}
                      onChange={(e) => setForm(prev => ({ ...prev, categorySlug: e.target.value }))}
                    >
                      <option value="">
                        {loadingCategories ? 'Loading categories…' : 'None — notification only'}
                      </option>
                      {categories.map((c) => (
                        <option key={String(c.id)} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 dark:text-[#9dabb9]">
                      When set, the app opens this category’s template list after the user taps the push or in-app
                      notification.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Language (optional)</label>
                      <input
                        className="w-full rounded-lg border border-border-light dark:border-[#3b4754] bg-white dark:bg-[#111418] px-3 py-2 text-slate-900 dark:text-white outline-none"
                        value={form.language}
                        onChange={(e) => setForm(prev => ({ ...prev, language: e.target.value }))}
                        placeholder="Eg: en, hi"
                      />
                      <p className="text-xs text-slate-500 dark:text-[#9dabb9]">Leave blank to send for all languages</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">State (optional)</label>
                      <select
                        className="w-full rounded-lg border border-border-light dark:border-[#3b4754] bg-white dark:bg-[#111418] px-3 py-2 text-slate-900 dark:text-white outline-none"
                        value={selectedStateId}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          setSelectedStateId(nextId);
                          setSelectedDistrictId('');
                          setForm(prev => ({
                            ...prev,
                            state: nextId ? (states.find(s => String(s.id) === String(nextId))?.name || '') : '',
                            district: '',
                            tahsil: '',
                          }));
                        }}
                      >
                        <option value="">{loadingStates ? 'Loading…' : 'All states'}</option>
                        {states.map(s => (
                          <option key={String(s.id)} value={String(s.id)}>{s.name}</option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 dark:text-[#9dabb9]">Exact match against user profile state name</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">District (optional)</label>
                      <select
                        className="w-full rounded-lg border border-border-light dark:border-[#3b4754] bg-white dark:bg-[#111418] px-3 py-2 text-slate-900 dark:text-white outline-none disabled:opacity-60"
                        disabled={!selectedStateId}
                        value={selectedDistrictId}
                        onChange={(e) => {
                          const nextId = e.target.value;
                          setSelectedDistrictId(nextId);
                          setForm(prev => ({
                            ...prev,
                            district: nextId ? (districts.find(d => String(d.id) === String(nextId))?.name || '') : '',
                            tahsil: '',
                          }));
                        }}
                      >
                        <option value="">
                          {!selectedStateId ? 'Select state first' : (loadingDistricts ? 'Loading…' : 'All districts')}
                        </option>
                        {districts.map(d => (
                          <option key={String(d.id)} value={String(d.id)}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Tahsil (optional)</label>
                      <select
                        className="w-full rounded-lg border border-border-light dark:border-[#3b4754] bg-white dark:bg-[#111418] px-3 py-2 text-slate-900 dark:text-white outline-none disabled:opacity-60"
                        disabled={!selectedDistrictId}
                        value={form.tahsil}
                        onChange={(e) => setForm(prev => ({ ...prev, tahsil: e.target.value }))}
                      >
                        <option value="">
                          {!selectedDistrictId ? 'Select district first' : (loadingTehsils ? 'Loading…' : 'All tahsils')}
                        </option>
                        {tehsils.map(t => (
                          <option key={String(t.id)} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Data (optional JSON)
                    </label>
                    <textarea
                      className="w-full min-h-[90px] rounded-lg border border-border-light dark:border-[#3b4754] bg-white dark:bg-[#111418] px-3 py-2 text-slate-900 dark:text-white outline-none font-mono text-xs"
                      value={form.dataJson}
                      onChange={(e) => setForm(prev => ({ ...prev, dataJson: e.target.value }))}
                      placeholder='{"screen":"template","id":"123"}'
                    />
                    {!parsedData.ok && (
                      <p className="text-xs text-red-600">Invalid JSON: {parsedData.error}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className={`inline-flex items-center justify-center rounded-lg px-4 py-2 font-semibold text-sm transition-colors ${
                      submitting ? 'bg-slate-300 text-slate-700' : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                  >
                    {submitting ? 'Creating…' : 'Create Notification'}
                  </button>
                </form>
              </div>

              {/* Recent list */}
              <div className="rounded-xl bg-white dark:bg-[#181b21] border border-border-light dark:border-[#3b4754] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-900 dark:text-white text-lg font-bold">Recent Notifications</h3>
                  <button
                    className="text-sm text-primary hover:text-primary/80 font-medium"
                    onClick={fetchNotifications}
                  >
                    Refresh
                  </button>
                </div>

                {listError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                    {listError}
                  </div>
                )}

                {loading ? (
                  <p className="text-slate-500 dark:text-[#9dabb9] text-sm">Loading…</p>
                ) : items.length === 0 ? (
                  <p className="text-slate-500 dark:text-[#9dabb9] text-sm">No notifications yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {items.slice(0, 20).map((n) => (
                      <div key={String(n.id)} className="rounded-lg border border-border-light dark:border-[#3b4754] bg-slate-50 dark:bg-[#111418] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-col gap-1">
                            <p className="text-slate-900 dark:text-white font-semibold">{n.title}</p>
                            <p className="text-slate-600 dark:text-[#9dabb9] text-sm whitespace-pre-wrap">{n.body}</p>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-[#9dabb9] whitespace-nowrap">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          {n.data?.category_slug ? (
                            <span className="px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                              category: {String(n.data.category_slug)}
                            </span>
                          ) : null}
                          <span className="px-2 py-1 rounded bg-white dark:bg-[#181b21] border border-border-light dark:border-[#3b4754] text-slate-600 dark:text-[#9dabb9]">
                            language: {n.language ?? 'all'}
                          </span>
                          <span className="px-2 py-1 rounded bg-white dark:bg-[#181b21] border border-border-light dark:border-[#3b4754] text-slate-600 dark:text-[#9dabb9]">
                            state: {n.state ?? 'all'}
                          </span>
                          <span className="px-2 py-1 rounded bg-white dark:bg-[#181b21] border border-border-light dark:border-[#3b4754] text-slate-600 dark:text-[#9dabb9]">
                            district: {n.district ?? 'all'}
                          </span>
                          <span className="px-2 py-1 rounded bg-white dark:bg-[#181b21] border border-border-light dark:border-[#3b4754] text-slate-600 dark:text-[#9dabb9]">
                            tahsil: {n.tahsil ?? 'all'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default NotificationsManager;

