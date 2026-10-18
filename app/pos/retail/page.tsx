'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Modal } from '@/components/ui/Modal';
import { ThermalReceipt } from '@/components/print/ThermalReceipt';
import {
  Search,
  Barcode as BarcodeIcon,
  Trash2,
  Plus,
  CreditCard,
  Banknote,
  User,
  ShoppingBag,
  Keyboard,
  Clock,
  Scan,
  ChevronDown,
  UserCheck,
  Receipt,
  MoreHorizontal,
  Sparkles,
  Building2,
  CheckCircle2,
  Check,
  Copy,
  ExternalLink,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { productsService } from '@/services/productsService';
import { salesService } from '@/services/salesService';
import { storageService } from '@/services/storageService';
import { posSessionService, PosSessionDraft } from '@/services/posSessionService';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { Product, Bill, BankAccount, SplitPaymentDetail } from '@/types';
import { HardwareStatusBar } from '@/components/retail-pos/HardwareStatusBar';
import { CustomerBillSearchModal } from '@/components/retail-pos/CustomerBillSearchModal';
import { ReturnModal } from '@/components/retail-pos/ReturnModal';
import { ExchangeModal } from '@/components/retail-pos/ExchangeModal';
import { CashDrawerModal } from '@/components/retail-pos/CashDrawerModal';
import { CardTerminalModal } from '@/components/retail-pos/CardTerminalModal';
import { KeyboardShortcutsModal } from '@/components/retail-pos/KeyboardShortcutsModal';
import { barcodeScannerService } from '@/services/hardware/barcodeScannerService';
import { receiptPrinterService } from '@/services/hardware/receiptPrinterService';
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
    updateRetailExtraDiscount,
    clearRetailCart,
    restoreRetailCart,
    retailSubtotal,
    retailDiscountTotal,
    retailGrandTotal,
    syncWithLatestProducts,
  } = useCart();

  // Real Cloth / Suit Products from productsService
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOption, setSortOption] = useState<'inStock' | 'priceAsc' | 'priceDesc'>('inStock');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [visibleCount, setVisibleCount] = useState<number>(9);

  // Reset pagination count on search or filter change
  useEffect(() => {
    setVisibleCount(9);
  }, [selectedCategory, searchQuery, sortOption]);

  // Customer state
  const [customerName, setCustomerName] = useState('Walk-in customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Live Clock & Invoice
  const [currentTime, setCurrentTime] = useState('');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('RET-2026-001246');

  // Tender & Payment State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Bank Transfer' | 'Split'>('Cash');
  // Cash received state - empty by default so user enters manually or clicks quick cash
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('');

  // Bank Transfer Payment States
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [isBankSlipVerified, setIsBankSlipVerified] = useState(false);
  const [bankReference, setBankReference] = useState('');
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);

  // Split / Mixed Payment States
  const [splitMode, setSplitMode] = useState<'CashCard' | 'CashBank'>('CashCard');
  const [splitCashInput, setSplitCashInput] = useState<string>('');
  const [splitSecondaryInput, setSplitSecondaryInput] = useState<string>('');
  const [splitCardAuth, setSplitCardAuth] = useState<CardPaymentResponse | null>(null);
  const [splitManualCardRef, setSplitManualCardRef] = useState<string>('');
  const [splitBankSlipVerified, setSplitBankSlipVerified] = useState(false);
  const [splitCardVerified, setSplitCardVerified] = useState(false);
  const [splitReference, setSplitReference] = useState('');
  const [isSplitCardTerminalModalOpen, setIsSplitCardTerminalModalOpen] = useState(false);

  // Modals state
  const [completedBill, setCompletedBill] = useState<Bill | null>(null);
  const [selectedBillForAction, setSelectedBillForAction] = useState<Bill | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isSearchBillsOpen, setIsSearchBillsOpen] = useState(false);
  const [searchBillsMode, setSearchBillsMode] = useState<'customer' | 'invoice'>('customer');
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [isCashDrawerModalOpen, setIsCashDrawerModalOpen] = useState(false);
  const [isCardTerminalModalOpen, setIsCardTerminalModalOpen] = useState(false);
  const [isCardTerminalEnabled, setIsCardTerminalEnabled] = useState<boolean>(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Quick cash buttons
  const quickCashOptions = [500, 1000, 2000, 5000, 10000];

  // Work Session Resume State
  const [availableDraft, setAvailableDraft] = useState<PosSessionDraft | null>(null);
  const [hasCheckedDraft, setHasCheckedDraft] = useState(false);

  useEffect(() => {
    if (hasCheckedDraft) return;
    const timer = setTimeout(() => {
      const draft = posSessionService.getDraft();
      if (draft && draft.cartItems && draft.cartItems.length > 0) {
        setAvailableDraft(draft);
      }
      setHasCheckedDraft(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [hasCheckedDraft]);

  // Auto-save active retail draft
  useEffect(() => {
    if (!hasCheckedDraft) return;
    if (retailCart.length > 0) {
      posSessionService.saveDraft({
        cartItems: retailCart,
        customerName: customerName !== 'Walk-in customer' ? customerName : undefined,
        customerPhone: customerPhone || undefined,
        selectedCategory,
      });
    }
  }, [hasCheckedDraft, retailCart, customerName, customerPhone, selectedCategory]);

  const handleResumeDraft = () => {
    if (!availableDraft) return;
    if (availableDraft.customerName) {
      setCustomerName(availableDraft.customerName);
    }
    if (availableDraft.customerPhone) {
      setCustomerPhone(availableDraft.customerPhone);
    }
    if (availableDraft.selectedCategory) {
      setSelectedCategory(availableDraft.selectedCategory);
    }
    if (availableDraft.cartItems && availableDraft.cartItems.length > 0) {
      restoreRetailCart(availableDraft.cartItems);
    }
    setAvailableDraft(null);
    toast({
      title: 'Previous Work Resumed',
      description: 'Your previous retail work session has been restored.',
      type: 'success',
    });
  };

  const handleDiscardDraft = () => {
    posSessionService.clearDraft();
    setAvailableDraft(null);
    clearRetailCart();
    setCustomerName('Walk-in customer');
    setCustomerPhone('');
    toast({
      title: 'Draft Discarded',
      description: 'Previous unfinished session was cleared.',
      type: 'info',
    });
  };

  // Refresh Real Products & Next Invoice Number & Terminal Access
  const loadRealData = () => {
    const all = productsService.getAll();
    setProducts(all);
    setNextInvoiceNumber(salesService.peekNextInvoiceNumber('Retail'));
    const settings = storageService.getSettings();
    setIsCardTerminalEnabled(Boolean(settings.retailCardTerminal?.enabled));
    const banks = (settings.bankAccounts || []).filter(b => b.isActive !== false);
    setBankAccounts(banks);
    if (banks.length > 0) {
      setSelectedBank(prev => prev || banks[0]);
    }
    syncWithLatestProducts();
  };

  useEffect(() => {
    loadRealData();

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);

    window.addEventListener('focus', loadRealData);
    window.addEventListener('storage', loadRealData);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', loadRealData);
      window.removeEventListener('storage', loadRealData);
    };
  }, []);

  // Keyboard Shortcuts (F1, F2, F3, F4, F8)
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
        setSearchBillsMode('customer');
        setIsSearchBillsOpen(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setSearchBillsMode('invoice');
        setIsSearchBillsOpen(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleOpenCheckout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Calculate parsed cash tender amount
  const parsedCashReceived = useMemo(() => {
    const num = parseFloat(cashReceivedInput.trim());
    return isNaN(num) ? 0 : num;
  }, [cashReceivedInput]);

  const changeDue = useMemo(() => {
    return Math.max(0, parsedCashReceived - retailGrandTotal);
  }, [parsedCashReceived, retailGrandTotal]);

  const totalItemsCount = useMemo(() => {
    return retailCart.reduce((acc, item) => acc + item.quantity, 0);
  }, [retailCart]);

  // Dynamic Category List from real products + standard suits/fabrics
  const categories = useMemo(() => {
    const base = ['All', 'Lawn', 'Cotton', 'Khaddar', 'Wash & Wear', 'Unstitched', 'Thaan', 'Cut Piece', 'Silk & Chiffon'];
    const fromProds = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const merged = Array.from(new Set([...base, ...fromProds]));
    return merged;
  }, [products]);

  // Filter Real Products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategory !== 'All') {
      list = list.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q) ||
          (p.subcategory && p.subcategory.toLowerCase().includes(q))
      );
    }

    if (sortOption === 'priceAsc') {
      list.sort((a, b) => a.retailPrice - b.retailPrice);
    } else if (sortOption === 'priceDesc') {
      list.sort((a, b) => b.retailPrice - a.retailPrice);
    } else {
      // Recent added first (by createdAt or id or index)
      list.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return (b.id || '').localeCompare(a.id || '');
      });
    }

    return list;
  }, [products, selectedCategory, searchQuery, sortOption]);

  // Paginated list showing 9 products initially, +9 on each "Show More" click
  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  // Continuous Barcode Scanning Handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    const matched = productsService.getByBarcodeOrSku(query);

    if (matched) {
      if (matched.stock <= 0) {
        barcodeScannerService.playErrorBeep();
        toast({
          title: 'Out of Stock',
          description: `${matched.name} is currently out of stock.`,
          type: 'error',
        });
      } else {
        addToRetailCart(matched, 1);
        barcodeScannerService.playSuccessBeep();
      }
      setBarcodeInput('');
    } else {
      barcodeScannerService.playErrorBeep();
      toast({
        title: 'Barcode Not Found',
        description: `No fabric found matching barcode / SKU "${query}".`,
        type: 'error',
      });
      setBarcodeInput('');
    }
  };

  // Dynamic Tax Calculation: only shown when taxRate is set in stock/products or store settings
  const { retailTaxAmount, retailTaxRate } = useMemo(() => {
    const storeTaxRate = storageService.getSettings()?.defaultTaxRate || 0;
    let taxSum = 0;
    let taxableBase = 0;
    retailCart.forEach(item => {
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
      retailTaxAmount: Math.round(taxSum),
      retailTaxRate: avgRate,
    };
  }, [retailCart]);

  const finalRetailGrandTotal = retailSubtotal - retailDiscountTotal + retailTaxAmount;

  // Open Tender Modal
  const handleOpenCheckout = () => {
    if (retailCart.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Please scan or add at least one product before checkout.',
        type: 'warning',
      });
      return;
    }
    setCashReceivedInput('');
    setIsBankSlipVerified(false);
    setSplitBankSlipVerified(false);
    setSplitCardVerified(false);
    setSplitCardAuth(null);
    setSplitManualCardRef('');
    setBankReference('');
    setSplitReference('');

    // Setup initial 50/50 split amounts
    const half = Math.floor(finalRetailGrandTotal / 2);
    setSplitCashInput(String(half));
    setSplitSecondaryInput(String(finalRetailGrandTotal - half));

    setIsCheckoutOpen(true);
  };

  const handleSplitCashChange = (val: string) => {
    setSplitCashInput(val);
    const num = parseFloat(val) || 0;
    const remaining = Math.max(0, finalRetailGrandTotal - num);
    setSplitSecondaryInput(String(remaining));
  };

  const handleSplitSecondaryChange = (val: string) => {
    setSplitSecondaryInput(val);
    const num = parseFloat(val) || 0;
    const remaining = Math.max(0, finalRetailGrandTotal - num);
    setSplitCashInput(String(remaining));
  };

  const handleQuick5050Split = () => {
    const half = Math.floor(finalRetailGrandTotal / 2);
    setSplitCashInput(String(half));
    setSplitSecondaryInput(String(finalRetailGrandTotal - half));
  };

  const handleCopyAccount = (accNo: string, bankId: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(accNo);
      setCopiedBankId(bankId);
      setTimeout(() => setCopiedBankId(null), 2000);
      toast({
        title: 'Account Number Copied',
        description: `${accNo} copied to clipboard.`,
        type: 'info',
      });
    }
  };

  // Step: Click "Confirm Cash & Open Drawer"
  const handleConfirmCashAndOpenDrawer = () => {
    if (parsedCashReceived < finalRetailGrandTotal) {
      toast({
        title: 'Insufficient Cash',
        description: `Total due is Rs. ${finalRetailGrandTotal.toLocaleString()}. Received Rs. ${parsedCashReceived.toLocaleString()}.`,
        type: 'error',
      });
      return;
    }

    // Close tender modal and open Cash Drawer modal
    setIsCheckoutOpen(false);
    setIsCashDrawerModalOpen(true);
  };

  // Finalize Sale: Saves to salesService (writes to Retail Statement & Bill History)
  const handleFinalizeSale = (params?: {
    customMethod?: 'Cash' | 'Card' | 'Bank Transfer' | 'Split';
    cardAuth?: CardPaymentResponse;
    splitInfo?: SplitPaymentDetail;
    bankInfo?: Bill['bankDetails'];
    notes?: string;
  }) => {
    if (!currentStaff) return;

    const targetMethod = params?.customMethod || paymentMethod;

    // Strict validation: Block pure card bill submission if terminal disabled in Store Settings
    if (targetMethod === 'Card') {
      const isTerminalEnabled = Boolean(storageService.getSettings().retailCardTerminal?.enabled);
      if (!isTerminalEnabled) {
        toast({
          title: 'Card Payment Blocked',
          description: 'Retail Card Terminal is disabled in Store Settings. Bill cannot be submitted or created.',
          type: 'error',
        });
        return;
      }
    }

    const finalAmountReceived =
      targetMethod === 'Cash'
        ? parsedCashReceived || finalRetailGrandTotal
        : finalRetailGrandTotal;

    const finalBankDetails =
      targetMethod === 'Bank Transfer'
        ? (params?.bankInfo || (selectedBank ? {
            bankId: selectedBank.id,
            bankName: selectedBank.bankName,
            accountTitle: selectedBank.accountTitle,
            accountNumber: selectedBank.accountNumber,
            iban: selectedBank.iban,
            confirmedByStaffId: currentStaff.id,
            confirmedByStaffName: currentStaff.name,
            confirmedAt: new Date().toISOString(),
          } : undefined))
        : undefined;

    // Use salesService to complete sale so it logs to Retail Statements and Bill history
    const bill = salesService.completeSale({
      saleType: 'Retail',
      cartItems: retailCart,
      paymentMethod: targetMethod,
      amountReceived: finalAmountReceived,
      discountTotal: retailDiscountTotal,
      taxTotal: retailTaxAmount,
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      counter: currentStaff.counter,
      customerName: customerName.trim() === 'Walk-in customer' ? undefined : customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      cardTransactionId: params?.cardAuth?.transactionId,
      bankDetails: finalBankDetails,
      splitPayment: params?.splitInfo,
      notes: params?.notes,
    });

    setCompletedBill(bill);
    posSessionService.clearDraft();
    clearRetailCart();
    setCashReceivedInput('');
    setCustomerName('Walk-in customer');
    setCustomerPhone('');
    setIsBankSlipVerified(false);
    setSplitBankSlipVerified(false);
    setSplitCardVerified(false);
    setSplitCardAuth(null);
    setSplitManualCardRef('');
    setBankReference('');
    setSplitReference('');
    setIsCheckoutOpen(false);
    setIsCashDrawerModalOpen(false);
    setIsCardTerminalModalOpen(false);
    setIsSplitCardTerminalModalOpen(false);
    setIsReceiptModalOpen(true);

    // Refresh products stock & next invoice
    loadRealData();

    toast({
      title: 'Sale Completed & Logged',
      description: `Invoice ${bill.invoiceNumber} recorded in Retail Statement.`,
      type: 'success',
    });
  };

  const handleFinalizeBankSale = () => {
    if (!isBankSlipVerified) {
      toast({
        title: 'Slip Verification Required',
        description: 'Please confirm that the bank payment slip has been verified.',
        type: 'warning',
      });
      return;
    }
    handleFinalizeSale({
      customMethod: 'Bank Transfer',
      notes: bankReference.trim() ? `Bank Slip Ref: ${bankReference.trim()}` : undefined,
    });
  };

  const handleFinalizeSplitSale = () => {
    const cashAmt = parseFloat(splitCashInput) || 0;
    const secAmt = parseFloat(splitSecondaryInput) || 0;

    if (cashAmt + secAmt < finalRetailGrandTotal) {
      toast({
        title: 'Incomplete Payment',
        description: `Total split (Rs. ${(cashAmt + secAmt).toLocaleString()}) is less than total due (Rs. ${finalRetailGrandTotal.toLocaleString()}).`,
        type: 'error',
      });
      return;
    }

    if (splitMode === 'CashCard') {
      if (!splitCardVerified && !splitCardAuth && !splitManualCardRef.trim()) {
        toast({
          title: 'Card Payment Not Confirmed',
          description: 'Please authorize card terminal or enter card reference & confirm checkbox.',
          type: 'warning',
        });
        return;
      }

      handleFinalizeSale({
        customMethod: 'Split',
        splitInfo: {
          cashAmount: cashAmt,
          secondaryMethod: 'Card',
          secondaryAmount: secAmt,
          cardTransactionId: splitCardAuth?.transactionId || splitManualCardRef.trim() || undefined,
          slipReference: splitReference.trim() || undefined,
        },
        notes: `Split: Rs. ${cashAmt.toLocaleString()} Cash + Rs. ${secAmt.toLocaleString()} Card${splitManualCardRef ? ` (Ref: ${splitManualCardRef})` : ''}`,
      });
    } else {
      // Cash + Bank
      if (!splitBankSlipVerified) {
        toast({
          title: 'Transfer Slip Required',
          description: 'Please confirm that the bank transfer slip has been verified.',
          type: 'warning',
        });
        return;
      }

      const bnkDetails = selectedBank ? {
        bankId: selectedBank.id,
        bankName: selectedBank.bankName,
        accountTitle: selectedBank.accountTitle,
        accountNumber: selectedBank.accountNumber,
        iban: selectedBank.iban,
        confirmedByStaffId: currentStaff?.id || '',
        confirmedByStaffName: currentStaff?.name || '',
        confirmedAt: new Date().toISOString(),
      } : undefined;

      handleFinalizeSale({
        customMethod: 'Split',
        splitInfo: {
          cashAmount: cashAmt,
          secondaryMethod: 'Bank Transfer',
          secondaryAmount: secAmt,
          bankDetails: bnkDetails,
          slipReference: splitReference.trim() || undefined,
        },
        notes: `Split: Rs. ${cashAmt.toLocaleString()} Cash + Rs. ${secAmt.toLocaleString()} Bank (${selectedBank?.bankName || 'Account'})`,
      });
    }
  };

  return (
    <ProtectedRoute permission="pos_retail">
      <AppShell>
        <div className="space-y-4 max-w-[1700px] mx-auto select-none pb-12">
          {/* TOP NAVBAR / HEADER (Single Compact Row matching Image 2 with all elements from Image 1) */}
          <div className="bg-white rounded-2xl border border-[#DCE3E0] px-4 py-2.5 shadow-2xs flex items-center justify-between gap-4 flex-wrap xl:flex-nowrap">
            {/* Left Section: Logo + Title + Metadata (Invoice, Cashier, Counter) */}
            <div className="flex items-center gap-6 flex-wrap sm:flex-nowrap">
              {/* Logo & Title */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-[#197A5A] flex items-center justify-center text-white shrink-0 shadow-2xs">
                  <Scan className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-[#17211D] leading-none">
                    Retail POS
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
                    #{nextInvoiceNumber}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-[#8A9590] uppercase tracking-wider block">
                    CASHIER
                  </span>
                  <span className="text-xs font-bold text-[#17211D]">
                    {currentStaff?.name || 'Haji Abdul Rehman'}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-[#8A9590] uppercase tracking-wider block">
                    COUNTER
                  </span>
                  <span className="text-xs font-bold text-[#17211D]">
                    {currentStaff?.counter || 'Counter 01'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Section: Action Buttons + Hardware Dot + Clock & Status */}
            <div className="flex items-center gap-3 shrink-0 ml-auto">
              {/* Search Customer Button */}
              <button
                type="button"
                onClick={() => {
                  setSearchBillsMode('customer');
                  setIsSearchBillsOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCE3E0] bg-white hover:bg-[#F0F4F2] text-xs font-semibold text-[#17211D] transition-colors shadow-2xs cursor-pointer"
                title="Search past bills by customer name (F3)"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#66726D]" />
                <span>Search Customer</span>
              </button>

              {/* Search Invoice Button */}
              <button
                type="button"
                onClick={() => {
                  setSearchBillsMode('invoice');
                  setIsSearchBillsOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCE3E0] bg-white hover:bg-[#F0F4F2] text-xs font-semibold text-[#17211D] transition-colors shadow-2xs cursor-pointer"
                title="Search past bills by invoice number (F4)"
              >
                <Receipt className="w-3.5 h-3.5 text-[#66726D]" />
                <span>Search Invoice</span>
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

              {/* Hardware Status Popover Button (Green Dot) */}
              <HardwareStatusBar />

              {/* Clock & Status */}
              <div className="text-right pl-3 border-l border-[#DCE3E0]">
                <div className="font-bold text-xs text-[#17211D] font-mono leading-tight">
                  {currentTime}
                </div>
                <div className="text-[10px] text-[#66726D] flex items-center justify-end gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16835B] animate-pulse" />
                  <span>Online · Scanner ready</span>
                </div>
              </div>
            </div>
          </div>

          {/* WORKFLOW STEPPER RIBBON (Horizontal 6-Step Banner) */}
          <div className="bg-[#DCEDE6] rounded-xl px-4 py-2.5 flex items-center justify-between text-xs overflow-x-auto shadow-2xs border border-[#C7D2CD]/60">
            {/* Step 1: Scan (Active) */}
            <div className="flex items-center gap-1.5 font-bold text-[#125E45] shrink-0">
              <span className="w-4 h-4 rounded-full bg-[#125E45] text-white flex items-center justify-center text-[10px]">
                1
              </span>
              <span>Scan</span>
              <span className="text-[#8A9590] ml-2 font-normal">&gt;</span>
            </div>

            {/* Step 2: Search */}
            <div className="flex items-center gap-1.5 text-[#66726D] font-medium shrink-0">
              <span className="w-4 h-4 rounded-full border border-[#8A9590] flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Search</span>
              <span className="text-[#8A9590] ml-2 font-normal">&gt;</span>
            </div>

            {/* Step 3: Select */}
            <div className="flex items-center gap-1.5 text-[#66726D] font-medium shrink-0">
              <span className="w-4 h-4 rounded-full border border-[#8A9590] flex items-center justify-center text-[10px]">
                3
              </span>
              <span>Select</span>
              <span className="text-[#8A9590] ml-2 font-normal">&gt;</span>
            </div>

            {/* Step 4: Add to Cart */}
            <div className="flex items-center gap-1.5 text-[#66726D] font-medium shrink-0">
              <span className="w-4 h-4 rounded-full border border-[#8A9590] flex items-center justify-center text-[10px]">
                4
              </span>
              <span>Add to Cart</span>
              <span className="text-[#8A9590] ml-2 font-normal">&gt;</span>
            </div>

            {/* Step 5: Review */}
            <div className="flex items-center gap-1.5 text-[#66726D] font-medium shrink-0">
              <span className="w-4 h-4 rounded-full border border-[#8A9590] flex items-center justify-center text-[10px]">
                5
              </span>
              <span>Review</span>
              <span className="text-[#8A9590] ml-2 font-normal">&gt;</span>
            </div>

            {/* Step 6: Payment */}
            <div className="flex items-center gap-1.5 text-[#66726D] font-medium shrink-0">
              <span className="w-4 h-4 rounded-full border border-[#8A9590] flex items-center justify-center text-[10px]">
                6
              </span>
              <span>Payment</span>
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
                    <span>Unfinished Retail Work Session Detected</span>
                    <span className="text-[10px] bg-[#9A6A16]/20 text-[#9A6A16] px-1.5 py-0.2 rounded font-mono font-bold">
                      {new Date(availableDraft.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#66726D]">
                    {availableDraft.cartItems.length} item(s) in cart
                    {availableDraft.customerName ? ` • Customer: ${availableDraft.customerName}` : ''}
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

          {/* MAIN TWO-COLUMN BODY */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT COLUMN: Catalog, Search & Cards (8 Columns) */}
            <div className="lg:col-span-8 space-y-4">
              {/* Row 1: Barcode Input with Green Focus Border + Scan Button */}
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
                      placeholder="Scan or enter barcode"
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

              {/* Row 2: Text Search Input */}
              <div className="flex items-center justify-between border border-[#DCE3E0] rounded-xl bg-white px-3.5 py-2.5 shadow-2xs">
                <div className="flex items-center gap-2.5 flex-1 mr-2">
                  <Search className="w-4 h-4 text-[#8A9590] shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search fabric name, SKU, or category..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full text-xs font-medium text-[#17211D] placeholder:text-[#8A9590] bg-transparent focus:outline-none"
                  />
                </div>
                <span className="px-1.5 py-0.5 rounded bg-[#F0F4F2] text-[10px] text-[#8A9590] font-mono border border-[#DCE3E0]">
                  F2
                </span>
              </div>

              {/* Row 3: Category Filter Pills */}
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

              {/* Row 4: Product Catalog Header */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <h2 className="text-base font-bold text-[#17211D]">Product catalog</h2>
                  <p className="text-xs text-[#66726D]">
                    {displayedProducts.length} of {filteredProducts.length} products shown
                  </p>
                </div>

                <div className="relative">
                  <select
                    value={sortOption}
                    onChange={e => setSortOption(e.target.value as any)}
                    className="appearance-none border border-[#DCE3E0] rounded-xl bg-white pl-3 pr-7 py-1 text-xs text-[#17211D] font-medium shadow-2xs focus:outline-none cursor-pointer"
                  >
                    <option value="inStock">Recent Added First</option>
                    <option value="priceAsc">Price: Low to High</option>
                    <option value="priceDesc">Price: High to Low</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#8A9590] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Row 5: Real Products Grid (Cards using actual user suit/cloth data) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {displayedProducts.map(prod => {
                  const isOutOfStock = prod.stock <= 0;
                  const seasonTag = prod.seasonCategory
                    ? `${prod.seasonCategory} '26`
                    : prod.subcategory || 'Standard';

                  return (
                    <div
                      key={prod.id}
                      className={`bg-white rounded-2xl border border-[#DCE3E0] p-4 flex flex-col justify-between hover:border-[#197A5A]/60 transition-all shadow-2xs group ${
                        isOutOfStock ? 'opacity-60 bg-[#F6F8F7]' : ''
                      }`}
                    >
                      <div>
                        {/* SKU & Available Count */}
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

                        {/* Product Name */}
                        <h3 className="font-bold text-sm text-[#17211D] mt-2 line-clamp-1 leading-snug">
                          {prod.name}
                        </h3>

                        {/* Category Label */}
                        <p className="text-xs text-[#66726D] mt-0.5">{prod.category}</p>

                        {/* Season / Collection Tag */}
                        <div className="mt-2.5">
                          <span className="bg-[#E9F3EF] text-[#125E45] text-[10px] font-semibold px-2 py-0.5 rounded-md inline-block">
                            {seasonTag}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Price & Add Button */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#DCE3E0]/60">
                        <div className="text-base font-bold text-[#17211D]">
                          Rs {prod.retailPrice.toLocaleString()}
                        </div>

                        <button
                          type="button"
                          onClick={() => !isOutOfStock && addToRetailCart(prod, 1)}
                          disabled={isOutOfStock}
                          className="w-8 h-8 rounded-lg bg-[#125E45] hover:bg-[#197A5A] disabled:bg-slate-300 text-white flex items-center justify-center font-bold text-lg transition-colors shadow-2xs cursor-pointer active:scale-95 disabled:cursor-not-allowed"
                          title={`Add ${prod.name} to cart`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Show More Products Button (+9 per click) */}
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

              {/* Row 6: Alternate State Banner */}
              <div className="bg-white rounded-2xl border border-[#DCE3E0] p-4 flex items-center gap-3.5 shadow-2xs">
                <div className="w-9 h-9 rounded-full bg-[#E9F3EF] text-[#197A5A] flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#8A9590] uppercase tracking-wider block">
                    ALTERNATE STATE · NEW SALE
                  </span>
                  <h4 className="font-bold text-xs text-[#17211D]">
                    Your cart is ready for the first item
                  </h4>
                  <p className="text-xs text-[#66726D] mt-0.5">
                    Scan a barcode, search the catalog, or select a product to begin.
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Current Cart Panel (4 Columns) - COMFORTABLE FIXED IN VIEW */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-[#DCE3E0] p-4 shadow-2xs flex flex-col justify-between sticky top-4 min-h-[580px] max-h-[calc(100vh-8.5rem)] overflow-hidden">
              <div className="shrink-0 space-y-3">
                {/* Cart Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#DCE3E0]/70">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base text-[#17211D]">Current Cart</h2>
                    <span className="bg-[#DCEDE6] text-[#125E45] text-xs font-semibold px-2 py-0.5 rounded-full">
                      {totalItemsCount} items
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (retailCart.length > 0 && confirm('Clear active cart?')) {
                        clearRetailCart();
                      }
                    }}
                    className="p-1.5 rounded-lg border border-[#DCE3E0] text-[#8A9590] hover:text-[#17211D] hover:bg-[#F0F4F2] transition-colors cursor-pointer"
                    title="Cart Options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* Customer Section */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#17211D] block">
                      Customer
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="bg-[#DCEDE6] text-[#125E45] text-[11px] font-semibold px-2 py-0.5 rounded-full">
                        Active retail account
                      </span>
                      {customerName && customerName !== 'Walk-in customer' && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerName('Walk-in customer');
                            setCustomerPhone('');
                          }}
                          className="text-[11px] font-semibold text-[#C23D45] hover:underline cursor-pointer ml-1"
                        >
                          Switch Customer
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-[#8A9590] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search customer by name or phone"
                      value={customerName === 'Walk-in customer' ? '' : customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full border border-[#DCE3E0] rounded-xl pl-9 pr-3 py-2 text-xs text-[#17211D] placeholder:text-[#8A9590] bg-white focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-[#66726D]">{customerName || 'Walk-in customer'}</span>
                    <button
                      type="button"
                      onClick={() => setIsCustomerModalOpen(true)}
                      className="font-semibold text-[#125E45] hover:underline cursor-pointer"
                    >
                      + Add details
                    </button>
                  </div>
                </div>
              </div>

              {/* Cart Items List - Internally Scrollable with comfortable height */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 my-2 min-h-[200px] max-h-[340px]">
                  {retailCart.length === 0 ? (
                    <div className="py-6 text-center text-[#8A9590] text-xs space-y-1.5">
                      <ShoppingBag className="w-7 h-7 text-[#C7D2CD] mx-auto" />
                      <p className="font-semibold text-[#17211D]">Cart is empty</p>
                      <p className="text-[11px] text-[#66726D]">
                        Scan fabric barcode or click [+] on a suit to add to invoice.
                      </p>
                    </div>
                  ) : (
                    retailCart.map(item => (
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
                            onClick={() => removeFromRetailCart(item.product.id)}
                            className="text-[#C23D45] hover:opacity-80 p-0.5 cursor-pointer shrink-0 transition-opacity"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Line 2: Spec / SKU & Unit Rate */}
                        <div className="flex items-center justify-between text-[11px] text-[#66726D]">
                          <span>
                            {item.product.sku} · {item.quantity} {item.product.unit}
                          </span>
                          <span className="text-[#8A9590] text-[10px]">
                            Rs {item.price.toLocaleString()}
                          </span>
                        </div>

                        {/* Line 3: Quantity Controls + Rs Discount Input + Line Total */}
                        <div className="flex items-center justify-between pt-1 gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="border border-[#DCE3E0] rounded-lg flex items-center gap-2 px-2.5 h-7 text-xs text-[#17211D] bg-white shadow-2xs">
                              <button
                                type="button"
                                onClick={() => updateRetailQuantity(item.product.id, item.quantity - 1)}
                                className="text-[#66726D] hover:text-[#17211D] font-bold text-sm cursor-pointer px-0.5"
                              >
                                −
                              </button>
                              <span className="font-bold min-w-[14px] text-center font-mono">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateRetailQuantity(item.product.id, item.quantity + 1)}
                                className="text-[#66726D] hover:text-[#17211D] font-bold text-sm cursor-pointer px-0.5"
                              >
                                +
                              </button>
                            </div>

                            <div className="border border-[#DCE3E0] rounded-lg flex items-center overflow-hidden bg-white h-7 focus-within:border-[#197A5A] focus-within:ring-1 focus-within:ring-[#197A5A]/30 transition-all shadow-2xs" title="Discount in Rupees per unit">
                              <span className="bg-[#F0F4F2] text-[#66726D] text-[10px] font-bold px-2 h-full flex items-center border-r border-[#DCE3E0] select-none tracking-tight">
                                Disc Rs
                              </span>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={item.extraDiscountRupees || ''}
                                onChange={e => {
                                  const val = parseFloat(e.target.value) || 0;
                                  updateRetailExtraDiscount(item.product.id, val);
                                }}
                                className="w-14 px-2 text-xs font-bold font-mono text-center text-[#16835B] bg-transparent focus:outline-none placeholder:text-[#8A9590] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          </div>

                          <div className="font-bold text-sm text-[#17211D] shrink-0">
                            Rs {item.lineTotal.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              {/* Bottom Financial Totals & Checkout Button (Compact Fixed) */}
              <div className="shrink-0 pt-2 border-t border-[#DCE3E0] space-y-2 bg-white">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[#66726D]">
                    <span>Subtotal</span>
                    <span className="font-medium text-[#17211D]">
                      Rs {retailSubtotal.toLocaleString()}
                    </span>
                  </div>

                  {retailDiscountTotal > 0 && (
                    <div className="flex items-center justify-between text-[#66726D]">
                      <span>Discount</span>
                      <span className="font-semibold text-[#16835B]">
                        − Rs {retailDiscountTotal.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Dynamic Tax: Only shown when taxRate > 0 or retailTaxAmount > 0 */}
                  {retailTaxAmount > 0 && (
                    <div className="flex items-center justify-between text-[#66726D]">
                      <span>Tax ({retailTaxRate}%)</span>
                      <span className="font-semibold text-[#17211D]">
                        Rs {retailTaxAmount.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-[#DCE3E0] pt-1.5 mt-1 flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#17211D]">Total</span>
                    <span className="font-black text-xl text-[#17211D]">
                      Rs {finalRetailGrandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Primary Proceed to Tender Button (F8) */}
                <button
                  type="button"
                  onClick={handleOpenCheckout}
                  className="w-full bg-[#125E45] hover:bg-[#197A5A] text-white py-2.5 px-3.5 rounded-xl font-bold text-xs flex items-center justify-between transition-colors shadow-2xs cursor-pointer active:scale-[0.99]"
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
                  Cash, card, bank transfer, or split payment
                </p>
              </div>
            </div>
          </div>

          {/* CHECKOUT / TENDER MODAL */}
          <Modal
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            title="Complete Retail Sale Tender"
            maxWidth="lg"
          >
            <div className="space-y-4 select-none">
              {/* Net Due Header */}
              <div className="p-4 bg-[#F0F4F2] rounded-2xl border border-[#DCE3E0] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#66726D]">Net Amount Due:</span>
                  <div className="text-2xl font-black text-[#17211D]">
                    Rs. {finalRetailGrandTotal.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <span className="bg-[#DCEDE6] text-[#125E45] text-xs font-semibold px-2.5 py-1 rounded-full">
                    Retail Counter • {totalItemsCount} items
                  </span>
                </div>
              </div>

              {/* Payment Method 4-Tab Switcher */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#17211D]">Select Payment Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* 1. Cash Tender */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cash')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === 'Cash'
                        ? 'bg-[#DCEDE6] text-[#125E45] border-[#125E45] shadow-2xs ring-1 ring-[#125E45]'
                        : 'bg-white border-[#DCE3E0] text-[#66726D] hover:bg-[#F0F4F2]'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Cash Tender</span>
                    <span className="text-[10px] font-normal text-[#66726D]">Drawer Tender</span>
                  </button>

                  {/* 2. Card / POS Swipe */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('Card');
                      if (!isCardTerminalEnabled) {
                        toast({
                          title: 'Card Terminal Disabled',
                          description: 'Retail Card Terminal is disabled in Store Settings.',
                          type: 'warning',
                        });
                      }
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === 'Card'
                        ? isCardTerminalEnabled
                          ? 'bg-[#DCEDE6] text-[#125E45] border-[#125E45] shadow-2xs ring-1 ring-[#125E45]'
                          : 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-white border-[#DCE3E0] text-[#66726D] hover:bg-[#F0F4F2]'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Card Swipe</span>
                    <span className="text-[10px] font-normal">
                      {!isCardTerminalEnabled ? (
                        <span className="text-rose-600 font-semibold">(Disabled)</span>
                      ) : (
                        'POS Terminal'
                      )}
                    </span>
                  </button>

                  {/* 3. Bank / Account Transfer (Requested) */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Bank Transfer')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === 'Bank Transfer'
                        ? 'bg-[#DCEDE6] text-[#125E45] border-[#125E45] shadow-2xs ring-1 ring-[#125E45]'
                        : 'bg-white border-[#DCE3E0] text-[#66726D] hover:bg-[#F0F4F2]'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Bank / Account</span>
                    <span className="text-[10px] font-normal text-[#66726D]">Direct Transfer</span>
                  </button>

                  {/* 4. Split / Mixed Payment */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Split')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === 'Split'
                        ? 'bg-[#DCEDE6] text-[#125E45] border-[#125E45] shadow-2xs ring-1 ring-[#125E45]'
                        : 'bg-white border-[#DCE3E0] text-[#66726D] hover:bg-[#F0F4F2]'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Split / Mixed</span>
                    <span className="text-[10px] font-normal text-[#66726D]">Mixed Payment</span>
                  </button>
                </div>
              </div>

              {/* 1. CASH WORKFLOW & QUICK CASH */}
              {paymentMethod === 'Cash' && (
                <div className="space-y-3 p-4 bg-[#F8FAFA] rounded-2xl border border-[#DCE3E0]">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#17211D]">Cash Received from Customer</label>
                    <input
                      type="number"
                      placeholder="Enter cash received (e.g. 5000)"
                      value={cashReceivedInput}
                      onChange={e => setCashReceivedInput(e.target.value)}
                      className="w-full p-2.5 text-sm font-bold text-[#17211D] border border-[#DCE3E0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#197A5A] placeholder:text-[#8A9590] bg-white"
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div>
                    <label className="text-[11px] font-bold text-[#66726D] block mb-1.5">
                      Quick Cash Suggestions:
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {quickCashOptions.map(amount => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setCashReceivedInput(String(amount))}
                          className="py-1.5 rounded-lg border border-[#DCE3E0] bg-white hover:bg-[#DCEDE6] hover:text-[#125E45] hover:border-[#125E45] text-xs font-bold text-[#17211D] transition-colors cursor-pointer"
                        >
                          {amount.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Change Due Display */}
                  {parsedCashReceived >= finalRetailGrandTotal && (
                    <div className="p-3 bg-[#DCEDE6] rounded-xl text-xs flex justify-between font-bold text-[#125E45]">
                      <span>Change Due to Customer:</span>
                      <span className="text-sm font-black">
                        Rs. {changeDue.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 2. CARD TERMINAL WORKFLOW */}
              {paymentMethod === 'Card' && (
                <div className="space-y-3 p-4 bg-[#F8FAFA] rounded-2xl border border-[#DCE3E0]">
                  {!isCardTerminalEnabled ? (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
                      <div className="font-bold flex items-center gap-1.5 text-rose-900">
                        <span className="w-2 h-2 rounded-full bg-rose-600" />
                        <span>Card Terminal Disabled in Store Settings</span>
                      </div>
                      <p className="text-[11px] text-rose-700 leading-relaxed">
                        Retail Card Terminal is currently turned OFF in Admin Store Settings. Card payment cannot be authorized until enabled.
                      </p>
                      <Link
                        href="/settings"
                        target="_blank"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-900 underline hover:text-rose-950"
                      >
                        <span>Open Store Settings to Enable Card Terminal</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-[#DCEDE6] border border-[#125E45]/30 text-[#125E45] text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#125E45]" />
                        <span>Point-of-Sale Card Terminal Ready</span>
                      </div>
                      <p className="text-[11px] text-[#4F6359] leading-relaxed">
                        Click Authorize Card Terminal. Customer will be prompted on the POS terminal to tap, insert chip, or swipe card for Rs. {finalRetailGrandTotal.toLocaleString()}.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 3. DIRECT BANK / ACCOUNT TRANSFER WORKFLOW */}
              {paymentMethod === 'Bank Transfer' && (
                <div className="space-y-3 p-4 bg-[#F8FAFA] rounded-2xl border border-[#DCE3E0]">
                  {/* Instructions Banner */}
                  <div className="p-3 bg-[#DCEDE6]/60 rounded-xl border border-[#125E45]/20 flex items-start gap-2.5">
                    <Building2 className="w-4 h-4 text-[#125E45] shrink-0 mt-0.5" />
                    <div className="text-xs text-[#125E45]">
                      <div className="font-bold">Shop Receiving Bank Account Information:</div>
                      <div className="text-[11px] text-[#4F6359] leading-relaxed mt-0.5">
                        Provide the designated account number to the customer. Once the transfer is completed and the slip/receipt is presented, verify and complete the tender.
                      </div>
                    </div>
                  </div>

                  {/* Bank Accounts Grid */}
                  <div>
                    <label className="text-[11px] font-bold text-[#66726D] block mb-1.5">
                      Select Designated Shop Account:
                    </label>
                    {bankAccounts.length === 0 ? (
                      <p className="text-xs text-rose-600 font-semibold p-2 bg-rose-50 rounded-lg">
                        No bank accounts found in Store Settings.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {bankAccounts.map(b => {
                          const isSelected = selectedBank?.id === b.id;
                          return (
                            <div
                              key={b.id}
                              onClick={() => setSelectedBank(b)}
                              className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-[#125E45] bg-[#DCEDE6]/50 shadow-2xs ring-1 ring-[#125E45]'
                                  : 'border-[#DCE3E0] bg-white hover:bg-[#F0F4F2]'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-[#17211D]">{b.bankName}</span>
                                {isSelected && (
                                  <span className="w-2 h-2 rounded-full bg-[#125E45]" />
                                )}
                              </div>
                              <div className="text-[10px] text-[#66726D] mb-1.5 truncate">
                                Title: <strong className="text-[#17211D]">{b.accountTitle}</strong>
                              </div>

                              {/* Prominent Account Number with Copy Button */}
                              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-[#DCE3E0]">
                                <div>
                                  <span className="text-[9px] text-[#8A9590] block uppercase font-semibold">
                                    Account No
                                  </span>
                                  <span className="text-xs font-black font-mono text-[#17211D] tracking-wider select-all">
                                    {b.accountNumber}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleCopyAccount(b.accountNumber, b.id);
                                  }}
                                  className="px-2 py-1 bg-[#F6F8F7] hover:bg-[#DCEDE6] text-[#125E45] border border-[#DCE3E0] hover:border-[#125E45] rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  {copiedBankId === b.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-[#125E45]" />
                                      <span>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {b.iban && (
                                <div className="text-[9px] text-[#8A9590] font-mono mt-1 truncate">
                                  IBAN: {b.iban}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Optional Reference */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#66726D]">
                      Transfer Slip / Transaction ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TRX-904821 / Sender Name"
                      value={bankReference}
                      onChange={e => setBankReference(e.target.value)}
                      className="w-full p-2 text-xs text-[#17211D] border border-[#DCE3E0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#197A5A] bg-white placeholder:text-[#8A9590]"
                    />
                  </div>

                  {/* Mandatory Verification Checkbox */}
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                      isBankSlipVerified
                        ? 'bg-[#DCEDE6] border-[#125E45]'
                        : 'bg-white border-[#DCE3E0] hover:bg-[#F0F4F2]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isBankSlipVerified}
                      onChange={e => setIsBankSlipVerified(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-[#125E45] rounded accent-[#125E45] cursor-pointer shrink-0"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-[#17211D]">
                        Payment Received in Account & Transfer Slip Verified
                      </div>
                      <div className="text-[11px] text-[#4F6359] leading-tight">
                        Confirmed transfer slip verification. Net payment of Rs. {finalRetailGrandTotal.toLocaleString()} successfully received in designated bank account.
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {/* 4. SPLIT / MIXED PAYMENT WORKFLOW */}
              {paymentMethod === 'Split' && (
                <div className="space-y-3.5 p-4 bg-[#F8FAFA] rounded-2xl border border-[#DCE3E0]">
                  {/* Split Category Selector: Cash + Card OR Cash + Bank Transfer */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-[#DCE3E0] w-full">
                      <button
                        type="button"
                        onClick={() => {
                          setSplitMode('CashCard');
                          setSplitCardVerified(false);
                          setSplitBankSlipVerified(false);
                        }}
                        className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          splitMode === 'CashCard'
                            ? 'bg-[#125E45] text-white shadow-2xs'
                            : 'text-[#66726D] hover:text-[#17211D]'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Cash + Card</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSplitMode('CashBank');
                          setSplitCardVerified(false);
                          setSplitBankSlipVerified(false);
                        }}
                        className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          splitMode === 'CashBank'
                            ? 'bg-[#125E45] text-white shadow-2xs'
                            : 'text-[#66726D] hover:text-[#17211D]'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Cash + Bank Transfer</span>
                      </button>
                    </div>
                  </div>

                  {/* Dual Amount Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Portion 1: Cash Amount */}
                    <div className="p-3 bg-white rounded-xl border border-[#DCE3E0] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#17211D] flex items-center gap-1.5">
                          <Banknote className="w-3.5 h-3.5 text-[#125E45]" />
                          <span>1. Cash Amount (Rs.)</span>
                        </span>
                        <span className="text-[10px] text-[#8A9590]">In Cash Drawer</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder="Cash amount"
                        value={splitCashInput}
                        onChange={e => handleSplitCashChange(e.target.value)}
                        className="w-full p-2 text-sm font-bold text-[#17211D] border border-[#DCE3E0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                      />
                    </div>

                    {/* Portion 2: Card or Bank Amount */}
                    <div className="p-3 bg-white rounded-xl border border-[#DCE3E0] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#17211D] flex items-center gap-1.5">
                          {splitMode === 'CashCard' ? (
                            <>
                              <CreditCard className="w-3.5 h-3.5 text-[#125E45]" />
                              <span>2. Card Amount (Rs.)</span>
                            </>
                          ) : (
                            <>
                              <Building2 className="w-3.5 h-3.5 text-[#125E45]" />
                              <span>2. Bank Transfer Amount (Rs.)</span>
                            </>
                          )}
                        </span>
                        <span className="text-[10px] text-[#8A9590]">Remaining Due</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder="Secondary amount"
                        value={splitSecondaryInput}
                        onChange={e => handleSplitSecondaryChange(e.target.value)}
                        className="w-full p-2 text-sm font-bold text-[#17211D] border border-[#DCE3E0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                      />
                    </div>
                  </div>

                  {/* Sub-Workflow for Split: Cash + Card */}
                  {splitMode === 'CashCard' && (
                    <div className="p-3.5 bg-white rounded-xl border border-[#DCE3E0] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xs text-[#17211D] flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-[#125E45]" />
                          <span>Card Portion: Rs. {(parseFloat(splitSecondaryInput) || 0).toLocaleString()}</span>
                        </div>
                        <span className="text-[10px] text-[#66726D]">
                          POS Terminal Swipe
                        </span>
                      </div>

                      {!isCardTerminalEnabled ? (
                        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1.5">
                          <div className="font-bold text-rose-900">Card Terminal Disabled in Store Settings</div>
                          <p className="text-[11px] text-rose-700">
                            Integrated terminal is disabled. Use a standalone card swipe machine or enable terminal in settings:
                          </p>
                          <Link
                            href="/settings"
                            target="_blank"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-900 underline hover:text-rose-950"
                          >
                            <span>Open Settings to Enable Card Terminal</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                          <div className="pt-1">
                            <label className="text-[10px] font-bold text-[#66726D] block mb-1">
                              External Machine Card Auth / Ref #:
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. AUTH-84920"
                              value={splitManualCardRef}
                              onChange={e => setSplitManualCardRef(e.target.value)}
                              className="w-full p-1.5 text-xs border border-rose-300 rounded-md bg-white focus:outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          {splitCardAuth ? (
                            <div className="p-2.5 bg-[#DCEDE6] border border-[#125E45]/30 rounded-lg text-xs font-bold text-[#125E45] flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Card Authorized (Ref: {splitCardAuth.transactionId})</span>
                              </span>
                              <span>Rs. {(parseFloat(splitSecondaryInput) || 0).toLocaleString()}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setIsSplitCardTerminalModalOpen(true)}
                              className="w-full py-2 px-3 bg-[#125E45] hover:bg-[#197A5A] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Authorize Card Terminal for Rs. {(parseFloat(splitSecondaryInput) || 0).toLocaleString()}</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Checkbox for Cash + Card */}
                      <label
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                          splitCardVerified
                            ? 'bg-[#DCEDE6] border-[#125E45]'
                            : 'bg-[#F6F8F7] border-[#DCE3E0] hover:bg-[#F0F4F2]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={splitCardVerified}
                          onChange={e => setSplitCardVerified(e.target.checked)}
                          className="mt-0.5 w-4 h-4 text-[#125E45] rounded accent-[#125E45] cursor-pointer shrink-0"
                        />
                        <div className="text-xs text-[#17211D]">
                          <span className="font-bold">
                            Cash (Rs. {(parseFloat(splitCashInput) || 0).toLocaleString()}) Received in Drawer & Card (Rs. {(parseFloat(splitSecondaryInput) || 0).toLocaleString()}) Authorized
                          </span>
                          <span className="block text-[10px] text-[#66726D]">
                            Card payment authorization confirmed and cash tender received in drawer.
                          </span>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Sub-Workflow for Split: Cash + Bank Account */}
                  {splitMode === 'CashBank' && (
                    <div className="p-3.5 bg-white rounded-xl border border-[#DCE3E0] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xs text-[#17211D] flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-[#125E45]" />
                          <span>Bank Transfer Portion: Rs. {(parseFloat(splitSecondaryInput) || 0).toLocaleString()}</span>
                        </div>
                        <span className="text-[10px] text-[#66726D]">Online / Account</span>
                      </div>

                      {/* Display Selected Bank Account for Customer to Transfer */}
                      {selectedBank && (
                        <div className="p-3 bg-[#F6F8F7] rounded-xl border border-[#DCE3E0] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[#17211D]">{selectedBank.bankName}</span>
                            <span className="text-[10px] text-[#66726D]">{selectedBank.accountTitle}</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-[#DCE3E0] mt-1">
                            <div>
                              <span className="text-[9px] text-[#8A9590] block">Account Number for Customer Transfer:</span>
                              <span className="text-xs font-black font-mono text-[#17211D] tracking-wider select-all">
                                {selectedBank.accountNumber}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyAccount(selectedBank.accountNumber, selectedBank.id)}
                              className="px-2 py-1 bg-[#F6F8F7] hover:bg-[#DCEDE6] text-[#125E45] border border-[#DCE3E0] rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              {copiedBankId === selectedBank.id ? (
                                <>
                                  <Check className="w-3 h-3 text-[#125E45]" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Optional Reference */}
                      <input
                        type="text"
                        placeholder="Transfer Slip / Sender Name (Optional)"
                        value={splitReference}
                        onChange={e => setSplitReference(e.target.value)}
                        className="w-full p-2 text-xs border border-[#DCE3E0] rounded-lg bg-white focus:outline-none"
                      />

                      {/* Checkbox for Cash + Bank */}
                      <label
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                          splitBankSlipVerified
                            ? 'bg-[#DCEDE6] border-[#125E45]'
                            : 'bg-[#F6F8F7] border-[#DCE3E0] hover:bg-[#F0F4F2]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={splitBankSlipVerified}
                          onChange={e => setSplitBankSlipVerified(e.target.checked)}
                          className="mt-0.5 w-4 h-4 text-[#125E45] rounded accent-[#125E45] cursor-pointer shrink-0"
                        />
                        <div className="text-xs text-[#17211D]">
                          <span className="font-bold">
                            Cash (Rs. {(parseFloat(splitCashInput) || 0).toLocaleString()}) Received in Drawer & Bank Slip (Rs. {(parseFloat(splitSecondaryInput) || 0).toLocaleString()}) Verified
                          </span>
                          <span className="block text-[10px] text-[#66726D]">
                            Customer bank transfer slip verified and cash tender received in drawer.
                          </span>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Action Controls */}
              <div className="flex items-center justify-between pt-3 border-t border-[#DCE3E0]">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="px-4 py-2 border border-[#DCE3E0] rounded-xl text-xs font-semibold text-[#66726D] hover:bg-[#F0F4F2] cursor-pointer"
                >
                  Cancel
                </button>

                {/* Cash Method Button */}
                {paymentMethod === 'Cash' && (
                  <button
                    type="button"
                    onClick={handleConfirmCashAndOpenDrawer}
                    className="px-5 py-2.5 bg-[#125E45] hover:bg-[#197A5A] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Confirm Cash & Open Drawer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Card Method Button */}
                {paymentMethod === 'Card' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isCardTerminalEnabled) {
                        toast({
                          title: 'Card Payment Blocked',
                          description: 'Retail Card Terminal is disabled in Store Settings.',
                          type: 'error',
                        });
                        return;
                      }
                      setIsCheckoutOpen(false);
                      setIsCardTerminalModalOpen(true);
                    }}
                    disabled={!isCardTerminalEnabled}
                    className="px-5 py-2.5 bg-[#125E45] hover:bg-[#197A5A] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{isCardTerminalEnabled ? 'Authorize Card Terminal' : 'Card Terminal Disabled in Settings'}</span>
                  </button>
                )}

                {/* Bank Transfer Method Button */}
                {paymentMethod === 'Bank Transfer' && (
                  <button
                    type="button"
                    onClick={handleFinalizeBankSale}
                    disabled={!isBankSlipVerified}
                    className="px-5 py-2.5 bg-[#125E45] hover:bg-[#197A5A] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Complete Payment & Print</span>
                  </button>
                )}

                {/* Split Method Button */}
                {paymentMethod === 'Split' && (
                  <button
                    type="button"
                    onClick={handleFinalizeSplitSale}
                    disabled={
                      splitMode === 'CashCard'
                        ? !splitCardVerified && !splitCardAuth && !splitManualCardRef.trim()
                        : !splitBankSlipVerified
                    }
                    className="px-5 py-2.5 bg-[#125E45] hover:bg-[#197A5A] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Complete Payment & Print</span>
                  </button>
                )}
              </div>
            </div>
          </Modal>

          {/* CASH DRAWER MODAL (Exact flow from user screenshot) */}
          <CashDrawerModal
            isOpen={isCashDrawerModalOpen}
            onClose={() => setIsCashDrawerModalOpen(false)}
            grandTotal={finalRetailGrandTotal}
            cashReceived={parsedCashReceived}
            changeDue={changeDue}
            onCompleteSale={() => handleFinalizeSale()}
          />

          {/* CARD TERMINAL MODAL (Pure Card Sale) */}
          <CardTerminalModal
            isOpen={isCardTerminalModalOpen}
            onClose={() => setIsCardTerminalModalOpen(false)}
            grandTotal={finalRetailGrandTotal}
            onPaymentSuccess={authData => handleFinalizeSale({ cardAuth: authData })}
          />

          {/* CARD TERMINAL MODAL (Split Card Sale) */}
          <CardTerminalModal
            isOpen={isSplitCardTerminalModalOpen}
            onClose={() => setIsSplitCardTerminalModalOpen(false)}
            grandTotal={parseFloat(splitSecondaryInput) || 0}
            onPaymentSuccess={authData => {
              setSplitCardAuth(authData);
              setIsSplitCardTerminalModalOpen(false);
              setSplitCardVerified(true);
              toast({
                title: 'Card Authorized',
                description: `Payment of Rs. ${(parseFloat(splitSecondaryInput) || 0).toLocaleString()} approved. Auth Ref: ${authData.transactionId}`,
                type: 'success',
              });
            }}
          />

          {/* CUSTOMER DETAILS MODAL */}
          <Modal
            isOpen={isCustomerModalOpen}
            onClose={() => setIsCustomerModalOpen(false)}
            title="Customer Information"
            maxWidth="sm"
          >
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#17211D] block mb-1">Customer Name</label>
                <input
                  type="text"
                  value={customerName === 'Walk-in customer' ? '' : customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Sana Iqbal"
                  className="w-full border border-[#DCE3E0] rounded-xl p-2 text-xs text-[#17211D]"
                />
              </div>
              <div>
                <label className="font-bold text-[#17211D] block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 0300 1234567"
                  className="w-full border border-[#DCE3E0] rounded-xl p-2 text-xs text-[#17211D]"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 bg-[#125E45] text-white rounded-xl font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </Modal>

          {/* SEARCH BILLS MODAL */}
          <CustomerBillSearchModal
            isOpen={isSearchBillsOpen}
            onClose={() => setIsSearchBillsOpen(false)}
            initialMode={searchBillsMode}
            onSelectReturn={bill => {
              setSelectedBillForAction(bill);
              setIsSearchBillsOpen(false);
              setIsReturnModalOpen(true);
            }}
            onSelectExchange={bill => {
              setSelectedBillForAction(bill);
              setIsSearchBillsOpen(false);
              setIsExchangeModalOpen(true);
            }}
            onSelectPrint={bill => {
              setCompletedBill(bill);
              setIsReceiptModalOpen(true);
            }}
            onViewBill={bill => {
              setCompletedBill(bill);
              setIsReceiptModalOpen(true);
            }}
          />

          {/* KEYBOARD SHORTCUTS MODAL */}
          <KeyboardShortcutsModal
            isOpen={isShortcutsModalOpen}
            onClose={() => setIsShortcutsModalOpen(false)}
          />

          {/* RETURN MODAL */}
          <ReturnModal
            isOpen={isReturnModalOpen}
            onClose={() => {
              setIsReturnModalOpen(false);
              setSelectedBillForAction(null);
            }}
            bill={selectedBillForAction}
            onReturnCompleted={() => {
              loadRealData();
              setIsReturnModalOpen(false);
              setSelectedBillForAction(null);
              toast({ title: 'Return Processed', description: 'Stock updated in system', type: 'success' });
            }}
          />

          {/* EXCHANGE MODAL */}
          <ExchangeModal
            isOpen={isExchangeModalOpen}
            onClose={() => {
              setIsExchangeModalOpen(false);
              setSelectedBillForAction(null);
            }}
            bill={selectedBillForAction}
            onExchangeCompleted={() => {
              loadRealData();
              setIsExchangeModalOpen(false);
              setSelectedBillForAction(null);
              toast({ title: 'Exchange Completed', description: 'Stock & bill updated', type: 'success' });
            }}
          />

          {/* THERMAL RECEIPT MODAL */}
          {completedBill && (
            <Modal
              isOpen={isReceiptModalOpen}
              onClose={() => setIsReceiptModalOpen(false)}
              title={`Thermal Receipt #${completedBill.invoiceNumber}`}
              maxWidth="md"
            >
              <ThermalReceipt
                bill={completedBill}
                onClose={() => setIsReceiptModalOpen(false)}
              />
            </Modal>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
