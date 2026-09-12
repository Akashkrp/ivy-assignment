import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, BedDouble, Bath, Maximize2, MapPin, 
  ShieldAlert, Flame, Sparkles, Building, Compass, ExternalLink 
} from 'lucide-react';
import { formatCrores, formatINR } from '../services/api';

// Deterministic property image gradients for high aesthetic presentation
const GRADIENTS = [
  'from-slate-900 via-indigo-950 to-slate-900',
  'from-slate-900 via-emerald-950 to-slate-900',
  'from-slate-900 via-teal-950 to-slate-900',
  'from-slate-900 via-cyan-950 to-slate-900',
  'from-slate-900 via-blue-950 to-slate-900',
];

const PORTAL_COLORS = {
  magichomes: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  '100acres': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  dwelling: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  squarelane: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  zerobroker: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
};

export default function ListingCard({ listing, isSaved, onToggleSave }) {
  const [saving, setSaving] = useState(false);

  const hash = Math.abs((listing.listing_id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  const gradient = GRADIENTS[hash % GRADIENTS.length];

  const handleSaveClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSaving(true);
    await onToggleSave?.(listing.listing_id);
    setSaving(false);
  };

  return (
    <div className="group relative bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-emerald-950/20 transition-all duration-300 flex flex-col">
      
      {/* Visual Header / Media Preview */}
      <Link to={`/listings/${listing.listing_id}`} className="block relative aspect-[16/10] overflow-hidden">
        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center relative p-6`}>
          {/* Subtle architectural grid / ambient glow */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          <div className="flex flex-col items-center justify-center text-center z-10">
            <Building className="w-10 h-10 text-slate-700 group-hover:text-emerald-400 group-hover:scale-110 transition-all duration-300 mb-2" />
            <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition-colors line-clamp-1">
              {listing.apartment_name || 'Prime Property'}
            </span>
            <span className="text-[10px] text-slate-500 capitalize">
              {listing.property_type || 'Apartment'}
            </span>
          </div>

          {/* Badges Overlay */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-20">
            {/* Website portal */}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${PORTAL_COLORS[listing.website] || 'text-slate-300 bg-slate-800'}`}>
              {listing.website}
            </span>

            {/* Inactive tag if not live */}
            {!listing.is_live && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800/90 text-slate-400 border border-slate-700">
                Off-Market
              </span>
            )}

            {/* Corrupt tag */}
            {listing.is_corrupt && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center space-x-1">
                <ShieldAlert className="w-3 h-3 text-rose-400" />
                <span>Corrupt Data</span>
              </span>
            )}

            {/* Fake tag */}
            {listing.is_fake && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
                <Flame className="w-3 h-3 text-amber-400" />
                <span>Enquiry Bait</span>
              </span>
            )}
          </div>

          {/* Save / Heart Button */}
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={saving}
            className={`absolute top-3 right-3 z-20 p-2.5 rounded-full backdrop-blur-md transition-all ${
              isSaved 
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 hover:bg-rose-600 scale-105' 
                : 'bg-slate-950/60 text-slate-300 hover:text-rose-400 hover:bg-slate-900 border border-slate-700/60'
            }`}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>

          {/* Price Overlay Bar */}
          <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex items-baseline justify-between z-10">
            <div>
              <div className="text-lg font-black text-white tracking-tight">
                {listing.price < 0 ? (
                  <span className="text-rose-400">{formatINR(listing.price)}</span>
                ) : (
                  formatCrores(listing.price)
                )}
              </div>
              {listing.price_per_sqft && (
                <div className="text-[11px] text-slate-400 font-medium">
                  ₹{listing.price_per_sqft.toLocaleString('en-IN')}/sqft
                </div>
              )}
            </div>
            
            {listing.is_area_converted && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono" title="Converted from square meters to square feet (x10.7639)">
                m² → ft²
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Property Details Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Locality & Apartment Title */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="capitalize font-semibold text-slate-300">{listing.locality}</span>
            <span>·</span>
            <span className="text-slate-500 truncate">{listing.city_id === 1 ? 'Bangalore' : 'City'}</span>
          </div>

          <Link to={`/listings/${listing.listing_id}`}>
            <h3 className="text-sm font-bold text-slate-100 hover:text-emerald-400 transition-colors line-clamp-1">
              {listing.bedroom ? `${listing.bedroom} BHK ` : ''}
              {listing.apartment_name || 'Residential Property'}
            </h3>
          </Link>

          {/* Key Specs Pills */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
            <div className="flex items-center space-x-1.5" title="Bedrooms">
              <BedDouble className="w-3.5 h-3.5 text-slate-500" />
              <span>{listing.bedroom ?? '-'} BHK</span>
            </div>
            
            <div className="flex items-center space-x-1.5" title="Bathrooms">
              <Bath className="w-3.5 h-3.5 text-slate-500" />
              <span>{listing.bathroom ?? '-'} Baths</span>
            </div>

            <div className="flex items-center space-x-1.5" title="Carpet Area in sqft">
              <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{listing.carpet_area ? `${listing.carpet_area} sqft` : '-'}</span>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/50">
          <div className="flex items-center space-x-1">
            <span className="capitalize text-slate-400">{listing.furnishing || 'Unfurnished'}</span>
            {listing.facing_direction && (
              <>
                <span>·</span>
                <span className="capitalize">{listing.facing_direction}</span>
              </>
            )}
          </div>

          <Link 
            to={`/listings/${listing.listing_id}`} 
            className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1 transition-colors"
          >
            <span>View</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

      </div>

    </div>
  );
}
