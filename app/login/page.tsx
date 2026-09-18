'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Eye, EyeOff, Lock, User, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { StaffRole } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const { refreshStaff } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const demoAccounts: { role: StaffRole; user: string }[] = [
    { role: 'Admin', user: 'admin' },
    { role: 'Retail Cashier', user: 'tariq.cashier' },
    { role: 'Wholesale Cashier', user: 'hamza.wholesale' },
    { role: 'Khata Staff', user: 'zain.khata' },
    { role: 'Stock Manager', user: 'usman.stock' },
    { role: 'Payment Collection Staff', user: 'rashid.recovery' },
  ];

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      const result = authService.login(username);
      if (result.success && result.staff) {
        refreshStaff();
        if (authService.hasPermission('dashboard_view', result.staff)) {
          router.push('/dashboard');
        } else if (authService.hasPermission('pos_retail', result.staff)) {
          router.push('/pos/retail');
        } else if (authService.hasPermission('pos_wholesale', result.staff)) {
          router.push('/pos/wholesale');
        } else if (authService.hasPermission('pos_khata', result.staff)) {
          router.push('/pos/khata');
        } else if (authService.hasPermission('stock_view', result.staff)) {
          router.push('/products');
        } else if (authService.hasPermission('payment_collection', result.staff)) {
          router.push('/payments');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(result.error || 'Invalid credentials.');
        setIsLoading(false);
      }
    }, 600);
  };

  const handleSelectDemo = (user: string) => {
    setUsername(user);
    setPassword('pos1234');
    setError('');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white font-black text-2xl shadow-xl shadow-blue-500/25 mb-3">
            N
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">AL-NOOR FABRICS</h1>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-1">
            Cloth Retail + Wholesale + Khata POS System
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Sign In to Counter</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter your authorized staff username and pin to unlock the register.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Staff Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. admin or tariq.cashier"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                />
                Keep terminal authenticated
              </label>
              <span className="text-blue-400 hover:underline cursor-pointer">Terminal Offline Support</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2 font-bold gap-2"
            >
              Authorize & Open POS <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Quick Demo Personas Selector */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" /> Instant Demo Personas
              </span>
              <span className="text-[10px] font-normal lowercase text-slate-500">1-click fill</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {demoAccounts.map(demo => (
                <button
                  key={demo.user}
                  type="button"
                  onClick={() => handleSelectDemo(demo.user)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                    username === demo.user
                      ? 'bg-blue-600/20 border-blue-500/50 text-white'
                      : 'bg-slate-950/50 border-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{demo.role}</span>
                  {username === demo.user && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-500">
          Al-Noor Fabrics POS v2.6 • Encrypted Local Offline Storage • Karachi & Lahore
        </div>
      </div>
    </div>
  );
}
