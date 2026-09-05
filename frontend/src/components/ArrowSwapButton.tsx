import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface ArrowSwapButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'red' | 'dark' | 'outline' | 'ghost' | 'white';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit';
  href?: string;
}

export const ArrowSwapButton: React.FC<ArrowSwapButtonProps> = ({
  children,
  onClick,
  variant = 'red',
  size = 'md',
  className = '',
  type = 'button',
  href,
}) => {
  const variantStyles = {
    red: 'bg-[#ff3b30] text-white hover:bg-[#e02f25] border-transparent',
    dark: 'bg-[#111111] text-white hover:bg-black border-[#222]',
    outline: 'bg-transparent text-[#111] border border-[#d1d5db] hover:border-[#111]',
    ghost: 'bg-transparent text-[#111] hover:text-[#ff3b30] border-transparent',
    white: 'bg-white text-[#111] hover:bg-[#f3f4f6] border-transparent',
  };

  const sizeStyles = {
    sm: 'text-xs tracking-wider uppercase py-2 px-4 gap-2 font-medium',
    md: 'text-xs md:text-sm tracking-widest uppercase py-3.5 px-6 gap-3 font-semibold',
    lg: 'text-sm md:text-base tracking-widest uppercase py-4.5 px-8 gap-4 font-bold',
  };

  const content = (
    <>
      <span className="relative z-10 whitespace-nowrap">{children}</span>
      <span className="arrow-swap-container relative w-4 h-4 md:w-5 md:h-5 shrink-0 overflow-hidden inline-flex items-center justify-center">
        {/* Primary arrow that slides up-right */}
        <ArrowUpRight className="arrow-swap-primary w-4 h-4 md:w-5 md:h-5" />
        {/* Secondary clone that slides in from bottom-left */}
        <ArrowUpRight className="arrow-swap-secondary w-4 h-4 md:w-5 md:h-5" />
      </span>
    </>
  );

  const baseClasses = `group inline-flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer select-none border shadow-md hover:shadow-lg active:scale-95 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  if (href) {
    return (
      <a href={href} className={baseClasses} onClick={onClick}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} className={baseClasses}>
      {content}
    </button>
  );
};
