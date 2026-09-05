import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/features/auth/hook/useAuth';
import {
  LayoutDashboard,
  FileText,
  GitPullRequest,
  CheckCircle2,
  Truck,
  Receipt,
  Activity,
  UserCheck
} from 'lucide-react';

export const AppSidebar: React.FC = () => {
  const { user } = useAuth();
  const isPortal = user?.role === 'customer_portal';

  interface NavItem {
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    roles?: string[];
  }

  const staffNavItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Quotations', path: '/quotations', icon: FileText },
    { label: 'RFQs & Inquiries', path: '/rfqs', icon: GitPullRequest },
    { label: 'Discount Approvals', path: '/approvals', icon: CheckCircle2, roles: ['admin', 'sales_manager', 'finance'] },
    { label: 'Warehouses & Orders', path: '/fulfillment', icon: Truck },
    { label: 'Invoices & Billing', path: '/billing', icon: Receipt },
    { label: 'Deal Health Monitor', path: '/dealhealth', icon: Activity, roles: ['admin', 'sales_manager'] },
  ];

  const portalNavItems: NavItem[] = [
    { label: 'Portal Overview', path: '/portal', icon: UserCheck },
    { label: 'My Quotations', path: '/portal/quotations', icon: FileText },
    { label: 'Invoices & Billing', path: '/portal/invoices', icon: Receipt },
  ];

  const items = isPortal ? portalNavItems : staffNavItems;

  return (
    <aside className="w-64 border-r border-white/10 bg-[#07090e]/60 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <nav className="space-y-1">
        {items.map((item) => {
          if (item.roles && user?.role && !item.roles.includes(user.role)) {
            return null;
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/portal' || item.path === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-white/10 text-[11px] text-white/30 text-center">
        DealFlow360 v2.0 &bull; Enterprise
      </div>
    </aside>
  );
};
