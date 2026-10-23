import {
  Bill,
  BillItem,
  CartItem,
  SaleType,
  PaymentMethod,
  Customer,
  CustomerType,
  ReturnTransaction,
  ExchangeTransaction,
  ReturnItemDetail,
} from '@/types';
import { storageService } from './storageService';
import { productsService } from './productsService';
import { customersService } from './customersService';
import { inventoryService } from './inventoryService';
import { paymentsService } from './paymentsService';

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
    if (type === 'Khata') {
      return storageService.getNextKhataInvoiceNumber();
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
    if (type === 'Khata') {
      return storageService.peekNextKhataInvoiceNumber();
    }
    return `KHT-${new Date().getFullYear()}-000001`;
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
    counter?: string;
    customer?: Customer;
    customerName?: string;
    customerPhone?: string;
    clientId?: string;
    clientName?: string;
    cardTransactionId?: string;
    bankDetails?: Bill['bankDetails'];
    splitPayment?: Bill['splitPayment'];
    notes?: string;
    pandiId?: string;
    pandiName?: string;
    pandiPhone?: string;
  }): Bill {
    // Original subtotal (sum of original unit price * quantity)
    const subtotal = params.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    // Line totals sum is already net of product discounts: sum((price - discountPerUnit) * quantity)
    const lineTotalsSum = params.cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
    // Total discount across the entire cart
    const calculatedDiscount = Math.max(0, subtotal - lineTotalsSum);
    const discountTotal = params.discountTotal !== undefined && params.discountTotal > 0
      ? params.discountTotal
      : calculatedDiscount;
    // Grand total: lineTotalsSum + taxTotal (eliminates double discount deduction)
    const grandTotal = Math.max(0, lineTotalsSum + params.taxTotal);
    const changeDue = (params.paymentMethod === 'Cash' || params.paymentMethod === 'Split')
      ? Math.max(0, params.amountReceived - grandTotal)
      : 0;
    const invoiceNumber = this.generateInvoiceNumber(params.saleType);

    const billItems: BillItem[] = params.cartItems.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      sku: item.product.sku,
      unit: item.product.unit,
      selectedUnit: item.selectedUnit,
      quantity: item.quantity,
      price: item.price,
      discountPerUnit: item.discountPerUnit || 0,
      discountPercent: item.discountPercent,
      extraDiscountRupees: item.extraDiscountRupees || 0,
      subtotal: item.lineTotal,
    }));

    const finalCustomerName = params.customerName?.trim() || params.customer?.name || undefined;
    const finalCustomerPhone = params.customerPhone?.trim() || params.customer?.phone || undefined;
    const finalClientId = params.clientId || params.customer?.id;
    const finalClientName = params.clientName || params.customer?.businessName || params.customer?.name;

    const targetAccountType: CustomerType =
      params.saleType === 'Wholesale' ? 'Wholesale' :
      params.saleType === 'Khata' ? 'Khata' : 'Retail';

    let billCustomer = params.customer;
    // Only auto-create customer in CRM for Retail or Khata; Wholesale counter customerName is one-time and should NOT pollute CRM
    if (!billCustomer && finalCustomerName && finalCustomerName !== 'Walk-in customer' && finalCustomerName !== 'Walk-in Wholesale Customer' && params.saleType !== 'Wholesale') {
      billCustomer = customersService.findOrCreateCustomerByName(finalCustomerName, finalCustomerPhone, targetAccountType);
    }

    const bill: Bill = {
      id: `bil-${Date.now().toString().slice(-6)}`,
      invoiceNumber,
      saleType: params.saleType,
      date: new Date().toISOString(),
      items: billItems,
      subtotal,
      discountTotal,
      taxTotal: params.taxTotal,
      grandTotal,
      paymentMethod: params.paymentMethod,
      amountReceived: params.amountReceived,
      changeDue,
      cardTransactionId: params.cardTransactionId,
      bankDetails: params.bankDetails,
      splitPayment: params.splitPayment,
      staffId: params.staffId,
      staffName: params.staffName,
      counter: params.counter,
      customerId: billCustomer?.id,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      customerBusiness: billCustomer?.businessName,
      clientId: finalClientId,
      clientName: finalClientName,
      notes: params.notes,
      pandiId: params.pandiId,
      pandiName: params.pandiName?.trim() || undefined,
      pandiPhone: params.pandiPhone?.trim() || undefined,
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

      const isBox = prod?.packagingConfig?.type === 'box' || item.product.packagingConfig?.type === 'box';
      const suitsPerBox = prod?.packagingConfig?.suitsPerBox || item.product.packagingConfig?.suitsPerBox || 1;
      const deduction = (isBox && item.selectedUnit === 'Box') ? item.quantity * suitsPerBox : item.quantity;
      const newStock = Math.max(0, prevStock - deduction);

      productsService.updateStock(item.product.id, -deduction);

      inventoryService.recordMovement({
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        movementType: 'Sale',
        quantityChange: -deduction,
        previousStock: prevStock,
        newStock,
        staffName: params.staffName,
        referenceId: invoiceNumber,
        notes: `${params.saleType} sale invoice #${invoiceNumber}${isBox ? ` (${item.quantity} ${item.selectedUnit || 'unit'}${item.selectedUnit === 'Box' ? ` = ${deduction} suits` : ''})` : ''}`,
      });
    });

    // 3. Update customer transaction ledger & account type strictly according to POS origin
    if (billCustomer) {
      const isSplitCheque =
        params.paymentMethod === 'Split' &&
        (params.splitPayment?.mode === 'CashCheque' ||
         params.splitPayment?.mode === 'BankCheque' ||
         params.splitPayment?.mode === 'CashBankCheque');

      if (isSplitCheque && params.splitPayment) {
        // Wholesale / Khata Split with Cheque:
        // Immediate portion (Cash / Bank) is credited immediately.
        // Cheque portion is NOT deducted until approved/passed by admin or cashier!
        let immediatePaid = 0;
        let chequeAmount = 0;
        let primaryMethod: PaymentMethod = 'Cash';

        if (params.splitPayment.mode === 'CashBankCheque') {
          const cashPortion = params.splitPayment.cashAmount || 0;
          const bankPortion = params.splitPayment.bankAmount || 0;
          immediatePaid = cashPortion + bankPortion;
          chequeAmount = params.splitPayment.chequeAmount ?? params.splitPayment.secondaryAmount ?? 0;
          primaryMethod = 'Split';
        } else {
          immediatePaid = params.splitPayment.primaryAmount ?? params.splitPayment.cashAmount ?? 0;
          chequeAmount = params.splitPayment.secondaryAmount || 0;
          primaryMethod = params.splitPayment.primaryMethod || (params.splitPayment.mode === 'BankCheque' ? 'Bank Transfer' : 'Cash');
        }

        // 1. Debit full invoice amount to customer ledger
        customersService.recordKhataDebit({
          customerId: billCustomer.id,
          customerName: billCustomer.name,
          amount: grandTotal,
          invoiceId: invoiceNumber,
          description: `${params.saleType} invoice #${invoiceNumber} (Total Due: Rs. ${grandTotal.toLocaleString()})`,
          staffId: params.staffId,
          staffName: params.staffName,
        });

        // 2. Immediately credit the cash or bank transfer received at the counter
        if (immediatePaid > 0) {
          customersService.recordKhataPayment({
            customerId: billCustomer.id,
            customerName: billCustomer.name,
            amount: immediatePaid,
            paymentMethod: primaryMethod,
            staffId: params.staffId,
            staffName: params.staffName,
            notes: `Counter ${params.splitPayment.mode === 'CashBankCheque' ? `Cash: Rs. ${(params.splitPayment.cashAmount || 0).toLocaleString()} + Bank: Rs. ${(params.splitPayment.bankAmount || 0).toLocaleString()}` : primaryMethod} payment for Invoice #${invoiceNumber}`,
          });
        }

        // 3. Register cheque(s) with 'Pending' status in paymentsService
        paymentsService.createWholesaleChequeRecord({
          invoiceNumber,
          customerId: billCustomer.id,
          customerName: billCustomer.name,
          customerPhone: billCustomer.phone || '',
          staffId: params.staffId,
          staffName: params.staffName,
          chequeAmount,
          chequeNumber: params.splitPayment.chequeNumber || '',
          bankName: params.splitPayment.chequeBankName || '',
          clearingDate: params.splitPayment.chequeClearingDate || new Date().toISOString().split('T')[0],
          primaryMethod: primaryMethod === 'Bank Transfer' ? 'Bank Transfer' : 'Cash',
          primaryAmount: immediatePaid,
          saleType: params.saleType,
          cheques: params.splitPayment.cheques?.map(c => ({
            bankName: c.bankName,
            chequeNumber: c.chequeNumber,
            chequeAmount: c.amount,
            clearingDate: c.clearingDate,
          })),
        });
      } else if (params.paymentMethod === 'Credit/Khata') {
        customersService.update(billCustomer.id, { type: 'Khata' });
        customersService.recordKhataDebit({
          customerId: billCustomer.id,
          customerName: billCustomer.name,
          amount: grandTotal,
          invoiceId: invoiceNumber,
          description: `Sale invoice #${invoiceNumber} (${params.saleType})`,
          staffId: params.staffId,
          staffName: params.staffName,
        });
      } else if (params.saleType === 'Khata' && params.paymentMethod === 'Split' && params.splitPayment?.mode === 'CashBank') {
        // Cash + Bank split without cheque in Khata
        customersService.update(billCustomer.id, { type: 'Khata' });
        customersService.recordKhataDebit({
          customerId: billCustomer.id,
          customerName: billCustomer.name,
          amount: grandTotal,
          invoiceId: invoiceNumber,
          description: `Sale invoice #${invoiceNumber} (Khata)`,
          staffId: params.staffId,
          staffName: params.staffName,
        });
        const paidAmt = (params.splitPayment.cashAmount || 0) + (params.splitPayment.bankAmount || 0);
        if (paidAmt > 0) {
          customersService.recordKhataPayment({
            customerId: billCustomer.id,
            customerName: billCustomer.name,
            amount: paidAmt,
            paymentMethod: 'Split',
            staffId: params.staffId,
            staffName: params.staffName,
            notes: `Counter Cash & Bank Transfer payment for Invoice #${invoiceNumber}`,
          });
        }
      } else if (params.saleType === 'Khata' && (params.paymentMethod === 'Cash' || params.paymentMethod === 'Bank Transfer')) {
        // Immediate counter cash or bank settlement in Khata POS
        customersService.update(billCustomer.id, { type: 'Khata' });
        customersService.recordKhataDebit({
          customerId: billCustomer.id,
          customerName: billCustomer.name,
          amount: grandTotal,
          invoiceId: invoiceNumber,
          description: `Sale invoice #${invoiceNumber} (Khata)`,
          staffId: params.staffId,
          staffName: params.staffName,
        });
        customersService.recordKhataPayment({
          customerId: billCustomer.id,
          customerName: billCustomer.name,
          amount: grandTotal,
          paymentMethod: params.paymentMethod,
          staffId: params.staffId,
          staffName: params.staffName,
          notes: `Counter ${params.paymentMethod} payment for Invoice #${invoiceNumber}`,
        });
      } else {
        const currentPurchased = billCustomer.totalPurchased || 0;
        const currentPaid = billCustomer.totalPaid || 0;
        const paidOnThisBill = params.amountReceived !== undefined ? params.amountReceived : grandTotal;
        customersService.update(billCustomer.id, {
          type: targetAccountType,
          totalPurchased: currentPurchased + grandTotal,
          totalPaid: currentPaid + paidOnThisBill,
          lastTransactionDate: new Date().toISOString().split('T')[0],
        });
      }
    }

    // 4. Update Pandi total trips if assigned
    if (params.pandiName && params.pandiName.trim()) {
      const cleanPandi = params.pandiName.trim();
      const pandis = storageService.getPandis();
      const matched = pandis.find(p => p.id === params.pandiId || p.name.toLowerCase() === cleanPandi.toLowerCase());
      if (matched) {
        storageService.setPandis(
          pandis.map(p => (p.id === matched.id ? { ...p, totalTrips: (p.totalTrips || 0) + 1 } : p))
        );
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
