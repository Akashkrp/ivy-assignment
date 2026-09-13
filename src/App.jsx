import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';
import ListingsView from './pages/ListingsView';
import ListingDetailView from './pages/ListingDetailView';
import RentalsView from './pages/RentalsView';
import ProjectsView from './pages/ProjectsView';
import FavouritesView from './pages/FavouritesView';
import InsightsView from './pages/InsightsView';
import { API, Auth, CITY } from './services/api';
import { Building2, ExternalLink, ShieldCheck } from 'lucide-react';
import IvyLogo from './components/IvyLogo';

export default function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginInitialEmail, setLoginInitialEmail] = useState('demo1@ivy.homes');
  const [user, setUser] = useState(Auth.getUser());
  const [savedListings, setSavedListings] = useState([]);

  const handleOpenLogin = (email = 'demo1@ivy.homes') => {
    if (typeof email === 'string') {
      setLoginInitialEmail(email);
    }
    setIsLoginOpen(true);
  };

  const handleLogout = () => {
    Auth.logout();
    setUser(null);
    setSavedListings([]);
  };

  // Load saved listings on mount & sync auth state
  useEffect(() => {
    async function loadSaved() {
      if (Auth.isAuthenticated()) {
        const ids = await API.getSavedListings();
        setSavedListings(ids);
      } else {
        setSavedListings([]);
      }
    }
    loadSaved();

    const handleAuthChange = () => {
      setUser(Auth.getUser());
    };
    window.addEventListener('storage', handleAuthChange);
    return () => window.removeEventListener('storage', handleAuthChange);
  }, []);

  const handleToggleSave = async (listingId) => {
    const isAlreadySaved = savedListings.some(
      (item) => (typeof item === 'string' ? item : (item.listing_id || item.id)) === listingId
    );
    if (isAlreadySaved) {
      await API.removeSavedListing(listingId);
      setSavedListings((prev) =>
        prev.filter((item) => (typeof item === 'string' ? item : (item.listing_id || item.id)) !== listingId)
      );
    } else {
      await API.saveListing(listingId);
      setSavedListings((prev) => [...prev, listingId]);
    }
  };

  const handleLoginSuccess = async (data) => {
    setUser(Auth.getUser());
    const ids = await API.getSavedListings();
    setSavedListings(ids);
  };

  return (
    <Router>
      <div className="min-h-screen bg-white text-slate-900 flex flex-col selection:bg-[#0018A8] selection:text-white">
        
        {/* Navigation */}
        <Navbar 
          user={user}
          onLogout={handleLogout}
          onOpenLogin={handleOpenLogin}
          savedCount={savedListings.length}
        />

        {/* Dynamic Routed Views */}
        <main className="flex-1">
          <Routes>
            <Route 
              path="/" 
              element={
                <ListingsView 
                  user={user}
                  onOpenLogin={handleOpenLogin}
                  savedListings={savedListings} 
                  onToggleSave={handleToggleSave} 
                />
              } 
            />
            <Route 
              path="/listings/:id" 
              element={
                <ListingDetailView 
                  user={user}
                  onOpenLogin={handleOpenLogin}
                  savedListings={savedListings} 
                  onToggleSave={handleToggleSave} 
                />
              } 
            />
            <Route 
              path="/rentals" 
              element={
                <RentalsView 
                  user={user} 
                  onOpenLogin={handleOpenLogin} 
                />
              } 
            />
            <Route 
              path="/projects" 
              element={
                <ProjectsView 
                  user={user} 
                  onOpenLogin={handleOpenLogin} 
                />
              } 
            />
            <Route 
              path="/favourites" 
              element={
                <FavouritesView 
                  user={user}
                  onOpenLogin={handleOpenLogin}
                  savedListings={savedListings} 
                  onToggleSave={handleToggleSave} 
                />
              } 
            />
            <Route 
              path="/insights" 
              element={
                <InsightsView 
                  user={user} 
                  onOpenLogin={handleOpenLogin} 
                />
              } 
            />
          </Routes>
        </main>

        {/* Login Modal */}
        <LoginModal
          isOpen={isLoginOpen}
          initialEmail={loginInitialEmail}
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />

        {/* Global Footer */}
        <footer className="border-t border-slate-200/80 bg-slate-50 py-10 mt-auto">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
            
            <div className="flex items-center space-x-3">
              <IvyLogo className="h-6 w-auto" />
              <div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Software Engineering Internship Assignment · September 2026
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-xs text-slate-600 font-medium">
              <span>Candidate: <strong className="text-slate-900">Akash Kumar Prasad</strong></span>
              <span>·</span>
              <span className="font-semibold text-blue-700">MNNIT Allahabad</span>
              <span>·</span>
              <span>City: <strong className="text-slate-900">{CITY}</strong></span>
            </div>

            <div className="flex items-center space-x-4 text-xs text-slate-600">
              <span className="flex items-center space-x-1.5 text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Audited API Behavior</span>
              </span>
            </div>

          </div>
        </footer>

      </div>
    </Router>
  );
}
