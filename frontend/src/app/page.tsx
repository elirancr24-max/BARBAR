'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Phone, MapPin, Clock, Instagram, Facebook, Star, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { PhotoMark } from '@/components/brand/PhotoMark';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceAgorot: number;
  active: boolean;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  customerName: string;
  createdAt: string;
}

interface GalleryItem {
  id: string;
  url: string;
  kind?: string | null;
  service?: { name: string } | null;
  employee?: { user?: { fullName: string } } | null;
}

function relativeHe(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return 'היום';
  const d = Math.floor(diff / day);
  if (d < 7) return `לפני ${d} ימים`;
  if (d < 30) return `לפני ${Math.floor(d / 7)} שבועות`;
  if (d < 365) return `לפני ${Math.floor(d / 30)} חודשים`;
  return `לפני ${Math.floor(d / 365)} שנים`;
}

export default function LandingPage() {
  const { data: settings } = useBusinessSettings();

  const { data: services = [] } = useQuery({
    queryKey: ['services', 'public'],
    queryFn: async () => {
      try {
        return (await api.get<ServiceItem[]>('/services')).data;
      } catch {
        return [];
      }
    },
    retry: false,
  });

  const businessName = settings?.businessName || 'בר אברג׳יל';
  const heroTitle = settings?.heroTitle || businessName;
  const heroSubtitle = settings?.heroSubtitle || 'תספורת · עיצוב · סטייל';
  const phone = settings?.businessPhone || '050-000-0001';
  const address = settings?.businessAddress || 'בניין העיגולים, אילת';
  const hours = settings?.businessHours || 'ראשון–חמישי 10:00–20:00 · שישי–שבת סגור';
  const instagramUrl = settings?.instagramUrl || 'https://www.instagram.com/barabrgil/';
  const facebookUrl = settings?.facebookUrl || 'https://www.facebook.com/BarAbargilHairDesign/';

  const { data: gallery = [] } = useQuery({
    queryKey: ['gallery', 'public'],
    queryFn: async () => {
      try {
        return (await api.get<GalleryItem[]>('/gallery')).data;
      } catch {
        return [];
      }
    },
    retry: false,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', 'public'],
    queryFn: async () => {
      try {
        return (await api.get<Review[]>('/reviews/public')).data;
      } catch {
        return [];
      }
    },
    retry: false,
  });

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
          {instagramUrl && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full hover:bg-accent flex items-center justify-center transition-colors"
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
              className="w-10 h-10 rounded-full hover:bg-accent flex items-center justify-center transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="w-5 h-5 text-muted-foreground" />
            </a>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Center hero */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 text-center py-10">
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
          {heroTitle}
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
          {heroSubtitle}
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
          <div className="mt-4">
            <Link href="/my-bookings" className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors">
              יש לי כבר תור — הצג את התורים שלי
            </Link>
          </div>
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
            {hours}
          </div>
          <a href={`tel:${phone.replace(/[^0-9+]/g, '')}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <Phone className="w-4 h-4 text-primary/70" />
            {phone}
          </a>
          <a href={`https://maps.google.com/?q=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <MapPin className="w-4 h-4 text-primary/70" />
            {address}
          </a>
        </motion.div>
      </main>

      {/* Services section */}
      {services.filter((s) => s.active).length > 0 && (
        <section className="relative z-10 px-6 lg:px-12 py-16 lg:py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-display font-black text-3xl sm:text-4xl mb-2">השירותים שלנו</h2>
              <p className="text-muted-foreground">בחר את השירות והזמן תור</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {services
                .filter((s) => s.active)
                .map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                  >
                    <Card className="p-5 h-full flex flex-col">
                      <h3 className="font-display font-bold text-lg mb-1">{s.name}</h3>
                      {s.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{s.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-auto pt-3 border-t">
                        <span className="text-xs text-muted-foreground tabular-nums">{s.durationMin} דק׳</span>
                        <span className="font-bold tabular-nums">₪{Math.round(s.priceAgorot / 100)}</span>
                      </div>
                      <Button asChild variant="gold" size="sm" className="mt-3">
                        <Link href={`/book?service=${s.id}`}>הזמן תור</Link>
                      </Button>
                    </Card>
                  </motion.div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery section */}
      {gallery.length > 0 && (
        <section className="relative z-10 px-6 lg:px-12 py-16 lg:py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-display font-black text-3xl sm:text-4xl mb-2">העבודות שלנו</h2>
              <p className="text-muted-foreground">תספורות אחרונות מהמספרה</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              {gallery.slice(0, 9).map((g, i) => (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="relative aspect-square overflow-hidden rounded-xl bg-secondary group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.url}
                    alt={`${g.kind === 'before' ? 'לפני · ' : g.kind === 'after' || g.kind === 'result' ? 'אחרי · ' : ''}${g.service?.name || 'עבודה מהמספרה'}${g.employee?.user?.fullName ? ` · ${g.employee.user.fullName}` : ''}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  {(g.service?.name || g.employee?.user?.fullName) && (
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 via-black/40 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="text-xs font-medium truncate">{g.service?.name}</div>
                      {g.employee?.user?.fullName && (
                        <div className="text-[10px] opacity-80 truncate">{g.employee.user.fullName}</div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Reviews section */}
      {reviews.length > 0 && (
        <section className="relative z-10 px-6 lg:px-12 py-16 lg:py-20 bg-secondary/20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-display font-black text-3xl sm:text-4xl mb-2">מה הלקוחות אומרים</h2>
              <p className="text-muted-foreground">דירוגים אמיתיים מלקוחות אמיתיים</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {reviews.slice(0, 3).map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                >
                  <Card className="p-5 h-full flex flex-col">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={cn(
                            'w-4 h-4',
                            n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30',
                          )}
                        />
                      ))}
                    </div>
                    {r.comment && (
                      <p className="text-sm mt-3 flex-1 leading-relaxed text-foreground/90 line-clamp-4">&ldquo;{r.comment}&rdquo;</p>
                    )}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full gold-gradient text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {r.customerName.charAt(0)}
                        </div>
                        <span className="font-medium text-sm truncate">{r.customerName}</span>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">{relativeHe(r.createdAt)}</span>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button asChild variant="outline">
                <Link href="/reviews">
                  ראה הכל
                  <ArrowLeft className="w-4 h-4 me-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Bottom barber-pole stripe */}
      <div className="relative z-10 h-2 barber-accent opacity-60" aria-hidden />

      {/* Footer */}
      <footer className="relative z-10 px-6 py-5 text-center text-xs text-muted-foreground/70 space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/about" className="hover:text-primary transition-colors">אודות</Link>
          <span aria-hidden>·</span>
          <Link href="/reviews" className="hover:text-primary transition-colors">ביקורות</Link>
          <span aria-hidden>·</span>
          <Link href="/book" className="hover:text-primary transition-colors">קבע תור</Link>
          <span aria-hidden>·</span>
          <Link href="/my-bookings" className="hover:text-primary transition-colors">התורים שלי</Link>
          <span aria-hidden>·</span>
          <Link href="/accessibility-statement" className="hover:text-primary transition-colors">הצהרת נגישות</Link>
        </div>
        <div>
          © 2026 בר אברג׳יל · Hair Design
          {/* Staff login: discreet — bookmark or type /login */}
          <Link href="/login" className="opacity-20 hover:opacity-60 transition-opacity ms-2" aria-label="כניסת צוות">·</Link>
        </div>
      </footer>
    </div>
  );
}
