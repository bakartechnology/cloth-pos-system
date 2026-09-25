import { PaymentCollectionRecord, PaymentMethod } from '@/types';
import { storageService } from './storageService';
import { customersService } from './customersService';

export const paymentsService = {
  getAllCollections(): PaymentCollectionRecord[] {
    return storageService.getCollections();
  },

  getCollectionsByStaff(staffId: string): PaymentCollectionRecord[] {
    return storageService.getCollections().filter(c => c.staffId === staffId);
  },

  getCollectionsByCustomer(customerId: string): PaymentCollectionRecord[] {
    return storageService.getCollections().filter(c => c.customerId === customerId);
  },

  getCollectionsByType(type: 'Khata' | 'Wholesale'): PaymentCollectionRecord[] {
    const all = storageService.getCollections();
    if (type === 'Wholesale') {
      return all.filter(c => c.collectionType === 'Wholesale');
    }
    return all.filter(c => c.collectionType !== 'Wholesale');
  },

  recordCollection(params: {
    customerId: string;
    staffId: string;
    staffName: string;
    amountCollected: number;
    cashAmount?: number;
    chequeAmount?: number;
    cheques?: PaymentCollectionRecord['cheques'];
    paymentMethod: PaymentMethod;
    date?: string;
    notes?: string;
    chequeDetails?: PaymentCollectionRecord['chequeDetails'];
    collectionType?: 'Khata' | 'Wholesale';
    clientId?: string;
    clientName?: string;
  }): PaymentCollectionRecord | null {
    const customer = customersService.getById(params.customerId);
    if (!customer) return null;

    const previousBalance = customer.currentBalance;
    const newBalance = Math.max(0, previousBalance - params.amountCollected);

    const prefix = params.collectionType === 'Wholesale' ? 'WCOL' : 'COL';
    const receiptNumber = `${prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let chequeNote = '';
    if (params.cheques && params.cheques.length > 0) {
      chequeNote = ` [${params.cheques.length} Cheque(s) totaling Rs. ${(params.chequeAmount || 0).toLocaleString()} (Pass Dates: ${params.cheques.map(c => c.clearingDate).join(', ')})]`;
    } else if (params.chequeDetails?.clearingDate) {
      chequeNote = ` [Cheque #${params.chequeDetails.chequeNumber || 'N/A'}, Amount: Rs. ${(params.chequeDetails.chequeAmount || params.amountCollected).toLocaleString()}, Clearing Date: ${params.chequeDetails.clearingDate}, Bank: ${params.chequeDetails.bankName || 'N/A'}]`;
    }

    // 1. Record customer ledger payment
    const moduleLabel = params.collectionType === 'Wholesale' ? 'Wholesale client recovery' : 'Field collection';
    customersService.recordKhataPayment({
      customerId: customer.id,
      customerName: customer.name,
      amount: params.amountCollected,
      paymentMethod: params.paymentMethod,
      staffId: params.staffId,
      staffName: params.staffName,
      notes: `${moduleLabel} receipt #${receiptNumber}${chequeNote} - ${params.notes || ''}`,
    });

    // 2. Save payment collection record
    const record: PaymentCollectionRecord = {
      id: `col-${Date.now().toString().slice(-6)}`,
      receiptNumber,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerCity: customer.city,
      staffId: params.staffId,
      staffName: params.staffName,
      previousBalance,
      amountCollected: params.amountCollected,
      cashAmount: params.cashAmount ?? (params.paymentMethod === 'Cash' ? params.amountCollected : 0),
      chequeAmount: params.chequeAmount ?? (params.paymentMethod === 'Cheque' ? params.amountCollected : 0),
      cheques: params.cheques,
      newBalance,
      paymentMethod: params.paymentMethod,
      date: params.date || new Date().toISOString(),
      notes: params.notes,
      chequeDetails: params.chequeDetails,
      collectionType: params.collectionType || 'Khata',
      clientId: params.clientId || customer.id,
      clientName: params.clientName || customer.businessName || customer.name,
    };

    const current = storageService.getCollections();
    storageService.setCollections([record, ...current]);

    return record;
  },

  updateChequeStatus(
    collectionId: string,
    chequeId: string,
    status: 'Pending' | 'Passed' | 'Bounced'
  ): boolean {
    const collections = storageService.getCollections();
    const colIndex = collections.findIndex(c => c.id === collectionId);
    if (colIndex === -1) return false;

    const col = collections[colIndex];
    if (!col.cheques) return false;

    const chqIndex = col.cheques.findIndex(c => c.id === chequeId);
    if (chqIndex === -1) return false;

    col.cheques[chqIndex].status = status;
    if (status === 'Passed') {
      col.cheques[chqIndex].passedAt = new Date().toISOString();
    } else {
      delete col.cheques[chqIndex].passedAt;
    }

    storageService.setCollections(collections);
    return true;
  },

  getDueCheques(targetDate?: string) {
    const dateStr = targetDate || new Date().toISOString().split('T')[0];
    const collections = storageService.getCollections();
    const results: {
      collectionId: string;
      receiptNumber: string;
      customerName: string;
      staffName: string;
      cheque: NonNullable<PaymentCollectionRecord['cheques']>[number];
    }[] = [];

    collections.forEach(col => {
      if (col.cheques && col.cheques.length > 0) {
        col.cheques.forEach(chq => {
          if (chq.status !== 'Passed' && chq.clearingDate === dateStr) {
            results.push({
              collectionId: col.id,
              receiptNumber: col.receiptNumber,
              customerName: col.customerName,
              staffName: col.staffName,
              cheque: chq,
            });
          }
        });
      }
    });

    return results;
  },
};
