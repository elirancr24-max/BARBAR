'use client';

import { cn } from '@/lib/utils';

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showWordmark?: boolean;
  className?: string;
}

const sizes = {
  sm: { box: 32, stroke: 1.5, font: 'text-base' },
  md: { box: 40, stroke: 1.5, font: 'text-lg' },
  lg: { box: 56, stroke: 1.75, font: 'text-2xl' },
  xl: { box: 88, stroke: 2, font: 'text-4xl' },
  hero: { box: 160, stroke: 2.5, font: 'text-7xl' },
};

export function BrandMark({ size = 'md', showWordmark = false, className }: Props) {
  const s = sizes[size];
  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <svg
        width={s.box}
        height={s.box}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-[0_2px_8px_rgba(201,169,97,0.3)]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="bm-gold" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#e8c98a" />
            <stop offset="50%" stopColor="#c9a961" />
            <stop offset="100%" stopColor="#8b6d2c" />
          </linearGradient>
          <linearGradient id="bm-shine" x1="0" y1="0" x2="0" y2="100">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#fff" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {/* Outer ring */}
        <circle cx="50" cy="50" r="46" stroke="url(#bm-gold)" strokeWidth={s.stroke * 1.5} fill="hsl(var(--background))" />
        <circle cx="50" cy="50" r="46" fill="url(#bm-shine)" />
        {/* Inner ring */}
        <circle cx="50" cy="50" r="38" stroke="url(#bm-gold)" strokeWidth={s.stroke * 0.6} fill="none" opacity="0.6" />
        {/* Razor / Scissor cross */}
        <g transform="translate(50 50) rotate(-45)" stroke="url(#bm-gold)" strokeWidth={s.stroke * 1.5} strokeLinecap="round" fill="none">
          {/* Razor handle */}
          <line x1="-20" y1="0" x2="20" y2="0" />
          <circle cx="-22" cy="0" r="3.5" fill="url(#bm-gold)" />
          <circle cx="22" cy="0" r="3.5" fill="url(#bm-gold)" />
        </g>
        <g transform="translate(50 50) rotate(45)" stroke="url(#bm-gold)" strokeWidth={s.stroke * 1.5} strokeLinecap="round" fill="none">
          <line x1="-20" y1="0" x2="20" y2="0" />
          <circle cx="-22" cy="0" r="3.5" fill="url(#bm-gold)" />
          <circle cx="22" cy="0" r="3.5" fill="url(#bm-gold)" />
        </g>
        {/* Center dot */}
        <circle cx="50" cy="50" r="3" fill="url(#bm-gold)" />
        {/* Top crown notch */}
        <path d="M 46 8 L 50 4 L 54 8" stroke="url(#bm-gold)" strokeWidth={s.stroke} strokeLinecap="round" fill="none" />
      </svg>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className={cn('font-display font-black tracking-tight', s.font)}>BarBar</span>
          <span className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mt-0.5">studio · est. 2026</span>
        </div>
      )}
    </div>
  );
}
