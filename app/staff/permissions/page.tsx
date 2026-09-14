'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Shield,
  Check,
  X,
  Save,
  ArrowLeft,
  Lock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { staffService } from '@/services/staffService';
import { ALL_PERMISSIONS } from '@/data/mockData';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Staff, PermissionKey } from '@/types';

export default function PermissionsMatrixPage() {
  const { refreshStaff } = useAuth();
  const { toast } = useToast();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [activeStaffId, setActiveStaffId] = useState<string>('stf-002'); // Default to Tariq Mehmood for demonstration

  useEffect(() => {
    const list = staffService.getAll();
    setStaffList(list);
  }, []);

  const selectedStaff = staffList.find(s => s.id === activeStaffId) || staffList[0];

  const handleToggle = (permissionKey: PermissionKey) => {
    if (!selectedStaff || selectedStaff.role === 'Admin') return;

    const currentPerms = selectedStaff.permissions || [];
    const updated = currentPerms.includes(permissionKey)
      ? currentPerms.filter(k => k !== permissionKey)
      : [...currentPerms, permissionKey];

    staffService.updatePermissions(selectedStaff.id, updated);
    setStaffList(staffService.getAll());
    refreshStaff();

    toast({
      title: 'Permission Toggled',
      description: `Updated access to ${permissionKey} for ${selectedStaff.name}.`,
      type: 'info',
    });
  };

  return (
    <ProtectedRoute permission="staff_view">
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-3">
              <Link href="/staff">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Staff
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Access Control & Custom Permission Matrix
                </h1>
                <p className="text-xs text-slate-500">
                  Granular role permissions controlling sidebar navigation visibility and protected route barriers.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left: Staff Selector List */}
            <Card className="p-4 flex flex-col h-[600px]">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Staff Account
              </label>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {staffList.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActiveStaffId(s.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all text-xs ${
                      activeStaffId === s.id
                        ? 'bg-blue-50 border border-blue-300 text-blue-950 font-bold shadow-2xs'
                        : 'hover:bg-slate-50 border border-transparent text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{s.name}</div>
                      <div className="text-[10px] text-slate-400">@{s.username}</div>
                    </div>
                    <Badge
                      size="sm"
                      variant={s.role === 'Admin' ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {s.role}
                    </Badge>
                  </button>
                ))}
              </div>
            </Card>

            {/* Right: Permission Toggle Grid for Selected Staff */}
            {selectedStaff && (
              <Card className="lg:col-span-3 p-6 flex flex-col justify-between h-[600px]">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">{selectedStaff.name}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Role: <span className="font-semibold text-slate-800">{selectedStaff.role}</span> | Counter: {selectedStaff.counter}
                      </p>
                    </div>
                    {selectedStaff.role === 'Admin' && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-200">
                        <Lock className="w-3.5 h-3.5" /> Full Root Administrator
                      </div>
                    )}
                  </div>

                  {/* Matrix Checkboxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4 max-h-[440px] overflow-y-auto pr-1">
                    {ALL_PERMISSIONS.map(p => {
                      const isGranted =
                        selectedStaff.role === 'Admin' ||
                        (selectedStaff.permissions && selectedStaff.permissions.includes(p.key));

                      return (
                        <div
                          key={p.key}
                          onClick={() => handleToggle(p.key)}
                          className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer select-none text-xs ${
                            selectedStaff.role === 'Admin'
                              ? 'bg-slate-50 border-slate-200 opacity-70 cursor-not-allowed'
                              : isGranted
                              ? 'bg-blue-50/60 border-blue-300 text-slate-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              {p.group}
                            </span>
                            <div className="font-bold text-slate-900 text-xs mt-0.5">{p.label}</div>
                            <div className="font-mono text-[10px] text-slate-400 mt-0.5">{p.key}</div>
                          </div>

                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ml-3 ${
                              isGranted
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {isGranted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Changes take effect immediately across all client sessions and menu drawers.
                  </span>
                </div>
              </Card>
            )}
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
