import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { 
  X, Lock, Mail, CheckCircle2, AlertCircle, KeyRound, 
  Sparkles, ShieldCheck, ArrowRight, RefreshCw, Box, Layers
} from 'lucide-react';
import { Auth, DEMO_USERS, DEMO_PASSWORD } from '../services/api';
import ThreeLoginScene from './ThreeLoginScene';
import CustomCursor from './CustomCursor';

export default function LoginModal({ isOpen, onClose, onLoginSuccess, initialEmail = 'demo1@ivy.homes' }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  React.useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail, isOpen]);

  // 3D Card Tilt Controls
  const cardRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 220, damping: 22 });
  const mouseYSpring = useSpring(y, { stiffness: 220, damping: 22 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['14deg', '-14deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-16deg', '16deg']);
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ['0%', '100%']);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ['0%', '100%']);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden perspective-[1200px] cursor-none select-none">
          
          {/* Custom 3D Radar Cursor (Active strictly on login modal) */}
          <CustomCursor />

          {/* 3D WebGL Three.js Scene Canvas Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md overflow-hidden"
          >
            <ThreeLoginScene />
          </motion.div>

          {/* 3D Interactive Tilt Card Container */}
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              rotateX,
              rotateY,
              transformStyle: 'preserve-3d',
            }}
            initial={{ opacity: 0, scale: 0.88, y: 35, rotateX: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0, 
              transition: { type: 'spring', damping: 24, stiffness: 280 } 
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.9, 
              y: 20, 
              transition: { duration: 0.22 } 
            }}
            className="relative w-full max-w-md bg-gradient-to-b from-slate-900/95 via-slate-900/95 to-slate-950/98 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-950/60 z-10 backdrop-blur-2xl transition-shadow duration-300 hover:shadow-blue-500/20"
          >
            {/* Dynamic Specular Sheen Layer reacting to 3D tilt */}
            <motion.div
              style={{
                background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(59, 130, 246, 0.22), transparent 70%)`,
              }}
              className="absolute inset-0 rounded-3xl pointer-events-none"
            />

            {/* Close Button with 3D Pop */}
            <motion.button
              style={{ transform: 'translateZ(35px)' }}
              whileHover={{ scale: 1.15, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors z-20 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </motion.button>

            {/* 3D Modal Header */}
            <div 
              style={{ transform: 'translateZ(40px)' }} 
              className="flex items-center space-x-3.5 mb-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/20">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-black text-white tracking-tight">Ivy Homes Login</h2>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    3D Auth
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Direct JWT verification against Ivy Homes API</p>
              </div>
            </div>

            {/* Quick Demo Switcher with 3D Depth */}
            <div 
              style={{ transform: 'translateZ(25px)' }} 
              className="mb-6 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/90 shadow-inner"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2.5">
                <span className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Select Demo Account</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">1-CLICK FILL</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_USERS.map((u) => {
                  const isSelected = email === u.email;
                  const name = u.email.split('@')[0];
                  return (
                    <motion.button
                      key={u.email}
                      type="button"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSelectDemo(u.email)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-medium text-center transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600/25 border-blue-500 text-blue-200 shadow-md shadow-blue-500/25'
                          : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold capitalize">{name}</div>
                      <div className="text-[10px] opacity-75">{u.label}</div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Form Fields with 3D Layer Elevation */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div style={{ transform: 'translateZ(30px)' }}>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-800 focus:border-blue-500 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                    placeholder="name@ivy.homes"
                  />
                </div>
              </div>

              <div style={{ transform: 'translateZ(30px)' }}>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-800 focus:border-blue-500 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                    placeholder="Key password"
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  style={{ transform: 'translateZ(35px)' }}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start space-x-2.5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs shadow-lg shadow-rose-500/10"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {successData && (
                <motion.div 
                  style={{ transform: 'translateZ(35px)' }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center space-x-2.5 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Authenticated! Session token active & persisted.</span>
                </motion.div>
              )}

              {/* Action Button with 3D Push and Elevation */}
              <div style={{ transform: 'translateZ(45px)' }}>
                <motion.button
                  whileHover={{ scale: 1.025, y: -2 }}
                  whileTap={{ scale: 0.98, y: 1 }}
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-blue-600/30 transition-all disabled:opacity-50 cursor-pointer"
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
                </motion.button>
              </div>
            </form>

            {/* Footnote */}
            <div 
              style={{ transform: 'translateZ(20px)' }}
              className="mt-6 pt-4 border-t border-slate-800/80 flex items-start space-x-2 text-[11px] text-slate-400 leading-relaxed"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Session auto-refreshes every 15 min via <code className="text-emerald-300 bg-slate-950 px-1 py-0.5 rounded font-mono">/auth/refresh</code> to keep credentials authenticated.
              </span>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
