import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hook/useAuth';
import { ScrambleCTAButton } from './ScrambleCTAButton';
import { Menu, X, Shield, Building2, User as UserIcon } from 'lucide-react';
import { CustomerProfileModal } from '@/features/portal/components/CustomerProfileModal';

export const AppNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isPortal = user?.role === 'customer_portal';

  interface NavItem {
    label: string;
    path: string;
    roles?: string[];
  }

  const staffNavItems: NavItem[] = [
    { label: 'DASHBOARD', path: '/dashboard' },
    { label: 'QUOTATIONS', path: '/quotations' },
    { label: 'APPROVALS', path: '/approvals', roles: ['admin', 'sales_manager', 'finance', 'sales_rep'] },
    { label: 'GOVERNANCE', path: '/governance', roles: ['admin', 'sales_manager'] },
    { label: 'FULFILLMENT', path: '/fulfillment' },
    { label: 'INVOICES', path: '/invoices' },
    { label: 'DEAL HEALTH', path: '/dealhealth', roles: ['admin', 'sales_manager', 'finance'] },
  ];

  const portalNavItems: NavItem[] = [
    { label: 'CATALOGUE', path: '/portal/catalog' },
    { label: 'OVERVIEW', path: '/portal' },
    { label: 'MY QUOTATIONS', path: '/portal/quotations' },
    { label: 'BILLING & INVOICES', path: '/portal/invoices' },
  ];

  const navItems = isPortal ? portalNavItems : staffNavItems;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="fixed top-3 sm:top-5 left-0 right-0 z-50 flex justify-center px-3 sm:px-6 pointer-events-none">
      <div className="w-full max-w-[1520px] pointer-events-auto">
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 rounded-full backdrop-blur-2xl bg-[#071324]/85 border border-white/15 shadow-2xl shadow-black/80 text-white transition-all">
          {/* Left: Brand Logo & Workspace Tag */}
          <div className="flex items-center space-x-3 shrink-0">
            <NavLink to={isPortal ? '/portal' : '/dashboard'} className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#ff3b30] flex items-center justify-center text-white font-bold text-xs shadow-[0_0_15px_rgba(255,59,48,0.4)]">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black tracking-tight text-xs sm:text-sm uppercase text-white">
                  DEALFLOW<span className="text-[#ff3b30]">360</span>
                </span>
                <span className="text-[8px] font-mono tracking-widest text-neutral-400 uppercase -mt-0.5">
                  {isPortal ? 'CLIENT PORTAL' : 'SALES OPERATIONS'}
                </span>
              </div>
            </NavLink>

            {/* Tenant / Organization Chip */}
            {user?.tenantName && (
              <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-neutral-300">
                <Building2 className="w-3 h-3 text-[#ff3b30]" />
                <span className="truncate max-w-[140px] uppercase font-bold">{user.tenantName}</span>
              </span>
            )}
          </div>

          {/* Center: Desktop Navigation Links (Floating like landing page navbar) */}
          <nav className="hidden lg:flex items-center justify-center gap-4 xl:gap-6 text-[10px] xl:text-[11px] font-mono font-bold tracking-wider">
            {navItems.map((item) => {
              if (item.roles && user?.role && !item.roles.includes(user.role)) {
                return null;
              }
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/portal' || item.path === '/dashboard'}
                  className={({ isActive }) =>
                    `py-1.5 px-3 rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none cursor-pointer transform active:scale-[0.96] ${
                      isActive
                        ? 'text-white bg-[#ff3b30] shadow-[0_0_14px_rgba(255,59,48,0.45)] scale-[1.02]'
                        : 'text-neutral-400 hover:text-white hover:bg-white/10'
                    }`
                  }
                >
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right: User Profile Chip & Logout Button */}
          <div className="hidden sm:flex items-center space-x-3 shrink-0">
            {user && (
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                title="View Account & Subscription"
                className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-right cursor-pointer transition-all active:scale-[0.98] group"
              >
                <div className="w-6 h-6 rounded-full bg-neutral-900 border border-white/20 flex items-center justify-center text-neutral-300 group-hover:text-[#ff3b30] group-hover:border-[#ff3b30]/50 transition-colors">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-mono font-bold text-white leading-tight truncate max-w-[120px]">
                    {user.fullName || user.email.split('@')[0]}
                  </div>
                  <div className="text-[8px] font-mono text-[#ff3b30] uppercase leading-none font-bold">
                    {user.customerTier ? `${user.customerTier} TIER` : user.role.replace('_', ' ')}
                  </div>
                </div>
              </button>
            )}

            <ScrambleCTAButton
              text="LOGOUT"
              variant="black"
              size="xs"
              arrowIcon="diagonal"
              onClick={handleLogout}
              className="border-neutral-700 hover:border-[#ff3b30]"
            />
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-full text-white hover:text-[#ff3b30] cursor-pointer transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#071324]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 space-y-4 shadow-2xl text-white mt-2 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-[#ff3b30]" />
                <span className="text-xs font-mono font-bold uppercase text-white">
                  {user?.fullName || user?.email} ({user?.role})
                </span>
              </div>
            </div>

            <nav className="flex flex-col space-y-1 font-mono text-xs font-bold">
              {navItems.map((item) => {
                if (item.roles && user?.role && !item.roles.includes(user.role)) {
                  return null;
                }
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/portal' || item.path === '/dashboard'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `py-2.5 px-3.5 rounded-xl flex items-center justify-between transition-all duration-200 ease-out active:scale-[0.98] ${
                        isActive
                          ? 'bg-[#ff3b30] text-white shadow-md'
                          : 'text-neutral-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <span>{item.label}</span>
                    <span>&rarr;</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="pt-2 border-t border-white/10">
              <ScrambleCTAButton
                text="LOGOUT"
                variant="red"
                size="sm"
                className="w-full justify-center"
                arrowIcon="diagonal"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Customer Profile & Subscription Modal */}
      <CustomerProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </header>
  );
};
