import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

interface ManifestoWordProps {
  word: string;
  range: [number, number];
  progress: any;
}

const ManifestoWord: React.FC<ManifestoWordProps> = ({ word, range, progress }) => {
  // Directly interpolate color and opacity with high visual clarity from light white/silver to deep black
  const color = useTransform(progress, range, ['#e5e5e5', '#0a0a0a']);
  const opacity = useTransform(progress, range, [0.3, 1]);

  return (
    <motion.span
      className="inline-block mr-[0.28em] will-change-[color,opacity]"
      style={{ color, opacity }}
    >
      {word}
    </motion.span>
  );
};

interface ManifestoScrollSectionProps {
  text: string;
}

export const ManifestoScrollSection: React.FC<ManifestoScrollSectionProps> = ({ text }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Extended scroll duration across viewport so words change to black much slower and more readably
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.88', 'start 0.02'],
  });

  const words = text.split(' ');
  const total = words.length;

  return (
    <div ref={containerRef} className="max-w-5xl mb-14 lg:mb-20 pl-2 sm:pl-4">
      <div className="inline-flex items-center gap-2 mb-4 px-3.5 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 font-mono text-xs uppercase tracking-widest text-neutral-600">
        <span>CORE METHODOLOGY</span>
      </div>

      <h2 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] uppercase leading-[1.3] tracking-tight">
        {words.map((word, i) => {
          // Stagger each word with a gentle, extended transition window for maximum readability
          const start = Math.max(0, Math.min(0.90, (i / total) * 0.82));
          const end = Math.max(start + 0.08, Math.min(1, start + (2.2 / total)));
          return (
            <ManifestoWord
              key={i}
              word={word}
              range={[start, end]}
              progress={scrollYProgress}
            />
          );
        })}
      </h2>
    </div>
  );
};
