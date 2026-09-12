import React from 'react';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, ShieldCheck, Sparkles, Building2, UserCheck } from 'lucide-react';
import { DEMO_USERS, DEMO_PASSWORD } from '../services/api';

export default function AuthGate({ 
  title = 'Authentication Required', 
  subtitle = 'Bangalore Real Estate Intelligence Portal',
  description = 'Sign in with an Ivy Homes demo account to access complete property details, real-time analytics, and verified pricing.',
  icon: Icon = Lock,
  onOpenLogin
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative rounded-3xl bg-white border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-8 sm:p-12 text-center overflow-hidden"
      >
        {/* Ivy Homes Brand Badge */}
        <div className="relative z-10 inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#EBEDFF] border border-[#d2d7ff] text-[#0018A8] text-xs font-bold tracking-wide mb-6">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{subtitle}</span>
        </div>

        {/* Section Icon with Lock indicator */}
        <div className="relative z-10 mx-auto w-16 h-16 rounded-2xl bg-[#EBEDFF] border border-[#d2d7ff] flex items-center justify-center mb-6">
          <Icon className="w-8 h-8 text-[#0018A8]" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
            <Lock className="w-3 h-3 font-bold" />
          </div>
        </div>

        {/* Heading & Description */}
        <div className="relative z-10 space-y-3 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {title}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
            {description}
          </p>
        </div>

        {/* Primary CTA */}
        <div className="relative z-10 mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => onOpenLogin?.()}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#0018A8] hover:bg-[#001385] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer inline-flex items-center justify-center space-x-2.5 active:scale-95"
          >
            <UserCheck className="w-4 h-4" />
            <span>Sign In to Unlock Full Access</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 1-Click Demo Accounts Selector */}
        <div className="relative z-10 mt-8 pt-6 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Quick-access demo credentials (password: <code className="text-[#0018A8] font-mono font-bold">{DEMO_PASSWORD}</code>)
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {DEMO_USERS.map((userObj) => (
              <button
                key={userObj.email}
                onClick={() => onOpenLogin?.(userObj.email)}
                className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#0018A8] hover:bg-white text-slate-700 hover:text-[#0018A8] text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center space-x-2 active:scale-95"
              >
                <div className="w-2 h-2 rounded-full bg-[#0018A8]" />
                <span>{userObj.email}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Ivy Homes Trust Assurance */}
        <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
          <div className="flex items-center space-x-1.5 text-emerald-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero Brokerage Guarantee</span>
          </div>
          <span>·</span>
          <div className="flex items-center space-x-1.5 text-[#0018A8]">
            <Building2 className="w-4 h-4" />
            <span>3,687 Verified Bangalore Listings</span>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
