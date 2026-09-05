import React from 'react';
import { SERVICES_DATA } from '../utils/services.data';
import { ScrambleCTAButton } from '@/components/ScrambleCTAButton';
import { RedCrosshair } from '@/components/RedCrosshair';
import { ManifestoScrollSection } from './ManifestoScrollSection';

interface TechnicalServiceGridProps {
  onOpenBooking?: (serviceId?: string) => void;
}

const MANIFESTO_TEXT =
  "In modern enterprise sales operations, static forms break down when reality hits. DealFlow360 unifies multi-tier discount governance, stock-aware warehouse fulfillment, hybrid subscription billing, and real-time customer portal negotiations into an autonomous quotation-to-cash engine.";

export const TechnicalServiceGrid: React.FC<TechnicalServiceGridProps> = () => {
  return (
    <section id="services" className="relative bg-white py-16 lg:py-24 border-b border-[#e5e5e5]">
      {/* Corner coordinate crosshairs */}
      <RedCrosshair position="top-left" size="lg" />
      <RedCrosshair position="top-right" size="lg" />
      <RedCrosshair position="bottom-left" size="lg" />
      <RedCrosshair position="bottom-right" size="lg" />

      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 md:px-10 lg:px-12">
        {/* Intro Manifesto Block with Word-by-Word Scroll Darkening */}
        <ManifestoScrollSection text={MANIFESTO_TEXT} />

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-4 border-b border-neutral-200 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase mb-2">
              CORE SYSTEM ARCHITECTURE // MODULES
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#111] uppercase tracking-tight">
              AUTONOMOUS SALES OPERATIONS MATRIX
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 font-mono max-w-md">
            Built to handle multi-tiered pricing approvals, distributed inventory reality, and proration without manual rep intervention.
          </p>
        </div>

        {/* 4-Quadrant Curved Grid - Clean & Minimalist */}
        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {SERVICES_DATA.map((service) => {
            return (
              <div
                key={service.id}
                className="relative rounded-3xl border border-neutral-800 bg-[#09090b] p-6 sm:p-8 lg:p-10 flex flex-col justify-between group hover:bg-[#111] hover:border-neutral-700 hover:shadow-2xl transition-all duration-300 overflow-hidden"
              >
                <div>
                  {/* Top Index Bar with Prominent Scale */}
                  <div className="flex items-center justify-between font-mono text-xs sm:text-sm uppercase tracking-widest text-neutral-400 mb-5 border-b border-neutral-800 pb-3">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 shadow-2xs">
                      <span className="text-[#ff3b30] font-bold text-[10px]">MODULE</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-neutral-400 px-2.5 py-0.5 rounded-full bg-neutral-900">
                      {service.index}
                    </span>
                  </div>

                  {/* Compact Aspect Service Image */}
                  <div className="relative mb-5 overflow-hidden rounded-2xl border border-neutral-800 aspect-[21/9] sm:aspect-[2.2/1] bg-neutral-950 shadow-sm">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-cover filter grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out opacity-80 group-hover:opacity-100"
                    />
                  </div>

                  {/* Headline */}
                  <div className="mb-2">
                    <h3 className="font-display font-black text-2xl sm:text-3xl text-white uppercase tracking-tight">
                      {service.title}
                    </h3>
                  </div>

                  {/* Small Description */}
                  <p className="text-sm sm:text-base text-neutral-400 leading-relaxed font-normal mb-6">
                    {service.tagline}
                  </p>
                </div>

                {/* Bottom CTA Button */}
                <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
                  <ScrambleCTAButton
                    text={`VIEW ${service.title}`}
                    variant="black"
                    size="sm"
                    arrowIcon="diagonal"
                    onClick={() => {}}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
