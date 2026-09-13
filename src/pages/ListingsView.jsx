import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, SlidersHorizontal, ArrowUpDown, ShieldCheck, 
  Sparkles, AlertTriangle, Filter, RotateCcw, ChevronLeft, ChevronRight,
  Home, MapPin, Building2, Lock, ArrowRight, Phone
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

export default function ListingsView({ user, onOpenLogin, savedListings = [], onToggleSave }) {
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

  const [showMoreFilters, setShowMoreFilters] = useState(false);

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

  const activeExtraFilterCount = [
    propType !== 'all',
    furnishing !== 'all',
    minPrice !== '',
    maxPrice !== '',
    !activeOnly,
    !hideAnomalies,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen pb-16">
      
      {/* Authentic Ivy Homes Hero Banner in Sleek Dark Theme */}
      <section className="pt-6 pb-6 px-4 sm:px-6 lg:px-8 xl:px-10 max-w-[1600px] mx-auto">
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 min-h-[360px] sm:min-h-[420px] flex items-center">
          {/* Photographic Background with Seamless Dark Gradient Overlay */}
          <div className="absolute inset-0 z-0">
            <img 
              src="/hero-family.jpg" 
              alt="Happy couple moving into their new home" 
              className="w-full h-full object-cover object-center opacity-35 filter contrast-110 brightness-90"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
          </div>

          <div className="relative z-10 p-6 sm:p-10 lg:p-14 max-w-4xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold tracking-wide backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {user ? `Signed in as ${user.email}` : 'Bangalore Real Estate Intelligence · Ivy Homes'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
              Sell your home instantly with{' '}
              <span className="text-amber-400 font-extrabold inline-block">zero hassle</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed max-w-2xl">
              {user 
                ? 'Ivy Homes verified property marketplace. Browse 3,687 authenticated Bangalore listings across 11 key localities with real-time valuation intelligence.'
                : 'Ivy Homes buys your home directly and handles everything end to end. We offer guaranteed liquidity, zero brokerage, and cash in hand in 60 days.'
              }
            </p>

            {/* Authenticated State: Instant Search Bar */}
            {user ? (
              <div className="pt-2 max-w-3xl">
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-5 h-5 text-[#0018A8]" />
                  </div>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search apartment, society (e.g. Prestige, Sobha), locality (Bellandur)..."
                    className="w-full pl-12 pr-20 py-3.5 bg-white text-slate-900 border border-slate-200 rounded-2xl text-sm placeholder-slate-400 focus:outline-none focus:border-[#0018A8] focus:ring-2 focus:ring-[#0018A8]/20 shadow-xl transition-all"
                  />
                  {search && (
                    <button 
                      onClick={() => setSearch('')} 
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Unauthenticated State: Branding Actions & Demo Account Pills */
              <div className="pt-2 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => onOpenLogin?.()}
                    className="px-6 py-3 rounded-xl bg-[#0018A8] hover:bg-[#001385] text-white font-bold text-sm shadow-md transition-all cursor-pointer inline-flex items-center space-x-2 active:scale-95"
                  >
                    <span>Sign In to Unlock 3,687 Listings</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="text-slate-400 font-medium">1-Click Demo Login:</span>
                  {['demo1@ivy.homes', 'demo2@ivy.homes', 'demo3@ivy.homes'].map((demo) => (
                    <button
                      key={demo}
                      onClick={() => onOpenLogin?.(demo)}
                      className="px-2.5 py-1 rounded-lg bg-white/95 border border-white/40 hover:bg-white text-slate-800 text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      {demo}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Proof Metrics Row */}
            <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-200 font-medium">
              <div className="flex items-center space-x-2">
                <span className="text-base font-black text-white">
                  {user ? filteredListings.length.toLocaleString() : '3,687'}
                </span>
                <span className="text-slate-300">Live Listings</span>
              </div>
              <span className="text-slate-600">·</span>
              <div className="flex items-center space-x-2">
                <span className="text-base font-black text-amber-300">850+</span>
                <span className="text-slate-300">Homes Evaluated</span>
              </div>
              <span className="text-slate-600">·</span>
              <div className="flex items-center space-x-2">
                <span className="text-base font-black text-emerald-300">₹1000 Cr+</span>
                <span className="text-slate-300">Transaction Value</span>
              </div>
              <span className="text-slate-600">·</span>
              <div className="flex items-center space-x-1.5 text-emerald-300 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero Brokerage</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* If NOT authenticated: Show ONLY the Ivy Homes branding, tagline, calculator, and unlock CTA */}
      {!user ? (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 mb-16 space-y-12">
          
          {/* Unlock Portal CTA Banner */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.06)] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EBEDFF] text-[#0018A8] flex items-center justify-center mx-auto shadow-xs">
              <Lock className="w-6 h-6" />
            </div>
            
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Bangalore Property Marketplace Locked
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                Directly explore 3,687 verified live properties across 11 Bangalore localities with dual-layer client filtering and real-time valuations.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={onOpenLogin}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0018A8] hover:bg-[#001385] text-white font-bold text-sm shadow-md transition-all cursor-pointer inline-flex items-center justify-center space-x-2 active:scale-95"
              >
                <span>Sign In With Demo Account to Unlock Feed</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Pre-configured credentials:</span>
              <span className="font-semibold text-slate-800">demo1@ivy.homes</span>
              <span>·</span>
              <span className="font-semibold text-slate-800">demo2@ivy.homes</span>
              <span>·</span>
              <span className="font-semibold text-slate-800">demo3@ivy.homes</span>
            </div>
          </div>

          {/* Slogan & Cost of Waiting 1 Year Section */}
          <section className="text-center space-y-6">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#EBEDFF] border border-[#d2d7ff] text-[#0018A8] text-xs font-bold uppercase tracking-wider">
              <span>WHY SELL TO US</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Every month unsold is <span className="text-[#0018A8]">a cost you are absorbing.</span>
            </h2>

            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Most sellers think about price. Few count what waiting actually costs. Here is what one year on the open market looks like for a typical 2 BHK in Bangalore.
            </p>

            {/* Bangalore Cost of Waiting Calculator Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 text-left shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-md bg-[#0018A8] text-white text-[10px] font-bold uppercase tracking-wider">
                    CALCULATOR
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    1 Year · 2 BHK · Typical Bangalore Market Value (₹1.05 Cr)
                  </span>
                </div>
              </div>

              <div className="mt-5 mb-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">The hidden cost of waiting 1 year</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  These are the actual carrying costs a seller absorbs while waiting for the right buyer to show up.
                </p>
              </div>

              {/* Table / Cost Breakdown */}
              <div className="mt-4 space-y-3 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 text-slate-800">
                
                <div className="flex items-center justify-between py-2 border-b border-slate-200/60 text-xs sm:text-sm">
                  <div>
                    <div className="font-semibold text-slate-900">Maintenance charges</div>
                    <div className="text-[11px] text-slate-500">Avg ₹8,000/mo × 12 months</div>
                  </div>
                  <div className="font-bold text-slate-900 font-mono">₹97,000</div>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-200/60 text-xs sm:text-sm">
                  <div>
                    <div className="font-semibold text-slate-900">Lost rental income</div>
                    <div className="text-[11px] text-slate-500">Unoccupied property × 12 months @ ₹35,000/mo</div>
                  </div>
                  <div className="font-bold text-slate-900 font-mono">₹4,20,000</div>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-200/60 text-xs sm:text-sm">
                  <div>
                    <div className="font-semibold text-slate-900">Broker fee on eventual sale</div>
                    <div className="text-[11px] text-slate-500">Standard 2% brokerage on sale price</div>
                  </div>
                  <div className="font-bold text-slate-900 font-mono">₹2,10,000</div>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-200/60 text-xs sm:text-sm">
                  <div>
                    <div className="font-semibold text-slate-900">Price risk</div>
                    <div className="text-[11px] text-slate-500">Market corrections & aggressive buyer negotiations</div>
                  </div>
                  <div className="font-semibold text-amber-700 text-xs">Uncertain</div>
                </div>

                <div className="flex items-center justify-between pt-3 text-sm sm:text-base">
                  <div>
                    <div className="font-black text-slate-900">Total estimated cost of waiting 1 year</div>
                    <div className="text-[11px] text-slate-500">Includes direct carrying costs & brokerage fees</div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[#0018A8] font-sans">₹7.8 L+</div>
                </div>

              </div>

              {/* Bottom Guarantee Badges */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <div className="text-base font-black text-[#0018A8]">₹0</div>
                  <div className="text-[11px] font-semibold text-slate-600 mt-0.5">In hidden fees</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <div className="text-base font-black text-[#0018A8]">₹0</div>
                  <div className="text-[11px] font-semibold text-slate-600 mt-0.5">Broker commission</div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <div className="text-base font-black text-[#0018A8]">60 Days</div>
                  <div className="text-[11px] font-semibold text-slate-600 mt-0.5">Cash in hand</div>
                </div>
              </div>

              <div className="mt-4 p-3.5 bg-[#EBEDFF] border border-[#d2d7ff] rounded-xl text-xs text-[#0018A8] leading-relaxed font-medium">
                💡 <strong>Ivy Insight:</strong> The money saved by not waiting is often greater than any minor price variation between open-market speculation and our guaranteed instant offer.
              </div>

            </div>

          </section>

        </div>
      ) : (
        /* If Authenticated: Show Full Interactive Marketplace, Filters, & Property Feed */
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 mt-6">
          
          {/* Decluttered Filter Controls Bar */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 mb-8 shadow-xs">
            
            {/* Quick Primary Filters Row */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              
              {/* Locality Selector */}
              <div className="flex items-center space-x-2 min-w-[200px]">
                <MapPin className="w-4 h-4 text-[#0018A8] shrink-0" />
                <select
                  value={locality}
                  onChange={(e) => { setLocality(e.target.value); setPage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 font-medium capitalize focus:outline-none focus:border-[#0018A8] cursor-pointer"
                >
                  {LOCALITIES.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc === 'all' ? 'All Localities' : loc}
                      {loc === ASSIGNED_LOCALITY ? ' ★ Assigned' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* BHK Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                <span className="text-xs font-semibold text-slate-500 mr-1 hidden sm:inline">Bedrooms:</span>
                {BHK_OPTIONS.map((b) => {
                  const isSelected = bhk === b;
                  return (
                    <button
                      key={b}
                      onClick={() => { setBhk(b); setPage(1); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-[#0018A8] text-white shadow-xs'
                          : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {b === 'all' ? 'Any BHK' : `${b} BHK`}
                    </button>
                  );
                })}
              </div>

              {/* Sort Dropdown & More Filters Button */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1.5">
                  <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:border-[#0018A8] cursor-pointer"
                  >
                    <option value="posted_desc">Newest First</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="area_desc">Largest Area</option>
                  </select>
                </div>

                <button
                  onClick={() => setShowMoreFilters(!showMoreFilters)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                    showMoreFilters || activeExtraFilterCount > 0
                      ? 'bg-[#EBEDFF] border-[#0018A8] text-[#0018A8]'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filters</span>
                  {activeExtraFilterCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#0018A8] text-white text-[10px] flex items-center justify-center font-bold">
                      {activeExtraFilterCount}
                    </span>
                  )}
                </button>

                {(search || locality !== 'all' || bhk !== 'all' || activeExtraFilterCount > 0) && (
                  <button
                    onClick={resetFilters}
                    title="Reset all filters"
                    className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

            </div>

            {/* Expandable Advanced Filters Drawer */}
            <AnimatePresence>
              {showMoreFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden pt-4 mt-4 border-t border-slate-100"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                        Property Type
                      </label>
                      <select
                        value={propType}
                        onChange={(e) => { setPropType(e.target.value); setPage(1); }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium capitalize focus:outline-none focus:border-[#0018A8] cursor-pointer"
                      >
                        {PROPERTY_TYPES.map((pt) => (
                          <option key={pt} value={pt}>
                            {pt === 'all' ? 'All Types' : pt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                        Furnishing
                      </label>
                      <select
                        value={furnishing}
                        onChange={(e) => { setFurnishing(e.target.value); setPage(1); }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium capitalize focus:outline-none focus:border-[#0018A8] cursor-pointer"
                      >
                        {FURNISHING_OPTIONS.map((f) => (
                          <option key={f} value={f}>
                            {f === 'all' ? 'Any Furnishing' : f}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                        Min Price (₹)
                      </label>
                      <input
                        type="number"
                        value={minPrice}
                        onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
                        placeholder="e.g. 5000000"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-[#0018A8]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                        Max Price (₹)
                      </label>
                      <input
                        type="number"
                        value={maxPrice}
                        onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                        placeholder="e.g. 20000000"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-[#0018A8]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-xs">
                    <label className="flex items-center space-x-2 text-slate-700 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeOnly}
                        onChange={(e) => { setActiveOnly(e.target.checked); setPage(1); }}
                        className="rounded border-slate-300 text-[#0018A8] focus:ring-[#0018A8] bg-white"
                      />
                      <span>Live Properties Only</span>
                    </label>

                    <label className="flex items-center space-x-2 text-slate-700 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideAnomalies}
                        onChange={(e) => { setHideAnomalies(e.target.checked); setPage(1); }}
                        className="rounded border-slate-300 text-[#0018A8] focus:ring-[#0018A8] bg-white"
                      />
                      <span>Filter Corrupt Data & Enquiry Bait Listings</span>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-900">{sortedListings.length}</span> matching properties
              {hideAnomalies && ' (excluding corrupt/fake records)'}
            </div>
            <div className="text-xs text-slate-400 font-medium">
              Page {currentPage} of {totalPages}
            </div>
          </div>

          {/* Listings Grid with Skeleton Loading */}
          {loading ? (
            <PropertySkeleton count={12} />
          ) : pagedListings.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-200 p-8">
              <Home className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800">No properties matched your criteria</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Try clearing filters or search terms to broaden your results.
              </p>
              <button
                onClick={resetFilters}
                className="mt-5 px-4 py-2 rounded-xl bg-[#EBEDFF] hover:bg-[#dce2ff] text-[#0018A8] font-bold text-xs border border-[#d2d7ff] transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
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
                className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.button>

              <div className="flex items-center space-x-1 px-3 text-sm font-semibold">
                <span className="text-[#0018A8] font-bold">{currentPage}</span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-600">{totalPages}</span>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
                disabled={currentPage === totalPages}
                className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
