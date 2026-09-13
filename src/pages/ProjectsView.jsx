import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Search, MapPin, Layers, Award, 
  AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Sparkles 
} from 'lucide-react';
import { API, formatINR, CITY } from '../services/api';
import PropertySkeleton from '../components/PropertySkeleton';
import AuthGate from '../components/AuthGate';
import ProjectDetailModal from '../components/ProjectDetailModal';

const LOCALITIES = [
  'all', 'jp nagar', 'sarjapur road', 'whitefield', 'bellandur',
  'electronic city', 'hebbal', 'koramangala', 'hsr layout'
];

const ITEMS_PER_PAGE = 18;

export default function ProjectsView({ user, onOpenLogin }) {
  if (!user) {
    return (
      <div className="min-h-screen pb-20 pt-8">
        <AuthGate
          title="Bangalore Developer Projects Locked"
          subtitle="RERA Verified Developer Inventory"
          description="Sign in with an Ivy Homes demo account to access normalized project pricing, RERA registration data, and audited unit counts across all major Bangalore developers."
          icon={Building2}
          onOpenLogin={onOpenLogin}
        />
      </div>
    );
  }

  const [projects, setProjects] = useState([]);
  const [liveCountByProject, setLiveCountByProject] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [locality, setLocality] = useState('all');
  const [discrepancyOnly, setDiscrepancyOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [pData, lData] = await Promise.all([
        API.fetchProjects(),
        API.fetchListings()
      ]);

      // Listings actually available in each project. It has to be the live ones:
      // counting every retrievable listing reproduces total_listings for only 128
      // projects, while counting live ones reproduces it exactly for 393, which is
      // what identifies is_live as the basis the field is computed on.
      const counts = {};
      lData.forEach((l) => {
        if (l.project_id && l.is_live) {
          counts[l.project_id] = (counts[l.project_id] || 0) + 1;
        }
      });

      setLiveCountByProject(counts);
      setProjects(pData);
      setLoading(false);
    }
    load();
  }, []);

  // Costliest Project Highlight (Question 7)
  const costliest = useMemo(() => {
    if (projects.length === 0) return null;
    return [...projects].sort((a, b) => (b.price_max_inr || 0) - (a.price_max_inr || 0))[0];
  }, [projects]);

  // Total with wrong listing counts (Question 10)
  const wrongCount = useMemo(() => {
    return projects.filter(p => {
      const actual = liveCountByProject[p.project_id] || 0;
      return p.total_listings !== actual;
    }).length;
  }, [projects, liveCountByProject]);

  // Filtered
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
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

      if (discrepancyOnly) {
        const actual = liveCountByProject[p.project_id] || 0;
        if (p.total_listings === actual) return false;
      }

      return true;
    });
  }, [projects, search, locality, discrepancyOnly, liveCountByProject]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedProjects = filteredProjects.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen pb-20">
      
      {/* Header Banner with Costliest Project Highlight */}
      <section className="bg-slate-50 border-b border-slate-200/80 pt-10 pb-12">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#EBEDFF] border border-[#d2d7ff] text-[#0018A8] text-xs font-bold uppercase tracking-wider mb-3">
                <Building2 className="w-3.5 h-3.5" />
                <span>RERA-Approved Builder Projects · {CITY}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Builder Projects & Developments
              </h1>
              <p className="mt-2 text-sm text-slate-600 max-w-xl">
                Normalized pricing converting undocumented Crores/Lakhs units to true INR values, with automated RERA inventory tracking.
              </p>
            </div>

            {/* Costliest Project Banner (Question 7) */}
            {costliest && (
              <motion.div 
                whileHover={{ scale: 1.015 }}
                className="bg-white border-2 border-[#0018A8]/30 rounded-3xl p-5 shadow-sm max-w-md"
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-[#0018A8] uppercase tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Costliest Project (Q7)</span>
                  </span>
                  <span className="font-mono text-xs text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                    {costliest.project_id}
                  </span>
                </div>

                <div className="text-2xl font-black text-slate-900">
                  {costliest.apartment_name}
                </div>
                
                <div className="text-sm font-bold text-[#0018A8] mt-0.5">
                  Peak Price: {costliest.price_max_display} ({formatINR(costliest.price_max_inr)})
                </div>

                <div className="text-xs text-slate-500 mt-2 flex items-center justify-between pt-2 border-t border-slate-100 font-medium">
                  <span>Developer: {costliest.developer_name}</span>
                  <span className="capitalize">{costliest.locality}</span>
                </div>
              </motion.div>
            )}

          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <div className="text-xs text-slate-500 font-semibold">Projects retrieved</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{projects.length}</div>
              <div className="text-[10px] text-slate-400">The envelope reports total: 476</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <div className="text-xs text-slate-500 font-semibold">Inventory Discrepancies</div>
              <div className="text-2xl font-black text-amber-600 mt-1">{wrongCount}</div>
              <div className="text-[10px] text-slate-400">Audited vs live market inventory</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <div className="text-xs text-slate-500 font-semibold">Price Normalization</div>
              <div className="text-2xl font-black text-[#0018A8] mt-1">Cr / L → INR</div>
              <div className="text-[10px] text-slate-400">Corrected units discrepancy</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <div className="text-xs text-slate-500 font-semibold">RERA number present</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {Math.round((100 * projects.filter(p => p.rera_number).length) / (projects.length || 1))}%
              </div>
              <div className="text-[10px] text-slate-400">{projects.filter(p => p.rera_number).length} of {projects.length} projects</div>
            </div>
          </div>

        </div>
      </section>

      {/* Main Grid & Filters */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 mt-8">
        
        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 mb-8 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Search Project or Builder
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="e.g. Puravankara Vista, Brigade..."
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#0018A8] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Locality
              </label>
              <select
                value={locality}
                onChange={(e) => { setLocality(e.target.value); setPage(1); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 capitalize focus:outline-none focus:border-[#0018A8] transition-colors cursor-pointer"
              >
                {LOCALITIES.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc === 'all' ? 'All Localities' : loc}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200 w-full cursor-pointer">
                <input
                  type="checkbox"
                  checked={discrepancyOnly}
                  onChange={(e) => { setDiscrepancyOnly(e.target.checked); setPage(1); }}
                  className="rounded border-slate-300 text-[#0018A8] focus:ring-[#0018A8]"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Inventory Discrepancies Only ({wrongCount})
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6 text-sm text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-900">{filteredProjects.length}</span> developer projects
          </div>
          <div className="text-xs text-slate-400">Page {currentPage} of {totalPages}</div>
        </div>

        {/* Grid */}
        {loading ? (
          <PropertySkeleton count={12} />
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {pagedProjects.map((p) => {
                const actualLive = liveCountByProject[p.project_id] || 0;
                const hasWrongCount = p.total_listings !== actualLive;

                return (
                  <motion.div
                    key={p.project_id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    onClick={() => setSelectedProject(p)}
                    className="bg-white border border-slate-200 hover:border-[#0018A8]/40 rounded-3xl p-6 shadow-sm hover:shadow-[0_16px_32px_-8px_rgba(0,24,168,0.12)] flex flex-col justify-between will-change-transform cursor-pointer transition-all group"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <span className="text-xs text-[#0018A8] font-bold tracking-wider uppercase">
                            {p.developer_name}
                          </span>
                          <h3 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-[#0018A8] transition-colors">
                            {p.apartment_name}
                          </h3>
                        </div>
                        <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                          {p.project_id}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-slate-500 mb-4 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#0018A8]" />
                        <span className="capitalize font-bold text-slate-700">{p.locality}</span>
                        <span>·</span>
                        <span className="capitalize text-slate-500">{p.project_status}</span>
                      </div>

                      {/* Normalized Price Range */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-4">
                        <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                          Price Range (Normalized INR)
                        </div>
                        <div className="text-lg font-black text-[#0018A8] mt-0.5">
                          {p.price_min_display} – {p.price_max_display}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-1">
                          Raw API: {p.raw_price_min} to {p.raw_price_max}
                        </div>
                      </div>

                      {/* Specs */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 py-3 border-t border-slate-100 font-medium">
                        <div>
                          <span className="text-slate-500">Area Range:</span>{' '}
                          <span className="font-bold text-slate-900">{p.min_area_sqft} - {p.max_area_sqft} sqft</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Towers / Floors:</span>{' '}
                          <span className="font-bold text-slate-900">{p.total_towers} / {p.total_floors}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Units:</span>{' '}
                          <span className="font-bold text-slate-900">{p.total_units} total</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Possession:</span>{' '}
                          <span className="font-bold text-slate-900">{p.possession_date || 'Ongoing'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Discrepancy / Inventory Footnote */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-500 font-medium">Listings:</span>
                        <span className="font-bold text-slate-900">{actualLive} active</span>
                      </div>

                      {hasWrongCount ? (
                        <span 
                          className="flex items-center space-x-1 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-medium" 
                          title={`total_listings reports ${p.total_listings}; the project actually has ${actualLive} live listings.`}
                        >
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          <span>Reports {p.total_listings} · Live {actualLive}</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-[11px] text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
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
              className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            <span className="px-3 text-sm font-semibold text-[#0018A8]">
              {currentPage} / {totalPages}
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        )}

      </div>

      {/* Project Detail Modal */}
      <ProjectDetailModal
        project={selectedProject}
        actualLiveCount={selectedProject ? (liveCountByProject[selectedProject.project_id] || 0) : 0}
        onClose={() => setSelectedProject(null)}
      />

    </div>
  );
}
