import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <div className="text-7xl font-bold text-primary mb-4">404</div>
        <h1 className="text-2xl font-semibold mb-2">הדף לא נמצא</h1>
        <p className="text-muted-foreground mb-6">הדף שחיפשת לא קיים או הוסר</p>
        <Button variant="gold" asChild><Link href="/">חזרה לדף הבית</Link></Button>
      </div>
    </div>
  );
}
