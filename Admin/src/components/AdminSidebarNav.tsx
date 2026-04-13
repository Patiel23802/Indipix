import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

type Props = {
  onNavigate?: () => void;
  theme?: 'console' | 'dashboard';
};

export function AdminSidebarNavContent({ onNavigate, theme = 'console' }: Props) {
  const location = useLocation();
  const { user, logout, isAdmin } = useAdminAuth();
  const templateSection =
    location.pathname === '/templates' || location.pathname.startsWith('/templates/');

  const navClass = (active: boolean) =>
    theme === 'dashboard'
      ? `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
          active
            ? 'bg-primary text-white'
            : 'text-slate-600 dark:text-[#9dabb9] hover:bg-slate-100 dark:hover:bg-[#283039] hover:text-slate-900 dark:hover:text-white'
        }`
      : `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
          active
            ? 'bg-primary text-white shadow-md shadow-primary/20'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`;

  const iconClass = (active: boolean) =>
    theme === 'dashboard'
      ? 'material-symbols-outlined text-[24px]'
      : `material-symbols-outlined text-[24px] ${active ? '' : 'group-hover:text-primary transition-colors'}`;

  return (
    <div
      className={
        theme === 'dashboard'
          ? 'flex flex-col gap-4 p-4 h-full'
          : 'flex flex-col h-full justify-between p-4'
      }
    >
      <div className={theme === 'console' ? 'flex flex-col gap-6' : ''}>
        {theme === 'dashboard' ? (
          <div className="flex flex-col px-2 mb-4">
            <h1 className="text-slate-900 dark:text-white text-xl font-bold leading-normal tracking-tight">
              Admin Panel
            </h1>
            <p className="text-slate-500 dark:text-[#9dabb9] text-xs font-normal leading-normal">
              Management Console
            </p>
            {user && (
              <p
                className="text-slate-400 dark:text-[#7a8794] text-xs mt-2 truncate"
                title={user.email}
              >
                {user.name || user.username}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2">
            <div className="rounded-full size-10 bg-primary/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-[22px]">person</span>
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-base font-bold leading-tight dark:text-white text-gray-900 truncate">
                Admin Console
              </h1>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
                {user?.name || user?.username || '—'}
              </p>
            </div>
          </div>
        )}

        <nav className={`flex flex-col gap-2 ${theme === 'dashboard' ? 'flex-1' : ''}`}>
          {isAdmin && (
            <NavLink to="/" end onClick={onNavigate} className={({ isActive }) => navClass(isActive)}>
              <span className={iconClass(location.pathname === '/')}>dashboard</span>
              <p className="text-sm font-medium leading-normal">Dashboard</p>
            </NavLink>
          )}
          {isAdmin && (
            <NavLink
              to="/users"
              onClick={onNavigate}
              className={({ isActive }) =>
                navClass(isActive || location.pathname.startsWith('/users'))
              }
            >
              <span
                className={iconClass(
                  location.pathname === '/users' || location.pathname.startsWith('/users/')
                )}
              >
                group
              </span>
              <p className="text-sm font-medium leading-normal">User Management</p>
            </NavLink>
          )}
          <NavLink
            to="/templates"
            onClick={onNavigate}
            className={() => navClass(templateSection)}
          >
            <span className={iconClass(templateSection)}>library_books</span>
            <p className="text-sm font-medium leading-normal">Template Library</p>
          </NavLink>
          {isAdmin && (
            <>
              <NavLink
                to="/templates/categories"
                onClick={onNavigate}
                className={({ isActive }) => navClass(isActive)}
              >
                <span className={iconClass(location.pathname === '/templates/categories')}>
                  category
                </span>
                <p className="text-sm font-medium leading-normal">Category Manager</p>
              </NavLink>
              <NavLink
                to="/notifications"
                onClick={onNavigate}
                className={({ isActive }) => navClass(isActive)}
              >
                <span className={iconClass(location.pathname === '/notifications')}>
                  notifications
                </span>
                <p className="text-sm font-medium leading-normal">Notifications</p>
              </NavLink>
              <NavLink
                to="/suggestions"
                onClick={onNavigate}
                className={({ isActive }) => navClass(isActive)}
              >
                <span className={iconClass(location.pathname === '/suggestions')}>chat</span>
                <p className="text-sm font-medium leading-normal">User suggestions</p>
              </NavLink>
              <NavLink
                to="/home-carousel"
                onClick={onNavigate}
                className={({ isActive }) => navClass(isActive)}
              >
                <span className={iconClass(location.pathname === '/home-carousel')}>
                  view_carousel
                </span>
                <p className="text-sm font-medium leading-normal">Home carousel</p>
              </NavLink>
              <NavLink
                to="/political-parties"
                onClick={onNavigate}
                className={({ isActive }) => navClass(isActive)}
              >
                <span className={iconClass(location.pathname === '/political-parties')}>flag</span>
                <p className="text-sm font-medium leading-normal">Political parties</p>
              </NavLink>
            </>
          )}
        </nav>
      </div>

      <div
        className={
          theme === 'dashboard'
            ? 'flex flex-col gap-1 mt-auto border-t border-border-light dark:border-border-dark pt-4'
            : 'px-3 py-2'
        }
      >
        <button
          type="button"
          onClick={() => {
            logout();
            onNavigate?.();
          }}
          className={
            theme === 'dashboard'
              ? 'flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-[#9dabb9] hover:bg-slate-100 dark:hover:bg-[#283039] w-full text-left'
              : 'flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 w-full text-left'
          }
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="text-sm font-medium">Sign out</span>
        </button>
      </div>
    </div>
  );
}
