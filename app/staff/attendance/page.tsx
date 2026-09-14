'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  Calendar,
  Search,
  ArrowLeft,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { staffService } from '@/services/staffService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { StaffAttendance, AttendanceStatus } from '@/types';

export default function AttendancePage() {
  const { currentStaff } = useAuth();
  const { toast } = useToast();

  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendance[]>([]);
  const [filterDate, setFilterDate] = useState('2026-09-09');
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [markStatus, setMarkStatus] = useState<AttendanceStatus>('Present');

  useEffect(() => {
    setAttendanceRecords(staffService.getAttendance());
    if (currentStaff) {
      setSelectedStaffId(currentStaff.id);
    }
  }, [currentStaff]);

  const handleClockCurrent = (status: AttendanceStatus) => {
    if (!currentStaff) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const todayStr = now.toISOString().split('T')[0];

    staffService.markAttendance({
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      role: currentStaff.role,
      date: todayStr,
      checkIn: timeStr,
      checkOut: 'Active',
      workingHours: 8.5,
      status,
    });

    setAttendanceRecords(staffService.getAttendance());
    toast({
      title: `Clocked In: ${status}`,
      description: `${currentStaff.name} recorded as ${status} at ${timeStr}.`,
      type: 'success',
    });
  };

  const handleManualMark = (e: React.FormEvent) => {
    e.preventDefault();
    const staff = staffService.getById(selectedStaffId);
    if (!staff) return;

    staffService.markAttendance({
      staffId: staff.id,
      staffName: staff.name,
      role: staff.role,
      date: filterDate,
      checkIn: markStatus === 'Absent' || markStatus === 'Leave' ? '—' : '09:30 AM',
      checkOut: markStatus === 'Absent' || markStatus === 'Leave' ? '—' : '08:30 PM',
      workingHours: markStatus === 'Absent' || markStatus === 'Leave' ? 0 : 11,
      status: markStatus,
    });

    setAttendanceRecords(staffService.getAttendance());
    setIsMarkModalOpen(false);
    toast({
      title: 'Timesheet Updated',
      description: `Attendance saved for ${staff.name}.`,
      type: 'info',
    });
  };

  const presentCount = attendanceRecords.filter(a => a.status === 'Present').length;
  const lateCount = attendanceRecords.filter(a => a.status === 'Late').length;
  const leaveCount = attendanceRecords.filter(a => a.status === 'Leave' || a.status === 'Absent').length;

  return (
    <ProtectedRoute permission="attendance_view">
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
                  Staff Attendance & Timesheet Logs
                </h1>
                <p className="text-xs text-slate-500">
                  Track shift clock-in, clock-out, daily working hours, and punctual attendance statuses.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => handleClockCurrent('Present')}
                className="gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              >
                <Clock className="w-4 h-4" /> Quick Clock In (Current Staff)
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsMarkModalOpen(true)}
              >
                Manual Entry
              </Button>
            </div>
          </div>

          {/* KPI Attendance Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Present Staff Today
              </span>
              <div className="text-2xl font-black text-emerald-600 mt-1">{presentCount} Members</div>
              <div className="text-xs text-slate-500 mt-0.5">Active at counters & warehouse</div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Late Check-ins
              </span>
              <div className="text-2xl font-black text-amber-600 mt-1">{lateCount} Staff</div>
              <div className="text-xs text-slate-500 mt-0.5">Checked in after 10:00 AM</div>
            </Card>

            <Card className="p-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                On Approved Leave / Absent
              </span>
              <div className="text-2xl font-black text-slate-700 mt-1">{leaveCount} Members</div>
              <div className="text-xs text-slate-500 mt-0.5">Medical or personal sanctioned leaves</div>
            </Card>
          </div>

          {/* Attendance Table */}
          <Card className="overflow-hidden">
            <CardHeader className="py-4 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold">Shift Attendance Roster</CardTitle>
                <CardDescription>Daily clock-in times and verified working hours</CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-mono"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Staff Name & Station</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Check In</th>
                      <th className="py-3 px-4">Check Out</th>
                      <th className="py-3 px-4 text-center">Working Hours</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceRecords.map(att => (
                      <tr key={att.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{att.staffName}</td>
                        <td className="py-3 px-4 text-slate-600">{att.role}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{att.date}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">{att.checkIn}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{att.checkOut || 'Active'}</td>
                        <td className="py-3 px-4 text-center font-bold font-mono">
                          {att.workingHours > 0 ? `${att.workingHours} hrs` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            size="sm"
                            variant={
                              att.status === 'Present'
                                ? 'success'
                                : att.status === 'Late'
                                ? 'warning'
                                : 'destructive'
                            }
                          >
                            {att.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                          {att.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modal: Manual Attendance Adjustment */}
        <Modal
          isOpen={isMarkModalOpen}
          onClose={() => setIsMarkModalOpen(false)}
          title="Manual Attendance Override"
          description="Supervisor entry for leave approval or shift adjustments."
          maxWidth="md"
        >
          <form onSubmit={handleManualMark} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Staff Member *
              </label>
              <select
                value={selectedStaffId}
                onChange={e => setSelectedStaffId(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
              >
                {staffService.getAll().map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Select
                label="Attendance Status *"
                value={markStatus}
                onChange={e => setMarkStatus(e.target.value as AttendanceStatus)}
              >
                <option value="Present">Present (On Time)</option>
                <option value="Late">Late Arrival</option>
                <option value="Leave">Sanctioned Leave</option>
                <option value="Absent">Unexcused Absent</option>
              </Select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="md" onClick={() => setIsMarkModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" className="gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4" /> Save Record
              </Button>
            </div>
          </form>
        </Modal>
      </AppShell>
    </ProtectedRoute>
  );
}
