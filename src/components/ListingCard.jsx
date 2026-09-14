import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { 
  Heart, BedDouble, Bath, Maximize2, MapPin, 
  ShieldAlert, Building, ExternalLink, Sparkles 
} from 'lucide-react';
import { formatCrores, formatINR } from '../services/api';

const LIGHT_GRADIENTS = [
  'from-slate-100 via-blue-50/40 to-slate-50',
  'from-blue-50/60 via-slate-50 to-indigo-50/50',
  'from-slate-50 via-slate-100 to-sky-50/40',
  'from-indigo-50/40 via-slate-50 to-slate-100',
  'from-sky-50/40 via-blue-50/30 to-slate-100',
];

const PORTAL_COLORS = {
  magichomes: 'text-amber-700 bg-amber-50 border-amber-200/80',
  '100acres': 'text-emerald-700 bg-emerald-50 border-emerald-200/80',
  dwelling: 'text-sky-700 bg-sky-50 border-sky-200/80',
  squarelane: 'text-purple-700 bg-purple-50 border-purple-200/80',
  zerobroker: 'text-rose-700 bg-rose-50 border-rose-200/80'
};

export default function ListingCard({ listing, isSaved, onToggleSave }) {
  const [saving, setSaving] = useState(false);
  const cardRef = useRef(null);

  // 3D Tilt Values
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 280, damping: 22 });
  const springY = useSpring(y, { stiffness: 280, damping: 22 });

  const rotateX = useTransform(springY, [-0.5, 0.5], ['5deg', '-5deg']);
  const rotateY = useTransform(springX, [-0.5, 0.5], ['-5deg', '5deg']);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const hash = Math.abs((listing.listing_id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  const gradient = LIGHT_GRADIENTS[hash % LIGHT_GRADIENTS.length];

  const handleSaveClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSaving(true);
    await onToggleSave?.(listing.listing_id);
    setSaving(false);
  };

  return (
    <div className="perspective-[1000px]">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        whileHover={{ y: -5 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="group relative bg-white border border-slate-200 hover:border-[#0018A8]/40 rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_32px_-8px_rgba(0,24,168,0.12)] flex flex-col will-change-transform transition-all"
      >
        {/* Visual Media Preview */}
        <Link to={`/listings/${listing.listing_id}`} className="block relative aspect-[16/10] overflow-hidden border-b border-slate-100">
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center relative p-6 transition-transform duration-500 group-hover:scale-105`}>
            {/* Architectural Grid pattern */}
            <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px]"></div>
            
            <div 
              style={{ transform: 'translateZ(20px)' }}
              className="flex flex-col items-center justify-center text-center z-10"
            >
              <div className="w-12 h-12 rounded-2xl bg-white/90 shadow-sm flex items-center justify-center mb-2 group-hover:shadow-md transition-all">
                <Building className="w-6 h-6 text-slate-500 group-hover:text-[#0018A8] transition-colors" />
              </div>
              <span className="text-xs font-bold text-slate-800 group-hover:text-[#0018A8] transition-colors line-clamp-1">
                {listing.apartment_name || 'Verified Bangalore Residence'}
              </span>
              <span className="text-[10px] text-slate-500 capitalize font-medium">
                {listing.property_type || 'Apartment'} · {listing.locality}
              </span>
            </div>

            {/* Badges Overlay */}
            <div 
              style={{ transform: 'translateZ(25px)' }}
              className="absolute top-3 left-3 flex items-center gap-1.5 z-20"
            >
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border shadow-2xs backdrop-blur-md ${PORTAL_COLORS[listing.website] || 'text-slate-700 bg-white/90 border-slate-200'}`}>
                {listing.website}
              </span>

              {!listing.is_live && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  Off-Market
                </span>
              )}

              {(listing.is_corrupt || listing.is_fake) && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center space-x-1">
                  <ShieldAlert className="w-3 h-3 text-amber-600" />
                  <span>Flagged</span>
                </span>
              )}
            </div>

            {/* Save / Heart Button */}
            <motion.button
              style={{ transform: 'translateZ(30px)' }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={handleSaveClick}
              disabled={saving}
              className={`absolute top-3 right-3 z-20 p-2.5 rounded-full shadow-xs transition-colors cursor-pointer ${
                isSaved 
                  ? 'bg-rose-500 text-white shadow-rose-500/30' 
                  : 'bg-white/95 text-slate-500 hover:text-rose-500 hover:bg-white border border-slate-200/80'
              }`}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </motion.button>

            {/* Price Overlay Bar */}
            <div 
              style={{ transform: 'translateZ(15px)' }}
              className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-white via-white/95 to-transparent flex items-baseline justify-between z-10"
            >
              <div>
                <div className="text-lg font-black text-slate-900 tracking-tight">
                  {listing.price < 0 ? (
                    <span className="text-rose-600">{formatINR(listing.price)}</span>
                  ) : (
                    formatCrores(listing.price)
                  )}
                </div>
                {listing.price_per_sqft && (
                  <div className="text-[11px] text-slate-500 font-semibold">
                    ₹{listing.price_per_sqft.toLocaleString('en-IN')}/sqft
                  </div>
                )}
              </div>
              
              {listing.is_area_converted && (
                <span className="text-[10px] text-[#0018A8] bg-[#EBEDFF] border border-[#d2d7ff] px-1.5 py-0.5 rounded font-mono font-medium" title="Converted to square feet">
                  m² → ft²
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Property Details Body */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3 bg-white">
          <div>
            {/* Locality & City */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 mb-1">
              <MapPin className="w-3.5 h-3.5 text-[#0018A8] shrink-0" />
              <span className="capitalize font-bold text-slate-700">{listing.locality}</span>
              <span>·</span>
              <span className="text-slate-400 truncate">Bangalore</span>
            </div>

            <Link to={`/listings/${listing.listing_id}`}>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0018A8] transition-colors line-clamp-1">
                {listing.bedroom ? `${listing.bedroom} BHK ` : ''}
                {listing.apartment_name || 'Residential Property'}
              </h3>
            </Link>

            {/* Key Specs Row */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center space-x-1.5" title="Bedrooms">
                <BedDouble className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-800">{listing.bedroom ?? '-'} BHK</span>
              </div>
              
              <div className="flex items-center space-x-1.5" title="Bathrooms">
                <Bath className="w-3.5 h-3.5 text-slate-400" />
                <span>{listing.bathroom ?? '-'} Baths</span>
              </div>

              <div className="flex items-center space-x-1.5" title="Carpet Area">
                <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{listing.carpet_area ? `${listing.carpet_area} sqft` : '-'}</span>
              </div>
            </div>

            {/* Representative info if present */}
            {(listing.posted_by_name || listing.posted_by_contact) && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                {listing.posted_by_name && (
                  <span className="truncate">
                    <span className="text-slate-400">Rep:</span>{' '}
                    <strong className="text-slate-700 font-medium">{listing.posted_by_name}</strong>
                  </span>
                )}
                {listing.posted_by_contact && (
                  <span className="font-mono text-[10px] text-slate-500 shrink-0 ml-2">
                    {listing.posted_by_contact}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Card Footer */}
          <div className="pt-2.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
            <div className="flex items-center space-x-1.5">
              <span className="capitalize font-medium text-slate-600">{listing.furnishing || 'Unfurnished'}</span>
              {listing.facing_direction && (
                <>
                  <span>·</span>
                  <span className="capitalize text-slate-500">{listing.facing_direction}</span>
                </>
              )}
            </div>

            <Link 
              to={`/listings/${listing.listing_id}`} 
              className="text-[#0018A8] hover:text-[#001385] font-bold flex items-center space-x-1 transition-colors"
            >
              <span>View Home</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

        </div>

      </motion.div>
    </div>
  );
}
