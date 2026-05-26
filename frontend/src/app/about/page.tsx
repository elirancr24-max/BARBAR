'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Phone, Instagram, Facebook, Clock, ArrowRight, Scissors } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PhotoMark } from '@/components/brand/PhotoMark';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';

const DEFAULT_STORY = `המספרה שלנו פתחה את שעריה באילת מתוך תשוקה אמיתית לעיצוב שיער ולחווית שירות יוצאת מן הכלל.
כל לקוח מקבל יחס אישי, ייעוץ מקצועי, ועיצוב שיער המותאם בדיוק לסגנון ולפנים שלו.

אנחנו עובדים רק עם מוצרים איכותיים, משקיעים בהשתלמויות מתמשכות, ושומרים על אווירה ידידותית ומקצועית במספרה.`;

const DEFAULT_MAP_SRC =
  'https://maps.google.com/maps?q=%D7%91%D7%A0%D7%99%D7%99%D7%9F%20%D7%94%D7%A2%D7%99%D7%92%D7%95%D7%9C%D7%99%D7%9D%20%D7%90%D7%99%D7%9C%D7%AA&t=&z=15&ie=UTF8&iwloc=&output=embed';

export default function AboutPage() {
  const { data: settings } = useBusinessSettings();

  const businessName = settings?.businessName || 'בר אברג׳יל';
  const story = settings?.aboutStory || DEFAULT_STORY;
  const phone = settings?.businessPhone || '050-000-0001';
  const address = settings?.businessAddress || 'בניין העיגולים, אילת';
  const hours = settings?.businessHours || 'א׳–ה׳ 10:00–20:00';
  const instagramUrl = settings?.instagramUrl || 'https://www.instagram.com/barabrgil/';
  const facebookUrl = settings?.facebookUrl || 'https://www.facebook.com/BarAbargilHairDesign/';
  const mapSrc = settings?.mapEmbedUrl || DEFAULT_MAP_SRC;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-secondary/30 pb-20 lg:pb-10">
      {/* Header */}
      <header className="border-b backdrop-blur-md bg-background/80 sticky top-0 z-30">
        <div className="container max-w-5xl flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <PhotoMark size="sm" />
            <span className="font-display font-black text-lg group-hover:text-primary transition-colors">{businessName}</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="container max-w-4xl px-4">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center py-12 lg:py-16"
        >
          <div className="flex justify-center mb-6">
            <PhotoMark size="xl" />
          </div>
          <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl mb-4 tracking-tight">
            הסיפור שלנו
          </h1>
        </motion.section>

        {/* Story */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-12"
        >
          <Card className="p-8 lg:p-10">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <h2 className="font-display font-bold text-2xl mb-4 flex items-center gap-2">
                <Scissors className="w-6 h-6 text-primary" />
                {businessName}
              </h2>
              <p className="text-foreground/90 leading-relaxed whitespace-pre-line">{story}</p>
            </div>
          </Card>
        </motion.section>

        {/* Team — single barber */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-12"
        >
          <h2 className="font-display font-bold text-3xl mb-6 text-center">הצוות שלנו</h2>
          <div className="grid grid-cols-1 max-w-sm mx-auto">
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div
                className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-lg gold-gradient"
              >
                {businessName.charAt(0)}
              </div>
              <h3 className="font-display font-bold text-xl mb-1">{businessName}</h3>
              <p className="text-xs uppercase tracking-wider text-primary mb-3">בעלים · ספר ראשי</p>
            </Card>
          </div>
        </motion.section>

        {/* Visit us */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="font-display font-bold text-3xl mb-6 text-center flex items-center gap-2 justify-center">
            <MapPin className="w-7 h-7 text-primary" />
            בואו לבקר
          </h2>
          <Card className="overflow-hidden">
            <div className="aspect-video w-full bg-secondary/50 relative">
              <iframe
                src={mapSrc}
                title="מפת המספרה"
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 hover:text-primary transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">כתובת</div>
                  <div className="text-sm font-medium truncate">{address}</div>
                </div>
              </a>
              <a href={`tel:${phone.replace(/[^0-9+]/g, '')}`} className="flex items-center gap-3 hover:text-primary transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">טלפון</div>
                  <div className="text-sm font-medium tabular-nums">{phone}</div>
                </div>
              </a>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">שעות פתיחה</div>
                  <div className="text-sm font-medium">{hours}</div>
                </div>
              </div>
            </div>
          </Card>
        </motion.section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="text-center py-8"
        >
          <Button asChild variant="gold" size="lg" className="h-14 px-10 shadow-xl shadow-primary/20">
            <Link href="/book">קבע תור עכשיו</Link>
          </Button>
        </motion.section>

        {/* Footer social */}
        <footer className="border-t pt-8 pb-4 text-center">
          <div className="flex justify-center gap-3 mb-4">
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full hover:bg-accent flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5 text-muted-foreground" />
              </a>
            )}
            {facebookUrl && (
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-full hover:bg-accent flex items-center justify-center transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5 text-muted-foreground" />
              </a>
            )}
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>
              © 2026 {businessName} · Hair Design ·{' '}
              <Link href="/" className="hover:text-primary transition-colors">
                <ArrowRight className="w-3 h-3 inline ms-1" aria-hidden="true" /> חזרה לבית
              </Link>
            </div>
            <div>
              <Link href="/accessibility-statement" className="hover:text-primary transition-colors">
                הצהרת נגישות
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
