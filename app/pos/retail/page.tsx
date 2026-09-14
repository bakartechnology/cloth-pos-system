'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ThermalReceipt } from '@/components/print/ThermalReceipt';
import {
  Search,
  Barcode as BarcodeIcon,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  CreditCard,
  Banknote,
  Building,
  User,
  ShoppingBag,
  Sparkles,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { productsService } from '@/services/productsService';
import { customersService } from '@/services/customersService';
import { salesService } from '@/services/salesService';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { Product, Customer, PaymentMethod, Bill, ProductCategory } from '@/types';

export default function RetailPOSPage() {
  const { currentStaff } = useAuth();
  const { toast } = useToast();
  const {
    retailCart,
    addToRetailCart,
    removeFromRetailCart,
    updateRetailQuantity,
    updateRetailDiscount,
    clearRetailCart,
    retailSubtotal,
    retailDiscountTotal,
    retailGrandTotal,
  } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Checkout modal states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [completedBill, setCompletedBill] = useState<Bill | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProducts(productsService.getAll());
    setCustomers(customersService.getAll());
  }, []);

  // Filter products by search and category
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.includes(q);
    return matchesCat && matchesQuery;
  });

  const categories: (string | ProductCategory)[] = [
    'All',
    'Lawn',
    'Cotton',
    'Khaddar',
    'Wash & Wear',
    'Unstitched',
    'Thaan',
    'Cut Piece',
    'Silk & Chiffon',
  ];

  // Barcode scan Enter handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = productsService.getByBarcodeOrSku(barcodeInput);
    if (matched) {
      addToRetailCart(matched);
      setBarcodeInput('');
    } else {
      toast({
        title: 'Barcode Not Found',
        description: `No fabric product matched barcode/SKU "${barcodeInput}".`,
        type: 'error',
      });
    }
  };

  const openCheckout = () => {
    if (retailCart.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Please add at least one fabric item before proceeding to checkout.',
        type: 'warning',
      });
      return;
    }
    setAmountReceived(retailGrandTotal);
    setIsCheckoutOpen(true);
  };

  const handleCompleteSale = () => {
    if (!currentStaff) return;

    if (paymentMethod === 'Cash' && amountReceived < retailGrandTotal) {
      toast({
        title: 'Insufficient Tender',
        description: 'Amount received cannot be less than Grand Total for cash sales.',
        type: 'error',
      });
      return;
    }

    const bill = salesService.completeSale({
      saleType: 'Retail',
      cartItems: retailCart,
      paymentMethod,
      amountReceived: paymentMethod === 'Cash' ? amountReceived : retailGrandTotal,
      discountTotal: retailDiscountTotal,
      taxTotal: 0,
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      customer: selectedCustomer || undefined,
      notes,
    });

    setCompletedBill(bill);
    clearRetailCart();
    setIsCheckoutOpen(false);
    setIsMobileCartOpen(false);
    setIsReceiptModalOpen(true);
    setProducts(productsService.getAll()); // Refresh stock counts in catalog
  };

  const quickCashOptions = [500, 1000, 2000, 5000, 10000];

  return (
    <ProtectedRoute permission="pos_retail">
      <AppShell>
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-7rem)] overflow-hidden">
          {/* LEFT: Product Catalog & Search (Desktop & Mobile) */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            {/* Top Toolbar */}
            <div className="p-4 border-b border-slate-200/80 space-y-3 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    R
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 leading-tight">Retail Fashion POS</h2>
                    <p className="text-[11px] text-slate-500">
                      Cashier: <span className="font-semibold text-slate-700">{currentStaff?.name}</span> (Counter 01)
                    </p>
                  </div>
                </div>

                {/* Customer Quick Selector */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCustomer?.id || ''}
                    onChange={e => {
                      const found = customers.find(c => c.id === e.target.value);
                      setSelectedCustomer(found || null);
                    }}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium max-w-[180px] truncate"
                  >
                    <option value="">Walk-in Retail Shopper</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Barcode & Search Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Search query input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search fabric name or SKU..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Barcode scanner instant input */}
                <form onSubmit={handleBarcodeSubmit} className="relative">
                  <BarcodeIcon className="w-4 h-4 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="Scan barcode sticker & press Enter..."
                    value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value)}
                    className="w-full pl-9 pr-14 py-2 text-xs bg-blue-50/50 border border-blue-200 rounded-xl text-blue-950 placeholder:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono transition-all"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold"
                  >
                    Scan
                  </button>
                </form>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Catalog Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map(prod => {
                  const inCart = retailCart.find(i => i.product.id === prod.id);
                  const isOutOfStock = prod.stock <= 0;

                  return (
                    <div
                      key={prod.id}
                      onClick={() => !isOutOfStock && addToRetailCart(prod)}
                      className={`relative p-3 rounded-xl border flex flex-col justify-between transition-all duration-150 cursor-pointer select-none group ${
                        isOutOfStock
                          ? 'opacity-50 bg-slate-50 border-slate-200 pointer-events-none'
                          : inCart
                          ? 'border-blue-500 bg-blue-50/20 shadow-xs'
                          : 'border-slate-200/80 bg-white hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span className="font-mono">{prod.sku}</span>
                          <span
                            className={`font-semibold ${
                              prod.stock <= prod.minStockAlert ? 'text-rose-600 font-bold' : 'text-slate-600'
                            }`}
                          >
                            {prod.stock} {prod.unit}
                          </span>
                        </div>

                        <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                          {prod.name}
                        </h3>
                        <div className="text-[10px] text-slate-400 mt-0.5">{prod.subcategory}</div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-xs font-black text-slate-900">
                          Rs. {prod.retailPrice.toLocaleString()}
                        </div>
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs transition-colors ${
                            inCart
                              ? 'bg-blue-600 text-white font-bold'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-blue-600 group-hover:text-white'
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

            {/* Mobile Bottom Cart Summary Bar */}
            <div className="lg:hidden p-3 border-t border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400">{retailCart.length} item(s) in Cart</div>
                <div className="text-sm font-black">Rs. {retailGrandTotal.toLocaleString()}</div>
              </div>
              <Button
                size="sm"
                variant="accent"
                onClick={() => setIsMobileCartOpen(true)}
                className="gap-1.5 font-bold"
              >
                View Cart <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* RIGHT: Current Cart Panel (Desktop & Mobile Drawer) */}
          <div
            className={`w-full lg:w-96 shrink-0 flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden ${
              isMobileCartOpen
                ? 'fixed inset-0 z-50 rounded-none p-4'
                : 'hidden lg:flex'
            }`}
          >
            {/* Cart Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Current Cart</h3>
                <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                  {retailCart.length}
                </span>
              </div>
              {retailCart.length > 0 && (
                <button
                  onClick={clearRetailCart}
                  className="text-slate-400 hover:text-rose-600 text-xs flex items-center gap-1 transition-colors"
                  title="Clear entire cart"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </button>
              )}
              {isMobileCartOpen && (
                <Button size="sm" variant="outline" onClick={() => setIsMobileCartOpen(false)}>
                  Close
                </Button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
              {retailCart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <ShoppingBag className="w-12 h-12 mb-2 stroke-1 text-slate-300" />
                  <p className="text-xs font-medium text-slate-600">Your retail cart is empty</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                    Click fabrics on the left or scan barcodes to begin checkout.
                  </p>
                </div>
              ) : (
                retailCart.map(item => (
                  <div key={item.product.id} className="py-2.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 leading-tight truncate">
                          {item.product.name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Rs. {item.price.toLocaleString()} / {item.product.unit}
                        </div>
                      </div>
                      <div className="text-xs font-black text-slate-900 shrink-0">
                        Rs. {item.lineTotal.toLocaleString()}
                      </div>
                    </div>

                    {/* Quantity and Discount Controller */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                        <button
                          onClick={() => updateRetailQuantity(item.product.id, item.quantity - 1)}
                          className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-slate-900 text-xs px-2 min-w-[24px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateRetailQuantity(item.product.id, item.quantity + 1)}
                          className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line discount % input */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">Disc%:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent || ''}
                          placeholder="0"
                          onChange={e =>
                            updateRetailDiscount(item.product.id, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-12 h-6 text-center text-xs border border-slate-200 rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                        />
                      </div>

                      <button
                        onClick={() => removeFromRetailCart(item.product.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Calculation & Checkout Trigger */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold">Rs. {retailSubtotal.toLocaleString()}</span>
              </div>
              {retailDiscountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Total Discount:</span>
                  <span className="font-semibold">-Rs. {retailDiscountTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Tax (0% Standard):</span>
                <span>Rs. 0</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-blue-600">Rs. {retailGrandTotal.toLocaleString()}</span>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={openCheckout}
                disabled={retailCart.length === 0}
                className="w-full mt-2 font-bold gap-2 text-sm shadow-md"
              >
                Proceed to Checkout (Rs. {retailGrandTotal.toLocaleString()})
              </Button>
            </div>
          </div>
        </div>

        {/* Modal 1: Payment & Tender Drawer */}
        <Modal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          title="Complete Retail Checkout"
          description="Select payment tender and record amount received to calculate change."
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Grand Total Highlight */}
            <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200/60 flex items-center justify-between">
              <div>
                <span className="text-slate-500 font-medium">Payable Amount:</span>
                <div className="text-2xl font-black text-blue-900 mt-0.5">
                  Rs. {retailGrandTotal.toLocaleString()}
                </div>
              </div>
              {selectedCustomer && (
                <div className="text-right">
                  <span className="text-slate-500 font-medium">Customer:</span>
                  <div className="font-bold text-slate-900">{selectedCustomer.name}</div>
                  <div className="text-[10px] text-slate-500">{selectedCustomer.phone}</div>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Cash', 'Card', 'Bank Transfer'] as PaymentMethod[]).map(pm => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPaymentMethod(pm)}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-bold text-xs transition-all ${
                      paymentMethod === pm
                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pm === 'Cash' && <Banknote className="w-4 h-4" />}
                    {pm === 'Card' && <CreditCard className="w-4 h-4" />}
                    {pm === 'Bank Transfer' && <Building className="w-4 h-4" />}
                    <span>{pm}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Calculator (if cash selected) */}
            {paymentMethod === 'Cash' && (
              <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Amount Received (Rs.)
                    </label>
                    <input
                      type="number"
                      value={amountReceived || ''}
                      onChange={e => setAmountReceived(parseFloat(e.target.value) || 0)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg text-base font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Change to Return
                    </label>
                    <div
                      className={`h-10 px-3 flex items-center rounded-lg text-base font-black font-mono border ${
                        amountReceived >= retailGrandTotal
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      Rs. {Math.max(0, amountReceived - retailGrandTotal).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Quick denomination pills */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Quick Cash Tender:
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {quickCashOptions.map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmountReceived(val)}
                        className="px-2.5 py-1 bg-white border border-slate-200 hover:border-blue-400 rounded-md text-[11px] font-mono font-semibold text-slate-700"
                      >
                        Rs. {val.toLocaleString()}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAmountReceived(retailGrandTotal)}
                      className="px-2.5 py-1 bg-blue-100 border border-blue-300 rounded-md text-[11px] font-semibold text-blue-800"
                    >
                      Exact (Rs. {retailGrandTotal.toLocaleString()})
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cashier Remarks / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Eid offer voucher applied or gift packaging"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="md" onClick={() => setIsCheckoutOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleCompleteSale}
                className="gap-2 font-bold"
              >
                <CheckCircle2 className="w-4 h-4" /> Complete Sale & Print Bill
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal 2: 80mm Receipt Print Modal */}
        <Modal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          title="Print Customer Bill"
          maxWidth="md"
        >
          {completedBill && (
            <ThermalReceipt
              bill={completedBill}
              onClose={() => setIsReceiptModalOpen(false)}
            />
          )}
        </Modal>
      </AppShell>
    </ProtectedRoute>
  );
}
