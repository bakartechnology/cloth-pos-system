import { Bill, CartItem, SaleType, PaymentMethod, Customer } from '@/types';
import { storageService } from './storageService';
import { productsService } from './productsService';
import { customersService } from './customersService';
import { inventoryService } from './inventoryService';

export const salesService = {
  getAllBills(): Bill[] {
    return storageService.getBills();
  },

  getBillById(id: string): Bill | undefined {
    return storageService.getBills().find(b => b.id === id || b.invoiceNumber === id);
  },

  getBillsByType(type: SaleType): Bill[] {
    return storageService.getBills().filter(b => b.saleType === type);
  },

  generateInvoiceNumber(type: SaleType): string {
    const prefix = type === 'Retail' ? 'ANF-R' : type === 'Wholesale' ? 'ANF-W' : 'ANF-K';
    const random = Math.floor(10000 + Math.random() * 90000);
    const dateStr = new Date().toISOString().slice(2, 7).replace('-', '');
    return `${prefix}-${dateStr}-${random}`;
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
    notes?: string;
  }): Bill {
    const subtotal = params.cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const grandTotal = Math.max(0, subtotal - params.discountTotal + params.taxTotal);
    const changeDue = params.paymentMethod === 'Cash' ? Math.max(0, params.amountReceived - grandTotal) : 0;
    const invoiceNumber = this.generateInvoiceNumber(params.saleType);

    const billItems = params.cartItems.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      sku: item.product.sku,
      unit: item.product.unit,
      quantity: item.quantity,
      price: item.price,
      discountPercent: item.discountPercent,
      subtotal: item.lineTotal,
    }));

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
      staffId: params.staffId,
      staffName: params.staffName,
      customerId: params.customer?.id,
      customerName: params.customer?.name,
      customerPhone: params.customer?.phone,
      customerBusiness: params.customer?.businessName,
      notes: params.notes,
      status: 'Completed',
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

    // 3. Update customer transaction ledger if Khata or Credit sale
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
        // Cash or Card sale for registered customer - update totalPurchased
        const currentPurchased = params.customer.totalPurchased || 0;
        customersService.update(params.customer.id, {
          totalPurchased: currentPurchased + grandTotal,
          lastTransactionDate: new Date().toISOString().split('T')[0],
        });
      }
    }

    return bill;
  },
};
