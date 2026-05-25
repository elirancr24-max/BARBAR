'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, Phone, MapPin, Clock, Instagram, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { BrandMark } from '@/components/brand/BrandMark';
import { PhotoMark } from '@/components/brand/PhotoMark';

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh flex flex-col bg-background overflow-hidden pb-20 lg:pb-0">
      {/* Decorative ambient gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -end-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/30 via-primary/10 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/4 -start-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-primary/20 via-transparent to-transparent blur-3xl" />
      </div>

      {/* Header — minimal */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-12">
        <PhotoMark size="sm" />
        <div className="flex items-center gap-2">
          <a
            href="https://www.instagram.com/barabrgil/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full hover:bg-accent flex items-center justify-center transition-colors"
            aria-label="Instagram"
          >
            <Instagram className="w-5 h-5 text-muted-foreground" />
          </a>
          <a
            href="https://www.facebook.com/BarAbargilHairDesign/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full hover:bg-accent flex items-center justify-center transition-colors"
            aria-label="Facebook"
          >
            <Facebook className="w-5 h-5 text-muted-foreground" />
          </a>
          <ThemeToggle />
        </div>
      </header>

      {/* Center hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <PhotoMark size="hero" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="font-display font-black text-5xl sm:text-6xl lg:text-7xl mt-8 leading-[0.95] tracking-tight"
        >
          בר אברג׳יל
          <span className="block text-base sm:text-lg lg:text-xl font-sans font-normal tracking-[0.35em] text-muted-foreground uppercase mt-5">
            HAIR DESIGN · EILAT
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="text-lg sm:text-xl text-foreground/80 mt-8 max-w-md font-medium"
        >
          תספורת · עיצוב · סטייל
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="text-sm text-muted-foreground mt-3 max-w-md"
        >
          קבע תור בקליק — בלי להמתין, בלי טלפונים.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="mt-10"
        >
          <Button asChild variant="gold" size="lg" className="h-14 px-12 text-base shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all">
            <Link href="/book">
              <Calendar className="w-5 h-5 ms-2" />
              קבע תור עכשיו
            </Link>
          </Button>
        </motion.div>

        {/* Info strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.5 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary/70" />
            ראשון–חמישי 10:00–20:00 · שישי–שבת סגור
          </div>
          <a href="tel:+972500000001" className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <Phone className="w-4 h-4 text-primary/70" />
            050-000-0001
          </a>
          <a href="https://maps.google.com/?q=בניין+העיגולים+אילת" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <MapPin className="w-4 h-4 text-primary/70" />
            בניין העיגולים, אילת
          </a>
        </motion.div>
      </main>

      {/* Bottom barber-pole stripe */}
      <div className="relative z-10 h-2 barber-accent opacity-60" aria-hidden />

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 text-center text-xs text-muted-foreground/70">
        © 2026 בר אברג׳יל · Hair Design · <Link href="/login" className="hover:text-primary transition-colors">כניסת צוות</Link>
      </footer>
    </div>
  );
}
