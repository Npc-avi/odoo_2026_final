import React from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/features/auth/hook/useAuth';
import { X, ShieldCheck, Building2, User, Mail, CreditCard, Calendar, Award } from 'lucide-react';

interface CustomerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  if (!isOpen || !user) return null;

  const tier = user.customerTier || 'Gold';
  const status = (user.membershipStatus || user.subscription?.status || 'active').toLowerCase();

  const getTierBadge = (t: string) => {
    switch (t) {
      case 'Platinum':
        return 'bg-purple-50 text-purple-700 border-purple-300';
      case 'Gold':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'Silver':
        return 'bg-sky-50 text-sky-700 border-sky-300';
      case 'Bronze':
        return 'bg-orange-50 text-orange-800 border-orange-300';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-300';
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case 'paused':
        return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'canceled':
      case 'cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-300';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-300';
    }
  };

  return createPortal(
    <div
      className="app-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="app-modal-dialog max-w-xl w-full bg-white text-[#111111] shadow-2xl border border-neutral-200 animate-modalScaleIn">
        {/* Modal Header */}
        <div className="app-modal-header border-b border-neutral-200 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 flex items-center justify-center text-[#ff3b30]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="app-modal-title text-xl font-display font-black text-neutral-900 uppercase tracking-tight">
                Customer Account & Membership
              </h3>
              <p className="app-modal-subtitle text-xs text-neutral-500 font-mono">
                Verified Identity & Active Subscription Controls
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="app-modal-close p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-5 font-mono text-xs">
          {/* Membership Tier & Status Hero Card */}
          <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 uppercase tracking-wider text-[11px] font-bold">
                Membership Tier
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getTierBadge(
                    tier
                  )}`}
                >
                  <Award className="w-3.5 h-3.5" />
                  {tier} Tier
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusBadge(
                    status
                  )}`}
                >
                  {status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-200/80">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase">Subscription Plan</span>
                <p className="font-bold text-neutral-900 text-sm mt-0.5">
                  {user.subscription?.planName || `${tier} Corporate Membership`}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase">Recurring Rate</span>
                <p className="font-bold text-neutral-900 text-sm mt-0.5">
                  ${Number(user.subscription?.unitRecurringPrice || (tier === 'Platinum' ? 499 : tier === 'Gold' ? 299 : tier === 'Silver' ? 149 : 49)).toFixed(2)}{' '}
                  <span className="text-xs font-normal text-neutral-500">/{user.subscription?.cadence || 'mo'}</span>
                </p>
              </div>
            </div>

            {user.subscription?.nextBillingDate && (
              <div className="flex items-center gap-2 pt-2 border-t border-neutral-200/80 text-[11px] text-neutral-500">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                <span>Next Scheduled Billing: {new Date(user.subscription.nextBillingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            )}
          </div>

          {/* Customer Profile Details Grid */}
          <div className="p-5 rounded-2xl border border-neutral-200 bg-white space-y-3">
            <h4 className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#ff3b30]" />
              Account Identity
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-0.5">
                <span className="text-[10px] text-neutral-400 uppercase">Company Name</span>
                <p className="font-bold text-neutral-900">{user.companyName || 'Corporate Client'}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-neutral-400 uppercase">Contact Representative</span>
                <p className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-neutral-400" />
                  {user.fullName || user.email.split('@')[0]}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-neutral-400 uppercase">Authenticated Email</span>
                <p className="font-bold text-neutral-900 flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-neutral-400" />
                  {user.email}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-neutral-400 uppercase">Approved Credit Line</span>
                <p className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
                  ${Number(user.creditLimit || 10000).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {user.accountOwnerName && (
              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Assigned Account Exec:</span>
                <span className="font-bold text-neutral-800">{user.accountOwnerName} ({user.accountOwnerEmail})</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="app-modal-footer border-t border-neutral-200 pt-4 mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary py-1.5 px-5 text-xs rounded-full"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
