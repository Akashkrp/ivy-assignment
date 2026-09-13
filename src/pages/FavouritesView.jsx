import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Home } from 'lucide-react';
import { API, Auth } from '../services/api';
import ListingCard from '../components/ListingCard';
import AuthGate from '../components/AuthGate';

export default function FavouritesView({ user: propUser, onOpenLogin, savedListings = [], onToggleSave }) {
  const user = propUser !== undefined ? propUser : Auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen pb-20 pt-8">
        <AuthGate
          title="Saved Properties Portfolio Locked"
          subtitle="Personalized Watchlist"
          description="Sign in with an Ivy Homes demo account to access and synchronize your shortlisted Bangalore properties across devices."
          icon={Heart}
          onOpenLogin={onOpenLogin}
        />
      </div>
    );
  }

  const [allListings, setAllListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await API.fetchListings();
      setAllListings(data);
      setLoading(false);
    }
    load();
  }, []);

  const savedObjects = useMemo(() => {
    const idsSet = new Set(
      savedListings.map((item) => (typeof item === 'string' ? item : (item.listing_id || item.id))).filter(Boolean)
    );
    return allListings.filter((l) => idsSet.has(l.listing_id));
  }, [allListings, savedListings]);

  return (
    <div className="min-h-screen pb-20 bg-white">
      
      {/* Header */}
      <section className="bg-slate-50 border-b border-slate-200/80 pt-10 pb-12">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold uppercase tracking-wider mb-3">
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>Saved Collections</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Your Saved Properties
              </h1>
              <p className="mt-2 text-sm text-slate-600 max-w-xl">
                {user ? (
                  <>Synced to account <span className="text-[#0018A8] font-bold">{user.email}</span> via <code className="text-slate-700 bg-slate-200/80 px-1 py-0.5 rounded text-xs font-semibold">/v1/saved</code>.</>
                ) : (
                  <>Stored in persistent storage. Sign in with a demo account to sync across devices.</>
                )}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 min-w-[140px] text-right shadow-2xs">
              <div className="text-xs text-slate-500 font-semibold">Total Saved</div>
              <div className="text-2xl font-black text-rose-600 mt-0.5">{savedListings.length}</div>
              <div className="text-[10px] text-slate-400">Persisted across reloads</div>
            </div>
          </div>

        </div>
      </section>

      {/* Main Grid */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 mt-8">
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-72 bg-slate-100 rounded-2xl animate-pulse border border-slate-200"></div>
            ))}
          </div>
        ) : savedObjects.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-200 p-8">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mx-auto mb-4">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No saved properties yet</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              When browsing listings, click the heart icon on any property card or detail page to add it to your saved collection.
            </p>
            <Link
              to="/"
              className="inline-flex items-center space-x-2 mt-6 px-5 py-2.5 rounded-xl bg-[#0018A8] hover:bg-[#001385] text-white font-bold text-sm shadow-sm transition-all"
            >
              <Home className="w-4 h-4" />
              <span>Browse Active Listings</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {savedObjects.map((listing) => (
              <ListingCard
                key={listing.listing_id}
                listing={listing}
                isSaved={true}
                onToggleSave={onToggleSave}
              />
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
