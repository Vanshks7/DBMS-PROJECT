import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings, CheckCircle2, XCircle, Search, RefreshCw, Layers, PlusCircle, Clock, ShieldCheck, Zap, ArrowRight } from 'lucide-react';

export default function AdminDashboard() {
  const { authFetch, user } = useAuth();

  // Active Tab: 'overview' | 'approvals' | 'occupancy' | 'walkin' | 'overrides' | 'rates' | 'reservations' | 'logs'
  const [activeTab, setActiveTab] = useState('overview');
  const tabButtonClass = (tab) => `shrink-0 whitespace-nowrap rounded-lg border px-4 py-2.5 text-xs font-heading font-bold uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 ${
    activeTab === tab
      ? '!border-[#3f6755] !bg-[#3f6755] !text-white shadow-sm'
      : 'border-sage-border bg-white text-slate-700 hover:border-sage hover:bg-sage-faint hover:text-sage-dark'
  }`;

  // Overview Data (in INR ₹)
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Pending Account Requests Data
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [approvalMsg, setApprovalMsg] = useState('');

  // Operator Features inside Admin:
  // 1. Real-time 5-Floor Occupancy
  const [occupancy, setOccupancy] = useState(null);
  const [loadingOccupancy, setLoadingOccupancy] = useState(true);

  // 2. Walk-in Booking
  const [walkinPlate, setWalkinPlate] = useState('');
  const [walkinType, setWalkinType] = useState('Car');
  const [walkinHours, setWalkinHours] = useState(2);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [walkinLoading, setWalkinLoading] = useState(false);
  const [walkinSuccess, setWalkinSuccess] = useState(null);
  const [walkinError, setWalkinError] = useState('');

  // 3. Time Overrides / Extensions
  const [extendModalRes, setExtendModalRes] = useState(null);
  const [extraHours, setExtraHours] = useState(1);
  const [extending, setExtending] = useState(false);

  // Rates Data (in INR ₹)
  const [carRate, setCarRate] = useState('50.00');
  const [bikeRate, setBikeRate] = useState('20.00');
  const [evRate, setEvRate] = useState('80.00');
  const [rateSaving, setRateSaving] = useState(false);
  const [rateSuccess, setRateSuccess] = useState(false);

  // Reservations Data
  const [reservations, setReservations] = useState([]);
  const [resLoading, setResLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editRes, setEditRes] = useState(null);

  // System Logs Data
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    fetchOverview();
    fetchPendingUsers();
    fetchRates();
    fetchReservations();
    fetchLogs();
    fetchOccupancy();
  }, []);

  const fetchOverview = async () => {
    setLoadingOverview(true);
    try {
      const res = await authFetch('/api/admin/overview');
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (err) {
      console.error('Error fetching overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchPendingUsers = async () => {
    setLoadingPending(true);
    try {
      const res = await authFetch('/api/admin/users/pending');
      if (res.ok) {
        const data = await res.json();
        setPendingUsers(data);
      }
    } catch (err) {
      console.error('Error fetching pending users:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleApproveUser = async (userId, username) => {
    try {
      const res = await authFetch(`/api/admin/users/${userId}/approve`, { method: 'PATCH' });
      if (res.ok) {
        setApprovalMsg(`Approved account for @${username}. They can now log in.`);
        fetchPendingUsers();
        fetchLogs();
        setTimeout(() => setApprovalMsg(''), 4000);
      }
    } catch (err) {
      alert('Error approving user');
    }
  };

  const handleRejectUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to reject @${username}?`)) return;
    try {
      const res = await authFetch(`/api/admin/users/${userId}/reject`, { method: 'PATCH' });
      if (res.ok) {
        setApprovalMsg(`Rejected request for @${username}.`);
        fetchPendingUsers();
        fetchLogs();
        setTimeout(() => setApprovalMsg(''), 4000);
      }
    } catch (err) {
      alert('Error rejecting user');
    }
  };

  const fetchOccupancy = async () => {
    setLoadingOccupancy(true);
    try {
      const res = await authFetch('/api/slots/occupancy');
      if (res.ok) {
        const data = await res.json();
        setOccupancy(data);
      }
    } catch (err) {
      console.error('Error fetching occupancy:', err);
    } finally {
      setLoadingOccupancy(false);
    }
  };

  const handleCheckWalkinSlots = async () => {
    setWalkinError('');
    const now = new Date();
    const end = new Date(now.getTime() + walkinHours * 60 * 60 * 1000);
    const startStr = now.toISOString().slice(0, 19).replace('T', ' ');
    const endStr = end.toISOString().slice(0, 19).replace('T', ' ');

    try {
      const res = await authFetch(`/api/slots/available?startTime=${encodeURIComponent(startStr)}&endTime=${encodeURIComponent(endStr)}&vehicleType=${walkinType}`);
      const data = await res.json();
      if (res.ok) {
        setAvailableSlots(data.slots || []);
        if (data.slots && data.slots.length > 0) {
          setSelectedSlotId(data.slots[0].id);
        } else {
          setSelectedSlotId('');
          setWalkinError(`No ${walkinType} slots currently available.`);
        }
      }
    } catch (err) {
      setWalkinError(err.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'walkin') {
      handleCheckWalkinSlots();
    }
  }, [walkinType, walkinHours, activeTab]);

  const handleWalkinSubmit = async (e) => {
    e.preventDefault();
    setWalkinSuccess(null);
    setWalkinError('');
    if (!walkinPlate.trim() || !selectedSlotId) {
      setWalkinError('Please enter license plate and select an available slot.');
      return;
    }

    setWalkinLoading(true);
    try {
      const now = new Date();
      const end = new Date(now.getTime() + walkinHours * 60 * 60 * 1000);
      const startStr = now.toISOString().slice(0, 19).replace('T', ' ');
      const endStr = end.toISOString().slice(0, 19).replace('T', ' ');

      const res = await authFetch('/api/reservations', {
        method: 'POST',
        body: JSON.stringify({
          slot_id: parseInt(selectedSlotId, 10),
          license_plate: walkinPlate.trim().toUpperCase(),
          start_time: startStr,
          end_time: endStr
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create walk-in reservation');

      setWalkinSuccess(data.reservation);
      setWalkinPlate('');
      fetchOccupancy();
      fetchReservations();
      fetchOverview();
      handleCheckWalkinSlots();
    } catch (err) {
      setWalkinError(err.message);
    } finally {
      setWalkinLoading(false);
    }
  };

  const handleExtendSubmit = async (e) => {
    e.preventDefault();
    if (!extendModalRes) return;

    setExtending(true);
    try {
      const res = await authFetch(`/api/reservations/${extendModalRes.id}/extend`, {
        method: 'PATCH',
        body: JSON.stringify({ extraHours: parseFloat(extraHours) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extend reservation');

      alert(`Success: Booking #${extendModalRes.id} extended until ${data.newEndTime}. New Total: ₹${data.newTotalCharge}`);
      setExtendModalRes(null);
      fetchReservations();
      fetchOccupancy();
      fetchOverview();
    } catch (err) {
      alert(`Extension Failed: ${err.message}`);
    } finally {
      setExtending(false);
    }
  };

  const fetchRates = async () => {
    try {
      const res = await authFetch('/api/rates');
      if (res.ok) {
        const data = await res.json();
        data.forEach((r) => {
          if (r.vehicle_type === 'Car') setCarRate(parseFloat(r.hourly_rate).toFixed(2));
          if (r.vehicle_type === 'Bike') setBikeRate(parseFloat(r.hourly_rate).toFixed(2));
          if (r.vehicle_type === 'EV') setEvRate(parseFloat(r.hourly_rate).toFixed(2));
        });
      }
    } catch (err) {
      console.error('Error fetching rates:', err);
    }
  };

  const handleSaveRates = async (e) => {
    e.preventDefault();
    setRateSaving(true);
    setRateSuccess(false);

    try {
      const res = await authFetch('/api/rates', {
        method: 'PUT',
        body: JSON.stringify({
          rates: [
            { vehicle_type: 'Car', hourly_rate: parseFloat(carRate) },
            { vehicle_type: 'Bike', hourly_rate: parseFloat(bikeRate) },
            { vehicle_type: 'EV', hourly_rate: parseFloat(evRate) }
          ]
        })
      });
      if (res.ok) {
        setRateSuccess(true);
        setTimeout(() => setRateSuccess(false), 3000);
        fetchLogs();
      } else {
        alert('Failed to update rates');
      }
    } catch (err) {
      alert('Error updating rates');
    } finally {
      setRateSaving(false);
    }
  };

  const fetchReservations = async () => {
    setResLoading(true);
    try {
      let url = '/api/reservations';
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('query', searchQuery);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        setReservations(data);
      }
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setResLoading(false);
    }
  };

  const handleCancelReservation = async (resId) => {
    if (!confirm(`Are you sure you want to cancel reservation #${resId}?`)) return;
    try {
      const res = await authFetch(`/api/reservations/${resId}/cancel`, { method: 'PATCH' });
      if (res.ok) {
        fetchReservations();
        fetchOverview();
        fetchLogs();
      } else {
        alert('Failed to cancel reservation');
      }
    } catch (err) {
      alert('Error cancelling reservation');
    }
  };

  const handleSaveEditRes = async (e) => {
    e.preventDefault();
    if (!editRes) return;
    try {
      const res = await authFetch(`/api/reservations/${editRes.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          license_plate: editRes.license_plate,
          status: editRes.status,
          total_charge: parseFloat(editRes.total_charge)
        })
      });
      if (res.ok) {
        setEditRes(null);
        fetchReservations();
        fetchOverview();
        fetchLogs();
      } else {
        alert('Failed to update reservation');
      }
    } catch (err) {
      alert('Error modifying reservation');
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await authFetch('/api/admin/logs?limit=50');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 sm:space-y-12">
      
      {/* Header Banner - Poster styled matching Beach Volley palette */}
      <div className="bg-sage-faint border border-sage-border p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 text-motto mb-1 font-heading text-xs uppercase tracking-widest font-bold">
              <Settings className="w-4 h-4 text-sage" />
              <span>CENTRAL ADMINISTRATION &bull; FACILITY OVERVIEW</span>
            </div>
            <h1 className="font-display font-black text-5xl sm:text-7xl uppercase tracking-tight text-sage leading-none">
              ADMIN CONTROL
            </h1>
            <p className="text-body text-xs sm:text-sm mt-2 max-w-2xl font-normal uppercase tracking-wider">
              FACILITY REVENUE (₹), 45 BAYS (20 CAR, 20 BIKE, 5 EV CHARGERS), STAFF APPROVALS, & AUDIT TRAILS.
            </p>
          </div>
          
          {pendingUsers.length > 0 && (
            <div className="px-4 py-2 bg-lime border border-lime-dark text-slate-900 text-xs font-heading font-black uppercase tracking-widest flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4" />
              <span>{pendingUsers.length} STAFF APPROVAL(S) PENDING</span>
            </div>
          )}
        </div>

        {/* Keep tabs on one row; allow horizontal scrolling on narrow screens. */}
        <div className="-mx-2 flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain border-t border-dotted border-sage-border px-2 pt-3 pb-1">
          <button
            onClick={() => setActiveTab('overview')}
            aria-pressed={activeTab === 'overview'}
            className={tabButtonClass('overview')}
          >
            REVENUE & OVERVIEW
          </button>
          
          <button
            onClick={() => setActiveTab('approvals')}
            aria-pressed={activeTab === 'approvals'}
            className={tabButtonClass('approvals')}
          >
            <span>STAFF APPROVALS</span>
            {pendingUsers.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-lime text-slate-900 text-[10px] font-black">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('occupancy')}
            aria-pressed={activeTab === 'occupancy'}
            className={tabButtonClass('occupancy')}
          >
            5-FLOOR MAP (45 BAYS)
          </button>

          <button
            onClick={() => setActiveTab('walkin')}
            aria-pressed={activeTab === 'walkin'}
            className={tabButtonClass('walkin')}
          >
            WALK-IN BOOKING
          </button>

          <button
            onClick={() => setActiveTab('overrides')}
            aria-pressed={activeTab === 'overrides'}
            className={tabButtonClass('overrides')}
          >
            TIME OVERRIDES
          </button>

          <button
            onClick={() => setActiveTab('rates')}
            aria-pressed={activeTab === 'rates'}
            className={tabButtonClass('rates')}
          >
            HOURLY RATES (₹)
          </button>

          <button
            onClick={() => setActiveTab('reservations')}
            aria-pressed={activeTab === 'reservations'}
            className={tabButtonClass('reservations')}
          >
            ALL BOOKINGS
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            aria-pressed={activeTab === 'logs'}
            className={tabButtonClass('logs')}
          >
            SYSTEM AUDIT
          </button>
        </div>
      </div>

      {/* TAB 1: REVENUE & OVERVIEW (IN INR ₹) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loadingOverview ? (
            <div className="text-center py-16 text-slate-600 font-mono text-sm">Loading revenue metrics...</div>
          ) : (
            <>
              {/* Revenue Metric Cards (Car, Bike, EV) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-5 border border-sage-border">
                  <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-slate-600">Total Revenue</span>
                  <div className="text-4xl font-display font-black text-slate-900 mt-1">
                    ₹{overview.revenue.total.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 font-heading uppercase tracking-wider">Net active & completed</div>
                </div>

                <div className="bg-white p-5 border border-sage-border">
                  <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-sage">Car Revenue</span>
                  <div className="text-4xl font-display font-black text-sage mt-1">
                    ₹{overview.revenue.car.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 font-heading uppercase tracking-wider">₹50/hr standard rate</div>
                </div>

                <div className="bg-white p-5 border border-sage-border">
                  <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-slate-800">Bike Revenue</span>
                  <div className="text-4xl font-display font-black text-slate-800 mt-1">
                    ₹{overview.revenue.bike.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 font-heading uppercase tracking-wider">₹20/hr standard rate</div>
                </div>

                <div className="bg-white p-5 border border-sage-border">
                  <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-lime-ink flex items-center">
                    <Zap className="w-3.5 h-3.5 mr-1" />
                    EV Charging
                  </span>
                  <div className="text-4xl font-display font-black text-lime-ink mt-1">
                    ₹{overview.revenue.ev ? overview.revenue.ev.toFixed(2) : '0.00'}
                  </div>
                  <div className="text-xs text-slate-700 mt-1 font-heading uppercase tracking-wider">₹80/hr charging bays</div>
                </div>

                <div className="bg-white p-5 border border-sage-border">
                  <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-slate-700">Today's Total</span>
                  <div className="text-4xl font-display font-black text-slate-900 mt-1">
                    ₹{overview.revenue.today.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 font-heading uppercase tracking-wider">Bookings placed today</div>
                </div>
              </div>

              {/* Bookings Status Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-white p-6 border border-sage-border text-center">
                <div className="p-4 bg-sage-faint border border-slate-100">
                  <span className="text-xs font-heading font-bold uppercase tracking-widest text-slate-600">Total Bookings</span>
                  <div className="text-3xl font-display font-black text-slate-900 mt-1">{overview.bookings.totalBookings}</div>
                </div>
                <div className="p-4 bg-amber-50/70 border border-amber-200">
                  <span className="text-xs font-heading font-bold uppercase tracking-widest text-amber-800">Pending</span>
                  <div className="text-3xl font-display font-black text-amber-800 mt-1">{overview.bookings.pendingBookings}</div>
                </div>
                <div className="p-4 bg-lime/20 border border-lime">
                  <span className="text-xs font-heading font-bold uppercase tracking-widest text-slate-900">Checked-In</span>
                  <div className="text-3xl font-display font-black text-slate-900 mt-1">{overview.bookings.checkedInBookings}</div>
                </div>
                <div className="p-4 bg-sage-light border border-sage-border">
                  <span className="text-xs font-heading font-bold uppercase tracking-widest text-sage">Completed</span>
                  <div className="text-3xl font-display font-black text-sage mt-1">{overview.bookings.completedBookings}</div>
                </div>
                <div className="p-4 bg-red-50/70 border border-red-200">
                  <span className="text-xs font-heading font-bold uppercase tracking-widest text-red-700">Cancelled</span>
                  <div className="text-3xl font-display font-black text-red-700 mt-1">{overview.bookings.cancelledBookings}</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: STAFF ACCOUNT APPROVALS (GUARD & OPERATOR) */}
      {activeTab === 'approvals' && (
        <div className="bg-white p-6 sm:p-8 border border-sage-border space-y-6">
          <div className="flex justify-between items-center pb-5 border-b border-dotted border-sage-border">
            <div>
              <h2 className="font-display font-bold text-3xl uppercase tracking-wider text-sage">
                STAFF ACCOUNT APPROVAL REQUESTS
              </h2>
              <p className="text-xs text-body uppercase tracking-wider mt-0.5">
                New Guard and Operator accounts require Admin authorization. Customer accounts activate immediately.
              </p>
            </div>
            <button
              onClick={fetchPendingUsers}
              className="text-xs font-heading font-bold uppercase tracking-widest text-sage hover:text-slate-900 px-4 py-2 border border-sage-border hover:bg-sage-faint transition flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              <span>Refresh</span>
            </button>
          </div>

          {approvalMsg && (
            <div className="p-4 bg-sage-light border border-sage-border text-slate-800 text-xs font-bold uppercase tracking-widest font-heading flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-sage" />
              <span>{approvalMsg}</span>
            </div>
          )}

          {loadingPending ? (
            <div className="text-center py-16 text-slate-600 font-mono text-sm">Loading staff requests...</div>
          ) : pendingUsers.length === 0 ? (
            <div className="text-center py-12 bg-sage-faint border border-dotted border-sage-border text-slate-600">
              <CheckCircle2 className="w-8 h-8 text-sage mx-auto mb-2" />
              <p className="font-heading font-bold uppercase tracking-widest text-sm text-slate-700">No Pending Staff Requests</p>
              <p className="text-xs text-slate-600 mt-1 font-heading uppercase">All staff registration requests are currently resolved.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-sage-border font-heading font-bold text-slate-600 uppercase tracking-widest text-[11px]">
                    <th className="py-3 px-3">ID</th>
                    <th className="py-3 px-3">USERNAME / EMAIL</th>
                    <th className="py-3 px-3">REQUESTED ROLE</th>
                    <th className="py-3 px-3">SUBMITTED AT</th>
                    <th className="py-3 px-3">STATUS</th>
                    <th className="py-3 px-3 text-right">APPROVAL ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-sage-faint/60 transition">
                      <td className="py-3.5 px-3 font-display text-base font-bold text-sage">#{u.id}</td>
                      <td className="py-3.5 px-3 font-bold text-slate-900">{u.username}</td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-1 font-heading font-bold uppercase text-[10px] tracking-widest ${
                          u.role === 'operator' ? 'bg-sage-light text-sage border border-sage-border' : 'bg-lime text-slate-900 border border-lime-dark'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 font-mono">{u.created_at}</td>
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 font-heading font-bold bg-amber-50 text-amber-800 border border-amber-200 text-[10px] uppercase tracking-widest">
                          Pending Approval
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right space-x-2">
                        <button
                          onClick={() => handleApproveUser(u.id, u.username)}
                          className="px-4 py-1.5 bg-sage-block hover:bg-lime hover:text-slate-900 text-white font-heading font-bold uppercase tracking-widest text-xs transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectUser(u.id, u.username)}
                          className="px-4 py-1.5 bg-white hover:bg-red-50 text-red-600 font-heading font-bold uppercase tracking-widest text-xs border border-red-200 transition"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: 5-FLOOR REAL-TIME OCCUPANCY (45 TOTAL SLOTS) */}
      {activeTab === 'occupancy' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-6 border border-sage-border">
            <div>
              <h2 className="font-display font-bold text-3xl uppercase tracking-wider text-sage">
                LIVE 5-FLOOR OCCUPANCY (45 TOTAL BAYS)
              </h2>
              <p className="text-xs text-body uppercase tracking-wider mt-0.5">
                Each floor holds 4 Car bays, 4 Bike bays, and 1 dedicated EV Charging Bay (E1).
              </p>
            </div>
            <button
              onClick={fetchOccupancy}
              className="p-2.5 text-slate-600 hover:text-sage bg-sage-faint border border-sage-border transition"
              title="Refresh Map"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {loadingOccupancy ? (
              <div className="text-center py-16 text-slate-600 font-mono text-sm">Loading live facility map...</div>
            ) : (
              occupancy?.floors.map((floor) => (
                <div key={floor.floor_number} className="bg-white border border-sage-border p-6 space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-dotted border-sage-border">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-sage-block text-white font-display font-bold flex items-center justify-center text-xs">
                        F{floor.floor_number}
                      </div>
                      <span className="font-display font-bold text-2xl text-slate-900 uppercase tracking-wider">
                        Floor {floor.floor_number}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs font-heading font-bold uppercase tracking-widest">
                      <span className="text-slate-700 bg-sage-faint border border-sage-border px-3 py-1">Cars: {floor.car.occupied}/4</span>
                      <span className="text-slate-700 bg-sage-faint border border-sage-border px-3 py-1">Bikes: {floor.bike.occupied}/4</span>
                      <span className="text-slate-900 bg-lime border border-lime-dark px-3 py-1 font-black">
                        ⚡ EV: {floor.ev.occupied}/1
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-9 gap-3">
                    {floor.slots.map((slot) => {
                      const isOccupied = slot.isOccupied;
                      const isCheckedIn = slot.status === 'Checked-In';
                      const isPending = slot.status === 'Pending';
                      const isEV = slot.slot_type === 'EV';

                      let badgeStyle = isEV
                        ? 'bg-lime/10 border-lime text-slate-900'
                        : 'bg-sage-faint border-sage-border text-slate-800';

                      if (isCheckedIn) badgeStyle = 'bg-rose-50/70 border-rose-300 text-rose-900';
                      else if (isPending) badgeStyle = 'bg-amber-50/70 border-amber-300 text-amber-900';

                      return (
                        <div key={slot.id} className={`p-3 border text-center transition ${badgeStyle}`}>
                          <div className="flex justify-between items-center text-[10px] font-heading font-bold uppercase tracking-wider text-slate-600 mb-1">
                            <span className={isEV ? 'text-lime-ink font-black flex items-center' : ''}>
                              {isEV && <Zap className="w-3 h-3 mr-0.5" />}
                              {slot.slot_type}
                            </span>
                            <span className={`w-2 h-2 ${isCheckedIn ? 'bg-rose-500' : isPending ? 'bg-amber-500' : 'bg-sage'}`} />
                          </div>
                          <div className="text-xl font-display font-black text-slate-900">{slot.slot_number}</div>
                          <div className="mt-1.5 text-[10px] font-mono truncate">
                            {isOccupied && slot.activeBooking ? slot.activeBooking.license_plate : 'Free'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MANUAL WALK-IN BOOKING */}
      {activeTab === 'walkin' && (
        <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 border border-sage-border space-y-6">
          <div className="flex items-center space-x-3 pb-5 border-b border-dotted border-sage-border">
            <PlusCircle className="w-6 h-6 text-sage" />
            <div>
              <h2 className="font-display font-bold text-3xl uppercase tracking-wider text-sage">
                MANUAL WALK-IN (ADMIN OVERRIDE)
              </h2>
              <p className="text-xs text-body uppercase tracking-wider mt-0.5">
                Issue immediate parking tickets for vehicles arriving without prior booking.
              </p>
            </div>
          </div>

          {walkinSuccess && (
            <div className="p-5 bg-sage-light border border-sage-border text-slate-800 space-y-3 font-heading uppercase text-xs">
              <div className="font-display font-bold text-xl uppercase text-sage">Walk-in Reservation Created!</div>
              <div className="grid grid-cols-2 gap-2 bg-white p-3 border border-sage-border font-mono">
                <div>Booking ID: <strong className="text-sage">#{walkinSuccess.id}</strong></div>
                <div>Plate: <strong>{walkinSuccess.license_plate}</strong></div>
                <div>Floor {walkinSuccess.floor_number} • Slot {walkinSuccess.slot_number}</div>
                <div>Charge: <strong className="text-sage">₹{walkinSuccess.total_charge}</strong></div>
              </div>
            </div>
          )}

          {walkinError && (
            <div className="p-4 bg-red-50/70 border border-red-200 text-red-700 text-xs font-heading uppercase">{walkinError}</div>
          )}

          <form onSubmit={handleWalkinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1.5">Plate Number</label>
              <input
                type="text"
                value={walkinPlate}
                onChange={(e) => setWalkinPlate(e.target.value)}
                placeholder="E.G. DL-04-XY-9876"
                className="w-full px-4 py-2.5 bg-sage-faint border border-sage-border text-sm font-mono uppercase focus:bg-white focus:outline-none focus:border-sage transition text-slate-800"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1.5">Type</label>
                <select
                  value={walkinType}
                  onChange={(e) => setWalkinType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-sage-faint border border-sage-border text-xs font-heading font-bold uppercase tracking-wider focus:bg-white focus:outline-none focus:border-sage text-slate-800"
                >
                  <option value="Car">Car (₹{carRate}/hr)</option>
                  <option value="Bike">Bike (₹{bikeRate}/hr)</option>
                  <option value="EV">EV Charging Bay (₹{evRate}/hr)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1.5">Duration</label>
                <select
                  value={walkinHours}
                  onChange={(e) => setWalkinHours(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2.5 bg-sage-faint border border-sage-border text-xs font-heading font-bold uppercase tracking-wider focus:bg-white focus:outline-none focus:border-sage text-slate-800"
                >
                  <option value="1">1 Hour</option>
                  <option value="2">2 Hours</option>
                  <option value="3">3 Hours</option>
                  <option value="4">4 Hours</option>
                  <option value="8">8 Hours</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1.5">
                Select Open Slot ({availableSlots.length} available)
              </label>
              <select
                value={selectedSlotId}
                onChange={(e) => setSelectedSlotId(e.target.value)}
                className="w-full px-3 py-2.5 bg-sage-faint border border-sage-border text-xs font-heading font-bold uppercase tracking-wider focus:bg-white focus:outline-none focus:border-sage text-slate-800"
                required
              >
                {availableSlots.map((s) => (
                  <option key={s.id} value={s.id}>
                    Floor {s.floor_number} — Slot {s.slot_number} ({s.slot_type === 'EV' ? '⚡ EV Charging' : s.slot_type})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={walkinLoading || availableSlots.length === 0}
                className="w-full py-3.5 bg-sage-block hover:bg-lime hover:text-slate-900 text-white font-heading font-bold text-xs tracking-widest uppercase transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <span>{walkinLoading ? 'BOOKING...' : 'CONFIRM WALK-IN RESERVATION'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: TIME EXTENSION OVERRIDES */}
      {activeTab === 'overrides' && (
        <div className="bg-white p-6 sm:p-8 border border-sage-border space-y-6">
          <div className="flex justify-between items-center pb-5 border-b border-dotted border-sage-border">
            <div>
              <h2 className="font-display font-bold text-3xl uppercase tracking-wider text-sage">
                PARKING TIME OVERRIDE (LATE ARRIVALS)
              </h2>
              <p className="text-xs text-body uppercase tracking-wider mt-0.5">Extend customer parking duration if they are running behind schedule</p>
            </div>
            <button
              onClick={fetchReservations}
              className="text-xs font-heading font-bold uppercase tracking-widest text-sage hover:text-slate-900 px-4 py-2 border border-sage-border hover:bg-sage-faint transition"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-sage-border font-heading font-bold text-slate-600 uppercase tracking-widest text-[11px]">
                  <th className="py-3 px-3">ID</th>
                  <th className="py-3 px-3">PLATE</th>
                  <th className="py-3 px-3">SLOT</th>
                  <th className="py-3 px-3">CUSTOMER</th>
                  <th className="py-3 px-3">END TIME</th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservations.filter(r => r.status === 'Checked-In' || r.status === 'Pending').map((r) => (
                  <tr key={r.id} className="hover:bg-sage-faint/60 transition">
                    <td className="py-3 px-3 font-display text-base font-bold text-sage">#{r.id}</td>
                    <td className="py-3 px-3 font-bold font-mono text-slate-900">{r.license_plate}</td>
                    <td className="py-3 px-3 font-heading uppercase">
                      Floor {r.floor_number} • {r.slot_number} ({r.slot_type === 'EV' ? '⚡ EV' : r.slot_type})
                    </td>
                    <td className="py-3 px-3 text-slate-600">@{r.username}</td>
                    <td className="py-3 px-3 font-mono text-[11px]">{r.end_time}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-1 font-heading font-bold text-[10px] uppercase tracking-widest ${
                        r.status === 'Checked-In' ? 'bg-lime text-slate-900 border border-lime-dark' : 'bg-sage-light text-sage border border-sage-border'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setExtendModalRes(r)}
                        className="px-3 py-1 bg-sage-light hover:bg-lime text-slate-900 font-heading font-bold text-xs uppercase tracking-widest border border-sage-border transition"
                      >
                        Extend Time
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Extend Modal */}
          {extendModalRes && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white max-w-sm w-full p-6 sm:p-8 border border-sage-border space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-display font-bold text-2xl text-sage uppercase tracking-wider">Extend Booking #{extendModalRes.id}</h3>
                  <button onClick={() => setExtendModalRes(null)} className="text-slate-600 font-bold">✕</button>
                </div>

                <form onSubmit={handleExtendSubmit} className="space-y-4">
                  <div className="p-3 bg-sage-faint text-xs space-y-1 font-mono border border-sage-border">
                    <div>Vehicle: <strong>{extendModalRes.license_plate}</strong></div>
                    <div>Current End: <strong>{extendModalRes.end_time}</strong></div>
                  </div>

                  <div>
                    <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1">Additional Hours</label>
                    <select
                      value={extraHours}
                      onChange={(e) => setExtraHours(e.target.value)}
                      className="w-full px-3 py-2 border border-sage-border text-xs font-heading uppercase tracking-wider font-bold"
                    >
                      <option value="1">+1 Hour</option>
                      <option value="2">+2 Hours</option>
                      <option value="3">+3 Hours</option>
                    </select>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={() => setExtendModalRes(null)} className="px-4 py-2 text-xs font-heading font-bold uppercase tracking-widest text-slate-600">Cancel</button>
                    <button type="submit" disabled={extending} className="px-5 py-2 bg-sage-block hover:bg-lime hover:text-slate-900 text-white font-heading font-bold text-xs uppercase tracking-widest transition">
                      {extending ? 'Updating...' : 'Save Extension'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: HOURLY CHARGING RATES MODIFIER (CAR, BIKE, EV) */}
      {activeTab === 'rates' && (
        <div className="max-w-xl mx-auto bg-white p-6 sm:p-8 border border-sage-border space-y-6">
          <div className="flex items-center space-x-3 pb-5 border-b border-dotted border-sage-border">
            <span className="text-3xl font-display font-black text-sage">₹</span>
            <div>
              <h2 className="font-display font-bold text-3xl uppercase tracking-wider text-sage">
                MODIFY HOURLY RATES (INR ₹)
              </h2>
              <p className="text-xs text-body uppercase tracking-wider mt-0.5">Updated rates apply immediately to all subsequent reservations</p>
            </div>
          </div>

          {rateSuccess && (
            <div className="p-4 bg-sage-light border border-sage-border text-slate-800 text-xs font-heading font-bold uppercase tracking-widest flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-sage" />
              <span>Hourly rates in INR (₹) updated and logged to audit trail!</span>
            </div>
          )}

          <form onSubmit={handleSaveRates} className="space-y-5">
            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1.5">
                Car Hourly Rate (₹)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-600 font-bold">₹</span>
                <input
                  type="number"
                  step="1"
                  min="5"
                  value={carRate}
                  onChange={(e) => setCarRate(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-sage-faint border border-sage-border text-base font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-sage transition"
                  required
                />
              </div>
              <span className="text-[11px] text-slate-600 font-heading uppercase tracking-wider">Standard baseline: ₹50.00 / hour</span>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1.5">
                Bike Hourly Rate (₹)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-600 font-bold">₹</span>
                <input
                  type="number"
                  step="1"
                  min="2"
                  value={bikeRate}
                  onChange={(e) => setBikeRate(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-sage-faint border border-sage-border text-base font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-sage transition"
                  required
                />
              </div>
              <span className="text-[11px] text-slate-600 font-heading uppercase tracking-wider">Standard baseline: ₹20.00 / hour</span>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-widest text-lime-ink mb-1.5 flex items-center">
                <Zap className="w-4 h-4 mr-1 text-lime-ink" />
                EV Charging Slot Hourly Rate (₹)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-600 font-bold">₹</span>
                <input
                  type="number"
                  step="1"
                  min="5"
                  value={evRate}
                  onChange={(e) => setEvRate(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-sage-faint border border-sage-border text-base font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-sage transition"
                  required
                />
              </div>
              <span className="text-[11px] text-slate-600 font-heading uppercase tracking-wider">Standard baseline: ₹80.00 / hour (Includes EV Charger)</span>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={rateSaving}
                className="w-full py-3.5 bg-sage-block hover:bg-lime hover:text-slate-900 text-white font-heading font-bold text-xs uppercase tracking-widest transition disabled:opacity-50"
              >
                {rateSaving ? 'SAVING UPDATES...' : 'UPDATE & SAVE RATES (INR ₹)'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 7: ALL RESERVATIONS VIEW & MODIFICATION */}
      {activeTab === 'reservations' && (
        <div className="bg-white p-6 sm:p-8 border border-sage-border space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-dotted border-sage-border">
            <div>
              <h2 className="font-display font-bold text-3xl uppercase tracking-wider text-sage">
                MANAGE ALL RESERVATIONS
              </h2>
              <p className="text-xs text-body uppercase tracking-wider mt-0.5">View, modify, or cancel any active, pending, or past reservation</p>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); }}
                className="px-3 py-2 border border-sage-border text-xs font-heading uppercase font-bold"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Checked-In">Checked-In</option>
                <option value="Checked-Out">Checked-Out</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <input
                type="text"
                placeholder="Search plate or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 border border-sage-border text-xs w-36 sm:w-48 font-mono uppercase"
              />

              <button
                onClick={fetchReservations}
                className="px-4 py-2 bg-sage-block hover:bg-lime hover:text-slate-900 text-white text-xs font-heading font-bold uppercase tracking-widest transition"
              >
                Search
              </button>
            </div>
          </div>

          {resLoading ? (
            <div className="text-center py-16 text-slate-600 font-mono text-sm">Loading reservations...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-sage-border font-heading font-bold text-slate-600 uppercase tracking-widest text-[11px]">
                    <th className="py-3.5 px-3">ID</th>
                    <th className="py-3.5 px-3">USER</th>
                    <th className="py-3.5 px-3">PLATE</th>
                    <th className="py-3.5 px-3">SLOT</th>
                    <th className="py-3.5 px-3">WINDOW</th>
                    <th className="py-3.5 px-3">CHARGE (₹)</th>
                    <th className="py-3.5 px-3">STATUS</th>
                    <th className="py-3.5 px-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reservations.map((r) => (
                    <tr key={r.id} className="hover:bg-sage-faint/60 transition">
                      <td className="py-3.5 px-3 font-display text-base font-bold text-sage">#{r.id}</td>
                      <td className="py-3.5 px-3 font-medium text-slate-800">@{r.username}</td>
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900">{r.license_plate}</td>
                      <td className="py-3.5 px-3 font-heading uppercase">
                        Floor {r.floor_number} • {r.slot_number} ({r.slot_type === 'EV' ? '⚡ EV' : r.slot_type})
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 font-mono text-[11px]">
                        <div>{r.start_time}</div>
                        <div className="text-slate-600">to {r.end_time}</div>
                      </td>
                      <td className="py-3.5 px-3 font-display text-base font-bold text-slate-900">₹{r.total_charge}</td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-1 font-heading font-bold text-[10px] uppercase tracking-widest ${
                          r.status === 'Checked-In'
                            ? 'bg-lime text-slate-900 border border-lime-dark'
                            : r.status === 'Pending'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : r.status === 'Cancelled'
                            ? 'bg-red-50 text-red-800 border border-red-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right space-x-2">
                        <button
                          onClick={() => setEditRes(r)}
                          className="px-3 py-1 bg-sage-light hover:bg-lime text-slate-900 font-heading font-bold uppercase tracking-widest text-[10px] border border-sage-border transition"
                        >
                          Edit
                        </button>
                        {r.status !== 'Cancelled' && (
                          <button
                            onClick={() => handleCancelReservation(r.id)}
                            className="px-3 py-1 bg-white hover:bg-red-50 text-red-600 font-heading font-bold uppercase tracking-widest text-[10px] border border-red-200 transition"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Edit Modal */}
          {editRes && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white max-w-md w-full p-6 sm:p-8 border border-sage-border space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-display font-bold text-2xl text-sage uppercase tracking-wider">
                    Modify Reservation #{editRes.id}
                  </h3>
                  <button onClick={() => setEditRes(null)} className="text-slate-600 font-bold">✕</button>
                </div>

                <form onSubmit={handleSaveEditRes} className="space-y-4">
                  <div>
                    <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1">License Plate</label>
                    <input
                      type="text"
                      value={editRes.license_plate}
                      onChange={(e) => setEditRes({ ...editRes, license_plate: e.target.value })}
                      className="w-full px-3 py-2 bg-sage-faint border border-sage-border text-sm font-mono uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1">Status</label>
                    <select
                      value={editRes.status}
                      onChange={(e) => setEditRes({ ...editRes, status: e.target.value })}
                      className="w-full px-3 py-2 bg-sage-faint border border-sage-border text-xs font-heading font-bold uppercase tracking-wider"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Checked-In">Checked-In</option>
                      <option value="Checked-Out">Checked-Out</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1">Total Charge (₹)</label>
                    <input
                      type="number"
                      step="1"
                      value={editRes.total_charge}
                      onChange={(e) => setEditRes({ ...editRes, total_charge: e.target.value })}
                      className="w-full px-3 py-2 bg-sage-faint border border-sage-border text-sm font-bold"
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditRes(null)}
                      className="px-4 py-2 text-xs font-heading font-bold uppercase tracking-widest text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-sage-block hover:bg-lime hover:text-slate-900 text-white font-heading font-bold text-xs uppercase tracking-widest transition"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 8: SYSTEM AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white p-6 sm:p-8 border border-sage-border space-y-6">
          <div className="flex justify-between items-center pb-5 border-b border-dotted border-sage-border">
            <div>
              <h2 className="font-display font-bold text-3xl uppercase tracking-wider text-sage">
                SYSTEM AUDIT LOGS
              </h2>
              <p className="text-xs text-body uppercase tracking-wider mt-0.5">Track approvals, operations, logins, gate actions, extensions, and rates</p>
            </div>
            <button
              onClick={fetchLogs}
              className="text-xs font-heading font-bold uppercase tracking-widest text-sage hover:text-slate-900 px-4 py-2 border border-sage-border hover:bg-sage-faint transition flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              <span>Refresh Logs</span>
            </button>
          </div>

          {logsLoading ? (
            <div className="text-center py-16 text-slate-600 font-mono text-sm">Loading audit trail...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-slate-600 font-mono text-xs">No logs recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {logs.map((log) => (
                <div key={log.id} className="py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-start space-x-3">
                    <span className="px-2.5 py-1 font-mono font-bold bg-sage-light border border-sage-border text-sage text-[11px]">
                      {log.action}
                    </span>
                    <span className="text-slate-800 font-medium">{log.details}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-600 flex-shrink-0">
                    {log.username && (
                      <span className="text-sage font-bold font-heading">@{log.username}</span>
                    )}
                    <span className="font-mono text-[11px]">{log.created_at}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
