'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { WholesaleInvoicePrint } from '@/components/print/WholesaleInvoicePrint';
import {
  Truck,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Building,
  User,
  CreditCard,
  Banknote,
  BookOpen,
  ArrowRight,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { productsService } from '@/services/productsService';
import { customersService } from '@/services/customersService';
import { salesService } from '@/services/salesService';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { Product, Customer, PaymentMethod, Bill } from '@/types';

export default function WholesalePOSPage() {
  const { currentStaff } = useAuth();
  const { toast } = useToast();
  const {
    wholesaleCart,
    addToWholesaleCart,
    removeFromWholesaleCart,
    updateWholesaleQuantity,
    updateWholesaleDiscount,
    clearWholesaleCart,
    wholesaleSubtotal,
    wholesaleDiscountTotal,
    wholesaleGrandTotal,
  } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [wholesaleCustomers, setWholesaleCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Wholesale Checkout State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [amountPaidNow, setAmountPaidNow] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [completedBill, setCompletedBill] = useState<Bill | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  useEffect(() => {
    setProducts(productsService.getAll());
    // Filter wholesale and khata customers
    const clients = customersService.getAll().filter(c => c.type === 'Wholesale' || c.type === 'Khata');
    setWholesaleCustomers(clients);
    if (clients.length > 0) {
      setSelectedCustomer(clients[0]);
    }
  }, []);

  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.wholesaleBarcode.includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  const handleOpenCheckout = () => {
    if (wholesaleCart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add products at wholesale rates before proceeding.',
        type: 'warning',
      });
      return;
    }
    if (!selectedCustomer) {
      toast({
        title: 'Customer Required',
        description: 'Wholesale sales require selecting a registered business or customer.',
        type: 'error',
      });
      return;
    }

    setAmountPaidNow(paymentMethod === 'Credit/Khata' ? 0 : wholesaleGrandTotal);
    setIsCheckoutOpen(true);
  };

  const handleCompleteWholesaleSale = () => {
    if (!currentStaff || !selectedCustomer) return;

    const bill = salesService.completeSale({
      saleType: 'Wholesale',
      cartItems: wholesaleCart,
      paymentMethod,
      amountReceived: amountPaidNow,
      discountTotal: wholesaleDiscountTotal,
      taxTotal: 0,
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      customer: selectedCustomer,
      notes,
    });

    setCompletedBill(bill);
    clearWholesaleCart();
    setIsCheckoutOpen(false);
    setIsInvoiceModalOpen(true);
    setProducts(productsService.getAll());
    // Refresh customer balances
    setWholesaleCustomers(
      customersService.getAll().filter(c => c.type === 'Wholesale' || c.type === 'Khata')
    );
  };

  return (
    <ProtectedRoute permission="pos_wholesale">
      <AppShell>
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-7rem)] overflow-hidden">
          {/* LEFT: Product Catalog with Wholesale Rates */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            {/* Header / Client Selector */}
            <div className="p-4 border-b border-slate-200/80 space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white flex items-center justify-center font-bold text-sm">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 leading-tight">Wholesale & Bulk POS</h2>
                    <p className="text-[11px] text-slate-500">Tiered Wholesale Price Engine (PKR)</p>
                  </div>
                </div>

                {/* Wholesale Customer Selection Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Client:</span>
                  <select
                    value={selectedCustomer?.id || ''}
                    onChange={e => {
                      const found = wholesaleCustomers.find(c => c.id === e.target.value);
                      setSelectedCustomer(found || null);
                    }}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-bold text-slate-800 max-w-[240px] truncate"
                  >
                    {wholesaleCustomers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.businessName || c.name} ({c.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected Customer Ledger Summary Strip */}
              {selectedCustomer && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">
                      {selectedCustomer.businessName || selectedCustomer.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Attn: {selectedCustomer.name} • {selectedCustomer.phone} • {selectedCustomer.city}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-medium">Khata Balance Owed:</span>
                    <div className="font-black text-rose-600 text-sm">
                      Rs. {selectedCustomer.currentBalance.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search fabric name, SKU, or category for wholesale pricing..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Wholesale Product Catalog Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map(prod => {
                  const inCart = wholesaleCart.find(i => i.product.id === prod.id);
                  const isOutOfStock = prod.stock <= 0;

                  return (
                    <div
                      key={prod.id}
                      onClick={() => !isOutOfStock && addToWholesaleCart(prod)}
                      className={`relative p-3 rounded-xl border flex flex-col justify-between transition-all duration-150 cursor-pointer select-none group ${
                        isOutOfStock
                          ? 'opacity-50 bg-slate-50 border-slate-200 pointer-events-none'
                          : inCart
                          ? 'border-cyan-500 bg-cyan-50/20 shadow-xs'
                          : 'border-slate-200/80 bg-white hover:border-cyan-300 hover:shadow-md'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span className="font-mono">{prod.sku}</span>
                          <span className="font-semibold text-slate-600">
                            {prod.stock} {prod.unit}
                          </span>
                        </div>

                        <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-cyan-600 transition-colors">
                          {prod.name}
                        </h3>
                        <div className="text-[10px] text-slate-400 mt-0.5">{prod.unit}</div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="text-[9px] text-slate-400 line-through">
                            Retail: Rs. {prod.retailPrice.toLocaleString()}
                          </div>
                          <div className="text-xs font-black text-cyan-700">
                            Rs. {prod.wholesalePrice.toLocaleString()}
                          </div>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs transition-colors ${
                            inCart
                              ? 'bg-cyan-600 text-white font-bold'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-cyan-600 group-hover:text-white'
                          }`}
                        >
                          {inCart ? inCart.quantity : <Plus className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Wholesale Bill Panel */}
          <div className="w-full lg:w-96 shrink-0 flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-cyan-600" />
                <h3 className="font-bold text-sm text-slate-900">Wholesale Invoice</h3>
                <span className="text-[11px] bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full font-semibold">
                  {wholesaleCart.length} lines
                </span>
              </div>
              {wholesaleCart.length > 0 && (
                <button
                  onClick={clearWholesaleCart}
                  className="text-slate-400 hover:text-rose-600 text-xs flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
              {wholesaleCart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Truck className="w-12 h-12 mb-2 stroke-1 text-slate-300" />
                  <p className="text-xs font-medium text-slate-600">Wholesale invoice is empty</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                    Click wholesale products to add them to this commercial invoice.
                  </p>
                </div>
              ) : (
                wholesaleCart.map(item => (
                  <div key={item.product.id} className="py-2.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 leading-tight truncate">
                          {item.product.name}
                        </div>
                        <div className="text-[10px] text-cyan-700 font-semibold">
                          Rs. {item.price.toLocaleString()} wholesale / {item.product.unit}
                        </div>
                      </div>
                      <div className="text-xs font-black text-slate-900 shrink-0">
                        Rs. {item.lineTotal.toLocaleString()}
                      </div>
                    </div>

                    {/* Quantity & Line Discount */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                        <button
                          onClick={() => updateWholesaleQuantity(item.product.id, item.quantity - 1)}
                          className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-slate-900 text-xs px-2 min-w-[24px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateWholesaleQuantity(item.product.id, item.quantity + 1)}
                          className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">Disc%:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent || ''}
                          placeholder="0"
                          onChange={e =>
                            updateWholesaleDiscount(item.product.id, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-12 h-6 text-center text-xs border border-slate-200 rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                        />
                      </div>

                      <button
                        onClick={() => removeFromWholesaleCart(item.product.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calculations & Submit */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Wholesale Subtotal:</span>
                <span className="font-semibold">Rs. {wholesaleSubtotal.toLocaleString()}</span>
              </div>
              {wholesaleDiscountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Volume Trade Discount:</span>
                  <span className="font-semibold">-Rs. {wholesaleDiscountTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Invoice Total:</span>
                <span className="text-cyan-700">Rs. {wholesaleGrandTotal.toLocaleString()}</span>
              </div>

              <Button
                variant="accent"
                size="lg"
                onClick={handleOpenCheckout}
                disabled={wholesaleCart.length === 0 || !selectedCustomer}
                className="w-full mt-2 font-bold gap-2 text-sm shadow-md"
              >
                Checkout Wholesale Order <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Modal: Wholesale Settlement & Payment Terms */}
        <Modal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          title="Finalize Wholesale Tax Invoice"
          description="Confirm billing details, payment method, and Khata credit assignment."
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Customer & Amount Summary */}
            <div className="p-4 rounded-xl bg-cyan-50/80 border border-cyan-200/60 flex items-center justify-between">
              <div>
                <span className="text-slate-500 font-medium">Invoice Net Amount:</span>
                <div className="text-2xl font-black text-cyan-950 mt-0.5">
                  Rs. {wholesaleGrandTotal.toLocaleString()}
                </div>
              </div>
              {selectedCustomer && (
                <div className="text-right">
                  <span className="text-slate-500 font-medium">Billed To:</span>
                  <div className="font-bold text-slate-900">
                    {selectedCustomer.businessName || selectedCustomer.name}
                  </div>
                  <div className="text-[10px] text-slate-500">City: {selectedCustomer.city}</div>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Settlement Terms & Payment Mode
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Bank Transfer', 'Credit/Khata', 'Cash', 'Card'] as PaymentMethod[]).map(pm => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(pm);
                      if (pm === 'Credit/Khata') {
                        setAmountPaidNow(0);
                      } else {
                        setAmountPaidNow(wholesaleGrandTotal);
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border font-bold text-xs transition-all ${
                      paymentMethod === pm
                        ? 'border-cyan-600 bg-cyan-600 text-white shadow-sm shadow-cyan-600/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pm === 'Bank Transfer' && <Building className="w-4 h-4" />}
                    {pm === 'Credit/Khata' && <BookOpen className="w-4 h-4" />}
                    {pm === 'Cash' && <Banknote className="w-4 h-4" />}
                    {pm === 'Card' && <CreditCard className="w-4 h-4" />}
                    <span>{pm}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Balance Reconciliation Preview */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Customer Previous Balance:</span>
                <span className="font-semibold">
                  Rs. {selectedCustomer?.currentBalance.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Current Invoice Amount:</span>
                <span className="font-semibold text-slate-900">
                  +Rs. {wholesaleGrandTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="font-semibold text-slate-700">Amount Paid at Counter:</span>
                <input
                  type="number"
                  value={amountPaidNow || ''}
                  placeholder="0"
                  onChange={e => setAmountPaidNow(parseFloat(e.target.value) || 0)}
                  className="w-32 h-8 px-2.5 text-right border border-slate-200 rounded font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {paymentMethod === 'Credit/Khata' && (
                <div className="flex justify-between font-bold text-rose-600 pt-1 border-t border-slate-200">
                  <span>New Total Khata Balance Owed:</span>
                  <span>
                    Rs.{' '}
                    {(
                      (selectedCustomer?.currentBalance || 0) +
                      wholesaleGrandTotal -
                      amountPaidNow
                    ).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Notes / PO Reference */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client PO # / Vehicle Dispatch Reference
              </label>
              <input
                type="text"
                placeholder="e.g. Dispatched via Bilal Cargo Builty # 4920"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="md" onClick={() => setIsCheckoutOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="accent"
                size="md"
                onClick={handleCompleteWholesaleSale}
                className="gap-2 font-bold"
              >
                <CheckCircle2 className="w-4 h-4" /> Save & Print A4 Invoice
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal: A4 Wholesale Invoice Preview */}
        <Modal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          title="Print Wholesale Commercial Invoice"
          maxWidth="4xl"
        >
          {completedBill && (
            <WholesaleInvoicePrint
              bill={completedBill}
              onClose={() => setIsInvoiceModalOpen(false)}
            />
          )}
        </Modal>
      </AppShell>
    </ProtectedRoute>
  );
}
