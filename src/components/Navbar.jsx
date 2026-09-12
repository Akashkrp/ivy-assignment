import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Building2, Home, KeyRound, Heart, BarChart3, 
  ShieldAlert, LogOut, UserCheck, Sparkles, MapPin
} from 'lucide-react';
import { Auth, ASSIGNED_LOCALITY, CITY } from '../services/api';

export default function Navbar({ onOpenLogin, savedCount }) {
  const location = useLocation();
  const [user, setUser] = useState(Auth.getUser());
  const [sessionTimeLeft, setSessionTimeLeft] = useState(null);

  useEffect(() => {
    const updateUser = () => {
      setUser(Auth.getUser());
    };

    window.addEventListener('storage', updateUser);
    const interval = setInterval(() => {
      updateUser();
      const exp = localStorage.getItem('ivy_token_expires_at');
      if (exp) {
        const remaining = Math.max(0, Math.floor((parseInt(exp, 10) - Date.now()) / 1000));
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        setSessionTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
      } else {
        setSessionTimeLeft(null);
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', updateUser);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    Auth.logout();
    setUser(null);
    window.location.reload();
  };

  const navLinks = [
    { path: '/', label: 'Listings', icon: Home },
    { path: '/rentals', label: 'Rentals', icon: KeyRound },
    { path: '/projects', label: 'Projects', icon: Building2 },
    { 
      path: '/favourites', 
      label: 'Favourites', 
      icon: Heart,
      badge: savedCount > 0 ? savedCount : null 
    },
    { path: '/insights', label: 'Insights & Truth', icon: BarChart3, highlight: true },
  ];

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/85 border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & City Badge */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Ivy Homes
                </span>
                <div className="flex items-center text-[10px] font-medium text-emerald-400 uppercase tracking-widest">
                  <span>Intelligence</span>
                  <span className="mx-1 text-slate-600">·</span>
                  <span className="text-slate-400">Sep 2026</span>
                </div>
              </div>
            </Link>

            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-white">{CITY}</span>
              <span className="text-slate-500">/</span>
              <span className="text-emerald-400 capitalize font-medium">{ASSIGNED_LOCALITY}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive 
                      ? 'text-white bg-slate-900 shadow-inner border border-slate-700/60' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  } ${item.highlight && !isActive ? 'text-emerald-400 font-semibold' : ''}`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : ''}`} />
                  <span>{item.label}</span>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && (
                    <span className="flex h-1.5 w-1.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User & Auth Controls */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-2">
                <div className="hidden sm:flex flex-col items-end">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-200 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{user.email}</span>
                  </div>
                  {sessionTimeLeft && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Refreshes in {sessionTimeLeft}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-900/50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/30 active:scale-95"
              >
                <UserCheck className="w-4 h-4" />
                <span>Sign In Demo</span>
              </button>
            )}
          </div>

        </div>
      </div>
      
      {/* Mobile nav bar */}
      <div className="lg:hidden flex items-center justify-around border-t border-slate-800/80 bg-slate-950/95 py-2 px-2">
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center py-1 px-2 rounded-lg text-xs font-medium ${
                isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
