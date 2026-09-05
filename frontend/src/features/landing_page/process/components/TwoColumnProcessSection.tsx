import React, { useRef, useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import {
  DISCOUNT_GATE_ASCII,
  WAREHOUSE_SPLIT_ASCII,
  HYBRID_BILLING_ASCII,
  PORTAL_RADAR_ASCII,
} from '../utils/asciiArt.data';

interface TwoColumnProcessSectionProps {
  onOpenBooking?: () => void;
}

interface ProcessPartnerCard {
  id: string;
  tag: string;
  quote: string;
  authorName: string;
  authorRole: string;
  asciiArt: string;
}

export const TwoColumnProcessSection: React.FC<TwoColumnProcessSectionProps> = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const PROCESS_CARDS: ProcessPartnerCard[] = [
    {
      id: 'stage-1-cart',
      tag: '01 / QUOTATION BUILDER & UPSELL',
      quote:
        'Contextual recommendations paired with live margin delta indicators transformed how our reps build orders. We prevent margin leakages in real-time before quotes even leave the desk.',
      authorName: 'Enterprise Deal Desk Lead',
      authorRole: 'Global Sales Operations',
      asciiArt: DISCOUNT_GATE_ASCII,
    },
    {
      id: 'stage-2-governance',
      tag: '02 / BLENDED DISCOUNT GOVERNANCE',
      quote:
        'Distributed micro-discounts used to slip through unchecked. The blended risk engine evaluates category limits and auto-routes for Sales Manager and Finance signoff with full audit trails.',
      authorName: 'Commercial Finance Director',
      authorRole: 'Revenue Risk & Governance',
      asciiArt: WAREHOUSE_SPLIT_ASCII,
    },
    {
      id: 'stage-3-fulfillment',
      tag: '03 / MULTI-WAREHOUSE SPLIT',
      quote:
        'Orders automatically split across Main Warehouse and East Depot based on live stock, prioritizing weighted shipping costs. Automated backorder consolidation keeps customers informed.',
      authorName: 'Supply Operations Lead',
      authorRole: 'Global Logistics & Inventory Dispatch',
      asciiArt: HYBRID_BILLING_ASCII,
    },
    {
      id: 'stage-4-portal',
      tag: '04 / CLIENT PORTAL & HYBRID BILLING',
      quote:
        'Customers negotiate line-items and counter-discounts directly in their dedicated portal room. 1-click binding confirmation instantly schedules recurring SaaS and hardware invoices.',
      authorName: 'VP of Customer Success',
      authorRole: 'Client Commerce Operations',
      asciiArt: PORTAL_RADAR_ASCII,
    },
  ];

  // Update scroll navigation availability
  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 20);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 20);

    const cardWidth = 620;
    const index = Math.round(scrollLeft / cardWidth);
    setActiveCardIndex(Math.min(PROCESS_CARDS.length - 1, Math.max(0, index)));
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
    return () => el.removeEventListener('scroll', checkScroll);
  }, []);

  const scrollByAmount = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === 'left' ? -620 : 620;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  // Mouse Drag handlers for fluid desktop scrubbing
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeftPos(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.4;
    scrollContainerRef.current.scrollLeft = scrollLeftPos - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  return (
    <section
      id="process"
      className="relative bg-[#09090b] text-white py-12 sm:py-16 h-[100svh] min-h-[750px] flex flex-col justify-center overflow-hidden border-b border-neutral-800 select-none"
    >
      {/* Background Technical Grid with dots & '+' intersections */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div
          className="w-full h-full opacity-45"
          style={{
            backgroundImage: `
              radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1.5px, transparent 0),
              linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px, 64px 64px, 64px 64px',
          }}
        />
        <div className="absolute inset-0 flex flex-wrap justify-between p-6 sm:p-10 opacity-60 text-[11px] font-mono text-neutral-400">
          {[...Array(28)].map((_, i) => (
            <span key={i} className="inline-block p-3 select-none">+</span>
          ))}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-[1480px] mx-auto px-4 sm:px-8 lg:px-12 flex flex-col justify-between">
        {/* Header Bar: Clean title & arrow controls */}
        <div className="flex items-center justify-between gap-6 mb-8 sm:mb-12">
          <div>
            <div className="text-[10px] font-mono text-[#ff3b30] uppercase tracking-widest mb-1">
              END-TO-END FLOW (QUOTE TO CASH)
            </div>
            <h2 className="font-sans text-3xl sm:text-5xl md:text-6xl text-neutral-300 font-light tracking-tight">
              Architected for <strong className="font-bold text-white">Quotation-to-Cash velocity.</strong>
            </h2>
          </div>

          {/* Slider Navigation Arrow Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => scrollByAmount('left')}
              disabled={!canScrollLeft}
              aria-label="Previous step"
              className={`p-2.5 sm:p-3 rounded-full border transition-all cursor-pointer ${
                canScrollLeft
                  ? 'border-neutral-600 bg-neutral-900 text-white hover:bg-white hover:text-black hover:border-white shadow-md'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-600 opacity-30 cursor-not-allowed'
              }`}
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => scrollByAmount('right')}
              disabled={!canScrollRight}
              aria-label="Next step"
              className={`p-2.5 sm:p-3 rounded-full border transition-all cursor-pointer ${
                canScrollRight
                  ? 'border-neutral-600 bg-neutral-900 text-white hover:bg-white hover:text-black hover:border-white shadow-md'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-600 opacity-30 cursor-not-allowed'
              }`}
            >
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Horizontal Carousel Track */}
        <div
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={`flex gap-5 sm:gap-6 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x snap-mandatory ${
            isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
          }`}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {PROCESS_CARDS.map((card, idx) => (
            <div
              key={card.id}
              className="snap-start shrink-0 w-[88vw] max-w-[560px] sm:w-[600px] lg:w-[640px]"
            >
              <ProcessCardItem
                card={card}
                idx={idx}
              />
            </div>
          ))}
        </div>

        {/* Carousel Pagination Progress Indicator */}
        <div className="flex items-center justify-between pt-6 border-t border-neutral-800/80 text-xs font-mono text-neutral-400 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] tracking-wide text-neutral-400">INTERACTIVE LIFECYCLE SCRUBBER</span>
          </div>

          <div className="flex items-center gap-2">
            {PROCESS_CARDS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  if (!scrollContainerRef.current) return;
                  scrollContainerRef.current.scrollTo({
                    left: i * 620,
                    behavior: 'smooth',
                  });
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeCardIndex
                    ? 'w-7 bg-white'
                    : 'w-2 bg-neutral-700 hover:bg-neutral-500'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          <div className="hidden sm:block text-neutral-400">
            <span>0{activeCardIndex + 1} / 0{PROCESS_CARDS.length}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

interface ProcessCardItemProps {
  card: ProcessPartnerCard;
  idx: number;
}

const ProcessCardItem: React.FC<ProcessCardItemProps> = ({ card }) => {
  return (
    <div className="relative w-full h-[380px] sm:h-[410px] bg-[#fafafa] rounded-[28px] border border-neutral-200 p-5 sm:p-7 text-[#111] shadow-[0_18px_50px_-15px_rgba(0,0,0,0.6)] flex flex-col justify-between overflow-hidden transition-all duration-300 group hover:shadow-[0_22px_60px_-10px_rgba(0,0,0,0.8)]">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 h-full items-center">
        {/* Left Content Column */}
        <div className="md:col-span-6 flex flex-col justify-between h-full pr-1 py-1">
          {/* Top Partner / Step Tag */}
          <div className="font-mono font-bold text-xs text-[#ff3b30] tracking-wide uppercase">
            {card.tag}
          </div>

          {/* Middle Quote Statement */}
          <div className="my-auto py-2">
            <p className="font-sans font-normal text-sm sm:text-base md:text-lg text-[#111] leading-relaxed tracking-tight">
              "{card.quote}"
            </p>
          </div>

          {/* Bottom Author & Title */}
          <div>
            <div className="font-sans font-bold text-xs sm:text-sm text-[#111]">
              {card.authorName}
            </div>
            <div className="font-sans text-[11px] text-neutral-500 font-normal mt-0.5">
              {card.authorRole}
            </div>
          </div>
        </div>

        {/* Right ASCII Architecture Diagram Column */}
        <div className="hidden md:flex md:col-span-6 h-full items-center justify-center border-l border-neutral-200/80 pl-4 bg-neutral-900 text-white rounded-2xl overflow-hidden p-2.5">
          <div className="w-full h-full flex items-center justify-center select-none font-mono text-[7px] sm:text-[8px] leading-[9px] sm:leading-[10px] text-neutral-300 font-medium whitespace-pre overflow-hidden transition-transform duration-300 group-hover:scale-102">
            {card.asciiArt}
          </div>
        </div>
      </div>
    </div>
  );
};
