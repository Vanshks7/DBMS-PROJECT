import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layers, PlusCircle, Clock, AlertCircle, CheckCircle2, Car, Bike, Zap, RefreshCw, ArrowRight } from 'lucide-react';

export default function OperatorDashboard() {
  const { authFetch, user } = useAuth();

  const [activeTab, setActiveTab] = useState('occupancy'); // 'occupancy' | 'walkin' | 'active'

  // Real-time Occupancy State
  const [occupancy, setOccupancy] = useState(null);
  const [loadingOccupancy, setLoadingOccupancy] = useState(true);

  // Walk-in Booking State
  const [walkinPlate, setWalkinPlate] = useState('');
  const [walkinType, setWalkinType] = useState('Car'); // 'Car' | 'Bike' | 'EV'
  const [walkinHours, setWalkinHours] = useState(2);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [walkinLoading, setWalkinLoading] = useState(false);
  const [walkinSuccess, setWalkinSuccess] = useState(null);
  const [walkinError, setWalkinError] = useState('');

  // Active Reservations / Overrides State
  const [reservations, setReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [extendModalRes, setExtendModalRes] = useState(null);
  const [extraHours, setExtraHours] = useState(1);
  const [extending, setExtending] = useState(false);

  // Facility Rates in INR
  const [rates, setRates] = useState({ Car: 50, Bike: 20, EV: 80 });

  useEffect(() => {
    fetchOccupancy();
    fetchReservations();
    fetchRates();
  }, []);

  const fetchRates = async () => {
    try {
      const res = await authFetch('/api/rates');
      if (res.ok) {
        const data = await res.json();
        const rMap = {};
        data.forEach(r => { rMap[r.vehicle_type] = parseFloat(r.hourly_rate); });
        setRates(prev => ({ ...prev, ...rMap }));
      }
    } catch (e) {}
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

  const fetchReservations = async () => {
    setLoadingReservations(true);
    try {
      const res = await authFetch('/api/reservations?status=Checked-In,Pending');
      if (res.ok) {
        const data = await res.json();
        setReservations(data);
      }
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setLoadingReservations(false);
    }
  };

  // Search available slots for walk-in customer
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
          setWalkinError(`No ${walkinType} slots available right now.`);
        }
      } else {
        setWalkinError(data.error || 'Failed to check available slots');
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

  // Submit manual walk-in booking
  const handleWalkinSubmit = async (e) => {
    e.preventDefault();
    setWalkinSuccess(null);
    setWalkinError('');

    if (!walkinPlate.trim() || !selectedSlotId) {
      setWalkinError('Please provide license plate and select an available slot.');
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
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create walk-in reservation');
      }

      setWalkinSuccess(data.reservation);
      setWalkinPlate('');
      fetchOccupancy();
      fetchReservations();
      handleCheckWalkinSlots();
    } catch (err) {
      setWalkinError(err.message);
    } finally {
      setWalkinLoading(false);
    }
  };

  // Extend parking time override
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
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extend reservation');
      }

      alert(`Success: Booking #${extendModalRes.id} extended until ${data.newEndTime}. New total: ₹${data.newTotalCharge}`);
      setExtendModalRes(null);
      fetchReservations();
      fetchOccupancy();
    } catch (err) {
      alert(`Extension Failed: ${err.message}`);
    } finally {
      setExtending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 sm:space-y-12">
      
      {/* Header Banner - Poster styled matching Beach Volley palette */}
      <div className="bg-sage-faint border border-sage-border p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 text-motto mb-1 font-heading text-xs uppercase tracking-widest font-bold">
            <Layers className="w-4 h-4 text-sage" />
            <span>OPERATIONAL MANAGEMENT &bull; 45 MONITORED BAYS</span>
          </div>
          <h1 className="font-display font-black text-5xl sm:text-7xl uppercase tracking-tight text-sage leading-none">
            FACILITY OPERATIONS
          </h1>
          <p className="text-body text-xs sm:text-sm mt-2 max-w-xl font-normal uppercase tracking-wider">
            REAL-TIME OCCUPANCY MONITORING ACROSS 5 FLOORS, WALK-IN TICKETING, AND TIME OVERRIDES.
          </p>
        </div>

        {/* Tab Switcher - Flat rectangular buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('occupancy')}
            className={`px-5 py-2.5 text-xs font-heading font-bold uppercase tracking-widest transition ${
              activeTab === 'occupancy'
                ? 'bg-sage-block text-white'
                : 'bg-white text-slate-700 hover:text-sage hover:bg-sage-faint border border-sage-border'
            }`}
          >
            LIVE MAP (45 BAYS)
          </button>
          <button
            onClick={() => setActiveTab('walkin')}
            className={`px-5 py-2.5 text-xs font-heading font-bold uppercase tracking-widest transition ${
              activeTab === 'walkin'
                ? 'bg-sage-block text-white'
                : 'bg-white text-slate-700 hover:text-sage hover:bg-sage-faint border border-sage-border'
            }`}
          >
            WALK-IN BOOKING
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-5 py-2.5 text-xs font-heading font-bold uppercase tracking-widest transition ${
              activeTab === 'active'
                ? 'bg-sage-block text-white'
                : 'bg-white text-slate-700 hover:text-sage hover:bg-sage-faint border border-sage-border'
            }`}
          >
            TIME OVERRIDES
          </button>
        </div>
      </div>

      {/* TAB 1: REAL-TIME OCCUPANCY OF 5 FLOORS (45 SLOTS) */}
      {activeTab === 'occupancy' && (
        <div className="space-y-6">
          
          {/* Quick Metrics Header - Flat Cards */}
          {occupancy && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 border border-sage-border">
                <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-slate-600">Total Capacity</span>
                <div className="text-4xl font-display font-black text-slate-900 mt-1">
                  {occupancy.overall.totalOccupied} / {occupancy.overall.totalCapacity}
                </div>
                <div className="text-xs text-slate-600 mt-1 font-heading uppercase tracking-wider">
                  {occupancy.overall.totalAvailable} bays available
                </div>
              </div>

              <div className="bg-white p-5 border border-sage-border">
                <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-slate-600">Cars (₹{rates.Car}/hr)</span>
                <div className="text-4xl font-display font-black text-sage mt-1">
                  {occupancy.overall.carOccupied} / {occupancy.overall.carCapacity}
                </div>
                <div className="text-xs text-slate-600 mt-1 font-heading uppercase tracking-wider">
                  {occupancy.overall.carCapacity - occupancy.overall.carOccupied} bays free
                </div>
              </div>

              <div className="bg-white p-5 border border-sage-border">
                <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-slate-600">Bikes (₹{rates.Bike}/hr)</span>
                <div className="text-4xl font-display font-black text-slate-800 mt-1">
                  {occupancy.overall.bikeOccupied} / {occupancy.overall.bikeCapacity}
                </div>
                <div className="text-xs text-slate-600 mt-1 font-heading uppercase tracking-wider">
                  {occupancy.overall.bikeCapacity - occupancy.overall.bikeOccupied} bays free
                </div>
              </div>

              <div className="bg-white p-5 border border-sage-border">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-lime-ink">⚡ EV Bays (₹{rates.EV}/hr)</span>
                  <button
                    onClick={fetchOccupancy}
                    className="p-1 text-slate-600 hover:text-sage"
                    title="Refresh"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-4xl font-display font-black text-lime-ink mt-1">
                  {occupancy.overall.evOccupied} / {occupancy.overall.evCapacity}
                </div>
                <div className="text-xs text-slate-700 font-heading uppercase tracking-wider mt-1">
                  {occupancy.overall.evCapacity - occupancy.overall.evOccupied} EV bays free
                </div>
              </div>
            </div>
          )}

          {/* Interactive 5-Floor Visualization */}
          <div className="space-y-4">
            {loadingOccupancy ? (
              <div className="text-center py-16 text-slate-600 font-mono text-sm">Loading live facility map...</div>
            ) : (
              occupancy?.floors.map((floor) => (
                <div key={floor.floor_number} className="bg-white border border-sage-border p-6 space-y-4">
                  
                  {/* Floor Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-dotted border-sage-border gap-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-sage-block text-white font-display font-bold flex items-center justify-center text-sm">
                        F{floor.floor_number}
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-2xl text-slate-900 uppercase tracking-wider">Floor {floor.floor_number}</h3>
                        <p className="text-xs text-body uppercase tracking-wider">4 Car Bays &bull; 4 Bike Bays &bull; 1 EV Fast Charging Bay</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-xs font-heading font-bold uppercase tracking-widest">
                      <span className="text-slate-700 bg-sage-faint border border-sage-border px-3 py-1">
                        Cars: {floor.car.occupied}/4
                      </span>
                      <span className="text-slate-700 bg-sage-faint border border-sage-border px-3 py-1">
                        Bikes: {floor.bike.occupied}/4
                      </span>
                      <span className="text-slate-900 bg-lime border border-lime-dark px-3 py-1 font-black">
                        ⚡ EV: {floor.ev.occupied}/1
                      </span>
                    </div>
                  </div>

                  {/* 9 Slots (4 Cars + 4 Bikes + 1 EV) */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-9 gap-3">
                    {floor.slots.map((slot) => {
                      const isOccupied = slot.isOccupied;
                      const isCheckedIn = slot.status === 'Checked-In';
                      const isPending = slot.status === 'Pending';
                      const isEV = slot.slot_type === 'EV';

                      let badgeStyle = isEV
                        ? 'bg-lime/10 border-lime text-slate-900'
                        : 'bg-sage-faint border-sage-border text-slate-800';

                      if (isCheckedIn) {
                        badgeStyle = 'bg-rose-50/70 border-rose-300 text-rose-900';
                      } else if (isPending) {
                        badgeStyle = 'bg-amber-50/70 border-amber-300 text-amber-900';
                      }

                      return (
                        <div
                          key={slot.id}
                          className={`p-3 border text-center transition flex flex-col justify-between ${badgeStyle}`}
                        >
                          <div>
                            <div className="flex justify-between items-center text-[10px] font-heading font-bold uppercase tracking-wider text-slate-600 mb-1">
                              <span className={isEV ? 'text-lime-ink font-black flex items-center' : ''}>
                                {isEV && <Zap className="w-3 h-3 mr-0.5 text-lime-ink" />}
                                {slot.slot_type}
                              </span>
                              <span className={`w-2 h-2 ${isCheckedIn ? 'bg-rose-500' : isPending ? 'bg-amber-500' : 'bg-sage'}`} />
                            </div>
                            <div className="text-xl font-display font-black text-slate-900 tracking-wide">
                              {slot.slot_number}
                            </div>
                          </div>

                          <div className="mt-2 pt-1.5 border-t border-slate-200/50">
                            {isOccupied && slot.activeBooking ? (
                              <div className="text-[10px] font-mono font-bold text-slate-800 truncate" title={slot.activeBooking.license_plate}>
                                {slot.activeBooking.license_plate}
                              </div>
                            ) : (
                              <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-sage">Available</span>
                            )}
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

      {/* TAB 2: MANUAL ON-THE-SPOT RESERVATION FOR WALK-IN CUSTOMERS */}
      {activeTab === 'walkin' && (
        <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 border border-sage-border space-y-6">
          <div className="flex items-center space-x-3 pb-5 border-b border-dotted border-sage-border">
            <PlusCircle className="w-6 h-6 text-sage" />
            <div>
              <h2 className="font-display font-bold text-3xl uppercase tracking-wider text-sage">
                MANUAL WALK-IN RESERVATION
              </h2>
              <p className="text-xs text-body uppercase tracking-wider mt-0.5">
                Immediate on-the-spot booking for customers arriving at the gate without advance reservation.
              </p>
            </div>
          </div>

          {walkinSuccess && (
            <div className="p-5 bg-sage-light border border-sage-border text-slate-800 space-y-3">
              <div className="flex items-center space-x-2 font-display font-bold text-xl uppercase tracking-wider text-sage">
                <CheckCircle2 className="w-5 h-5 text-sage" />
                <span>Walk-In Booking Created Successfully!</span>
              </div>
              <div className="text-xs grid grid-cols-2 gap-3 bg-white p-4 border border-sage-border font-heading uppercase tracking-wider">
                <div>Booking ID: <strong className="text-sage font-bold">#{walkinSuccess.id}</strong></div>
                <div>Plate: <strong className="text-slate-800">{walkinSuccess.license_plate}</strong></div>
                <div>Slot: <strong className="text-slate-800">Floor {walkinSuccess.floor_number} • {walkinSuccess.slot_number}</strong></div>
                <div>Charge: <strong className="text-sage font-bold">₹{walkinSuccess.total_charge}</strong></div>
              </div>
            </div>
          )}

          {walkinError && (
            <div className="p-4 bg-red-50/70 border border-red-200 text-red-700 text-xs font-heading uppercase">
              {walkinError}
            </div>
          )}

          <form onSubmit={handleWalkinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1.5">
                Vehicle Plate Number
              </label>
              <input
                type="text"
                value={walkinPlate}
                onChange={(e) => setWalkinPlate(e.target.value)}
                placeholder="E.G. DL-04-XY-9876"
                className="w-full px-4 py-2.5 bg-sage-faint border border-sage-border text-sm font-mono uppercase focus:bg-white focus:outline-none focus:border-sage transition text-slate-800 placeholder:text-slate-600"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1.5">
                  Vehicle Category
                </label>
                <select
                  value={walkinType}
                  onChange={(e) => setWalkinType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-sage-faint border border-sage-border text-xs font-heading font-bold uppercase tracking-wider focus:bg-white focus:outline-none focus:border-sage text-slate-800"
                >
                  <option value="Car">Car (₹{rates.Car}/hr)</option>
                  <option value="Bike">Bike (₹{rates.Bike}/hr)</option>
                  <option value="EV">EV Charging Bay (₹{rates.EV}/hr)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1.5">
                  Duration (Hours)
                </label>
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
                Select Available Bay ({availableSlots.length} available now)
              </label>
              <select
                value={selectedSlotId}
                onChange={(e) => setSelectedSlotId(e.target.value)}
                className="w-full px-3 py-2.5 bg-sage-faint border border-sage-border text-xs font-heading font-bold uppercase tracking-wider focus:bg-white focus:outline-none focus:border-sage text-slate-800"
                required
              >
                {availableSlots.length === 0 ? (
                  <option value="">No {walkinType} slots currently available</option>
                ) : (
                  availableSlots.map((s) => (
                    <option key={s.id} value={s.id}>
                      Floor {s.floor_number} — Slot {s.slot_number} ({s.slot_type === 'EV' ? '⚡ EV Charging Bay' : s.slot_type})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={walkinLoading || availableSlots.length === 0}
                className="w-full py-3.5 bg-sage-block hover:bg-lime hover:text-slate-900 text-white font-heading font-bold text-xs tracking-widest uppercase transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <span>{walkinLoading ? 'GENERATING BOOKING...' : 'CONFIRM WALK-IN & ISSUE BOOKING ID'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: ACTIVE BOOKINGS & EXTENSION OVERRIDE */}
      {activeTab === 'active' && (
        <div className="bg-white p-6 sm:p-8 border border-sage-border space-y-6">
          <div className="flex justify-between items-center pb-5 border-b border-dotted border-sage-border">
            <div>
              <h2 className="font-display font-bold text-3xl uppercase tracking-wider text-sage">
                ACTIVE BOOKINGS & OVERRIDES
              </h2>
              <p className="text-xs text-body uppercase tracking-wider mt-0.5">
                Extend parking hours for customers who require late departures.
              </p>
            </div>
            <button
              onClick={fetchReservations}
              className="text-xs font-heading font-bold uppercase tracking-widest text-sage hover:text-slate-900 px-4 py-2 border border-sage-border hover:bg-sage-faint transition"
            >
              Refresh List
            </button>
          </div>

          {loadingReservations ? (
            <div className="text-center py-16 text-slate-600 font-mono text-sm">Loading active bookings...</div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-12 text-slate-600 bg-sage-faint border border-dotted border-sage-border text-xs font-heading uppercase tracking-widest">
              No active or pending reservations to manage.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-sage-border text-[11px] font-heading font-bold text-slate-600 uppercase tracking-widest">
                    <th className="py-3.5 px-4">ID</th>
                    <th className="py-3.5 px-4">PLATE</th>
                    <th className="py-3.5 px-4">SLOT</th>
                    <th className="py-3.5 px-4">CUSTOMER</th>
                    <th className="py-3.5 px-4">RESERVED UNTIL</th>
                    <th className="py-3.5 px-4">STATUS</th>
                    <th className="py-3.5 px-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reservations.map((r) => (
                    <tr key={r.id} className="hover:bg-sage-faint/60 transition">
                      <td className="py-3.5 px-4 font-display text-base font-bold text-sage">#{r.id}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{r.license_plate}</td>
                      <td className="py-3.5 px-4 text-xs font-heading uppercase font-bold text-slate-700">
                        Floor {r.floor_number} • {r.slot_number} ({r.slot_type === 'EV' ? '⚡ EV' : r.slot_type})
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">@{r.username}</td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-700">{r.end_time}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 text-[10px] font-heading font-bold uppercase tracking-widest ${
                          r.status === 'Checked-In'
                            ? 'bg-lime text-slate-900 border border-lime-dark'
                            : 'bg-sage-light text-sage border border-sage-border'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setExtendModalRes(r)}
                          className="px-3.5 py-1.5 bg-sage-light hover:bg-lime text-slate-900 font-heading font-bold uppercase tracking-widest text-[11px] border border-sage-border transition"
                        >
                          Extend Time
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Extension Override Modal */}
          {extendModalRes && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white max-w-md w-full p-6 sm:p-8 border border-sage-border space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-display font-bold text-2xl uppercase tracking-wider text-sage">
                      EXTEND PARKING TIME
                    </h3>
                    <p className="text-xs text-body uppercase tracking-wider mt-0.5">
                      Booking #{extendModalRes.id} • Plate: {extendModalRes.license_plate}
                    </p>
                  </div>
                  <button
                    onClick={() => setExtendModalRes(null)}
                    className="text-slate-600 hover:text-slate-700 text-lg font-bold"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleExtendSubmit} className="space-y-4">
                  <div className="p-4 bg-sage-faint text-xs space-y-1.5 border border-sage-border font-heading uppercase tracking-wider">
                    <div className="flex justify-between text-slate-600">
                      <span>Assigned Bay:</span>
                      <span className="font-bold text-slate-800">
                        Floor {extendModalRes.floor_number} • {extendModalRes.slot_number} ({extendModalRes.slot_type})
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Current End Time:</span>
                      <span className="font-mono font-bold text-slate-800">{extendModalRes.end_time}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1.5">
                      Additional Hours
                    </label>
                    <select
                      value={extraHours}
                      onChange={(e) => setExtraHours(e.target.value)}
                      className="w-full px-3 py-2 bg-sage-faint border border-sage-border text-xs font-heading uppercase tracking-wider font-bold focus:bg-white focus:outline-none focus:border-sage transition text-slate-800"
                    >
                      <option value="1">+1 Hour</option>
                      <option value="2">+2 Hours</option>
                      <option value="3">+3 Hours</option>
                      <option value="4">+4 Hours</option>
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setExtendModalRes(null)}
                      className="px-5 py-2 text-xs font-heading font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={extending}
                      className="px-6 py-2 bg-sage-block hover:bg-lime hover:text-slate-900 text-white font-heading font-bold text-xs uppercase tracking-widest transition disabled:opacity-50"
                    >
                      {extending ? 'UPDATING...' : 'CONFIRM EXTENSION'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
