import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Heart, MapPin, Building2, BedDouble, Bath, 
  Maximize2, Compass, Layers, Car, ShieldCheck, ShieldAlert,
  Calendar, ExternalLink, CheckCircle2, AlertTriangle, Armchair
} from 'lucide-react';
import { API, formatCrores, formatINR } from '../services/api';
import ListingCard from '../components/ListingCard';
import AuthGate from '../components/AuthGate';

export default function ListingDetailView({ user, onOpenLogin, savedListings = [], onToggleSave }) {
  const { id } = useParams();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen pb-20 pt-8">
        <AuthGate
          title="Verified Property Record Locked"
          subtitle="Bangalore Real Estate Intelligence"
          description="Sign in with an Ivy Homes demo account to view verified pricing, carpet area details, seller contacts, and comparable unit valuations."
          icon={Building2}
          onOpenLogin={onOpenLogin}
        />
      </div>
    );
  }

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
        <div className="inline-block w-8 h-8 border-4 border-[#0018A8] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-sm text-slate-500">Loading property record...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-slate-900">Listing Not Found</h2>
        <p className="mt-2 text-sm text-slate-500">No property matches ID "{id}".</p>
        <Link 
          to="/"
          className="inline-flex items-center space-x-2 mt-6 px-5 py-2.5 rounded-xl bg-[#0018A8] text-white text-sm font-bold shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Browse Listings</span>
        </Link>
      </div>
    );
  }

  const isSaved = savedListings.includes(listing.listing_id);

  return (
    <div className="min-h-screen pb-20 bg-white">
      
      {/* Top Navigation Bar */}
      <div className="bg-white/95 border-b border-slate-200 sticky top-16 z-30 backdrop-blur-md shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#0018A8]" />
            <span>Back to Listings</span>
          </button>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-500 font-mono">ID: {listing.listing_id}</span>
            <button
              onClick={() => onToggleSave?.(listing.listing_id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isSaved 
                  ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-2xs' 
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current text-rose-500' : 'text-slate-400'}`} />
              <span>{isSaved ? 'Saved' : 'Save Property'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Anomaly Banner if Corrupt or Fake */}
        {(listing.is_corrupt || listing.is_fake) && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-rose-800">
                Data Anomaly Detected on this Record
              </div>
              <p className="text-xs text-rose-700 mt-1 leading-relaxed">
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
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  {listing.property_type || 'Apartment'}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  {listing.website} portal
                </span>
                {listing.is_verified && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EBEDFF] text-[#0018A8] border border-[#d2d7ff] flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified Listing</span>
                  </span>
                )}
                {!listing.is_live && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                    Off-Market
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {listing.bedroom ? `${listing.bedroom} BHK ` : ''}
                {listing.apartment_name}
              </h1>

              <div className="flex items-center space-x-2 text-sm text-slate-500 mt-2 font-medium">
                <MapPin className="w-4 h-4 text-[#0018A8] shrink-0" />
                <span className="capitalize font-bold text-slate-800">{listing.locality}</span>
                <span>·</span>
                <span>Bangalore, Karnataka</span>
              </div>

              {/* Price Highlight */}
              <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-baseline justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    Offered Price
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
                    {listing.price < 0 ? (
                      <span className="text-rose-600">{formatINR(listing.price)} (Negative)</span>
                    ) : (
                      formatCrores(listing.price)
                    )}
                  </div>
                  {listing.price > 0 && (
                    <div className="text-xs text-slate-500 font-semibold mt-0.5">
                      Exact: {formatINR(listing.price)}
                    </div>
                  )}
                </div>

                {listing.price_per_sqft && (
                  <div className="text-right">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                      Rate Per Sqft
                    </div>
                    <div className="text-2xl font-black text-[#0018A8] mt-1">
                      ₹{listing.price_per_sqft.toLocaleString('en-IN')}
                      <span className="text-xs text-slate-500 font-normal"> / sqft</span>
                    </div>
                    {listing.is_area_converted && (
                      <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                        Area converted from m² ({listing.raw_carpet_area} m² → {listing.carpet_area} sqft)
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Architectural & Structural Specifications */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center space-x-2">
                <Layers className="w-5 h-5 text-[#0018A8]" />
                <span>Property Specifications</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium mb-1">
                    <BedDouble className="w-4 h-4 text-[#0018A8]" />
                    <span>Bedrooms</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {listing.bedroom ?? 'N/A'} BHK
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium mb-1">
                    <Bath className="w-4 h-4 text-[#0018A8]" />
                    <span>Bathrooms</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {listing.bathroom ?? 'N/A'} Baths
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium mb-1">
                    <Maximize2 className="w-4 h-4 text-[#0018A8]" />
                    <span>Carpet Area</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {listing.carpet_area ? `${listing.carpet_area} sqft` : 'N/A'}
                  </div>
                  {listing.is_area_converted && (
                    <span className="text-[10px] text-[#0018A8] font-semibold">Converted from {listing.raw_carpet_area} m²</span>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium mb-1">
                    <Maximize2 className="w-4 h-4 text-sky-600" />
                    <span>Super Built-up</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {listing.super_built_up_area ? `${listing.super_built_up_area} sqft` : 'N/A'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium mb-1">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span>Floor Level</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {listing.total_floors ? `Floor ${listing.floor ?? 0} of ${listing.total_floors}` : `Floor ${listing.floor ?? 0}`}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium mb-1">
                    <Compass className="w-4 h-4 text-amber-600" />
                    <span>Facing Direction</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 capitalize">
                    {listing.facing_direction || 'Not Specified'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium mb-1">
                    <Car className="w-4 h-4 text-emerald-600" />
                    <span>Covered Parking</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {listing.covered_parking ? `${listing.covered_parking} Slots` : 'None'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium mb-1">
                    <Armchair className="w-4 h-4 text-teal-600" />
                    <span>Furnishing</span>
                  </div>
                  <div className="text-lg font-bold text-slate-900 capitalize">
                    {listing.furnishing || 'Not Specified'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium mb-1">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Posted Date</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {listing.posted_at ? listing.posted_at.slice(0, 10) : 'N/A'}
                  </div>
                </div>

              </div>
            </div>

            {/* Description */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Property Overview & Details</h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {listing.description || 'No additional property overview description provided in dataset.'}
              </p>
            </div>

          </div>

          {/* Sidebar (Ivy Homes Direct Assurance & Verified Metadata) */}
          <div className="space-y-6">
            
            {/* Ivy Direct Purchase & Advisory Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-[#EBEDFF] text-[#0018A8] flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Ivy Homes Advisory</h3>
                  <div className="text-[11px] text-[#0018A8] font-bold">Direct Evaluation & Purchase</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Listing Reference:</span>
                    <span className="font-mono text-[#0018A8] font-bold">{listing.listing_id}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Transaction Model:</span>
                    <span className="text-emerald-700 font-bold">Direct / Zero Brokerage</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Verified Locality:</span>
                    <span className="text-slate-900 capitalize font-bold">{listing.locality}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#EBEDFF] border border-[#d2d7ff] text-xs text-slate-700 leading-relaxed space-y-1.5">
                  <div className="font-bold text-[#0018A8] flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#0018A8] shrink-0" />
                    <span>No Middlemen or Brokerage Calls</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Ivy Homes manages all property evaluations and transactions directly. We eliminate spam calls, fake intermediary brokers, and commission fees.
                  </p>
                </div>

                {listing.listing_url && (
                  <a
                    href={listing.listing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-colors"
                  >
                    <span>View Portal Source ({listing.website})</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Geographical Coordinates */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-[#0018A8]" />
                <span>Geographic Location</span>
              </h3>
              
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-mono space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Latitude:</span>
                  <span className="text-slate-900 font-bold">{listing.latitude}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Longitude:</span>
                  <span className="text-slate-900 font-bold">{listing.longitude}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-[11px] font-sans">
                  <span className="text-slate-500">Region:</span>
                  <span className="text-[#0018A8] capitalize font-bold">{listing.locality}, Bangalore</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Comparable / Similar Listings Section */}
        {similar.length > 0 && (
          <div className="mt-16 pt-10 border-t border-slate-200">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Comparable Properties in {listing.locality}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
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
