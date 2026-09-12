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
        transition={{ duration: 0.4 }}
        className="relative rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-2xl p-8 sm:p-12 text-center overflow-hidden"
      >
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-blue-600/10 blur-3xl pointer-events-none rounded-full" />
        
        {/* Ivy Homes Brand Badge */}
        <div className="relative z-10 inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide mb-6">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{subtitle}</span>
        </div>

        {/* Section Icon with Lock indicator */}
        <div className="relative z-10 mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 p-0.5 shadow-xl shadow-blue-600/20 flex items-center justify-center mb-6">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-blue-400">
            <Icon className="w-8 h-8" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow">
            <Lock className="w-3.5 h-3.5 font-bold" />
          </div>
        </div>

        {/* Heading & Description */}
        <div className="relative z-10 space-y-3 max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {title}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
            {description}
          </p>
        </div>

        {/* Primary CTA */}
        <div className="relative z-10 mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => onOpenLogin?.()}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 transition-all cursor-pointer inline-flex items-center justify-center space-x-2.5 active:scale-95"
          >
            <UserCheck className="w-4 h-4" />
            <span>Sign In to Unlock Full Access</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 1-Click Demo Accounts Selector */}
        <div className="relative z-10 mt-8 pt-6 border-t border-slate-800/80">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Quick-access demo credentials (password: <code className="text-amber-400 font-mono font-normal">{DEMO_PASSWORD}</code>)
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {DEMO_USERS.map((userObj) => (
              <button
                key={userObj.email}
                onClick={() => onOpenLogin?.(userObj.email)}
                className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-mono transition-all cursor-pointer flex items-center space-x-2 active:scale-95"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>{userObj.email}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Ivy Homes Trust Assurance */}
        <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero Brokerage Guarantee</span>
          </div>
          <span>·</span>
          <div className="flex items-center space-x-1.5 text-blue-400">
            <Building2 className="w-4 h-4" />
            <span>3,687 Verified Bangalore Listings</span>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
