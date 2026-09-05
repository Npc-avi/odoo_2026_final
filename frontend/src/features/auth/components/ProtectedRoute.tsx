import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hook/useAuth';
import { AppNavbar } from '@/components/AppNavbar';
import { UserRole } from '../auth.context';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, checkingAuth } = useAuth();

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-[#111111] space-y-4 font-mono">
        <div className="w-8 h-8 rounded-full border-2 border-neutral-300 border-t-[#ff3b30] animate-spin" />
        <p className="text-xs text-neutral-500 tracking-widest uppercase">AUTHENTICATING TELEMETRY NODE...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-white text-[#111111] relative flex flex-col">
        <AppNavbar />
        <main className="flex-1 pt-28 pb-20 px-4 sm:px-8 max-w-4xl mx-auto flex items-center justify-center">
          <div className="w-full text-center p-8 sm:p-12 rounded-3xl border border-neutral-200 bg-white text-neutral-900 shadow-sm space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-[#ff3b30] font-mono text-[10px] font-bold tracking-widest uppercase">
              SECURITY EXCEPTION // 403
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl text-neutral-900 uppercase tracking-tight">
              ACCESS RESTRICTED
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 font-mono max-w-md mx-auto leading-relaxed">
              Your identity role ({user.role}) does not have clearance to access this governance module.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#111111] relative selection:bg-[#ff3b30] selection:text-white border-b border-[#e5e5e5]">
      {/* Top Floating Glassmorphic App Navbar */}
      <AppNavbar />

      {/* Main Full-Bleed Content Stage matching Landing Page Margins & Max-Width */}
      <main className="pt-24 sm:pt-28 pb-20 px-4 sm:px-6 md:px-10 lg:px-12 max-w-[1720px] mx-auto relative z-10 animate-fadeIn">
        <Outlet />
      </main>
    </div>
  );
};
