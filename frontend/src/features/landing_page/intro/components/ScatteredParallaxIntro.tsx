import React, { useState, useEffect, useRef } from 'react';
import { ScrambleCTAButton } from '@/components/ScrambleCTAButton';
import { RedCrosshair, RedTargetGlyph } from '@/components/RedCrosshair';

interface ScatteredParallaxIntroProps {
  onOpenBooking?: () => void;
}

export const ScatteredParallaxIntro: React.FC<ScatteredParallaxIntroProps> = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0.5);

  useEffect(() => {
    let ticking = false;

    const updateScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate smooth scroll progression through this section (0 to 1)
      const totalDistance = windowHeight + (rect.height || 1);
      const currentProgress = totalDistance > 0 ? (windowHeight - rect.top) / totalDistance : 0.5;
      const validNumber = Number.isFinite(currentProgress) ? currentProgress : 0.5;
      const clamped = Math.max(0, Math.min(1, validNumber));
      setScrollProgress(clamped);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScroll);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    updateScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Multi-speed parallax offsets with balanced travel
  const safeProgress = Number.isFinite(scrollProgress) ? scrollProgress : 0.5;
  const rawFactor = safeProgress - 0.5; // -0.5 to +0.5
  const offsetMotionSpeed = rawFactor * -220;
  const offsetJointIntegrity = rawFactor * -80;
  const offsetSensorTelemetry = rawFactor * 200;
  const offsetRotationalSpeed = rawFactor * -150;
  const watermarkOffset = rawFactor * 180;
  const rawOpacity = 0.38 - Math.abs(rawFactor) * 0.3;
  const watermarkOpacity = Number.isFinite(rawOpacity) ? Math.max(0.14, rawOpacity) : 0.22;

  return (
    <section
      id="intro"
      ref={sectionRef}
      className="relative bg-white py-16 sm:py-20 lg:py-28 overflow-hidden border-b border-[#e5e5e5]"
    >
      {/* Grid coordinate markers */}
      <RedCrosshair position="top-left" size="md" />
      <RedCrosshair position="top-right" size="md" />
      <RedCrosshair position="bottom-left" size="md" />
      <RedCrosshair position="bottom-right" size="md" />

      {/* Floating Parallax Card 1 (Left Top - Blended Discount Risk Matrix) */}
      <div
        className="hidden lg:block absolute left-3 xl:left-8 top-8 w-56 xl:w-68 z-10 pointer-events-none transition-transform duration-75 ease-out will-change-transform"
        style={{
          transform: `translate3d(${rawFactor * -40}px, ${offsetMotionSpeed}px, 0) rotate(${-3 + rawFactor * -6}deg) scale(${1 - Math.abs(rawFactor) * 0.12})`,
        }}
      >
        <div className="relative rounded-3xl border border-neutral-200/90 bg-white p-3 shadow-[0_22px_55px_-12px_rgba(0,0,0,0.16)]">
          <RedCrosshair position="top-left" size="sm" />
          <div className="w-full h-40 xl:h-48 overflow-hidden rounded-2xl bg-neutral-900 shadow-inner">
            <img
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop"
              alt="Blended Discount Risk Engine"
              className="w-full h-full object-cover object-center filter grayscale contrast-125"
            />
          </div>
          <div className="pt-2 px-1 flex items-center justify-between text-[10px] font-mono uppercase text-neutral-500">
            <span className="font-semibold">BLENDED RISK</span>
            <span className="text-[#FF3B19] font-bold px-2.5 py-0.5 rounded-full bg-red-50">SCORE 0.84 // GATE</span>
          </div>
        </div>
      </div>

      {/* Floating Parallax Card 2 (Right Top - Multi-Warehouse Fulfillment Splitting) */}
      <div
        className="hidden lg:block absolute right-3 xl:right-8 top-6 w-64 xl:w-76 z-10 pointer-events-none transition-transform duration-75 ease-out will-change-transform"
        style={{
          transform: `translate3d(${rawFactor * 40}px, ${offsetJointIntegrity}px, 0) rotate(${3.5 + rawFactor * 7}deg) scale(${1 - Math.abs(rawFactor) * 0.12})`,
        }}
      >
        <div className="relative rounded-3xl border border-neutral-800 bg-[#111111] p-3 text-white shadow-[0_28px_65px_-12px_rgba(0,0,0,0.42)]">
          <RedCrosshair position="top-right" size="sm" />
          <div className="w-full h-44 xl:h-52 overflow-hidden rounded-2xl bg-neutral-950 shadow-inner">
            <img
              src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=800&auto=format&fit=crop"
              alt="Multi-Warehouse Automated Splitting"
              className="w-full h-full object-cover object-center filter grayscale contrast-150"
            />
          </div>
          <div className="pt-2 px-1 flex items-center justify-between text-[10px] font-mono uppercase text-neutral-400">
            <span className="font-semibold">DEPOT DISPATCH</span>
            <span className="text-[#FF3B19] font-bold px-2.5 py-0.5 rounded-full bg-red-950/60 border border-red-900/40">2 DEPOTS // 0 BACKLOG</span>
          </div>
        </div>
      </div>

      {/* Floating Parallax Card 3 (Left Bottom - Hybrid Billing & Proration Engine) */}
      <div
        className="hidden lg:block absolute left-4 xl:left-10 bottom-6 w-52 xl:w-64 z-10 pointer-events-none transition-transform duration-75 ease-out will-change-transform"
        style={{
          transform: `translate3d(${rawFactor * -35}px, ${offsetSensorTelemetry}px, 0) rotate(${2.5 + rawFactor * 5}deg) scale(${1 - Math.abs(rawFactor) * 0.12})`,
        }}
      >
        <div className="relative rounded-3xl border border-neutral-800 bg-[#111111] p-3 text-white shadow-[0_28px_65px_-12px_rgba(0,0,0,0.42)]">
          <RedCrosshair position="bottom-left" size="sm" />
          <div className="w-full h-48 xl:h-56 overflow-hidden rounded-2xl bg-neutral-950 shadow-inner">
            <img
              src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop"
              alt="Hybrid Billing Proration"
              className="w-full h-full object-cover object-center filter grayscale contrast-150"
            />
          </div>
          <div className="pt-2 px-1 flex items-center justify-between text-[10px] font-mono uppercase text-neutral-400">
            <span className="font-semibold">HYBRID PRORATION</span>
            <span className="text-[#FF3B19] font-bold px-2.5 py-0.5 rounded-full bg-red-950/60 border border-red-900/40">MRR + CAPEX</span>
          </div>
        </div>
      </div>

      {/* Floating Parallax Card 4 (Right Bottom - Customer Portal Negotiation) */}
      <div
        className="hidden lg:block absolute right-4 xl:right-10 bottom-6 w-60 xl:w-72 z-10 pointer-events-none transition-transform duration-75 ease-out will-change-transform"
        style={{
          transform: `translate3d(${rawFactor * 45}px, ${offsetRotationalSpeed}px, 0) rotate(${-2.5 + rawFactor * -6}deg) scale(${1 - Math.abs(rawFactor) * 0.12})`,
        }}
      >
        <div className="relative rounded-3xl border border-neutral-200/90 bg-white p-3 shadow-[0_22px_55px_-12px_rgba(0,0,0,0.16)]">
          <RedCrosshair position="bottom-right" size="sm" />
          <div className="w-full h-40 xl:h-48 overflow-hidden rounded-2xl bg-neutral-900 shadow-inner">
            <img
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop"
              alt="Customer Portal Negotiation"
              className="w-full h-full object-cover object-center filter grayscale contrast-125"
            />
          </div>
          <div className="pt-2 px-1 flex items-center justify-between text-[10px] font-mono uppercase text-neutral-500">
            <span className="font-semibold">PORTAL NEGOTIATION</span>
            <span className="text-[#FF3B19] font-bold px-2.5 py-0.5 rounded-full bg-red-50">1-CLICK BINDING</span>
          </div>
        </div>
      </div>

      {/* Giant Full-Cover Watermark Reveal */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 overflow-hidden select-none will-change-transform"
        style={{
          transform: `translate3d(0, ${watermarkOffset}px, 0)`,
          opacity: watermarkOpacity,
          transition: 'opacity 0.2s ease-out',
        }}
      >
        <div className="w-full flex flex-col items-center text-center px-1">
          <span className="font-display font-black text-6xl sm:text-8xl md:text-9xl lg:text-[11rem] xl:text-[15rem] 2xl:text-[18rem] tracking-tighter text-outline uppercase leading-[0.82] whitespace-nowrap">
            SELF
          </span>
          <div className="flex items-center justify-center gap-3 sm:gap-6 my-1 sm:my-2 w-full">
            <span className="font-display font-black text-6xl sm:text-8xl md:text-9xl lg:text-[11rem] xl:text-[15rem] 2xl:text-[18rem] tracking-tighter text-outline uppercase leading-[0.82]">
              GOVERNING
            </span>
            <RedTargetGlyph className="w-12 h-12 sm:w-20 sm:h-20 lg:w-28 lg:h-28 xl:w-36 xl:h-36 shrink-0 mx-2" />
            <span className="font-display font-black text-6xl sm:text-8xl md:text-9xl lg:text-[11rem] xl:text-[15rem] 2xl:text-[18rem] tracking-tighter text-outline uppercase leading-[0.82]">
              DEAL
            </span>
          </div>
          <span className="font-display font-black text-6xl sm:text-8xl md:text-9xl lg:text-[11rem] xl:text-[15rem] 2xl:text-[18rem] tracking-tighter text-outline uppercase leading-[0.82] whitespace-nowrap">
            OPERATIONS
          </span>
        </div>
      </div>

      {/* Center Foreground Content with High-Precision Typography */}
      <div className="relative z-20 max-w-3xl mx-auto px-4 sm:px-6 text-center lg:text-left">
        {/* Eyebrow / Category Tag */}
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-mono font-bold tracking-widest text-neutral-600 uppercase">
          <span>PROJECT OVERVIEW // PROBLEM STATEMENT</span>
        </div>

        {/* Primary Impact Headline */}
        <h2 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight text-[#111] uppercase leading-[1.08] mb-6">
          Beyond Quote-to-Invoice: An Autonomous Engine for Real-World B2B Complexity
        </h2>

        {/* Detailed Narrative */}
        <div className="relative rounded-3xl border border-neutral-200/90 bg-white/95 backdrop-blur-md p-5 sm:p-7 space-y-4 max-w-xl shadow-lg">
          <div className="text-xs font-mono font-bold text-[#FF3B19] uppercase tracking-widest">
            THE DEALFLOW360 ARCHITECTURE
          </div>

          <h3 className="font-display font-semibold text-base sm:text-lg text-[#111] leading-snug">
            Real B2B sales teams operate in messier conditions than standard forms can handle: multi-level discount thresholds, partial stock across split warehouses, bundled SaaS subscriptions with hardware, and buyers demanding live digital negotiations.
          </h3>

          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
            DealFlow360 enforces pricing discipline through a mathematically rigorous blended risk score, reacts to warehouse inventory reality in real-time, reconciles recurring and one-time billing schedules on a single contract, and gives buyers a collaborative live portal instead of static PDF friction.
          </p>

          <div className="pt-1">
            <ScrambleCTAButton
              text="VIEW SYSTEM MODULES"
              variant="red"
              size="sm"
              arrowIcon="diagonal"
              onClick={() => {
                const el = document.getElementById('services');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
