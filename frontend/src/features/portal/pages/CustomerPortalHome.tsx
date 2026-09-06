import React, { useState } from 'react';
import { useAuth } from '@/features/auth/hook/useAuth';
import { ScrambleCTAButton } from '@/components/ScrambleCTAButton';
import { FileText, GitPullRequest, ShieldCheck, ArrowUpRight, Award, Sparkles, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CustomerProfileModal } from '../components/CustomerProfileModal';

export const CustomerPortalHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);

  return (
    <div className="space-y-12">
      {/* Welcome Hero Panel */}
      <div className="rounded-3xl border border-neutral-200 bg-white p-8 sm:p-12 lg:p-14 relative overflow-hidden shadow-sm">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase cursor-pointer transition-colors shadow-xs group"
              title="Click to view subscription and user details"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AUTHENTICATED CLIENT PORTAL // {user?.customerTier || 'GOLD'} TIER</span>
              <span className="text-neutral-400 group-hover:text-neutral-700 ml-1">&rarr; VIEW DETAILS</span>
            </button>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-mono font-bold tracking-widest text-emerald-700 uppercase">
              STATUS // {user?.membershipStatus || 'ACTIVE'}
            </span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#111111] uppercase tracking-tight leading-[1.05]">
            WELCOME, {user?.fullName || user?.companyName}
          </h1>

          <p className="text-xs sm:text-sm text-neutral-500 font-mono leading-relaxed">
            Review live quotations, submit targeted RFQ requests, and collaborate directly with {user?.tenantName || 'your sales team'}.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="btn btn-secondary py-1.5 px-4 text-xs font-mono rounded-full inline-flex items-center gap-2 shadow-xs"
            >
              <Award className="w-3.5 h-3.5 text-[#ff3b30]" />
              <span>View Account & Subscription Details</span>
            </button>
          </div>
        </div>

        {/* Subtle Watermark background */}
        <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none text-right font-display font-black text-9xl text-black select-none">
          PORTAL
        </div>
      </div>

      {/* 2-Quadrant Action Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Card 1: Quotations */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10 flex flex-col justify-between hover:border-neutral-300 hover:shadow-md transition-all duration-300 shadow-sm group">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 font-mono text-xs text-neutral-500 uppercase">
              <span className="text-[#ff3b30] font-bold">SECTION // 01</span>
              <span>INSPECTION</span>
            </div>

            <h3 className="font-display font-black text-2xl sm:text-3xl text-neutral-900 uppercase tracking-tight">
              MY ACTIVE QUOTATIONS
            </h3>

            <p className="text-xs sm:text-sm text-neutral-600 font-mono leading-relaxed">
              Review line-item proposals, verify authorized pricing, accept deal terms, or submit real-time counter-offers.
            </p>
          </div>

          <div className="pt-8 flex items-center justify-between">
            <ScrambleCTAButton
              text="VIEW QUOTATIONS"
              variant="red"
              size="sm"
              arrowIcon="diagonal"
              onClick={() => navigate('/portal/quotations')}
            />
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest font-semibold">
              LIVE PROPOSALS
            </span>
          </div>
        </div>

        {/* Card 2: Billing & Invoices */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10 flex flex-col justify-between hover:border-neutral-300 hover:shadow-md transition-all duration-300 shadow-sm group">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 font-mono text-xs text-neutral-500 uppercase">
              <span className="text-neutral-800 font-bold">SECTION // 02</span>
              <span>SETTLEMENTS</span>
            </div>

            <h3 className="font-display font-black text-2xl sm:text-3xl text-neutral-900 uppercase tracking-tight">
              BILLING AND INVOICES
            </h3>

            <p className="text-xs sm:text-sm text-neutral-600 font-mono leading-relaxed">
              Access real-time settlement ledgers, download verified tax invoices, track reconciliation status, and review payment history.
            </p>
          </div>

          <div className="pt-8 flex items-center justify-between">
            <ScrambleCTAButton
              text="VIEW INVOICES"
              variant="black"
              size="sm"
              arrowIcon="diagonal"
              onClick={() => navigate('/portal/invoices')}
            />
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest font-semibold">
              SETTLEMENT LEDGER
            </span>
          </div>
        </div>
      </div>

      {/* Customer Profile & Subscription Modal */}
      <CustomerProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
};
