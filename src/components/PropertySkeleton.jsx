import React from 'react';

export default function PropertySkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg flex flex-col relative"
        >
          {/* Media Skeleton with shimmer */}
          <div className="relative aspect-[16/10] bg-slate-800/50 overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-slate-700/20 to-transparent"></div>
            
            {/* Fake Badge Pills */}
            <div className="absolute top-3 left-3 flex gap-2">
              <div className="w-16 h-5 rounded-full bg-slate-800/80 animate-pulse"></div>
              <div className="w-12 h-5 rounded-full bg-slate-800/80 animate-pulse"></div>
            </div>

            {/* Fake Heart */}
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-800/80 animate-pulse"></div>

            {/* Fake Bottom Price Bar */}
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
              <div className="w-24 h-6 rounded-lg bg-slate-800/90 animate-pulse"></div>
              <div className="w-16 h-4 rounded-md bg-slate-800/80 animate-pulse"></div>
            </div>
          </div>

          {/* Details Skeleton */}
          <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-28 h-3.5 rounded bg-slate-800 animate-pulse"></div>
              <div className="w-48 h-5 rounded-lg bg-slate-800/90 animate-pulse"></div>
            </div>

            {/* Specs Row */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80">
              <div className="h-4 rounded bg-slate-800/60 animate-pulse"></div>
              <div className="h-4 rounded bg-slate-800/60 animate-pulse"></div>
              <div className="h-4 rounded bg-slate-800/60 animate-pulse"></div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-800/50 flex justify-between">
              <div className="w-20 h-3 rounded bg-slate-800/60 animate-pulse"></div>
              <div className="w-12 h-3 rounded bg-slate-800/60 animate-pulse"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
