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

  recordCollection(params: {
    customerId: string;
    staffId: string;
    staffName: string;
    amountCollected: number;
    paymentMethod: PaymentMethod;
    notes?: string;
  }): PaymentCollectionRecord | null {
    const customer = customersService.getById(params.customerId);
    if (!customer) return null;

    const previousBalance = customer.currentBalance;
    const newBalance = Math.max(0, previousBalance - params.amountCollected);

    const receiptNumber = `COL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Record customer ledger payment
    customersService.recordKhataPayment({
      customerId: customer.id,
      customerName: customer.name,
      amount: params.amountCollected,
      paymentMethod: params.paymentMethod,
      staffId: params.staffId,
      staffName: params.staffName,
      notes: `Field collection receipt #${receiptNumber} - ${params.notes || ''}`,
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
      newBalance,
      paymentMethod: params.paymentMethod,
      date: new Date().toISOString(),
      notes: params.notes,
    };

    const current = storageService.getCollections();
    storageService.setCollections([record, ...current]);

    return record;
  },
};
