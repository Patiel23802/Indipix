import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { AdminSidebarNavContent } from './AdminSidebarNav';

type OverviewData = {
  period: { year: number; month: number; start: string; end: string };
  users: { total: number; new_this_month: number; new_prev_month: number; change_pct: number };
  mrr: {
    amount: number;
    currency: string;
    revenue_this_month: number;
    revenue_prev_month: number;
    change_pct: number;
  };
  templates: {
    active: number;
    updated_last_24h: number;
    new_this_month: number;
    new_prev_month: number;
    change_pct: number;
  };
  chart: { title: string; labels: string[]; values: number[]; max: number; unit: string };
};

function formatPeriodRange(year: number, month: number): string {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const o: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${start.toLocaleDateString('en-US', o)} - ${end.toLocaleDateString('en-US', o)}`;
}

function formatInt(n: number) {
  return new Intl.NumberFormat('en-IN').format(Math.round(n));
}

function formatMoney(n: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency || 'INR'} ${formatInt(n)}`;
  }
}

function TrendPill({ pct }: { pct: number }) {
  const up = pct >= 0;
  const label = Math.abs(pct) > 999 ? (up ? '>999%' : '<-999%') : `${up ? '+' : ''}${pct}%`;
  return (
    <div
      className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold mb-1 ${
        up ? 'text-[#0bda5b] bg-[#0bda5b]/10' : 'text-red-500 bg-red-500/10'
      }`}
    >
      <span className="material-symbols-outlined text-[14px]">{up ? 'trending_up' : 'trending_down'}</span>
      <span>{label}</span>
    </div>
  );
}

const Dashboard: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const now = new Date();
  const [period, setPeriod] = useState({ y: now.getUTCFullYear(), m: now.getUTCMonth() + 1 });
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);
      const res = await api.getDashboardOverview({ year: period.y, month: period.m });
      if (res?.success && res.data) {
        setOverview(res.data as OverviewData);
      } else {
        setOverview(null);
        setStatsError('Could not load dashboard metrics');
      }
    } catch (e) {
      setOverview(null);
      setStatsError(e instanceof Error ? e.message : 'Failed to load metrics');
    } finally {
      setStatsLoading(false);
    }
  }, [period.y, period.m]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const shiftMonth = (delta: number) => {
    setPeriod(({ y, m }) => {
      let nextM = m + delta;
      let nextY = y;
      if (nextM < 1) {
        nextM = 12;
        nextY -= 1;
      } else if (nextM > 12) {
        nextM = 1;
        nextY += 1;
      }
      return { y: nextY, m: nextM };
    });
  };

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden">
      {/* Side Navigation */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/40 z-10 md:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`flex w-64 flex-col bg-white dark:bg-[#111418] border-r border-border-light dark:border-border-dark flex-shrink-0 fixed h-full z-20 overflow-y-auto transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <AdminSidebarNavContent theme="dashboard" onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col md:pl-64 h-screen overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-border-light dark:border-border-dark bg-white dark:bg-[#111418] px-6 py-4 flex-shrink-0 z-10">
          <div className="flex items-center gap-4 w-full max-w-xl">
            <button 
              className="md:hidden p-2 text-slate-600 dark:text-white"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <label className="flex flex-col w-full !h-10">
              <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-slate-100 dark:bg-[#283039] overflow-hidden">
                <div className="text-slate-500 dark:text-[#9dabb9] flex border-none items-center justify-center pl-4">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </div>
                <input 
                  className="w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 border-none bg-transparent h-full placeholder:text-slate-500 dark:placeholder:text-[#9dabb9] px-3 text-sm font-normal leading-normal" 
                  placeholder="Search..."
                />
              </div>
            </label>
          </div>
          <div className="flex items-center justify-end gap-4 ml-4">
            <button className="flex items-center justify-center rounded-lg size-10 bg-slate-100 dark:bg-[#283039] text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
            <div className="h-8 w-px bg-border-light dark:bg-border-dark mx-1"></div>
            <div className="flex items-center gap-3 cursor-pointer">
              <div 
                className="bg-center bg-no-repeat bg-cover rounded-full size-10 border border-border-light dark:border-border-dark" 
                data-alt="Admin user profile picture" 
                style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBFDp-4cPu1NYhLIByvRnin9ZpwTEhHG4fY2IPIP25fNqEQMqWybea9KqLTCcJj-0CHf_sOJck3IaLgcQbVEkMBbcX67nhpTLM-eSvYoLkqWLy5_19nTNgLLoAKBFWaHSYsop2LzHg5IATFWFS2tOAHkC1OMrqeXDQC89n7d3Z7lKFdIGMLmxxRmzhH4UNsHA-fxjuwlB-1HTog3IXVYrW9ktuF7jRIBe3PGXIByU1Q9QNRD_yHm6HWyN9Eho7ciB1CXIiacCYRUFk")'}}
              ></div>
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-medium text-slate-900 dark:text-white leading-tight">Alex Morgan</span>
                <span className="text-xs text-slate-500 dark:text-[#9dabb9]">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-6">
          <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
            {/* Page Heading & Date Picker */}
            <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-slate-900 dark:text-white text-2xl md:text-3xl font-bold leading-tight tracking-[-0.015em]">Dashboard Overview</h2>
                <p className="text-slate-500 dark:text-[#9dabb9] text-sm md:text-base font-normal leading-normal">Welcome back, here is what is happening with your application today.</p>
              </div>
              <div className="flex items-center bg-white dark:bg-[#283039] rounded-lg p-1 border border-border-light dark:border-border-dark shadow-sm">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-md text-slate-500 dark:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px] block">chevron_left</span>
                </button>
                <div className="flex items-center gap-2 px-3 text-sm font-medium text-slate-900 dark:text-white">
                  <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-[#9dabb9]">calendar_today</span>
                  <span>{formatPeriodRange(period.y, period.m)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-md text-slate-500 dark:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px] block">chevron_right</span>
                </button>
              </div>
            </div>

            {statsError && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 px-4 py-3 text-sm">
                {statsError}
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#181b21] border border-border-light dark:border-[#3b4754] shadow-sm relative min-h-[140px]">
                <div className="flex items-center justify-between">
                  <p className="text-slate-500 dark:text-[#9dabb9] text-sm font-medium uppercase tracking-wider">Total Users</p>
                  <span className="material-symbols-outlined text-primary/80">group</span>
                </div>
                <div className="flex items-end gap-2 mt-2">
                  <p className="text-slate-900 dark:text-white text-3xl font-bold leading-tight">
                    {statsLoading ? '—' : formatInt(overview?.users.total ?? 0)}
                  </p>
                  {!statsLoading && overview ? <TrendPill pct={overview.users.change_pct} /> : null}
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                  New sign-ups vs previous month ({formatInt(overview?.users.new_this_month ?? 0)} this period)
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#181b21] border border-border-light dark:border-[#3b4754] shadow-sm relative min-h-[140px]">
                <div className="flex items-center justify-between">
                  <p className="text-slate-500 dark:text-[#9dabb9] text-sm font-medium uppercase tracking-wider">MRR (est.)</p>
                  <span className="material-symbols-outlined text-primary/80">attach_money</span>
                </div>
                <div className="flex items-end gap-2 mt-2">
                  <p className="text-slate-900 dark:text-white text-3xl font-bold leading-tight">
                    {statsLoading
                      ? '—'
                      : formatMoney(overview?.mrr.amount ?? 0, overview?.mrr.currency ?? 'INR')}
                  </p>
                  {!statsLoading && overview ? <TrendPill pct={overview.mrr.change_pct} /> : null}
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                  Active subscriptions (trend from payment totals vs previous month)
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#181b21] border border-border-light dark:border-[#3b4754] shadow-sm relative min-h-[140px]">
                <div className="flex items-center justify-between">
                  <p className="text-slate-500 dark:text-[#9dabb9] text-sm font-medium uppercase tracking-wider">Active Templates</p>
                  <span className="material-symbols-outlined text-primary/80">layers</span>
                </div>
                <div className="flex items-end gap-2 mt-2">
                  <p className="text-slate-900 dark:text-white text-3xl font-bold leading-tight">
                    {statsLoading ? '—' : formatInt(overview?.templates.active ?? 0)}
                  </p>
                  {!statsLoading && overview ? <TrendPill pct={overview.templates.change_pct} /> : null}
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                  {statsLoading
                    ? '…'
                    : `${formatInt(overview?.templates.updated_last_24h ?? 0)} updated in last 24h · ${formatInt(overview?.templates.new_this_month ?? 0)} new this month`}
                </p>
              </div>
            </div>

            {/* Main Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-xl bg-white dark:bg-[#181b21] border border-border-light dark:border-[#3b4754] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-slate-900 dark:text-white text-lg font-bold">
                    {statsLoading ? 'Loading…' : overview?.chart.title ?? 'Activity'}
                  </h3>
                  <Link to="/templates" className="text-sm text-primary hover:text-primary/80 font-medium">
                    Template library
                  </Link>
                </div>
                <div className="relative w-full h-64 bg-slate-50 dark:bg-[#111418] rounded-lg overflow-x-auto">
                  {statsLoading || !overview ? (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 dark:text-[#9dabb9] text-sm">Loading chart…</div>
                  ) : (
                    <div className="h-56 px-2 pt-6 pb-2 flex items-end gap-px min-w-full">
                      {overview.chart.values.map((v, i) => {
                        const maxPx = 200;
                        const h = Math.max(v > 0 ? 6 : 2, Math.round((v / overview.chart.max) * maxPx));
                        const label = overview.chart.labels[i] ?? String(i + 1);
                        const tip =
                          overview.chart.unit === 'users'
                            ? `${formatInt(v)} users`
                            : formatMoney(v, overview.mrr.currency);
                        return (
                          <div
                            key={`${label}-${i}`}
                            className="flex-1 min-w-[5px] max-w-[18px] flex flex-col justify-end items-center group"
                          >
                            <div
                              className="w-full bg-primary/25 hover:bg-primary/45 rounded-t transition-all duration-300 relative"
                              style={{ height: `${h}px` }}
                            >
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                {tip}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex justify-between mt-4 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 gap-1 overflow-x-auto">
                  {overview && !statsLoading ? (
                    overview.chart.labels.map((lab) => (
                      <span key={lab} className="min-w-[10px] text-center flex-1">
                        {lab}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 dark:text-[#9dabb9]">Day of month</span>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col gap-4">
                <div className="rounded-xl bg-white dark:bg-[#181b21] border border-border-light dark:border-[#3b4754] p-6 shadow-sm flex-1">
                  <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={() => navigate('/notifications')}
                      className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-[#283039] hover:bg-slate-100 dark:hover:bg-[#3b4754] transition-colors text-left group w-full"
                    >
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <span className="material-symbols-outlined">notifications_active</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-900 dark:text-white font-medium text-sm">Notifications</span>
                        <span className="text-slate-500 dark:text-[#9dabb9] text-xs">Broadcast to app users</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/templates/new')}
                      className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-[#283039] hover:bg-slate-100 dark:hover:bg-[#3b4754] transition-colors text-left group w-full"
                    >
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <span className="material-symbols-outlined">post_add</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-900 dark:text-white font-medium text-sm">Create Template</span>
                        <span className="text-slate-500 dark:text-[#9dabb9] text-xs">Start from scratch</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/templates/categories')}
                      className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 dark:bg-[#283039] hover:bg-slate-100 dark:hover:bg-[#3b4754] transition-colors text-left group w-full"
                    >
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <span className="material-symbols-outlined">category</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-slate-900 dark:text-white font-medium text-sm">Manage categories</span>
                        <span className="text-slate-500 dark:text-[#9dabb9] text-xs">Organize template groups</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Transactions Table */}
            <div className="rounded-xl bg-white dark:bg-[#181b21] border border-border-light dark:border-[#3b4754] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border-light dark:border-[#283039] flex justify-between items-center">
                <h3 className="text-slate-900 dark:text-white text-lg font-bold">Recent Transactions</h3>
                <button className="text-sm text-slate-500 dark:text-[#9dabb9] hover:text-primary transition-colors flex items-center gap-1">
                  Filter <span className="material-symbols-outlined text-[18px]">filter_list</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-500 dark:text-[#9dabb9]">
                  <thead className="text-xs text-slate-500 dark:text-[#9dabb9] uppercase bg-slate-50 dark:bg-[#283039]">
                    <tr>
                      <th className="px-6 py-4 font-medium" scope="col">User</th>
                      <th className="px-6 py-4 font-medium" scope="col">Status</th>
                      <th className="px-6 py-4 font-medium" scope="col">Date</th>
                      <th className="px-6 py-4 font-medium text-right" scope="col">Amount</th>
                      <th className="px-6 py-4 font-medium text-right" scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-[#283039] bg-white dark:bg-[#181b21]">
                    <tr className="hover:bg-slate-50 dark:hover:bg-[#111418] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-xs">JS</div>
                          <div className="flex flex-col">
                            <p className="text-slate-900 dark:text-white font-medium">John Smith</p>
                            <p className="text-xs">john@example.com</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 py-1 px-2 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <span className="size-1.5 rounded-full bg-current"></span>
                          Completed
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">Oct 24, 2023</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-slate-900 dark:text-white font-medium">$120.00</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button className="text-slate-400 hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[20px]">more_vert</span>
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-[#111418] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">AL</div>
                          <div className="flex flex-col">
                            <p className="text-slate-900 dark:text-white font-medium">Alice Lee</p>
                            <p className="text-xs">alice@example.com</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 py-1 px-2 rounded text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                          <span className="size-1.5 rounded-full bg-current"></span>
                          Pending
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">Oct 23, 2023</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-slate-900 dark:text-white font-medium">$59.00</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button className="text-slate-400 hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[20px]">more_vert</span>
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-[#111418] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 font-bold text-xs">RW</div>
                          <div className="flex flex-col">
                            <p className="text-slate-900 dark:text-white font-medium">Robert W.</p>
                            <p className="text-xs">rob.w@example.com</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 py-1 px-2 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <span className="size-1.5 rounded-full bg-current"></span>
                          Completed
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">Oct 23, 2023</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-slate-900 dark:text-white font-medium">$240.00</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button className="text-slate-400 hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[20px]">more_vert</span>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-border-light dark:border-[#283039] flex justify-center">
                <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">View All Transactions</button>
              </div>
            </div>

            {/* Spacer for bottom scroll */}
            <div className="h-10"></div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;

