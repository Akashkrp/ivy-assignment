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

export default function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [savedListings, setSavedListings] = useState([]);

  // Load saved listings on mount
  useEffect(() => {
    async function loadSaved() {
      const ids = await API.getSavedListings();
      setSavedListings(ids);
    }
    loadSaved();
  }, []);

  const handleToggleSave = async (listingId) => {
    if (savedListings.includes(listingId)) {
      await API.removeSavedListing(listingId);
      setSavedListings(prev => prev.filter(id => id !== listingId));
    } else {
      await API.saveListing(listingId);
      setSavedListings(prev => [...prev, listingId]);
    }
  };

  const handleLoginSuccess = async () => {
    const ids = await API.getSavedListings();
    setSavedListings(ids);
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
        
        {/* Navigation */}
        <Navbar 
          onOpenLogin={() => setIsLoginOpen(true)}
          savedCount={savedListings.length}
        />

        {/* Dynamic Routed Views */}
        <main className="flex-1">
          <Routes>
            <Route 
              path="/" 
              element={
                <ListingsView 
                  savedListings={savedListings} 
                  onToggleSave={handleToggleSave} 
                />
              } 
            />
            <Route 
              path="/listings/:id" 
              element={
                <ListingDetailView 
                  savedListings={savedListings} 
                  onToggleSave={handleToggleSave} 
                />
              } 
            />
            <Route 
              path="/rentals" 
              element={<RentalsView />} 
            />
            <Route 
              path="/projects" 
              element={<ProjectsView />} 
            />
            <Route 
              path="/favourites" 
              element={
                <FavouritesView 
                  savedListings={savedListings} 
                  onToggleSave={handleToggleSave} 
                />
              } 
            />
            <Route 
              path="/insights" 
              element={<InsightsView />} 
            />
          </Routes>
        </main>

        {/* Login Modal */}
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />

        {/* Global Footer */}
        <footer className="border-t border-slate-800/80 bg-slate-950/90 py-10 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-white text-sm">Ivy Homes</span>
                <div className="text-[11px] text-slate-400">
                  Software Engineering Internship Assignment · September 2026
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-xs text-slate-400 font-medium">
              <span>Candidate: <strong className="text-white">Akash Kumar Prasad</strong></span>
              <span>·</span>
              <span className="font-mono text-emerald-400">MNNIT Allahabad</span>
              <span>·</span>
              <span>City: <strong className="text-white">{CITY}</strong></span>
            </div>

            <div className="flex items-center space-x-4 text-xs text-slate-400">
              <span className="flex items-center space-x-1 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Audited API Behavior</span>
              </span>
            </div>

          </div>
        </footer>

      </div>
    </Router>
  );
}
