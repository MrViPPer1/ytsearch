import { Metadata } from 'next';
import SearchPage from '@/components/youtube/search-page';

export const metadata: Metadata = {
  title: 'YouTube Channel Search',
  description: 'Search for YouTube channels with advanced filtering options',
};

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <SearchPage />
    </main>
  );
} 