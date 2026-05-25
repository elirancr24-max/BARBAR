'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Phone, Instagram, Facebook, Clock, ArrowRight, Scissors } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PhotoMark } from '@/components/brand/PhotoMark';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  color: string;
}

const team: TeamMember[] = [
  {
    name: 'בר אברג׳יל',
    role: 'בעלים · ספר ראשי',
    bio: 'מעל 10 שנות ניסיון בעיצוב שיער. מתמחה בגזירות מודרניות וזקנים מעוצבים.',
    color: '#C9A961',
  },
  {
    name: 'ישי',
    role: 'ספר בכיר',
    bio: 'מומחה בפייד וגזירות קלאסיות. אוהב לקוחות שמחפשים סטייל נקי ומדויק.',
    color: '#3B82F6',
  },
  {
    name: 'עידן',
    role: 'ספר',
    bio: 'ספר צעיר ויצירתי עם עין לטרנדים. מומחה בעיצובים נועזים ושיער ארוך.',
    color: '#10B981',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-secondary/30 pb-20 lg:pb-10">
      {/* Header */}
      <header className="border-b backdrop-blur-md bg-background/80 sticky top-0 z-30">
        <div className="container max-w-5xl flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <PhotoMark size="sm" />
            <span className="font-display font-black text-lg group-hover:text-primary transition-colors">בר אברג׳יל</span>
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
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            בר אברג׳יל פתח את המספרה ב-2020 באילת. עם רקע של למעלה מ-10 שנים בעיצוב שיער,
            הוא מספק שירות מקצועי לכל לקוח.
          </p>
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
                מ-2020 ועד היום
              </h2>
              <p className="text-foreground/90 leading-relaxed mb-3">
                המספרה שלנו פתחה את שעריה באילת מתוך תשוקה אמיתית לעיצוב שיער ולחווית שירות יוצאת מן הכלל.
                כל לקוח מקבל יחס אישי, ייעוץ מקצועי, ועיצוב שיער המותאם בדיוק לסגנון ולפנים שלו.
              </p>
              <p className="text-foreground/90 leading-relaxed">
                אנחנו עובדים רק עם מוצרים איכותיים, משקיעים בהשתלמויות מתמשכות, ושומרים על אווירה ידידותית
                ומקצועית במספרה. בואו להכיר את הצוות שלנו ולחוות שירות שלא תשכחו.
              </p>
            </div>
          </Card>
        </motion.section>

        {/* Team */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-12"
        >
          <h2 className="font-display font-bold text-3xl mb-6 text-center">הצוות שלנו</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {team.map((m, i) => (
              <motion.div
                key={m.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
              >
                <Card className="p-6 text-center h-full hover:shadow-lg transition-shadow">
                  <div
                    className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white shadow-lg"
                    style={{ background: m.color }}
                  >
                    {m.name.charAt(0)}
                  </div>
                  <h3 className="font-display font-bold text-xl mb-1">{m.name}</h3>
                  <p className="text-xs uppercase tracking-wider text-primary mb-3">{m.role}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.bio}</p>
                </Card>
              </motion.div>
            ))}
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
                src="https://maps.google.com/maps?q=%D7%91%D7%A0%D7%99%D7%99%D7%9F%20%D7%94%D7%A2%D7%99%D7%92%D7%95%D7%9C%D7%99%D7%9D%20%D7%90%D7%99%D7%9C%D7%AA&t=&z=15&ie=UTF8&iwloc=&output=embed"
                title="מפת המספרה"
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <a
                href="https://maps.google.com/?q=בניין+העיגולים+אילת"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 hover:text-primary transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">כתובת</div>
                  <div className="text-sm font-medium truncate">בניין העיגולים, אילת</div>
                </div>
              </a>
              <a href="tel:+972500000001" className="flex items-center gap-3 hover:text-primary transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">טלפון</div>
                  <div className="text-sm font-medium tabular-nums">050-000-0001</div>
                </div>
              </a>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">שעות פתיחה</div>
                  <div className="text-sm font-medium">א׳–ה׳ 10:00–20:00</div>
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
            <a
              href="https://www.instagram.com/barabrgil/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-full hover:bg-accent flex items-center justify-center transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5 text-muted-foreground" />
            </a>
            <a
              href="https://www.facebook.com/BarAbargilHairDesign/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-full hover:bg-accent flex items-center justify-center transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="w-5 h-5 text-muted-foreground" />
            </a>
          </div>
          <div className="text-xs text-muted-foreground">
            © 2026 בר אברג׳יל · Hair Design ·{' '}
            <Link href="/" className="hover:text-primary transition-colors">
              <ArrowRight className="w-3 h-3 inline ms-1" /> חזרה לבית
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
