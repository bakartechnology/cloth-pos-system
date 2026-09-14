'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { UserPlus, ArrowLeft, CheckCircle2, Shield } from 'lucide-react';
import Link from 'next/link';
import { staffService } from '@/services/staffService';
import { ALL_PERMISSIONS } from '@/data/mockData';
import { useToast } from '@/context/ToastContext';
import { StaffRole, PermissionKey } from '@/types';

export default function AddStaffPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<StaffRole>('Retail Cashier');
  const [counter, setCounter] = useState('Counter 01 (Retail)');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([
    'dashboard_view',
    'pos_retail',
    'bills_view',
  ]);

  const togglePermission = (key: PermissionKey) => {
    setSelectedPermissions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleRoleChange = (newRole: StaffRole) => {
    setRole(newRole);
    if (newRole === 'Admin') {
      setSelectedPermissions(ALL_PERMISSIONS.map(p => p.key));
      setCounter('Executive Office');
    } else if (newRole === 'Retail Cashier') {
      setSelectedPermissions(['dashboard_view', 'pos_retail', 'bills_view']);
      setCounter('Counter 01 (Retail)');
    } else if (newRole === 'Wholesale Cashier') {
      setSelectedPermissions(['dashboard_view', 'pos_wholesale', 'bills_view', 'customers_view']);
      setCounter('Counter 02 (Wholesale)');
    } else if (newRole === 'Khata Staff') {
      setSelectedPermissions(['dashboard_view', 'pos_khata', 'customers_view', 'bills_view']);
      setCounter('Accounts Desk');
    } else if (newRole === 'Stock Manager') {
      setSelectedPermissions(['dashboard_view', 'stock_view', 'stock_add', 'barcode_view']);
      setCounter('Warehouse Terminal');
    } else if (newRole === 'Payment Collection Staff') {
      setSelectedPermissions(['dashboard_view', 'customers_view', 'payment_collection']);
      setCounter('Field Operations');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) {
      toast({ title: 'Validation Error', description: 'Name and username are required.', type: 'error' });
      return;
    }

    const existing = staffService.getByUsername(username);
    if (existing) {
      toast({ title: 'Username Taken', description: `Username "${username}" already exists.`, type: 'error' });
      return;
    }

    const created = staffService.add({
      name,
      phone: phone || '+92 300 0000000',
      username: username.toLowerCase().trim(),
      role,
      status: 'Active',
      counter,
      permissions: role === 'Admin' ? ALL_PERMISSIONS.map(p => p.key) : selectedPermissions,
    });

    toast({
      title: 'Staff Member Created',
      description: `${created.name} registered as ${created.role}.`,
      type: 'success',
    });

    router.push('/staff');
  };

  return (
    <ProtectedRoute permission="staff_view">
      <AppShell>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/staff">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Back to Staff
              </Button>
            </Link>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Create New Staff / Cashier Account
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Profile Credentials & Assigned Counter</CardTitle>
                <CardDescription>Setup identity, terminal login username, and assigned station.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Staff Full Name *"
                      placeholder="e.g. Tariq Mehmood"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Input
                      label="Mobile Phone *"
                      placeholder="e.g. +92 321 4567890"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Input
                      label="Login Username *"
                      placeholder="e.g. tariq.cashier"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Select
                      label="Assigned Role *"
                      value={role}
                      onChange={e => handleRoleChange(e.target.value as StaffRole)}
                    >
                      <option value="Retail Cashier">Retail Cashier</option>
                      <option value="Wholesale Cashier">Wholesale Cashier</option>
                      <option value="Khata Staff">Khata Staff</option>
                      <option value="Stock Manager">Stock Manager</option>
                      <option value="Payment Collection Staff">Payment Collection Staff</option>
                      <option value="Admin">Admin (Universal Access)</option>
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <Input
                      label="Assigned Counter / Desk"
                      placeholder="e.g. Counter 01 (Retail Front)"
                      value={counter}
                      onChange={e => setCounter(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permissions Matrix Checklist */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" /> Module Access Rights & Permission Checklist
                </CardTitle>
                <CardDescription>
                  Checked permissions grant direct access and render navigation shortcuts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ALL_PERMISSIONS.map(p => {
                    const isChecked = role === 'Admin' || selectedPermissions.includes(p.key);
                    return (
                      <label
                        key={p.key}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-blue-50/50 border-blue-200 text-slate-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={role === 'Admin'}
                          checked={isChecked}
                          onChange={() => togglePermission(p.key)}
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="font-semibold">{p.label}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.key}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link href="/staff">
                <Button type="button" variant="outline" size="md">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="primary" size="lg" className="font-bold gap-2">
                <CheckCircle2 className="w-4 h-4" /> Save Staff Account
              </Button>
            </div>
          </form>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
