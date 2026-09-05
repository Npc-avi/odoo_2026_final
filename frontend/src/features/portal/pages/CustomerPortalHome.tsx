import React from 'react';
import { useAuth } from '@/features/auth/hook/useAuth';
import { ScrambleCTAButton } from '@/components/ScrambleCTAButton';
import { FileText, GitPullRequest, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CustomerPortalHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-12">
      {/* Welcome Hero Panel */}
      <div className="rounded-3xl border border-neutral-800 bg-[#09090b] p-8 sm:p-12 lg:p-14 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AUTHENTICATED CLIENT PORTAL // {user?.customerTier || 'GOLD'} TIER</span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white uppercase tracking-tight leading-[1.05]">
            WELCOME, {user?.fullName || user?.companyName}
          </h1>

          <p className="text-xs sm:text-sm text-neutral-400 font-mono leading-relaxed">
            Review live quotations, submit targeted RFQ requests, and collaborate directly with {user?.tenantName || 'your sales team'}.
          </p>
        </div>

        {/* Subtle Watermark background */}
        <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none text-right font-display font-black text-9xl text-white select-none">
          PORTAL
        </div>
      </div>

      {/* 2-Quadrant Action Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Card 1: Quotations */}
        <div className="rounded-3xl border border-neutral-800 bg-[#09090b] p-8 sm:p-10 flex flex-col justify-between hover:border-neutral-700 transition-all duration-300 shadow-xl group">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 font-mono text-xs text-neutral-400 uppercase">
              <span className="text-[#ff3b30] font-bold">SECTION // 01</span>
              <span>INSPECTION</span>
            </div>

            <h3 className="font-display font-black text-2xl sm:text-3xl text-white uppercase tracking-tight">
              MY ACTIVE QUOTATIONS
            </h3>

            <p className="text-xs sm:text-sm text-neutral-400 font-mono leading-relaxed">
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
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
              LIVE PROPOSALS
            </span>
          </div>
        </div>

        {/* Card 2: RFQs */}
        <div className="rounded-3xl border border-neutral-800 bg-[#09090b] p-8 sm:p-10 flex flex-col justify-between hover:border-neutral-700 transition-all duration-300 shadow-xl group">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 font-mono text-xs text-neutral-400 uppercase">
              <span className="text-cyan-400 font-bold">SECTION // 02</span>
              <span>INQUIRY</span>
            </div>

            <h3 className="font-display font-black text-2xl sm:text-3xl text-white uppercase tracking-tight">
              SUBMIT NEW RFQ
            </h3>

            <p className="text-xs sm:text-sm text-neutral-400 font-mono leading-relaxed">
              Request bespoke custom configurations, bulk quantity tier discounts, and target delivery windows directly from operations.
            </p>
          </div>

          <div className="pt-8 flex items-center justify-between">
            <ScrambleCTAButton
              text="COMPOSE RFQ"
              variant="white"
              size="sm"
              arrowIcon="diagonal"
              onClick={() => navigate('/portal/rfqs')}
            />
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
              FAST-TRACK QUOTE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
