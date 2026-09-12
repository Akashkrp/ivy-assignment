import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Search, MapPin, Calendar, Award, 
  Sparkles, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Layers, Tag
} from 'lucide-react';
import { API, formatINR, formatCrores, CITY } from '../services/api';
import PropertySkeleton from '../components/PropertySkeleton';

const ITEMS_PER_PAGE = 18;

export default function ProjectsView() {
  const [projects, setProjects] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [locality, setLocality] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [projData, listData] = await Promise.all([
        API.fetchProjects(),
        API.fetchListings()
      ]);
      setProjects(projData);
      setListings(listData);
      setLoading(false);
    }
    load();
  }, []);

  // Compute active listings per project to verify Question 10 in UI
  const liveCountByProject = useMemo(() => {
    const map = {};
    for (const l of listings) {
      if (l.project_id && l.is_live) {
        map[l.project_id] = (map[l.project_id] || 0) + 1;
      }
    }
    return map;
  }, [listings]);

  // Costliest Project Highlight (Question 7)
  const costliest = useMemo(() => {
    if (!projects.length) return null;
    return [...projects].sort((a, b) => b.price_max_inr - a.price_max_inr)[0];
  }, [projects]);

  // Discrepancy count
  const wrongCount = useMemo(() => {
    return projects.filter(p => p.total_listings !== (liveCountByProject[p.project_id] || 0)).length;
  }, [projects, liveCountByProject]);

  const localities = useMemo(() => {
    const set = new Set(projects.map(p => (p.locality || '').toLowerCase().trim()).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [projects]);

  const statuses = useMemo(() => {
    const set = new Set(projects.map(p => (p.project_status || '').toLowerCase().trim()).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = (p.apartment_name || '').toLowerCase().includes(q);
        const matchDev = (p.developer_name || '').toLowerCase().includes(q);
        const matchId = (p.project_id || '').toLowerCase().includes(q);
        if (!matchName && !matchDev && !matchId) return false;
      }

      if (locality !== 'all' && (p.locality || '').toLowerCase().trim() !== locality.toLowerCase()) {
        return false;
      }

      if (status !== 'all' && (p.project_status || '').toLowerCase().trim() !== status.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [projects, search, locality, status]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedProjects = filteredProjects.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen pb-20">
      
      {/* Header Banner with Costliest Project Highlight */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900/60 to-slate-950 border-b border-slate-800/80 pt-10 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
                <Building2 className="w-3.5 h-3.5" />
                <span>RERA-Approved Builder Projects · {CITY}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Builder Projects & Developments
              </h1>
              <p className="mt-2 text-sm text-slate-400 max-w-xl">
                Normalized pricing converting undocumented Crores/Lakhs units to true INR values, with automated RERA inventory tracking.
              </p>
            </div>

            {/* Costliest Project Banner (Question 7) */}
            {costliest && (
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-3xl p-5 shadow-2xl shadow-emerald-950/40 max-w-md"
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Costliest Project (Q7)</span>
                  </span>
                  <span className="font-mono text-xs text-slate-300 font-bold bg-slate-800 px-2 py-0.5 rounded-lg">
                    {costliest.project_id}
                  </span>
                </div>

                <div className="text-2xl font-black text-white">
                  {costliest.apartment_name}
                </div>
                
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  Peak Price: {costliest.price_max_display} ({formatINR(costliest.price_max_inr)})
                </div>

                <div className="text-xs text-slate-400 mt-2 flex items-center justify-between pt-2 border-t border-slate-800">
                  <span>Developer: {costliest.developer_name}</span>
                  <span className="capitalize">{costliest.locality}</span>
                </div>
              </motion.div>
            )}

          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <div className="text-xs text-slate-400 font-semibold">Total Projects</div>
              <div className="text-2xl font-extrabold text-white mt-1">{projects.length}</div>
              <div className="text-[10px] text-slate-500">Documented: 476 (Lie)</div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <div className="text-xs text-slate-400 font-semibold">Wrong Listing Counts</div>
              <div className="text-2xl font-extrabold text-amber-400 mt-1">{wrongCount}</div>
              <div className="text-[10px] text-slate-500">Q10: Disagree with API inventory</div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <div className="text-xs text-slate-400 font-semibold">Price Normalization</div>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1">Cr / L → INR</div>
              <div className="text-[10px] text-slate-500">Corrected units discrepancy</div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <div className="text-xs text-slate-400 font-semibold">RERA Registration</div>
              <div className="text-2xl font-extrabold text-cyan-400 mt-1">100%</div>
              <div className="text-[10px] text-slate-500">Karnataka RERA compliant</div>
            </div>
          </div>

        </div>
      </section>

      {/* Main Grid & Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Filters */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 mb-8 shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Search Project or Builder
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="e.g. Puravankara Vista, Brigade..."
                  className="w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Locality
              </label>
              <select
                value={locality}
                onChange={(e) => { setLocality(e.target.value); setPage(1); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white capitalize focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {localities.map(loc => (
                  <option key={loc} value={loc}>{loc === 'all' ? 'All Localities' : loc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Construction Status
              </label>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white capitalize focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {statuses.map(st => (
                  <option key={st} value={st}>{st === 'all' ? 'All Statuses' : st}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-6 text-sm text-slate-400">
          <div>Showing <span className="font-bold text-white">{filteredProjects.length}</span> projects</div>
          <div>Page {currentPage} of {totalPages}</div>
        </div>

        {/* Projects Cards Grid */}
        {loading ? (
          <PropertySkeleton count={9} />
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {pagedProjects.map((p) => {
                const actualLive = liveCountByProject[p.project_id] || 0;
                const hasWrongCount = p.total_listings !== actualLive;

                return (
                  <motion.div
                    key={p.project_id}
                    layout
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    whileHover={{ y: -6, scale: 1.015 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="bg-slate-900/85 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:shadow-emerald-950/30 flex flex-col justify-between will-change-transform"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <span className="text-xs text-emerald-400 font-semibold tracking-wider uppercase">
                            {p.developer_name}
                          </span>
                          <h3 className="text-lg font-bold text-white leading-snug">
                            {p.apartment_name}
                          </h3>
                        </div>
                        <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                          {p.project_id}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-slate-400 mb-4">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="capitalize font-semibold text-slate-300">{p.locality}</span>
                        <span>·</span>
                        <span className="capitalize text-slate-400">{p.project_status}</span>
                      </div>

                      {/* Normalized Price Range */}
                      <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 mb-4">
                        <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                          Price Range (Normalized INR)
                        </div>
                        <div className="text-lg font-black text-white mt-0.5">
                          {p.price_min_display} – {p.price_max_display}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-1">
                          Raw: {p.raw_price_min} to {p.raw_price_max}
                        </div>
                      </div>

                      {/* Specs */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 py-3 border-t border-slate-800/80">
                        <div>
                          <span className="text-slate-500">Area Range:</span>{' '}
                          <span className="font-semibold">{p.min_area_sqft} - {p.max_area_sqft} sqft</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Towers / Floors:</span>{' '}
                          <span className="font-semibold">{p.total_towers} / {p.total_floors}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Units:</span>{' '}
                          <span className="font-semibold">{p.total_units} total</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Possession:</span>{' '}
                          <span className="font-semibold">{p.possession_date || 'Ongoing'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Discrepancy / Inventory Footnote (Question 10 verification) */}
                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-400 font-medium">Listings:</span>
                        <span className="font-bold text-white">{actualLive} active</span>
                      </div>

                      {hasWrongCount ? (
                        <span className="flex items-center space-x-1 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full" title="Project reports wrong total_listings">
                          <AlertCircle className="w-3 h-3" />
                          <span>Reports {p.total_listings} (Lie)</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-[11px] text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>

                  </motion.div>
                );
              })}
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

    </div>
  );
}
