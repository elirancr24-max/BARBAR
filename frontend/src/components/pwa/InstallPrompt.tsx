'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'barabargil-install-dismissed';
const DISMISS_DAYS = 7;

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Skip if already installed
    if (typeof window === 'undefined') return;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Check dismissal cookie
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;

    // iOS detection — iOS doesn't fire beforeinstallprompt
    const ua = navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);
    if (ios) {
      setIsIos(true);
      setTimeout(() => setShow(true), 3000);
      return;
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 1500);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  async function install() {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setShow(false);
    setEvent(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="fixed bottom-4 inset-x-4 z-[60] max-w-md mx-auto"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="rounded-2xl glass shadow-2xl border-primary/20 overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl shrink-0 overflow-hidden ring-2 ring-primary/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.jpg" alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-base leading-tight">התקן את האפליקציה</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {isIos
                    ? 'גישה מהירה ישירות מהמסך הראשי'
                    : 'גישה מיידית, ללא דפדפן'}
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

            {isIos ? (
              <div className="px-4 pb-4 text-xs text-muted-foreground border-t pt-3 flex items-center gap-2 flex-wrap">
                <span>פתח את</span>
                <Share className="w-4 h-4 inline text-primary" />
                <span>בספארי</span>
                <span>·</span>
                <span>הוסף למסך הבית</span>
                <Plus className="w-4 h-4 inline text-primary" />
              </div>
            ) : (
              <div className="px-4 pb-4 border-t pt-3">
                <button
                  onClick={install}
                  className="w-full h-11 rounded-xl gold-gradient text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <Download className="w-4 h-4" />
                  התקן עכשיו
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
