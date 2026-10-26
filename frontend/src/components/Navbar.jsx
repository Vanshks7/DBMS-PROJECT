import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, X, ArrowRight } from 'lucide-react';

export default function Navbar({ activePage = 'Home', setActivePage }) {
  const { user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navLinks = [
    { name: 'HOME', id: 'Home' },
    { name: 'FACILITY MAP', id: 'Facility Map' },
    { name: 'RATES (₹)', id: 'Rates' },
    { name: 'ABOUT', id: 'About' },
  ];

  const handleNavClick = (pageId) => {
    if (setActivePage) {
      setActivePage(pageId);
    }
  };

  return (
    <header className="w-full bg-[#FAF9F5] border-b border-sage-border sticky top-0 z-50">
      
      {/* Top Utility Line matching reference poster ("HAVE AN ACCOUNT? SIGN IN OR SIGN UP") */}
      <div className="w-full border-b border-dotted border-sage-border py-2 px-4 sm:px-8 text-[11px] font-heading tracking-widest uppercase flex justify-between items-center text-sage-muted">
        <div>
          {user ? (
            <span>
              LOGGED IN AS <strong className="text-sage font-bold">@{user.username}</strong> ({user.role.toUpperCase()})
            </span>
          ) : (
            <span>
              HAVE AN ACCOUNT?{' '}
              <button
                onClick={() => handleNavClick('Home')}
                className="text-lime-ink hover:underline font-bold"
              >
                SIGN IN
              </button>{' '}
              OR{' '}
              <button
                onClick={() => handleNavClick('Home')}
                className="text-sage hover:underline font-bold"
              >
                SIGN UP
              </button>
            </span>
          )}
        </div>

        {/* Minimalist circular accent indicator badges (like the social dots in the reference image) */}
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-3.5 rounded-full bg-lime/70 inline-flex items-center justify-center text-[7px] font-bold text-slate-800">
            P
          </span>
          <span className="w-3.5 h-3.5 rounded-full bg-sage-muted/40 inline-flex items-center justify-center text-[7px] font-bold text-slate-700">
            ₹
          </span>
          <span className="w-3.5 h-3.5 rounded-full bg-sage/60 inline-flex items-center justify-center text-[7px] font-bold text-white">
            ⚡
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 sm:py-4 flex items-center justify-between">
        
        {/* Left: Minimalist Site Brand */}
        <div 
          onClick={() => handleNavClick('Home')}
          className="cursor-pointer group flex items-center space-x-2"
        >
          <span className="font-display text-3xl sm:text-4xl uppercase tracking-wider text-sage group-hover:text-sage-dark transition leading-none">
            SMART<span className="text-lime-ink">PARK</span>
          </span>
        </div>

        {/* Center: Minimalist Row of Links matching reference image */}
        <nav className="hidden md:flex items-center space-x-8 lg:space-x-12">
          {navLinks.map((link) => {
            const isActive = activePage === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`text-xs font-heading tracking-widest font-bold uppercase transition py-1 ${
                  isActive
                    ? 'text-lime-ink border-b-2 border-lime'
                    : 'text-sage-muted hover:text-sage'
                }`}
              >
                {link.name}
              </button>
            );
          })}
        </nav>

        {/* Right: Search & Action Button */}
        <div className="flex items-center space-x-4">
          
          {/* Search Toggle */}
          <div className="relative">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="text-sage-muted hover:text-sage transition p-1.5"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {searchOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-none border border-sage-border p-2 text-slate-800 z-50 flex items-center space-x-2 shadow-xs">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SEARCH PLATE OR BOOKING ID..."
                  className="w-full text-xs px-3 py-1.5 bg-sage-faint border border-sage-border font-mono text-slate-800 focus:outline-none focus:border-sage uppercase"
                  autoFocus
                />
                <button 
                  onClick={() => setSearchOpen(false)}
                  className="p-1 text-slate-600 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Solid Flat Sage Button (like the "JOIN THE CLUB" button in the reference image) */}
          {user ? (
            <button
              onClick={logout}
              className="rounded-lg border border-[#29483a] bg-[#3f6755] hover:bg-[#29483a] text-white font-heading font-bold text-xs uppercase tracking-widest px-5 py-2.5 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
            >
              LOGOUT
            </button>
          ) : (
            <button
              onClick={() => handleNavClick('Home')}
              className="bg-sage-block hover:bg-lime hover:text-slate-900 text-white font-heading font-bold text-xs uppercase tracking-widest px-5 py-2.5 transition flex items-center space-x-1.5"
            >
              <span>ACCESS PORTAL</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
