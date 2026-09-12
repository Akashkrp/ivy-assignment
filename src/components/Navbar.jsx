import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Building2, Home, KeyRound, Heart, BarChart3, 
  ShieldAlert, LogOut, UserCheck, Sparkles, MapPin
} from 'lucide-react';
import { Auth, ASSIGNED_LOCALITY, CITY } from '../services/api';
import IvyLogo from './IvyLogo';

export default function Navbar({ user: propUser, onLogout, onOpenLogin, savedCount }) {
  const location = useLocation();
  const [localUser, setLocalUser] = useState(Auth.getUser());
  const user = propUser !== undefined ? propUser : localUser;
  const [sessionTimeLeft, setSessionTimeLeft] = useState(null);

  useEffect(() => {
    const updateUser = () => {
      setLocalUser(Auth.getUser());
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
    if (onLogout) {
      onLogout();
    } else {
      Auth.logout();
      setLocalUser(null);
    }
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
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link to="/" className="flex items-center py-1 group focus:outline-none">
              <IvyLogo className="h-6 sm:h-7 w-auto transition-transform group-hover:scale-[1.03]" />
            </Link>

            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-white">{CITY}</span>
              <span className="text-slate-500">/</span>
              <span className="text-blue-400 capitalize font-medium">{ASSIGNED_LOCALITY}</span>
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
                  } ${item.highlight && !isActive ? 'text-blue-400 font-semibold' : ''}`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : ''}`} />
                  <span>{item.label}</span>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && (
                    <span className="flex h-1.5 w-1.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User & Auth Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {user ? (
              <div className="flex items-center space-x-2">
                <div className="hidden sm:flex flex-col items-end">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-200 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
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
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-900/50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
              >
                <UserCheck className="w-4 h-4" />
                <span>Sign In</span>
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
