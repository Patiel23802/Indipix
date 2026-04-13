import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

const ADMIN_ONLY_PREFIXES = ['/notifications', '/templates/categories', '/users'];

function isAdminOnlyPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return ADMIN_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const RequireAuth: React.FC = () => {
  const { user, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#111418]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (
    (user.role === 'designer' || user.role === 'creative_head') &&
    isAdminOnlyPath(location.pathname)
  ) {
    return <Navigate to="/templates" replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
