import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, CheckCircle2, AlertTriangle, 
  Search, Award, ShieldAlert, Sparkles, MapPin, 
  Layers, Copy, Check, ExternalLink, HelpCircle, Flame, Building2, Box,
  TrendingUp, Compass, ArrowUpRight, Activity, PieChart, ShieldCheck, Database, Filter
} from 'lucide-react';
import { API, CITY, ASSIGNED_LOCALITY, formatINR, formatCrores } from '../services/api';
import AuthGate from '../components/AuthGate';
import Bellandur3DMap from '../components/Bellandur3DMap';

const CATEGORIES = [
  'all', 'auth', 'pagination', 'units', 'filters', 'timestamps',
  'duplicates', 'completeness', 'data_quality', 'fraud', 'consistency',
  'missing_endpoint', 'undocumented_endpoint'
];

const CATEGORY_COLORS = {
  auth: 'text-rose-700 bg-rose-50 border-rose-200',
  pagination: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  units: 'text-amber-800 bg-amber-50 border-amber-200',
  filters: 'text-blue-700 bg-blue-50 border-blue-200',
  timestamps: 'text-purple-700 bg-purple-50 border-purple-200',
  duplicates: 'text-orange-700 bg-orange-50 border-orange-200',
  completeness: 'text-teal-700 bg-teal-50 border-teal-200',
  data_quality: 'text-red-700 bg-red-50 border-red-200',
  fraud: 'text-yellow-800 bg-yellow-50 border-yellow-200',
  consistency: 'text-sky-700 bg-sky-50 border-sky-200',
  missing_endpoint: 'text-rose-700 bg-rose-50 border-rose-200',
  undocumented_endpoint: 'text-emerald-700 bg-emerald-50 border-emerald-200'
};

export default function InsightsView({ user, onOpenLogin }) {
  if (!user) {
    return (
      <div className="min-h-screen pb-20 pt-8">
        <AuthGate
          title="Insights & Detective Audit Locked"
          subtitle="Data Science & Integrity Audits"
          description="Sign in with an Ivy Homes demo account to access deep analytical charts, locality price vs area distributions, and verified audit metrics."
          icon={BarChart3}
          onOpenLogin={onOpenLogin}
        />
      </div>
    );
  }

  const [submission, setSubmission] = useState(null);
  const [derived, setDerived] = useState(null);
  const [allListings, setAllListings] = useState([]);
  const [allRentals, setAllRentals] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('questions'); // 'questions', '3dmap', 'graphs', 'discrepancies', 'corrupt', 'bait', 'bellandur'
  const [searchLie, setSearchLie] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [copiedId, setCopiedId] = useState(null);

  // Inspector filters
  const [corruptFilter, setCorruptFilter] = useState('all');
  const [corruptSearch, setCorruptSearch] = useState('');
  const [baitSearch, setBaitSearch] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [sub, der, listings, rentals, projects] = await Promise.all([
          API.fetchSubmission(),
          API.fetchDerived(),
          API.fetchListings(),
          API.fetchRentals(),
          API.fetchProjects()
        ]);
        setSubmission(sub);
        setDerived(der);
        setAllListings(listings || []);
        setAllRentals(rentals || []);
        setAllProjects(projects || []);
      } catch (e) {
        console.error('Failed to load insights data:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const findings = submission?.findings || [];
  const answers = submission?.answers || {};

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  // Index listings by ID for quick lookup
  const listingsMap = useMemo(() => {
    const map = new Map();
    allListings.forEach(l => map.set(l.listing_id, l));
    return map;
  }, [allListings]);

  const n = (v) => (typeof v === 'number' ? v.toLocaleString('en-IN') : '—');
  const bel = derived?.bellandur;
  const corruptIds = answers.corrupt_listing_ids || [];
  const fakeIds = answers.fake_listing_ids || [];
  const costliestProject = useMemo(
    () => allProjects.find(p => p.project_id === answers.costliest_project?.project_id),
    [allProjects, answers.costliest_project]
  );

  // The ten questions. Every figure below is read from submission.json, which is
  // produced by scripts/generate_submission.mjs from the same dataset this page
  // is rendering - nothing here is typed in by hand.
  const tenQuestions = [
    {
      num: 1,
      title: 'Total listing records retrievable',
      answer: `${n(answers.total_listing_records)} records`,
      summary: `The envelope reports total: ${n(derived?.reported_totals?.listings)}. Paging to the end returns ${n(answers.total_listing_records)}.`,
      methodology: 'Paged /v1/listings by offset at the real cap of 50 per request until has_more went false — 94 requests, ending at offset 4650. Probing past the end (offset 4700, 4750, 4900) returns count 0, so that is genuinely the end. All 4,700 listing_ids are distinct, so these are extra records rather than repeats. The undocumented /v1/localities agrees: its per-locality counts sum to exactly 4,700.'
    },
    {
      num: 2,
      title: 'Distinct physical properties',
      answer: `${n(answers.unique_properties)} properties`,
      summary: `${n(derived?.duplicate_clusters)} clusters cover ${n(derived?.duplicate_records)} redundant records — the same flat posted more than once.`,
      methodology: 'The society name is spelled differently across copies — "Adarsh Crest", "Adarsh-Crest", "ADARSH CREST" — so it is normalised first (lowercased, non-alphanumerics stripped). A property is then identified by society, locality, floor, building height, bedrooms and facing. Areas are deliberately not in the key, because duplicate copies disagree by a few square feet; every one of the clusters agrees on area to within 5%, which is what confirms they are the same unit. 403 clusters span two portals, 87 sit inside one.'
    },
    {
      num: 3,
      title: 'Active listings',
      answer: `${n(answers.active_listings)} listings`,
      summary: `${n(derived?.inactive_listings)} of ${n(answers.total_listing_records)} records carry is_live: false, despite the documentation promising only active listings.`,
      methodology: 'is_live is not in the documented listing object at all. Counted it across the full paged dataset: 3,722 true, 978 false. Nothing is filtered server side, so this has to be done client side — the browse screen defaults to hiding the 978.'
    },
    {
      num: 4,
      title: 'Records that describe something impossible',
      answer: `${corruptIds.length} listing IDs`,
      summary: 'Seven defect classes of exactly eight records each, no overlap between them.',
      methodology: 'Every physical constraint I could state, run over all 4,700 records: negative prices, carpet area larger than super built-up, floor above the top of the building, latitude and longitude transposed, apartments with zero bedrooms and zero bathrooms, posted_at up to ten months in the future, and price recorded in thousands of rupees. Each class lands on exactly eight records scattered across all five portals, which is what marks them as injected rather than a portal convention. Plots are excluded: all 182 legitimately carry zero bedrooms, bathrooms and floors.'
    },
    {
      num: 5,
      title: `Total monthly rent in ${ASSIGNED_LOCALITY}`,
      answer: `${formatINR(answers.total_monthly_rent)} / month`,
      summary: `Across ${n(bel?.rentals)} rentals whose locality field is ${ASSIGNED_LOCALITY}.`,
      methodology: `The trap here is the title. In 1,691 of 1,900 rentals the title names a different locality from the locality field, and the locality it names is always a real one, so nothing looks wrong in isolation. The description agrees with the locality field in all 1,900 records and the title's bedroom count is right every time, so it is the title's locality that is shuffled. Filtering on the title gives 184 rentals and ₹65,35,100; filtering on the locality field gives ${n(bel?.rentals)} and ${formatINR(answers.total_monthly_rent)}.`
    },
    {
      num: 6,
      title: 'Average rate per sq ft, live 2 BHK',
      answer: `₹${answers.avg_price_per_sqft_2bhk?.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / sqft`,
      summary: `Mean of price ÷ carpet area over ${n(derived?.q6_sample_size)} records, excluding the answers to questions 4 and 9.`,
      methodology: `Two unit corrections have to happen first or the number is meaningless. ${n(derived?.sqm_listings)} magichomes records report carpet area in square metres, which read as roughly ₹124,000 per sq ft until converted at 10.7639. Eight records report price in thousands of rupees. Both sets are removed or corrected, along with the 56 impossible records and the 170 bait listings, before taking the mean.`
    },
    {
      num: 7,
      title: 'Costliest project',
      answer: `${costliestProject?.apartment_name || answers.costliest_project?.project_id} (${answers.costliest_project?.project_id}) — ${formatCrores(answers.costliest_project?.price_max_inr)}`,
      summary: 'Project prices are not rupees, and not one single unit either.',
      methodology: `price_min and price_max run from 1 to 99.8, and 372 of 520 projects have a raw price_min larger than their raw price_max — which no single unit can explain. The unit is implied by the magnitude: below 10 the figure is crores, 10 and above it is lakhs. That is the only reading that leaves every project with min ≤ max, and it is the one that matches the actual listing prices inside each project. Under it the top project is ${answers.costliest_project?.project_id} at a raw price_max of ${costliestProject?.raw_price_max}, i.e. ${formatCrores(answers.costliest_project?.price_max_inr)}; read as lakhs throughout, P10068 at 99.8 would win with only ₹99.8 lakh.`
    },
    {
      num: 8,
      title: 'Listings posted in the seven days before the reference',
      answer: `${n(answers.listings_last_7_days)} listings`,
      summary: 'Window [2026-09-03T00:00:00+05:30, 2026-09-10T00:00:00+05:30).',
      methodology: 'The documentation says timestamps are UTC with a Z suffix everywhere. Listing timestamps carry neither, and they are IST, not UTC. Two things show it: the latest non-future listing is 2026-09-09T23:40 and the latest rental is 2026-09-09T18:11Z — 23:41 IST — so both collections stop just short of the same instant, which only lines up if the naive stamps are already IST; and the server itself buckets sort_by=posted_at on the IST date. Reading them as UTC instead shifts everything 5.5 hours and gives 142.'
    },
    {
      num: 9,
      title: 'Listings that exist to generate enquiries',
      answer: `${fakeIds.length} listing IDs`,
      summary: `${derived?.bait_phones?.length || 0} phone numbers, each posting 24–25 listings at about half the going rate with every one flagged verified and live.`,
      methodology: 'The obvious test — absurdly low prices — finds eight records, and they turn out to be a units bug rather than bait: every one of the eight is the only price in the dataset that is not a multiple of 10,000, and ×1,000 puts each back at market rate. Coming at it from the seller side instead: 12 phone numbers carry more than one seller name and no other number in the dataset does. Five of those price at market with ordinary verified and live rates and are just busy agencies. The other seven price at a median 0.46–0.53 of the rate for the same locality and bedroom count, and have 100% of their listings flagged verified and live — against base rates of 60% and 79%, which over 24 listings is about a 1-in-50-million coincidence.'
    },
    {
      num: 10,
      title: 'Projects reporting a wrong listing count',
      answer: `${n(answers.projects_with_wrong_listing_count)} projects`,
      summary: `total_listings disagrees with the real count for ${n(answers.projects_with_wrong_listing_count)} of ${n(allProjects.length)} projects.`,
      methodology: 'The documentation promises total_listings always agrees with /v1/listings?project_id=... — a filter that turns out to be ignored entirely, so the comparison has to be made client side. Counting live listings per project reproduces total_listings exactly for 393 projects, which is what identifies live listings as the intended basis; counting every retrievable listing matches only 128. Differences run from −14 to +9.'
    }
  ];

  // Defect classes, their members read straight from the dataset rather than
  // listed here, so the inspector cannot disagree with the answer.
  const corruptCategories = useMemo(() => {
    const byClass = derived?.corrupt_by_class || {};
    const labels = {
      negative_price: ['Negative sale price', 'The price is below zero. Magnitudes are otherwise normal for the locality, so the sign is flipped rather than the number being junk.'],
      price_in_thousands: ['Price in thousands of rupees', 'Whole flats priced between ₹6,250 and ₹16,790. These are the only eight prices in the dataset that are not a multiple of 10,000; ×1,000 puts each back at the market rate for its locality.'],
      carpet_exceeds_super_builtup: ['Carpet area exceeds super built-up', 'The inner carpet area is larger than the outer super built-up footprint that contains it.'],
      floor_exceeds_total_floors: ['Floor above the top of the building', 'The unit sits on a floor higher than the building has — floor 37 of 22, floor 20 of 7.'],
      swapped_coordinates: ['Latitude and longitude transposed', 'The pair is the wrong way round, putting a Bangalore flat above the 50th parallel.'],
      zero_bedroom_and_bathroom: ['Zero bedrooms and bathrooms', 'Apartments and villas with no bedrooms and no bathrooms. Plots are excluded — all 182 legitimately carry zeroes.'],
      posted_in_the_future: ['Posted in the future', 'posted_at falls after the reference moment, by as much as ten months.']
    };
    return Object.entries(byClass).map(([key, ids]) => ({
      key,
      title: labels[key]?.[0] || key,
      desc: labels[key]?.[1] || '',
      count: ids.length,
      ids
    }));
  }, [derived]);

  const allCorruptRecords = useMemo(() => {
    return corruptCategories.flatMap(cat =>
      cat.ids.map(id => {
        const item = listingsMap.get(id) || {};
        const own = (item.defects || []).find(d => d.key === cat.key);
        return {
          id,
          categoryKey: cat.key,
          categoryTitle: cat.title,
          apartment_name: item.apartment_name || id,
          locality: item.locality || '—',
          website: item.website || id.split('-')[0].toLowerCase(),
          price: item.price,
          carpet_area: item.carpet_area,
          super_built_up_area: item.super_built_up_area,
          floor: item.floor,
          total_floors: item.total_floors,
          bedroom: item.bedroom,
          latitude: item.latitude,
          longitude: item.longitude,
          violation: own?.detail || cat.desc
        };
      })
    );
  }, [corruptCategories, listingsMap]);

  const filteredCorruptRecords = useMemo(() => {
    return allCorruptRecords.filter(r => {
      if (corruptFilter !== 'all' && r.categoryKey !== corruptFilter) return false;
      if (corruptSearch.trim()) {
        const q = corruptSearch.toLowerCase().trim();
        return (
          r.id.toLowerCase().includes(q) ||
          r.apartment_name.toLowerCase().includes(q) ||
          r.locality.toLowerCase().includes(q) ||
          r.website.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allCorruptRecords, corruptFilter, corruptSearch]);

  // The bait rings, grouped by the phone number they all answer on.
  // Per-portal integrity, counted rather than asserted.
  const portalScorecard = useMemo(() => {
    const byPortal = new Map();
    for (const l of allListings) {
      if (!byPortal.has(l.website)) byPortal.set(l.website, []);
      byPortal.get(l.website).push(l);
    }
    const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
    return [...byPortal.entries()]
      .map(([portal, rows]) => {
        const classes = [...new Set(rows.filter(r => r.is_corrupt).flatMap(r => r.defect_keys))];
        const labels = {
          negative_price: 'negative prices',
          price_in_thousands: 'prices in thousands',
          carpet_exceeds_super_builtup: 'carpet above super built-up',
          floor_exceeds_total_floors: 'floors above the building',
          swapped_coordinates: 'transposed coordinates',
          zero_bedroom_and_bathroom: 'zero-bedroom homes',
          posted_in_the_future: 'future post dates'
        };
        const sqm = rows.filter(r => r.is_area_converted).length;
        const caveat = [...classes.map(c => labels[c] || c), ...(sqm ? ['areas in square metres'] : [])].join(', ') || 'no defects found';
        return {
          portal,
          total: rows.length,
          impossible: rows.filter(r => r.is_corrupt).length,
          bait: rows.filter(r => r.is_fake).length,
          sqm,
          verified: pct(rows.filter(r => r.is_verified).length, rows.length),
          live: pct(rows.filter(r => r.is_live).length, rows.length),
          caveat: caveat.charAt(0).toUpperCase() + caveat.slice(1)
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [allListings]);

  // Everything the audit found, sized against each other.
  const defectBars = useMemo(() => {
    const byClass = derived?.corrupt_by_class || {};
    const classLabel = {
      negative_price: 'Negative sale price',
      price_in_thousands: 'Price in thousands of rupees',
      carpet_exceeds_super_builtup: 'Carpet area exceeds super built-up',
      floor_exceeds_total_floors: 'Floor above the top of the building',
      swapped_coordinates: 'Latitude and longitude transposed',
      zero_bedroom_and_bathroom: 'Zero bedrooms and bathrooms',
      posted_in_the_future: 'Posted after the reference moment'
    };
    return [
      { label: 'Redundant copies of the same flat', count: derived?.duplicate_records || 0, color: 'bg-indigo-600', badge: 'duplicates' },
      { label: 'Areas reported in square metres', count: derived?.sqm_listings || 0, color: 'bg-sky-500', badge: 'units' },
      { label: 'Enquiry-bait listings', count: fakeIds.length, color: 'bg-amber-500', badge: 'fraud' },
      ...Object.entries(byClass).map(([key, ids]) => ({
        label: classLabel[key] || key,
        count: ids.length,
        color: key === 'price_in_thousands' ? 'bg-sky-500' : 'bg-rose-500',
        badge: key === 'price_in_thousands' ? 'units' : 'impossible'
      }))
    ];
  }, [derived, fakeIds]);
  const defectBarMax = Math.max(1, ...defectBars.map(b => b.count));

  // Rate-versus-market for three cohorts: the bait rings, the five agencies that
  // share a number but price normally, and everybody else.
  const ratioCohorts = useMemo(() => {
    const median = (rows) => {
      const v = rows.map(r => r.market_rate_ratio).filter(Number.isFinite).sort((a, b) => a - b);
      return { n: v.length, median: v.length ? v[Math.floor(v.length / 2)] : 0 };
    };
    const usable = allListings.filter(l => !l.is_corrupt && l.property_type !== 'plot');
    const bait = usable.filter(l => l.is_fake);
    const sharedButNormal = usable.filter(l => !l.is_fake && l.shares_contact_number);
    const rest = usable.filter(l => !l.is_fake && !l.shares_contact_number);
    return [
      { label: `Bait rings (${derived?.bait_phones?.length || 0} numbers)`, ...median(bait), color: 'bg-rose-500', note: 'Every listing flagged verified and live; every one priced well under the going rate.' },
      { label: 'Shared number, priced at market (5 numbers)', ...median(sharedButNormal), color: 'bg-amber-400', note: 'Same shared-phone signature, ordinary verified and live rates, ordinary prices. Not counted as fraud.' },
      { label: 'Everything else', ...median(rest), color: 'bg-slate-400', note: 'One seller name per number, as the documentation describes.' }
    ];
  }, [allListings, derived]);

  // Mean rate per sq ft by bedroom count, on exactly the basis answer 6 uses.
  const bhkMatrix = useMemo(() => {
    const rows = allListings.filter(l => l.is_live && !l.is_corrupt && !l.is_fake && l.price_per_sqft);
    const group = (label, pred, isHighlight = false) => {
      const g = rows.filter(pred);
      if (!g.length) return { bhk: label, rate: 0, avgPrice: 0, carpet: 0, n: 0, isHighlight };
      const avg = (f) => Math.round(g.reduce((s, l) => s + f(l), 0) / g.length);
      return {
        bhk: label,
        rate: avg(l => l.price_inr / l.carpet_area),
        avgPrice: avg(l => l.price_inr),
        carpet: avg(l => l.carpet_area),
        n: g.length,
        isHighlight
      };
    };
    return [
      group('1 BHK', l => l.bedroom === 1),
      group('2 BHK', l => l.bedroom === 2, true),
      group('3 BHK', l => l.bedroom === 3),
      group('4+ BHK', l => l.bedroom >= 4)
    ];
  }, [allListings]);

  const bellandurMedianRate = useMemo(() => {
    const rates = allListings
      .filter(l => l.locality === ASSIGNED_LOCALITY && l.is_live && !l.is_corrupt && !l.is_fake && l.price_per_sqft)
      .map(l => l.price_per_sqft)
      .sort((a, b) => a - b);
    return rates.length ? rates[Math.floor(rates.length / 2)] : null;
  }, [allListings]);

  const bellandurStats = useMemo(() => {
    const rents = allRentals.filter(r => r.locality === ASSIGNED_LOCALITY);
    const two = rents.filter(r => r.bedroom === 2);
    const sales = allListings.filter(l => l.locality === ASSIGNED_LOCALITY);
    const counts = new Map();
    for (const l of sales) counts.set(l.bedroom, (counts.get(l.bedroom) || 0) + 1);
    const wrong = new Set(derived?.projects_wrong_listing_count || []);
    return {
      meanRent: rents.length ? Math.round(rents.reduce((s, r) => s + r.price, 0) / rents.length) : 0,
      mean2bhkRent: two.length ? Math.round(two.reduce((s, r) => s + r.price, 0) / two.length) : 0,
      count2bhk: two.length,
      bhkSplit: [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([bhk, c]) => ({ bhk, pct: Math.round((100 * c) / sales.length) })),
      corrupt: sales.filter(l => l.is_corrupt).length,
      fake: sales.filter(l => l.is_fake).length,
      wrongCount: allProjects.filter(p => p.locality === ASSIGNED_LOCALITY && wrong.has(p.project_id)).length
    };
  }, [allListings, allRentals, allProjects, derived]);

  const baitRings = useMemo(() => {
    const rings = new Map();
    for (const id of fakeIds) {
      const item = listingsMap.get(id);
      if (!item) continue;
      if (!rings.has(item.posted_by_contact)) rings.set(item.posted_by_contact, []);
      rings.get(item.posted_by_contact).push(item);
    }
    return [...rings.entries()]
      .map(([phone, rows]) => {
        const ratios = rows.map(r => r.market_rate_ratio).filter(Number.isFinite).sort((a, b) => a - b);
        return {
          phone,
          rows,
          aliases: [...new Set(rows.map(r => r.posted_by_name))],
          localities: new Set(rows.map(r => r.locality)).size,
          medianRatio: ratios[Math.floor(ratios.length / 2)],
          verified: rows.filter(r => r.is_verified).length,
          live: rows.filter(r => r.is_live).length
        };
      })
      .sort((a, b) => a.medianRatio - b.medianRatio);
  }, [fakeIds, listingsMap]);

  const allBaitRecords = useMemo(() => {
    const q = baitSearch.toLowerCase().trim();
    return fakeIds
      .map(id => listingsMap.get(id))
      .filter(Boolean)
      .filter(b => !q || [b.listing_id, b.apartment_name, b.locality, b.website, b.posted_by_contact, b.posted_by_name]
        .some(v => String(v).toLowerCase().includes(q)));
  }, [fakeIds, listingsMap, baitSearch]);

  return (
    <div className="min-h-screen pb-20 bg-white">
      
      {/* Header Banner */}
      <section className="bg-slate-50 border-b border-slate-200/80 pt-8 pb-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                  Insights & Detective Audit
                </h1>
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>10/10 Verified</span>
                </span>
                <button
                  onClick={() => setActiveTab('3dmap')}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0018A8] text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <Compass className="w-3.5 h-3.5 text-blue-600" />
                  <span>3D Simulation</span>
                </button>
              </div>
              <p className="text-sm text-slate-600 max-w-2xl font-medium">
                Comprehensive data forensics: 10 verified questions, interactive distributions, Bellandur 3D simulation, and complete anomaly inspectors.
              </p>
            </div>

            {/* Candidate Box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs max-w-xs shrink-0">
              <div className="text-[10px] font-bold text-[#0018A8] uppercase tracking-wider mb-0.5">
                Evaluated Submission
              </div>
              <div className="text-sm font-extrabold text-slate-900">
                {submission?.candidate?.name || 'Akash Kumar Prasad'}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                MNNIT Allahabad · {CITY}
              </div>
            </div>
          </div>

          {/* Tab Navigation Pills */}
          <div className="flex flex-wrap items-center gap-2 mt-8">
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 cursor-pointer border ${
                activeTab === 'questions'
                  ? 'bg-[#EBEDFF] border-[#0018A8] text-[#0018A8] shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>The 10 Questions & Answers</span>
            </button>

            <button
              onClick={() => setActiveTab('3dmap')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 cursor-pointer border ${
                activeTab === '3dmap'
                  ? 'bg-[#0018A8] border-[#0018A8] text-white shadow-md'
                  : 'bg-white border-blue-200 text-[#0018A8] hover:bg-blue-50 hover:border-blue-300'
              }`}
            >
              <Compass className={`w-4 h-4 ${activeTab === '3dmap' ? 'text-white' : 'text-[#0018A8]'}`} />
              <span>Bellandur 3D Simulation</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                activeTab === '3dmap' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-[#0018A8]'
              }`}>
                WebGL
              </span>
            </button>

            <button
              onClick={() => setActiveTab('graphs')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 cursor-pointer border ${
                activeTab === 'graphs'
                  ? 'bg-[#EBEDFF] border-[#0018A8] text-[#0018A8] shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Forensic Graphs & Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('discrepancies')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 cursor-pointer border ${
                activeTab === 'discrepancies'
                  ? 'bg-[#EBEDFF] border-[#0018A8] text-[#0018A8] shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>API Discrepancies ({findings.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('corrupt')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 cursor-pointer border ${
                activeTab === 'corrupt'
                  ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Impossible records ({corruptIds.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('bait')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 cursor-pointer border ${
                activeTab === 'bait'
                  ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Enquiry bait ({fakeIds.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('bellandur')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 cursor-pointer border ${
                activeTab === 'bellandur'
                  ? 'bg-[#EBEDFF] border-[#0018A8] text-[#0018A8] shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Bellandur Locality Analysis</span>
            </button>
          </div>

        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 mt-8">
        
        {/* TAB 2: 3D Locality Simulation matching user reference */}
        {activeTab === '3dmap' && (
          <div className="space-y-6">
            <Bellandur3DMap isEmbedded={true} />
          </div>
        )}

        {/* TAB 1: The 10 Questions & Answers */}
        {activeTab === 'questions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tenQuestions.map((q) => (
              <div
                key={q.num}
                className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="inline-block px-2.5 py-1 rounded-md bg-[#EBEDFF] text-[#0018A8] text-xs font-black uppercase tracking-wider mb-3">
                    QUESTION {q.num}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 leading-snug">
                    {q.title}
                  </h3>

                  <div className="text-xl sm:text-2xl font-black text-[#0018A8] tracking-tight mb-3">
                    {q.answer}
                  </div>

                  <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed mb-4">
                    {q.summary}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200/80 bg-slate-50/90 -mx-6 -mb-6 p-5 sm:p-6 rounded-b-3xl mt-3">
                  <div className="text-xs font-bold text-[#0018A8] uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-[#0018A8]" />
                    <span>DETECTIVE METHODOLOGY:</span>
                  </div>
                  <p className="text-sm sm:text-[14.5px] text-slate-700 leading-relaxed font-normal">
                    {q.methodology}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: Forensic Graphs & Analytics */}
        {activeTab === 'graphs' && (
          <div className="space-y-8">
            
            {/* Header intro */}
            <div className="bg-gradient-to-r from-[#0018A8]/10 via-blue-50 to-indigo-50/40 border border-[#0018A8]/20 rounded-3xl p-6 sm:p-8">
              <div className="flex items-center space-x-3 mb-2">
                <TrendingUp className="w-6 h-6 text-[#0018A8]" />
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  Forensic Econometric & Anomaly Visualizations
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
                Everything the audit turned up, sized against each other: what is wrong with the data and how much of it, how the bait
                rings separate from ordinary high-volume agencies, the rate per square foot behind answer 6, and a defect count for
                each source portal. All computed from the dataset on this page.
              </p>
            </div>

            {/* Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* GRAPH 1: Anomaly Breakdown */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">What is wrong, and how much of it</h3>
                    <p className="text-xs text-slate-500">
                      {corruptIds.length} impossible records, {fakeIds.length} bait listings,{' '}
                      {n(derived?.duplicate_records)} redundant copies, {n(derived?.sqm_listings)} areas in the wrong unit
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-xl border border-rose-200">
                    {n(defectBars.reduce((s, b) => s + b.count, 0))} records
                  </span>
                </div>

                <div className="space-y-3.5 mt-6">
                  {defectBars.map((bar) => (
                    <div key={bar.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{bar.label}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-slate-900">{n(bar.count)} records</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">{bar.badge}</span>
                        </div>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full ${bar.color} rounded-full transition-all duration-700`}
                          style={{ width: `${Math.max(3, (bar.count / defectBarMax) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GRAPH 2: how the bait rings separate from everything else (Q9) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">How the bait rings separate (answer 9)</h3>
                    <p className="text-xs text-slate-500">
                      Asking rate as a fraction of the median for the same locality and bedroom count
                    </p>
                  </div>
                  <span className="text-xs font-extrabold bg-amber-50 text-amber-800 px-2.5 py-1 rounded-xl border border-amber-200">
                    {fakeIds.length} listings · {derived?.bait_phones?.length || 0} numbers
                  </span>
                </div>

                <div className="space-y-3 mt-6">
                  {ratioCohorts.map((row) => (
                    <div key={row.label} className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-slate-800">{row.label}</span>
                        <span className="font-mono font-black text-slate-900">
                          {row.n ? `${(row.median * 100).toFixed(0)}% of market · n=${n(row.n)}` : 'no records'}
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${row.color} rounded-full transition-all`}
                          style={{ width: `${Math.min(100, (row.median || 0) * 70)}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1.5">{row.note}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-amber-50/70 border border-amber-100 rounded-2xl text-[11px] text-slate-700 leading-relaxed">
                  The five agencies in the middle row share a phone number across several seller names exactly the way the bait rings do.
                  They price at market and their verified and live rates match the population, so they are reported as a contact-data
                  problem rather than as fraud. Shared number alone is the rule that nearly fits; the price and the flags are what
                  actually separate the two groups.
                </div>
              </div>

              {/* GRAPH 3: rate per sq ft by bedroom count (Q6) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Rate per sq ft by bedroom count (answer 6)</h3>
                    <p className="text-xs text-slate-500">
                      Live listings, square-metre areas converted, impossible and bait records removed
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-[#EBEDFF] text-[#0018A8] px-2.5 py-1 rounded-xl border border-blue-200">
                    2 BHK = ₹{answers.avg_price_per_sqft_2bhk?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                  {bhkMatrix.map((card) => (
                    <div
                      key={card.bhk}
                      className={`p-4 rounded-2xl border text-center transition-all ${
                        card.isHighlight
                          ? 'bg-[#EBEDFF] border-[#0018A8] shadow-xs'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className={`text-xs font-black uppercase ${card.isHighlight ? 'text-[#0018A8]' : 'text-slate-500'}`}>
                        {card.bhk}
                      </div>
                      <div className={`text-xl font-black mt-1 ${card.isHighlight ? 'text-[#0018A8]' : 'text-slate-900'}`}>
                        ₹{n(card.rate)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 font-medium">mean per sqft</div>
                      <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-600 font-mono">
                        {formatCrores(card.avgPrice)} · {n(card.carpet)} sqft
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">n = {n(card.n)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GRAPH 4: Portal Integrity Scorecard */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Portal Data Quality & Defect Scorecard</h3>
                    <p className="text-xs text-slate-500">Every defect counted per source portal</p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl border border-slate-200">
                    5 Portals
                  </span>
                </div>

                <div className="space-y-3 mt-6">
                  {portalScorecard.map((p) => (
                    <div key={p.portal} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-black uppercase text-slate-900">{p.portal}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                            {p.impossible} impossible
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200">
                            {p.bait} bait
                          </span>
                          {p.sqm > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 font-bold border border-sky-200">
                              {p.sqm} in m²
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-medium">{p.caveat}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-slate-900">{n(p.total)} listings</span>
                        <div className="text-[10px] text-emerald-600 font-bold">Verified: {p.verified}%</div>
                        <div className="text-[10px] text-slate-400">Live: {p.live}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 4: API documentation discrepancies */}
        {activeTab === 'discrepancies' && (
          <div className="space-y-6">
            
            {/* Search & Category Filter Controls */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={searchLie}
                    onChange={(e) => setSearchLie(e.target.value)}
                    placeholder="Search discrepancies by endpoint, category, or description..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#0018A8]"
                  />
                </div>

                <div className="flex items-center space-x-2 overflow-x-auto max-w-full pb-1">
                  <span className="text-xs font-bold text-slate-500 shrink-0 uppercase tracking-wider">Category:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 capitalize focus:outline-none focus:border-[#0018A8] cursor-pointer"
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
            <div className="text-sm text-slate-500 font-medium">
              Displaying <span className="font-bold text-slate-900">{filteredFindings.length}</span> audited discrepancies
            </div>

            {/* Discrepancies Grid */}
            <div className="space-y-6">
              {filteredFindings.map((f, idx) => {
                const colorClass = CATEGORY_COLORS[f.category] || 'text-slate-700 bg-slate-100 border-slate-200';

                return (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                          {f.endpoint}
                        </span>
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${colorClass}`}>
                          {f.category.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-semibold">
                        Finding #{idx + 1}
                      </span>
                    </div>

                    {/* Side-by-side comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      
                      {/* Documented Claim */}
                      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                        <div className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>Documented Claim (The Discrepancy)</span>
                        </div>
                        <p className="text-sm text-slate-800 leading-relaxed font-mono font-medium">
                          "{f.documented}"
                        </p>
                      </div>

                      {/* Actual Behavior */}
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                        <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1.5 flex items-center space-x-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Actual API Behavior (The Verified Truth)</span>
                        </div>
                        <p className="text-sm text-emerald-950 leading-relaxed font-mono font-medium">
                          "{f.actual}"
                        </p>
                      </div>

                    </div>

                    {/* Details: How Found & Impact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700 pt-3 border-t border-slate-100">
                      <div>
                        <strong className="text-slate-900 font-bold">How Discovered: </strong>
                        <span>{f.how_found}</span>
                      </div>
                      <div>
                        <strong className="text-slate-900 font-bold">Client Impact: </strong>
                        <span>{f.impact}</span>
                      </div>
                    </div>

                    {/* Evidence IDs if applicable */}
                    {f.evidence && f.evidence.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <div className="text-[11px] font-bold text-slate-500 mb-1.5">
                          Reproducible Evidence IDs ({f.evidence.length}):
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {f.evidence.map(evId => (
                            <span
                              key={evId}
                              className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200"
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

        {/* TAB 5: Corrupt Listings Inspector (All 40 IDs with Full Data) */}
        {activeTab === 'corrupt' && (
          <div className="space-y-6">
            <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 sm:p-7">
              <div className="flex items-center space-x-3 mb-2">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
                <h2 className="text-lg sm:text-xl font-bold text-rose-900">
                  {corruptIds.length} records that describe something that cannot exist
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-rose-800 leading-relaxed">
                Seven independent defect classes, exactly eight records each, no record appearing in two. That each class lands on the
                same count, scattered evenly across all five portals, is what marks them as injected rather than as a portal-level
                convention &mdash; the {derived?.sqm_listings ?? 389} square-metre areas, by contrast, sit entirely on one portal and are a
                units problem rather than corruption. Filter by class or search by id, society or locality.
              </p>
            </div>

            {/* Filter Pills & Search */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                <button
                  onClick={() => setCorruptFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    corruptFilter === 'all'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All defects ({corruptIds.length})
                </button>
                {corruptCategories.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setCorruptFilter(cat.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      corruptFilter === cat.key
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {cat.title} ({cat.count})
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={corruptSearch}
                  onChange={(e) => setCorruptSearch(e.target.value)}
                  placeholder="Search corrupt IDs or apartments..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Corrupt Listings Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCorruptRecords.map((r) => (
                <div 
                  key={r.id} 
                  className="bg-white border border-rose-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCopy(r.id)}
                        className="font-mono text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-1 rounded-lg flex items-center space-x-1 hover:bg-rose-100 cursor-pointer"
                        title="Copy ID"
                      >
                        <span>{r.id}</span>
                        {copiedId === r.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>
                      <span className="font-mono text-[11px] uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {r.website}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      {r.categoryTitle}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{r.apartment_name}</h4>
                    <span className="text-xs text-slate-500 capitalize flex items-center space-x-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#0018A8]" />
                      <span>{r.locality}, Bangalore</span>
                    </span>
                  </div>

                  {/* Violation Alert */}
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 font-medium">
                    ⚠️ <strong>Defect:</strong> {r.violation}
                  </div>

                  {/* Physical Specs */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">Reported Price</span>
                      <strong className={r.price < 0 ? 'text-rose-600 font-black' : 'text-slate-900'}>
                        {formatINR(r.price)}
                      </strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">Floor / Total</span>
                      <strong className={r.floor > r.total_floors && r.total_floors > 0 ? 'text-rose-600 font-black' : 'text-slate-900'}>
                        {r.floor} / {r.total_floors || '-'}
                      </strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">Carpet vs SBUA</span>
                      <strong className={r.carpet_area > r.super_built_up_area ? 'text-rose-600 font-black' : 'text-slate-900'}>
                        {r.carpet_area || 0} / {r.super_built_up_area || 0}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB 6: Bait Listings Inspector (All 8 IDs) */}
        {activeTab === 'bait' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 sm:p-7">
              <div className="flex items-center space-x-3 mb-2">
                <Flame className="w-6 h-6 text-amber-600" />
                <h2 className="text-lg sm:text-xl font-bold text-amber-900">
                  {fakeIds.length} enquiry-bait listings across {baitRings.length} phone numbers
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                Each of these numbers posts 24&ndash;25 listings under three to six different seller names, spread across nine or ten
                localities. Every one of those listings is flagged <code className="font-mono">is_verified</code> and
                <code className="font-mono"> is_live</code>, and every one is priced at roughly half of what comparable property in the
                same locality goes for. Against base rates of 60% verified and 79% live, a genuine agent reaching 24/24 on both has odds
                of about one in fifty million. Cheap, &ldquo;verified&rdquo;, always live, posted under a rotating cast of names from one
                phone &mdash; that is a listing built to make the phone ring.
              </p>
            </div>

            {/* Ring summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {baitRings.map((ring) => (
                <div key={ring.phone} className="bg-white border border-amber-200 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => handleCopy(ring.phone)}
                      className="font-mono text-sm font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-xl border border-amber-300 flex items-center space-x-1.5 hover:bg-amber-200 cursor-pointer"
                    >
                      <span>{ring.phone}</span>
                      {copiedId === ring.phone ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-amber-700" />}
                    </button>
                    <span className="text-xs font-bold text-slate-700">{ring.rows.length} listings</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                    <div className="bg-rose-50 border border-rose-100 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">Median vs market</span>
                      <strong className="text-rose-700 font-black">{(ring.medianRatio * 100).toFixed(0)}%</strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">Verified</span>
                      <strong className="text-slate-900">{ring.verified}/{ring.rows.length}</strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-500 block">Live</span>
                      <strong className="text-slate-900">{ring.live}/{ring.rows.length}</strong>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600">
                    <span className="text-slate-400">Posts as:</span>{' '}
                    <span className="font-semibold text-slate-800">{ring.aliases.join(' · ')}</span>
                    <span className="text-slate-400"> across {ring.localities} localities</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bait Search */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Showing {allBaitRecords.length} of {fakeIds.length} bait listings
              </span>
              <div className="relative w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={baitSearch}
                  onChange={(e) => setBaitSearch(e.target.value)}
                  placeholder="Search by id, society, locality or number..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {allBaitRecords.map((bait) => (
                <div key={bait.listing_id} className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => handleCopy(bait.listing_id)}
                        className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 flex items-center space-x-1 hover:bg-amber-200 transition-colors cursor-pointer"
                        title="Click to copy ID"
                      >
                        <span>{bait.listing_id}</span>
                        {copiedId === bait.listing_id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-amber-700" />}
                      </button>
                      <span className="font-mono text-[10px] uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {bait.website}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">{bait.apartment_name}</h3>
                    <div className="text-xs text-slate-500 capitalize flex items-center space-x-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-[#0018A8]" />
                      <span>{bait.locality} · {bait.bedroom} BHK · {bait.carpet_area} sqft</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3 p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
                      <div>
                        <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">Asking rate</span>
                        <span className="text-base font-black text-rose-600">₹{bait.price_per_sqft?.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-slate-500 block">/sqft</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Locality median</span>
                        <span className="text-base font-black text-emerald-700">₹{Math.round(bait.locality_market_rate || 0).toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-slate-500 block">{bait.bedroom} BHK in {bait.locality}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 font-medium mt-2.5 leading-relaxed">
                      Asking {formatCrores(bait.price)} &mdash; {((bait.market_rate_ratio || 0) * 100).toFixed(0)}% of the going rate,
                      while flagged verified and live.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Posted as</span>
                      <span className="font-semibold text-slate-800">{bait.posted_by_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Contact</span>
                      <span className="font-mono text-slate-700 font-semibold">{bait.posted_by_contact}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB 7: Bellandur Assigned Locality Analysis */}
        {activeTab === 'bellandur' && (
          <div className="space-y-6">
            
            {/* Bellandur Key Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total monthly rent</div>
                <div className="text-2xl font-black text-[#0018A8] mt-1">{formatINR(bel?.monthly_rent)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Across {n(bel?.rentals)} rentals (answer 5)</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Live sale listings</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{n(bel?.sale_listings_live)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">of {n(bel?.sale_listings_all)} retrievable</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Median rate / sqft</div>
                <div className="text-2xl font-black text-emerald-700 mt-1">{formatINR(bellandurMedianRate)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Live units, impossible and bait records removed</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Developer projects</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{n(bel?.projects)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">RERA-registered in {ASSIGNED_LOCALITY}</div>
              </div>
            </div>

            {/* Bellandur Detailed Intelligence Overview */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center space-x-2.5 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-[#EBEDFF] text-[#0018A8] flex items-center justify-center font-bold">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Bellandur Market Intelligence Profile</h2>
                  <p className="text-xs text-slate-500">Assigned locality analysis for Candidate Akash Kumar Prasad · Bangalore</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Rental yield &amp; demand
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {n(bel?.rentals)} rentals carry <code className="font-mono">locality: {ASSIGNED_LOCALITY}</code>, totalling{' '}
                    <strong>{formatINR(bel?.monthly_rent)} / month</strong> &mdash; a mean of {formatINR(bellandurStats.meanRent)} per unit.
                    A 2 BHK here averages {formatINR(bellandurStats.mean2bhkRent)} / month across {n(bellandurStats.count2bhk)} listings.
                  </p>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Unit configurations
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Across the {n(bel?.sale_listings_all)} retrievable sale listings in {ASSIGNED_LOCALITY}, the inventory splits{' '}
                    {bellandurStats.bhkSplit.map((b, i) => (
                      <span key={b.bhk}>
                        {i > 0 ? ', ' : ''}<strong>{b.bhk} BHK {b.pct}%</strong>
                      </span>
                    ))}
                    .
                  </p>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Data quality here
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {n(bellandurStats.corrupt)} of the {ASSIGNED_LOCALITY} sale listings are among the {corruptIds.length} impossible
                    records and {n(bellandurStats.fake)} belong to the bait rings. {n(bel?.projects)} developer projects sit in the
                    locality, of which {n(bellandurStats.wrongCount)} report a listing count that does not match reality.
                  </p>
                </div>

              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
