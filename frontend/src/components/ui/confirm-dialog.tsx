'use client';

import { createContext, useCallback, useContext, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Card } from './card';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'אישור',
  cancelText = 'ביטול',
  variant = 'default',
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const Icon = variant === 'destructive' ? AlertTriangle : HelpCircle;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            initial={{ y: 20, scale: 0.95, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="overflow-hidden">
              <div className="p-6 text-center">
                <div
                  className={cn(
                    'w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center',
                    variant === 'destructive'
                      ? 'bg-destructive/15 text-destructive'
                      : 'bg-primary/15 text-primary',
                  )}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="font-display font-bold text-xl mb-2">{title}</h3>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
              <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={onClose} className="h-11">
                  {cancelText}
                </Button>
                <Button
                  variant={variant === 'destructive' ? 'destructive' : 'gold'}
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="h-11"
                  autoFocus
                >
                  {confirmText}
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Hook + Provider for imperative confirm() that returns a Promise<boolean> ───

type ConfirmOptions = Omit<ConfirmDialogProps, 'open' | 'onClose' | 'onConfirm'>;

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ ...opts, open: true });
    });
  }, []);

  const handleClose = () => {
    resolverRef.current?.(false);
    resolverRef.current = null;
    setState((s) => (s ? { ...s, open: false } : null));
  };

  const handleConfirm = () => {
    resolverRef.current?.(true);
    resolverRef.current = null;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <ConfirmDialog
          open={state.open}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title={state.title}
          description={state.description}
          confirmText={state.confirmText}
          cancelText={state.cancelText}
          variant={state.variant}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
