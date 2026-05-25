'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Star, MessageSquare, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PhotoMark } from '@/components/brand/PhotoMark';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { api } from '@/lib/api';
import { ReviewCard, ReviewForm, type Review } from '@/components/reviews/review-card';

export default function ReviewsPage() {
  return (
    <Suspense fallback={null}>
      <ReviewsContent />
    </Suspense>
  );
}

function ReviewsContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const [showForm, setShowForm] = useState(!!code);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', 'public'],
    queryFn: async () => (await api.get<Review[]>('/reviews/public')).data,
  });

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-secondary/30 pb-20 lg:pb-10">
      <header className="border-b backdrop-blur-md bg-background/80 sticky top-0 z-30">
        <div className="container max-w-5xl flex items-center justify-between h-16 px-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <PhotoMark size="sm" />
            <span className="font-display font-black text-lg group-hover:text-primary transition-colors">בר אברג׳יל</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="container max-w-5xl py-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-10"
        >
          <h1 className="font-display font-black text-4xl sm:text-5xl mb-3">מה הלקוחות אומרים</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            כל ביקורת היא הזדמנות להשתפר. תודה לכל הלקוחות המופלאים שלנו.
          </p>
          <div className="mt-6">
            <Button variant="gold" size="lg" onClick={() => setShowForm((s) => !s)}>
              <Star className="w-4 h-4 ms-2" />
              השאר ביקורת
            </Button>
          </div>
        </motion.div>

        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.25 }}
            className="mb-10"
          >
            <ReviewForm defaultCode={code || ''} onSuccess={() => setShowForm(false)} />
          </motion.div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="עדיין אין ביקורות"
            description="היה הראשון להשאיר ביקורת"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
              >
                <ReviewCard r={r} />
              </motion.div>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <Button asChild variant="ghost">
            <Link href="/"><ArrowRight className="w-4 h-4 ms-2" /> חזרה לדף הבית</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
