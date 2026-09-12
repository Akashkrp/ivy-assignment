import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Heart, MapPin, Building2, Building, BedDouble, Bath, 
  Maximize2, Compass, Layers, Car, ShieldCheck, ShieldAlert,
  Phone, User, Calendar, ExternalLink, Flame, CheckCircle2, AlertTriangle, Armchair
} from 'lucide-react';
import { API, formatCrores, formatINR } from '../services/api';
import ListingCard from '../components/ListingCard';

export default function ListingDetailView({ savedListings = [], onToggleSave }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const all = await API.fetchListings();
      const match = all.find((l) => l.listing_id === id);
      setListing(match || null);

      if (match) {
        // Compute comparable listings client-side (since /v1/listings/{id}/similar is 404 missing endpoint)
        const comps = all
          .filter((l) => 
            l.listing_id !== match.listing_id &&
            l.locality?.toLowerCase() === match.locality?.toLowerCase() &&
            l.bedroom === match.bedroom &&
            !l.is_corrupt &&
            !l.is_fake &&
            Math.abs(l.price - match.price) / (match.price || 1) <= 0.25
          )
          .slice(0, 4);
        setSimilar(comps);
      }
      setLoading(false);
    }
    load();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-sm text-slate-400">Loading listing details...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-white">Listing Not Found</h2>
        <p className="mt-2 text-sm text-slate-400">No property matches ID "{id}".</p>
        <Link 
          to="/"
          className="inline-flex items-center space-x-2 mt-6 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-emerald-400 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Browse Listings</span>
        </Link>
      </div>
    );
  }

  const isSaved = savedListings.includes(listing.listing_id);

  return (
    <div className="min-h-screen pb-20">
      
      {/* Top Navigation Bar */}
      <div className="bg-slate-950/80 border-b border-slate-800/80 sticky top-16 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Listings</span>
          </button>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-500 font-mono">ID: {listing.listing_id}</span>
            <button
              onClick={() => onToggleSave?.(listing.listing_id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isSaved 
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/20' 
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current text-rose-500' : ''}`} />
              <span>{isSaved ? 'Saved' : 'Save Property'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Anomaly Banner if Corrupt or Fake */}
        {(listing.is_corrupt || listing.is_fake) && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-rose-300">
                Data Anomaly Detected on this Record
              </div>
              <p className="text-xs text-rose-200/80 mt-1 leading-relaxed">
                {listing.price < 0 && `• Physically impossible negative price: ${formatINR(listing.price)}.`}
                {listing.floor > listing.total_floors && `• Floor (${listing.floor}) exceeds building's total floors (${listing.total_floors}).`}
                {listing.carpet_area > listing.super_built_up_area && `• Carpet area (${listing.carpet_area} sqft) exceeds super built-up area (${listing.super_built_up_area} sqft).`}
                {listing.latitude > 50 && `• Swapped coordinates: Latitude (${listing.latitude}) and Longitude (${listing.longitude}) are inverted.`}
                {listing.bedroom <= 0 && listing.property_type !== 'plot' && `• Impossible configuration: 0 bedrooms and 0 bathrooms recorded for a residential apartment.`}
                {listing.is_fake && `• Fraudulent Enquiry Bait: Artificially minuscule sale price (${formatINR(listing.price)}) posted solely to attract leads.`}
              </p>
            </div>
          </div>
        )}

        {/* Hero Section: Title, Locality & Pricing */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Details (2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header Box */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                  {listing.property_type || 'Apartment'}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {listing.website} portal
                </span>
                {listing.is_verified && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified Listing</span>
                  </span>
                )}
                {!listing.is_live && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    Off-Market
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {listing.bedroom ? `${listing.bedroom} BHK ` : ''}
                {listing.apartment_name}
              </h1>

              <div className="flex items-center space-x-2 text-sm text-slate-400 mt-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="capitalize font-semibold text-slate-200">{listing.locality}</span>
                <span>·</span>
                <span>Bangalore, Karnataka</span>
              </div>

              {/* Price Highlight */}
              <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-wrap items-baseline justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    Offered Price
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                    {listing.price < 0 ? (
                      <span className="text-rose-400">{formatINR(listing.price)} (Negative)</span>
                    ) : (
                      formatCrores(listing.price)
                    )}
                  </div>
                  {listing.price > 0 && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      Exact: {formatINR(listing.price)}
                    </div>
                  )}
                </div>

                {listing.price_per_sqft && (
                  <div className="text-right">
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      Rate Per Sqft
                    </div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">
                      ₹{listing.price_per_sqft.toLocaleString('en-IN')}
                      <span className="text-xs text-slate-400 font-normal"> / sqft</span>
                    </div>
                    {listing.is_area_converted && (
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Area converted from m² ({listing.raw_carpet_area} m² → {listing.carpet_area} sqft)
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Architectural & Structural Specifications */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <span>Property Specifications</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                    <BedDouble className="w-4 h-4 text-emerald-400" />
                    <span>Bedrooms</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {listing.bedroom ?? 'N/A'} BHK
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                    <Bath className="w-4 h-4 text-emerald-400" />
                    <span>Bathrooms</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {listing.bathroom ?? 'N/A'} Baths
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                    <Maximize2 className="w-4 h-4 text-emerald-400" />
                    <span>Carpet Area</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {listing.carpet_area ? `${listing.carpet_area} sqft` : 'N/A'}
                  </div>
                  {listing.is_area_converted && (
                    <span className="text-[10px] text-emerald-400">Converted from {listing.raw_carpet_area} m²</span>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                    <Maximize2 className="w-4 h-4 text-cyan-400" />
                    <span>Super Built-up</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {listing.super_built_up_area ? `${listing.super_built_up_area} sqft` : 'N/A'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                    <Building2 className="w-4 h-4 text-purple-400" />
                    <span>Floor Level</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    Floor {listing.floor ?? 0} of {listing.total_floors ?? 0}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                    <Compass className="w-4 h-4 text-amber-400" />
                    <span>Facing Direction</span>
                  </div>
                  <div className="text-lg font-bold text-white capitalize">
                    {listing.facing_direction || 'East'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                    <Car className="w-4 h-4 text-emerald-400" />
                    <span>Covered Parking</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {listing.covered_parking ? `${listing.covered_parking} Slots` : 'None'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                    <Armchair className="w-4 h-4 text-teal-400" />
                    <span>Furnishing</span>
                  </div>
                  <div className="text-lg font-bold text-white capitalize">
                    {listing.furnishing || 'Unfurnished'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>Posted Date</span>
                  </div>
                  <div className="text-sm font-bold text-white">
                    {listing.posted_at ? listing.posted_at.slice(0, 10) : 'N/A'}
                  </div>
                </div>

              </div>
            </div>

            {/* Description */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-3">Seller's Description</h2>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
                {listing.description || 'No detailed seller description provided.'}
              </p>
            </div>

          </div>

          {/* Sidebar (Seller Contact & Metadata) */}
          <div className="space-y-6">
            
            {/* Contact Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
                <User className="w-4 h-4 text-emerald-400" />
                <span>Seller Information</span>
              </h3>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">Contact Name</div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">
                    {listing.posted_by_name || 'Agent / Owner'}
                  </div>
                  <div className="text-xs text-emerald-400 capitalize font-medium">
                    Posted as {listing.posted_by || 'Owner'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">Phone Number</div>
                  <div className="text-sm font-mono font-bold text-white mt-0.5 flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{listing.posted_by_contact || '+91 200 0000000'}</span>
                  </div>
                </div>

                {listing.listing_url && (
                  <a
                    href={listing.listing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-xs font-bold transition-colors"
                  >
                    <span>View On {listing.website}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Geographical Coordinates */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-white mb-3 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Geographic Location</span>
              </h3>
              
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono space-y-1">
                <div>Latitude: {listing.latitude}</div>
                <div>Longitude: {listing.longitude}</div>
                <div className="text-[10px] text-slate-500 pt-1">
                  City ID: {listing.city_id} (Bangalore, KA)
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Comparable / Similar Listings Section */}
        {similar.length > 0 && (
          <div className="mt-16 pt-10 border-t border-slate-800/80">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Comparable Properties in {listing.locality}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Client-computed matching bedroom count ({listing.bedroom} BHK) and price within 25% (compensating for missing /similar endpoint).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {similar.map((comp) => (
                <ListingCard
                  key={comp.listing_id}
                  listing={comp}
                  isSaved={savedListings.includes(comp.listing_id)}
                  onToggleSave={onToggleSave}
                />
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
