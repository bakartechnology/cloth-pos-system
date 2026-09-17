import { StaffKhataRecord, StaffKhataCheque } from '@/types';

const STORAGE_KEY = 'anf_staff_khata_records';

const INITIAL_STAFF_KHATA_RECORDS: StaffKhataRecord[] = [
  {
    id: 'sk-1001',
    recordNumber: 'SK-2026-041',
    staffId: 'staff-004',
    staffName: 'Tariq Mehmood',
    cities: ['Faisalabad', 'Multan'],
    date: '2026-09-14',
    cashAmount: 45000,
    cheques: [
      {
        id: 'chq-sk-1',
        amount: 30000,
        chequeNumber: 'HBL-948102',
        bankName: 'Habib Bank Limited (HBL)',
        passingDate: '2026-09-22',
      },
      {
        id: 'chq-sk-2',
        amount: 20000,
        chequeNumber: 'MEZN-441092',
        bankName: 'Meezan Bank Limited',
        passingDate: '2026-09-28',
      },
    ],
    chequeCount: 2,
    totalChequeAmount: 50000,
    grandTotal: 95000,
    notes: 'Outstation recovery from wholesale fabric merchants in Rail Bazaar Faisalabad & Multan Cantt.',
    createdAt: '2026-09-14T14:30:00.000Z',
    updatedAt: '2026-09-14T14:30:00.000Z',
  },
  {
    id: 'sk-1002',
    recordNumber: 'SK-2026-042',
    staffId: 'staff-005',
    staffName: 'Imran Nazir',
    cities: ['Gujranwala', 'Sialkot', 'Gujrat'],
    date: '2026-09-12',
    cashAmount: 35000,
    cheques: [
      {
        id: 'chq-sk-3',
        amount: 40000,
        chequeNumber: 'MCB-810291',
        bankName: 'MCB Bank Limited',
        passingDate: '2026-09-25',
      },
    ],
    chequeCount: 1,
    totalChequeAmount: 40000,
    grandTotal: 75000,
    notes: 'Payment collected from 3 retail distributors in Gujranwala Cloth Market.',
    createdAt: '2026-09-12T17:15:00.000Z',
    updatedAt: '2026-09-12T17:15:00.000Z',
  },
];

export const staffKhataService = {
  getAll(): StaffKhataRecord[] {
    if (typeof window === 'undefined') return INITIAL_STAFF_KHATA_RECORDS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_STAFF_KHATA_RECORDS));
        return INITIAL_STAFF_KHATA_RECORDS;
      }
      return JSON.parse(stored);
    } catch {
      return INITIAL_STAFF_KHATA_RECORDS;
    }
  },

  getById(id: string): StaffKhataRecord | undefined {
    return this.getAll().find(r => r.id === id);
  },

  saveAll(records: StaffKhataRecord[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  },

  generateRecordNumber(): string {
    const year = new Date().getFullYear();
    const count = this.getAll().length + 1;
    return `SK-${year}-${String(count).padStart(3, '0')}`;
  },

  add(
    data: Omit<
      StaffKhataRecord,
      'id' | 'recordNumber' | 'chequeCount' | 'totalChequeAmount' | 'grandTotal' | 'createdAt' | 'updatedAt'
    > & {
      cheques: StaffKhataCheque[];
    }
  ): StaffKhataRecord {
    const records = this.getAll();
    const now = new Date().toISOString();

    const cashAmount = Math.max(0, data.cashAmount || 0);
    const validCheques = (data.cheques || []).map(chq => ({
      ...chq,
      amount: Math.max(0, Number(chq.amount) || 0),
    }));
    const totalChequeAmount = validCheques.reduce((sum, c) => sum + c.amount, 0);
    const grandTotal = cashAmount + totalChequeAmount;

    const newRecord: StaffKhataRecord = {
      id: `sk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      recordNumber: this.generateRecordNumber(),
      staffId: data.staffId,
      staffName: data.staffName.trim(),
      cities: data.cities.filter(Boolean),
      date: data.date || now.split('T')[0],
      cashAmount,
      cheques: validCheques,
      chequeCount: validCheques.length,
      totalChequeAmount,
      grandTotal,
      notes: data.notes?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    this.saveAll([newRecord, ...records]);
    return newRecord;
  },

  update(
    id: string,
    data: Partial<
      Omit<StaffKhataRecord, 'id' | 'recordNumber' | 'chequeCount' | 'totalChequeAmount' | 'grandTotal' | 'createdAt' | 'updatedAt'>
    > & {
      cheques?: StaffKhataCheque[];
    }
  ): StaffKhataRecord | null {
    const records = this.getAll();
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return null;

    const existing = records[index];
    const now = new Date().toISOString();

    const cashAmount =
      data.cashAmount !== undefined ? Math.max(0, data.cashAmount) : existing.cashAmount;

    const cheques =
      data.cheques !== undefined
        ? data.cheques.map(c => ({ ...c, amount: Math.max(0, Number(c.amount) || 0) }))
        : existing.cheques;

    const totalChequeAmount = cheques.reduce((sum, c) => sum + c.amount, 0);
    const grandTotal = cashAmount + totalChequeAmount;

    const updated: StaffKhataRecord = {
      ...existing,
      staffId: data.staffId !== undefined ? data.staffId : existing.staffId,
      staffName: data.staffName !== undefined ? data.staffName.trim() : existing.staffName,
      cities: data.cities !== undefined ? data.cities.filter(Boolean) : existing.cities,
      date: data.date !== undefined ? data.date : existing.date,
      cashAmount,
      cheques,
      chequeCount: cheques.length,
      totalChequeAmount,
      grandTotal,
      notes: data.notes !== undefined ? data.notes.trim() : existing.notes,
      updatedAt: now,
    };

    records[index] = updated;
    this.saveAll(records);
    return updated;
  },

  delete(id: string): boolean {
    const records = this.getAll();
    const filtered = records.filter(r => r.id !== id);
    if (filtered.length === records.length) return false;
    this.saveAll(filtered);
    return true;
  },
};
