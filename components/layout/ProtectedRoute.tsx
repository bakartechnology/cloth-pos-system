'use client';

import React from 'react';
import { PermissionKey } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, ArrowLeft, Home, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import Link from 'next/link';

interface ProtectedRouteProps {
  permission: PermissionKey;
  adminOnly?: boolean;
  children: React.ReactNode;
}

export function ProtectedRoute({ permission, adminOnly, children }: ProtectedRouteProps) {
  const { currentStaff, hasPermission, isLoading, isLoggingOut, logout } = useAuth();

  if (isLoading || isLoggingOut) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            {isLoggingOut ? 'Signing out securely...' : 'Loading register session...'}
          </p>
        </div>
      </div>
    );
  }

  if (!currentStaff) {
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white select-none">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const isAllowed = adminOnly
    ? currentStaff.role === 'Admin'
    : hasPermission(permission);

  if (!isAllowed) {
    const homeHref = currentStaff.role === 'Admin'
      ? '/dashboard'
      : currentStaff.role === 'Retail Cashier' || currentStaff.permissions.includes('pos_retail')
      ? '/pos/retail'
      : currentStaff.role === 'Wholesale Cashier' || currentStaff.permissions.includes('pos_wholesale')
      ? '/pos/wholesale'
      : currentStaff.role === 'Khata Staff' || currentStaff.permissions.includes('pos_khata')
      ? '/pos/khata'
      : '/login';

    const homeLabel = currentStaff.role === 'Admin'
      ? 'Go to Dashboard'
      : currentStaff.role === 'Retail Cashier' || currentStaff.permissions.includes('pos_retail')
      ? 'Go to Retail POS'
      : currentStaff.role === 'Wholesale Cashier' || currentStaff.permissions.includes('pos_wholesale')
      ? 'Go to Wholesale POS'
      : currentStaff.role === 'Khata Staff' || currentStaff.permissions.includes('pos_khata')
      ? 'Go to Khata POS'
      : 'Back to Register';

    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Access Restricted</h2>
        <p className="text-sm text-slate-600 max-w-md mb-2">
          {adminOnly ? (
            <>
              This area is strictly restricted to <span className="font-semibold text-slate-800">Administrator accounts</span>. Your current account role is <span className="font-semibold text-slate-800">{currentStaff.role}</span>.
            </>
          ) : (
            <>
              Your active account <span className="font-semibold text-slate-800">({currentStaff.name} — {currentStaff.role})</span> does not have authorization for permission <code className="text-xs bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-mono font-semibold">{permission}</code>.
            </>
          )}
        </p>
        <p className="text-xs text-slate-400 mb-6 max-w-sm">
          Please contact store administration to request access or sign in with an authorized account.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href={homeHref}>
            <Button variant="outline" size="md" className="gap-2 cursor-pointer">
              <Home className="w-4 h-4" /> {homeLabel}
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#125E45] hover:bg-[#197A5A] text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Sign In Different Account
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
