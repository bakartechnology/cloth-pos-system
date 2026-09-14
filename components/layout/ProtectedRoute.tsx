'use client';

import React from 'react';
import { PermissionKey } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../ui/Button';
import Link from 'next/link';

interface ProtectedRouteProps {
  permission: PermissionKey;
  children: React.ReactNode;
}

export function ProtectedRoute({ permission, children }: ProtectedRouteProps) {
  const { currentStaff, hasPermission, isLoading, switchRole } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isAllowed = hasPermission(permission);

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-md mb-2">
          Your active account <span className="font-semibold text-slate-700">({currentStaff?.name} - {currentStaff?.role})</span> does not have the required permission <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono">{permission}</code> to access this screen.
        </p>
        <p className="text-xs text-slate-400 mb-6">
          Contact your store administrator or switch to the Admin role in the top header to test this module.
        </p>
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline" size="md" className="gap-2">
              <Home className="w-4 h-4" /> Go to Dashboard
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            onClick={() => switchRole('Admin')}
            className="gap-2"
          >
            Switch to Admin Demo
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
