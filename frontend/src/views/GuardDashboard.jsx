import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Search, CheckCircle2, AlertTriangle, XCircle, Clock, History, ArrowRight } from 'lucide-react';

export default function GuardDashboard() {
  const { authFetch, user } = useAuth();

  const [query, setQuery] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  
  // Gate activity feed
  const [gateActivity, setGateActivity] = useState([]);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setResult(null);

    if (!query.trim()) {
      setErrorMsg('Please enter a license plate number or Booking ID.');
      return;
    }

    setVerifying(true);
    try {
      const res = await authFetch('/api/guard/verify', {
        method: 'POST',
        body: JSON.stringify({ query: query.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Verification query failed');
      }
      setResult(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleOpenGate = async () => {
    if (!result || !result.reservation || !result.actionType) return;

    setActionLoading(true);
    try {
      const res = await authFetch('/api/guard/action', {
        method: 'POST',
        body: JSON.stringify({
          reservationId: result.reservation.id,
          action: result.actionType
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gate action failed');
      }

      // Record in recent gate activity
      const newActivity = {
        id: Date.now(),
        reservationId: result.reservation.id,
        plate: result.reservation.license_plate,
        slot: `Floor ${result.reservation.floor_number} • ${result.reservation.slot_number}`,
        action: result.actionType === 'check-in' ? 'Check-In (Arrival)' : 'Check-Out (Departure)',
        timestamp: new Date().toLocaleTimeString(),
        status: data.status
      };
      setGateActivity(prev => [newActivity, ...prev.slice(0, 9)]);

      // Update current card view
      setResult(prev => ({
        ...prev,
        isValid: false,
        actionCompleted: true,
        successMessage: data.message,
        reservation: {
          ...prev.reservation,
          status: data.status
        }
      }));

    } catch (err) {
      alert(`Gate Action Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 sm:space-y-12">
      
      {/* Header Banner - Poster styled matching Beach Volley palette */}
      <div className="bg-sage-faint border border-sage-border p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 text-motto mb-1 font-heading text-xs uppercase tracking-widest font-bold">
            <ShieldCheck className="w-4 h-4 text-sage" />
            <span>GATE CLEARANCE &bull; SECURITY ACCESS POINT</span>
          </div>
          <h1 className="font-display font-black text-5xl sm:text-7xl uppercase tracking-tight text-sage leading-none">
            GATE VERIFICATION
          </h1>
          <p className="text-body text-xs sm:text-sm mt-2 max-w-xl font-normal uppercase tracking-wider">
            VERIFY RESERVATIONS AGAINST REAL-TIME FACILITY CLOCK AND OPERATE SECURITY BARRIERS.
          </p>
        </div>

        {/* Live Facility Clock Badge */}
        <div className="bg-white border border-sage-border px-6 py-3.5 text-right">
          <div className="text-[10px] uppercase tracking-widest text-sage font-heading font-bold flex items-center justify-end">
            <Clock className="w-3.5 h-3.5 mr-1" /> FACILITY TIME
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold tracking-wider text-slate-800 mt-0.5">
            {currentTime}
          </div>
        </div>
      </div>

      {/* Input Verification Screen - Flat Minimalist Card */}
      <div className="bg-white border border-sage-border p-6 sm:p-8 space-y-6">
        <div className="border-b border-dotted border-sage-border pb-3">
          <h2 className="font-display font-bold text-3xl uppercase tracking-wider text-sage">
            VEHICLE ARRIVAL & DEPARTURE CHECK
          </h2>
          <p className="text-xs text-body uppercase tracking-wider mt-0.5">
            Enter registered license plate number or booking reference number.
          </p>
        </div>

        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-sage-muted">
              <Search className="w-5 h-5 text-sage" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ENTER LICENSE PLATE (E.G. KA-01-AB-1234) OR BOOKING ID"
              className="w-full pl-12 pr-4 py-3 bg-sage-faint border border-sage-border text-sm font-mono uppercase focus:bg-white focus:outline-none focus:border-sage transition text-slate-800 placeholder:text-slate-600"
            />
          </div>
          <button
            type="submit"
            disabled={verifying}
            className="px-8 py-3 bg-sage-block hover:bg-lime hover:text-slate-900 text-white font-heading font-bold tracking-widest uppercase text-xs transition disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <span>{verifying ? 'CHECKING...' : 'VERIFY VEHICLE'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {errorMsg && (
          <div className="p-4 bg-red-50/70 border border-red-200 text-red-700 text-xs flex items-start space-x-3">
            <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
            <div>
              <div className="font-heading font-bold uppercase text-xs tracking-widest">Verification Query Failed</div>
              <div className="text-xs mt-0.5">{errorMsg}</div>
            </div>
          </div>
        )}

        {/* Verification Result Card */}
        {result && (
          <div className="border border-sage-border p-6 sm:p-8 bg-sage-faint space-y-6">
            
            {/* Status Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-5 border-b border-dotted border-sage-border">
              <div>
                <span className="text-[11px] font-heading uppercase tracking-widest text-motto font-bold">
                  VERIFICATION STATUS
                </span>
                <div className="text-2xl font-display font-bold text-slate-900 uppercase tracking-wide mt-1">
                  {result.verificationMessage}
                </div>
              </div>

              <div>
                <span className={`px-4 py-1.5 text-xs font-heading uppercase tracking-widest font-bold ${
                  result.reservation.status === 'Checked-In'
                    ? 'bg-lime text-slate-900 border border-lime-dark'
                    : result.reservation.status === 'Pending'
                    ? 'bg-sage-light text-sage border border-sage-border'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}>
                  {result.reservation.status}
                </span>
              </div>
            </div>

            {/* Reservation Data Grid (in INR ₹) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-5 border border-sage-border">
              <div>
                <span className="text-[10px] font-heading uppercase tracking-widest text-slate-600 font-bold">Booking ID</span>
                <div className="text-2xl font-display font-bold text-sage">#{result.reservation.id}</div>
              </div>

              <div>
                <span className="text-[10px] font-heading uppercase tracking-widest text-slate-600 font-bold">Plate Number</span>
                <div className="text-base font-mono font-bold text-slate-800">{result.reservation.license_plate}</div>
              </div>

              <div>
                <span className="text-[10px] font-heading uppercase tracking-widest text-slate-600 font-bold">Assigned Bay</span>
                <div className="text-base font-display font-bold text-slate-800">
                  Floor {result.reservation.floor_number} &bull; {result.reservation.slot_number}
                </div>
                <div className="text-[11px] text-slate-600 font-medium">({result.reservation.slot_type})</div>
              </div>

              <div>
                <span className="text-[10px] font-heading uppercase tracking-widest text-slate-600 font-bold">Customer</span>
                <div className="text-base font-semibold text-slate-800">@{result.reservation.username}</div>
              </div>

              <div className="col-span-2 pt-3 border-t border-dotted border-slate-200">
                <span className="text-[10px] font-heading uppercase tracking-widest text-slate-600 font-bold">Reserved Time Window</span>
                <div className="text-xs text-slate-700 font-mono mt-1">
                  {result.reservation.start_time} <span className="text-slate-600">until</span> {result.reservation.end_time}
                </div>
              </div>

              <div className="col-span-2 pt-3 border-t border-dotted border-slate-200">
                <span className="text-[10px] font-heading uppercase tracking-widest text-slate-600 font-bold">Charge (INR)</span>
                <div className="text-2xl font-display font-black text-sage">₹{result.reservation.total_charge}</div>
              </div>
            </div>

            {/* Action Completed Banner */}
            {result.actionCompleted && (
              <div className="p-5 bg-white border border-lime text-slate-900 flex items-center space-x-3">
                <CheckCircle2 className="w-6 h-6 text-sage flex-shrink-0" />
                <div className="font-heading font-bold uppercase tracking-wider text-sm">
                  {result.successMessage}
                </div>
              </div>
            )}

            {/* Solid Flat Sage/Lime "VALID RESERVATION - OPEN GATE" Button */}
            {result.isValid && !result.actionCompleted && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenGate}
                  disabled={actionLoading}
                  className="w-full py-4 px-6 bg-sage-block hover:bg-lime hover:text-slate-900 text-white font-heading font-bold text-sm uppercase tracking-widest transition flex items-center justify-center space-x-3 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    {actionLoading
                      ? 'PROCESSING GATE...'
                      : result.actionType === 'check-in'
                        ? 'VALID RESERVATION &bull; OPEN GATE (CHECK-IN)'
                        : 'VALID RESERVATION &bull; OPEN GATE (CHECK-OUT)'}
                  </span>
                </button>
                <p className="text-center text-[11px] text-slate-600 mt-2 font-heading uppercase tracking-wider">
                  Updates reservation status to{' '}
                  <span className="font-bold text-slate-700">{result.actionType === 'check-in' ? 'Checked-In' : 'Checked-Out'}</span>{' '}
                  with facility timestamp.
                </p>
              </div>
            )}

            {!result.isValid && !result.actionCompleted && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <div className="font-heading font-bold uppercase tracking-wider text-xs">Automated Clearance Restricted</div>
                  <div className="text-xs mt-0.5">{result.verificationMessage}</div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Recent Gate Activity Log */}
      <div className="bg-white border border-sage-border p-6 sm:p-8 space-y-4">
        <h3 className="font-display font-bold text-2xl text-sage uppercase tracking-wider flex items-center">
          <History className="w-5 h-5 mr-2 text-sage" />
          RECENT GATE OPERATIONS
        </h3>

        {gateActivity.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-600 bg-sage-faint border border-dotted border-sage-border font-heading uppercase tracking-widest">
            No gate actions recorded in this session yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {gateActivity.map((act) => (
              <div key={act.id} className="py-3.5 flex justify-between items-center text-xs">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 ${act.action.includes('Check-In') ? 'bg-sage' : 'bg-lime'}`} />
                  <div>
                    <span className="font-bold font-mono text-slate-800">{act.plate}</span>
                    <span className="text-slate-600 ml-2 font-mono">Booking #{act.reservationId}</span>
                    <span className="text-slate-600 ml-2 font-medium">({act.slot})</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="font-heading uppercase tracking-wider font-bold text-slate-700">{act.action}</span>
                  <span className="text-slate-600 font-mono text-[11px]">{act.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
