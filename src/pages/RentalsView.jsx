import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  KeyRound, Search, MapPin, BedDouble, Bath, Maximize2, 
  RotateCcw, ShieldCheck, ChevronLeft, ChevronRight, CheckCircle2, Sparkles
} from 'lucide-react';
import { API, formatINR, ASSIGNED_LOCALITY, CITY } from '../services/api';
import PropertySkeleton from '../components/PropertySkeleton';
import AuthGate from '../components/AuthGate';
import RentalDetailModal from '../components/RentalDetailModal';

const LOCALITIES = [
  'all', 'bellandur', 'koramangala', 'whitefield', 'hsr layout',
  'indiranagar', 'sarjapur road', 'electronic city', 'hebbal', 'yelahanka'
];

const BHK_OPTIONS = ['all', '1', '2', '3', '4'];
const ITEMS_PER_PAGE = 20;

export default function RentalsView({ user, onOpenLogin }) {
  if (!user) {
    return (
      <div className="min-h-screen pb-20 pt-8">
        <AuthGate
          title="Bangalore Rental Intelligence Locked"
          subtitle="Verified Rental Yields & Portals"
          description="Sign in with an Ivy Homes demo account to access verified rental properties across Bellandur, Whitefield, and Bangalore corridors with real-time rental analytics."
          icon={KeyRound}
          onOpenLogin={onOpenLogin}
        />
      </div>
    );
  }

  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [locality, setLocality] = useState('all');
  const [bhk, setBhk] = useState('all');
  const [maxRent, setMaxRent] = useState('');
  const [sortBy, setSortBy] = useState('rent_asc');
  const [page, setPage] = useState(1);
  const [selectedRental, setSelectedRental] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await API.fetchRentals();
      setRentals(data);
      setLoading(false);
    }
    load();
  }, []);

  // Bellandur specific aggregates (Question 5)
  const bellandurStats = useMemo(() => {
    const bRentals = rentals.filter(r => (r.locality || '').toLowerCase().trim() === ASSIGNED_LOCALITY);
    const sum = bRentals.reduce((acc, r) => acc + (r.price || 0), 0);
    return {
      count: bRentals.length,
      totalRent: sum
    };
  }, [rentals]);

  // Filtered logic
  const filteredRentals = useMemo(() => {
    return rentals.filter(r => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchTitle = (r.title || '').toLowerCase().includes(q);
        const matchApt = (r.apartment_name || '').toLowerCase().includes(q);
        const matchLoc = (r.locality || '').toLowerCase().includes(q);
        if (!matchTitle && !matchApt && !matchLoc) return false;
      }

      if (locality !== 'all' && (r.locality || '').toLowerCase().trim() !== locality.toLowerCase()) {
        return false;
      }

      if (bhk !== 'all' && r.bedroom !== parseInt(bhk, 10)) {
        return false;
      }

      if (maxRent !== '' && !isNaN(maxRent) && r.price > parseFloat(maxRent)) {
        return false;
      }

      return true;
    });
  }, [rentals, search, locality, bhk, maxRent]);

  // Sort logic
  const sortedRentals = useMemo(() => {
    const list = [...filteredRentals];
    switch (sortBy) {
      case 'rent_desc':
        return list.sort((a, b) => b.price - a.price);
      case 'area_desc':
        return list.sort((a, b) => (b.carpet_area || 0) - (a.carpet_area || 0));
      case 'rent_asc':
      default:
        return list.sort((a, b) => a.price - b.price);
    }
  }, [filteredRentals, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedRentals.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedRentals = sortedRentals.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen pb-20">
      
      {/* Header Banner */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900/60 to-slate-950 border-b border-slate-800/80 pt-10 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Verified Rental Portals · {CITY}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Rental Homes in {CITY}
              </h1>
              <p className="mt-2 text-sm text-slate-400 max-w-xl">
                Browse rental units with transparent monthly rent, security deposits, and maintenance charges.
              </p>
            </div>

            {/* Assigned Locality Highlight (Question 5) */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-3xl p-5 shadow-2xl shadow-emerald-950/40 max-w-md"
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Assigned Locality: {ASSIGNED_LOCALITY}</span>
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  Q5 Verified
                </span>
              </div>
              
              <div className="text-2xl sm:text-3xl font-black text-white">
                {formatINR(bellandurStats.totalRent)}
                <span className="text-xs text-slate-400 font-normal"> / month</span>
              </div>
              
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Exact sum of monthly rent across all {bellandurStats.count} retrievable rental units in {ASSIGNED_LOCALITY}.
              </p>

              <button
                onClick={() => { setLocality(ASSIGNED_LOCALITY); setPage(1); }}
                className="mt-3 w-full py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
              >
                <span>Filter to {ASSIGNED_LOCALITY} Units ({bellandurStats.count})</span>
              </button>
            </motion.div>

          </div>

        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Filters Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 mb-8 shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Search Title or Apartment
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="e.g. Sobha Meadows, Bellandur..."
                  className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Locality */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Locality
              </label>
              <select
                value={locality}
                onChange={(e) => { setLocality(e.target.value); setPage(1); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white capitalize focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {LOCALITIES.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc === 'all' ? 'All Localities' : loc}
                    {loc === ASSIGNED_LOCALITY ? ' (Assigned Locality)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* BHK */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Bedrooms
              </label>
              <select
                value={bhk}
                onChange={(e) => { setBhk(e.target.value); setPage(1); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {BHK_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b === 'all' ? 'Any Bedrooms' : `${b} BHK`}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="rent_asc">Rent: Low to High</option>
                <option value="rent_desc">Rent: High to Low</option>
                <option value="area_desc">Carpet Area: High to Low</option>
              </select>
            </div>

          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6 text-sm text-slate-400">
          <div>
            Showing <span className="font-bold text-white">{sortedRentals.length}</span> rental properties
          </div>
          <div>Page {currentPage} of {totalPages}</div>
        </div>

        {/* Grid with Skeleton loading */}
        {loading ? (
          <PropertySkeleton count={12} />
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {pagedRentals.map((r) => (
                <motion.div
                  key={r.listing_id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  whileHover={{ y: -6, scale: 1.015 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  onClick={() => setSelectedRental(r)}
                  className="bg-slate-900/85 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:shadow-emerald-950/30 flex flex-col justify-between will-change-transform cursor-pointer transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className="px-2.5 py-0.5 rounded-full font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {r.website}
                      </span>
                      <span className="capitalize font-semibold text-slate-400 flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{r.locality}</span>
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white line-clamp-1 mb-1 group-hover:text-emerald-400 transition-colors">
                      {r.title || `${r.bedroom} BHK in ${r.apartment_name}`}
                    </h3>
                    <div className="text-xs text-slate-400 mb-4 line-clamp-1">
                      {r.apartment_name}
                    </div>

                    {/* Pricing Box */}
                    <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80 mb-4">
                      <div className="flex items-baseline justify-between">
                        <div className="text-xl font-black text-emerald-400">
                          {formatINR(r.price)}
                          <span className="text-xs text-slate-400 font-normal"> / mo</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Deposit: <span className="text-slate-200 font-semibold">{formatINR(r.deposit)}</span>
                        </div>
                      </div>
                      {r.maintenance > 0 && (
                        <div className="text-[11px] text-slate-500 mt-1">
                          + {formatINR(r.maintenance)} / mo maintenance
                        </div>
                      )}
                    </div>

                    {/* Specs */}
                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-300 py-3 border-y border-slate-800/80">
                      <div className="flex items-center space-x-1.5">
                        <BedDouble className="w-3.5 h-3.5 text-slate-500" />
                        <span>{r.bedroom} BHK</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Bath className="w-3.5 h-3.5 text-slate-500" />
                        <span>{r.bathroom} Baths</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>{r.carpet_area} sqft</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-3 flex items-center justify-between text-xs text-slate-400">
                    <span className="capitalize">{r.furnishing}</span>
                    <span className="text-slate-500 font-mono text-[11px]">{r.listing_id}</span>
                  </div>

                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
              disabled={currentPage === 1}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            <span className="px-3 text-sm font-semibold text-emerald-400">
              {currentPage} / {totalPages}
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        )}

      </div>

      {/* Rental Detail Modal */}
      <RentalDetailModal
        rental={selectedRental}
        onClose={() => setSelectedRental(null)}
      />

    </div>
  );
}
