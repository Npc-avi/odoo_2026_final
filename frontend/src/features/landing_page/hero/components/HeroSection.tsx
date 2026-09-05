import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScrambleCTAButton } from '@/components/ScrambleCTAButton';

interface HeroSectionProps {
  onOpenBooking?: () => void;
}

const PROBLEM_STATEMENT_FEATURES = [
  'MULTI-TIER DISCOUNT GOVERNANCE & APPROVAL ROUTING',
  'LIVE UPSELL & CROSS-SELL WITH REAL-TIME MARGIN IMPACT',
  'MULTI-WAREHOUSE FULFILLMENT SPLITTING & BACKORDER HANDLING',
  'HYBRID BILLING (HARDWARE + RECURRING SUBSCRIPTIONS)',
  'AUTOMATED MID-CYCLE PRORATION & RECURRING SCHEDULES',
  'DEAL HEALTH MONITORING & ANOMALY DETECTION RADAR',
  'CUSTOMER-FACING LIVE QUOTATION NEGOTIATION PORTAL',
  'BLENDED DISCOUNT RISK SCORING ACROSS CATEGORY CEILINGS',
  'SALES BACKEND CONFIGURATION & REPORTING DASHBOARDS',
  'END-TO-END QUOTATION-TO-CASH ORCHESTRATION',
];

export const HeroSection: React.FC<HeroSectionProps> = () => {
  const navigate = useNavigate();

  return (
    <section id="hero" className="relative bg-[#09090b] overflow-hidden border-b border-neutral-800">
      {/* Fullscreen Hero Canvas (100vh) - Zero-Margin Edge-to-Edge Boundary Layout */}
      <div className="relative h-screen min-h-[660px] w-full flex flex-col justify-between overflow-hidden p-0 m-0">
        {/* Fullscreen Background Image - Exact Grayscale/Black Telemetry Image from Login Page Left Side */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop"
            alt="Sales Operations Telemetry"
            className="w-full h-full object-cover object-center filter grayscale contrast-125 opacity-30 scale-105 transition-transform duration-1000 ease-out"
          />
          {/* Obsidian Gradients matching Login Page Left Side */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#09090b]/90 via-[#09090b]/40 to-[#09090b]/80" />
        </div>

        {/* Top Space for Fixed Floating Navbar */}
        <div className="pt-24 sm:pt-28" />

        {/* Main Content: Giant Title touching Bottom Left boundary, Subtitle & Scramble CTA at Bottom Right */}
        <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-end justify-between gap-6 lg:gap-8">
            {/* Left: Giant Typography Lockup */}
            <div className="lg:col-span-7 pb-0 mb-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-4 text-[#ff3b30] font-mono text-[10px] tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b30] animate-ping" />
                INTELLIGENT SALES OPERATIONS // DEAL ENGINE
              </div>
              <h1 className="font-display font-black text-4xl sm:text-6xl md:text-7xl lg:text-[5rem] xl:text-[6.2rem] tracking-[-0.04em] text-white uppercase leading-[0.88] select-none drop-shadow-md">
                SELF GOVERNING <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-neutral-400">
                  DEAL ENGINE
                </span> <br />
                QUOTE TO CASH
              </h1>
            </div>

            {/* Right: Subtext & ScrambleCTAButton anchored tightly to the right */}
            <div className="lg:col-span-5 lg:ml-auto w-full max-w-sm sm:max-w-md flex flex-col items-start space-y-4 pb-2">
              <p className="text-xs sm:text-[13px] text-neutral-300 leading-relaxed font-normal drop-shadow-sm">
                Most sales tools handle quotes and invoices. <strong className="text-white font-semibold">DealFlow360</strong> goes beyond: enforcing pricing discipline with blended risk scoring, automatically splitting warehouse fulfillment, and transforming static PDF quotes into living, negotiable customer portals.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <ScrambleCTAButton
                  text="JOIN US"
                  variant="red"
                  size="sm"
                  arrowIcon="right"
                  onClick={() => navigate('/signup')}
                  className="w-auto"
                />

                <a
                  href="#services"
                  className="px-4 py-2 text-[11px] font-mono font-bold tracking-wider text-neutral-300 hover:text-white border border-white/15 hover:border-white/40 rounded-full bg-white/5 backdrop-blur-sm transition-all"
                >
                  SYSTEM MODULES
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Moving Bar: Features of the Problem Statement (No images, pure text) */}
        <div className="relative z-10 w-full border-t border-neutral-800 bg-[#09090b]/90 backdrop-blur-md py-3 overflow-hidden">
          <div className="flex items-center gap-10 animate-marquee whitespace-nowrap">
            {[...PROBLEM_STATEMENT_FEATURES, ...PROBLEM_STATEMENT_FEATURES].map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 text-[11px] font-mono font-bold text-neutral-300 tracking-wider hover:text-white transition-colors uppercase px-2"
              >
                <span className="text-[#ff3b30] font-bold">▶</span>
                <span>{feature}</span>
                <span className="text-neutral-600 font-normal">//</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
