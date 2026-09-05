import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, ArrowUpRight } from 'lucide-react';
import { ScrambleCTAButton, ScrambleNavLink } from './ScrambleCTAButton';

interface NavbarProps {
  onOpenBooking?: (service?: string) => void;
  onOpenServicesDrawer?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenServicesDrawer,
}) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOverVideo, setIsOverVideo] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);

      // Check if header is currently over the architecture section (#combine-video)
      const videoSection = document.getElementById('combine-video');
      if (videoSection) {
        const rect = videoSection.getBoundingClientRect();
        const overVideo = rect.top <= 65 && rect.bottom >= 30;
        setIsOverVideo(overVideo);
      } else {
        setIsOverVideo(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'OVERVIEW', href: '#hero' },
    { name: 'GOVERNANCE', href: '#intro' },
    { name: 'MODULES +', href: '#services', hasDropdown: true },
    { name: 'ARCHITECTURE', href: '#combine-video' },
    { name: 'WORKFLOW', href: '#process' },
  ];

  const handleScrollToSection = (href: string) => {
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Dynamic curved floating header styling
  const headerContainerStyle = isOverVideo
    ? 'bg-black/35 backdrop-blur-xl border-white/20 shadow-[0_12px_32px_rgba(0,0,0,0.5)]'
    : isScrolled
    ? 'bg-[#f7f7f7]/95 backdrop-blur-md border-neutral-200 shadow-md'
    : 'bg-[#09090b]/60 backdrop-blur-md border-white/15 shadow-sm';

  const isLightText = isOverVideo || !isScrolled;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-2.5 sm:px-6 lg:px-8 pt-2.5 sm:pt-3.5 pointer-events-none transition-all duration-300">
      <div
        className={`pointer-events-auto w-full max-w-7xl mx-auto rounded-full border transition-all duration-300 ${headerContainerStyle}`}
      >
        <div className="w-full flex items-center justify-between py-1.5 sm:py-2 px-3 sm:px-6 md:px-7">
          {/* Left: Logo & Title */}
          <div className="flex items-center min-w-[150px] sm:min-w-[210px] shrink-0">
            <a
              href="#hero"
              className="flex items-center gap-2 group cursor-pointer"
            >
              <div className="relative flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-105">
                <svg
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-200 ${
                    isLightText ? 'text-[#ff3b30]' : 'text-[#ff3b30]'
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span
                  className={`font-display font-black tracking-tight text-xs sm:text-[14px] uppercase transition-all duration-200 ${
                    isLightText ? 'text-white drop-shadow-sm' : 'text-[#111]'
                  }`}
                >
                  DEALFLOW<span className="text-[#ff3b30]">360</span>
                </span>
                <span className="text-[8px] font-mono tracking-widest text-neutral-400 uppercase -mt-0.5">
                  SALES OPERATIONS
                </span>
              </div>
            </a>
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav
            className={`hidden md:flex items-center justify-center gap-5 lg:gap-8 text-[10.5px] sm:text-[11px] font-bold tracking-[0.18em] transition-colors duration-200 ${
              isLightText ? 'text-white drop-shadow-sm' : 'text-[#111]'
            }`}
          >
            {navLinks.map((link) => {
              if (link.hasDropdown) {
                return (
                  <div
                    key={link.name}
                    className="relative group"
                    onMouseEnter={() => setServicesDropdownOpen(true)}
                    onMouseLeave={() => setServicesDropdownOpen(false)}
                  >
                    <div
                      className={`flex items-center gap-0.5 py-0.5 transition-colors cursor-pointer ${
                        isLightText ? 'hover:text-[#FF3B19]' : 'hover:text-[#FF3B19]'
                      }`}
                    >
                      <ScrambleNavLink
                        text={link.name}
                        onClick={onOpenServicesDrawer || (() => handleScrollToSection(link.href))}
                        className={isLightText ? 'hover:text-[#FF3B19]' : 'hover:text-[#FF3B19]'}
                      />
                      <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180 ml-0.5" />
                    </div>

                    {/* Dropdown Menu */}
                    {servicesDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-72 bg-[#0a1526]/95 backdrop-blur-xl border border-white/15 shadow-2xl p-2.5 flex flex-col gap-1 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-150 text-white overflow-hidden">
                        <div className="text-[9px] uppercase font-bold text-neutral-400 px-3 py-1 border-b border-white/10 font-mono tracking-wider">
                          Sales Operations Modules
                        </div>
                        {[
                          { id: 'governance', name: '001 / DISCOUNT GOVERNANCE', desc: 'Blended Risk Score & Dual Approvals' },
                          { id: 'fulfillment', name: '002 / WAREHOUSE AUTO-SPLIT', desc: 'Main Warehouse & East Depot Routing' },
                          { id: 'billing', name: '003 / HYBRID BILLING', desc: 'One-Time Hardware + Recurring SaaS' },
                          { id: 'portal', name: '004 / CUSTOMER PORTAL', desc: 'Live Digital Negotiation Room' },
                        ].map((item) => (
                          <a
                            key={item.id}
                            href={`#services`}
                            onClick={() => {
                              setServicesDropdownOpen(false);
                            }}
                            className="p-2.5 rounded-xl text-left hover:bg-white/10 transition-all group/item flex flex-col"
                          >
                            <span className="font-bold text-xs text-white group-hover/item:text-[#FF3B19] flex items-center justify-between font-mono">
                              {item.name}
                              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                            </span>
                            <span className="text-[11px] text-neutral-400 font-normal">
                              {item.desc}
                            </span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <ScrambleNavLink
                  key={link.name}
                  text={link.name}
                  href={link.href}
                  className={`py-0.5 ${
                    isLightText ? 'hover:text-[#FF3B19]' : 'hover:text-[#FF3B19]'
                  }`}
                />
              );
            })}
          </nav>

          {/* Right: Desktop CTA Button */}
          <div className="hidden sm:flex items-center justify-end min-w-[140px] sm:min-w-[170px] shrink-0">
            <ScrambleCTAButton
              text="LOGIN"
              variant={isOverVideo ? "white" : isScrolled ? "red" : "white"}
              size="xs"
              arrowIcon="diagonal"
              onClick={() => navigate('/login')}
            />
          </div>

          {/* Mobile Menu Button */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-3 py-1 bg-[#FF3B19] text-white text-[10px] font-mono font-bold tracking-wider uppercase rounded-full shadow-sm cursor-pointer"
            >
              LOGIN
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-1.5 rounded-full cursor-pointer transition-colors ${
                isLightText ? 'text-white hover:text-white/80' : 'text-[#111] hover:text-[#FF3B19]'
              }`}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-[#071324]/95 backdrop-blur-md border-t border-white/10 rounded-b-3xl px-6 py-5 space-y-4 shadow-2xl text-white mt-1">
            <nav className="flex flex-col space-y-2.5 font-display text-sm font-bold tracking-wider">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 text-white hover:text-[#FF3B19] border-b border-white/10 flex items-center justify-between"
                >
                  <span>{link.name}</span>
                  {link.hasDropdown && <span className="text-[#FF3B19] font-bold">+</span>}
                </a>
              ))}
            </nav>
            <div className="pt-1">
              <ScrambleCTAButton
                text="LOGIN"
                variant="red"
                size="sm"
                arrowIcon="diagonal"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/login');
                }}
                className="w-full justify-between"
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
