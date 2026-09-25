'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { WholesaleInvoicePrint } from '@/components/print/WholesaleInvoicePrint';
import { PrintableWholesaleReturn } from '@/components/print/PrintableWholesaleReturn';
import { PrintableWholesaleExchange } from '@/components/print/PrintableWholesaleExchange';
import { KhataStatementPrint } from '@/components/print/KhataStatementPrint';
import { WholesaleCustomerInput } from '@/components/wholesale-pos/WholesaleCustomerInput';
import { WholesaleClientSearch } from '@/components/wholesale-pos/WholesaleClientSearch';
import { WholesaleHardwareStatus } from '@/components/wholesale-pos/WholesaleHardwareStatus';
import { WholesaleBillSearchModal } from '@/components/wholesale-pos/WholesaleBillSearchModal';
import { WholesaleReturnModal } from '@/components/wholesale-pos/WholesaleReturnModal';
import { WholesaleExchangeModal } from '@/components/wholesale-pos/WholesaleExchangeModal';
import {
  BookOpen,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Building,
  CreditCard,
  Banknote,
  ArrowRight,
  Printer,
  Barcode as BarcodeIcon,
  AlertCircle,
  Clock,
  Sparkles,
  Check,
  History,
  AlertTriangle,
  Wallet,
} from 'lucide-react';
import { productsService } from '@/services/productsService';
import { customersService } from '@/services/customersService';
import { salesService } from '@/services/salesService';
import { storageService } from '@/services/storageService';
import { khataSessionService } from '@/services/khataSessionService';
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
  KhataSessionDraft,
} from '@/types';

export default function KhataPOSPage() {
  const { currentStaff } = useAuth();
  const { toast } = useToast();
  const {
    khataCart,
    addToKhataCart,
    removeFromKhataCart,
    updateKhataQuantity,
    updateKhataDiscount,
    updateKhataExtraDiscount,
    clearKhataCart,
    khataSubtotal,
    khataDiscountTotal,
    khataGrandTotal,
    syncWithLatestProducts,
  } = useCart();

  // Products & Client Data
  const [products, setProducts] = useState<Product[]>(() => {
    if (typeof window !== 'undefined') {
      return productsService.getAll();
    }
    return [];
  });
  // PART 1 - Req 2: Customer Name must NOT be selected by default
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return salesService.peekNextInvoiceNumber('Khata');
    }
    return 'KHT-2026-000001';
  });

  // Work Session Resume State (Across reboots/shutdowns)
  const [availableDraft, setAvailableDraft] = useState<KhataSessionDraft | null>(null);
  const [hasCheckedDraft, setHasCheckedDraft] = useState(false);

  // Khata Checkout State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit/Khata');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Bank Transfer Payment States
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    if (typeof window !== 'undefined') {
      return storageService.getSettings().bankAccounts || [];
    }
    return [];
  });
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(() => {
    if (typeof window !== 'undefined') {
      const banks = storageService.getSettings().bankAccounts || [];
      return banks.length > 0 ? banks[0] : null;
    }
    return null;
  });
  const [isBankPaymentConfirmed, setIsBankPaymentConfirmed] = useState(false);

  // Card Terminal Payment States
  const [cardPaymentState, setCardPaymentState] = useState<CardPaymentState>('idle');
  const [cardStatusMessage, setCardStatusMessage] = useState('');
  const [cardTransactionId, setCardTransactionId] = useState<string | undefined>(undefined);

  // Statement Print Modal
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  // Completed Invoices & Modals
  const [completedBill, setCompletedBill] = useState<Bill | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Bill Searches & Return/Exchange Modals
  const [isBillSearchOpen, setIsBillSearchOpen] = useState(false);
  const [billForAction, setBillForAction] = useState<Bill | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [completedReturn, setCompletedReturn] = useState<ReturnTransaction | null>(null);
  const [isReturnPrintOpen, setIsReturnPrintOpen] = useState(false);
  const [completedExchange, setCompletedExchange] = useState<ExchangeTransaction | null>(null);
  const [isExchangePrintOpen, setIsExchangePrintOpen] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Focus and storage sync
  useEffect(() => {
    const refreshData = () => {
      setProducts(productsService.getAll());
      setNextInvoiceNumber(salesService.peekNextInvoiceNumber('Khata'));
      const settings = storageService.getSettings();
      setBankAccounts(settings.bankAccounts || []);
      syncWithLatestProducts();
    };

    window.addEventListener('focus', refreshData);
    window.addEventListener('storage', refreshData);

    return () => {
      window.removeEventListener('focus', refreshData);
      window.removeEventListener('storage', refreshData);
    };
  }, [syncWithLatestProducts]);

  // Staff-specific draft detection on mount / staff switch
  useEffect(() => {
    if (!currentStaff?.id || hasCheckedDraft) return;

    const timer = setTimeout(() => {
      const draft = khataSessionService.getDraft(currentStaff.id);
      if (draft) {
        setAvailableDraft(draft);
      }
      setHasCheckedDraft(true);
    }, 0);

    return () => clearTimeout(timer);
  }, [currentStaff?.id, hasCheckedDraft]);

  // Auto-save active khata draft to persistent storage whenever state changes
  // Bug fix: ONLY save draft if cart has items!
  useEffect(() => {
    if (!currentStaff?.id || !hasCheckedDraft) return;

    if (khataCart.length > 0) {
      khataSessionService.saveDraft(currentStaff.id, {
        customerName: customerName.trim() || undefined,
        selectedClient: selectedCustomer,
        cartItems: khataCart,
        paymentMethod,
        amountReceived: cashReceived,
        selectedBankId: selectedBank?.id,
        bankPaymentConfirmed: isBankPaymentConfirmed,
        notes: notes.trim() || undefined,
        subtotal: khataSubtotal,
        grandTotal: khataGrandTotal,
      });
    }
  }, [
    currentStaff?.id,
    hasCheckedDraft,
    khataCart,
    customerName,
    selectedCustomer,
    paymentMethod,
    cashReceived,
    selectedBank,
    isBankPaymentConfirmed,
    notes,
    khataSubtotal,
    khataGrandTotal,
  ]);

  // Resume Draft Handler
  const handleResumeDraft = () => {
    if (!availableDraft) return;

    if (availableDraft.customerName) {
      setCustomerName(availableDraft.customerName);
    }
    if (availableDraft.selectedClient) {
      setSelectedCustomer(availableDraft.selectedClient);
    }

    if (availableDraft.cartItems && availableDraft.cartItems.length > 0) {
      clearKhataCart();
      availableDraft.cartItems.forEach(item => {
        addToKhataCart(item.product, item.quantity);
        if (item.extraDiscountRupees && item.extraDiscountRupees > 0) {
          updateKhataExtraDiscount(item.product.id, item.extraDiscountRupees);
        } else if (item.discountPercent > 0) {
          updateKhataDiscount(item.product.id, item.discountPercent);
        }
      });
    }

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
      description: 'Your previous Khata Credit POS session has been restored.',
      type: 'success',
    });
  };

  // Discard Draft Handler (Permanent discard fix)
  const handleDiscardDraft = () => {
    if (currentStaff?.id) {
      khataSessionService.discardDraft(currentStaff.id);
    }
    setAvailableDraft(null);
    clearKhataCart();
    setSelectedCustomer(null);
    setCustomerName('');
    setNotes('');
    setCashReceived(0);
    toast({
      title: 'Draft Discarded',
      description: 'Previous unfinished Khata session was permanently cleared.',
      type: 'info',
    });
  };

  // Product Filter
  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode?.includes(q) ||
      p.wholesaleBarcode?.includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  // Open Checkout Modal
  const handleOpenCheckout = () => {
    if (khataCart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add products with Khata Sale Prices before proceeding.',
        type: 'warning',
      });
      return;
    }
    if (!selectedCustomer) {
      toast({
        title: 'Khata Account Required',
        description: 'Please select a registered Khata customer / credit account.',
        type: 'error',
      });
      return;
    }

    setPaymentMethod('Credit/Khata');
    setCashReceived(khataGrandTotal);
    setIsBankPaymentConfirmed(false);
    setCardPaymentState('idle');
    setCardTransactionId(undefined);
    setIsCheckoutOpen(true);
  };

  // Trigger Card Payment
  const handleStartCardPayment = async () => {
    setCardPaymentState('waiting_card');
    setCardStatusMessage('Waiting for customer card tap/insert on terminal...');
    const result = await cardTerminalService.startCardPayment(khataGrandTotal, (state, msg) => {
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

  // Complete Khata Credit Sale & Save Invoice
  const handleCompleteKhataSale = () => {
    if (!currentStaff || !selectedCustomer) return;

    // Validation per payment method
    if (paymentMethod === 'Cash') {
      if (cashReceived < khataGrandTotal) {
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
    }

    const bill = salesService.completeSale({
      saleType: 'Khata',
      cartItems: khataCart,
      paymentMethod,
      amountReceived: paymentMethod === 'Credit/Khata' ? 0 : paymentMethod === 'Cash' ? cashReceived : khataGrandTotal,
      discountTotal: khataDiscountTotal,
      taxTotal: 0,
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      customer: selectedCustomer,
      customerName: customerName.trim() || selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      clientId: selectedCustomer.id,
      clientName: selectedCustomer.businessName || selectedCustomer.name,
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
    khataSessionService.clearDraft(currentStaff.id);

    // Refresh customer to get updated balance
    const updatedCustomer = customersService.getById(selectedCustomer.id);
    if (updatedCustomer) {
      setSelectedCustomer(updatedCustomer);
    }

    setCompletedBill(bill);
    clearKhataCart();
    setCashReceived(0);
    setNotes('');
    setIsCheckoutOpen(false);
    setIsInvoiceModalOpen(true);
    setProducts(productsService.getAll());
    setNextInvoiceNumber(salesService.peekNextInvoiceNumber('Khata'));

    toast({
      title: 'Khata Credit Sale Recorded',
      description: `Invoice #${bill.invoiceNumber} saved and debited to ${selectedCustomer.name}'s Khata ledger.`,
      type: 'success',
    });
  };

  const calculatedChange = Math.max(0, cashReceived - khataGrandTotal);
  const isCashInsufficient = paymentMethod === 'Cash' && cashReceived < khataGrandTotal;

  // Credit Limit Calculations
  const currentBalance = selectedCustomer?.currentBalance ?? selectedCustomer?.balance ?? 0;
  const creditLimit = selectedCustomer?.creditLimit || 0;
  const newProjectedBalance = currentBalance + khataGrandTotal;
  const availableCredit = Math.max(0, creditLimit - currentBalance);
  const isLimitExceeded = creditLimit > 0 && newProjectedBalance > creditLimit;
  const excessAmount = isLimitExceeded ? newProjectedBalance - creditLimit : 0;

  return (
    <ProtectedRoute permission="pos_khata">
      <AppShell>
        <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-7rem)] overflow-hidden">
          {/* LEFT: Product Catalog & Khata Work Area */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            {/* Top Bar: Title, Hardware Status, Statement & Bill Searches */}
            <div className="p-3.5 border-b border-slate-200/80 space-y-3 shrink-0 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-slate-900 leading-tight tracking-tight">
                        Khata Credit POS
                      </h2>
                      <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                        Next: {nextInvoiceNumber}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">Customer Khata Ledger & Credit Sales Engine (PKR)</p>
                  </div>
                </div>

                {/* Right Utilities: Search Past Bills */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsBillSearchOpen(true)}
                    className="gap-1.5 font-bold text-xs bg-white shadow-2xs border-slate-300 hover:border-amber-500 hover:text-amber-800"
                  >
                    <History className="w-3.5 h-3.5 text-amber-600" />
                    <span>Search Khata Bills / Returns</span>
                  </Button>
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
                        <span>Unfinished Khata Session Detected</span>
                        <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-mono">
                          {new Date(availableDraft.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-800">
                        {availableDraft.cartItems?.length || 0} item(s) • Total: Rs.{' '}
                        {availableDraft.grandTotal?.toLocaleString() || 0}
                        {availableDraft.customerName ? ` • Shopper: ${availableDraft.customerName}` : ''}
                        {availableDraft.selectedClient ? ` • Account: ${availableDraft.selectedClient.businessName || availableDraft.selectedClient.name}` : ''}
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

              {/* DUAL CUSTOMER SELECTION: 1. Collector/Shopper -> 2. Registered Khata Account */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* 1. CUSTOMER NAME (Shopper / Collector) */}
                <WholesaleCustomerInput
                  value={customerName}
                  onChange={(name, cust) => {
                    setCustomerName(name);
                    if (cust && (cust.type === 'Khata' || cust.creditLimit > 0) && !selectedCustomer) {
                      setSelectedCustomer(cust);
                    }
                  }}
                />

                {/* 2. KHATA ACCOUNT (Ledger Account) */}
                <WholesaleClientSearch
                  selectedClient={selectedCustomer}
                  filterKhataOnly={true}
                  themeColor="amber"
                  titleLabel="KHATA ACCOUNT"
                  subtitleLabel="(Customer Credit Ledger)"
                  placeholder="Search Khata account by name, business, or phone..."
                  onSelectClient={client => {
                    setSelectedCustomer(client);
                    if (client && !customerName) {
                      setCustomerName(client.name);
                    }
                  }}
                />
              </div>

              {/* KHATA CUSTOMER CREDIT & LEDGER SUMMARY STRIP */}
              {selectedCustomer && (
                <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      <Wallet className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-amber-950">
                        {selectedCustomer.businessName ? `${selectedCustomer.businessName} (${selectedCustomer.name})` : selectedCustomer.name}
                      </span>
                      <span className="text-[11px] text-amber-700 ml-2 font-mono">
                        {selectedCustomer.phone} • {selectedCustomer.city}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px]">
                    <div>
                      <span className="text-slate-500">Credit Limit:</span>{' '}
                      <span className="font-bold font-mono text-slate-800">
                        {creditLimit > 0 ? `Rs. ${creditLimit.toLocaleString()}` : 'No Limit'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Current Debt:</span>{' '}
                      <span className="font-bold font-mono text-rose-700">
                        Rs. {currentBalance.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Available Credit:</span>{' '}
                      <span className={`font-bold font-mono ${availableCredit > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {creditLimit > 0 ? `Rs. ${availableCredit.toLocaleString()}` : 'Unlimited'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* CREDIT LIMIT WARNING BANNER */}
              {isLimitExceeded && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800 font-semibold animate-pulse">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>
                    Warning: This purchase will exceed {selectedCustomer?.name}&apos;s credit limit (Rs. {creditLimit.toLocaleString()}) by Rs. {excessAmount.toLocaleString()}!
                  </span>
                </div>
              )}

              {/* Search Filters Strip - Hardware Barcode removed for Khata Credit POS */}
              <div className="pt-1">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search fabric name, category, or SKU for Khata pricing..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Khata Product Catalog Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map(prod => {
                  const inCart = khataCart.find(i => i.product.id === prod.id);
                  const isOutOfStock = prod.stock <= 0;
                  const season = prod.seasonCategory || (['Khaddar', 'Wash & Wear'].includes(prod.category) ? 'Winter' : 'Summer');
                  const hasKhataPrice = prod.khataPrice !== undefined && prod.khataPrice !== null && prod.khataPrice > 0;
                  const hasDiscount = (prod.khataDiscount || 0) > 0;
                  const finalKhata = hasKhataPrice ? Math.max(0, (prod.khataPrice || 0) - (prod.khataDiscount || 0)) : 0;

                  const handleProductClick = () => {
                    if (isOutOfStock) return;
                    if (!hasKhataPrice) {
                      toast({
                        title: 'Khata Sale Price Missing',
                        description: `Cannot add "${prod.name}". Please configure a Khata Sale Price in Product Catalog before selling on Khata.`,
                        type: 'error',
                      });
                      return;
                    }
                    addToKhataCart(prod);
                  };

                  return (
                    <div
                      key={prod.id}
                      onClick={handleProductClick}
                      className={`relative p-3 rounded-xl border flex flex-col justify-between transition-all duration-150 cursor-pointer select-none group ${
                        isOutOfStock
                          ? 'opacity-50 bg-slate-50 border-slate-200 pointer-events-none'
                          : !hasKhataPrice
                          ? 'border-rose-200 bg-rose-50/20 hover:border-rose-400'
                          : inCart
                          ? 'border-amber-500 bg-amber-50/20 shadow-xs'
                          : 'border-slate-200/80 bg-white hover:border-amber-300 hover:shadow-md'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span className="font-mono">{prod.sku}</span>
                          <span className="font-semibold text-slate-600">
                            {prod.stock} {prod.unit}
                          </span>
                        </div>

                        <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-amber-700 transition-colors">
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
                          {!hasKhataPrice && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200">
                              No Khata Price
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="space-y-0.5">
                          {hasKhataPrice ? (
                            <>
                              <div className="text-xs font-bold text-slate-900 font-mono">
                                Khata Price: Rs. {(prod.khataPrice || 0).toLocaleString()}
                              </div>
                              {hasDiscount ? (
                                <>
                                  <div className="text-[11px] font-semibold text-emerald-600 font-mono">
                                    Discount: − Rs. {(prod.khataDiscount || 0).toLocaleString()}
                                  </div>
                                  <div className="text-xs font-black text-amber-800 font-mono">
                                    Net: Rs. {finalKhata.toLocaleString()}
                                  </div>
                                </>
                              ) : null}
                            </>
                          ) : (
                            <div className="text-[11px] font-bold text-rose-600 italic">
                              Price Not Set
                            </div>
                          )}
                        </div>
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs transition-colors ${
                            inCart
                              ? 'bg-amber-600 text-white font-bold'
                              : !hasKhataPrice
                              ? 'bg-rose-100 text-rose-400 cursor-not-allowed'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-amber-600 group-hover:text-white'
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

          {/* RIGHT: Khata Bill & Cart Panel */}
          <div className="w-full lg:w-96 shrink-0 flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-900">Khata Credit Bill</h3>
                <span className="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                  {khataCart.length} lines
                </span>
              </div>
              {khataCart.length > 0 && (
                <button
                  onClick={clearKhataCart}
                  className="text-slate-400 hover:text-rose-600 text-xs flex items-center gap-1 transition-colors font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Cart
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
              {khataCart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <BookOpen className="w-12 h-12 mb-2 stroke-1 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-700">Khata invoice is empty</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                    Scan fabric barcodes or click products from catalog to add at Khata credit rates.
                  </p>
                </div>
              ) : (
                khataCart.map(item => {
                  const itemSeason = item.product.seasonCategory || (['Khaddar', 'Wash & Wear'].includes(item.product.category) ? 'Winter' : 'Summer');
                  const unitDiscount = item.discountPerUnit ?? item.product.khataDiscount ?? 0;
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

                          {/* Khata Price & Discount Breakdown */}
                          <div className="mt-1 space-y-0.5 text-[11px] font-mono">
                            <div className="text-slate-600">
                              {item.quantity > 1 ? 'Unit Khata Price:' : 'Khata Price:'}{' '}
                              <span className="font-semibold text-slate-900">Rs. {item.price.toLocaleString()}</span>
                              <span className="text-[10px] text-slate-400 font-sans ml-1">/{item.product.unit}</span>
                            </div>
                            {unitDiscount > 0 ? (
                              <div className="text-emerald-600 font-semibold">
                                {item.quantity > 1 ? 'Khata Discount/unit:' : 'Khata Discount:'} − Rs. {unitDiscount.toLocaleString()}
                              </div>
                            ) : null}
                            {(item.extraDiscountRupees || 0) > 0 ? (
                              <div className="text-amber-700 font-semibold">
                                Extra Discount (Rs.): − Rs. {(item.extraDiscountRupees || 0).toLocaleString()}
                              </div>
                            ) : null}
                            <div className="text-amber-900 font-bold text-[10px]">
                              Final Unit Price: Rs. {Math.max(0, item.price - unitDiscount - (item.extraDiscountRupees || 0)).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => removeFromKhataCart(item.product.id)}
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
                            onClick={() => updateKhataQuantity(item.product.id, item.quantity - 1)}
                            className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-slate-900 text-xs px-2 min-w-[24px] text-center font-mono">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateKhataQuantity(item.product.id, item.quantity + 1)}
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
                                updateKhataExtraDiscount(item.product.id, Math.max(0, parseFloat(e.target.value) || 0))
                              }
                              className="w-20 h-6 pl-6 pr-1 text-right text-xs border border-slate-200 rounded bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold text-amber-800"
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
                <span className="font-mono font-bold">Rs. {khataSubtotal.toLocaleString()}</span>
              </div>
              {khataDiscountTotal > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Total Khata Discounts:</span>
                  <span className="font-mono font-bold">− Rs. {khataDiscountTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200">
                <span>FINAL TOTAL:</span>
                <span className="text-amber-800 font-mono text-base font-black">Rs. {khataGrandTotal.toLocaleString()}</span>
              </div>

              {isLimitExceeded && (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold">
                  Exceeds Credit Limit by Rs. {excessAmount.toLocaleString()}
                </div>
              )}

              <Button
                variant="accent"
                size="lg"
                onClick={handleOpenCheckout}
                disabled={khataCart.length === 0 || !selectedCustomer}
                className="w-full mt-2 font-bold gap-2 text-sm shadow-md bg-amber-600 hover:bg-amber-700 text-white"
              >
                Charge to Khata Account <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* MODAL: Khata Settlement & Ledger Confirmation */}
        <Modal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          title="Finalize Khata Credit Sale"
          description="Debit invoice amount to customer credit ledger and record transaction."
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Customer & Amount Summary with Detailed Breakdown */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Khata Subtotal:</span>
                <span className="font-mono font-bold text-slate-900">Rs. {khataSubtotal.toLocaleString()}</span>
              </div>
              {khataDiscountTotal > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-700">
                  <span>Total Khata Discounts:</span>
                  <span className="font-mono font-bold">− Rs. {khataDiscountTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-amber-200/80">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    Total Debit Amount
                  </span>
                  <div className="text-2xl font-black text-amber-950 font-mono mt-0.5">
                    Rs. {khataGrandTotal.toLocaleString()}
                  </div>
                </div>
                {selectedCustomer && (
                  <div className="text-right">
                    <span className="text-slate-500 font-medium">Billed To (Khata Account):</span>
                    <div className="font-bold text-slate-900 text-sm">
                      {selectedCustomer.businessName || selectedCustomer.name}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Shopper: <strong>{customerName || selectedCustomer.name}</strong> • Phone: {selectedCustomer.phone}
                    </div>
                  </div>
                )}
              </div>

              {/* Ledger Impact Preview */}
              {selectedCustomer && (
                <div className="pt-2 border-t border-amber-200/60 grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="p-2 rounded-lg bg-white/80 border border-amber-100">
                    <span className="text-slate-500 block">Current Balance</span>
                    <span className="font-bold font-mono text-slate-900">Rs. {currentBalance.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/80 border border-amber-100">
                    <span className="text-slate-500 block">After This Sale</span>
                    <span className="font-bold font-mono text-amber-900">
                      Rs. {(paymentMethod === 'Credit/Khata' ? newProjectedBalance : currentBalance).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/80 border border-amber-100">
                    <span className="text-slate-500 block">Credit Limit</span>
                    <span className="font-bold font-mono text-slate-900">
                      {creditLimit > 0 ? `Rs. ${creditLimit.toLocaleString()}` : 'Unlimited'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Settlement / Ledger Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Credit/Khata', 'Cash', 'Bank Transfer', 'Card'] as PaymentMethod[]).map(pm => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(pm);
                      if (pm === 'Cash') {
                        setCashReceived(khataGrandTotal);
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border font-bold text-xs transition-all ${
                      paymentMethod === pm
                        ? 'border-amber-600 bg-amber-600 text-white shadow-sm shadow-amber-600/20'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pm === 'Credit/Khata' && <BookOpen className="w-4 h-4" />}
                    {pm === 'Cash' && <Banknote className="w-4 h-4" />}
                    {pm === 'Bank Transfer' && <Building className="w-4 h-4" />}
                    {pm === 'Card' && <CreditCard className="w-4 h-4" />}
                    <span>{pm === 'Credit/Khata' ? 'Debit to Khata' : pm}</span>
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
                      className="w-36 h-9 px-3 text-right border border-slate-300 rounded-xl font-mono font-bold text-base text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-700">CHANGE DUE (BAKAYA):</span>
                  <span className="font-mono font-black text-base text-amber-800">
                    Rs. {calculatedChange.toLocaleString()}
                  </span>
                </div>

                {isCashInsufficient && (
                  <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Insufficient cash! Needs Rs. {(khataGrandTotal - cashReceived).toLocaleString()} more.</span>
                  </div>
                )}

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
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountTitle} ({b.accountNumber})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBank && (
                  <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1 font-mono text-xs">
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
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
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
                    className="w-full font-bold gap-2 bg-amber-600 hover:bg-amber-700 text-white"
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

            {/* Notes / Ledger Reference */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Khata Ledger Reference / PO # / Book Page #
              </label>
              <input
                type="text"
                placeholder="e.g. Ledger Book 3 Page 45, Dispatched via Bilal Cargo"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                onClick={handleCompleteKhataSale}
                disabled={
                  (paymentMethod === 'Cash' && isCashInsufficient) ||
                  (paymentMethod === 'Bank Transfer' && !isBankPaymentConfirmed) ||
                  (paymentMethod === 'Card' && cardPaymentState !== 'authorized')
                }
                className="gap-2 font-bold shadow-sm bg-amber-600 hover:bg-amber-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Debit Khata Ledger</span>
              </Button>
            </div>
          </div>
        </Modal>

        {/* MODAL: Printable A4 Khata Commercial Invoice Preview */}
        <Modal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          title="Khata Credit POS Invoice"
          maxWidth="4xl"
        >
          {completedBill && (
            <WholesaleInvoicePrint
              bill={completedBill}
              onClose={() => setIsInvoiceModalOpen(false)}
            />
          )}
        </Modal>

        {/* MODAL: Khata Customer Statement Print */}
        <Modal
          isOpen={isStatementModalOpen}
          onClose={() => setIsStatementModalOpen(false)}
          title="Customer Khata Statement"
          maxWidth="4xl"
        >
          {selectedCustomer && (
            <KhataStatementPrint
              customer={selectedCustomer}
              transactions={customersService.getKhataTransactions(selectedCustomer.id)}
              onClose={() => setIsStatementModalOpen(false)}
            />
          )}
        </Modal>

        {/* MODAL: Search Past Khata Bills */}
        <WholesaleBillSearchModal
          isOpen={isBillSearchOpen}
          onClose={() => setIsBillSearchOpen(false)}
          saleType="Khata"
          title="Search Khata Credit Bills"
          description="Find historical Khata credit invoices to view, reprint, return, or exchange items."
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

        {/* MODAL: Khata Return Workflow */}
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

        {/* MODAL: Khata Exchange Workflow */}
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
          title="Print Khata Return Voucher"
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
          title="Print Khata Exchange Voucher"
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
