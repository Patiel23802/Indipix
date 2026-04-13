import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

const LoginPage: React.FC = () => {
  const { user, loading, login } = useAdminAuth();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0d1117]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    const templateOnly =
      user.role === 'designer' || user.role === 'creative_head';
    const dest =
      templateOnly &&
      (from === '/' ||
        from.startsWith('/notifications') ||
        from.startsWith('/templates/categories') ||
        from.startsWith('/users'))
        ? '/templates'
        : from;
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-[#0d1117] dark:to-[#111418] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111418] border border-slate-200 dark:border-[#29303b] shadow-xl p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Chitrakala Admin</h1>
          <p className="text-sm text-slate-500 dark:text-[#9dabb9] mt-1">Sign in with your workspace account</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm px-3 py-2">
              {error}
            </div>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600 dark:text-[#9dabb9]">Username</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-[#29303b] bg-white dark:bg-[#1c242e] text-slate-900 dark:text-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              placeholder="admin, designer, or creative_head"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-600 dark:text-[#9dabb9]">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-[#29303b] bg-white dark:bg-[#1c242e] text-slate-900 dark:text-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              required
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-primary hover:bg-blue-600 disabled:opacity-60 text-white font-semibold py-2.5 text-sm transition-colors"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
