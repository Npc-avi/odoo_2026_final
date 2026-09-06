import React from 'react';
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/features/landing_page/hero/components/HeroSection';
import { ScatteredParallaxIntro } from '@/features/landing_page/intro/components/ScatteredParallaxIntro';
import { TechnicalServiceGrid } from '@/features/landing_page/services/components/TechnicalServiceGrid';
import { TwoColumnProcessSection } from '@/features/landing_page/process/components/TwoColumnProcessSection';
import { KineticFooter } from '@/features/landing_page/footer/components/KineticFooter';

export const LandingPage: React.FC = () => {
  const handleScrollToServices = () => {
    const el = document.getElementById('services');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#050f1d] text-[#111111] font-sans selection:bg-[#ff3b30] selection:text-white relative">
      {/* Global Top Floating Navbar */}
      <Navbar onOpenServicesDrawer={handleScrollToServices} />

      {/* 1. Hero Section & Ecosystem Ticker */}
      <HeroSection />

      {/* 2. Scattered Parallax Architecture Cards & Ghost Typography */}
      <ScatteredParallaxIntro />

      {/* 3. Core System Modules Matrix (Discount, Warehouse, Billing, Portal) */}
      <TechnicalServiceGrid />

      {/* 4. Two-Column Split Sticky Process & Quotation-to-Cash Workflow */}
      <TwoColumnProcessSection />

      {/* 5. Kinetic Mega-Footer */}
      <KineticFooter />
    </div>
  );
};
