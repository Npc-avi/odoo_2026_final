import React, { useState } from 'react';
import { ScrambleCTAButton } from '@/components/ScrambleCTAButton';
import { RedCrosshair, RedTargetGlyph } from '@/components/RedCrosshair';

interface KineticFooterProps {
  onOpenBooking?: (service?: string) => void;
  onSubscribeNewsletter?: (email: string) => void;
}

export const KineticFooter: React.FC<KineticFooterProps> = () => {
  const [email, setEmail] = useState('');

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmail('');
  };

  return (
    <footer id="footer" className="relative bg-[#fafafa] text-[#111] overflow-hidden border-t-2 border-[#111]">
      <RedCrosshair position="top-left" size="lg" />
      <RedCrosshair position="top-right" size="lg" />

      {/* Top Newsletter & Ghost Watermark Block */}
      <div className="relative py-16 lg:py-24 border-b border-[#e5e5e5] overflow-hidden">
        {/* Giant Ghost Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 opacity-15 overflow-hidden">
          <span className="font-display font-black text-6xl sm:text-8xl md:text-9xl tracking-tighter text-outline uppercase whitespace-nowrap">
            DEALFLOW 360
          </span>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Prompt */}
            <div className="lg:col-span-6 space-y-2">
              <div className="text-xs font-mono font-bold tracking-widest text-[#ff3b30] uppercase">
                INTELLIGENT SALES OPERATIONS // DEAL ENGINE
              </div>
              <h3 className="font-display font-black text-2xl sm:text-3xl md:text-4xl text-[#111] uppercase tracking-tight">
                An Intelligent, Self-Governing Sales Operations Platform.
              </h3>
            </div>

            {/* Right: Email Input & Visual Button */}
            <div className="lg:col-span-6">
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    placeholder="ENTER WORK EMAIL"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 bg-white border border-neutral-300 rounded-full px-5 py-3.5 text-xs font-mono uppercase tracking-wider text-[#111] placeholder:text-neutral-400 focus:outline-hidden focus:border-[#FF3B19] shadow-xs"
                  />
                  <ScrambleCTAButton
                    text="REQUEST ACCESS"
                    variant="red"
                    size="sm"
                    arrowIcon="diagonal"
                    onClick={() => {}}
                  />
                </div>
                <p className="text-[10px] text-neutral-500 font-mono leading-tight">
                  ENFORCING COMMERCIAL PRICING DISCIPLINE & QUOTATION-TO-CASH AUTONOMY.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Main Nav Columns Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10">
          {/* Column 1: Modules */}
          <div className="space-y-4">
            <div className="text-xs font-mono font-bold tracking-widest text-neutral-400 uppercase">
              MODULES
            </div>
            <ul className="space-y-2.5 font-display font-bold text-base sm:text-lg">
              {[
                { name: 'Discount Governance', href: '#services' },
                { name: 'Warehouse Splitting', href: '#services' },
                { name: 'Hybrid Billing', href: '#services' },
                { name: 'Customer Portal', href: '#services' },
              ].map((srv) => (
                <li key={srv.name}>
                  <a
                    href={srv.href}
                    className="text-[#111] hover:text-[#ff3b30] hover-underline-expand transition-colors"
                  >
                    {srv.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Governance & Flow */}
          <div className="space-y-4">
            <div className="text-xs font-mono font-bold tracking-widest text-neutral-400 uppercase">
              GOVERNANCE
            </div>
            <ul className="space-y-2.5 font-display font-bold text-base sm:text-lg">
              {[
                { name: 'Blended Risk Engine', href: '#intro' },
                { name: 'Tier Ceilings', href: '#intro' },
                { name: 'Dual Approvals', href: '#services' },
                { name: 'Audit Trail Ledger', href: '#process' },
              ].map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-[#111] hover:text-[#ff3b30] hover-underline-expand transition-colors"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Telemetry */}
          <div className="space-y-4">
            <div className="text-xs font-mono font-bold tracking-widest text-neutral-400 uppercase">
              TELEMETRY
            </div>
            <div className="space-y-2 font-mono text-xs text-neutral-600">
              <div>Real-Time Margin Tracking</div>
              <div>Delivery Promise Slippage</div>
              <div>Discount Anomaly Alerts</div>
              <div>Stalled Quote Escalation</div>
            </div>
          </div>

          {/* Column 4 & 5: Platform Scope & CTA */}
          <div className="col-span-2 space-y-4">
            <div className="text-xs font-mono font-bold tracking-widest text-neutral-400 uppercase">
              PLATFORM SCOPE & ARCHITECTURE
            </div>
            <div className="font-display font-bold text-base sm:text-lg text-[#111]">
              Full quotation-to-cash lifecycle built on modular architecture.
            </div>
            <p className="text-xs text-neutral-500 font-mono">
              Designed to resolve real operational B2B hurdles: multi-warehouse allocation, recurring subscription proration, blended margin limits, and customer-facing live negotiation rooms.
            </p>

            <div className="pt-2">
              <ScrambleCTAButton
                text="ENTER DEALFLOW360 WORKSPACE"
                variant="red"
                size="md"
                arrowIcon="diagonal"
                onClick={() => {}}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Giant Full-Width Branding Lockup */}
      <div className="w-full border-t-2 border-[#111] bg-white py-10 select-none overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-3 sm:gap-6 w-full">
            <h2 className="font-display font-bold text-3xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl tracking-tighter text-[#111] uppercase whitespace-nowrap text-center">
              DEALFL
            </h2>
            <RedTargetGlyph className="w-8 h-8 sm:w-16 sm:h-16 lg:w-24 lg:h-24 shrink-0" />
            <h2 className="font-display font-bold text-3xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl tracking-tighter text-[#111] uppercase whitespace-nowrap text-center">
              W360
            </h2>
          </div>
        </div>
      </div>

      {/* Bottom Sub-Bar */}
      <div className="border-t border-[#e5e5e5] bg-[#fafafa] py-6 text-[11px] font-mono text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            COPYRIGHT &copy; 2026 DEALFLOW360. ALL RIGHTS RESERVED.
          </div>
          <div className="flex items-center gap-6">
            <a href="#hero" className="hover:text-black transition-colors">DISCOUNT GOVERNANCE</a>
            <span>&bull;</span>
            <a href="#services" className="hover:text-black transition-colors">MULTI-WAREHOUSE</a>
            <span>&bull;</span>
            <a href="#combine-video" className="hover:text-black transition-colors">HYBRID BILLING</a>
          </div>
          <div>
            SELF-GOVERNING SALES PLATFORM
          </div>
        </div>
      </div>
    </footer>
  );
};
