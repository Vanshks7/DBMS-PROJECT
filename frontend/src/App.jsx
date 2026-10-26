import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginView from './views/LoginView';
import CustomerDashboard from './views/CustomerDashboard';
import AdminDashboard from './views/AdminDashboard';
import GuardDashboard from './views/GuardDashboard';
import OperatorDashboard from './views/OperatorDashboard';
import { X, Layers, Zap, Car, Bike } from 'lucide-react';

export default function App() {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState('Home');
  const [modalOpen, setModalOpen] = useState(null); // 'Rates' | 'Facility Map' | 'About' | null

  const handleNavChange = (pageId) => {
    setActivePage(pageId);
    if (pageId === 'Rates' || pageId === 'Facility Map' || pageId === 'About') {
      setModalOpen(pageId);
    } else {
      setModalOpen(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#55635C] flex flex-col font-sans selection:bg-lime selection:text-[#233129]">
      
      {/* Top Navigation Bar with exact Beach Volley color palette & typography */}
      <Navbar activePage={activePage} setActivePage={handleNavChange} />

      {/* Main View Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {!user ? (
          <LoginView />
        ) : (
          <>
            {user.role === 'customer' && <CustomerDashboard />}
            {user.role === 'admin' && <AdminDashboard />}
            {user.role === 'guard' && <GuardDashboard />}
            {user.role === 'operator' && <OperatorDashboard />}
            {!['customer', 'admin', 'guard', 'operator'].includes(user.role) && (
              <div className="max-w-md mx-auto mt-20 text-center p-8 bg-white border border-sage-border">
                <p className="text-slate-600 font-heading uppercase">Unrecognized user role: {user.role}</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Facility / Rates / About Modal Triggered from Navbar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white max-w-lg w-full p-6 sm:p-8 border border-sage-border space-y-6">
            <div className="flex justify-between items-start pb-4 border-b border-sage-border">
              <h2 className="text-3xl font-display uppercase text-sage font-bold tracking-wider">
                {modalOpen}
              </h2>
              <button
                onClick={() => { setModalOpen(null); setActivePage('Home'); }}
                className="p-1 text-sage-muted hover:text-sage"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalOpen === 'Rates' && (
              <div className="space-y-4">
                <p className="text-xs font-heading uppercase tracking-widest text-motto">
                  Hourly facility charging rates in Indian Rupees (₹):
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-sage-light border border-sage-border text-center">
                    <Car className="w-6 h-6 text-sage mx-auto mb-2" />
                    <span className="text-xs font-heading uppercase font-bold text-slate-600">Car</span>
                    <div className="text-2xl font-display font-bold text-slate-900 mt-1">₹50/hr</div>
                  </div>
                  <div className="p-4 bg-sage-light border border-sage-border text-center">
                    <Bike className="w-6 h-6 text-sage mx-auto mb-2" />
                    <span className="text-xs font-heading uppercase font-bold text-slate-600">Bike</span>
                    <div className="text-2xl font-display font-bold text-slate-900 mt-1">₹20/hr</div>
                  </div>
                  <div className="p-4 bg-sage-light border border-sage-border text-center relative overflow-hidden">
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-lime text-slate-900 font-heading font-extrabold text-[8px] uppercase">
                      Fast
                    </div>
                    <Zap className="w-6 h-6 text-lime-ink mx-auto mb-2" />
                    <span className="text-xs font-heading uppercase font-bold text-slate-600">EV Bay</span>
                    <div className="text-2xl font-display font-bold text-slate-900 mt-1">₹80/hr</div>
                  </div>
                </div>
              </div>
            )}

            {modalOpen === 'Facility Map' && (
              <div className="space-y-3 text-xs leading-relaxed text-slate-600 font-heading uppercase tracking-wider">
                <div className="p-5 bg-sage-light border border-sage-border space-y-2">
                  <span className="font-display text-lg font-bold text-sage">5-Floor Structural Architecture</span>
                  <ul className="mt-2 space-y-1.5 text-slate-700">
                    <li>• Floors 1 to 5 covered automated bay zones</li>
                    <li>• 4 standard car bays per floor (C1 to C4)</li>
                    <li>• 4 two-wheeler bike bays per floor (B1 to B4)</li>
                    <li>• 1 dedicated fast EV charging bay per floor (E1)</li>
                    <li>• Total facility capacity: <strong className="text-slate-900">45 Bays</strong></li>
                  </ul>
                </div>
              </div>
            )}

            {modalOpen === 'About' && (
              <div className="space-y-3 text-xs leading-relaxed text-slate-600 font-heading uppercase tracking-wider">
                <p>
                  <strong>SmartPark</strong> is a minimalist, automated multi-floor parking management system featuring strictly hourly reservations, automated security gate verification, real-time occupancy monitoring, and role-based access control.
                </p>
                <div className="p-3 bg-sage-faint border border-sage-border text-sage-dark font-mono text-[11px]">
                  Built with React, Node.js/Express, Tailwind CSS, and MySQL.
                </div>
              </div>
            )}

            <button
              onClick={() => { setModalOpen(null); setActivePage('Home'); }}
              className="w-full py-3 bg-sage-block hover:bg-lime hover:text-slate-900 text-white font-heading uppercase text-xs font-bold tracking-widest transition"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4-COLUMN EDITORIAL FOOTER MATCHING THE REFERENCE POSTER EXACTLY */}
      {/* ============================================================ */}
      <footer className="border-t border-dotted border-sage-border bg-[#FAF9F5] pt-12 pb-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-10 border-b border-dotted border-sage-border text-xs font-heading uppercase tracking-widest">
            
            {/* Column 1: FACILITY */}
            <div className="space-y-2.5">
              <h4 className="font-display text-xl text-sage font-bold tracking-wider">
                FACILITY
              </h4>
              <ul className="space-y-1.5 text-sage-muted text-[11px]">
                <li><button onClick={() => handleNavChange('About')} className="hover:text-sage">ABOUT PORTAL</button></li>
                <li><button onClick={() => handleNavChange('Facility Map')} className="hover:text-sage">5-FLOOR MAP</button></li>
                <li><button onClick={() => handleNavChange('Rates')} className="hover:text-sage">HOURLY CHARGES</button></li>
                <li><span className="text-sage-muted">45 TOTAL BAYS</span></li>
                <li><span className="text-sage-muted">EV FAST CHARGERS</span></li>
              </ul>
            </div>

            {/* Column 2: OVERVIEW */}
            <div className="space-y-2.5">
              <h4 className="font-display text-xl text-sage font-bold tracking-wider">
                OVERVIEW
              </h4>
              <ul className="space-y-1.5 text-sage-muted text-[11px]">
                <li><span className="text-sage-muted">WHAT WE DO</span></li>
                <li><span className="text-sage-muted">HOURLY RESERVATION</span></li>
                <li><span className="text-sage-muted">GATE CLEARANCE</span></li>
                <li><span className="text-sage-muted">SECURITY LOGS</span></li>
              </ul>
            </div>

            {/* Column 3: FOR MEMBERS */}
            <div className="space-y-2.5">
              <h4 className="font-display text-xl text-sage font-bold tracking-wider">
                PORTALS
              </h4>
              <ul className="space-y-1.5 text-sage-muted text-[11px]">
                <li><span className="text-sage-muted">CUSTOMER HUB</span></li>
                <li><span className="text-sage-muted">GATE GUARD DESK</span></li>
                <li><span className="text-sage-muted">OPERATOR CONSOLE</span></li>
                <li><span className="text-sage-muted">ADMIN CONTROL</span></li>
              </ul>
            </div>

            {/* Column 4: NAVIGATION */}
            <div className="space-y-2.5">
              <h4 className="font-display text-xl text-sage font-bold tracking-wider">
                NAVIGATION
              </h4>
              <ul className="space-y-1.5 text-sage-muted text-[11px]">
                <li><button onClick={() => handleNavChange('Home')} className="hover:text-sage">HOME</button></li>
                <li><button onClick={() => handleNavChange('Facility Map')} className="hover:text-sage">FACILITY MAP</button></li>
                <li><button onClick={() => handleNavChange('Rates')} className="hover:text-sage">RATES (₹)</button></li>
                <li><button onClick={() => handleNavChange('About')} className="hover:text-sage">ABOUT</button></li>
              </ul>
            </div>

          </div>

          {/* Minimalist Bottom Copyright Line */}
          <div className="pt-6 flex flex-col sm:flex-row justify-between items-center text-[11px] font-heading uppercase tracking-widest text-sage-muted gap-2">
            <div>
              SMART PARKING FACILITY &copy; 2026 &bull; ALL RIGHTS RESERVED
            </div>
            <div>
              HOURLY AUTOMATED BILLING (INR &bull; &inr;)
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
