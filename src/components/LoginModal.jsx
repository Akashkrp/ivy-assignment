import React, { useState } from 'react';
import { 
  X, Lock, Mail, CheckCircle2, AlertCircle, KeyRound, 
  Sparkles, ShieldCheck, ArrowRight, RefreshCw 
} from 'lucide-react';
import { Auth, DEMO_USERS, DEMO_PASSWORD } from '../services/api';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('demo1@ivy.homes');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/40">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Demo User Login</h2>
            <p className="text-xs text-slate-400">Real session authenticated against Ivy API</p>
          </div>
        </div>

        {/* Quick Demo Switcher */}
        <div className="mb-6 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
            <span className="flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Select Demo Account</span>
            </span>
            <span className="text-[10px] text-slate-500 uppercase">Preconfigured</span>
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
                  className={`py-2 px-2.5 rounded-xl text-xs font-medium text-center transition-all border ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/20'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold capitalize">{name}</div>
                  <div className="text-[10px] opacity-75">{u.role.split(' ')[0]}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
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
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                placeholder="name@ivy.homes"
              />
            </div>
          </div>

          <div>
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
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                placeholder="Key password"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successData && (
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Authenticated! Session token active & persisted.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all active:scale-98 disabled:opacity-50"
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
        </form>

        {/* Security & Token lifespan footnote */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-start space-x-2 text-[11px] text-slate-400 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Tokens automatically refresh every 15 minutes via <code className="text-emerald-300 bg-slate-950 px-1 py-0.5 rounded">/auth/refresh</code> to keep your session alive for 30+ minutes across reloads.
          </span>
        </div>

      </div>
    </div>
  );
}
