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
  User,
  ShoppingBag,
  Sparkles,
  Printer,
  ChevronRight,
  RotateCcw,
  ArrowLeftRight,
  Keyboard,
  Clock,
  FileText,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import { productsService } from '@/services/productsService';
import { customersService } from '@/services/customersService';
import { salesService } from '@/services/salesService';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { Product, Customer, PaymentMethod, Bill, ProductCategory } from '@/types';
import { HardwareStatusBar } from '@/components/retail-pos/HardwareStatusBar';
import { CustomerBillSearchModal } from '@/components/retail-pos/CustomerBillSearchModal';
import { ReturnModal } from '@/components/retail-pos/ReturnModal';
import { ExchangeModal } from '@/components/retail-pos/ExchangeModal';
import { CashDrawerModal } from '@/components/retail-pos/CashDrawerModal';
import { CardTerminalModal } from '@/components/retail-pos/CardTerminalModal';
import { KeyboardShortcutsModal } from '@/components/retail-pos/KeyboardShortcutsModal';
import { barcodeScannerService } from '@/services/hardware/barcodeScannerService';
import { posSessionService, PosSessionDraft } from '@/services/posSessionService';
import { CardPaymentResponse } from '@/services/hardware/cardTerminalService';

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
    restoreRetailCart,
    retailSubtotal,
    retailDiscountTotal,
    retailGrandTotal,
  } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Optional customer details for checkout (No forced walk-in object)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Next upcoming sequential invoice number
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('RET-2026-001246');
  const [currentTime, setCurrentTime] = useState('');

  // Draft session resume state
  const [availableDraft, setAvailableDraft] = useState<PosSessionDraft | null>(null);

  // Modals state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card'>('Cash');
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [completedBill, setCompletedBill] = useState<Bill | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Workflow modals
  const [isSearchBillsOpen, setIsSearchBillsOpen] = useState(false);
  const [searchBillsMode, setSearchBillsMode] = useState<'customer' | 'invoice'>('customer');
  const [selectedBillForAction, setSelectedBillForAction] = useState<Bill | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [isCashDrawerModalOpen, setIsCashDrawerModalOpen] = useState(false);
  const [isCardTerminalModalOpen, setIsCardTerminalModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [viewingBillDetails, setViewingBillDetails] = useState<Bill | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Clock ticker & initial sequence lookup
  useEffect(() => {
    setProducts(productsService.getAll());
    setNextInvoiceNumber(salesService.peekNextInvoiceNumber('Retail'));

    // Check for unfinished draft session
    const draft = posSessionService.getDraft();
    if (draft && draft.cartItems?.length > 0) {
      setAvailableDraft(draft);
    }

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-save active cart draft
  useEffect(() => {
    if (retailCart.length > 0 || customerName) {
      posSessionService.saveDraft({
        cartItems: retailCart,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        notes: notes || undefined,
        selectedCategory,
      });
    }
  }, [retailCart, customerName, customerPhone, notes, selectedCategory]);

  // Global Function Key Shortcuts (F2, F3, F4, F8, F9, ESC)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setSearchBillsMode('customer');
        setIsSearchBillsOpen(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setSearchBillsMode('invoice');
        setIsSearchBillsOpen(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (retailCart.length > 0) {
          openCheckout();
        } else {
          toast({ title: 'Cart Empty', description: 'Add products before checkout.', type: 'warning' });
        }
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (completedBill) {
          setIsReceiptModalOpen(true);
        }
      } else if (e.key === 'Escape') {
        setIsCheckoutOpen(false);
        setIsSearchBillsOpen(false);
        setIsReturnModalOpen(false);
        setIsExchangeModalOpen(false);
        setIsCashDrawerModalOpen(false);
        setIsCardTerminalModalOpen(false);
        setIsShortcutsModalOpen(false);
        setViewingBillDetails(null);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [retailCart.length, completedBill]);

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

  // Continuous Barcode Scanning Handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    const matched = productsService.getByBarcodeOrSku(query);
    if (matched) {
      addToRetailCart(matched);
      barcodeScannerService.playSuccessBeep();
      setBarcodeInput('');
      // Continuous scanner: keep focus on barcode field
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 50);
    } else {
      barcodeScannerService.playErrorBeep();
      toast({
        title: 'Product Not Found',
        description: `No fabric found matching barcode / SKU "${query}".`,
        type: 'error',
      });
      setBarcodeInput('');
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 50);
    }
  };

  // Draft Resume / Discard Actions
  const handleResumeDraft = () => {
    if (availableDraft) {
      restoreRetailCart(availableDraft.cartItems);
      if (availableDraft.customerName) setCustomerName(availableDraft.customerName);
      if (availableDraft.customerPhone) setCustomerPhone(availableDraft.customerPhone);
      if (availableDraft.notes) setNotes(availableDraft.notes);
      if (availableDraft.selectedCategory) setSelectedCategory(availableDraft.selectedCategory);
      setAvailableDraft(null);
      toast({
        title: 'Sale Resumed',
        description: `Restored ${availableDraft.cartItems.length} items from previous session.`,
        type: 'info',
      });
    }
  };

  const handleDiscardDraft = () => {
    posSessionService.clearDraft();
    setAvailableDraft(null);
    toast({ title: 'Draft Discarded', description: 'Fresh POS session initialized.', type: 'info' });
  };

  // Open Checkout Modal
  const openCheckout = () => {
    if (retailCart.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Please scan or add at least one fabric item.',
        type: 'warning',
      });
      return;
    }
    setAmountReceived(retailGrandTotal);
    setIsCheckoutOpen(true);
  };

  // Step 1 of Cash Workflow: Open Cash Drawer and show change
  const handleInitiateCashPayment = () => {
    if (amountReceived < retailGrandTotal) {
      toast({
        title: 'Insufficient Cash',
        description: `Remaining balance: Rs. ${(retailGrandTotal - amountReceived).toLocaleString()}`,
        type: 'error',
      });
      return;
    }
    setIsCheckoutOpen(false);
    setIsCashDrawerModalOpen(true);
  };

  // Step 1 of Card Workflow: Open Terminal Authorization
  const handleInitiateCardPayment = () => {
    setIsCheckoutOpen(false);
    setIsCardTerminalModalOpen(true);
  };

  // Finalize Sale
  const finalizeSale = (params: {
    paymentMethod: 'Cash' | 'Card';
    amountReceived: number;
    cardTransactionId?: string;
  }) => {
    if (!currentStaff) return;

    const bill = salesService.completeSale({
      saleType: 'Retail',
      cartItems: retailCart,
      paymentMethod: params.paymentMethod,
      amountReceived: params.amountReceived,
      discountTotal: retailDiscountTotal,
      taxTotal: 0,
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      cardTransactionId: params.cardTransactionId,
      notes,
    });

    setCompletedBill(bill);
    clearRetailCart();
    posSessionService.clearDraft();
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setIsCheckoutOpen(false);
    setIsCashDrawerModalOpen(false);
    setIsCardTerminalModalOpen(false);
    setIsMobileCartOpen(false);
    setIsReceiptModalOpen(true);
    setProducts(productsService.getAll());
    setNextInvoiceNumber(salesService.peekNextInvoiceNumber('Retail'));
  };

  const quickCashOptions = [500, 1000, 2000, 5000, 10000];

  return (
    <ProtectedRoute permission="pos_retail">
      <AppShell>
        <div className="flex flex-col gap-3 h-[calc(100vh-5rem)] overflow-hidden">
          {/* PROFESSIONAL RETAIL POS HEADER */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs px-4 py-3 shrink-0 select-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left Title & Cashier Info */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-sm shadow-blue-600/20">
                  R
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-black text-slate-900 tracking-tight leading-none">
                      RETAIL POS
                    </h1>
                    <span className="text-[11px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                      Next: {nextInvoiceNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span>
                      Cashier: <strong className="text-slate-800">{currentStaff?.name}</strong> (Counter 01)
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {currentTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Center/Right Toolbar & Hardware Bridge */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Hardware Status */}
                <HardwareStatusBar />

                {/* SEARCH BAR 1: Customer Name Modal Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setSearchBillsMode('customer');
                    setIsSearchBillsOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors"
                  title="Search past bills by Customer Name (F3)"
                >
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Search Customer</span>
                  <kbd className="hidden md:inline px-1 py-0.2 bg-white rounded text-[10px] text-slate-500 font-mono">
                    F3
                  </kbd>
                </button>

                {/* SEARCH BAR 2: Invoice Number Modal Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setSearchBillsMode('invoice');
                    setIsSearchBillsOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors"
                  title="Search past bills by Invoice Number (F4)"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Search Invoice</span>
                  <kbd className="hidden md:inline px-1 py-0.2 bg-white rounded text-[10px] text-slate-500 font-mono">
                    F4
                  </kbd>
                </button>

                {/* Keyboard Shortcuts Help */}
                <button
                  type="button"
                  onClick={() => setIsShortcutsModalOpen(true)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200"
                  title="Keyboard Shortcuts"
                >
                  <Keyboard className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* UNFINISHED SESSION RESUME BANNER */}
            {availableDraft && (
              <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-semibold text-amber-900">
                    Unfinished Sale Draft Found ({availableDraft.cartItems.length} items, saved{' '}
                    {new Date(availableDraft.timestamp).toLocaleTimeString()})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="px-2 py-1 text-slate-600 hover:text-rose-600 font-medium transition-colors"
                  >
                    Discard Draft
                  </button>
                  <Button
                    size="sm"
                    variant="primary"
                    type="button"
                    onClick={handleResumeDraft}
                    className="gap-1 font-bold bg-amber-600 hover:bg-amber-700"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Resume Sale
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* MAIN 2-PANEL / 3-PANEL INTERFACE */}
          <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 overflow-hidden">
            {/* LEFT: Product Catalog & Continuous Barcode Scanner */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
              {/* Barcode & Search Controls Toolbar */}
              <div className="p-3.5 border-b border-slate-200/80 space-y-3 shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* CONTINUOUS PHYSICAL BARCODE SCANNER FIELD */}
                  <form onSubmit={handleBarcodeSubmit} className="relative">
                    <BarcodeIcon className="w-4 h-4 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      placeholder="Scan barcode sticker & press Enter (F2)..."
                      value={barcodeInput}
                      onChange={e => setBarcodeInput(e.target.value)}
                      className="w-full pl-9 pr-14 py-2 text-xs bg-blue-50/50 border border-blue-200 rounded-xl text-blue-950 placeholder:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono transition-all"
                    />
                    <button
                      type="submit"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold shadow-xs"
                    >
                      Scan
                    </button>
                  </form>

                  {/* Product text search query */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search fabric name, SKU, or category..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
                        selectedCategory === cat
                          ? 'bg-slate-900 text-white shadow-2xs font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Catalog Grid */}
              <div className="flex-1 overflow-y-auto p-3.5">
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
                          <div className="text-xs font-black text-slate-900 font-mono">
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

              {/* Mobile Bottom Cart Bar */}
              <div className="lg:hidden p-3 border-t border-slate-200 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400">{retailCart.length} item(s) in Cart</div>
                  <div className="text-sm font-black font-mono">Rs. {retailGrandTotal.toLocaleString()}</div>
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
                isMobileCartOpen ? 'fixed inset-0 z-50 rounded-none p-4' : 'hidden lg:flex'
              }`}
            >
              {/* Cart Header */}
              <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900">Current Cart</h3>
                  <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                    {retailCart.length}
                  </span>
                </div>
                {retailCart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearRetailCart}
                    className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 font-medium transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
                {isMobileCartOpen && (
                  <button
                    type="button"
                    onClick={() => setIsMobileCartOpen(false)}
                    className="lg:hidden p-1 text-slate-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Optional Customer Name Tag in Cart */}
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Customer:</span>
                <span className="font-bold text-slate-800 truncate max-w-[180px]">
                  {customerName.trim() ? customerName : 'Optional / Blank'}
                </span>
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
                {retailCart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <ShoppingBag className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
                    <p className="text-xs font-semibold text-slate-700">Retail Cart is Empty</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                      Scan fabric barcode or click catalog items to build invoice.
                    </p>
                  </div>
                ) : (
                  retailCart.map(item => (
                    <div
                      key={item.product.id}
                      className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate leading-snug">
                            {item.product.name}
                          </h4>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Rs. {item.price.toLocaleString()} / {item.product.unit}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromRetailCart(item.product.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quantity & Discount Controls */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => updateRetailQuantity(item.product.id, item.quantity - 1)}
                            className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-100 text-slate-600"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-black font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateRetailQuantity(item.product.id, item.quantity + 1)}
                            className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-100 text-slate-600"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Item Line Total */}
                        <div className="text-right">
                          <div className="text-xs font-black text-slate-900 font-mono">
                            Rs. {item.lineTotal.toLocaleString()}
                          </div>
                          {item.discountPercent > 0 && (
                            <span className="text-[9px] text-emerald-600 font-bold">
                              {item.discountPercent}% Off
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Summary & Checkout Action */}
              <div className="p-3.5 border-t border-slate-200 bg-slate-50 space-y-2.5">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-mono">Rs. {retailSubtotal.toLocaleString()}</span>
                  </div>
                  {retailDiscountTotal > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount Savings:</span>
                      <span className="font-mono">-Rs. {retailDiscountTotal.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                    <span>GRAND TOTAL:</span>
                    <span className="font-mono text-base text-blue-600">
                      Rs. {retailGrandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                <Button
                  size="lg"
                  variant="primary"
                  type="button"
                  onClick={openCheckout}
                  disabled={retailCart.length === 0}
                  className="w-full justify-center gap-2 font-bold py-3 shadow-md shadow-blue-600/20"
                >
                  <Sparkles className="w-4 h-4" />
                  Proceed to Tender (F8)
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL 1: CHECKOUT / TENDER MODAL */}
        <Modal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          title="Retail POS Checkout"
          maxWidth="lg"
        >
          <div className="space-y-4">
            {/* Grand Total Highlight */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Amount Due
                </span>
                <div className="text-2xl font-black font-mono text-blue-400">
                  Rs. {retailGrandTotal.toLocaleString()}
                </div>
              </div>
              <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-300 font-mono">
                {retailCart.length} Item(s)
              </span>
            </div>

            {/* Optional Customer Information */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Customer Information (Optional):</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Leave blank if not registered
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Customer Name (optional)"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
                <input
                  type="text"
                  placeholder="Phone Number (optional)"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            {/* PAYMENT METHODS (Cash and Card ONLY - Bank Transfer REMOVED) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Method:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Cash')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-xs transition-all ${
                    paymentMethod === 'Cash'
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>CASH</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('Card')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-xs transition-all ${
                    paymentMethod === 'Card'
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>CARD TERMINAL</span>
                </button>
              </div>
            </div>

            {/* CASH TENDER WORKFLOW */}
            {paymentMethod === 'Cash' && (
              <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cash Received (Rs.)
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
                      {amountReceived >= retailGrandTotal
                        ? `Rs. ${(amountReceived - retailGrandTotal).toLocaleString()}`
                        : `Remaining: Rs. ${(retailGrandTotal - amountReceived).toLocaleString()}`}
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

            {/* CARD TENDER SUMMARY */}
            {paymentMethod === 'Card' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1 text-blue-950">
                <div className="font-bold flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  Ready to send to Card Terminal
                </div>
                <p className="text-blue-800 text-[11px]">
                  Clicking proceed will trigger card swipe/tap prompt on the payment terminal.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="md" type="button" onClick={() => setIsCheckoutOpen(false)}>
                Cancel
              </Button>

              {paymentMethod === 'Cash' ? (
                <Button
                  variant="primary"
                  size="md"
                  type="button"
                  onClick={handleInitiateCashPayment}
                  disabled={amountReceived < retailGrandTotal}
                  className="gap-2 font-bold shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Cash & Open Drawer
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  type="button"
                  onClick={handleInitiateCardPayment}
                  className="gap-2 font-bold shadow-sm"
                >
                  <CreditCard className="w-4 h-4" />
                  Process Card Terminal
                </Button>
              )}
            </div>
          </div>
        </Modal>

        {/* MODAL 2: CASH DRAWER WORKFLOW */}
        <CashDrawerModal
          isOpen={isCashDrawerModalOpen}
          onClose={() => setIsCashDrawerModalOpen(false)}
          grandTotal={retailGrandTotal}
          cashReceived={amountReceived}
          changeDue={Math.max(0, amountReceived - retailGrandTotal)}
          onCompleteSale={() =>
            finalizeSale({
              paymentMethod: 'Cash',
              amountReceived,
            })
          }
        />

        {/* MODAL 3: CARD TERMINAL WORKFLOW */}
        <CardTerminalModal
          isOpen={isCardTerminalModalOpen}
          onClose={() => setIsCardTerminalModalOpen(false)}
          grandTotal={retailGrandTotal}
          onPaymentSuccess={(authData: CardPaymentResponse) =>
            finalizeSale({
              paymentMethod: 'Card',
              amountReceived: retailGrandTotal,
              cardTransactionId: authData.transactionId,
            })
          }
        />

        {/* MODAL 4: ISOLATED THERMAL RECEIPT PRINT MODAL */}
        <Modal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          title="Print Thermal Receipt"
          maxWidth="md"
        >
          {completedBill && (
            <ThermalReceipt bill={completedBill} onClose={() => setIsReceiptModalOpen(false)} />
          )}
        </Modal>

        {/* MODAL 5: SEARCH BILLS (CUSTOMER OR INVOICE NUMBER) */}
        <CustomerBillSearchModal
          isOpen={isSearchBillsOpen}
          onClose={() => setIsSearchBillsOpen(false)}
          initialMode={searchBillsMode}
          onSelectReturn={(bill: Bill) => {
            setIsSearchBillsOpen(false);
            setSelectedBillForAction(bill);
            setIsReturnModalOpen(true);
          }}
          onSelectExchange={(bill: Bill) => {
            setIsSearchBillsOpen(false);
            setSelectedBillForAction(bill);
            setIsExchangeModalOpen(true);
          }}
          onSelectPrint={(bill: Bill) => {
            setIsSearchBillsOpen(false);
            setCompletedBill(bill);
            setIsReceiptModalOpen(true);
          }}
          onViewBill={(bill: Bill) => {
            setViewingBillDetails(bill);
          }}
        />

        {/* MODAL 6: RETURN PROCESS */}
        <ReturnModal
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          bill={selectedBillForAction}
          onReturnCompleted={(updatedBill: Bill) => {
            setCompletedBill(updatedBill);
            setProducts(productsService.getAll());
            setIsReceiptModalOpen(true);
          }}
        />

        {/* MODAL 7: EXCHANGE PROCESS */}
        <ExchangeModal
          isOpen={isExchangeModalOpen}
          onClose={() => setIsExchangeModalOpen(false)}
          bill={selectedBillForAction}
          onExchangeCompleted={(updatedBill: Bill) => {
            setCompletedBill(updatedBill);
            setProducts(productsService.getAll());
            setIsReceiptModalOpen(true);
          }}
        />

        {/* MODAL 8: KEYBOARD SHORTCUTS REFERENCE */}
        <KeyboardShortcutsModal
          isOpen={isShortcutsModalOpen}
          onClose={() => setIsShortcutsModalOpen(false)}
        />

        {/* MODAL 9: QUICK BILL VIEW */}
        {viewingBillDetails && (
          <Modal
            isOpen={!!viewingBillDetails}
            onClose={() => setViewingBillDetails(null)}
            title={`Invoice #${viewingBillDetails.invoiceNumber}`}
            maxWidth="md"
          >
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold">{viewingBillDetails.customerName || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>{new Date(viewingBillDetails.date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-blue-600">{viewingBillDetails.status}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {viewingBillDetails.items.map((it, idx) => (
                  <div key={idx} className="p-2.5 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900">{it.productName}</div>
                      <div className="text-[10px] text-slate-400">
                        {it.quantity} × Rs. {it.price.toLocaleString()}
                      </div>
                    </div>
                    <div className="font-mono font-bold">Rs. {it.subtotal.toLocaleString()}</div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-slate-900 text-white rounded-xl flex justify-between items-center font-bold">
                <span>Grand Total:</span>
                <span className="text-base font-mono text-emerald-400">
                  Rs. {viewingBillDetails.grandTotal.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setViewingBillDetails(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setCompletedBill(viewingBillDetails);
                    setViewingBillDetails(null);
                    setIsReceiptModalOpen(true);
                  }}
                  className="gap-1 font-bold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipt
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
