import { PaymentCollectionRecord, PaymentMethod, ChequeItem, SaleType } from '@/types';
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

  createWholesaleChequeRecord(params: {
    invoiceNumber: string;
    customerId: string;
    customerName: string;
    customerPhone?: string;
    staffId: string;
    staffName: string;
    chequeAmount: number;
    chequeNumber: string;
    bankName: string;
    clearingDate: string;
    primaryMethod: 'Cash' | 'Bank Transfer';
    primaryAmount: number;
    saleType?: SaleType;
    cheques?: {
      bankName: string;
      chequeNumber?: string;
      chequeAmount: number;
      clearingDate: string;
    }[];
  }): PaymentCollectionRecord {
    const customer = customersService.getById(params.customerId);
    const prevBal = customer?.currentBalance || 0;

    const chqSaleType: SaleType = params.saleType || 'Wholesale';

    const chqItems: ChequeItem[] =
      params.cheques && params.cheques.length > 0
        ? params.cheques.map((c, i) => ({
            id: `chq-${Date.now().toString().slice(-6)}-${i + 1}-${Math.random().toString(36).slice(2, 6)}`,
            chequeAmount: c.chequeAmount,
            clearingDate: c.clearingDate,
            chequeNumber: c.chequeNumber || '',
            bankName: c.bankName,
            status: 'Pending',
            invoiceNumber: params.invoiceNumber,
            customerId: params.customerId,
            customerName: params.customerName,
            customerPhone: params.customerPhone,
            saleType: chqSaleType,
          }))
        : [
            {
              id: `chq-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6)}`,
              chequeAmount: params.chequeAmount,
              clearingDate: params.clearingDate,
              chequeNumber: params.chequeNumber,
              bankName: params.bankName,
              status: 'Pending',
              invoiceNumber: params.invoiceNumber,
              customerId: params.customerId,
              customerName: params.customerName,
              customerPhone: params.customerPhone,
              saleType: chqSaleType,
            },
          ];

    const totalChequeAmount = chqItems.reduce((sum, item) => sum + item.chequeAmount, 0);

    const record: PaymentCollectionRecord = {
      id: `col-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6)}`,
      receiptNumber: `CHQ-${params.invoiceNumber}`,
      customerId: params.customerId,
      customerName: params.customerName,
      customerPhone: params.customerPhone || '',
      customerCity: customer?.city || 'Lahore',
      staffId: params.staffId,
      staffName: params.staffName,
      previousBalance: prevBal,
      amountCollected: params.primaryAmount + totalChequeAmount,
      cashAmount: params.primaryMethod === 'Cash' ? params.primaryAmount : 0,
      chequeAmount: totalChequeAmount,
      cheques: chqItems,
      newBalance: prevBal,
      paymentMethod: 'Split',
      date: new Date().toISOString(),
      notes: `${chqSaleType} Split: Rs. ${params.primaryAmount.toLocaleString()} ${params.primaryMethod} + Rs. ${totalChequeAmount.toLocaleString()} in ${chqItems.length} Cheque(s)`,
      collectionType: chqSaleType === 'Khata' ? 'Khata' : 'Wholesale',
      clientId: params.customerId,
      clientName: params.customerName,
    };

    const current = storageService.getCollections();
    storageService.setCollections([record, ...current]);
    return record;
  },

  passCheque(
    collectionId: string,
    chequeId: string,
    staffId?: string,
    staffName?: string
  ): { success: boolean; message: string; customerName?: string; amount?: number; clearedAt?: string } {
    const collections = storageService.getCollections();
    const colIndex = collections.findIndex(c => c.id === collectionId);
    if (colIndex === -1) {
      return { success: false, message: 'Collection record not found.' };
    }

    const col = collections[colIndex];
    if (!col.cheques) return { success: false, message: 'No cheques found in record.' };

    const chqIndex = col.cheques.findIndex(c => c.id === chequeId);
    if (chqIndex === -1) return { success: false, message: 'Cheque not found.' };

    const chq = col.cheques[chqIndex];
    if (chq.status === 'Passed') {
      return { success: false, message: 'Cheque has already been passed.' };
    }

    const clearedAt = new Date().toISOString();
    chq.status = 'Passed';
    chq.passedAt = clearedAt;

    const invoiceNum = chq.invoiceNumber || col.receiptNumber.replace('CHQ-', '');
    const currentCustomer = customersService.getById(col.customerId);

    // Deduct from customer balance & record CREDIT transaction on statement using current date (click date!)
    if (currentCustomer) {
      customersService.recordKhataPayment({
        customerId: currentCustomer.id,
        customerName: currentCustomer.name,
        amount: chq.chequeAmount,
        paymentMethod: 'Cheque',
        staffId: staffId || 'staff-admin',
        staffName: staffName || 'System Cashier',
        notes: `Cheque Passed & Cleared (#${chq.chequeNumber || 'N/A'} - ${chq.bankName || 'Bank'}) for Wholesale Invoice #${invoiceNum}`,
      });
    }

    // Update Bill splitPayment status if present
    const bills = storageService.getBills();
    const billIndex = bills.findIndex(b => b.invoiceNumber === invoiceNum);
    if (billIndex !== -1 && bills[billIndex].splitPayment) {
      bills[billIndex].splitPayment!.chequeStatus = 'Passed';
      bills[billIndex].splitPayment!.chequePassedAt = clearedAt;
      storageService.setBills(bills);
    }

    storageService.setCollections(collections);

    return {
      success: true,
      message: `Cheque #${chq.chequeNumber || ''} of Rs. ${chq.chequeAmount.toLocaleString()} marked as Passed.`,
      customerName: col.customerName,
      amount: chq.chequeAmount,
      clearedAt,
    };
  },

  getWholesalePendingCheques(): {
    collectionId: string;
    receiptNumber: string;
    customerId: string;
    customerName: string;
    customerPhone?: string;
    staffName: string;
    cheque: ChequeItem;
    isDueToday: boolean;
    isOverdue: boolean;
    originType: 'Wholesale' | 'Khata';
  }[] {
    const todayStr = new Date().toISOString().split('T')[0];
    const collections = storageService.getCollections();
    const results: any[] = [];

    collections.forEach(col => {
      if (col.cheques && col.cheques.length > 0) {
        col.cheques.forEach(chq => {
          if (chq.status !== 'Passed') {
            const isDueToday = chq.clearingDate === todayStr;
            const isOverdue = chq.clearingDate < todayStr;
            const originType: 'Wholesale' | 'Khata' =
              chq.saleType === 'Khata' || col.collectionType === 'Khata' ? 'Khata' : 'Wholesale';
            results.push({
              collectionId: col.id,
              receiptNumber: col.receiptNumber,
              customerId: col.customerId,
              customerName: col.customerName,
              customerPhone: col.customerPhone,
              staffName: col.staffName,
              cheque: chq,
              isDueToday,
              isOverdue,
              originType,
            });
          }
        });
      }
    });

    return results.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.isDueToday && !b.isDueToday) return -1;
      if (!a.isDueToday && b.isDueToday) return 1;
      return a.cheque.clearingDate.localeCompare(b.cheque.clearingDate);
    });
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
          if (chq.status !== 'Passed' && chq.clearingDate <= dateStr) {
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
