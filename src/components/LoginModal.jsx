import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Lock, Mail, CheckCircle2, AlertCircle, KeyRound, 
  Sparkles, ShieldCheck, ArrowRight, RefreshCw
} from 'lucide-react';
import { Auth, DEMO_USERS, DEMO_PASSWORD } from '../services/api';
import ThreeLoginScene from './ThreeLoginScene';

export default function LoginModal({ isOpen, onClose, onLoginSuccess, initialEmail = 'demo1@ivy.homes' }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  React.useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail, isOpen]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await Auth.login(email, password);
      setSuccessData(data);
      setTimeout(() => {
        onLoginSuccess?.(data);
        onClose();
      }, 900);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
          
          {/* 3D WebGL Three.js Scene Canvas Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-md overflow-hidden cursor-pointer"
          >
            <ThreeLoginScene />
          </motion.div>

          {/* Static Login Card Container (No hover movement or tilt) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0, 
              transition: { duration: 0.22, ease: 'easeOut' } 
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.95, 
              y: 12, 
              transition: { duration: 0.15 } 
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl z-10"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors z-20 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center space-x-3.5 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#EBEDFF] border border-[#d2d7ff] flex items-center justify-center text-[#0018A8]">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Ivy Homes Login</h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#EBEDFF] text-[#0018A8] border border-[#d2d7ff]">
                    Secure Auth
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Direct JWT verification against Ivy Homes API</p>
              </div>
            </div>

            {/* Quick Demo Switcher */}
            <div className="mb-6 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2.5">
                <span className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Select Demo Account</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">1-CLICK FILL</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_USERS.map((u) => {
                  const isSelected = email === u.email;
                  const name = u.email.split('@')[0];
                  return (
                    <button
                      key={u.email}
                      type="button"
                      onClick={() => handleSelectDemo(u.email)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-medium text-center transition-colors border cursor-pointer ${
                        isSelected
                          ? 'bg-[#EBEDFF] border-[#0018A8] text-[#0018A8] font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold capitalize">{name}</div>
                      <div className="text-[10px] opacity-75">{u.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0018A8] rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0018A8]/20 transition-all font-medium"
                    placeholder="name@ivy.homes"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#0018A8] rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0018A8]/20 transition-all font-medium"
                    placeholder="Key password"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs shadow-2xs font-medium">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successData && (
                <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Authenticated! Session token active & persisted.</span>
                </div>
              )}

              {/* Action Button */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-[#0018A8] hover:bg-[#001385] active:bg-[#000f6b] text-white font-bold text-sm shadow-md transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authenticating with API...</span>
                    </>
                  ) : (
                    <>
                      <span>Log In As {email.split('@')[0]}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Footnote */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-start space-x-2 text-[11px] text-slate-500 leading-relaxed font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Session auto-refreshes every 15 min via <code className="text-[#0018A8] bg-[#EBEDFF] px-1 py-0.5 rounded font-mono font-bold">/auth/refresh</code> to keep credentials authenticated.
              </span>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
