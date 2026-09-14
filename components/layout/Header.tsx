'use client';

import React, { useState, useEffect } from 'react';
import {
  Menu,
  Search,
  Bell,
  MapPin,
  Clock,
  ChevronDown,
  UserCheck,
  Shield,
  LogOut,
  AlertTriangle,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { StaffRole } from '@/types';
import { inventoryService } from '@/services/inventoryService';
import { storageService } from '@/services/storageService';
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
}

export function Header({ onOpenMobileMenu, onOpenSearch }: HeaderProps) {
  const { currentStaff, switchRole } = useAuth();
  const { toast } = useToast();
  const [timeString, setTimeString] = useState('');
  const [dateString, setDateString] = useState('');
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setDateString(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check low stock count
  useEffect(() => {
    const low = inventoryService.getLowStockProducts(10);
    setLowStockCount(low.length);
  }, []);

  const roles: StaffRole[] = [
    'Admin',
    'Retail Cashier',
    'Wholesale Cashier',
    'Khata Staff',
    'Stock Manager',
    'Payment Collection Staff',
  ];

  const handleRoleChange = (role: StaffRole) => {
    switchRole(role);
    setIsRoleMenuOpen(false);
    toast({
      title: `Switched Role to ${role}`,
      description: `Navigation and screen access permissions adjusted for this role.`,
      type: 'info',
    });
  };

  const handleResetData = () => {
    if (confirm('Reset all mock data (products, sales, khata, attendance) to factory seed defaults?')) {
      storageService.resetAllData();
    }
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4 no-print shadow-2xs">
      {/* Left: Mobile trigger & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar Button */}
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-100/80 hover:bg-slate-100 border border-slate-200/60 text-slate-500 text-xs transition-all duration-150 group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            <span className="hidden sm:inline">Search fabrics, SKU, customers, bills...</span>
            <span className="sm:hidden">Search POS...</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 font-mono text-[10px] bg-white border border-slate-200 rounded shadow-2xs text-slate-500">
              Ctrl + K
            </kbd>
          </div>
        </button>
      </div>

      {/* Center: Branch and Time Indicators (Desktop) */}
      <div className="hidden lg:flex items-center gap-6 text-xs text-slate-600 border-x border-slate-100 px-6">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-cyan-600" />
          <span className="font-semibold text-slate-800">Liberty Market Branch</span>
          <span className="text-[10px] bg-cyan-50 text-cyan-700 px-1.5 py-0.2 rounded font-mono">
            Main Outlet
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>{dateString}</span>
          <span className="font-semibold text-slate-800">{timeString}</span>
        </div>
      </div>

      {/* Right: Actions, Notifications & Role Switcher */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Reset Demo Data Button */}
        <button
          onClick={handleResetData}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          title="Reset mock database to initial seed data"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="text-[11px]">Reset Data</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {lowStockCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-4 z-40 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="font-bold text-xs text-slate-900 uppercase tracking-wider">Store Notifications</div>
                <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  Live
                </span>
              </div>
              <div className="py-2 space-y-2.5 max-h-60 overflow-y-auto">
                {lowStockCount > 0 && (
                  <div className="flex items-start gap-2.5 p-2 rounded-lg bg-amber-50/80 border border-amber-200/60 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-amber-900">Low Stock Alert</div>
                      <div className="text-[11px] text-amber-700 mt-0.5">
                        {lowStockCount} fabric products are running below minimum stock threshold.
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-blue-50/50 border border-blue-100 text-xs">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-800">5-Year Data Engine</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Historical sales and Khata ledger models initialized for years 2022–2026.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Demo Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all text-xs font-semibold text-slate-800 shadow-2xs"
          >
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
              {currentStaff?.role === 'Admin' ? (
                <Shield className="w-3.5 h-3.5" />
              ) : (
                <UserCheck className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Demo Role</div>
              <div className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                {currentStaff?.role || 'Admin'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isRoleMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-2 z-40 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Staff Persona
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Test role-based menu hiding and route restrictions instantly.
                </div>
              </div>

              <div className="py-1 space-y-0.5">
                {roles.map(role => {
                  const isSelected = currentStaff?.role === role;
                  return (
                    <button
                      key={role}
                      onClick={() => handleRoleChange(role)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{role}</span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Go to Login Screen</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
