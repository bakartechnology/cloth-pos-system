'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
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
import { WholesaleKeyboardShortcutsModal } from '@/components/wholesale-pos/WholesaleKeyboardShortcutsModal';
import {
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
  ChevronDown,
  Barcode as BarcodeIcon,
  RotateCcw,
  ArrowLeftRight,
  FileText,
  Clock,
  Sparkles,
  Check,
  Scan,
  Keyboard,
  ShieldCheck,
  ShoppingBag,
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
    clearWholesaleCart,
    wholesaleSubtotal,
    wholesaleDiscountTotal,
    wholesaleGrandTotal,
    syncWithLatestProducts,
  } = useCart();

  // Products & Client Data (Clean defaults: NO pre-filled Ahmed Raza)
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null); // Wholesale Client
  const [customerName, setCustomerName] = useState(''); // Clean empty by default
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All fabrics');
  const [sortOption, setSortOption] = useState<'inStock' | 'recent' | 'priceAsc' | 'priceDesc'>('inStock');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [visibleCount, setVisibleCount] = useState<number>(9);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('WB-026184');
  const [currentTime, setCurrentTime] = useState('');

  // Work Session Resume State (Across reboots/shutdowns)
  const [availableDraft, setAvailableDraft] = useState<WholesaleSessionDraft | null>(null);
  const [hasCheckedDraft, setHasCheckedDraft] = useState(false);

  // Wholesale Checkout State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
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
  const [isWholesaleTerminalEnabled, setIsWholesaleTerminalEnabled] = useState<boolean>(false);

  // Cash Drawer State
  const [isCashDrawerOpen, setIsCashDrawerOpen] = useState(false);

  // Completed Invoices & Modals
  const [completedBill, setCompletedBill] = useState<Bill | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Search Past Bills, Shortcuts, and Return/Exchange Modals
  const [isBillSearchOpen, setIsBillSearchOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [billForAction, setBillForAction] = useState<Bill | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [completedReturn, setCompletedReturn] = useState<ReturnTransaction | null>(null);
  const [isReturnPrintOpen, setIsReturnPrintOpen] = useState(false);
  const [completedExchange, setCompletedExchange] = useState<ExchangeTransaction | null>(null);
  const [isExchangePrintOpen, setIsExchangePrintOpen] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initial Data Load, Sequence Peek, and live focus/storage sync
  useEffect(() => {
    const refreshData = () => {
      setProducts(productsService.getAll());
      const nextInv = salesService.peekNextInvoiceNumber('Wholesale');
      setNextInvoiceNumber(nextInv ? `#${nextInv}` : '#WB-026184');
      const settings = storageService.getSettings();
      setIsWholesaleTerminalEnabled(Boolean(settings.wholesaleCardTerminal?.enabled));
      const banks = settings.bankAccounts || [];
      setBankAccounts(banks);
      if (banks.length > 0) {
        setSelectedBank(banks[0]);
      }
      syncWithLatestProducts();
    };

    refreshData();

    // Live clock update
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    };
    updateClock();
    const clockTimer = setInterval(updateClock, 1000);

    window.addEventListener('focus', refreshData);
    window.addEventListener('storage', refreshData);

    return () => {
      clearInterval(clockTimer);
      window.removeEventListener('focus', refreshData);
      window.removeEventListener('storage', refreshData);
    };
  }, []);

  // Keyboard Shortcuts (F1: Barcode, F2: Search, F3: Bills, F8: Checkout)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      } else if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setIsBillSearchOpen(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleOpenCheckout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Reset visible count to 9 when filter or search changes
  useEffect(() => {
    setVisibleCount(9);
  }, [selectedCategory, searchQuery, sortOption]);

  // Staff-specific draft detection on mount: ONLY prompt if draft has real cart items!
  useEffect(() => {
    if (currentStaff?.id && !hasCheckedDraft) {
      const draft = wholesaleSessionService.getDraft(currentStaff.id);
      if (draft && draft.cartItems && draft.cartItems.length > 0) {
        setAvailableDraft(draft);
      } else if (draft) {
        wholesaleSessionService.clearDraft(currentStaff.id);
      }
      setHasCheckedDraft(true);
    }
  }, [currentStaff?.id, hasCheckedDraft]);

  // Auto-save active wholesale draft ONLY when there are products in the cart!
  useEffect(() => {
    if (!currentStaff?.id || !hasCheckedDraft) return;

    if (wholesaleCart.length > 0) {
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
    } else {
      // Clean up draft when cart is empty so refresh does not prompt "resume work"
      wholesaleSessionService.clearDraft(currentStaff.id);
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

    if (availableDraft.customerName) {
      setCustomerName(availableDraft.customerName);
    }
    if (availableDraft.selectedClient) {
      setSelectedCustomer(availableDraft.selectedClient);
    }

    if (availableDraft.cartItems && availableDraft.cartItems.length > 0) {
      clearWholesaleCart();
      availableDraft.cartItems.forEach(item => {
        addToWholesaleCart(item.product, item.quantity);
        if (item.discountPercent > 0) {
          updateWholesaleDiscount(item.product.id, item.discountPercent);
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
      description: 'Your previous wholesale work session has been restored.',
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

  // Dynamic Category List from real products + standard suits/fabrics
  const categories = useMemo(() => {
    const base = ['All fabrics', 'Lawn', 'Cotton', 'Khaddar', 'Wash & Wear', 'Silk & Chiffon'];
    const fromProds = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const merged = Array.from(new Set([...base, ...fromProds]));
    return merged;
  }, [products]);

  // Product Filter & Sorting (Real Data)
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = products.filter(p => {
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.wholesaleBarcode.includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === 'All fabrics' ||
        selectedCategory === 'All' ||
        p.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesQuery && matchesCategory;
    });

    if (sortOption === 'priceAsc') {
      list.sort((a, b) => a.wholesalePrice - b.wholesalePrice);
    } else if (sortOption === 'priceDesc') {
      list.sort((a, b) => b.wholesalePrice - a.wholesalePrice);
    } else if (sortOption === 'recent') {
      list.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } else {
      // In stock first
      list.sort((a, b) => (b.stock > 0 ? 1 : 0) - (a.stock > 0 ? 1 : 0));
    }

    return list;
  }, [products, searchQuery, selectedCategory, sortOption]);

  // Paginated list showing 9 products initially, +9 on each "Load more" click
  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  // Total metres / units in cart
  const totalCartMetres = useMemo(() => {
    return wholesaleCart.reduce((acc, item) => acc + item.quantity, 0);
  }, [wholesaleCart]);

  // Dynamic tax calculation: only when taxRate is set in stock/products or store settings
  const { wholesaleTaxAmount, wholesaleTaxRate } = useMemo(() => {
    const storeTaxRate = storageService.getSettings()?.defaultTaxRate || 0;
    let taxSum = 0;
    let taxableBase = 0;
    wholesaleCart.forEach(item => {
      const rate =
        item.product.taxRate !== undefined && item.product.taxRate !== null && item.product.taxRate > 0
          ? item.product.taxRate
          : storeTaxRate;
      if (rate > 0) {
        taxSum += (item.lineTotal * rate) / 100;
        taxableBase += item.lineTotal;
      }
    });
    const avgRate = taxableBase > 0 ? Math.round((taxSum / taxableBase) * 100) : storeTaxRate;
    return {
      wholesaleTaxAmount: Math.round(taxSum),
      wholesaleTaxRate: avgRate,
    };
  }, [wholesaleCart]);

  const finalWholesaleGrandTotal = wholesaleSubtotal - wholesaleDiscountTotal + wholesaleTaxAmount;

  // Barcode Scanner Handler
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

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
        addToWholesaleCart(matched);
        barcodeScannerService.playSuccessBeep();
        toast({
          title: `Added: ${matched.name}`,
          description: `Price: PKR ${matched.wholesalePrice.toLocaleString()}`,
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
    if (!customerName.trim() && !selectedCustomer) {
      toast({
        title: 'Customer Name Required',
        description: 'Please enter a Customer Name or select a Wholesale Client.',
        type: 'error',
      });
      return;
    }

    setCashReceived(Math.round(finalWholesaleGrandTotal));
    setAmountPaidNow(paymentMethod === 'Credit/Khata' ? 0 : Math.round(finalWholesaleGrandTotal));
    setIsBankPaymentConfirmed(false);
    setCardPaymentState('idle');
    setCardTransactionId(undefined);
    setIsCheckoutOpen(true);
  };

  // Trigger Card Payment
  const handleStartCardPayment = async () => {
    const isEnabled = Boolean(storageService.getSettings().wholesaleCardTerminal?.enabled);
    if (!isEnabled) {
      toast({
        title: 'Card Terminal Access Disabled',
        description: 'Wholesale Card Terminal is disabled in Store Settings.',
        type: 'error',
      });
      return;
    }

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

  // Complete Wholesale Sale & Save Invoice
  const handleCompleteWholesaleSale = () => {
    if (!currentStaff) return;
    if (!customerName.trim() && !selectedCustomer) return;

    if (paymentMethod === 'Cash') {
      if (Math.round(cashReceived) < Math.round(finalWholesaleGrandTotal)) {
        toast({
          title: 'Insufficient Cash Tendered',
          description: `Received PKR ${cashReceived.toLocaleString()} is less than total payable PKR ${finalWholesaleGrandTotal.toLocaleString()}.`,
          type: 'error',
        });
        return;
      }
    } else if (paymentMethod === 'Card') {
      const isEnabled = Boolean(storageService.getSettings().wholesaleCardTerminal?.enabled);
      if (!isEnabled) {
        toast({
          title: 'Card Payment Blocked',
          description: 'Wholesale Card Terminal is disabled in Store Settings.',
          type: 'error',
        });
        return;
      }

      if (cardPaymentState !== 'authorized' || !cardTransactionId) {
        toast({
          title: 'Card Payment Incomplete',
          description: 'Please start card terminal payment and wait for approval before finalizing.',
          type: 'error',
        });
        return;
      }
    } else if (paymentMethod === 'Bank Transfer') {
      if (!isBankPaymentConfirmed || !selectedBank) {
        toast({
          title: 'Payment Verification Required',
          description: 'Please select a bank account and confirm the transfer slip received.',
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

    const effectiveCustomerName = customerName.trim() || selectedCustomer?.name || 'Walk-in Wholesale Customer';
    const effectivePhone = selectedCustomer?.phone || '';

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
      amountReceived: paymentMethod === 'Credit/Khata' ? 0 : paymentMethod === 'Cash' ? cashReceived : finalWholesaleGrandTotal,
      discountTotal: wholesaleDiscountTotal,
      taxTotal: wholesaleTaxAmount,
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
    const nextInv = salesService.peekNextInvoiceNumber('Wholesale');
    setNextInvoiceNumber(nextInv ? `#${nextInv}` : '#WB-026184');

    toast({
      title: 'Wholesale Invoice Finalized',
      description: `Invoice #${bill.invoiceNumber} recorded successfully.`,
      type: 'success',
    });
  };

  const calculatedChange = Math.max(0, cashReceived - finalWholesaleGrandTotal);
  const isCashInsufficient = paymentMethod === 'Cash' && cashReceived < finalWholesaleGrandTotal;

  return (
    <ProtectedRoute permission="pos_wholesale">
      <AppShell>
        <div className="space-y-4 max-w-[1700px] mx-auto select-none pb-12">
          {/* ============================================================== */}
          {/* 1. TOP HEADER / NAVBAR (Exact sequence matching Retail POS) */}
          {/* ============================================================== */}
          <div className="bg-white rounded-2xl border border-[#DCE3E0] px-4 py-2.5 shadow-2xs flex items-center justify-between gap-4 flex-wrap xl:flex-nowrap">
            {/* Left: Logo & Title + Metadata */}
            <div className="flex items-center gap-6 flex-wrap sm:flex-nowrap">
              {/* Logo & Title */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-[#197A5A] flex items-center justify-center text-white shrink-0 shadow-2xs">
                  <Scan className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-[#17211D] leading-none">
                    Wholesale POS
                  </h1>
                  <p className="text-[11px] text-[#66726D] mt-0.5">
                    Main Store Register
                  </p>
                </div>
              </div>

              {/* Metadata Columns on Same Line */}
              <div className="flex items-center gap-6 text-left pl-4 sm:border-l sm:border-[#DCE3E0]">
                <div>
                  <span className="text-[9px] font-bold text-[#8A9590] uppercase tracking-wider block">
                    INVOICE
                  </span>
                  <span className="text-xs font-bold text-[#17211D] font-mono">
                    {nextInvoiceNumber}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-[#8A9590] uppercase tracking-wider block">
                    CASHIER
                  </span>
                  <span className="text-xs font-bold text-[#17211D]">
                    {currentStaff?.name || 'Staff'}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-[#8A9590] uppercase tracking-wider block">
                    COUNTER
                  </span>
                  <span className="text-xs font-bold text-[#17211D]">
                    {currentStaff?.counter || 'Counter 03'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Shortcuts -> Search Past Bills -> Hardware Dot -> Time */}
            <div className="flex items-center gap-3 shrink-0 ml-auto">
              {/* Search Past Bills/Returns Button */}
              <button
                type="button"
                onClick={() => setIsBillSearchOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCE3E0] bg-white hover:bg-[#F0F4F2] text-xs font-semibold text-[#17211D] transition-colors shadow-2xs cursor-pointer"
                title="Search past bills by customer or invoice (F3)"
              >
                <FileText className="w-3.5 h-3.5 text-[#66726D]" />
                <span>Search Bills</span>
              </button>

              {/* Shortcuts Button */}
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCE3E0] bg-white hover:bg-[#F0F4F2] text-xs font-semibold text-[#17211D] transition-colors shadow-2xs cursor-pointer"
                title="View Keyboard Shortcuts"
              >
                <Keyboard className="w-3.5 h-3.5 text-[#66726D]" />
                <span>Shortcuts</span>
              </button>

              {/* Hardware Status Popover Button */}
              <WholesaleHardwareStatus />

              {/* Clock & Status */}
              <div className="text-right pl-3 border-l border-[#DCE3E0]">
                <div className="font-bold text-xs text-[#17211D] font-mono leading-tight">
                  {currentTime || '09:02 PM'}
                </div>
                <div className="text-[10px] text-[#66726D] flex items-center justify-end gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16835B] animate-pulse" />
                  <span>Online · Scanner ready</span>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 2. WORKFLOW STEPPER RIBBON */}
          {/* ============================================================== */}
          <div className="bg-[#DCEDE6] rounded-xl px-4 py-2.5 flex items-center justify-between text-xs overflow-x-auto shadow-2xs border border-[#C7D2CD]/60 select-none">
            {/* Step 1: Customer */}
            <div className={`flex items-center gap-1.5 shrink-0 ${customerName.trim() ? 'font-bold text-[#125E45]' : 'text-[#66726D] font-medium'}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${customerName.trim() ? 'bg-[#125E45] text-white' : 'border border-[#8A9590]'}`}>
                {customerName.trim() ? '✓' : '1'}
              </span>
              <span>Customer</span>
              <span className="text-[#8A9590] ml-2 font-normal">&gt;</span>
            </div>

            {/* Step 2: Client */}
            <div className={`flex items-center gap-1.5 shrink-0 ${selectedCustomer ? 'font-bold text-[#125E45]' : 'text-[#66726D] font-medium'}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${selectedCustomer ? 'bg-[#125E45] text-white' : 'border border-[#8A9590]'}`}>
                {selectedCustomer ? '✓' : '2'}
              </span>
              <span>Client</span>
              <span className="text-[#8A9590] ml-2 font-normal">&gt;</span>
            </div>

            {/* Step 3: Scan/Search */}
            <div className={`flex items-center gap-1.5 shrink-0 ${wholesaleCart.length > 0 ? 'font-bold text-[#125E45]' : 'text-[#66726D] font-medium'}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${wholesaleCart.length > 0 ? 'bg-[#125E45] text-white' : 'border border-[#8A9590]'}`}>
                3
              </span>
              <span>Scan/Search</span>
              <span className="text-[#8A9590] ml-2 font-normal">&gt;</span>
            </div>

            {/* Step 4: Bulk Quantity */}
            <div className={`flex items-center gap-1.5 shrink-0 ${wholesaleCart.length > 0 ? 'font-bold text-[#125E45]' : 'text-[#66726D] font-medium'}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${wholesaleCart.length > 0 ? 'bg-[#125E45] text-white' : 'border border-[#8A9590]'}`}>
                4
              </span>
              <span>Bulk Quantity</span>
              <span className="text-[#8A9590] ml-2 font-normal">&gt;</span>
            </div>

            {/* Step 5: Pricing */}
            <div className="flex items-center gap-1.5 text-[#66726D] font-medium shrink-0">
              <span className="w-4 h-4 rounded-full border border-[#8A9590] flex items-center justify-center text-[10px]">
                5
              </span>
              <span>Pricing</span>
              <span className="text-[#8A9590] ml-2 font-normal">&gt;</span>
            </div>

            {/* Step 6: Invoice */}
            <div className="flex items-center gap-1.5 text-[#66726D] font-medium shrink-0">
              <span className="w-4 h-4 rounded-full border border-[#8A9590] flex items-center justify-center text-[10px]">
                6
              </span>
              <span>Invoice</span>
              <span className="text-[#8A9590] ml-2 font-normal">&gt;</span>
            </div>

            {/* Step 7: Checkout */}
            <div className="flex items-center gap-1.5 text-[#66726D] font-medium shrink-0">
              <span className="w-4 h-4 rounded-full border border-[#8A9590] flex items-center justify-center text-[10px]">
                7
              </span>
              <span>Checkout</span>
            </div>
          </div>

          {/* DRAFT NOTIFICATION BANNER (ONLY shown when there were real items saved) */}
          {availableDraft && availableDraft.cartItems && availableDraft.cartItems.length > 0 && (
            <div className="p-3 rounded-2xl bg-[#F7EEDC] border border-[#9A6A16]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#9A6A16] text-white flex items-center justify-center font-bold shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#17211D] flex items-center gap-2">
                    <span>Unfinished Wholesale Work Session Detected</span>
                    <span className="text-[10px] bg-[#9A6A16]/20 text-[#9A6A16] px-1.5 py-0.2 rounded font-mono font-bold">
                      {new Date(availableDraft.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#66726D]">
                    {availableDraft.cartItems.length} item(s) • Total: Rs {availableDraft.grandTotal?.toLocaleString() || 0}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="px-2.5 py-1 text-[#66726D] hover:text-[#C23D45] font-semibold transition-colors cursor-pointer"
                >
                  Discard Draft
                </button>
                <button
                  type="button"
                  onClick={handleResumeDraft}
                  className="px-3 py-1 bg-[#125E45] hover:bg-[#197A5A] text-white font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Resume Work</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 3. MAIN TWO-COLUMN BODY */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* ------------------------------------------------------------ */}
            {/* LEFT COLUMN: Customer Card + Barcode/Search + Catalog */}
            {/* ------------------------------------------------------------ */}
            <div className="lg:col-span-8 space-y-4">
              {/* CUSTOMER & WHOLESALE ACCOUNT BOX */}
              <div className="bg-white rounded-2xl border border-[#DCE3E0] p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#17211D]">
                    Customer & wholesale account
                  </h3>
                  {(customerName.trim() || selectedCustomer) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerName('');
                        setSelectedCustomer(null);
                      }}
                      className="text-xs font-semibold text-[#125E45] hover:text-[#197A5A] hover:underline cursor-pointer"
                    >
                      Change account
                    </button>
                  )}
                </div>

                {/* Two dropdown fields: Customer Name & Wholesale Client */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <WholesaleCustomerInput
                    value={customerName}
                    onChange={(name, cust) => {
                      setCustomerName(name);
                      if (cust && (cust.type === 'Wholesale' || cust.type === 'Khata') && !selectedCustomer) {
                        setSelectedCustomer(cust);
                      }
                    }}
                  />

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
              </div>

              {/* BARCODE SCANNER INPUT + SCAN BUTTON */}
              <div className="flex items-center gap-3">
                <form
                  onSubmit={handleBarcodeSubmit}
                  className="flex-1 flex items-center justify-between border-2 border-[#197A5A] rounded-xl bg-white px-3.5 py-2.5 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 flex-1 mr-2">
                    <BarcodeIcon className="w-4 h-4 text-[#66726D] shrink-0" />
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      placeholder="Scan or enter barcode / SKU"
                      value={barcodeInput}
                      onChange={e => setBarcodeInput(e.target.value)}
                      className="w-full text-xs font-mono text-[#17211D] placeholder:text-[#8A9590] bg-transparent focus:outline-none"
                    />
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-[#F0F4F2] text-[10px] text-[#8A9590] font-mono border border-[#DCE3E0]">
                    F1
                  </span>
                </form>

                <button
                  type="button"
                  onClick={handleBarcodeSubmit}
                  className="bg-[#125E45] hover:bg-[#197A5A] text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors shadow-2xs cursor-pointer h-[42px]"
                >
                  <Scan className="w-4 h-4" />
                  <span>Scan</span>
                </button>
              </div>

              {/* SEARCH FABRIC NAME, SKU OR TYPE */}
              <div className="flex items-center justify-between border border-[#DCE3E0] rounded-xl bg-white px-3.5 py-2.5 shadow-2xs">
                <div className="flex items-center gap-2.5 flex-1 mr-2">
                  <Search className="w-4 h-4 text-[#8A9590] shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search fabric name, SKU or type"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full text-xs font-medium text-[#17211D] placeholder:text-[#8A9590] bg-transparent focus:outline-none"
                  />
                </div>
                <span className="px-1.5 py-0.5 rounded bg-[#F0F4F2] text-[10px] text-[#8A9590] font-mono border border-[#DCE3E0]">
                  F2
                </span>
              </div>

              {/* CATEGORY FILTER PILLS */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
                {categories.map(cat => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`whitespace-nowrap px-3.5 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#125E45] text-white shadow-2xs'
                          : 'bg-white border border-[#DCE3E0] text-[#17211D] hover:bg-[#F0F4F2]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* PRODUCT CATALOG HEADER (Count + Sorting Dropdown) */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <h2 className="text-base font-bold text-[#17211D]">Product catalog</h2>
                  <p className="text-xs text-[#66726D]">
                    {filteredProducts.length} products · {displayedProducts.length} shown · Sold by metre
                  </p>
                </div>

                <div className="relative">
                  <select
                    value={sortOption}
                    onChange={e => setSortOption(e.target.value as any)}
                    className="appearance-none border border-[#DCE3E0] rounded-xl bg-white pl-3 pr-7 py-1 text-xs text-[#17211D] font-medium shadow-2xs focus:outline-none cursor-pointer"
                  >
                    <option value="inStock">In stock first</option>
                    <option value="recent">Recent added first</option>
                    <option value="priceAsc">Price: Low to High</option>
                    <option value="priceDesc">Price: High to Low</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#8A9590] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* PRODUCT CARDS GRID (3 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {displayedProducts.map(prod => {
                  const isOutOfStock = prod.stock <= 0;
                  const seasonTag = prod.seasonCategory
                    ? `${prod.seasonCategory} '26`
                    : prod.subcategory || 'Summer \'26';

                  const inCart = wholesaleCart.find(i => i.product.id === prod.id);

                  return (
                    <div
                      key={prod.id}
                      className={`bg-white rounded-2xl border border-[#DCE3E0] p-4 flex flex-col justify-between hover:border-[#197A5A]/60 transition-all shadow-2xs group ${
                        isOutOfStock ? 'opacity-60 bg-[#F6F8F7]' : ''
                      }`}
                    >
                      <div>
                        {/* Top: SKU & Available Stock */}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-[#8A9590]">{prod.sku}</span>
                          <span
                            className={`font-medium flex items-center gap-1 ${
                              isOutOfStock ? 'text-rose-600' : 'text-[#16835B]'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isOutOfStock ? 'bg-rose-500' : 'bg-[#16835B]'
                              }`}
                            />
                            {prod.stock > 0 ? `${prod.stock} available` : 'Out of stock'}
                          </span>
                        </div>

                        {/* Product Title */}
                        <h3 className="font-bold text-sm text-[#17211D] mt-2 line-clamp-1 leading-snug">
                          {prod.name}
                        </h3>

                        {/* Category & Width Specs */}
                        <p className="text-xs text-[#66726D] mt-0.5">
                          {prod.category} · {prod.subcategory || '58-inch width'}
                        </p>

                        {/* Collection Tag */}
                        <div className="mt-2.5">
                          <span className="bg-[#E9F3EF] text-[#125E45] text-[10px] font-semibold px-2 py-0.5 rounded-md inline-block">
                            {seasonTag}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Pricing & Add Button */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#DCE3E0]/60">
                        <div>
                          <div className="text-base font-bold text-[#17211D]">
                            Rs {prod.wholesalePrice.toLocaleString()}
                          </div>
                          {inCart && (
                            <div className="text-[10px] text-[#197A5A] font-semibold mt-0.5">
                              {inCart.quantity} {prod.unit || 'm'} added
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => !isOutOfStock && addToWholesaleCart(prod)}
                          disabled={isOutOfStock}
                          className="w-8 h-8 rounded-lg bg-[#125E45] hover:bg-[#197A5A] disabled:bg-slate-300 text-white flex items-center justify-center font-bold text-lg transition-colors shadow-2xs cursor-pointer active:scale-95 disabled:cursor-not-allowed"
                          title={`Add ${prod.name} to wholesale invoice`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* BOTTOM BAR: Show More Products Button */}
              {visibleCount < filteredProducts.length && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setVisibleCount(prev => prev + 9)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[#DCE3E0] bg-white hover:bg-[#F0F4F2] text-xs font-bold text-[#125E45] shadow-2xs transition-all cursor-pointer hover:border-[#125E45] active:scale-98"
                  >
                    <span>Show More Products</span>
                    <span className="text-[10px] text-[#66726D] font-normal">
                      (+9 of {filteredProducts.length - visibleCount} remaining)
                    </span>
                    <ChevronDown className="w-4 h-4 text-[#125E45]" />
                  </button>
                </div>
              )}
            </div>

            {/* ------------------------------------------------------------ */}
            {/* RIGHT COLUMN: Current Cart Panel (4 Columns) - STICKY FIXED IN VIEW */}
            {/* ------------------------------------------------------------ */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-[#DCE3E0] p-4 shadow-2xs flex flex-col justify-between sticky top-4 min-h-[580px] max-h-[calc(100vh-8.5rem)] overflow-hidden">
              <div className="shrink-0 space-y-3">
                {/* Cart Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#DCE3E0]/70">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base text-[#17211D]">Current Cart</h2>
                    <span className="bg-[#DCEDE6] text-[#125E45] text-xs font-semibold px-2 py-0.5 rounded-full">
                      {totalCartMetres} items
                    </span>
                  </div>

                  {wholesaleCart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Clear active wholesale invoice?')) {
                          clearWholesaleCart();
                        }
                      }}
                      className="p-1.5 rounded-lg border border-[#DCE3E0] text-[#8A9590] hover:text-[#17211D] hover:bg-[#F0F4F2] transition-colors cursor-pointer"
                      title="Clear Cart"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Customer Section */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#17211D] block">
                    Customer & Wholesale Client
                  </label>
                  <div className="border border-[#DCE3E0] rounded-xl px-3 py-2 text-xs text-[#17211D] bg-[#F0F4F2] flex items-center justify-between">
                    <span className="font-semibold truncate">
                      {selectedCustomer ? (selectedCustomer.businessName || selectedCustomer.name) : customerName.trim() || 'Walk-in Customer'}
                    </span>
                    {(selectedCustomer || customerName.trim()) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerName('');
                        }}
                        className="text-xs font-semibold text-[#125E45] hover:underline cursor-pointer ml-2 shrink-0"
                      >
                        Change
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-[#66726D] truncate">
                      {customerName.trim() ? customerName : 'No customer specified'} {selectedCustomer ? `· WC-${selectedCustomer.id.slice(0, 4)}` : ''}
                    </span>
                    <span className="text-[#8A9590] font-mono text-[10px]">
                      {nextInvoiceNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cart Items List - Internally Scrollable with comfortable height */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 my-2 min-h-[200px] max-h-[340px]">
                {wholesaleCart.length === 0 ? (
                  <div className="py-6 text-center text-[#8A9590] text-xs space-y-1.5">
                    <ShoppingBag className="w-7 h-7 text-[#C7D2CD] mx-auto" />
                    <p className="font-semibold text-[#17211D]">Cart is empty</p>
                    <p className="text-[11px] text-[#66726D]">
                      Scan fabric barcode or click [+] on a fabric to add to wholesale invoice.
                    </p>
                  </div>
                ) : (
                  wholesaleCart.map(item => {
                    const unitPrice = Math.max(
                      0,
                      item.price - (item.discountPerUnit || 0) - (item.extraDiscountRupees || 0)
                    );

                    return (
                      <div
                        key={item.product.id}
                        className="space-y-1.5 pb-3 border-b border-[#DCE3E0]/60 last:border-b-0"
                      >
                        {/* Line 1: Title + Red Trash Button */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-xs text-[#17211D] leading-tight">
                            {item.product.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeFromWholesaleCart(item.product.id)}
                            className="text-[#C23D45] hover:opacity-80 p-0.5 cursor-pointer shrink-0 transition-opacity"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Line 2: Spec / SKU & Unit Rate */}
                        <div className="flex items-center justify-between text-[11px] text-[#66726D]">
                          <span>
                            {item.product.sku} · {item.quantity} {item.product.unit || 'm'}
                          </span>
                          <span className="text-[#8A9590] text-[10px]">
                            Rs {unitPrice.toLocaleString()}
                          </span>
                        </div>

                        {/* Line 3: Quantity Controls + Line Total */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="border border-[#DCE3E0] rounded-lg flex items-center gap-2 px-2 py-0.5 text-xs text-[#17211D] bg-white">
                            <button
                              type="button"
                              onClick={() => updateWholesaleQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                              disabled={item.quantity <= 1}
                              className="text-[#66726D] hover:text-[#17211D] font-bold text-sm cursor-pointer disabled:opacity-30"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.product.stock}
                              value={item.quantity}
                              onChange={e => {
                                const raw = e.target.value;
                                if (raw === '') return;
                                const num = parseInt(raw, 10);
                                if (!isNaN(num)) {
                                  const clamped = Math.max(1, Math.min(item.product.stock, num));
                                  updateWholesaleQuantity(item.product.id, clamped);
                                }
                              }}
                              className="font-bold min-w-[20px] max-w-[42px] text-center text-xs text-[#17211D] bg-transparent focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateWholesaleQuantity(item.product.id, Math.min(item.product.stock, item.quantity + 1))}
                              disabled={item.quantity >= item.product.stock}
                              className="text-[#66726D] hover:text-[#17211D] font-bold text-sm cursor-pointer disabled:opacity-30"
                            >
                              +
                            </button>
                          </div>

                          <div className="font-bold text-sm text-[#17211D]">
                            Rs {item.lineTotal.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Financial Totals & Checkout Button (Compact Fixed matching Retail) */}
              <div className="shrink-0 pt-2 border-t border-[#DCE3E0] space-y-2 bg-white">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[#66726D]">
                    <span>Subtotal</span>
                    <span className="font-medium text-[#17211D]">
                      Rs {wholesaleSubtotal.toLocaleString()}
                    </span>
                  </div>

                  {wholesaleDiscountTotal > 0 && (
                    <div className="flex items-center justify-between text-[#66726D]">
                      <span>Discount</span>
                      <span className="font-semibold text-[#16835B]">
                        − Rs {wholesaleDiscountTotal.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {wholesaleTaxAmount > 0 && (
                    <div className="flex items-center justify-between text-[#66726D]">
                      <span>Tax ({wholesaleTaxRate}%)</span>
                      <span className="font-semibold text-[#17211D]">
                        Rs {wholesaleTaxAmount.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-[#DCE3E0] pt-1.5 mt-1 flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#17211D]">Total</span>
                    <span className="font-black text-xl text-[#17211D]">
                      Rs {finalWholesaleGrandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Primary Proceed to Tender Button (F8) */}
                <button
                  type="button"
                  onClick={handleOpenCheckout}
                  disabled={wholesaleCart.length === 0}
                  className="w-full bg-[#125E45] hover:bg-[#197A5A] disabled:bg-slate-300 text-white py-2.5 px-3.5 rounded-xl font-bold text-xs flex items-center justify-between transition-colors shadow-2xs cursor-pointer active:scale-[0.99] disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <span>Proceed to Tender</span>
                  </div>
                  <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono font-medium">
                    F8
                  </span>
                </button>

                <p className="text-[10px] text-[#8A9590] text-center">
                  Cash, card, bank transfer, or credit / khata settlement
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 4. MODALS & WORKFLOWS */}
        {/* ============================================================== */}

        {/* MODAL: Wholesale Settlement & Payment Modes */}
        <Modal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          title="Finalize Wholesale Tax Invoice"
          description="Confirm billing details, payment method, and settlement status."
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs select-none">
            {/* Net Due Header */}
            <div className="p-4 bg-[#F0F4F2] rounded-2xl border border-[#DCE3E0] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#66726D]">Net Amount Due:</span>
                <div className="text-2xl font-black text-[#17211D]">
                  Rs. {finalWholesaleGrandTotal.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <span className="bg-[#DCEDE6] text-[#125E45] text-xs font-semibold px-2.5 py-1 rounded-full inline-block mb-1">
                  Wholesale Counter
                </span>
                <div className="text-[11px] text-[#66726D]">
                  {selectedCustomer ? (selectedCustomer.businessName || selectedCustomer.name) : customerName.trim() || 'Walk-in Customer'}
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#17211D] block">
                Settlement Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Cash', 'Bank Transfer', 'Card', 'Credit/Khata'] as PaymentMethod[]).map(pm => {
                  const isCardDisabled = pm === 'Card' && !isWholesaleTerminalEnabled;
                  const isSelected = paymentMethod === pm;
                  return (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(pm);
                        if (isCardDisabled) {
                          toast({
                            title: 'Card Terminal Disabled',
                            description: 'Wholesale Card Terminal is disabled in Store Settings.',
                            type: 'warning',
                          });
                        }
                        if (pm === 'Credit/Khata') {
                          setAmountPaidNow(0);
                        } else {
                          setAmountPaidNow(Math.round(finalWholesaleGrandTotal));
                        }
                        if (pm === 'Cash') {
                          setCashReceived(Math.round(finalWholesaleGrandTotal));
                        }
                      }}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? isCardDisabled
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-[#DCEDE6] text-[#125E45] border-[#125E45]'
                          : 'bg-white border-[#DCE3E0] text-[#66726D] hover:bg-[#F0F4F2]'
                      }`}
                    >
                      {pm === 'Cash' && <Banknote className="w-4 h-4" />}
                      {pm === 'Bank Transfer' && <Building className="w-4 h-4" />}
                      {pm === 'Card' && <CreditCard className="w-4 h-4" />}
                      {pm === 'Credit/Khata' && <BookOpen className="w-4 h-4" />}
                      <span>{pm}</span>
                      {isCardDisabled && (
                        <span className="text-[9px] font-normal text-rose-600">
                          (Disabled in Settings)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CASH WORKFLOW & CASH DRAWER INTEGRATION */}
            {paymentMethod === 'Cash' && (
              <div className="p-4 bg-[#F0F4F2] rounded-2xl border border-[#DCE3E0] space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#17211D]">Cash Received</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter cash received"
                    value={cashReceived || ''}
                    onChange={e => setCashReceived(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 text-sm font-bold text-[#17211D] border border-[#DCE3E0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#197A5A] placeholder:text-[#8A9590] bg-white"
                  />
                </div>

                {/* Change Due Indicator */}
                {cashReceived >= finalWholesaleGrandTotal && (
                  <div className="p-3 bg-[#DCEDE6] rounded-xl text-xs flex justify-between font-bold text-[#125E45]">
                    <span>Change Due Customer:</span>
                    <span className="text-sm font-black">
                      Rs. {calculatedChange.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* BANK TRANSFER DETAILS */}
            {paymentMethod === 'Bank Transfer' && (
              <div className="p-4 bg-[#F0F4F2] rounded-2xl border border-[#DCE3E0] space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#17211D]">Receiving Bank Account:</span>
                  <span className="text-[10px] text-[#8A9590]">
                    Select designated business bank
                  </span>
                </div>

                {bankAccounts.length === 0 ? (
                  <p className="text-xs text-[#C23D45]">
                    No bank accounts configured in Store Settings.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {bankAccounts.map(b => (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBank(b)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                          selectedBank?.id === b.id
                            ? 'border-[#125E45] bg-[#DCEDE6] text-[#125E45] font-bold'
                            : 'border-[#DCE3E0] bg-white text-[#17211D] hover:bg-[#F0F4F2]'
                        }`}
                      >
                        <div className="font-bold">{b.bankName}</div>
                        <div className="text-[10px] text-[#66726D] font-mono">{b.accountNumber}</div>
                        <div className="text-[10px] text-[#8A9590]">{b.accountTitle}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-[#DCE3E0] flex items-center justify-between">
                  <span className="text-xs text-[#66726D]">Transfer Slip Verified:</span>
                  <button
                    type="button"
                    onClick={() => setIsBankPaymentConfirmed(!isBankPaymentConfirmed)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isBankPaymentConfirmed
                        ? 'bg-[#125E45] text-white shadow-2xs'
                        : 'bg-white border border-[#DCE3E0] text-[#17211D] hover:bg-[#F0F4F2]'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isBankPaymentConfirmed ? 'Payment Confirmed' : 'Confirm Slip Received'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* CARD TERMINAL WORKFLOW */}
            {paymentMethod === 'Card' && (
              <div className="p-4 bg-[#F0F4F2] rounded-2xl border border-[#DCE3E0] space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#17211D]">Point-of-Sale Card Terminal:</span>
                  <span className="text-[10px] font-mono text-[#8A9590]">
                    Status: {cardPaymentState}
                  </span>
                </div>

                {cardStatusMessage && (
                  <p className="text-xs text-[#66726D] p-2.5 bg-white rounded-xl border border-[#DCE3E0]">
                    {cardStatusMessage}
                  </p>
                )}

                {cardPaymentState !== 'authorized' ? (
                  <button
                    type="button"
                    onClick={handleStartCardPayment}
                    disabled={!isWholesaleTerminalEnabled || cardPaymentState === 'processing' || cardPaymentState === 'waiting_card'}
                    className="w-full bg-[#125E45] hover:bg-[#197A5A] disabled:bg-slate-300 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer disabled:cursor-not-allowed"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{isWholesaleTerminalEnabled ? 'Start Card Terminal Payment' : 'Card Terminal Disabled in Settings'}</span>
                  </button>
                ) : (
                  <div className="p-3 bg-[#DCEDE6] border border-[#125E45]/30 rounded-xl text-[#125E45] font-bold flex items-center justify-between">
                    <span>Authorized (Ref: {cardTransactionId})</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </div>
            )}

            {/* CREDIT / KHATA LEDGER WORKFLOW */}
            {paymentMethod === 'Credit/Khata' && (
              <div className="p-4 bg-[#F7EEDC] rounded-2xl border border-[#9A6A16]/30 space-y-2">
                <div className="font-bold text-[#17211D] flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#9A6A16]" />
                  <span>Ledger Credit Charging</span>
                </div>
                <p className="text-[11px] text-[#66726D]">
                  Net invoice amount Rs. {wholesaleGrandTotal.toLocaleString()} will be charged directly to the account of{' '}
                  <strong>{selectedCustomer?.businessName || selectedCustomer?.name}</strong>.
                </p>
              </div>
            )}

            {/* Notes / PO Reference */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#17211D]">
                Client PO # / Vehicle Dispatch Builty Reference
              </label>
              <input
                type="text"
                placeholder="e.g. Dispatched via Bilal Cargo Builty # 4920"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-[#DCE3E0] rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCE3E0]">
              <Button variant="outline" size="md" onClick={() => setIsCheckoutOpen(false)}>
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleCompleteWholesaleSale}
                className="inline-flex items-center justify-center font-bold rounded-xl px-5 py-2.5 text-xs text-white bg-[#125E45] hover:bg-[#197A5A] active:scale-[0.98] transition-all shadow-2xs cursor-pointer gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Complete Sale & Save Invoice</span>
              </button>
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

        {/* MODAL: Keyboard Shortcuts */}
        <WholesaleKeyboardShortcutsModal
          isOpen={isShortcutsModalOpen}
          onClose={() => setIsShortcutsModalOpen(false)}
        />

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
