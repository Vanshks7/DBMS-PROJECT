import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, Car, Bike, Zap, CheckCircle2, AlertCircle, XCircle, ArrowRight, ShieldCheck } from 'lucide-react';

const getLocalDateString = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

export default function CustomerDashboard() {
  const { authFetch, user } = useAuth();

  // Booking Form State
  const [vehicleType, setVehicleType] = useState('Car'); // 'Car' | 'Bike' | 'EV'
  const [selectedDate, setSelectedDate] = useState(getLocalDateString);
  const [startHour, setStartHour] = useState('10:00');
  const [endHour, setEndHour] = useState('12:00');
  const [licensePlate, setLicensePlate] = useState('');
  
  // Available Slots Data
  const [searching, setSearching] = useState(false);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [searchError, setSearchError] = useState('');

  // Booking Confirmation State
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  // My Reservations State
  const [myReservations, setMyReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(true);

  // Facility Rates in INR
  const [rates, setRates] = useState({ Car: 50, Bike: 20, EV: 80 });

  const handleVehicleChange = (type) => {
    if (type === vehicleType) return;
    setVehicleType(type);
    setAvailabilityData(null);
    setSelectedSlot(null);
    setSearchError('');
    setBookingSuccess(null);
  };

  useEffect(() => {
    fetchMyReservations();
    fetchCurrentRates();
  }, []);

  const fetchCurrentRates = async () => {
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

  const fetchMyReservations = async () => {
    setLoadingReservations(true);
    try {
      const res = await authFetch('/api/reservations/my');
      if (res.ok) {
        const data = await res.json();
        setMyReservations(data);
      }
    } catch (err) {
      console.error('Failed to fetch reservations:', err);
    } finally {
      setLoadingReservations(false);
    }
  };

  // Search available slots
  const handleSearchSlots = async (e) => {
    if (e) e.preventDefault();
    setSearchError('');
    setSelectedSlot(null);
    setBookingSuccess(null);

    const startDateTime = `${selectedDate} ${startHour}:00`;
    const endDateTime = `${selectedDate} ${endHour}:00`;

    if (new Date(endDateTime) <= new Date(startDateTime)) {
      setSearchError('End time must be after start time.');
      return;
    }

    setSearching(true);
    try {
      const res = await authFetch(`/api/slots/available?startTime=${encodeURIComponent(startDateTime)}&endTime=${encodeURIComponent(endDateTime)}&vehicleType=${vehicleType}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to check slots');
      }
      setAvailabilityData(data);
    } catch (err) {
      setSearchError(err.message);
      setAvailabilityData(null);
    } finally {
      setSearching(false);
    }
  };

  // Confirm Reservation
  const handleConfirmBooking = async () => {
    if (!selectedSlot) {
      alert('Please select an available parking slot.');
      return;
    }
    if (!licensePlate.trim()) {
      alert('Please enter your vehicle license plate number.');
      return;
    }

    setBookingLoading(true);
    try {
      const startDateTime = `${selectedDate} ${startHour}:00`;
      const endDateTime = `${selectedDate} ${endHour}:00`;

      const res = await authFetch('/api/reservations', {
        method: 'POST',
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          license_plate: licensePlate.trim().toUpperCase(),
          start_time: startDateTime,
          end_time: endDateTime
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Booking reservation failed');
      }

      setBookingSuccess(data.reservation);
      setSelectedSlot(null);
      setLicensePlate('');
      setAvailabilityData(null);
      fetchMyReservations();
    } catch (err) {
      alert(`Booking Error: ${err.message}`);
    } finally {
      setBookingLoading(false);
    }
  };

  // Cancel Pending Reservation
  const handleCancelBooking = async (resId) => {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;
    try {
      const res = await authFetch(`/api/reservations/${resId}/cancel`, {
        method: 'PATCH'
      });
      if (res.ok) {
        fetchMyReservations();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to cancel reservation');
      }
    } catch (err) {
      alert('Failed to cancel reservation');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return <span className="px-2.5 py-0.5 text-[10px] font-heading uppercase tracking-widest font-bold bg-lime/30 text-slate-900 border border-lime/60">Pending</span>;
      case 'Checked-In':
        return <span className="px-2.5 py-0.5 text-[10px] font-heading uppercase tracking-widest font-bold bg-sage-light text-sage border border-sage-border">Checked-In</span>;
      case 'Checked-Out':
        return <span className="px-2.5 py-0.5 text-[10px] font-heading uppercase tracking-widest font-bold bg-slate-100 text-slate-600">Checked-Out</span>;
      case 'Cancelled':
        return <span className="px-2.5 py-0.5 text-[10px] font-heading uppercase tracking-widest font-bold bg-red-50 text-red-700">Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 text-[10px] font-heading uppercase tracking-widest font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    return i.toString().padStart(2, '0') + ':00';
  });

  return (
    <div className="space-y-10 sm:space-y-12">
      
      {/* Editorial Header Banner matching the Beach Volley poster aesthetic */}
      <div className="bg-gradient-to-br from-sage-faint to-white rounded-2xl border border-sage-border p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 shadow-sm">
        <div>
          <span className="text-xs font-heading font-bold uppercase tracking-widest text-motto">
            CUSTOMER HUB &bull; 5 FLOORS &bull; 45 BAYS
          </span>
          <h1 className="text-5xl sm:text-7xl font-display uppercase text-sage tracking-tight leading-none mt-1 font-black">
            PARKING RESERVATIONS
          </h1>
          <p className="text-xs sm:text-sm text-body uppercase tracking-wider mt-2 font-normal">
            HOURLY AUTOMATED BILLING IN INR (&inr;). INSTANT SECURITY GATE ACCESS UPON ARRIVAL.
          </p>
        </div>

        {/* Pricing Chips */}
        <div className="flex flex-wrap gap-2 text-xs font-heading uppercase tracking-widest font-bold">
          <span className="px-3 py-1.5 bg-white text-slate-700 border border-sage-border">
            CAR: ₹{rates.Car}/HR
          </span>
          <span className="px-3 py-1.5 bg-white text-slate-700 border border-sage-border">
            BIKE: ₹{rates.Bike}/HR
          </span>
          <span className="px-3 py-1.5 bg-lime text-slate-900 border border-lime-dark font-extrabold">
            ⚡ EV: ₹{rates.EV}/HR
          </span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {bookingSuccess && (
        <div className="bg-white border-2 border-sage p-6 animate-in fade-in duration-200">
          <div className="flex items-start space-x-4">
            <CheckCircle2 className="w-7 h-7 text-sage flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h3 className="text-2xl font-display uppercase text-sage font-bold tracking-wider">
                  RESERVATION CONFIRMED
                </h3>
                <button
                  onClick={() => setBookingSuccess(null)}
                  className="text-sage-muted hover:text-sage text-xs font-heading uppercase tracking-widest font-bold"
                >
                  DISMISS
                </button>
              </div>
              <p className="text-xs text-body uppercase tracking-wider mt-1">
                YOUR PARKING BAY IS RESERVED. PRESENT BOOKING ID OR VEHICLE LICENSE PLATE AT THE SECURITY GATE.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 bg-sage-light p-4 border border-sage-border font-heading uppercase tracking-widest text-xs">
                <div>
                  <span className="text-[10px] text-slate-600 font-bold">BOOKING ID</span>
                  <div className="text-2xl font-display text-sage font-black">#{bookingSuccess.id}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 font-bold">BAY ASSIGNED</span>
                  <div className="text-sm font-bold text-slate-900">
                    FLOOR {bookingSuccess.floor_number} &bull; {bookingSuccess.slot_number}
                  </div>
                  <div className="text-[10px] text-slate-600 font-normal">({bookingSuccess.slot_type})</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 font-bold">LICENSE PLATE</span>
                  <div className="text-sm font-mono font-bold text-slate-900">{bookingSuccess.license_plate}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 font-bold">TOTAL CHARGE</span>
                  <div className="text-xl font-display font-black text-sage">₹{bookingSuccess.total_charge}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Booking Section: Search Form & Slot Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* Step 1: Search Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 sm:p-7 border border-sage-border space-y-5 shadow-sm">
          <div className="border-b border-dotted border-sage-border pb-3">
            <h2 className="text-2xl sm:text-3xl font-display uppercase text-sage font-bold tracking-wider">
              1. RESERVE A BAY
            </h2>
            <p className="text-xs text-body uppercase tracking-wider mt-0.5">Strictly hourly billing in Indian Rupees (₹).</p>
          </div>

          <form onSubmit={handleSearchSlots} className="space-y-4">
            
            {/* Vehicle Type Choice - CAR, BIKE, EV */}
            <div>
              <label className="block text-xs font-heading font-bold text-slate-600 uppercase tracking-widest mb-2">
                VEHICLE CATEGORY
              </label>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Choose a vehicle category">
                {[
                  { type: 'Car', label: 'CAR', rate: rates.Car, Icon: Car },
                  { type: 'Bike', label: 'BIKE', rate: rates.Bike, Icon: Bike },
                  { type: 'EV', label: 'ELECTRIC', rate: rates.EV, Icon: Zap },
                ].map(({ type, label, rate, Icon }) => {
                  const isSelected = vehicleType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleVehicleChange(type)}
                      aria-pressed={isSelected}
                      className={`relative min-h-[104px] rounded-xl border p-3 flex flex-col items-center justify-center gap-1 text-xs font-heading uppercase tracking-wider font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 ${
                        isSelected
                          ? type === 'EV'
                            ? 'bg-lime-faint border-lime-dark text-slate-900 shadow-sm ring-1 ring-lime-dark'
                            : 'bg-sage-light border-sage-dark text-sage-dark shadow-sm ring-1 ring-sage-dark'
                          : 'bg-white border-sage-border text-slate-600 hover:border-sage hover:bg-sage-faint'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${type === 'EV' ? 'text-lime-ink' : 'text-sage'}`} aria-hidden="true" />
                      <span>{label}</span>
                      <span className="text-[11px] text-slate-600 font-medium normal-case">₹{rate}/hr</span>
                      {isSelected && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-600" aria-live="polite">
                {vehicleType === 'EV' ? 'Electric vehicle · charging bay included' : `${vehicleType} parking`}
                {availabilityData && <span> · Search again to see {vehicleType.toLowerCase()} availability</span>}
              </p>
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-xs font-heading font-bold text-slate-600 uppercase tracking-widest mb-1">
                PARKING DATE
              </label>
              <input
                type="date"
                min={getLocalDateString()}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-sage-faint border border-sage-border text-sm font-sans focus:bg-white focus:outline-none focus:border-sage"
                required
              />
            </div>

            {/* Time Window (Hourly) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-heading font-bold text-slate-600 uppercase tracking-widest mb-1">
                  START HOUR
                </label>
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="w-full px-3 py-2.5 bg-sage-faint border border-sage-border text-sm font-sans focus:bg-white focus:outline-none focus:border-sage"
                >
                  {hourOptions.map((h) => (
                    <option key={`start-${h}`} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-heading font-bold text-slate-600 uppercase tracking-widest mb-1">
                  END HOUR
                </label>
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className="w-full px-3 py-2.5 bg-sage-faint border border-sage-border text-sm font-sans focus:bg-white focus:outline-none focus:border-sage"
                >
                  {hourOptions.map((h) => (
                    <option key={`end-${h}`} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            {searchError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs border border-red-200">
                {searchError}
              </div>
            )}

            <button
              type="submit"
              disabled={searching}
              aria-label={searching ? 'Checking availability' : `Find available ${vehicleType} parking bays`}
              className="w-full min-h-12 rounded-lg border border-[#29483a] bg-[#29483a] px-4 py-3 text-white hover:bg-[#1f3b2e] hover:text-white font-heading uppercase text-xs font-bold tracking-widest transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60"
            >
              <span>{searching ? 'CHECKING AVAILABILITY...' : 'FIND AVAILABLE SLOTS'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Pricing Calculation Summary (in INR ₹) */}
          {availabilityData && (
            <div className="p-4 bg-sage-light border border-sage-border space-y-2 text-xs font-heading uppercase tracking-wider">
              <div className="flex justify-between text-slate-600">
                <span>DURATION:</span>
                <span className="font-bold text-slate-900">{availabilityData.durationHours} HOUR(S)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>HOURLY TARIFF ({availabilityData.vehicleType}):</span>
                <span className="font-bold text-slate-900">₹{availabilityData.hourlyRate.toFixed(2)}/HR</span>
              </div>
              <div className="border-t border-dotted border-sage-border pt-2 flex justify-between text-sm font-bold text-slate-900">
                <span className="text-sage font-black">ESTIMATED AMOUNT:</span>
                <span className="text-sage font-display text-xl font-black">₹{availabilityData.estimatedCharge.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Slot Selection Across 5 Floors */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-7 border border-sage-border flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-dotted border-sage-border">
              <div>
                <h2 className="text-2xl sm:text-3xl font-display uppercase text-sage font-bold tracking-wider">
                  2. SELECT BAY
                </h2>
                <p className="text-xs text-body uppercase tracking-wider mt-0.5">
                  5 Floors &bull; 4 Car, 4 Bike, 1 EV Bay per floor
                </p>
              </div>
              {availabilityData && (
                <span className="text-xs font-heading uppercase tracking-widest font-bold px-3 py-1 bg-lime text-slate-900">
                  {availabilityData.totalAvailable} BAYS OPEN
                </span>
              )}
            </div>

            {!availabilityData ? (
              <div className="text-center py-16 text-sage-muted bg-sage-faint border border-dotted border-sage-border font-heading uppercase tracking-widest text-xs">
                <Car className="w-10 h-10 mx-auto mb-2 text-sage opacity-50" />
                <p>Click "Find Available Slots" to view real-time facility bays.</p>
              </div>
            ) : availabilityData.totalAvailable === 0 ? (
              <div className="text-center py-12 text-amber-800 bg-amber-50/70 border border-amber-200 font-heading uppercase tracking-wider text-xs">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                <p className="font-bold">No {vehicleType} slots available for the selected window.</p>
                <p className="mt-1 text-slate-600 font-normal">Please adjust your start/end hours or vehicle category.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {[1, 2, 3, 4, 5].map((floorNum) => {
                  const floorSlots = availabilityData.byFloor[floorNum] || [];
                  return (
                  <div key={`floor-${floorNum}`} className="p-3 sm:p-4 bg-sage-faint rounded-xl border border-sage-border">
                      <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-xs font-display uppercase font-bold text-sage tracking-wider text-sm">
                          FLOOR {floorNum}
                        </span>
                        <span className="text-[10px] font-heading uppercase tracking-wider text-slate-600">
                          {floorSlots.length} open
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {floorSlots.length === 0 ? (
                          <div className="col-span-5 text-center py-2 text-xs text-slate-600 font-heading uppercase">
                            No available {vehicleType} slots on Floor {floorNum}
                          </div>
                        ) : (
                          floorSlots.map((slot) => {
                            const isSelected = selectedSlot?.id === slot.id;
                            const isEV = slot.slot_type === 'EV';
                            return (
                              <button
                                key={`slot-${slot.id}`}
                                type="button"
                                onClick={() => setSelectedSlot(slot)}
                                aria-pressed={isSelected}
                                className={`min-h-[62px] rounded-lg p-2.5 border text-center transition-all flex flex-col items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-1 ${
                                  isSelected
                                    ? '!bg-[#29483a] !border-[#29483a] !text-white font-bold shadow-sm'
                                    : isEV
                                      ? 'bg-white border-lime text-slate-800 hover:border-lime-dark'
                                      : 'bg-white border-sage-border text-slate-800 hover:border-sage'
                                }`}
                              >
                                <div className="flex items-center space-x-1">
                                  {isEV && <Zap className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-lime-ink'}`} />}
                                  <span className="text-sm font-display font-bold">{slot.slot_number}</span>
                                </div>
                                <span className={`text-[10px] font-heading uppercase ${isSelected ? 'text-white' : isEV ? 'text-slate-700 font-bold' : 'text-slate-600'}`}>
                                  {isEV ? 'EV' : slot.slot_type}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Vehicle details & Confirm button */}
          {selectedSlot && (
            <div className="mt-6 pt-5 border-t border-dotted border-sage-border">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1">
                    LICENSE PLATE NUMBER
                  </label>
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="E.G. KA-01-AB-1234"
                    className="w-full px-3.5 py-2.5 bg-sage-faint border border-sage-border text-sm font-mono uppercase focus:bg-white focus:outline-none focus:border-sage"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={bookingLoading}
                  className="w-full sm:w-auto px-8 py-3 bg-sage-block hover:bg-lime hover:text-slate-900 text-white font-heading uppercase text-xs font-bold tracking-widest transition disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <span>{bookingLoading ? 'RESERVING...' : `CONFIRM • ₹${availabilityData?.estimatedCharge.toFixed(2)}`}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] font-heading uppercase tracking-wider text-slate-600 mt-2">
                Selected: Floor {selectedSlot.floor_number}, Bay {selectedSlot.slot_number} ({selectedSlot.slot_type === 'EV' ? '⚡ EV Fast Charging' : selectedSlot.slot_type})
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Customer's Reservations Section */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-sage-border space-y-6 shadow-sm">
        <div className="flex justify-between items-center pb-4 border-b border-dotted border-sage-border">
          <div>
            <h2 className="text-3xl font-display uppercase text-sage font-bold tracking-wider">
              MY RESERVATIONS
            </h2>
            <p className="text-xs text-body uppercase tracking-wider mt-0.5">Track active and completed parking reservations</p>
          </div>
          <button
            onClick={fetchMyReservations}
            className="text-xs font-heading uppercase tracking-widest font-bold text-sage hover:text-sage-dark"
          >
            REFRESH LIST
          </button>
        </div>

        {loadingReservations ? (
          <div className="text-center py-12 text-slate-600 text-xs font-mono">Loading bookings...</div>
        ) : myReservations.length === 0 ? (
          <div className="text-center py-10 text-slate-600 text-xs bg-sage-faint border border-dotted border-sage-border font-heading uppercase tracking-widest">
            You have no active or past reservations yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-sage-border font-heading uppercase text-slate-600 tracking-widest text-[11px]">
                  <th className="py-3 px-3">BOOKING ID</th>
                  <th className="py-3 px-3">BAY</th>
                  <th className="py-3 px-3">PLATE</th>
                  <th className="py-3 px-3">TIME WINDOW</th>
                  <th className="py-3 px-3">AMOUNT (₹)</th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myReservations.map((res) => (
                  <tr key={res.id} className="hover:bg-sage-faint/60 transition">
                    <td className="py-3.5 px-3 font-display text-base font-bold text-sage">
                      #{res.id}
                    </td>
                    <td className="py-3.5 px-3 font-heading uppercase">
                      <span className="font-bold text-slate-800">
                        Floor {res.floor_number}
                      </span>
                      <span className="ml-1 text-slate-600 text-[11px]">
                        ({res.slot_number} &bull; {res.slot_type === 'EV' ? '⚡ EV' : res.slot_type})
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                      {res.license_plate}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 font-mono text-[11px]">
                      <div>{res.start_time}</div>
                      <div className="text-slate-600">to {res.end_time}</div>
                    </td>
                    <td className="py-3.5 px-3 font-display text-base font-bold text-slate-900">
                      ₹{parseFloat(res.total_charge).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3">
                      {getStatusBadge(res.status)}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {res.status === 'Pending' ? (
                        <button
                          onClick={() => handleCancelBooking(res.id)}
                          className="text-xs font-heading uppercase tracking-widest font-bold text-red-600 hover:text-red-800"
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
