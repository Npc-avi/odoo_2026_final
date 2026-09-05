import React, { useState } from 'react';
import { GovernanceSubscriptionTab } from '../components/GovernanceSubscriptionTab';
import { GovernanceReportsTab } from '../components/GovernanceReportsTab';
import { GovernanceProductsTab } from '../components/GovernanceProductsTab';
import { GovernanceStaffTab } from '../components/GovernanceStaffTab';
import {
  CreditCard,
  BarChart3,
  Package,
  Users,
  ShieldCheck,
} from 'lucide-react';

export type GovernanceTabKey = 'subscription' | 'report' | 'products' | 'staff';

export const GovernanceRulesPage: React.FC = () => {
  // Default selected tab: 'subscription' as explicitly requested by user
  const [activeTab, setActiveTab] = useState<GovernanceTabKey>('subscription');

  const navTabs: { key: GovernanceTabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'subscription', label: 'SUBSCRIPTIONS', icon: CreditCard },
    { key: 'report', label: 'REPORTS', icon: BarChart3 },
    { key: 'products', label: 'PRODUCTS', icon: Package },
    { key: 'staff', label: 'STAFF & MEMBERS', icon: Users },
  ];

  return (
    <div className="app-page space-y-8 font-sans text-[#111111]">
      {/* Top Main Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-[10px] font-mono font-bold tracking-widest text-cyan-800 uppercase mb-2 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
            <span>ENTERPRISE GOVERNANCE &amp; OPERATIONS HUB</span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#111111] uppercase tracking-tight">
            Governance Dashboard
          </h1>
          <p className="app-page-subtitle">
            Configure customer tier discount rates, monitor live telemetry reports, manage product catalogs, and administer team access
          </p>
        </div>
      </div>

      {/* Sub-Navbar / Tab Navigation Bar */}
      <div className="flex items-center border-b border-neutral-200 pb-3 gap-2 overflow-x-auto scrollbar-none">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer shrink-0 select-none transform active:scale-[0.97] ${
                isActive
                  ? 'bg-[#ff3b30] text-white shadow-[0_2px_12px_rgba(255,59,48,0.35)] scale-[1.02]'
                  : 'bg-white text-neutral-700 hover:text-[#111111] hover:bg-neutral-100 border border-neutral-200 shadow-xs'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab View Display */}
      <div className="pt-2">
        {activeTab === 'subscription' && <GovernanceSubscriptionTab />}
        {activeTab === 'report' && <GovernanceReportsTab />}
        {activeTab === 'products' && <GovernanceProductsTab />}
        {activeTab === 'staff' && <GovernanceStaffTab />}
      </div>
    </div>
  );
};

export default GovernanceRulesPage;
