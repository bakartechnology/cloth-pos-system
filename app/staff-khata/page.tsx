'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import {
  Briefcase,
  Plus,
  Search,
  MapPin,
  Calendar,
  Banknote,
  Printer,
  Trash2,
  Edit2,
  Eye,
  CheckCircle2,
  Building,
  Download,
  X,
  Sparkles,
} from 'lucide-react';
import { staffKhataService } from '@/services/staffKhataService';
import { staffService } from '@/services/staffService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Staff, StaffKhataRecord, StaffKhataCheque } from '@/types';
import { StaffKhataPrint } from '@/components/print/StaffKhataPrint';

export default function StaffKhataPage() {
  const { currentStaff, hasPermission } = useAuth();
  const { toast } = useToast();

  const [records, setRecords] = useState<StaffKhataRecord[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State: Form (Add / Edit)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Form Fields
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [customStaffName, setCustomStaffName] = useState<string>('');
  const [useCustomStaffName, setUseCustomStaffName] = useState(false);

  const [cities, setCities] = useState<string[]>([]);
  const [newCityInput, setNewCityInput] = useState('');

  const [recordDate, setRecordDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cheques, setCheques] = useState<StaffKhataCheque[]>([]);
  const [notes, setNotes] = useState('');

  // View / Print Modal State
  const [viewRecord, setViewRecord] = useState<StaffKhataRecord | null>(null);
  const [printRecord, setPrintRecord] = useState<StaffKhataRecord | null>(null);

  // Delete Confirmation
  const [deletingRecord, setDeletingRecord] = useState<StaffKhataRecord | null>(null);

  useEffect(() => {
    setRecords(staffKhataService.getAll());
    const staffList = staffService.getAll();
    setAllStaff(staffList);
    if (staffList.length > 0) {
      setSelectedStaffId(staffList[0].id);
    }
  }, []);

  // Live Auto Calculations
  const totalCash = Math.max(0, cashAmount);
  const totalCheques = cheques.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const totalChequeCount = cheques.length;
  const grandTotal = totalCash + totalChequeAmountFormula(cheques, totalCash);

  function totalChequeAmountFormula(list: StaffKhataCheque[], cash: number) {
    return list.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }

  // City Handlers
  const handleAddCity = () => {
    const trimmed = newCityInput.trim();
    if (!trimmed) return;
    if (cities.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: 'City Exists', description: `${trimmed} is already in the visit list.`, type: 'info' });
      return;
    }
    setCities(prev => [...prev, trimmed]);
    setNewCityInput('');
  };

  const handleRemoveCity = (cityToRemove: string) => {
    setCities(prev => prev.filter(c => c !== cityToRemove));
  };

  // Cheque Handlers
  const handleAddCheque = () => {
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    setCheques(prev => [
      ...prev,
      {
        id: `chq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        amount: 0,
        chequeNumber: '',
        bankName: '',
        passingDate: nextWeek,
      },
    ]);
  };

  const handleRemoveCheque = (id: string) => {
    setCheques(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateCheque = (id: string, field: keyof StaffKhataCheque, val: any) => {
    setCheques(prev => prev.map(c => (c.id === id ? { ...c, [field]: val } : c)));
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingRecordId(null);
    if (allStaff.length > 0) {
      setSelectedStaffId(allStaff[0].id);
    }
    setCustomStaffName('');
    setUseCustomStaffName(false);
    setCities(['Faisalabad']);
    setNewCityInput('');
    setRecordDate(new Date().toISOString().split('T')[0]);
    setCashAmount(0);
    setCheques([]);
    setNotes('');
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (rec: StaffKhataRecord) => {
    setEditingRecordId(rec.id);
    const matchedStaff = allStaff.find(s => s.id === rec.staffId || s.name === rec.staffName);
    if (matchedStaff) {
      setSelectedStaffId(matchedStaff.id);
      setUseCustomStaffName(false);
      setCustomStaffName('');
    } else {
      setSelectedStaffId('');
      setUseCustomStaffName(true);
      setCustomStaffName(rec.staffName);
    }

    setCities([...rec.cities]);
    setNewCityInput('');
    setRecordDate(rec.date);
    setCashAmount(rec.cashAmount);
    setCheques(rec.cheques.map(c => ({ ...c })));
    setNotes(rec.notes || '');
    setIsFormModalOpen(true);
  };

  // Save Record (Add or Update)
  const handleSave = (andPrint = false) => {
    const finalStaffName = useCustomStaffName
      ? customStaffName.trim()
      : allStaff.find(s => s.id === selectedStaffId)?.name || customStaffName.trim();

    if (!finalStaffName) {
      toast({ title: 'Validation Error', description: 'Please select or enter a staff member name.', type: 'error' });
      return;
    }

    if (cities.length === 0) {
      toast({ title: 'Validation Error', description: 'Please add at least one city visited by the staff member.', type: 'error' });
      return;
    }

    if (grandTotal <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please specify either a cash payment amount or add cheque entries.',
        type: 'error',
      });
      return;
    }

    // Validate individual cheques
    for (let i = 0; i < cheques.length; i++) {
      const c = cheques[i];
      if (!c.amount || c.amount <= 0) {
        toast({ title: 'Validation Error', description: `Cheque #${i + 1} must have a valid positive amount.`, type: 'error' });
        return;
      }
    }

    let savedRecord: StaffKhataRecord | null = null;

    if (editingRecordId) {
      savedRecord = staffKhataService.update(editingRecordId, {
        staffId: useCustomStaffName ? undefined : selectedStaffId,
        staffName: finalStaffName,
        cities,
        date: recordDate,
        cashAmount: totalCash,
        cheques,
        notes,
      });

      toast({
        title: 'Staff Khata Record Updated',
        description: `Voucher #${savedRecord?.recordNumber}: Updated with Grand Total Rs. ${grandTotal.toLocaleString()}.`,
        type: 'success',
      });
    } else {
      savedRecord = staffKhataService.add({
        staffId: useCustomStaffName ? undefined : selectedStaffId,
        staffName: finalStaffName,
        cities,
        date: recordDate,
        cashAmount: totalCash,
        cheques,
        notes,
      });

      toast({
        title: 'Staff Khata Record Saved',
        description: `Voucher #${savedRecord.recordNumber}: Recorded with Grand Total Rs. ${grandTotal.toLocaleString()}.`,
        type: 'success',
      });
    }

    setRecords(staffKhataService.getAll());
    setIsFormModalOpen(false);

    if (andPrint && savedRecord) {
      setPrintRecord(savedRecord);
    }
  };

  const handleDelete = () => {
    if (!deletingRecord) return;
    staffKhataService.delete(deletingRecord.id);
    setRecords(staffKhataService.getAll());
    toast({
      title: 'Record Deleted',
      description: `Voucher #${deletingRecord.recordNumber} has been removed.`,
      type: 'info',
    });
    setDeletingRecord(null);
  };

  // Filtered list
  const filteredRecords = records.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.recordNumber.toLowerCase().includes(q) ||
      r.staffName.toLowerCase().includes(q) ||
      r.cities.some(c => c.toLowerCase().includes(q)) ||
      (r.notes && r.notes.toLowerCase().includes(q))
    );
  });

  const totalCashRecorded = records.reduce((sum, r) => sum + r.cashAmount, 0);
  const totalChequesRecorded = records.reduce((sum, r) => sum + r.totalChequeAmount, 0);
  const totalAllRecorded = records.reduce((sum, r) => sum + r.grandTotal, 0);

  return (
    <ProtectedRoute permission="staff_khata">
      <AppShell>
        {/* If Print Mode is active, render full-page print component */}
        {printRecord ? (
          <StaffKhataPrint record={printRecord} onClose={() => setPrintRecord(null)} />
        ) : (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="p-1 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold uppercase">
                    Outstation Finance
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Intercity Travel & Cash/Cheque Audit</span>
                </div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Staff Khata & Outstation Recovery
                </h1>
                <p className="text-xs text-slate-500">
                  Records for staff members sent to other cities to collect or deliver money, cheques, and fabrics on behalf of the business.
                </p>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={handleOpenAddModal}
                className="gap-2 font-bold bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Staff Khata
              </Button>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4 bg-gradient-to-br from-blue-50/50 to-white">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Reconciled Volume
                </span>
                <div className="text-2xl font-black text-blue-700 mt-1">
                  Rs. {totalAllRecorded.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Cash + All Outstation Cheques</div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-emerald-50/50 to-white">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Outstation Cash
                </span>
                <div className="text-xl font-black text-emerald-700 mt-1">
                  Rs. {totalCashRecorded.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Deposited directly to head cash counter</div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-amber-50/50 to-white">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Cheques Collected
                </span>
                <div className="text-xl font-black text-amber-700 mt-1">
                  Rs. {totalChequesRecorded.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Dated and post-dated client cheques</div>
              </Card>
            </div>

            {/* Saved Staff Khata Records Table */}
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold">Staff Khata Outstation Vouchers</CardTitle>
                  <CardDescription>
                    Audited field collection trips, cities visited, cash receipts, and cheques.
                  </CardDescription>
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search voucher #, staff name, city..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Voucher #</th>
                        <th className="py-3 px-4">Staff Member</th>
                        <th className="py-3 px-4">Cities Visited</th>
                        <th className="py-3 px-4">Trip Date</th>
                        <th className="py-3 px-4 text-right">Cash Payment</th>
                        <th className="py-3 px-4 text-right">Cheques</th>
                        <th className="py-3 px-4 text-right text-blue-700">Grand Total</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            No Staff Khata records found matching your search.
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map(rec => (
                          <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                              {rec.recordNumber}
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{rec.staffName}</div>
                              {rec.notes && (
                                <div className="text-[10px] text-slate-400 max-w-xs truncate">{rec.notes}</div>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {rec.cities.map((city, idx) => (
                                  <Badge key={idx} size="sm" variant="secondary">
                                    📍 {city}
                                  </Badge>
                                ))}
                              </div>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                              {new Date(rec.date).toLocaleDateString('en-PK', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>

                            <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                              Rs. {rec.cashAmount.toLocaleString()}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="font-mono font-medium text-amber-800">
                                Rs. {rec.totalChequeAmount.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {rec.chequeCount} Cheque{rec.chequeCount === 1 ? '' : 's'}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right font-black text-blue-700 font-mono text-sm">
                              Rs. {rec.grandTotal.toLocaleString()}
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setViewRecord(rec)}
                                  className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(rec)}
                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                  title="Edit Record"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPrintRecord(rec)}
                                  className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                                  title="Print / Export PDF"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingRecord(rec)}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal: Add / Edit Staff Khata Form */}
        <Modal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          title={editingRecordId ? 'Edit Staff Khata Record' : 'Record Staff Khata & Outstation Recovery'}
          description="Enter details of cities visited by staff, collected cash, individual cheques, and calculate totals."
          maxWidth="xl"
        >
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSave(false);
            }}
            className="space-y-4 text-xs"
          >
            {/* Field A: Staff Name */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">Staff Member Assigned *</label>
                <button
                  type="button"
                  onClick={() => setUseCustomStaffName(!useCustomStaffName)}
                  className="text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
                >
                  {useCustomStaffName ? '← Select from Staff Directory' : '+ Enter Custom Staff Name'}
                </button>
              </div>

              {useCustomStaffName ? (
                <Input
                  label="Staff Name *"
                  placeholder="e.g. Tariq Mehmood (Outstation Officer)"
                  value={customStaffName}
                  onChange={e => setCustomStaffName(e.target.value)}
                  required
                />
              ) : (
                <select
                  value={selectedStaffId}
                  onChange={e => setSelectedStaffId(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {allStaff.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role}) — {s.phone}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Field B: Cities Visited (Multi-City with Add City +) */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" /> Cities Visited on Outstation Trip *
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Multiple Cities Supported</span>
              </div>

              {/* City Input & Add Button */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type city name (e.g. Faisalabad, Multan, Gujranwala)..."
                  value={newCityInput}
                  onChange={e => setNewCityInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCity();
                    }
                  }}
                  className="flex-1 h-9 px-3 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddCity}
                  className="gap-1 text-xs font-bold text-blue-700 border-blue-300 hover:bg-blue-50 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add City (+)
                </Button>
              </div>

              {/* Cities Tag List */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {cities.length === 0 ? (
                  <span className="text-[11px] text-slate-400 italic">No cities added yet. Add at least one city above.</span>
                ) : (
                  cities.map(city => (
                    <span
                      key={city}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-800 shadow-2xs"
                    >
                      📍 {city}
                      <button
                        type="button"
                        onClick={() => handleRemoveCity(city)}
                        className="text-slate-400 hover:text-rose-600 ml-1 rounded-full"
                        title="Remove city"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Field C & D: Date and Cash Payment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Visit / Collection Date *
                </label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={e => setRecordDate(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <Input
                  label="Cash Payment (Rs.)"
                  type="number"
                  min="0"
                  value={cashAmount}
                  onChange={e => setCashAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Field E: Cheque Details with Add Cheque (+) */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-slate-800 text-xs">
                    Cheque Collection Details ({cheques.length})
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddCheque}
                  className="gap-1 text-xs font-bold text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Cheque (+)
                </Button>
              </div>

              {cheques.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 text-xs">
                  No cheque entries added. If staff collected cheques on this trip, click{' '}
                  <span className="font-semibold text-amber-700">"Add Cheque (+)"</span>.
                </div>
              ) : (
                <div className="space-y-3">
                  {cheques.map((chq, idx) => (
                    <div
                      key={chq.id}
                      className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          Cheque #{idx + 1} Details
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCheque(chq.id)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition-colors"
                          title="Remove cheque"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <Input
                            label="Cheque Amount (Rs.) *"
                            type="number"
                            min="1"
                            value={chq.amount || ''}
                            onChange={e =>
                              handleUpdateCheque(chq.id, 'amount', parseFloat(e.target.value) || 0)
                            }
                            placeholder="e.g. 25000"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Passing / Clearing Date
                          </label>
                          <input
                            type="date"
                            value={chq.passingDate || ''}
                            onChange={e => handleUpdateCheque(chq.id, 'passingDate', e.target.value)}
                            className="w-full h-10 px-3 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <Input
                            label="Cheque Number"
                            placeholder="e.g. HBL-840291"
                            value={chq.chequeNumber || ''}
                            onChange={e => handleUpdateCheque(chq.id, 'chequeNumber', e.target.value)}
                          />
                        </div>
                        <div>
                          <Input
                            label="Issuing Bank"
                            placeholder="e.g. Meezan Bank / HBL"
                            value={chq.bankName || ''}
                            onChange={e => handleUpdateCheque(chq.id, 'bankName', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Field F: Automatic Totals Box */}
            <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2">
              <div className="flex justify-between items-center pb-1 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Payment Summary</span>
                <span>Auto Calculated</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>Cash Total:</span>
                <span className="font-mono font-bold">Rs. {totalCash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>Total Number of Cheques:</span>
                <span className="font-mono font-bold">{totalChequeCount} Cheque{totalChequeCount === 1 ? '' : 's'}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>Total Cheque Amount:</span>
                <span className="font-mono font-bold">Rs. {totalCheques.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-700 text-emerald-400">
                <span>Grand Total = Cash + Cheques:</span>
                <span className="font-mono text-base text-emerald-300">Rs. {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Input
                label="Staff Outstation Notes / Visit Details"
                placeholder="e.g. Delivered 40 Thaan fabrics; collected payment from 2 wholesale parties in Rail Bazaar."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {/* Bottom Form Action Buttons: Save, Save & Print, Export PDF, Cancel */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button type="button" variant="outline" size="md" onClick={() => setIsFormModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => handleSave(true)}
                className="gap-1.5 font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              >
                <Printer className="w-4 h-4" /> Save & Print
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="gap-1.5 font-bold bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle2 className="w-4 h-4" /> Save Record
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: View Details */}
        <Modal
          isOpen={!!viewRecord}
          onClose={() => setViewRecord(null)}
          title="Staff Khata Outstation Voucher Details"
          maxWidth="lg"
        >
          {viewRecord && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Voucher #</span>
                  <div className="font-black text-blue-700 text-base">{viewRecord.recordNumber}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Date</span>
                  <div className="font-bold text-slate-800">
                    {new Date(viewRecord.date).toLocaleDateString('en-PK', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Staff Member:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{viewRecord.staffName}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Cities Visited:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {viewRecord.cities.map((city, idx) => (
                      <Badge key={idx} size="sm" variant="secondary">
                        📍 {city}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <div className="p-3 bg-slate-50 flex justify-between font-bold border-b border-slate-200">
                  <span>Cash Payment:</span>
                  <span className="font-mono text-slate-900">Rs. {viewRecord.cashAmount.toLocaleString()}</span>
                </div>

                <div className="p-3 space-y-2">
                  <div className="font-bold text-slate-700">
                    Cheques Collected ({viewRecord.chequeCount}):
                  </div>
                  {viewRecord.cheques.length === 0 ? (
                    <div className="text-slate-400 italic">No cheques recorded.</div>
                  ) : (
                    viewRecord.cheques.map((chq, idx) => (
                      <div
                        key={chq.id || idx}
                        className="p-2 rounded bg-amber-50/70 border border-amber-200 flex justify-between text-[11px]"
                      >
                        <div>
                          <span className="font-bold">Cheque #{idx + 1}</span>
                          {chq.chequeNumber && ` (${chq.chequeNumber})`}
                          {chq.bankName && ` — ${chq.bankName}`}
                          {chq.passingDate && ` [Pass: ${chq.passingDate}]`}
                        </div>
                        <div className="font-bold font-mono">Rs. {chq.amount.toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 bg-slate-900 text-white flex justify-between font-bold text-sm">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-400">Rs. {viewRecord.grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {viewRecord.notes && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                  <span className="font-bold text-slate-700">Notes:</span> {viewRecord.notes}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <Button variant="outline" size="sm" onClick={() => setViewRecord(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const target = viewRecord;
                    setViewRecord(null);
                    setPrintRecord(target);
                  }}
                  className="gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print / Export PDF
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal: Delete Confirmation */}
        <Modal
          isOpen={!!deletingRecord}
          onClose={() => setDeletingRecord(null)}
          title="Delete Staff Khata Record?"
          maxWidth="sm"
        >
          {deletingRecord && (
            <div className="space-y-4 text-xs">
              <p className="text-slate-600">
                Are you sure you want to delete Voucher{' '}
                <span className="font-bold text-slate-900">#{deletingRecord.recordNumber}</span> for{' '}
                <span className="font-bold text-slate-900">{deletingRecord.staffName}</span> (Total Rs.{' '}
                {deletingRecord.grandTotal.toLocaleString()})?
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setDeletingRecord(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDelete}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  Confirm Delete
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </AppShell>
    </ProtectedRoute>
  );
}
