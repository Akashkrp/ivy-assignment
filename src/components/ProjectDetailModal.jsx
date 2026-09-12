import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Building2, MapPin, Calendar, Award, ShieldCheck, 
  Layers, Maximize2, CheckCircle2, ExternalLink, Sparkles
} from 'lucide-react';

export default function ProjectDetailModal({ project, actualLiveCount, onClose }) {
  if (!project) return null;

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
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>{project.developer_name} Development</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {project.apartment_name}
            </h2>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span className="capitalize font-medium text-slate-200">{project.locality}, Bangalore</span>
              <span>·</span>
              <span className="capitalize text-slate-400">{project.project_status}</span>
              <span>·</span>
              <span className="font-mono text-slate-500">ID: {project.project_id}</span>
            </div>
          </div>

          {/* Pricing & RERA Band */}
          <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 mb-6 space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Project Pricing Spectrum
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {project.price_min_display} – {project.price_max_display}
            </div>
            {project.rera_number && (
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>RERA Approved:</span>
                </span>
                <span className="font-mono text-amber-300 font-semibold">{project.rera_number}</span>
              </div>
            )}
          </div>

          {/* Core Architectural Specifications */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Development Specifications
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Unit Area Range</span>
                <span className="font-bold text-white text-sm">
                  {project.min_area_sqft} – {project.max_area_sqft} sqft
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Towers & Floors</span>
                <span className="font-bold text-white text-sm">
                  {project.total_towers} Towers · {project.total_floors} Floors
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Total Project Units</span>
                <span className="font-bold text-white text-sm">
                  {project.total_units} Units
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Launch Date</span>
                <span className="font-bold text-white text-sm">
                  {project.launch_date || 'N/A'}
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Expected Possession</span>
                <span className="font-bold text-white text-sm">
                  {project.possession_date || 'Ongoing'}
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Active Market Units</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {actualLiveCount || 0} Units Available
                </span>
              </div>
            </div>
          </div>

          {/* Real Project Amenities */}
          {(() => {
            const cleanAmenities = (project.amenities || []).filter(
              a => typeof a === 'string' && !a.toLowerCase().includes('note for ai') && a.length < 50
            );
            if (cleanAmenities.length === 0) return null;
            return (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Verified Project Amenities</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {cleanAmenities.map((amenity, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 capitalize flex items-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>{amenity}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Coordinates & Region */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 font-mono flex items-center justify-between mb-6">
            <span>Coordinates: {project.latitude}, {project.longitude}</span>
            <span className="text-slate-500 font-sans">Bangalore, Karnataka</span>
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            {project.project_url && (
              <a
                href={project.project_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors"
              >
                <span>View Official Project Portal</span>
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
