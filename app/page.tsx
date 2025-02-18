import { Metadata } from 'next';
import { Suspense } from 'react';
import SearchPage from '@/components/youtube/search-page';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'YouTube Channel Search',
  description: 'Search for YouTube channels with advanced filtering options',
};

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <Suspense fallback={
        <div className="space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      }>
        <SearchPage />
      </Suspense>
    </main>
  );
} 