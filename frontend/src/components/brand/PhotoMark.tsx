'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
}

const dims = {
  sm: 36,
  md: 48,
  lg: 72,
  xl: 120,
  hero: 200,
};

export function PhotoMark({ size = 'md', className }: Props) {
  const px = dims[size];
  return (
    <div
      className={cn('relative inline-flex shrink-0', className)}
      style={{ width: px, height: px }}
    >
      {/* Outer gold ring */}
      <div className="absolute inset-0 rounded-full gold-gradient p-[3px] shadow-[0_8px_32px_-8px_rgba(201,169,97,0.5)]">
        <div className="w-full h-full rounded-full overflow-hidden bg-background ring-2 ring-background">
          <Image
            src="/logo.jpg"
            alt="בר אברג׳יל"
            width={px}
            height={px}
            priority={size === 'hero'}
            sizes={`${px}px`}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      {/* Subtle inner highlight */}
      <div className="absolute inset-1 rounded-full pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 40%)' }} />
    </div>
  );
}
