import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, ShieldAlert, CheckCircle2, AlertTriangle, 
  Flame, Search, Filter, Sparkles, ExternalLink, HelpCircle,
  Clock, Hash, MapPin, Database, Award, ArrowRight, Layers
} from 'lucide-react';
import { API, formatCrores, formatINR, ASSIGNED_LOCALITY, CITY } from '../services/api';
import AuthGate from '../components/AuthGate';

const CATEGORIES = [
  'all', 'auth', 'pagination', 'units', 'filters', 'timestamps',
  'duplicates', 'completeness', 'data_quality', 'fraud', 'consistency',
  'missing_endpoint', 'undocumented_endpoint'
];

const CATEGORY_COLORS = {
  auth: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  pagination: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  units: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  filters: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  timestamps: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  duplicates: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  completeness: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
  data_quality: 'text-red-400 bg-red-500/10 border-red-500/30',
  fraud: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  consistency: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  missing_endpoint: 'text-rose-400 bg-rose-500/15 border-rose-500/40',
  undocumented_endpoint: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
};

export default function InsightsView({ user, onOpenLogin }) {
  if (!user) {
    return (
      <div className="min-h-screen pb-20 pt-8">
        <AuthGate
          title="Market Truth & Algorithmic Insights Locked"
          subtitle="Data Science & Integrity Audits"
          description="Sign in with an Ivy Homes demo account to access deep analytical charts, locality price vs area distributions, and verified audit metrics."
          icon={BarChart3}
          onOpenLogin={onOpenLogin}
        />
      </div>
    );
  }

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('answers'); // 'answers' or 'lies'
  const [searchLie, setSearchLie] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const sub = await API.fetchSubmission();
      setSubmission(sub);
      setLoading(false);
    }
    load();
  }, []);

  const findings = submission?.findings || [];
  const answers = submission?.answers || {};

  const filteredFindings = useMemo(() => {
    return findings.filter(f => {
      if (selectedCategory !== 'all' && f.category !== selectedCategory) {
        return false;
      }
      if (searchLie.trim()) {
        const q = searchLie.toLowerCase().trim();
        const matchEp = (f.endpoint || '').toLowerCase().includes(q);
        const matchDoc = (f.documented || '').toLowerCase().includes(q);
        const matchAct = (f.actual || '').toLowerCase().includes(q);
        const matchCat = (f.category || '').toLowerCase().includes(q);
        if (!matchEp && !matchDoc && !matchAct && !matchCat) return false;
      }
      return true;
    });
  }, [findings, selectedCategory, searchLie]);

  // Mandatory 10 Questions config with descriptions & methodologies
  const tenQuestions = [
    {
      num: 1,
      key: 'total_listing_records',
      title: 'Total Retrievable Listing Records',
      question: 'How many listing records are retrievable from /v1/listings?',
      answer: answers.total_listing_records ?? 4700,
      badge: 'Exact Count',
      note: 'The server response metadata deceptively reports total: 4301. Continuing offset pagination until has_more: false yields exactly 4,700 retrievable unique records.'
    },
    {
      num: 2,
      key: 'unique_properties',
      title: 'Distinct Physical Properties',
      question: 'Among those records, genuine or not, how many distinct properties do they describe?',
      answer: (answers.unique_properties ?? 4182).toLocaleString(),
      badge: '±1% Allowed',
      note: 'Multiple portals (100acres, dwelling, magichomes, squarelane, zerobroker) list identical physical units. Deduplicated by composite key: (apartment_name, locality, floor, total_floors, bedrooms, facing).'
    },
    {
      num: 3,
      key: 'active_listings',
      title: 'Active Listings (is_live: true)',
      question: 'How many retrievable listing records have is_live true?',
      answer: (answers.active_listings ?? 3722).toLocaleString(),
      badge: 'Exact Count',
      note: 'Documentation claimed inactive listings are excluded server-side. In reality, 978 listings are off-market (is_live: false), leaving 3,722 live records.'
    },
    {
      num: 4,
      key: 'corrupt_listing_ids',
      title: 'Physically Impossible Records',
      question: 'A small number of listing records describe something that cannot exist.',
      answer: `${(answers.corrupt_listing_ids || []).length} Records`,
      badge: 'List of IDs',
      note: 'Identified 40 impossible records (8 per category): negative prices, floor > total_floors, carpet_area > super_built_up, swapped coordinates (lat > 50 in Arctic Russia), and 0-BHK apartments.',
      list: answers.corrupt_listing_ids || []
    },
    {
      num: 5,
      key: 'total_monthly_rent',
      title: `Total Monthly Rent in ${ASSIGNED_LOCALITY}`,
      question: `Sum of monthly rent across all retrievable rental records in assigned locality (${ASSIGNED_LOCALITY}).`,
      answer: formatINR(answers.total_monthly_rent ?? 6448700),
      badge: 'Exact Sum',
      note: `Summed monthly rent across all 191 retrievable rental units located in ${ASSIGNED_LOCALITY}.`
    },
    {
      num: 6,
      key: 'avg_price_per_sqft_2bhk',
      title: 'Average Price / Sqft (2BHK Live)',
      question: 'Mean of price divided by carpet area in INR/sqft, excluding corrupt and fake IDs.',
      answer: `₹${(answers.avg_price_per_sqft_2bhk ?? 11496.64).toLocaleString()} / sqft`,
      badge: '±1% Allowed',
      note: 'Accounted for the documentation unit lie where magichomes reports carpet area in square meters (< 300). Converted m² to sqft (×10.7639) to compute true rate per square foot.'
    },
    {
      num: 7,
      key: 'costliest_project',
      title: 'Costliest Builder Project',
      question: 'The project with the highest maximum price, as { project_id, price_max_inr }.',
      answer: `${answers.costliest_project?.project_id || 'P10255'} (${formatCrores(answers.costliest_project?.price_max_inr || 48900000)})`,
      badge: 'Normalized INR',
      note: 'Project units lie: values < 10 are in Crores, values >= 10 are in Lakhs. P10255 (Puravankara Vista) has price_max 4.89 Cr (₹4.89 Cr), higher than P10068 (99.8 Lakhs = ₹0.998 Cr).'
    },
    {
      num: 8,
      key: 'listings_last_7_days',
      title: 'Listings in Last 7 Days before Reference',
      question: 'Listings posted in [REFERENCE - 7 days, REFERENCE) in IST.',
      answer: `${answers.listings_last_7_days ?? 149} Listings`,
      badge: 'Exact Count',
      note: 'Counted listings posted between 2026-09-03T00:00:00 and 2026-09-10T00:00:00 IST. The database timestamps are stored in local IST.'
    },
    {
      num: 9,
      key: 'fake_listing_ids',
      title: 'Fake Enquiry-Generation Listings',
      question: 'Listings that are not real and exist solely to generate enquiries.',
      answer: `${(answers.fake_listing_ids || []).length} Records`,
      badge: 'List of IDs',
      note: 'Identified 8 clickbait sale listings with artificially minuscule prices (Rs 6,250 to Rs 16,790 for full 2BHK/3BHK apartments) posted by brokers as lead-generation bait.',
      list: answers.fake_listing_ids || []
    },
    {
      num: 10,
      key: 'projects_with_wrong_listing_count',
      title: 'Projects with Inaccurate Inventory Count',
      question: 'Every project reports total_listings. For how many projects is that number wrong?',
      answer: `${answers.projects_with_wrong_listing_count ?? 127} Projects`,
      badge: 'Exact Count',
      note: 'total_listings was documented to always agree with currently available listings. For 127 out of 520 projects, this number disagrees with active listings in the database.'
    }
  ];

  return (
    <div className="min-h-screen pb-24">
      
      {/* Header Banner */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900/60 to-slate-950 border-b border-slate-800/80 pt-10 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Ivy Homes Data Investigation & Audit Report</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Insights & Documentation Truth
              </h1>
              <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
                The official API documentation is highly flawed. This screen exposes our empirical audit: verifying the 10 data questions and documenting every proven discrepancy.
              </p>
            </div>

            {/* Candidate Badge */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-5 shadow-xl max-w-sm">
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                Candidate Submission
              </div>
              <div className="text-base font-extrabold text-white">
                {submission?.candidate?.name || 'Akash Kumar Prasad'}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                {submission?.candidate?.email || 'akash.20234017@mnnit.ac.in'}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Key: {submission?.api_key}</span>
                <span className="text-emerald-400 font-semibold">{findings.length} Discrepancies</span>
              </div>
            </div>

          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-2 mt-8 border-b border-slate-800">
            <button
              onClick={() => setActiveTab('answers')}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center space-x-2 ${
                activeTab === 'answers'
                  ? 'border-emerald-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="w-4 h-4 text-emerald-400" />
              <span>The 10 Mandatory Answers</span>
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300">
                10 / 10
              </span>
            </button>

            <button
              onClick={() => setActiveTab('lies')}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center space-x-2 ${
                activeTab === 'lies'
                  ? 'border-rose-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Documentation Lies Explorer</span>
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300">
                {findings.length} Proven
              </span>
            </button>
          </div>

        </div>
      </section>

      {/* Main Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* TAB 1: The 10 Answers */}
        {activeTab === 'answers' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Evaluated Answers for City: {CITY}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Anchored to reference moment <code className="text-emerald-300 font-mono">2026-09-10T00:00:00+05:30 (IST)</code>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tenQuestions.map((q) => (
                <div
                  key={q.num}
                  className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px] font-extrabold">
                          Q{q.num}
                        </span>
                        <span>{q.key}</span>
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-full">
                        {q.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mb-2">
                      {q.title}
                    </h3>

                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                      "{q.question}"
                    </p>

                    {/* Answer Highlight Box */}
                    <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 mb-3">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Verified Result
                      </div>
                      <div className="text-2xl font-black text-emerald-400 mt-0.5">
                        {q.answer}
                      </div>
                    </div>

                    {/* Methodology note */}
                    <p className="text-xs text-slate-400 leading-relaxed">
                      <strong className="text-slate-300">Methodology: </strong>
                      {q.note}
                    </p>
                  </div>

                  {/* If there's an ID list (corrupt or fake), provide collapsible preview */}
                  {q.list && q.list.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-800/80">
                      <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
                        Identified Record IDs ({q.list.length}):
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                        {q.list.map((id) => (
                          <span
                            key={id}
                            className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800"
                          >
                            {id}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB 2: Documentation Lies Explorer */}
        {activeTab === 'lies' && (
          <div>
            
            {/* Search & Category Filter Controls */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 mb-8 shadow-xl">
              
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={searchLie}
                    onChange={(e) => setSearchLie(e.target.value)}
                    placeholder="Search discrepancies by endpoint, category, or description..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center space-x-2 overflow-x-auto max-w-full pb-1">
                  <span className="text-xs font-semibold text-slate-400 shrink-0">Category:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white capitalize focus:outline-none focus:border-emerald-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat === 'all' ? 'All Categories' : cat.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between mb-6 text-sm text-slate-400 font-medium">
              <div>
                Displaying <span className="font-bold text-white">{filteredFindings.length}</span> proven discrepancies
              </div>
            </div>

            {/* Discrepancies Grid */}
            <div className="space-y-6">
              {filteredFindings.map((f, idx) => {
                const colorClass = CATEGORY_COLORS[f.category] || 'text-slate-400 bg-slate-800 border-slate-700';

                return (
                  <div
                    key={idx}
                    className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl hover:border-slate-700 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-white bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                          {f.endpoint}
                        </span>
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${colorClass}`}>
                          {f.category.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-semibold">
                        Finding #{idx + 1}
                      </span>
                    </div>

                    {/* Side-by-side comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      
                      {/* Documented Claim */}
                      <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Documented Claim (The Lie)</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-mono">
                          "{f.documented}"
                        </p>
                      </div>

                      {/* Actual Behavior */}
                      <div className="p-4 rounded-2xl bg-emerald-950/10 border border-emerald-500/20">
                        <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Actual API Behavior (The Truth)</span>
                        </div>
                        <p className="text-xs text-emerald-200/90 leading-relaxed font-mono">
                          "{f.actual}"
                        </p>
                      </div>

                    </div>

                    {/* Details: How Found & Impact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                      <div>
                        <strong className="text-slate-300">How Discovered: </strong>
                        {f.how_found}
                      </div>
                      <div>
                        <strong className="text-slate-300">Client Impact: </strong>
                        {f.impact}
                      </div>
                    </div>

                    {/* Evidence IDs if applicable */}
                    {f.evidence && f.evidence.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-800/60">
                        <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center space-x-1">
                          <span>Reproducible Evidence IDs ({f.evidence.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {f.evidence.map(evId => (
                            <span
                              key={evId}
                              className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800"
                            >
                              {evId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
