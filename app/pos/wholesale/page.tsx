'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { WholesaleInvoicePrint } from '@/components/print/WholesaleInvoicePrint';
import { PrintableWholesaleReturn } from '@/components/print/PrintableWholesaleReturn';
import { PrintableWholesaleExchange } from '@/components/print/PrintableWholesaleExchange';
import { WholesaleCustomerInput } from '@/components/wholesale-pos/WholesaleCustomerInput';
import { WholesaleClientSearch } from '@/components/wholesale-pos/WholesaleClientSearch';
import { WholesaleHardwareStatus } from '@/components/wholesale-pos/WholesaleHardwareStatus';
import { WholesaleBillSearchModal } from '@/components/wholesale-pos/WholesaleBillSearchModal';
import { WholesaleReturnModal } from '@/components/wholesale-pos/WholesaleReturnModal';
import { WholesaleExchangeModal } from '@/components/wholesale-pos/WholesaleExchangeModal';
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
  Barcode as BarcodeIcon,
  RotateCcw,
  ArrowLeftRight,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  Check,
  X,
  History,
} from 'lucide-react';
import { productsService } from '@/services/productsService';
import { customersService } from '@/services/customersService';
import { salesService } from '@/services/salesService';
import { storageService } from '@/services/storageService';
import { wholesaleSessionService } from '@/services/wholesaleSessionService';
import { barcodeScannerService } from '@/services/hardware/barcodeScannerService';
import { cashDrawerService } from '@/services/hardware/cashDrawerService';
import { cardTerminalService, CardPaymentState } from '@/services/hardware/cardTerminalService';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import {
  Product,
  Customer,
  PaymentMethod,
  Bill,
  BankAccount,
  ReturnTransaction,
  ExchangeTransaction,
  WholesaleSessionDraft,
} from '@/types';

export default function WholesalePOSPage() {
  const { currentStaff } = useAuth();
  const { toast } = useToast();
  const {
    wholesaleCart,
    addToWholesaleCart,
    removeFromWholesaleCart,
    updateWholesaleQuantity,
    updateWholesaleDiscount,
    updateWholesaleExtraDiscount,
    clearWholesaleCart,
    wholesaleSubtotal,
    wholesaleDiscountTotal,
    wholesaleGrandTotal,
    syncWithLatestProducts,
  } = useCart();

  // Products & Client Data
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null); // Wholesale Client
  const [customerName, setCustomerName] = useState(''); // Individual shopper/collector name
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('WHO-2026-000001');

  // Work Session Resume State (Across reboots/shutdowns)
  const [availableDraft, setAvailableDraft] = useState<WholesaleSessionDraft | null>(null);
  const [hasCheckedDraft, setHasCheckedDraft] = useState(false);

  // Wholesale Checkout State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [amountPaidNow, setAmountPaidNow] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Bank Transfer Payment States
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [isBankPaymentConfirmed, setIsBankPaymentConfirmed] = useState(false);

  // Card Terminal Payment States
  const [cardPaymentState, setCardPaymentState] = useState<CardPaymentState>('idle');
  const [cardStatusMessage, setCardStatusMessage] = useState('');
  const [cardTransactionId, setCardTransactionId] = useState<string | undefined>(undefined);

  // Cash Drawer State
  const [isCashDrawerOpen, setIsCashDrawerOpen] = useState(false);

  // Completed Invoices & Modals
  const [completedBill, setCompletedBill] = useState<Bill | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Two Independent Bill Searches & Return/Exchange Modals
  const [isBillSearchOpen, setIsBillSearchOpen] = useState(false);
  const [billForAction, setBillForAction] = useState<Bill | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [completedReturn, setCompletedReturn] = useState<ReturnTransaction | null>(null);
  const [isReturnPrintOpen, setIsReturnPrintOpen] = useState(false);
  const [completedExchange, setCompletedExchange] = useState<ExchangeTransaction | null>(null);
  const [isExchangePrintOpen, setIsExchangePrintOpen] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Initial Data Load, Sequence Peek, and live focus/storage sync
  useEffect(() => {
    const refreshData = () => {
      setProducts(productsService.getAll());
      setNextInvoiceNumber(salesService.peekNextInvoiceNumber('Wholesale'));
      syncWithLatestProducts();
    };

    refreshData();

    const settings = storageService.getSettings();
    const banks = settings.bankAccounts || [];
    setBankAccounts(banks);
    if (banks.length > 0) {
      setSelectedBank(banks[0]);
    }

    window.addEventListener('focus', refreshData);
    window.addEventListener('storage', refreshData);

    return () => {
      window.removeEventListener('focus', refreshData);
      window.removeEventListener('storage', refreshData);
    };
  }, []);

  // Staff-specific draft detection on mount / staff switch
  useEffect(() => {
    if (currentStaff?.id && !hasCheckedDraft) {
      const draft = wholesaleSessionService.getDraft(currentStaff.id);
      if (draft) {
        setAvailableDraft(draft);
      }
      setHasCheckedDraft(true);
    }
  }, [currentStaff?.id, hasCheckedDraft]);

  // Auto-save active wholesale draft to persistent storage whenever state changes
  useEffect(() => {
    if (!currentStaff?.id || !hasCheckedDraft) return;

    // Save only if staff has active cart items, entered a customer, or selected a client
    if (wholesaleCart.length > 0 || customerName.trim() || selectedCustomer) {
      wholesaleSessionService.saveDraft(currentStaff.id, {
        customerName: customerName.trim() || undefined,
        selectedClient: selectedCustomer,
        cartItems: wholesaleCart,
        paymentMethod,
        amountReceived: cashReceived,
        selectedBankId: selectedBank?.id,
        bankPaymentConfirmed: isBankPaymentConfirmed,
        notes: notes.trim() || undefined,
        subtotal: wholesaleSubtotal,
        grandTotal: wholesaleGrandTotal,
      });
    }
  }, [
    currentStaff?.id,
    hasCheckedDraft,
    wholesaleCart,
    customerName,
    selectedCustomer,
    paymentMethod,
    cashReceived,
    selectedBank,
    isBankPaymentConfirmed,
    notes,
    wholesaleSubtotal,
    wholesaleGrandTotal,
  ]);

  // Resume Draft Handler
  const handleResumeDraft = () => {
    if (!availableDraft) return;

    // Restore customer name & client
    if (availableDraft.customerName) {
      setCustomerName(availableDraft.customerName);
    }
    if (availableDraft.selectedClient) {
      setSelectedCustomer(availableDraft.selectedClient);
    }

    // Restore cart items
    if (availableDraft.cartItems && availableDraft.cartItems.length > 0) {
      clearWholesaleCart();
      availableDraft.cartItems.forEach(item => {
        addToWholesaleCart(item.product, item.quantity);
        if (item.discountPercent > 0) {
          updateWholesaleDiscount(item.product.id, item.discountPercent);
        }
      });
    }

    // Restore payment and note states
    if (availableDraft.paymentMethod) {
      setPaymentMethod(availableDraft.paymentMethod);
    }
    if (availableDraft.amountReceived) {
      setCashReceived(availableDraft.amountReceived);
    }
    if (availableDraft.selectedBankId && bankAccounts.length > 0) {
      const b = bankAccounts.find(x => x.id === availableDraft.selectedBankId);
      if (b) setSelectedBank(b);
    }
    if (availableDraft.notes) {
      setNotes(availableDraft.notes);
    }

    setAvailableDraft(null);
    toast({
      title: 'Previous Work Resumed',
      description: 'Your previous wholesale work session has been restored exactly where you stopped.',
      type: 'success',
    });
  };

  // Discard Draft Handler
  const handleDiscardDraft = () => {
    if (currentStaff?.id) {
      wholesaleSessionService.clearDraft(currentStaff.id);
    }
    setAvailableDraft(null);
    clearWholesaleCart();
    setCustomerName('');
    setSelectedCustomer(null);
    setNotes('');
    setCashReceived(0);
    toast({
      title: 'Draft Discarded',
      description: 'Previous unfinished session was cleared.',
      type: 'info',
    });
  };

  // Product Filter (Memoized for smooth 60fps rendering)
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter(p => {
      return (
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.wholesaleBarcode.includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, searchQuery]);

  // Barcode Scanner Handler
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    // Use live persistent productsService lookup to avoid stale data
    const matched =
      productsService.getByBarcodeOrSku(code) ||
      products.find(
        p =>
          p.wholesaleBarcode === code ||
          p.barcode === code ||
          p.sku.toLowerCase() === code.toLowerCase()
      );

    if (matched) {
      if (matched.stock <= 0) {
        barcodeScannerService.playErrorBeep();
        toast({
          title: 'Out of Stock',
          description: `${matched.name} is currently out of stock.`,
          type: 'error',
        });
      } else {
        const discount = matched.wholesaleDiscount || 0;
        const finalPrice = Math.max(0, matched.wholesalePrice - discount);

        addToWholesaleCart(matched);
        barcodeScannerService.playSuccessBeep();
        toast({
          title: `Scanned: ${matched.name}`,
          description:
            discount > 0
              ? `Price: Rs. ${matched.wholesalePrice.toLocaleString()} | Discount: − Rs. ${discount.toLocaleString()} | Total: Rs. ${finalPrice.toLocaleString()}`
              : `Price: Rs. ${matched.wholesalePrice.toLocaleString()}`,
          type: 'success',
        });
      }
    } else {
      barcodeScannerService.playErrorBeep();
      toast({
        title: 'Product not found',
        description: `No fabric product matches barcode/SKU "${code}".`,
        type: 'warning',
      });
    }

    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  };

  // Open Checkout Modal
  const handleOpenCheckout = () => {
    if (wholesaleCart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add products at wholesale rates before proceeding.',
        type: 'warning',
      });
      return;
    }
    // PART 2 - Req 6: Customer Name alone is sufficient to enable checkout
    if (!customerName.trim() && !selectedCustomer) {
      toast({
        title: 'Customer Name Required',
        description: 'Please enter a Customer Name or select a Wholesale Client.',
        type: 'error',
      });
      return;
    }

    // Default cash received to grand total for convenience
    setCashReceived(wholesaleGrandTotal);
    setAmountPaidNow(paymentMethod === 'Credit/Khata' ? 0 : wholesaleGrandTotal);
    setIsBankPaymentConfirmed(false);
    setCardPaymentState('idle');
    setCardTransactionId(undefined);
    setIsCheckoutOpen(true);
  };

  // Trigger Card Payment
  const handleStartCardPayment = async () => {
    setCardPaymentState('waiting_card');
    setCardStatusMessage('Waiting for customer card tap/insert on terminal...');
    const result = await cardTerminalService.startCardPayment(wholesaleGrandTotal, (state, msg) => {
      setCardPaymentState(state);
      setCardStatusMessage(msg);
    });

    if (result.success && result.transactionId) {
      setCardPaymentState('authorized');
      setCardTransactionId(result.transactionId);
      toast({
        title: 'Card Authorized',
        description: `Payment approved! Auth Code: ${result.authCode}`,
        type: 'success',
      });
    } else {
      setCardPaymentState('failed');
      setCardStatusMessage(result.errorMessage || 'Transaction failed or was declined.');
      toast({
        title: 'Card Payment Failed',
        description: result.errorMessage || 'Declined by bank or terminal timed out.',
        type: 'error',
      });
    }
  };

  // Confirm Cash Payment & Trigger Cash Drawer
  const handleCashDrawerWorkflow = async () => {
    if (cashReceived < wholesaleGrandTotal) {
      toast({
        title: 'Insufficient Cash',
        description: `Received Rs. ${cashReceived.toLocaleString()} is less than total Rs. ${wholesaleGrandTotal.toLocaleString()}`,
        type: 'error',
      });
      return;
    }

    // Send kick pulse to cash drawer
    setIsCashDrawerOpen(true);
    const drawerRes = await cashDrawerService.openCashDrawer();
    if (drawerRes.success) {
      toast({
        title: 'Cash Drawer Opened',
        description: 'Place cash into drawer and return change to customer.',
        type: 'info',
      });
    }
  };

  // Complete Wholesale Sale & Save Invoice
  const handleCompleteWholesaleSale = () => {
    if (!currentStaff) return;
    if (!customerName.trim() && !selectedCustomer) return;

    // Validation per payment method
    if (paymentMethod === 'Cash') {
      if (cashReceived < wholesaleGrandTotal) {
        toast({
          title: 'Insufficient Cash Tendered',
          description: 'Cannot finalize invoice with insufficient cash received.',
          type: 'error',
        });
        return;
      }
    } else if (paymentMethod === 'Card') {
      if (cardPaymentState !== 'authorized' || !cardTransactionId) {
        toast({
          title: 'Card Payment Incomplete',
          description: 'Please wait for the card terminal payment to be approved.',
          type: 'error',
        });
        return;
      }
    } else if (paymentMethod === 'Bank Transfer') {
      if (!isBankPaymentConfirmed || !selectedBank) {
        toast({
          title: 'Payment Verification Required',
          description: 'Please verify the bank transfer slip and click "Confirm Payment" before completing.',
          type: 'error',
        });
        return;
      }
    } else if (paymentMethod === 'Credit/Khata') {
      if (!selectedCustomer) {
        toast({
          title: 'Registered Client Required',
          description: 'Credit/Khata ledger charging requires selecting a registered Client.',
          type: 'error',
        });
        return;
      }
    }

    const calculatedChange = paymentMethod === 'Cash' ? Math.max(0, cashReceived - wholesaleGrandTotal) : 0;
    const effectiveCustomerName = customerName.trim() || selectedCustomer?.name || 'Walk-in Wholesale Customer';
    const effectivePhone = selectedCustomer?.phone || '';

    // If no client selected, ensure customer is tracked in customer service
    let billCustomer = selectedCustomer;
    if (!billCustomer && customerName.trim()) {
      billCustomer = customersService.getAll().find(
        c => c.name.toLowerCase() === customerName.trim().toLowerCase()
      ) || customersService.add({
        name: customerName.trim(),
        phone: '',
        address: '',
        city: 'Local',
        type: 'Wholesale',
        creditLimit: 0,
      });
    }

    const bill = salesService.completeSale({
      saleType: 'Wholesale',
      cartItems: wholesaleCart,
      paymentMethod,
      amountReceived: paymentMethod === 'Credit/Khata' ? 0 : paymentMethod === 'Cash' ? cashReceived : wholesaleGrandTotal,
      discountTotal: wholesaleDiscountTotal,
      taxTotal: 0,
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      customer: billCustomer || undefined,
      customerName: effectiveCustomerName,
      customerPhone: effectivePhone,
      clientId: selectedCustomer?.id,
      clientName: selectedCustomer ? (selectedCustomer.businessName || selectedCustomer.name) : undefined,
      cardTransactionId: paymentMethod === 'Card' ? cardTransactionId : undefined,
      bankDetails:
        paymentMethod === 'Bank Transfer' && selectedBank
          ? {
              bankId: selectedBank.id,
              bankName: selectedBank.bankName,
              accountTitle: selectedBank.accountTitle,
              accountNumber: selectedBank.accountNumber,
              iban: selectedBank.iban,
              confirmedByStaffId: currentStaff.id,
              confirmedByStaffName: currentStaff.name,
              confirmedAt: new Date().toISOString(),
            }
          : undefined,
      notes,
    });

    // Clear saved work session draft upon successful completion
    wholesaleSessionService.clearDraft(currentStaff.id);

    setCompletedBill(bill);
    clearWholesaleCart();
    setCustomerName('');
    setSelectedCustomer(null);
    setCashReceived(0);
    setNotes('');
    setIsCashDrawerOpen(false);
    setIsCheckoutOpen(false);
    setIsInvoiceModalOpen(true);
    setProducts(productsService.getAll());
    setNextInvoiceNumber(salesService.peekNextInvoiceNumber('Wholesale'));

    toast({
      title: 'Wholesale Invoice Finalized',
      description: `Invoice #${bill.invoiceNumber} recorded successfully.`,
      type: 'success',
    });
  };

  const calculatedChange = Math.max(0, cashReceived - wholesaleGrandTotal);
  const isCashInsufficient = paymentMethod === 'Cash' && cashReceived < wholesaleGrandTotal;

  return (
    <ProtectedRoute permission="pos_wholesale">
      <AppShell>
        <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-7rem)] overflow-hidden">
          {/* LEFT: Product Catalog & Wholesale Work Area */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            {/* Top Bar: Title, Hardware Status, and Two Bill Searches Trigger */}
            <div className="p-3.5 border-b border-slate-200/80 space-y-3 shrink-0 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-slate-900 leading-tight tracking-tight">
                        Wholesale & Bulk POS
                      </h2>
                      <span className="text-[10px] font-mono font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full border border-cyan-200">
                        Next: {nextInvoiceNumber}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">Tiered Wholesale Price Engine (PKR)</p>
                  </div>
                </div>

                {/* Right Utilities: Two Search Bars Trigger & Hardware Status */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsBillSearchOpen(true)}
                    className="gap-1.5 font-bold text-xs bg-white shadow-2xs border-slate-300 hover:border-cyan-500 hover:text-cyan-700"
                  >
                    <History className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Search Past Bills / Returns</span>
                  </Button>

                  <WholesaleHardwareStatus />
                </div>
              </div>

              {/* PERSISTENT WORK SESSION: Resume Previous Work Banner */}
              {availableDraft && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-amber-950 flex items-center gap-2">
                        <span>Unfinished Wholesale Session Detected</span>
                        <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-mono">
                          {new Date(availableDraft.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-800">
                        {availableDraft.cartItems?.length || 0} item(s) • Total: Rs.{' '}
                        {availableDraft.grandTotal?.toLocaleString() || 0}
                        {availableDraft.customerName ? ` • Shopper: ${availableDraft.customerName}` : ''}
                        {availableDraft.selectedClient ? ` • Client: ${availableDraft.selectedClient.businessName || availableDraft.selectedClient.name}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleDiscardDraft}
                      className="px-2.5 py-1 text-amber-800 hover:text-rose-700 font-semibold hover:bg-amber-100/60 rounded-lg transition-colors"
                    >
                      Discard Draft
                    </button>
                    <button
                      type="button"
                      onClick={handleResumeDraft}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Resume Work</span>
                    </button>
                  </div>
                </div>
              )}

              {/* FIELD ORDER REQUIRED: 1. Customer Name -> 2. Client */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* 1. CUSTOMER NAME (Shopper / Collector) */}
                <WholesaleCustomerInput
                  value={customerName}
                  onChange={(name, cust) => {
                    setCustomerName(name);
                    // If selected an existing customer who has wholesale terms, optionally associate
                    if (cust && (cust.type === 'Wholesale' || cust.type === 'Khata') && !selectedCustomer) {
                      setSelectedCustomer(cust);
                    }
                  }}
                />

                {/* 2. CLIENT (Wholesale Business Account) */}
                <WholesaleClientSearch
                  selectedClient={selectedCustomer}
                  onSelectClient={client => {
                    setSelectedCustomer(client);
                    if (client && !customerName) {
                      setCustomerName(client.name);
                    }
                  }}
                />
              </div>

              {/* Barcode Scanner & Search Filters Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
                {/* Dedicated Barcode Input */}
                <form
                  onSubmit={handleBarcodeSubmit}
                  className="sm:col-span-5 relative"
                >
                  <BarcodeIcon className="w-4 h-4 text-cyan-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value)}
                    placeholder="Scan or enter barcode / SKU (Press Enter)..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-cyan-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono font-bold text-slate-900 shadow-2xs placeholder:font-normal placeholder:text-slate-400"
                  />
                </form>

                {/* Text Search Bar */}
                <div className="sm:col-span-7 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search fabric name, category, or SKU for wholesale pricing..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Wholesale Product Catalog Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map(prod => {
                  const inCart = wholesaleCart.find(i => i.product.id === prod.id);
                  const isOutOfStock = prod.stock <= 0;
                  const season = prod.seasonCategory || (['Khaddar', 'Wash & Wear'].includes(prod.category) ? 'Winter' : 'Summer');
                  const hasDiscount = (prod.wholesaleDiscount || 0) > 0;
                  const finalWholesale = Math.max(0, prod.wholesalePrice - (prod.wholesaleDiscount || 0));

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
                        <div className="flex items-center gap-1 mt-1">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              season === 'Winter'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {season === 'Winter' ? '❄️ Winter' : '☀️ Summer'}
                          </span>
                          <span className="text-[10px] text-slate-400">{prod.unit}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-slate-900 font-mono">
                            Wholesale Price: Rs. {prod.wholesalePrice.toLocaleString()}
                          </div>
                          {hasDiscount ? (
                            <>
                              <div className="text-[11px] font-semibold text-emerald-600 font-mono">
                                Discount: − Rs. {(prod.wholesaleDiscount || 0).toLocaleString()}
                              </div>
                              <div className="text-xs font-black text-cyan-800 font-mono">
                                Total: Rs. {finalWholesale.toLocaleString()}
                              </div>
                            </>
                          ) : null}
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

          {/* RIGHT: Wholesale Bill & Cart Panel */}
          <div className="w-full lg:w-96 shrink-0 flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-cyan-600" />
                <h3 className="font-bold text-sm text-slate-900">Commercial Invoice</h3>
                <span className="text-[11px] bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full font-bold">
                  {wholesaleCart.length} lines
                </span>
              </div>
              {wholesaleCart.length > 0 && (
                <button
                  onClick={clearWholesaleCart}
                  className="text-slate-400 hover:text-rose-600 text-xs flex items-center gap-1 transition-colors font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Cart
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
              {wholesaleCart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Truck className="w-12 h-12 mb-2 stroke-1 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-700">Wholesale invoice is empty</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                    Scan fabric barcodes or click items from catalog to add wholesale lots.
                  </p>
                </div>
              ) : (
                wholesaleCart.map(item => {
                  const itemSeason = item.product.seasonCategory || (['Khaddar', 'Wash & Wear'].includes(item.product.category) ? 'Winter' : 'Summer');
                  const unitDiscount = item.discountPerUnit ?? item.product.wholesaleDiscount ?? 0;
                  const netUnit = Math.max(0, item.price - unitDiscount);

                  return (
                    <div key={item.product.id} className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2 mb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 leading-tight truncate">
                              {item.product.name}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                itemSeason === 'Winter'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {itemSeason === 'Winter' ? '❄️ Winter' : '☀️ Summer'}
                            </span>
                          </div>

                          {/* Wholesale Price & Discount Breakdown */}
                          {/* Wholesale Price & Discount Breakdown */}
                          <div className="mt-1 space-y-0.5 text-[11px] font-mono">
                            <div className="text-slate-600">
                              {item.quantity > 1 ? 'Unit Wholesale Price:' : 'Wholesale Price:'}{' '}
                              <span className="font-semibold text-slate-900">Rs. {item.price.toLocaleString()}</span>
                              <span className="text-[10px] text-slate-400 font-sans ml-1">/{item.product.unit}</span>
                            </div>
                            {unitDiscount > 0 ? (
                              <div className="text-emerald-600 font-semibold">
                                {item.quantity > 1 ? 'Wholesale Discount/unit:' : 'Wholesale Discount:'} − Rs. {unitDiscount.toLocaleString()}
                              </div>
                            ) : null}
                            {(item.extraDiscountRupees || 0) > 0 ? (
                              <div className="text-cyan-700 font-semibold">
                                Extra Discount (Rs.): − Rs. {(item.extraDiscountRupees || 0).toLocaleString()}
                              </div>
                            ) : null}
                            <div className="text-cyan-900 font-bold text-[10px]">
                              Final Unit Price: Rs. {Math.max(0, item.price - unitDiscount - (item.extraDiscountRupees || 0)).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => removeFromWholesaleCart(item.product.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded"
                          title="Remove Line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quantity & Extra Rs. & Line Total */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-xs">
                        <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-white">
                          <button
                            onClick={() => updateWholesaleQuantity(item.product.id, item.quantity - 1)}
                            className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-slate-900 text-xs px-2 min-w-[24px] text-center font-mono">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateWholesaleQuantity(item.product.id, item.quantity + 1)}
                            className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 font-semibold">Extra (Rs.):</span>
                          <div className="relative flex items-center">
                            <span className="text-[10px] text-slate-400 absolute left-1.5 font-mono">Rs.</span>
                            <input
                              type="number"
                              min="0"
                              value={item.extraDiscountRupees || ''}
                              placeholder="0"
                              onChange={e =>
                                updateWholesaleExtraDiscount(item.product.id, Math.max(0, parseFloat(e.target.value) || 0))
                              }
                              className="w-20 h-6 pl-6 pr-1 text-right text-xs border border-slate-200 rounded bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono font-bold text-cyan-800"
                            />
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-medium">
                            {item.quantity > 1 ? 'Line Total:' : 'Total:'}
                          </div>
                          <div className="text-xs font-black text-slate-900 font-mono">
                            Rs. {item.lineTotal.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Calculations & Submit Button */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-bold">Rs. {wholesaleSubtotal.toLocaleString()}</span>
              </div>
              {wholesaleDiscountTotal > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Total Wholesale Discounts:</span>
                  <span className="font-mono font-bold">− Rs. {wholesaleDiscountTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200">
                <span>FINAL TOTAL:</span>
                <span className="text-cyan-800 font-mono text-base font-black">Rs. {wholesaleGrandTotal.toLocaleString()}</span>
              </div>

              <Button
                variant="accent"
                size="lg"
                onClick={handleOpenCheckout}
                disabled={wholesaleCart.length === 0 || (!customerName.trim() && !selectedCustomer)}
                className="w-full mt-2 font-bold gap-2 text-sm shadow-md"
              >
                Checkout Wholesale Order <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* MODAL: Wholesale Settlement & Payment Modes */}
        <Modal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          title="Finalize Wholesale Tax Invoice"
          description="Confirm billing details, payment method, and settlement status."
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Customer & Amount Summary with Detailed Breakdown */}
            <div className="p-4 rounded-2xl bg-cyan-50/80 border border-cyan-200 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Wholesale Subtotal:</span>
                <span className="font-mono font-bold text-slate-900">Rs. {wholesaleSubtotal.toLocaleString()}</span>
              </div>
              {wholesaleDiscountTotal > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-700">
                  <span>Total Wholesale Discounts:</span>
                  <span className="font-mono font-bold">− Rs. {wholesaleDiscountTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-cyan-200/80">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    Invoice Net Payable
                  </span>
                  <div className="text-2xl font-black text-cyan-950 font-mono mt-0.5">
                    Rs. {wholesaleGrandTotal.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 font-medium">Billed To:</span>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedCustomer ? (selectedCustomer.businessName || selectedCustomer.name) : customerName.trim()}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Customer: <strong>{customerName.trim() || (selectedCustomer?.name ?? '')}</strong>
                    {selectedCustomer?.city ? ` • City: ${selectedCustomer.city}` : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Settlement Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Cash', 'Bank Transfer', 'Card', 'Credit/Khata'] as PaymentMethod[]).map(pm => (
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
                      if (pm === 'Cash') {
                        setCashReceived(wholesaleGrandTotal);
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border font-bold text-xs transition-all ${
                      paymentMethod === pm
                        ? 'border-cyan-600 bg-cyan-600 text-white shadow-sm shadow-cyan-600/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pm === 'Cash' && <Banknote className="w-4 h-4" />}
                    {pm === 'Bank Transfer' && <Building className="w-4 h-4" />}
                    {pm === 'Card' && <CreditCard className="w-4 h-4" />}
                    {pm === 'Credit/Khata' && <BookOpen className="w-4 h-4" />}
                    <span>{pm}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CASH WORKFLOW & CASH DRAWER INTEGRATION */}
            {paymentMethod === 'Cash' && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800">CASH TENDERED:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500">Rs.</span>
                    <input
                      type="number"
                      value={cashReceived || ''}
                      placeholder="0"
                      onChange={e => setCashReceived(parseFloat(e.target.value) || 0)}
                      className="w-36 h-9 px-3 text-right border border-slate-300 rounded-xl font-mono font-bold text-base text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-700">CHANGE DUE (BAKAYA):</span>
                  <span className="font-mono font-black text-base text-cyan-800">
                    Rs. {calculatedChange.toLocaleString()}
                  </span>
                </div>

                {isCashInsufficient && (
                  <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Insufficient cash! Needs Rs. {(wholesaleGrandTotal - cashReceived).toLocaleString()} more.</span>
                  </div>
                )}

                {/* Cash Drawer Action */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    Status: <span className="font-semibold text-slate-700">{isCashDrawerOpen ? 'Drawer Open' : 'Ready'}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCashDrawerWorkflow}
                    disabled={isCashInsufficient}
                    className="font-bold gap-1.5"
                  >
                    <Banknote className="w-4 h-4 text-amber-600" />
                    <span>Open Cash Drawer</span>
                  </Button>
                </div>
              </div>
            )}

            {/* BANK TRANSFER WORKFLOW WITH VERIFICATION */}
            {paymentMethod === 'Bank Transfer' && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Store Bank Account for Transfer
                  </label>
                  <select
                    value={selectedBank?.id || ''}
                    onChange={e => {
                      const b = bankAccounts.find(x => x.id === e.target.value);
                      setSelectedBank(b || null);
                      setIsBankPaymentConfirmed(false);
                    }}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountTitle} ({b.accountNumber})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBank && (
                  <div className="p-3 bg-white rounded-xl border border-cyan-200 space-y-1 font-mono text-xs">
                    <div className="flex justify-between text-slate-500 font-sans">
                      <span>Bank Name:</span>
                      <strong className="text-slate-900">{selectedBank.bankName}</strong>
                    </div>
                    <div className="flex justify-between text-slate-500 font-sans">
                      <span>Account Title:</span>
                      <strong className="text-slate-900">{selectedBank.accountTitle}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Account Number:</span>
                      <span className="font-bold text-slate-900">{selectedBank.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">IBAN:</span>
                      <span className="font-bold text-slate-900">{selectedBank.iban}</span>
                    </div>
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-2">
                  <p>Customer must transfer from their mobile banking app and show payment proof / slip.</p>
                  <div className="flex items-center justify-between pt-1 border-t border-amber-200/60">
                    <span className="font-bold">Staff Verification:</span>
                    <button
                      type="button"
                      onClick={() => setIsBankPaymentConfirmed(prev => !prev)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                        isBankPaymentConfirmed
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                      }`}
                    >
                      {isBankPaymentConfirmed ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Payment Confirmed
                        </>
                      ) : (
                        <span>Confirm Payment</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CARD TERMINAL WORKFLOW */}
            {paymentMethod === 'Card' && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Card Terminal Machine</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      cardPaymentState === 'authorized'
                        ? 'bg-emerald-100 text-emerald-800'
                        : cardPaymentState === 'failed'
                        ? 'bg-rose-100 text-rose-800'
                        : cardPaymentState === 'waiting_card' || cardPaymentState === 'processing'
                        ? 'bg-cyan-100 text-cyan-800 animate-pulse'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {cardPaymentState}
                  </span>
                </div>

                {cardStatusMessage && (
                  <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-200">
                    {cardStatusMessage}
                  </p>
                )}

                {cardPaymentState !== 'authorized' ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleStartCardPayment}
                    disabled={cardPaymentState === 'processing' || cardPaymentState === 'waiting_card'}
                    className="w-full font-bold gap-2"
                  >
                    <CreditCard className="w-4 h-4" /> Start Card Terminal Payment
                  </Button>
                ) : (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold flex items-center justify-between">
                    <span>Authorized (Ref: {cardTransactionId})</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </div>
            )}

            {/* Notes / PO Reference */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client PO # / Vehicle Dispatch Builty Reference
              </label>
              <input
                type="text"
                placeholder="e.g. Dispatched via Bilal Cargo Builty # 4920"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                disabled={
                  (paymentMethod === 'Cash' && isCashInsufficient) ||
                  (paymentMethod === 'Bank Transfer' && !isBankPaymentConfirmed) ||
                  (paymentMethod === 'Card' && cardPaymentState !== 'authorized')
                }
                className="gap-2 font-bold shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>DONE PAYMENT & Save Invoice</span>
              </Button>
            </div>
          </div>
        </Modal>

        {/* MODAL: Printable A4 Commercial Invoice Preview */}
        <Modal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          title="Commercial Wholesale Invoice"
          maxWidth="4xl"
        >
          {completedBill && (
            <WholesaleInvoicePrint
              bill={completedBill}
              onClose={() => setIsInvoiceModalOpen(false)}
            />
          )}
        </Modal>

        {/* MODAL: Two Independent Bill Searches */}
        <WholesaleBillSearchModal
          isOpen={isBillSearchOpen}
          onClose={() => setIsBillSearchOpen(false)}
          onViewBill={bill => {
            setCompletedBill(bill);
            setIsBillSearchOpen(false);
            setIsInvoiceModalOpen(true);
          }}
          onSelectPrint={bill => {
            setCompletedBill(bill);
            setIsBillSearchOpen(false);
            setIsInvoiceModalOpen(true);
          }}
          onSelectReturn={bill => {
            setBillForAction(bill);
            setIsBillSearchOpen(false);
            setIsReturnModalOpen(true);
          }}
          onSelectExchange={bill => {
            setBillForAction(bill);
            setIsBillSearchOpen(false);
            setIsExchangeModalOpen(true);
          }}
        />

        {/* MODAL: Wholesale Return Workflow */}
        <WholesaleReturnModal
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          bill={billForAction}
          onReturnCompleted={(retTx, updatedBill) => {
            setCompletedReturn(retTx);
            setBillForAction(updatedBill);
            setIsReturnPrintOpen(true);
            setProducts(productsService.getAll());
          }}
        />

        {/* MODAL: Wholesale Exchange Workflow */}
        <WholesaleExchangeModal
          isOpen={isExchangeModalOpen}
          onClose={() => setIsExchangeModalOpen(false)}
          bill={billForAction}
          onExchangeCompleted={(excTx, updatedBill) => {
            setCompletedExchange(excTx);
            setBillForAction(updatedBill);
            setIsExchangePrintOpen(true);
            setProducts(productsService.getAll());
          }}
        />

        {/* MODAL: Return Slip Print */}
        <Modal
          isOpen={isReturnPrintOpen}
          onClose={() => setIsReturnPrintOpen(false)}
          title="Print Wholesale Return Voucher"
          maxWidth="2xl"
        >
          {completedReturn && (
            <PrintableWholesaleReturn
              returnTx={completedReturn}
              bill={billForAction}
              onClose={() => setIsReturnPrintOpen(false)}
            />
          )}
        </Modal>

        {/* MODAL: Exchange Slip Print */}
        <Modal
          isOpen={isExchangePrintOpen}
          onClose={() => setIsExchangePrintOpen(false)}
          title="Print Wholesale Exchange Voucher"
          maxWidth="2xl"
        >
          {completedExchange && (
            <PrintableWholesaleExchange
              exchangeTx={completedExchange}
              bill={billForAction}
              onClose={() => setIsExchangePrintOpen(false)}
            />
          )}
        </Modal>
      </AppShell>
    </ProtectedRoute>
  );
}
