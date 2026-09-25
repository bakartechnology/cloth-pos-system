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
  KeyRound,
  Lock,
  CheckCircle2,
  Eye,
  EyeOff,
  Edit2,
} from 'lucide-react';
import Link from 'next/link';
import { staffService } from '@/services/staffService';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Staff, StaffRole } from '@/types';

export default function StaffPage() {
  const { toast } = useToast();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit / Password Reset Modal State
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<StaffRole>('Retail Cashier');
  const [editCounter, setEditCounter] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setStaffList(staffService.getAll());
  }, []);

  const handleOpenEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditPhone(staff.phone);
    setEditRole(staff.role);
    setEditCounter(staff.counter);
    setNewPassword('');
    setShowPassword(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    if (!editName.trim()) {
      toast({ title: 'Validation Error', description: 'Name cannot be empty.', type: 'error' });
      return;
    }

    if (newPassword && newPassword.trim().length < 4) {
      toast({ title: 'Weak Password', description: 'New password must be at least 4 characters.', type: 'error' });
      return;
    }

    const updates: Partial<Staff> = {
      name: editName.trim(),
      phone: editPhone.trim(),
      role: editRole,
      counter: editCounter.trim(),
    };

    if (newPassword.trim()) {
      updates.password = newPassword.trim();
    }

    const updated = staffService.update(editingStaff.id, updates);
    if (updated) {
      setStaffList(staffService.getAll());
      setEditingStaff(null);
      toast({
        title: 'Account Updated',
        description: newPassword.trim()
          ? `Password reset and profile updated for @${editingStaff.username}.`
          : `Profile details updated for @${editingStaff.username}.`,
        type: 'success',
      });
    }
  };

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

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                  <span className="text-[10px] text-slate-400">
                    {staff.role === 'Admin' ? 'Universal Access' : `${staff.permissions.length} perms`}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(staff)}
                      className="text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-50 h-7 px-2 gap-1 font-semibold"
                    >
                      <KeyRound className="w-3 h-3 text-amber-600" /> Password
                    </Button>
                    <Link href={`/staff/permissions?staffId=${staff.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-7 px-2 font-semibold">
                        Rights
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Modal: Edit Staff Account & Reset Password */}
          <Modal
            isOpen={!!editingStaff}
            onClose={() => setEditingStaff(null)}
            title="Edit Staff Account & Reset Password"
            description="Manage account details and update counter login password. Username is permanent."
            maxWidth="md"
          >
            {editingStaff && (
              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Login Username (Fixed Account Identifier)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value={editingStaff.username}
                      className="w-full text-xs font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 cursor-not-allowed select-none"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                      <Lock className="w-3 h-3 text-slate-400" /> Read-Only
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Username is fixed after creation and serves as the unique system identifier.
                  </p>
                </div>

                <div>
                  <Input
                    label="Staff Full Name *"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      label="Mobile Phone"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <Select
                      label="Role"
                      value={editRole}
                      onChange={e => setEditRole(e.target.value as StaffRole)}
                    >
                      <option value="Retail Cashier">Retail Cashier</option>
                      <option value="Wholesale Cashier">Wholesale Cashier</option>
                      <option value="Khata Staff">Khata Staff</option>
                      <option value="Stock Manager">Stock Manager</option>
                      <option value="Payment Collection Staff">Payment Collection Staff</option>
                      <option value="Admin">Admin</option>
                    </Select>
                  </div>
                </div>

                <div>
                  <Input
                    label="Assigned Counter / Desk"
                    value={editCounter}
                    onChange={e => setEditCounter(e.target.value)}
                  />
                </div>

                {/* Password Change / Reset Field */}
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>Reset / Change Password</span>
                  </div>
                  <p className="text-[10px] text-amber-800">
                    Enter a new security password below to change or reset. Leave blank to keep current password unchanged. Stored passwords are never displayed in plain text.
                  </p>
                  <div className="relative pt-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min. 4 characters)..."
                      className="w-full text-xs font-semibold text-slate-900 bg-white border border-amber-300 rounded-xl px-3 py-2 pr-16 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-[calc(50%+2px)] -translate-y-1/2 text-slate-500 hover:text-slate-700 text-xs font-semibold px-1"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button type="button" variant="outline" size="md" onClick={() => setEditingStaff(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="md" className="gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Save Account Changes
                  </Button>
                </div>
              </form>
            )}
          </Modal>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
