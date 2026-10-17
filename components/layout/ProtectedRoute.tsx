'use client';

import React from 'react';
import { PermissionKey } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, ArrowLeft, Home, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import Link from 'next/link';

interface ProtectedRouteProps {
  permission: PermissionKey;
  children: React.ReactNode;
}

export function ProtectedRoute({ permission, children }: ProtectedRouteProps) {
  const { currentStaff, hasPermission, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#197A5A]"></div>
      </div>
    );
  }

  const isAllowed = hasPermission(permission);

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Access Restricted</h2>
        <p className="text-sm text-slate-600 max-w-md mb-2">
          Your active account <span className="font-semibold text-slate-800">({currentStaff?.name || 'Staff'} — {currentStaff?.role || 'User'})</span> does not have authorization for permission <code className="text-xs bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-mono font-semibold">{permission}</code>.
        </p>
        <p className="text-xs text-slate-400 mb-6 max-w-sm">
          Please contact store administration to request access or sign in with an authorized account.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline" size="md" className="gap-2 cursor-pointer">
              <Home className="w-4 h-4" /> Go to Dashboard
            </Button>
          </Link>
          <Link href="/login" onClick={() => logout()}>
            <Button variant="primary" size="md" className="gap-2 cursor-pointer bg-[#125E45] hover:bg-[#197A5A] text-white">
              <LogOut className="w-4 h-4" /> Sign In Different Account
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
