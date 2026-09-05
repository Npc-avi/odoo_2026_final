import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface ScrambleCTAButtonProps {
  text?: string;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  className?: string;
  variant?: 'red' | 'black' | 'white';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  arrowIcon?: 'diagonal' | 'right';
  target?: string;
  rel?: string;
  disabled?: boolean;
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';

export const ScrambleCTAButton: React.FC<ScrambleCTAButtonProps> = ({
  text = 'BOOK A CONSULTATION',
  href,
  onClick,
  className = '',
  variant = 'red',
  size = 'md',
  arrowIcon = 'diagonal',
  target,
  rel,
  disabled = false,
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isHovered, setIsHovered] = useState(false);
  const frameRef = useRef<number | null>(null);
  const iterationRef = useRef(0);

  // Synchronize initial text
  useEffect(() => {
    setDisplayText(text);
  }, [text]);

  const startScramble = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    iterationRef.current = 0;
    const totalFrames = 18; // ~300ms at 60fps

    const animate = () => {
      iterationRef.current += 1;
      const progress = iterationRef.current / totalFrames;
      const resolvedCharsCount = Math.floor(progress * text.length);

      const scrambled = text
        .split('')
        .map((char, index) => {
          if (char === ' ') return ' ';
          if (index < resolvedCharsCount) {
            return text[index];
          }
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join('');

      setDisplayText(scrambled);

      if (iterationRef.current < totalFrames) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayText(text);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
  }, [text]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    startScramble();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    setDisplayText(text);
  };

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // Variant styles: High-contrast safety red (#FF3B19) transitioning to pitch black (#000000) on hover
  const variantStyles = {
    red: 'bg-[#FF3B19] hover:bg-[#000000] text-white border border-[#FF3B19] hover:border-black shadow-md hover:shadow-lg',
    black: 'bg-[#000000] hover:bg-[#FF3B19] text-white border border-black hover:border-[#FF3B19] shadow-md hover:shadow-lg',
    white: 'bg-white hover:bg-[#000000] text-[#111111] hover:text-white border border-white hover:border-black shadow-md hover:shadow-lg',
  };

  const dividerStyles = {
    red: 'border-l border-white/20 group-hover:border-white/30',
    black: 'border-l border-white/20 group-hover:border-white/30',
    white: 'border-l border-neutral-300 group-hover:border-white/20',
  };

  const sizeStyles = {
    xs: {
      textPadding: 'pl-3 sm:pl-3.5 pr-2 py-1 sm:py-1.5 text-[9px] sm:text-[10px]',
      iconPadding: 'pr-2.5 pl-2 py-1 sm:py-1.5',
      iconSize: 'w-2.5 h-2.5',
    },
    sm: {
      textPadding: 'pl-4 sm:pl-4.5 pr-2.5 py-1.5 sm:py-2 text-[10px] sm:text-[11px]',
      iconPadding: 'pr-3 pl-2 py-1.5 sm:py-2',
      iconSize: 'w-3 h-3',
    },
    md: {
      textPadding: 'pl-6 sm:pl-7 pr-3.5 py-3 sm:py-3.5 text-xs',
      iconPadding: 'pr-4 pl-3 py-3 sm:py-3.5',
      iconSize: 'w-3.5 h-3.5',
    },
    lg: {
      textPadding: 'pl-8 sm:pl-9 pr-4 py-4 text-sm',
      iconPadding: 'pr-5 pl-3.5 py-4',
      iconSize: 'w-4 h-4',
    },
  };

  const currentSize = sizeStyles[size];

  const content = (
    <>
      {/* Text block with hacker decrypt scramble effect */}
      <span
        className={`font-mono font-semibold uppercase tracking-widest flex items-center justify-center select-none whitespace-nowrap ${currentSize.textPadding}`}
      >
        {displayText}
      </span>

      {/* Vertical Divider Line & Diagonal Arrow Slide-Swap Effect */}
      <span
        className={`relative flex items-center justify-center overflow-hidden transition-colors ${dividerStyles[variant]} ${currentSize.iconPadding}`}
      >
        {/* Primary active arrow (translates up & right on hover) */}
        <span
          className={`transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isHovered
              ? 'translate-x-[110%] -translate-y-[110%] opacity-0'
              : 'translate-x-0 translate-y-0 opacity-100'
          }`}
        >
          {arrowIcon === 'diagonal' ? (
            <svg
              className={currentSize.iconSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="6" y1="18" x2="18" y2="6" />
              <polyline points="9 6 18 6 18 15" />
            </svg>
          ) : (
            <svg
              className={currentSize.iconSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="12" x2="20" y2="12" />
              <polyline points="14 6 20 12 14 18" />
            </svg>
          )}
        </span>

        {/* Clone arrow (slides in from bottom & left on hover) */}
        <span
          className={`absolute transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isHovered
              ? 'translate-x-0 translate-y-0 opacity-100'
              : '-translate-x-[110%] translate-y-[110%] opacity-0'
          }`}
        >
          {arrowIcon === 'diagonal' ? (
            <svg
              className={currentSize.iconSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="6" y1="18" x2="18" y2="6" />
              <polyline points="9 6 18 6 18 15" />
            </svg>
          ) : (
            <svg
              className={currentSize.iconSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="12" x2="20" y2="12" />
              <polyline points="14 6 20 12 14 18" />
            </svg>
          )}
        </span>
      </span>
    </>
  );

  const baseClasses = `group inline-flex items-stretch rounded-full overflow-hidden transition-all duration-200 cursor-pointer active:scale-[0.98] ${variantStyles[variant]} ${className}`;

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={baseClasses}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={baseClasses}
    >
      {content}
    </button>
  );
};

export const useTextScramble = (text: string, totalFrames: number = 14) => {
  const [displayText, setDisplayText] = useState(text);
  const frameRef = useRef<number | null>(null);
  const iterationRef = useRef(0);

  useEffect(() => {
    setDisplayText(text);
  }, [text]);

  const startScramble = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    iterationRef.current = 0;

    const animate = () => {
      iterationRef.current += 1;
      const progress = iterationRef.current / totalFrames;
      const resolvedCharsCount = Math.floor(progress * text.length);

      const scrambled = text
        .split('')
        .map((char, index) => {
          if (char === ' ' || char === '+' || char === '/') return char;
          if (index < resolvedCharsCount) {
            return text[index];
          }
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join('');

      setDisplayText(scrambled);

      if (iterationRef.current < totalFrames) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayText(text);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
  }, [text, totalFrames]);

  const reset = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    setDisplayText(text);
  }, [text]);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return { displayText, startScramble, reset };
};

export interface ScrambleNavLinkProps {
  text: string;
  href?: string;
  onClick?: () => void;
  className?: string;
  hasDropdown?: boolean;
}

export const ScrambleNavLink: React.FC<ScrambleNavLinkProps> = ({
  text,
  href,
  onClick,
  className = '',
  hasDropdown = false,
}) => {
  const { displayText, startScramble, reset } = useTextScramble(text, 14);

  if (href) {
    return (
      <a
        href={href}
        onClick={onClick}
        onMouseEnter={startScramble}
        onMouseLeave={reset}
        className={`inline-flex items-center font-mono transition-colors ${className}`}
      >
        <span>{displayText}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={startScramble}
      onMouseLeave={reset}
      className={`inline-flex items-center font-mono transition-colors cursor-pointer ${className}`}
    >
      <span>{displayText}</span>
    </button>
  );
};

