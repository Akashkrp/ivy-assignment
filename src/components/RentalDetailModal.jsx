import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, KeyRound, MapPin, BedDouble, Bath, Maximize2, 
  Building2, Compass, ShieldCheck, ExternalLink, Armchair, Layers
} from 'lucide-react';
import { formatINR } from '../services/api';

export default function RentalDetailModal({ rental, onClose }) {
  if (!rental) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 my-8 max-h-[90vh] overflow-y-auto"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="mb-6 pr-8">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Verified Rental Unit</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {rental.title || `${rental.bedroom} BHK in ${rental.apartment_name}`}
            </h2>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span className="capitalize font-medium text-slate-200">{rental.locality}, Bangalore</span>
              <span>·</span>
              <span className="text-slate-300">{rental.apartment_name}</span>
              <span>·</span>
              <span className="font-mono text-slate-500">ID: {rental.listing_id}</span>
            </div>
          </div>

          {/* Pricing & Financial Breakdown */}
          <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 mb-6">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Monthly Rental Terms
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                {formatINR(rental.price)}
                <span className="text-xs text-slate-400 font-normal"> / month</span>
              </div>
              <div className="text-sm text-slate-300">
                Security Deposit: <span className="font-bold text-white">{formatINR(rental.deposit)}</span>
              </div>
            </div>
            {rental.maintenance > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                Monthly Maintenance: <strong className="text-slate-200">{formatINR(rental.maintenance)} / mo</strong>
              </div>
            )}
          </div>

          {/* Specifications Grid */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Rental Unit Specifications
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Bedrooms</span>
                <span className="font-bold text-white text-sm flex items-center space-x-1.5">
                  <BedDouble className="w-4 h-4 text-emerald-400" />
                  <span>{rental.bedroom} BHK</span>
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Bathrooms</span>
                <span className="font-bold text-white text-sm flex items-center space-x-1.5">
                  <Bath className="w-4 h-4 text-emerald-400" />
                  <span>{rental.bathroom} Baths</span>
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Carpet Area</span>
                <span className="font-bold text-white text-sm flex items-center space-x-1.5">
                  <Maximize2 className="w-4 h-4 text-emerald-400" />
                  <span>{rental.carpet_area} sqft</span>
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Floor Level</span>
                <span className="font-bold text-white text-sm flex items-center space-x-1.5">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  <span>Floor {rental.floor} of {rental.total_floors}</span>
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Furnishing</span>
                <span className="font-bold text-white text-sm capitalize flex items-center space-x-1.5">
                  <Armchair className="w-4 h-4 text-teal-400" />
                  <span>{rental.furnishing || 'Not Specified'}</span>
                </span>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Facing Direction</span>
                <span className="font-bold text-white text-sm capitalize flex items-center space-x-1.5">
                  <Compass className="w-4 h-4 text-amber-400" />
                  <span>{rental.facing_direction || 'Not Specified'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {rental.description && (
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Property Overview
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80 whitespace-pre-line">
                {rental.description}
              </p>
            </div>
          )}

          {/* Geographic Coordinates & Ivy Assurance */}
          <div className="space-y-3 mb-6">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>Coordinates: {rental.latitude}, {rental.longitude}</span>
              <span className="text-slate-500 font-sans">Bangalore, Karnataka</span>
            </div>

            <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/30 text-xs text-blue-300 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Direct Ivy Intelligence: Verified listing terms with zero spam intermediary calls.</span>
            </div>
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            {rental.listing_url && (
              <a
                href={rental.listing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors"
              >
                <span>View On {rental.website}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
