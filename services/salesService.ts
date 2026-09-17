import {
  Bill,
  BillItem,
  CartItem,
  SaleType,
  PaymentMethod,
  Customer,
  ReturnTransaction,
  ExchangeTransaction,
  ReturnItemDetail,
} from '@/types';
import { storageService } from './storageService';
import { productsService } from './productsService';
import { customersService } from './customersService';
import { inventoryService } from './inventoryService';

export const salesService = {
  getAllBills(): Bill[] {
    return storageService.getBills();
  },

  getBillById(id: string): Bill | undefined {
    return storageService.getBills().find(b => b.id === id || b.invoiceNumber.toLowerCase() === id.toLowerCase());
  },

  getBillsByType(type: SaleType): Bill[] {
    return storageService.getBills().filter(b => b.saleType === type);
  },

  /**
   * Generates sequential persistent invoice number
   */
  generateInvoiceNumber(type: SaleType): string {
    if (type === 'Retail') {
      return storageService.getNextRetailInvoiceNumber();
    }
    if (type === 'Wholesale') {
      return storageService.getNextWholesaleInvoiceNumber();
    }
    const currentYear = new Date().getFullYear();
    const random = Math.floor(10000 + Math.random() * 90000);
    return `KHT-${currentYear}-${random}`;
  },

  /**
   * Peeks the next upcoming invoice number without incrementing sequence
   */
  peekNextInvoiceNumber(type: SaleType): string {
    if (type === 'Retail') {
      return storageService.peekNextRetailInvoiceNumber();
    }
    if (type === 'Wholesale') {
      return storageService.peekNextWholesaleInvoiceNumber();
    }
    return `KHT-${new Date().getFullYear()}-000000`;
  },

  /**
   * Search bills by customer name or invoice number
   */
  searchBills(query: { customerName?: string; invoiceNumber?: string; saleType?: SaleType }): Bill[] {
    const all = storageService.getBills();
    return all.filter(bill => {
      if (query.saleType && bill.saleType !== query.saleType) {
        return false;
      }

      const matchesInvoice = query.invoiceNumber
        ? bill.invoiceNumber.toLowerCase().includes(query.invoiceNumber.toLowerCase().trim())
        : true;

      const matchesCustomer = query.customerName
        ? ((bill.customerName || '').toLowerCase().includes(query.customerName.toLowerCase().trim()) ||
           (bill.clientName || '').toLowerCase().includes(query.customerName.toLowerCase().trim()) ||
           (bill.customerBusiness || '').toLowerCase().includes(query.customerName.toLowerCase().trim()))
        : true;

      // If both filters are provided, match either or both
      if (query.invoiceNumber && query.customerName) {
        return matchesInvoice || matchesCustomer;
      }
      if (query.invoiceNumber) return matchesInvoice;
      if (query.customerName) return matchesCustomer;

      return true;
    });
  },

  completeSale(params: {
    saleType: SaleType;
    cartItems: CartItem[];
    paymentMethod: PaymentMethod;
    amountReceived: number;
    discountTotal: number;
    taxTotal: number;
    staffId: string;
    staffName: string;
    customer?: Customer;
    customerName?: string;
    customerPhone?: string;
    clientId?: string;
    clientName?: string;
    cardTransactionId?: string;
    bankDetails?: Bill['bankDetails'];
    notes?: string;
  }): Bill {
    // Original subtotal (sum of original unit price * quantity)
    const subtotal = params.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    // Line totals sum is already net of product discounts: sum((price - discountPerUnit) * quantity)
    const lineTotalsSum = params.cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
    // Total discount across the entire cart
    const discountTotal = params.discountTotal !== undefined && params.discountTotal >= 0
      ? params.discountTotal
      : Math.max(0, subtotal - lineTotalsSum);
    // Grand total: lineTotalsSum + taxTotal (eliminates double discount deduction)
    const grandTotal = Math.max(0, lineTotalsSum + params.taxTotal);
    const changeDue = params.paymentMethod === 'Cash' ? Math.max(0, params.amountReceived - grandTotal) : 0;
    const invoiceNumber = this.generateInvoiceNumber(params.saleType);

    const billItems: BillItem[] = params.cartItems.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      sku: item.product.sku,
      unit: item.product.unit,
      quantity: item.quantity,
      price: item.price,
      discountPerUnit: item.discountPerUnit || 0,
      discountPercent: item.discountPercent,
      subtotal: item.lineTotal,
    }));

    const finalCustomerName = params.customerName?.trim() || params.customer?.name || undefined;
    const finalCustomerPhone = params.customerPhone?.trim() || params.customer?.phone || undefined;
    const finalClientId = params.clientId || params.customer?.id;
    const finalClientName = params.clientName || params.customer?.businessName || params.customer?.name;

    const bill: Bill = {
      id: `bil-${Date.now().toString().slice(-6)}`,
      invoiceNumber,
      saleType: params.saleType,
      date: new Date().toISOString(),
      items: billItems,
      subtotal,
      discountTotal: params.discountTotal,
      taxTotal: params.taxTotal,
      grandTotal,
      paymentMethod: params.paymentMethod,
      amountReceived: params.amountReceived,
      changeDue,
      cardTransactionId: params.cardTransactionId,
      bankDetails: params.bankDetails,
      staffId: params.staffId,
      staffName: params.staffName,
      customerId: params.customer?.id,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      customerBusiness: params.customer?.businessName,
      clientId: finalClientId,
      clientName: finalClientName,
      notes: params.notes,
      status: 'Completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Save bill
    const currentBills = storageService.getBills();
    storageService.setBills([bill, ...currentBills]);

    // 2. Deduct inventory & record stock movement
    params.cartItems.forEach(item => {
      const prod = productsService.getById(item.product.id);
      const prevStock = prod ? prod.stock : 0;
      const newStock = Math.max(0, prevStock - item.quantity);

      productsService.updateStock(item.product.id, -item.quantity);

      inventoryService.recordMovement({
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        movementType: 'Sale',
        quantityChange: -item.quantity,
        previousStock: prevStock,
        newStock,
        staffName: params.staffName,
        referenceId: invoiceNumber,
        notes: `${params.saleType} sale invoice #${invoiceNumber}`,
      });
    });

    // 3. Update customer transaction ledger if Khata or registered Customer
    if (params.customer) {
      if (params.paymentMethod === 'Credit/Khata' || params.saleType === 'Khata') {
        customersService.recordKhataDebit({
          customerId: params.customer.id,
          customerName: params.customer.name,
          amount: grandTotal,
          invoiceId: invoiceNumber,
          description: `Sale invoice #${invoiceNumber} (${params.saleType})`,
          staffId: params.staffId,
          staffName: params.staffName,
        });
      } else {
        const currentPurchased = params.customer.totalPurchased || 0;
        customersService.update(params.customer.id, {
          totalPurchased: currentPurchased + grandTotal,
          lastTransactionDate: new Date().toISOString().split('T')[0],
        });
      }
    }

    return bill;
  },

  /**
   * Process a Product Return
   * Restores stock to inventory and marks the original bill with return details.
   */
  processReturn(params: {
    originalInvoiceNumber: string;
    items: {
      productId: string;
      quantityReturned: number;
      refundAmount: number;
    }[];
    reason: string;
    staffId: string;
    staffName: string;
    notes?: string;
  }): { success: boolean; message: string; returnTransaction?: ReturnTransaction; updatedBill?: Bill } {
    const bills = storageService.getBills();
    const billIndex = bills.findIndex(b => b.invoiceNumber === params.originalInvoiceNumber);

    if (billIndex === -1) {
      return { success: false, message: `Invoice #${params.originalInvoiceNumber} not found.` };
    }

    const bill = bills[billIndex];
    const returnItems: ReturnItemDetail[] = [];
    let totalRefund = 0;

    for (const ret of params.items) {
      if (ret.quantityReturned <= 0) continue;
      const billItem = bill.items.find(i => i.productId === ret.productId);
      if (!billItem) continue;

      const prod = productsService.getById(ret.productId);
      const prevStock = prod ? prod.stock : 0;
      const newStock = prevStock + ret.quantityReturned;

      // 1. Restore stock
      productsService.updateStock(ret.productId, ret.quantityReturned);

      // 2. Record movement
      inventoryService.recordMovement({
        productId: ret.productId,
        productName: billItem.productName,
        sku: billItem.sku,
        movementType: 'Return',
        quantityChange: ret.quantityReturned,
        previousStock: prevStock,
        newStock,
        staffName: params.staffName,
        referenceId: bill.invoiceNumber,
        notes: `Customer return for invoice #${bill.invoiceNumber} - Reason: ${params.reason}`,
      });

      returnItems.push({
        productId: ret.productId,
        productName: billItem.productName,
        sku: billItem.sku,
        unit: billItem.unit,
        quantityReturned: ret.quantityReturned,
        originalPrice: billItem.price,
        refundAmount: ret.refundAmount,
      });

      totalRefund += ret.refundAmount;
    }

    if (returnItems.length === 0) {
      return { success: false, message: 'No valid items selected for return.' };
    }

    const returnTx: ReturnTransaction = {
      id: `ret-${Date.now().toString().slice(-6)}`,
      originalInvoiceNumber: bill.invoiceNumber,
      date: new Date().toISOString(),
      items: returnItems,
      totalRefundAmount: totalRefund,
      reason: params.reason,
      staffId: params.staffId,
      staffName: params.staffName,
      customerName: bill.customerName,
      notes: params.notes,
    };

    // Update bill
    const existingReturns = bill.returns || [];
    const updatedBill: Bill = {
      ...bill,
      returns: [...existingReturns, returnTx],
      status: 'Returned',
      updatedAt: new Date().toISOString(),
    };

    bills[billIndex] = updatedBill;
    storageService.setBills(bills);

    // Save to global returns log
    const allReturns = storageService.getReturns();
    storageService.setReturns([returnTx, ...(allReturns as unknown[])]);

    return {
      success: true,
      message: `Return processed successfully. Restocked ${returnItems.length} item(s).`,
      returnTransaction: returnTx,
      updatedBill,
    };
  },

  /**
   * Process a Product Exchange
   * Exchanges an original returned item for a new item.
   * Adjusts stock for both items and records price difference.
   */
  processExchange(params: {
    originalInvoiceNumber: string;
    returnedItem: {
      productId: string;
      quantity: number;
    };
    newItem: {
      productId: string;
      quantity: number;
    };
    staffId: string;
    staffName: string;
    notes?: string;
  }): {
    success: boolean;
    message: string;
    exchangeTransaction?: ExchangeTransaction;
    updatedBill?: Bill;
    priceDifference?: number;
  } {
    const bills = storageService.getBills();
    const billIndex = bills.findIndex(b => b.invoiceNumber === params.originalInvoiceNumber);

    if (billIndex === -1) {
      return { success: false, message: `Invoice #${params.originalInvoiceNumber} not found.` };
    }

    const bill = bills[billIndex];
    const billItem = bill.items.find(i => i.productId === params.returnedItem.productId);
    if (!billItem) {
      return { success: false, message: 'Original item not found in this invoice.' };
    }

    const returnedProd = productsService.getById(params.returnedItem.productId);
    const newProd = productsService.getById(params.newItem.productId);

    if (!returnedProd || !newProd) {
      return { success: false, message: 'Product records could not be located.' };
    }

    if (newProd.stock < params.newItem.quantity) {
      return {
        success: false,
        message: `Insufficient stock for replacement product "${newProd.name}". Available: ${newProd.stock}`,
      };
    }

    // 1. Restock returned item
    const retPrevStock = returnedProd.stock;
    const retNewStock = retPrevStock + params.returnedItem.quantity;
    productsService.updateStock(params.returnedItem.productId, params.returnedItem.quantity);

    inventoryService.recordMovement({
      productId: params.returnedItem.productId,
      productName: returnedProd.name,
      sku: returnedProd.sku,
      movementType: 'Return',
      quantityChange: params.returnedItem.quantity,
      previousStock: retPrevStock,
      newStock: retNewStock,
      staffName: params.staffName,
      referenceId: bill.invoiceNumber,
      notes: `Exchanged back: Invoice #${bill.invoiceNumber}`,
    });

    // 2. Deduct new item stock
    const newPrevStock = newProd.stock;
    const newPostStock = newPrevStock - params.newItem.quantity;
    productsService.updateStock(params.newItem.productId, -params.newItem.quantity);

    inventoryService.recordMovement({
      productId: params.newItem.productId,
      productName: newProd.name,
      sku: newProd.sku,
      movementType: 'Sale',
      quantityChange: -params.newItem.quantity,
      previousStock: newPrevStock,
      newStock: newPostStock,
      staffName: params.staffName,
      referenceId: bill.invoiceNumber,
      notes: `Exchanged given: Invoice #${bill.invoiceNumber}`,
    });

    // 3. Compute price difference
    const originalCredit = billItem.price * params.returnedItem.quantity;
    const newCost = newProd.retailPrice * params.newItem.quantity;
    const priceDifference = newCost - originalCredit; // >0: customer owes, <0: refund due

    const exchangeTx: ExchangeTransaction = {
      id: `exc-${Date.now().toString().slice(-6)}`,
      originalInvoiceNumber: bill.invoiceNumber,
      date: new Date().toISOString(),
      returnedItem: {
        productId: returnedProd.id,
        productName: returnedProd.name,
        quantity: params.returnedItem.quantity,
        price: billItem.price,
      },
      newItem: {
        productId: newProd.id,
        productName: newProd.name,
        quantity: params.newItem.quantity,
        price: newProd.retailPrice,
      },
      priceDifference,
      amountPaidOrRefunded: Math.abs(priceDifference),
      staffId: params.staffId,
      staffName: params.staffName,
      customerName: bill.customerName,
      notes: params.notes,
    };

    // Update bill
    const existingExchanges = bill.exchanges || [];
    const updatedBill: Bill = {
      ...bill,
      exchanges: [...existingExchanges, exchangeTx],
      status: 'Exchanged',
      updatedAt: new Date().toISOString(),
    };

    bills[billIndex] = updatedBill;
    storageService.setBills(bills);

    const allExchanges = storageService.getExchanges();
    storageService.setExchanges([exchangeTx, ...(allExchanges as unknown[])]);

    return {
      success: true,
      message: 'Exchange processed successfully.',
      exchangeTransaction: exchangeTx,
      updatedBill,
      priceDifference,
    };
  },
};
