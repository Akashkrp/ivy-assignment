import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Home, Trash2, Building2, ExternalLink } from 'lucide-react';
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
    return allListings.filter((l) => savedListings.includes(l.listing_id));
  }, [allListings, savedListings]);

  return (
    <div className="min-h-screen pb-20">
      
      {/* Header */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900/60 to-slate-950 border-b border-slate-800/80 pt-10 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-3">
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>Saved Collections</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Your Saved Properties
              </h1>
              <p className="mt-2 text-sm text-slate-400 max-w-xl">
                {user ? (
                  <>Synced to account <span className="text-emerald-400 font-semibold">{user.email}</span> via <code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded text-xs">/v1/saved</code>.</>
                ) : (
                  <>Stored in persistent local storage. Sign in with a demo account to sync across devices.</>
                )}
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 min-w-[140px] text-right">
              <div className="text-xs text-slate-400 font-semibold">Total Saved</div>
              <div className="text-2xl font-black text-rose-400 mt-0.5">{savedListings.length}</div>
              <div className="text-[10px] text-slate-500">Persisted across reloads</div>
            </div>
          </div>

        </div>
      </section>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-72 bg-slate-900 rounded-2xl animate-pulse border border-slate-800"></div>
            ))}
          </div>
        ) : savedObjects.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto mb-4">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">No saved properties yet</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              When browsing listings, click the heart icon on any property card or detail page to add it to your saved collection.
            </p>
            <Link
              to="/"
              className="inline-flex items-center space-x-2 mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Home className="w-4 h-4" />
              <span>Browse Active Listings</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
