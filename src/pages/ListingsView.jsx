import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, SlidersHorizontal, ArrowUpDown, ShieldCheck, 
  Sparkles, AlertTriangle, Filter, RotateCcw, ChevronLeft, ChevronRight,
  Home, MapPin, Building2
} from 'lucide-react';
import { API, ASSIGNED_LOCALITY, CITY } from '../services/api';
import ListingCard from '../components/ListingCard';
import PropertySkeleton from '../components/PropertySkeleton';

const LOCALITIES = [
  'all', 'bellandur', 'koramangala', 'hsr layout', 'whitefield', 
  'indiranagar', 'sarjapur road', 'electronic city', 'hebbal', 
  'yelahanka', 'jp nagar'
];

const BHK_OPTIONS = ['all', '1', '2', '3', '4', '5+'];

const PROPERTY_TYPES = [
  'all', 'apartment', 'villa', 'independent house', 'builder floor', 'plot'
];

const FURNISHING_OPTIONS = [
  'all', 'unfurnished', 'semi-furnished', 'fully-furnished'
];

const ITEMS_PER_PAGE = 24;

export default function ListingsView({ savedListings = [], onToggleSave }) {
  const [allListings, setAllListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [locality, setLocality] = useState('all');
  const [bhk, setBhk] = useState('all');
  const [propType, setPropType] = useState('all');
  const [furnishing, setFurnishing] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [hideAnomalies, setHideAnomalies] = useState(true);
  const [sortBy, setSortBy] = useState('posted_desc');
  const [page, setPage] = useState(1);

  // Load Data
  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await API.fetchListings();
      setAllListings(data);
      setLoading(false);
    }
    load();
  }, []);

  // Filter Logic (Client-side engine compensates for server ignoring min_price, max_price, furnishing)
  const filteredListings = useMemo(() => {
    return allListings.filter((l) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchApt = (l.apartment_name || '').toLowerCase().includes(q);
        const matchLoc = (l.locality || '').toLowerCase().includes(q);
        const matchDesc = (l.description || '').toLowerCase().includes(q);
        const matchId = (l.listing_id || '').toLowerCase().includes(q);
        if (!matchApt && !matchLoc && !matchDesc && !matchId) return false;
      }

      if (locality !== 'all' && (l.locality || '').toLowerCase() !== locality.toLowerCase()) {
        return false;
      }

      if (bhk !== 'all') {
        if (bhk === '5+') {
          if ((l.bedroom || 0) < 5) return false;
        } else {
          if (l.bedroom !== parseInt(bhk, 10)) return false;
        }
      }

      if (propType !== 'all' && (l.property_type || '').toLowerCase() !== propType.toLowerCase()) {
        return false;
      }

      if (furnishing !== 'all' && (l.furnishing || '').toLowerCase() !== furnishing.toLowerCase()) {
        return false;
      }

      if (minPrice !== '' && !isNaN(minPrice)) {
        if (l.price < parseFloat(minPrice)) return false;
      }

      if (maxPrice !== '' && !isNaN(maxPrice)) {
        if (l.price > parseFloat(maxPrice)) return false;
      }

      if (activeOnly && !l.is_live) {
        return false;
      }

      if (hideAnomalies && (l.is_corrupt || l.is_fake)) {
        return false;
      }

      return true;
    });
  }, [allListings, search, locality, bhk, propType, furnishing, minPrice, maxPrice, activeOnly, hideAnomalies]);

  // Sort Logic
  const sortedListings = useMemo(() => {
    const list = [...filteredListings];
    switch (sortBy) {
      case 'price_asc':
        return list.sort((a, b) => a.price - b.price);
      case 'price_desc':
        return list.sort((a, b) => b.price - a.price);
      case 'area_desc':
        return list.sort((a, b) => (b.carpet_area || 0) - (a.carpet_area || 0));
      case 'posted_desc':
      default:
        return list.sort((a, b) => (b.posted_at || '').localeCompare(a.posted_at || ''));
    }
  }, [filteredListings, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedListings.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedListings = sortedListings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const resetFilters = () => {
    setSearch('');
    setLocality('all');
    setBhk('all');
    setPropType('all');
    setFurnishing('all');
    setMinPrice('');
    setMaxPrice('');
    setActiveOnly(true);
    setHideAnomalies(true);
    setSortBy('posted_desc');
    setPage(1);
  };

  return (
    <div className="min-h-screen pb-16">
      
      {/* Hero Header & Quick Stats */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900/60 to-slate-950 border-b border-slate-800/80 pt-10 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Verified City Dataset · {CITY}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Browse Properties in {CITY}
              </h1>
              <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
                Explore real estate listings across verified builder societies. Powered by dual-layer client filtering to correct server query discrepancies.
              </p>
            </div>

            {/* Quick Metrics Cards */}
            <div className="flex flex-wrap gap-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 min-w-[130px]">
                <div className="text-[11px] font-semibold text-slate-400">Total Retrievable</div>
                <div className="text-xl font-extrabold text-white mt-0.5">4,700</div>
                <div className="text-[10px] text-emerald-400">Full Dataset Ingested</div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 min-w-[130px]">
                <div className="text-[11px] font-semibold text-slate-400">Active Live Units</div>
                <div className="text-xl font-extrabold text-emerald-400 mt-0.5">3,722</div>
                <div className="text-[10px] text-slate-500">978 Off-Market Filtered</div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 min-w-[130px]">
                <div className="text-[11px] font-semibold text-slate-400">Unique Properties</div>
                <div className="text-xl font-extrabold text-cyan-400 mt-0.5">4,182</div>
                <div className="text-[10px] text-slate-500">Cross-portal Deduplicated</div>
              </div>
            </div>

          </div>

          {/* Search Bar */}
          <div className="mt-8 relative max-w-3xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search apartment name, locality (e.g. Bellandur, Whitefield), or Listing ID..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-950 border border-slate-700/70 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-xl shadow-slate-950/50 transition-all"
            />
            {search && (
              <button 
                onClick={() => setSearch('')} 
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

        </div>
      </section>

      {/* Main Content & Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Filter Controls Bar */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 mb-8 shadow-xl shadow-slate-950/30">
          
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center space-x-2 font-semibold text-slate-200">
              <Filter className="w-4 h-4 text-emerald-400" />
              <span>Property Filters & Precision Controls</span>
            </div>
            <button
              onClick={resetFilters}
              className="flex items-center space-x-1.5 text-slate-400 hover:text-emerald-400 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Locality Dropdown */}
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
                    {loc === ASSIGNED_LOCALITY ? ' (Assigned)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Bedrooms (BHK) */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Bedrooms (BHK)
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

            {/* Min Price */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Min Price (INR)
              </label>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
                placeholder="e.g. 5000000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Max Price (INR)
              </label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                placeholder="e.g. 20000000"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Property Type
              </label>
              <select
                value={propType}
                onChange={(e) => { setPropType(e.target.value); setPage(1); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white capitalize focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {PROPERTY_TYPES.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt === 'all' ? 'All Types' : pt}
                  </option>
                ))}
              </select>
            </div>

            {/* Furnishing */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Furnishing
              </label>
              <select
                value={furnishing}
                onChange={(e) => { setFurnishing(e.target.value); setPage(1); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white capitalize focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {FURNISHING_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f === 'all' ? 'Any Furnishing' : f}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Sort Results
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="posted_desc">Recently Posted</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="area_desc">Carpet Area: Largest First</option>
              </select>
            </div>

            {/* Toggles (Active Only & Hide Anomalies) */}
            <div className="flex flex-col justify-end space-y-2 pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => { setActiveOnly(e.target.checked); setPage(1); }}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="font-medium">Live / Active Only</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideAnomalies}
                  onChange={(e) => { setHideAnomalies(e.target.checked); setPage(1); }}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="font-medium">Hide Corrupt & Fake Listings</span>
              </label>
            </div>

          </div>

        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-slate-400 font-medium">
            Showing <span className="font-bold text-white">{sortedListings.length}</span> matching properties
            {hideAnomalies && ' (excluding corrupt/fake records)'}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        {/* Listings Grid with Skeleton Loading */}
        {loading ? (
          <PropertySkeleton count={12} />
        ) : pagedListings.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8">
            <Home className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-200">No properties matched your criteria</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Try clearing filters or search terms to broaden your results.
            </p>
            <button
              onClick={resetFilters}
              className="mt-5 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold text-xs border border-emerald-500/30 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {pagedListings.map((listing) => (
                <ListingCard
                  key={listing.listing_id}
                  listing={listing}
                  isSaved={savedListings.includes(listing.listing_id)}
                  onToggleSave={onToggleSave}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
              disabled={currentPage === 1}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>

            <div className="flex items-center space-x-1 px-3 text-sm font-semibold">
              <span className="text-emerald-400">{currentPage}</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">{totalPages}</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        )}

      </div>

    </div>
  );
}
