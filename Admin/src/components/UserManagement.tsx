import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AdminSidebarNavContent } from './AdminSidebarNav';

type ProfileRow = {
  id: string;
  phone_number: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  title: string | null;
  alternate_phone: string | null;
  category: string | null;
  language: string | null;
  email: string | null;
  state: string | null;
  district: string | null;
  tahsil: string | null;
  designation: string | null;
  political_party: string | null;
  profile_complete: boolean | null;
  profile_photo_url: string | null;
  created_at: string;
  updated_at: string;
};

type LocationItem = { id: number | string; name: string };

const PAGE_SIZE = 50;

function displayName(row: ProfileRow): string {
  const parts = [row.first_name, row.middle_name, row.last_name].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return '—';
}

const UserManagement: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [profileComplete, setProfileComplete] = useState<string>('');
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [designation, setDesignation] = useState('');
  const [politicalParty, setPoliticalParty] = useState('');
  const [category, setCategory] = useState('');

  const [states, setStates] = useState<LocationItem[]>([]);
  const [districts, setDistricts] = useState<LocationItem[]>([]);
  const [tehsils, setTehsils] = useState<LocationItem[]>([]);
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedTehsilId, setSelectedTehsilId] = useState('');
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingTehsils, setLoadingTehsils] = useState(false);

  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const staticBaseUrl = apiBaseUrl.replace(/\/api$/, '');

  const resolvePhotoUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${staticBaseUrl}${url}`;
  };

  const appliedFilterNames = () => {
    const stateName = selectedStateId
      ? states.find((s) => String(s.id) === String(selectedStateId))?.name || ''
      : '';
    const districtName = selectedDistrictId
      ? districts.find((d) => String(d.id) === String(selectedDistrictId))?.name || ''
      : '';
    const tahsilName = selectedTehsilId
      ? tehsils.find((t) => String(t.id) === String(selectedTehsilId))?.name || ''
      : '';
    return { stateName, districtName, tahsilName };
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { stateName, districtName, tahsilName } = appliedFilterNames();
      const res = await api.listUsers({
        profile_complete: profileComplete || undefined,
        search: search.trim() || undefined,
        language: language.trim() || undefined,
        state: stateName || undefined,
        district: districtName || undefined,
        tahsil: tahsilName || undefined,
        designation: designation.trim() || undefined,
        political_party: politicalParty.trim() || undefined,
        category: category.trim() || undefined,
        limit: PAGE_SIZE,
        offset,
      });
      if (res?.success && Array.isArray(res.data)) {
        setRows(res.data as ProfileRow[]);
        setTotal(typeof res.total === 'number' ? res.total : 0);
      } else {
        setRows([]);
        setTotal(0);
        setError('Unexpected response');
      }
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [
    profileComplete,
    search,
    language,
    designation,
    politicalParty,
    category,
    offset,
    selectedStateId,
    selectedDistrictId,
    selectedTehsilId,
    states,
    districts,
    tehsils,
  ]);

  useEffect(() => {
    const loadStates = async () => {
      try {
        setLoadingStates(true);
        const res = await api.getStates();
        const list = res?.data && Array.isArray(res.data) ? res.data : [];
        setStates(
          list
            .filter((r: any) => r && r.id !== undefined && r.name)
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
        const list = res?.data && Array.isArray(res.data) ? res.data : [];
        setDistricts(
          list
            .filter((r: any) => r && r.id !== undefined && r.name)
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
        const list = res?.data && Array.isArray(res.data) ? res.data : [];
        setTehsils(
          list
            .filter((r: any) => r && r.id !== undefined && r.name)
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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const clearFilters = () => {
    setProfileComplete('');
    setSearch('');
    setLanguage('');
    setDesignation('');
    setPoliticalParty('');
    setCategory('');
    setSelectedStateId('');
    setSelectedDistrictId('');
    setSelectedTehsilId('');
    setOffset(0);
  };

  const onStateChange = (id: string) => {
    setSelectedStateId(id);
    setSelectedDistrictId('');
    setSelectedTehsilId('');
    setOffset(0);
  };

  const onDistrictChange = (id: string) => {
    setSelectedDistrictId(id);
    setSelectedTehsilId('');
    setOffset(0);
  };

  const showingFrom = total === 0 ? 0 : offset + 1;
  const showingTo = Math.min(offset + rows.length, total);
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

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
          <div className="flex items-center gap-4 w-full max-w-3xl">
            <button
              type="button"
              className="md:hidden p-2 text-slate-600 dark:text-white"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="flex flex-col">
              <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight">User Management</h2>
              <p className="text-slate-500 dark:text-[#9dabb9] text-sm">
                App users and profile fields (same as mobile profile setup)
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-6">
          <div className="max-w-[1400px] mx-auto flex flex-col gap-6">
            <div className="rounded-xl bg-white dark:bg-[#181b21] border border-border-light dark:border-[#3b4754] p-6 shadow-sm">
              <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-4">Filters</h3>
              <p className="text-xs text-slate-500 dark:text-[#9dabb9] mb-4">
                Match how users filled their profile: language, location, designation, party, and category. Location
                uses the same state → district → tahsil lists as the app.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Profile status</label>
                  <select
                    className="rounded-lg border border-border-light dark:border-[#3b4754] bg-white dark:bg-[#111418] px-3 py-2 text-slate-900 dark:text-white outline-none"
                    value={profileComplete}
                    onChange={(e) => {
                      setProfileComplete(e.target.value);
                      setOffset(0);
                    }}
                  >
                    <option value="">All users</option>
                    <option value="true">Profile complete</option>
                    <option value="false">Profile incomplete</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Search</label>
                  <input
                    className="rounded-lg border border-border-light dark:border-[#3b4754] bg-white dark:bg-[#111418] px-3 py-2 text-slate-900 dark:text-white outline-none"
                    placeholder="Phone, name, email, alternate phone…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setOffset(0);
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Language</label>
                  <input
                    className="rounded-lg border border-border-light dark:border-[#3b4754] bg-white dark:bg-[#111418] px-3 py-2 text-slate-900 dark:text-white outline-none"
                    placeholder="e.g. en, hi"
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      setOffset(0);
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">State</label>
                  <select
                    className="rounded-lg border border-border-light dark:border-[#3b4754] bg-white dark:bg-[#111418] px-3 py-2 text-slate-900 dark:text-white outline-none"
                    value={selectedStateId}
                    onChange={(e) => onStateChange(e.target.value)}
                  >
                    <option value="">{loadingStates ? 'Loading…' : 'Any state'}</option>
                    {states.map((s) => (
                      <option key={String(s.id)} value={String(s.id)}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">District</label>
                  <select
                    className="rounded-lg border border-border-light dark:border-[#3b4754] bg-white dark:bg-[#111418] px-3 py-2 text-slate-900 dark:text-white outline-none"
                    value={selectedDistrictId}
                    onChange={(e) => onDistrictChange(e.target.value)}
                    disabled={!selectedStateId}
                  >
                    <option value="">{loadingDistricts ? 'Loading…' : 'Any district'}</option>
                    {districts.map((d) => (
                      <option key={String(d.id)} value={String(d.id)}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Tahsil</label>
                  <select
                    className="rounded-lg border border-border-light dark:border-[#3b4754] bg-white dark:bg-[#111418] px-3 py-2 text-slate-900 dark:text-white outline-none"
                    value={selectedTehsilId}
                    onChange={(e) => {
                      setSelectedTehsilId(e.target.value);
                      setOffset(0);
                    }}
                    disabled={!selectedDistrictId}
                  >
                    <option value="">{loadingTehsils ? 'Loading…' : 'Any tahsil'}</option>
                    {tehsils.map((t) => (
                      <option key={String(t.id)} value={String(t.id)}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Designation</label>
                  <input
                    className="rounded-lg border border-border-light dark:border-[#3b4754] bg-white dark:bg-[#111418] px-3 py-2 text-slate-900 dark:text-white outline-none"
                    placeholder="Contains…"
                    value={designation}
                    onChange={(e) => {
                      setDesignation(e.target.value);
                      setOffset(0);
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Political party</label>
                  <input
                    className="rounded-lg border border-border-light dark:border-[#3b4754] bg-white dark:bg-[#111418] px-3 py-2 text-slate-900 dark:text-white outline-none"
                    placeholder="Contains…"
                    value={politicalParty}
                    onChange={(e) => {
                      setPoliticalParty(e.target.value);
                      setOffset(0);
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Category</label>
                  <input
                    className="rounded-lg border border-border-light dark:border-[#3b4754] bg-white dark:bg-[#111418] px-3 py-2 text-slate-900 dark:text-white outline-none"
                    placeholder="Profile category…"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setOffset(0);
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => clearFilters()}
                  className="rounded-lg border border-border-light dark:border-[#3b4754] px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#283039]"
                >
                  Clear filters
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div className="rounded-xl bg-white dark:bg-[#181b21] border border-border-light dark:border-[#3b4754] shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-border-light dark:border-[#3b4754]">
                <p className="text-sm text-slate-600 dark:text-[#9dabb9]">
                  {loading ? (
                    'Loading…'
                  ) : (
                    <>
                      Showing <span className="font-medium text-slate-900 dark:text-white">{showingFrom}</span>–
                      <span className="font-medium text-slate-900 dark:text-white">{showingTo}</span> of{' '}
                      <span className="font-medium text-slate-900 dark:text-white">{total}</span> users
                    </>
                  )}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!canPrev || loading}
                    onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                    className="rounded-lg border border-border-light dark:border-[#3b4754] px-3 py-1.5 text-sm font-medium disabled:opacity-40 text-slate-700 dark:text-slate-200"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={!canNext || loading}
                    onClick={() => setOffset((o) => o + PAGE_SIZE)}
                    className="rounded-lg border border-border-light dark:border-[#3b4754] px-3 py-1.5 text-sm font-medium disabled:opacity-40 text-slate-700 dark:text-slate-200"
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-[#111418] text-slate-600 dark:text-[#9dabb9] border-b border-border-light dark:border-[#3b4754]">
                    <tr>
                      <th className="px-3 py-3 font-semibold whitespace-nowrap">User</th>
                      <th className="px-3 py-3 font-semibold whitespace-nowrap">Phone</th>
                      <th className="px-3 py-3 font-semibold whitespace-nowrap">Profile</th>
                      <th className="px-3 py-3 font-semibold whitespace-nowrap">Language</th>
                      <th className="px-3 py-3 font-semibold whitespace-nowrap">State</th>
                      <th className="px-3 py-3 font-semibold whitespace-nowrap">District</th>
                      <th className="px-3 py-3 font-semibold whitespace-nowrap">Tahsil</th>
                      <th className="px-3 py-3 font-semibold whitespace-nowrap">Designation</th>
                      <th className="px-3 py-3 font-semibold whitespace-nowrap">Party</th>
                      <th className="px-3 py-3 font-semibold whitespace-nowrap">Category</th>
                      <th className="px-3 py-3 font-semibold whitespace-nowrap">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-[#3b4754]">
                    {!loading &&
                      rows.map((row) => {
                        const photo = resolvePhotoUrl(row.profile_photo_url);
                        return (
                          <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1c222c]">
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2 min-w-[140px]">
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt=""
                                    className="size-8 rounded-full object-cover bg-slate-200 dark:bg-slate-700"
                                  />
                                ) : (
                                  <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-500 text-[18px]">person</span>
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-900 dark:text-white truncate">
                                    {displayName(row)}
                                  </p>
                                  {row.email && (
                                    <p className="text-xs text-slate-500 dark:text-[#9dabb9] truncate">{row.email}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200 whitespace-nowrap font-mono text-xs">
                              {row.phone_number || '—'}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              {row.profile_complete ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-xs font-medium">
                                  Complete
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-400 px-2 py-0.5 text-xs font-medium">
                                  Incomplete
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {row.language || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 max-w-[120px] truncate" title={row.state || ''}>
                              {row.state || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 max-w-[120px] truncate" title={row.district || ''}>
                              {row.district || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 max-w-[120px] truncate" title={row.tahsil || ''}>
                              {row.tahsil || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 max-w-[140px] truncate" title={row.designation || ''}>
                              {row.designation || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 max-w-[120px] truncate" title={row.political_party || ''}>
                              {row.political_party || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 max-w-[100px] truncate" title={row.category || ''}>
                              {row.category || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-slate-500 dark:text-[#9dabb9] whitespace-nowrap text-xs">
                              {row.created_at
                                ? new Date(row.created_at).toLocaleString(undefined, {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })
                                : '—'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {!loading && rows.length === 0 && (
                  <div className="px-4 py-16 text-center text-slate-500 dark:text-[#9dabb9] text-sm">No users match these filters.</div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserManagement;
