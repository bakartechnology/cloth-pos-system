import { Customer, KhataTransaction, PaymentMethod } from '@/types';
import { storageService } from './storageService';

export const customersService = {
  getAll(): Customer[] {
    return storageService.getCustomers();
  },

  getById(id: string): Customer | undefined {
    return storageService.getCustomers().find(c => c.id === id);
  },

  getByType(type: Customer['type']): Customer[] {
    return storageService.getCustomers().filter(c => c.type === type);
  },

  add(customerData: Omit<Customer, 'id' | 'createdAt' | 'currentBalance' | 'totalPurchased' | 'totalPaid'>): Customer {
    const customers = storageService.getCustomers();
    const newCustomer: Customer = {
      ...customerData,
      id: `cst-${Date.now().toString().slice(-6)}`,
      currentBalance: 0,
      totalPurchased: 0,
      totalPaid: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };

    storageService.setCustomers([newCustomer, ...customers]);
    return newCustomer;
  },

  update(id: string, updates: Partial<Customer>): Customer | null {
    const customers = storageService.getCustomers();
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) return null;

    customers[index] = { ...customers[index], ...updates };
    storageService.setCustomers([...customers]);
    return customers[index];
  },

  getKhataTransactions(customerId?: string): KhataTransaction[] {
    const all = storageService.getKhataTransactions();
    if (!customerId) return all;
    return all.filter(t => t.customerId === customerId);
  },

  recordKhataDebit(params: {
    customerId: string;
    customerName: string;
    amount: number;
    invoiceId: string;
    description: string;
    staffId: string;
    staffName: string;
  }): KhataTransaction | null {
    const customer = this.getById(params.customerId);
    if (!customer) return null;

    const newBalance = customer.currentBalance + params.amount;
    const newTotalPurchased = customer.totalPurchased + params.amount;

    // Update customer balance
    this.update(customer.id, {
      currentBalance: newBalance,
      totalPurchased: newTotalPurchased,
      lastTransactionDate: new Date().toISOString().split('T')[0],
    });

    // Create ledger transaction
    const newTx: KhataTransaction = {
      id: `kht-${Date.now().toString().slice(-6)}`,
      customerId: customer.id,
      customerName: customer.name,
      date: new Date().toISOString(),
      invoiceId: params.invoiceId,
      type: 'DEBIT',
      amount: params.amount,
      balanceAfter: newBalance,
      description: params.description,
      staffId: params.staffId,
      staffName: params.staffName,
    };

    const allTx = storageService.getKhataTransactions();
    storageService.setKhataTransactions([newTx, ...allTx]);
    return newTx;
  },

  recordKhataPayment(params: {
    customerId: string;
    customerName: string;
    amount: number;
    paymentMethod: PaymentMethod;
    staffId: string;
    staffName: string;
    notes?: string;
  }): { transaction: KhataTransaction; newBalance: number } | null {
    const customer = this.getById(params.customerId);
    if (!customer) return null;

    const newBalance = Math.max(0, customer.currentBalance - params.amount);
    const newTotalPaid = customer.totalPaid + params.amount;

    this.update(customer.id, {
      currentBalance: newBalance,
      totalPaid: newTotalPaid,
      lastTransactionDate: new Date().toISOString().split('T')[0],
    });

    const newTx: KhataTransaction = {
      id: `kht-${Date.now().toString().slice(-6)}`,
      customerId: customer.id,
      customerName: customer.name,
      date: new Date().toISOString(),
      type: 'CREDIT',
      amount: params.amount,
      balanceAfter: newBalance,
      description: `Payment received (${params.paymentMethod}) ${params.notes ? '- ' + params.notes : ''}`,
      staffId: params.staffId,
      staffName: params.staffName,
      paymentMethod: params.paymentMethod,
      notes: params.notes,
    };

    const allTx = storageService.getKhataTransactions();
    storageService.setKhataTransactions([newTx, ...allTx]);
    return { transaction: newTx, newBalance };
  },
};
