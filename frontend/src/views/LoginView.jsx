import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function LoginView() {
  const { login, register, loading } = useAuth();
  
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [requestedRole, setRequestedRole] = useState('customer');
  const [error, setError] = useState('');
  const [registerSuccessMsg, setRegisterSuccessMsg] = useState('');

  // Handle Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setRegisterSuccessMsg('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username/email and password.');
      return;
    }

    const res = await login(username.trim(), password);
    if (!res.success) {
      setError(res.error);
    }
  };

  // Handle Register
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setRegisterSuccessMsg('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username/email and password.');
      return;
    }

    const res = await register(username.trim(), password, requestedRole);
    if (res.success) {
      if (res.pendingApproval) {
        setRegisterSuccessMsg(res.message);
        setUsername('');
        setPassword('');
      }
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="py-8 sm:py-12 max-w-6xl mx-auto">
      <section id="auth-section" className="max-w-md mx-auto">
        <div className="mb-6 text-center">
          <p className="text-xs font-heading font-bold uppercase tracking-[0.24em] text-sage">SMARTPARK ACCESS</p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-display font-black uppercase tracking-tight text-slate-800">Welcome back</h1>
          <p className="mt-2 text-sm text-body">Sign in to reserve a parking bay or manage your facility.</p>
        </div>
        <div className="bg-white rounded-2xl border border-sage-border p-6 sm:p-8 space-y-6 shadow-sm">
          
          {/* Flat Tab Switcher matching the reference's razor minimalist aesthetic */}
          <div className="flex border-b border-sage-border text-xs font-heading uppercase tracking-widest font-bold">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setRegisterSuccessMsg(''); }}
              className={`flex-1 py-3 text-center transition ${
                mode === 'login'
                  ? 'text-sage border-b-2 border-sage font-black'
                  : 'text-sage-muted hover:text-sage'
              }`}
            >
              SIGN IN
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setRegisterSuccessMsg(''); }}
              className={`flex-1 py-3 text-center transition ${
                mode === 'register'
                  ? 'text-sage border-b-2 border-sage font-black'
                  : 'text-sage-muted hover:text-sage'
              }`}
            >
              CREATE ACCOUNT
            </button>
          </div>

          {/* Tab 1: Sign In */}
          {mode === 'login' && (
            <div className="space-y-4 pt-2">
              {error && (
                <div className="p-3 bg-red-50/70 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1">
                    Username or Email
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="E.G. ADMIN OR CUSTOMER"
                    className="w-full px-3.5 py-2.5 bg-sage-faint border border-sage-border text-sm font-sans focus:bg-white focus:outline-none focus:border-sage transition text-slate-800 placeholder:text-slate-600 uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ENTER PASSWORD"
                    className="w-full px-3.5 py-2.5 bg-sage-faint border border-sage-border text-sm font-sans focus:bg-white focus:outline-none focus:border-sage transition text-slate-800 placeholder:text-slate-600"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-sage-block hover:bg-lime hover:text-slate-900 text-white font-heading uppercase text-xs font-bold tracking-widest transition flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <span>{loading ? 'AUTHENTICATING...' : 'ACCESS PORTAL'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 2: Create Account */}
          {mode === 'register' && (
            <div className="space-y-4 pt-2">
              {registerSuccessMsg ? (
                <div className="p-4 bg-sage-light border border-sage-border text-slate-800 space-y-3">
                  <div className="flex items-center space-x-2 font-heading font-bold text-xs uppercase tracking-wider text-sage">
                    <CheckCircle2 className="w-4 h-4 text-sage flex-shrink-0" />
                    <span>REQUEST SUBMITTED</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {registerSuccessMsg}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setRegisterSuccessMsg(''); }}
                    className="w-full py-2 bg-sage-block hover:bg-lime hover:text-slate-900 text-white font-heading uppercase text-xs font-bold tracking-widest transition"
                  >
                    RETURN TO SIGN IN
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-2.5 bg-sage-light border border-sage-border text-xs text-slate-700">
                    {requestedRole === 'customer' ? (
                      <span className="flex items-center font-heading uppercase text-[11px] tracking-wider text-sage font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-sage mr-1.5 flex-shrink-0" />
                        Customer accounts activate immediately
                      </span>
                    ) : (
                      <span className="flex items-center font-heading uppercase text-[11px] tracking-wider text-amber-800 font-bold">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600 mr-1.5 flex-shrink-0" />
                        Staff requests require Admin approval
                      </span>
                    )}
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50/70 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1">
                        Account Role
                      </label>
                      <select
                        value={requestedRole}
                        onChange={(e) => setRequestedRole(e.target.value)}
                        className="w-full px-3 py-2 bg-sage-faint border border-sage-border text-xs font-heading uppercase tracking-wider font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-sage"
                      >
                        <option value="customer">Customer (Instant Active • Book parking & EV bays)</option>
                        <option value="guard">Guard (Security Gate • Requires Approval)</option>
                        <option value="operator">Operator (Facility Manager • Requires Approval)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1">
                        Username / Email
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="E.G. RAHUL OR USER@GMAIL.COM"
                        className="w-full px-3.5 py-2.5 bg-sage-faint border border-sage-border text-sm font-sans focus:bg-white focus:outline-none focus:border-sage transition text-slate-800 uppercase"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-heading font-bold uppercase tracking-widest text-slate-600 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="ENTER PASSWORD"
                        className="w-full px-3.5 py-2.5 bg-sage-faint border border-sage-border text-sm font-sans focus:bg-white focus:outline-none focus:border-sage transition text-slate-800"
                        required
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-sage-block hover:bg-lime hover:text-slate-900 text-white font-heading uppercase text-xs font-bold tracking-widest transition flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        <span>
                          {loading
                            ? 'PROCESSING...'
                            : requestedRole === 'customer'
                              ? 'CREATE CUSTOMER ACCOUNT'
                              : 'SUBMIT FOR ADMIN APPROVAL'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}

        </div>
      </section>

    </div>
  );
}
