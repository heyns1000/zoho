import { Suspense } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { SearchBar } from '@/components/SearchBar';
import { StatsGrid } from '@/components/StatsGrid';
import { ActivityFeed } from '@/components/ActivityFeed';
import { SourcesGrid } from '@/components/SourcesGrid';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                ZohoConnect
              </h1>
              <p className="text-slate-400 text-lg">
                Full-Stack Zero-Waste Integration • HSOMNI9000 Ecosystem
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-slate-400 text-sm">All Systems Operational</span>
            </div>
          </div>
        </header>

        {/* Main Dashboard */}
        <div className="container mx-auto px-6 py-8 space-y-8">
          {/* Universal Search */}
          <Suspense fallback={<LoadingSpinner />}>
            <SearchBar />
          </Suspense>

          {/* Stats Overview */}
          <Suspense fallback={<LoadingSpinner />}>
            <StatsGrid />
          </Suspense>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Activity Feed - 2 columns */}
            <div className="lg:col-span-2">
              <Suspense fallback={<LoadingSpinner />}>
                <ActivityFeed />
              </Suspense>
            </div>

            {/* Sources - 1 column */}
            <div className="lg:col-span-1">
              <Suspense fallback={<LoadingSpinner />}>
                <SourcesGrid />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
