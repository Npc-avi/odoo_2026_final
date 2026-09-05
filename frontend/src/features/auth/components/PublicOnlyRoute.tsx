import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hook/useAuth';

export const PublicOnlyRoute: React.FC = () => {
  const { user, checkingAuth } = useAuth();

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-white">
        <div className="w-8 h-8 border-2 border-white/20 border-t-[#ff3b30] rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    if (user.role === 'customer_portal') {
      return <Navigate to="/portal" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
