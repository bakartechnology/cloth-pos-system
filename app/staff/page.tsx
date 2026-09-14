'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  UserCog,
  Plus,
  Search,
  Shield,
  CalendarCheck,
  TrendingUp,
  Settings,
  Phone,
} from 'lucide-react';
import Link from 'next/link';
import { staffService } from '@/services/staffService';
import { Staff } from '@/types';

export default function StaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setStaffList(staffService.getAll());
  }, []);

  const filteredStaff = staffList.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    return !q || s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || s.username.toLowerCase().includes(q);
  });

  return (
    <ProtectedRoute permission="staff_view">
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold uppercase">
                  Staff Management
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {staffList.length} registered accounts
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Staff Directory & Cashier Roster
              </h1>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/staff/permissions">
                <Button variant="outline" size="md" className="gap-1.5 font-semibold">
                  <Shield className="w-4 h-4 text-blue-600" /> Permission Matrix
                </Button>
              </Link>
              <Link href="/staff/attendance">
                <Button variant="outline" size="md" className="gap-1.5 font-semibold">
                  <CalendarCheck className="w-4 h-4 text-emerald-600" /> Attendance Timesheets
                </Button>
              </Link>
              <Link href="/staff/add">
                <Button variant="primary" size="md" className="gap-1.5 font-bold shadow-sm">
                  <Plus className="w-4 h-4" /> Add New Staff
                </Button>
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <Card className="p-4">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff name, username, or role..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
              />
            </div>
          </Card>

          {/* Staff Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map(staff => (
              <Card key={staff.id} hoverEffect className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                        {staff.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 leading-tight">{staff.name}</h3>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">@{staff.username}</p>
                      </div>
                    </div>
                    <Badge
                      size="sm"
                      variant={
                        staff.role === 'Admin'
                          ? 'default'
                          : staff.role === 'Payment Collection Staff'
                          ? 'success'
                          : staff.role === 'Khata Staff'
                          ? 'warning'
                          : 'cyan'
                      }
                    >
                      {staff.role}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 my-3">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium w-16">Counter:</span>
                      <span className="font-semibold text-slate-800">{staff.counter}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium w-16">Phone:</span>
                      <span>{staff.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium w-16">Joined:</span>
                      <span>{staff.joinedDate}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {staff.role === 'Admin' ? 'Universal Access' : `${staff.permissions.length} permissions active`}
                  </span>
                  <Link href={`/staff/permissions?staffId=${staff.id}`}>
                    <Button variant="ghost" size="sm" className="text-xs text-blue-600 h-7 px-2">
                      Edit Rights
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
