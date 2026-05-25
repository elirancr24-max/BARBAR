'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share, Plus, CheckCircle2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

type Platform = 'android' | 'ios' | 'desktop' | 'other';

const DISMISS_KEY = 'barabargil-install-dismissed';
const DISMISS_DAYS = 7;

// Global stash for the beforeinstallprompt event so we don't miss it if it
// fires before React hydrates. Populated by the early <script> in layout.tsx,
// but we also register a listener here as a backup.
declare global {
  interface Window {
    __deferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'other';
  const ua = navigator.userAgent;
  const lc = ua.toLowerCase();

  // iOS / iPadOS (iPad on iOS 13+ reports as Mac — check touch)
  const isIPad = /ipad/.test(lc) || (lc.includes('macintosh') && navigator.maxTouchPoints > 1);
  const isIOS = /iphone|ipod/.test(lc) || isIPad;
  const isIOSChromeOrFirefox = /crios|fxios/.test(lc);
  if (isIOS && !isIOSChromeOrFirefox) return 'ios';

  if (/android/.test(lc)) return 'android';
  if (/windows|macintosh|linux/.test(lc)) return 'desktop';
  return 'other';
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari legacy flag
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>('other');
  const [iosModalOpen, setIosModalOpen] = useState(false);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setShow(false);
    setIosModalOpen(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isStandalone()) return;

    // Respect dismissal
    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
    } catch {
      /* ignore */
    }

    const p = detectPlatform();
    setPlatform(p);

    // If the event was captured BEFORE React hydrated, pick it up now.
    if (window.__deferredInstallPrompt) {
      setDeferredPrompt(window.__deferredInstallPrompt);
      window.setTimeout(() => setShow(true), 1500);
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      window.__deferredInstallPrompt = evt;
      setDeferredPrompt(evt);
      window.setTimeout(() => setShow(true), 1500);
    }

    function onInstalled() {
      window.__deferredInstallPrompt = null;
      setDeferredPrompt(null);
      setShow(false);
      setIosModalOpen(false);
      toast.success('האפליקציה הותקנה בהצלחה!');
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
    window.addEventListener('appinstalled', onInstalled);

    // iOS never fires beforeinstallprompt — show the prompt anyway after a delay
    if (p === 'ios') {
      const t = window.setTimeout(() => setShow(true), 3000);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
        window.removeEventListener('appinstalled', onInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function handleInstallClick() {
    // iOS — show instructions modal (no native install API exists)
    if (platform === 'ios') {
      setIosModalOpen(true);
      return;
    }

    if (!deferredPrompt) {
      // No native prompt available (Firefox, Brave, etc.) — open instructions
      setIosModalOpen(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        toast.success('מתקין את האפליקציה…');
      } else {
        // User dismissed the native sheet — back off for 7 days
        try {
          localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      console.error('[InstallPrompt] prompt() failed', err);
      toast.error('לא ניתן להתקין כרגע. נסה שוב מאוחר יותר.');
    } finally {
      window.__deferredInstallPrompt = null;
      setDeferredPrompt(null);
      setShow(false);
    }
  }

  const ctaLabel =
    platform === 'ios' ? 'איך מתקינים?' : deferredPrompt ? 'התקן עכשיו' : 'הוראות התקנה';

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="fixed bottom-4 inset-x-4 z-[60] max-w-md mx-auto"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            dir="rtl"
          >
            <div className="rounded-2xl glass shadow-2xl border-primary/20 overflow-hidden">
              <div className="p-4 flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl shrink-0 overflow-hidden ring-2 ring-primary/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.jpg" alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-base leading-tight">
                    התקן את האפליקציה
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    גישה מיידית מהמסך הראשי, ללא דפדפן
                  </div>
                </div>
                <button
                  onClick={dismiss}
                  className="text-muted-foreground hover:text-foreground -m-2 p-2"
                  aria-label="סגור"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-4 pb-4 border-t pt-3 flex gap-2">
                <button
                  onClick={dismiss}
                  className="h-11 px-4 rounded-xl bg-muted/40 text-foreground/80 text-sm font-medium hover:bg-muted active:scale-[0.98] transition-all"
                >
                  אחר כך
                </button>
                <button
                  onClick={handleInstallClick}
                  className="flex-1 h-11 rounded-xl gold-gradient text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <Download className="w-4 h-4" />
                  {ctaLabel}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions modal (iOS + unsupported browsers) */}
      <AnimatePresence>
        {iosModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setIosModalOpen(false)}
            dir="rtl"
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 flex items-start gap-3 border-b">
                <div className="w-12 h-12 rounded-xl shrink-0 overflow-hidden ring-2 ring-primary/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.jpg" alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-lg leading-tight">
                    התקנה למסך הבית
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {platform === 'ios'
                      ? 'מתוך דפדפן Safari'
                      : 'מתוך תפריט הדפדפן'}
                  </div>
                </div>
                <button
                  onClick={() => setIosModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground -m-2 p-2"
                  aria-label="סגור"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <ol className="p-5 space-y-4 text-sm">
                {platform === 'ios' ? (
                  <>
                    <Step n={1} icon={<Smartphone className="w-5 h-5" />}>
                      פתח את האתר ב־<strong>Safari</strong> (לא Chrome).
                    </Step>
                    <Step n={2} icon={<Share className="w-5 h-5 text-primary" />}>
                      לחץ על כפתור <strong>השיתוף</strong> בתחתית המסך.
                    </Step>
                    <Step n={3} icon={<Plus className="w-5 h-5 text-primary" />}>
                      גלול ובחר <strong>&quot;הוסף למסך הבית&quot;</strong>.
                    </Step>
                    <Step n={4} icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}>
                      לחץ <strong>&quot;הוסף&quot;</strong> — האפליקציה תופיע במסך הבית.
                    </Step>
                  </>
                ) : (
                  <>
                    <Step n={1} icon={<Smartphone className="w-5 h-5" />}>
                      פתח את תפריט הדפדפן (שלוש הנקודות).
                    </Step>
                    <Step n={2} icon={<Plus className="w-5 h-5 text-primary" />}>
                      בחר <strong>&quot;התקן אפליקציה&quot;</strong> או{' '}
                      <strong>&quot;הוסף למסך הבית&quot;</strong>.
                    </Step>
                    <Step n={3} icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}>
                      אשר את ההתקנה — האפליקציה תופיע במסך הבית.
                    </Step>
                  </>
                )}
              </ol>

              <div className="p-5 pt-0">
                <button
                  onClick={() => {
                    setIosModalOpen(false);
                    dismiss();
                  }}
                  className="w-full h-11 rounded-xl gold-gradient text-white font-semibold active:scale-[0.98] transition-transform"
                >
                  הבנתי
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Step({
  n,
  icon,
  children,
}: {
  n: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 font-bold text-sm">
        {n}
      </div>
      <div className="flex-1 pt-0.5 leading-relaxed">{children}</div>
      <div className="shrink-0 pt-0.5">{icon}</div>
    </li>
  );
}
