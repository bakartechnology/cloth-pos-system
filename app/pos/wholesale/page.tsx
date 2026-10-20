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
  Layers,
  AlertCircle,
  Calendar,
  DollarSign,
  Copy,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { productsService } from '@/services/productsService';
import { customersService } from '@/services/customersService';
import { salesService } from '@/services/salesService';
import { storageService } from '@/services/storageService';
import { wholesaleSessionService } from '@/services/wholesaleSessionService';
import { paymentsService } from '@/services/paymentsService';
import { barcodeScannerService } from '@/services/hardware/barcodeScannerService';
import { cashDrawerService } from '@/services/hardware/cashDrawerService';
import { cardTerminalService, CardPaymentState, CardPaymentResponse } from '@/services/hardware/cardTerminalService';
import { CardTerminalModal } from '@/components/retail-pos/CardTerminalModal';
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
  Pandi,
  SplitMode,
} from '@/types';
import { PandiSelectInput } from '@/components/pandi/PandiSelectInput';

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
    restoreWholesaleCart,
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
  const [pandiName, setPandiName] = useState('');
  const [selectedPandi, setSelectedPandi] = useState<Pandi | null>(null);

  // Bank Transfer Payment States
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [isBankPaymentConfirmed, setIsBankPaymentConfirmed] = useState(false);

  // Card Terminal Payment States
  const [cardPaymentState, setCardPaymentState] = useState<CardPaymentState>('idle');
  const [cardStatusMessage, setCardStatusMessage] = useState('');
  const [cardTransactionId, setCardTransactionId] = useState<string | undefined>(undefined);
  const [isWholesaleTerminalEnabled, setIsWholesaleTerminalEnabled] = useState<boolean>(false);

  // Split / Mixed Payment States (Retail Mirror + Cash/Bank + Cheque + 3-Way Split)
  const [splitMode, setSplitMode] = useState<SplitMode>('CashCard');
  const [splitCashInput, setSplitCashInput] = useState<string>('');
  const [splitBankInput, setSplitBankInput] = useState<string>('');
  const [splitSecondaryInput, setSplitSecondaryInput] = useState<string>('');
  const [splitCardAuth, setSplitCardAuth] = useState<CardPaymentResponse | null>(null);
  const [splitManualCardRef, setSplitManualCardRef] = useState<string>('');
  const [splitCardVerified, setSplitCardVerified] = useState(false);
  const [splitBankSlipVerified, setSplitBankSlipVerified] = useState(false);
  const [splitChequeVerified, setSplitChequeVerified] = useState(false);
  const [splitReference, setSplitReference] = useState('');
  const [splitChequeNumber, setSplitChequeNumber] = useState('');
  const [splitChequeBankName, setSplitChequeBankName] = useState('Meezan Bank');
  const [splitChequeClearingDate, setSplitChequeClearingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  // Multiple Cheques State for Wholesale Finalize
  const [chequeEntries, setChequeEntries] = useState<Array<{
    id: string;
    bankName: string;
    chequeNumber: string;
    amount: string;
    clearingDate: string;
  }>>([
    {
      id: 'chq-init-1',
      bankName: 'Meezan Bank',
      chequeNumber: '',
      amount: '',
      clearingDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
      })(),
    },
  ]);
  const [isSplitCardTerminalModalOpen, setIsSplitCardTerminalModalOpen] = useState(false);
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);

  // Pending Wholesale Cheques Modal State
  const [isPendingChequesModalOpen, setIsPendingChequesModalOpen] = useState(false);
  const [pendingCheques, setPendingCheques] = useState<ReturnType<typeof paymentsService.getWholesalePendingCheques>>([]);
  const [pendingChequesSearch, setPendingChequesSearch] = useState('');
  const [pendingOriginFilter, setPendingOriginFilter] = useState<'All' | 'Wholesale' | 'Khata'>('All');

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
      const banks = (settings.bankAccounts || []).filter(
        b => b.isActive !== false && (!b.channels || b.channels.length === 0 || b.channels.includes('Wholesale'))
      );
      setBankAccounts(banks);
      if (banks.length > 0) {
        setSelectedBank(prev => (prev && banks.some(b => b.id === prev.id)) ? prev : banks[0]);
      } else {
        setSelectedBank(null);
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
      restoreWholesaleCart(availableDraft.cartItems);
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
  };

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

  // Load pending cheques for wholesale
  const loadPendingCheques = () => {
    const list = paymentsService.getWholesalePendingCheques();
    setPendingCheques(list);
  };

  useEffect(() => {
    loadPendingCheques();
  }, []);

  const dueTodayCount = useMemo(() => {
    return pendingCheques.filter(p => p.isDueToday || p.isOverdue).length;
  }, [pendingCheques]);

  const handlePassCheque = (collectionId: string, chequeId: string) => {
    const res = paymentsService.passCheque(
      collectionId,
      chequeId,
      currentStaff?.id,
      currentStaff?.name
    );
    if (res.success) {
      loadPendingCheques();
      toast({
        title: 'Cheque Passed & Settled (OK)',
        description: `Rs. ${res.amount?.toLocaleString()} deducted from ${res.customerName}'s account on today's statement (${new Date().toLocaleDateString()}).`,
        type: 'success',
      });
    } else {
      toast({
        title: 'Action Failed',
        description: res.message,
        type: 'error',
      });
    }
  };

  const handleSplitCashChange = (val: string) => {
    setSplitCashInput(val);
    if (!val || val.trim() === '') {
      setSplitSecondaryInput('');
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num)) {
      setSplitSecondaryInput('');
      return;
    }
    const remaining = Math.max(0, Math.round((finalWholesaleGrandTotal - num) * 100) / 100);
    setSplitSecondaryInput(String(remaining));
  };

  const handleSplitSecondaryChange = (val: string) => {
    setSplitSecondaryInput(val);
    if (!val || val.trim() === '') {
      setSplitCashInput('');
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num)) {
      setSplitCashInput('');
      return;
    }
    const remaining = Math.max(0, Math.round((finalWholesaleGrandTotal - num) * 100) / 100);
    setSplitCashInput(String(remaining));
  };

  const handleSplit3WayChange = (field: 'cash' | 'bank' | 'cheque', val: string) => {
    if (field === 'cash') {
      setSplitCashInput(val);
      if (val === '') return;
      const c = parseFloat(val) || 0;
      const b = parseFloat(splitBankInput) || 0;
      const rem = Math.max(0, Math.round((finalWholesaleGrandTotal - c - b) * 100) / 100);
      setSplitSecondaryInput(String(rem));
      if (chequeEntries.length === 1) {
        setChequeEntries([{ ...chequeEntries[0], amount: rem > 0 ? String(rem) : '' }]);
      }
    } else if (field === 'bank') {
      setSplitBankInput(val);
      if (val === '') return;
      const b = parseFloat(val) || 0;
      const c = parseFloat(splitCashInput) || 0;
      const rem = Math.max(0, Math.round((finalWholesaleGrandTotal - c - b) * 100) / 100);
      setSplitSecondaryInput(String(rem));
      if (chequeEntries.length === 1) {
        setChequeEntries([{ ...chequeEntries[0], amount: rem > 0 ? String(rem) : '' }]);
      }
    } else if (field === 'cheque') {
      setSplitSecondaryInput(val);
      if (chequeEntries.length === 1) {
        setChequeEntries([{ ...chequeEntries[0], amount: val }]);
      }
      if (val === '') return;
      const chq = parseFloat(val) || 0;
      const c = parseFloat(splitCashInput) || 0;
      const rem = Math.max(0, Math.round((finalWholesaleGrandTotal - c - chq) * 100) / 100);
      setSplitBankInput(String(rem));
    }
  };

  const handleAddCheque = () => {
    const primary = (parseFloat(splitCashInput) || 0) + (splitMode === 'CashBankCheque' ? (parseFloat(splitBankInput) || 0) : 0);
    const existingChequesSum = chequeEntries.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    const remaining = Math.max(0, Math.round((finalWholesaleGrandTotal - primary - existingChequesSum) * 100) / 100);

    const prevDate = chequeEntries[chequeEntries.length - 1]?.clearingDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d.toISOString().split('T')[0];
    })();
    const prevBank = chequeEntries[chequeEntries.length - 1]?.bankName || 'Meezan Bank';

    const newCheque = {
      id: `chq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      bankName: prevBank,
      chequeNumber: '',
      amount: remaining > 0 ? String(remaining) : '',
      clearingDate: prevDate,
    };

    const updated = [...chequeEntries, newCheque];
    setChequeEntries(updated);
    const totalCheques = updated.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    setSplitSecondaryInput(totalCheques > 0 ? String(totalCheques) : '');
  };

  const handleRemoveCheque = (id: string) => {
    if (chequeEntries.length <= 1) return;
    const updated = chequeEntries.filter(c => c.id !== id);
    setChequeEntries(updated);
    const totalCheques = updated.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    setSplitSecondaryInput(totalCheques > 0 ? String(totalCheques) : '');
  };

  const handleUpdateCheque = (id: string, field: 'bankName' | 'chequeNumber' | 'amount' | 'clearingDate', value: string) => {
    const updated = chequeEntries.map(c => (c.id === id ? { ...c, [field]: value } : c));
    setChequeEntries(updated);
    if (field === 'amount') {
      const totalCheques = updated.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
      setSplitSecondaryInput(totalCheques > 0 ? String(totalCheques) : '');
      if (splitMode === 'CashCheque' || splitMode === 'BankCheque') {
        const remaining = Math.max(0, Math.round((finalWholesaleGrandTotal - totalCheques) * 100) / 100);
        setSplitCashInput(remaining > 0 ? String(remaining) : '');
      } else if (splitMode === 'CashBankCheque') {
        const c = parseFloat(splitCashInput) || 0;
        const remaining = Math.max(0, Math.round((finalWholesaleGrandTotal - c - totalCheques) * 100) / 100);
        setSplitBankInput(remaining > 0 ? String(remaining) : '');
      }
    }
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

    // Start split mode on Cash + Card and amounts blank
    setSplitMode('CashCard');
    setSplitCashInput('');
    setSplitBankInput('');
    setSplitSecondaryInput('');
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setChequeEntries([
      {
        id: `chq-${Date.now()}`,
        bankName: 'Meezan Bank',
        chequeNumber: '',
        amount: '',
        clearingDate: d.toISOString().split('T')[0],
      },
    ]);
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
    } else if (paymentMethod === 'Split') {
      const primaryAmt = parseFloat(splitCashInput) || 0;
      const bankAmt = parseFloat(splitBankInput) || 0;
      const secondaryAmt = parseFloat(splitSecondaryInput) || 0;
      const totalSplit = splitMode === 'CashBankCheque' ? (primaryAmt + bankAmt + secondaryAmt) : (primaryAmt + secondaryAmt);

      if (Math.round(totalSplit) < Math.round(finalWholesaleGrandTotal)) {
        toast({
          title: 'Incomplete Split Payment',
          description: `Total split payment (Rs. ${totalSplit.toLocaleString()}) is less than net payable (Rs. ${finalWholesaleGrandTotal.toLocaleString()}).`,
          type: 'error',
        });
        return;
      }

      if (splitMode === 'CashCard') {
        if (!splitCardVerified && !splitCardAuth && !splitManualCardRef.trim()) {
          toast({
            title: 'Card Payment Not Confirmed',
            description: 'Please authorize card terminal or enter manual authorization reference & confirm checkbox.',
            type: 'warning',
          });
          return;
        }
      } else if (splitMode === 'CashBank') {
        if (!splitBankSlipVerified) {
          toast({
            title: 'Transfer Slip Required',
            description: 'Please confirm that the bank transfer slip has been verified.',
            type: 'warning',
          });
          return;
        }
      } else if (splitMode === 'CashCheque' || splitMode === 'BankCheque' || splitMode === 'CashBankCheque') {
        if (splitMode === 'BankCheque' || splitMode === 'CashBankCheque') {
          if (!splitBankSlipVerified) {
            toast({
              title: 'Bank Transfer Slip Required',
              description: 'Please verify the bank transfer portion slip and confirm checkbox.',
              type: 'warning',
            });
            return;
          }
        }
        for (let i = 0; i < chequeEntries.length; i++) {
          const chq = chequeEntries[i];
          if (!chq.bankName.trim()) {
            toast({
              title: `Bank Name Required (Cheque #${i + 1})`,
              description: `Please enter or select the bank name for Cheque #${i + 1}.`,
              type: 'warning',
            });
            return;
          }
          if ((parseFloat(chq.amount) || 0) <= 0) {
            toast({
              title: `Amount Required (Cheque #${i + 1})`,
              description: `Please enter a valid amount for Cheque #${i + 1}.`,
              type: 'warning',
            });
            return;
          }
          if (!chq.clearingDate) {
            toast({
              title: `Passing Date Required (Cheque #${i + 1})`,
              description: `Please specify the scheduled passing date for Cheque #${i + 1}.`,
              type: 'warning',
            });
            return;
          }
        }
        if (!splitChequeVerified) {
          toast({
            title: 'Cheque Verification Required',
            description: 'Please confirm that physical cheque(s) and details are verified.',
            type: 'warning',
          });
          return;
        }
      }
    }

    const effectiveCustomerName = customerName.trim() || selectedCustomer?.name || 'Walk-in Wholesale Customer';
    const effectivePhone = selectedCustomer?.phone || '';

    // Only attach billCustomer if an existing client was selected; do not create permanent client for one-time wholesale customerName
    const billCustomer = selectedCustomer || undefined;

    const primaryAmt = parseFloat(splitCashInput) || 0;
    const bankAmt = parseFloat(splitBankInput) || 0;
    const secondaryAmt = parseFloat(splitSecondaryInput) || 0;

    const bill = salesService.completeSale({
      saleType: 'Wholesale',
      cartItems: wholesaleCart,
      paymentMethod,
      amountReceived:
        paymentMethod === 'Credit/Khata'
          ? 0
          : paymentMethod === 'Cash'
          ? cashReceived
          : paymentMethod === 'Split'
          ? (splitMode === 'CashBankCheque'
              ? (primaryAmt + bankAmt)
              : (splitMode === 'CashCheque' || splitMode === 'BankCheque'
                  ? primaryAmt
                  : finalWholesaleGrandTotal))
          : finalWholesaleGrandTotal,
      discountTotal: wholesaleDiscountTotal,
      taxTotal: wholesaleTaxAmount,
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      counter: currentStaff.counter,
      customer: billCustomer || undefined,
      customerName: effectiveCustomerName,
      customerPhone: effectivePhone,
      clientId: selectedCustomer?.id,
      clientName: selectedCustomer ? (selectedCustomer.businessName || selectedCustomer.name) : undefined,
      cardTransactionId: paymentMethod === 'Card' ? cardTransactionId : undefined,
      pandiId: selectedPandi?.id,
      pandiName: pandiName.trim() || undefined,
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
      splitPayment:
        paymentMethod === 'Split'
          ? {
              mode: splitMode,
              cashAmount: splitMode === 'BankCheque' ? 0 : primaryAmt,
              bankAmount:
                splitMode === 'CashBankCheque'
                  ? bankAmt
                  : splitMode === 'BankCheque'
                  ? primaryAmt
                  : splitMode === 'CashBank'
                  ? secondaryAmt
                  : undefined,
              chequeAmount:
                (splitMode === 'CashCheque' || splitMode === 'BankCheque' || splitMode === 'CashBankCheque')
                  ? secondaryAmt
                  : undefined,
              primaryMethod: splitMode === 'BankCheque' ? 'Bank Transfer' : 'Cash',
              primaryAmount: splitMode === 'CashBankCheque' ? (primaryAmt + bankAmt) : primaryAmt,
              secondaryMethod:
                splitMode === 'CashCard'
                  ? 'Card'
                  : splitMode === 'CashBank'
                  ? 'Bank Transfer'
                  : 'Cheque',
              secondaryAmount: secondaryAmt,
              cardTransactionId: splitCardAuth?.transactionId || splitManualCardRef.trim() || undefined,
              bankDetails:
                (splitMode === 'CashBank' || splitMode === 'BankCheque' || splitMode === 'CashBankCheque') && selectedBank
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
              slipReference: splitReference.trim() || undefined,
              chequeNumber: chequeEntries[0]?.chequeNumber?.trim() || splitChequeNumber.trim() || undefined,
              chequeBankName: chequeEntries[0]?.bankName?.trim() || splitChequeBankName.trim() || undefined,
              chequeClearingDate: chequeEntries[0]?.clearingDate || splitChequeClearingDate || undefined,
              cheques: (splitMode === 'CashCheque' || splitMode === 'BankCheque' || splitMode === 'CashBankCheque')
                ? chequeEntries.map(c => ({
                    id: c.id,
                    bankName: c.bankName.trim(),
                    chequeNumber: c.chequeNumber.trim() || undefined,
                    amount: parseFloat(c.amount) || 0,
                    clearingDate: c.clearingDate,
                    status: 'Pending' as const,
                  }))
                : undefined,
              chequeStatus: 'Pending',
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
    setPandiName('');
    setSelectedPandi(null);
    setSplitCashInput('');
    setSplitBankInput('');
    setSplitSecondaryInput('');
    setSplitCardAuth(null);
    setSplitManualCardRef('');
    setSplitCardVerified(false);
    setSplitBankSlipVerified(false);
    setSplitChequeVerified(false);
    setSplitChequeNumber('');
    setSplitReference('');
    const dReset = new Date();
    dReset.setDate(dReset.getDate() + 7);
    setChequeEntries([
      {
        id: `chq-${Date.now()}`,
        bankName: 'Meezan Bank',
        chequeNumber: '',
        amount: '',
        clearingDate: dReset.toISOString().split('T')[0],
      },
    ]);
    loadPendingCheques();
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
                    {currentStaff?.name || 'Haji Abdul Rehman'}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-[#8A9590] uppercase tracking-wider block">
                    COUNTER
                  </span>
                  <span className="text-xs font-bold text-[#17211D]">
                    {currentStaff?.counter || 'Counter 02'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Pending Cheques -> Search Past Bills -> Shortcuts -> Hardware Dot -> Time */}
            <div className="flex items-center gap-3 shrink-0 ml-auto">
              {/* Pending Cheques Button */}
              <button
                type="button"
                onClick={() => {
                  loadPendingCheques();
                  setIsPendingChequesModalOpen(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors shadow-2xs cursor-pointer ${
                  dueTodayCount > 0
                    ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 ring-1 ring-amber-400'
                    : pendingCheques.length > 0
                    ? 'bg-[#DCEDE6] border-[#125E45]/40 text-[#125E45] hover:bg-[#cde4db]'
                    : 'bg-white border-[#DCE3E0] hover:bg-[#F0F4F2] text-[#17211D]'
                }`}
                title="Wholesale Uncleared / Pending Cheques"
              >
                <Layers className="w-3.5 h-3.5 text-current" />
                <span>Pending Cheques</span>
                {pendingCheques.length > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      dueTodayCount > 0 ? 'bg-amber-600 text-white animate-pulse' : 'bg-[#125E45] text-white'
                    }`}
                  >
                    {pendingCheques.length}
                  </span>
                )}
              </button>

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

          {/* CHEQUE DUE TODAY NOTIFICATION BANNER */}
          {dueTodayCount > 0 && (
            <div className="p-3 rounded-2xl bg-[#F7EEDC] border border-[#9A6A16]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#9A6A16] text-white flex items-center justify-center font-bold shrink-0">
                  <Clock className="w-4 h-4 animate-spin" />
                </div>
                <div>
                  <div className="font-bold text-[#17211D] flex items-center gap-2">
                    <span>{dueTodayCount} Wholesale Cheque(s) Due for Clearance Today</span>
                    <span className="text-[10px] bg-[#9A6A16]/20 text-[#9A6A16] px-1.5 py-0.2 rounded font-bold uppercase">
                      Action Required
                    </span>
                  </div>
                  <div className="text-[11px] text-[#66726D]">
                    Cheques are scheduled for clearance. Click &quot;Pass Cheque (OK)&quot; to clear and deduct from client accounts.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  loadPendingCheques();
                  setIsPendingChequesModalOpen(true);
                }}
                className="px-3 py-1.5 bg-[#9A6A16] hover:bg-[#835911] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs shrink-0 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>View & Pass Cheques</span>
              </button>
            </div>
          )}


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
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-[#17211D]">
                    Customer & wholesale account
                  </h3>
                  <div className="flex items-center gap-2">
                    {(customerName.trim() || selectedCustomer) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerName('');
                          setSelectedCustomer(null);
                        }}
                        className="text-xs font-semibold text-[#C23D45] hover:underline cursor-pointer ml-1"
                        title="Clear and switch wholesale account"
                      >
                        Switch Account
                      </button>
                    )}
                  </div>
                </div>

                {/* Two dropdown fields: Customer Name & Wholesale Client */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <WholesaleCustomerInput
                    value={customerName}
                    onChange={name => {
                      setCustomerName(name);
                    }}
                  />

                  <WholesaleClientSearch
                    selectedClient={selectedCustomer}
                    onSelectClient={client => {
                      setSelectedCustomer(client);
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

              {/* PRODUCT CATALOG HEADER (Count + Sorting Dropdown) */}
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

                        {/* Line 3: Quantity Controls + Rs Discount Input + Line Total */}
                        <div className="flex items-center justify-between pt-1 gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="border border-[#DCE3E0] rounded-lg flex items-center gap-1.5 px-2 h-7 text-xs text-[#17211D] bg-white shadow-2xs">
                              <button
                                type="button"
                                onClick={() => updateWholesaleQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                                disabled={item.quantity <= 1}
                                className="text-[#66726D] hover:text-[#17211D] font-bold text-sm cursor-pointer disabled:opacity-30 px-0.5"
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
                                className="font-bold min-w-[20px] max-w-[34px] text-center text-xs text-[#17211D] bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateWholesaleQuantity(item.product.id, Math.min(item.product.stock, item.quantity + 1))}
                                disabled={item.quantity >= item.product.stock}
                                className="text-[#66726D] hover:text-[#17211D] font-bold text-sm cursor-pointer disabled:opacity-30 px-0.5"
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
                                  updateWholesaleExtraDiscount(item.product.id, val);
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
            <div className="p-3.5 sm:p-4 bg-[#F0F4F2] rounded-2xl border border-[#DCE3E0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="text-[11px] sm:text-xs text-[#66726D]">Net Amount Due:</span>
                <div className="text-xl sm:text-2xl font-black text-[#17211D]">
                  Rs. {finalWholesaleGrandTotal.toLocaleString()}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <span className="bg-[#DCEDE6] text-[#125E45] text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full inline-block mb-1">
                  Wholesale Counter
                </span>
                <div className="text-[11px] text-[#66726D] truncate max-w-full sm:max-w-xs">
                  {selectedCustomer ? (selectedCustomer.businessName || selectedCustomer.name) : customerName.trim() || 'Walk-in Customer'}
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#17211D] block">
                Settlement Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 sm:gap-2">
                {(['Cash', 'Bank Transfer', 'Card', 'Credit/Khata', 'Split'] as PaymentMethod[]).map(pm => {
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
                        if (pm === 'Split') {
                          setSplitMode('CashCard');
                          setSplitCashInput('');
                          setSplitSecondaryInput('');
                        }
                      }}
                      className={`p-2 sm:p-3 rounded-xl border flex flex-col items-center justify-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold text-center transition-all cursor-pointer ${
                        isSelected
                          ? isCardDisabled
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-[#DCEDE6] text-[#125E45] border-[#125E45]'
                          : 'bg-white border-[#DCE3E0] text-[#66726D] hover:bg-[#F0F4F2]'
                      }`}
                    >
                      {pm === 'Cash' && <Banknote className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
                      {pm === 'Bank Transfer' && <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
                      {pm === 'Card' && <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
                      {pm === 'Credit/Khata' && <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
                      {pm === 'Split' && <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
                      <span className="truncate max-w-full">{pm === 'Split' ? 'Split / Mixed' : pm}</span>
                      {isCardDisabled && (
                        <span className="text-[9px] font-normal text-rose-600">
                          (Disabled)
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
                ) : bankAccounts.length === 1 ? (
                  /* Single Bank Account: Show directly as requested */
                  <div className="p-3 sm:p-3.5 rounded-xl border border-[#125E45] bg-[#DCEDE6]/40 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <span className="font-bold text-xs text-[#17211D] flex items-center gap-1.5 min-w-0">
                        <Building className="w-3.5 h-3.5 text-[#125E45] shrink-0" />
                        <span className="truncate">{bankAccounts[0].bankName}</span>
                      </span>
                      <span className="text-[10px] text-[#66726D] font-medium truncate">
                        Title: <strong className="text-[#17211D]">{bankAccounts[0].accountTitle}</strong>
                      </span>
                    </div>
                    <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-[#DCE3E0] mt-1.5">
                      <div className="min-w-0">
                        <span className="text-[9px] text-[#8A9590] block uppercase font-semibold">
                          Account Number
                        </span>
                        <span className="text-xs font-black font-mono text-[#17211D] tracking-wider select-all break-all">
                          {bankAccounts[0].accountNumber}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyAccount(bankAccounts[0].accountNumber, bankAccounts[0].id)}
                        className="px-2.5 py-1.5 bg-[#F6F8F7] hover:bg-[#DCEDE6] text-[#125E45] border border-[#DCE3E0] rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shrink-0 self-start xs:self-center"
                      >
                        {copiedBankId === bankAccounts[0].id ? (
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
                    {bankAccounts[0].iban && (
                      <div className="text-[9px] text-[#8A9590] font-mono mt-1 break-all">
                        IBAN: {bankAccounts[0].iban}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Multiple Bank Accounts: Dropdown with Bank Names + Selected Bank Account Number */
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-bold text-[#66726D] block mb-1">
                        Select Receiving Bank:
                      </label>
                      <select
                        value={selectedBank?.id || bankAccounts[0]?.id || ''}
                        onChange={e => {
                          const found = bankAccounts.find(b => b.id === e.target.value);
                          if (found) setSelectedBank(found);
                        }}
                        className="w-full p-2 text-xs font-bold text-[#17211D] bg-white border border-[#DCE3E0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#197A5A] cursor-pointer"
                      >
                        {bankAccounts.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.bankName} — {b.accountTitle}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedBank && (
                      <div className="p-3 sm:p-3.5 rounded-xl border border-[#125E45] bg-[#DCEDE6]/40 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs text-[#17211D] flex items-center gap-1.5 min-w-0">
                            <Building className="w-3.5 h-3.5 text-[#125E45] shrink-0" />
                            <span className="truncate">{selectedBank.bankName}</span>
                          </span>
                          <span className="text-[10px] text-[#66726D] font-medium truncate">
                            Title: <strong className="text-[#17211D]">{selectedBank.accountTitle}</strong>
                          </span>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-[#DCE3E0] mt-1.5">
                          <div className="min-w-0">
                            <span className="text-[9px] text-[#8A9590] block uppercase font-semibold">
                              Account Number
                            </span>
                            <span className="text-xs font-black font-mono text-[#17211D] tracking-wider select-all break-all">
                              {selectedBank.accountNumber}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyAccount(selectedBank.accountNumber, selectedBank.id)}
                            className="px-2.5 py-1.5 bg-[#F6F8F7] hover:bg-[#DCEDE6] text-[#125E45] border border-[#DCE3E0] rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shrink-0 self-start xs:self-center"
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
                        {selectedBank.iban && (
                          <div className="text-[9px] text-[#8A9590] font-mono mt-1 break-all">
                            IBAN: {selectedBank.iban}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-[#DCE3E0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs text-[#66726D]">Transfer Slip Verified:</span>
                  <button
                    type="button"
                    onClick={() => setIsBankPaymentConfirmed(!isBankPaymentConfirmed)}
                    className={`w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
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

            {/* SPLIT / MIXED PAYMENT WORKFLOW (Retail Mirror + Cash/Bank + Cheque) */}
            {paymentMethod === 'Split' && (
              <div className="space-y-3.5 p-3 sm:p-4 bg-[#F8FAFA] rounded-2xl border border-[#DCE3E0]">
                {/* Mode Selector (5 Tabs): Cash + Card, Cash + Bank, Cash + Cheque, Bank + Cheque, Cash + Bank + Cheque */}
                <div className="space-y-1.5">
                  <div>
                    <span className="text-xs font-bold text-[#17211D] block mb-1">Split Mode Selection:</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1 sm:gap-1.5 p-1 bg-white rounded-xl border border-[#DCE3E0]">
                    <button
                      type="button"
                      onClick={() => {
                        setSplitMode('CashCard');
                        setSplitCardVerified(false);
                        setSplitBankSlipVerified(false);
                        setSplitChequeVerified(false);
                        setSplitCashInput('');
                        setSplitBankInput('');
                        setSplitSecondaryInput('');
                      }}
                      className={`px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-center ${
                        splitMode === 'CashCard'
                          ? 'bg-[#125E45] text-white shadow-2xs'
                          : 'text-[#66726D] hover:text-[#17211D] hover:bg-[#F0F4F2]'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Cash + Card</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSplitMode('CashBank');
                        setSplitCardVerified(false);
                        setSplitBankSlipVerified(false);
                        setSplitChequeVerified(false);
                        setSplitCashInput('');
                        setSplitBankInput('');
                        setSplitSecondaryInput('');
                      }}
                      className={`px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-center ${
                        splitMode === 'CashBank'
                          ? 'bg-[#125E45] text-white shadow-2xs'
                          : 'text-[#66726D] hover:text-[#17211D] hover:bg-[#F0F4F2]'
                      }`}
                    >
                      <Building className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Cash + Bank</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSplitMode('CashCheque');
                        setSplitCardVerified(false);
                        setSplitBankSlipVerified(false);
                        setSplitChequeVerified(false);
                        setSplitCashInput('');
                        setSplitBankInput('');
                        setSplitSecondaryInput('');
                      }}
                      className={`px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-center ${
                        splitMode === 'CashCheque'
                          ? 'bg-[#125E45] text-white shadow-2xs'
                          : 'text-[#66726D] hover:text-[#17211D] hover:bg-[#F0F4F2]'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Cash + Cheque</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSplitMode('BankCheque');
                        setSplitCardVerified(false);
                        setSplitBankSlipVerified(false);
                        setSplitChequeVerified(false);
                        setSplitCashInput('');
                        setSplitBankInput('');
                        setSplitSecondaryInput('');
                      }}
                      className={`px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-center ${
                        splitMode === 'BankCheque'
                          ? 'bg-[#125E45] text-white shadow-2xs'
                          : 'text-[#66726D] hover:text-[#17211D] hover:bg-[#F0F4F2]'
                      }`}
                    >
                      <Building className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Bank + Cheque</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSplitMode('CashBankCheque');
                        setSplitCardVerified(false);
                        setSplitBankSlipVerified(false);
                        setSplitChequeVerified(false);
                        setSplitCashInput('');
                        setSplitBankInput('');
                        setSplitSecondaryInput('');
                      }}
                      className={`px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-center ${
                        splitMode === 'CashBankCheque'
                          ? 'bg-[#125E45] text-white shadow-2xs'
                          : 'text-[#66726D] hover:text-[#17211D] hover:bg-[#F0F4F2]'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Cash+Bank+Chq</span>
                    </button>
                  </div>
                </div>

                {/* Amount Inputs: 3-way if CashBankCheque, else dual inputs */}
                {splitMode === 'CashBankCheque' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                    {/* Portion 1: Cash Amount */}
                    <div className="p-2.5 bg-white rounded-xl border border-[#DCE3E0] space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#17211D] flex items-center gap-1">
                          <Banknote className="w-3.5 h-3.5 text-[#125E45]" />
                          <span>1. Cash (Rs.)</span>
                        </span>
                        <span className="text-[9px] text-[#8A9590]">Immediate</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder="Enter cash amount"
                        value={splitCashInput}
                        onChange={e => handleSplit3WayChange('cash', e.target.value)}
                        className="w-full p-2 text-sm font-bold text-[#17211D] border border-[#DCE3E0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                      />
                    </div>

                    {/* Portion 2: Bank Transfer Amount */}
                    <div className="p-2.5 bg-white rounded-xl border border-[#DCE3E0] space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#17211D] flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-[#125E45]" />
                          <span>2. Bank (Rs.)</span>
                        </span>
                        <span className="text-[9px] text-[#8A9590]">IBFT / Transfer</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder="Enter bank amount"
                        value={splitBankInput}
                        onChange={e => handleSplit3WayChange('bank', e.target.value)}
                        className="w-full p-2 text-sm font-bold text-[#17211D] border border-[#DCE3E0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                      />
                    </div>

                    {/* Portion 3: Cheque Amount */}
                    <div className="p-2.5 bg-white rounded-xl border border-[#DCE3E0] space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#17211D] flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-[#125E45]" />
                          <span>3. Cheque (Rs.)</span>
                        </span>
                        <span className="text-[9px] text-amber-600 font-bold">Pending</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder="Enter cheque amount"
                        value={splitSecondaryInput}
                        onChange={e => handleSplit3WayChange('cheque', e.target.value)}
                        className="w-full p-2 text-sm font-bold text-[#17211D] border border-[#DCE3E0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Portion 1: Cash or Bank Amount */}
                    <div className="p-3 bg-white rounded-xl border border-[#DCE3E0] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#17211D] flex items-center gap-1.5">
                          {splitMode === 'BankCheque' ? (
                            <>
                              <Building className="w-3.5 h-3.5 text-[#125E45]" />
                              <span>1. Bank Transfer Amount (Rs.)</span>
                            </>
                          ) : (
                            <>
                              <Banknote className="w-3.5 h-3.5 text-[#125E45]" />
                              <span>1. Cash Amount (Rs.)</span>
                            </>
                          )}
                        </span>
                        <span className="text-[10px] text-[#8A9590]">Received Immediately</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder={splitMode === 'BankCheque' ? 'Enter bank amount' : 'Enter cash amount'}
                        value={splitCashInput}
                        onChange={e => handleSplitCashChange(e.target.value)}
                        className="w-full p-2 text-sm font-bold text-[#17211D] border border-[#DCE3E0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                      />
                    </div>

                    {/* Portion 2: Card, Bank, or Cheque Amount */}
                    <div className="p-3 bg-white rounded-xl border border-[#DCE3E0] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#17211D] flex items-center gap-1.5">
                          {splitMode === 'CashCard' && (
                            <>
                              <CreditCard className="w-3.5 h-3.5 text-[#125E45]" />
                              <span>2. Card Amount (Rs.)</span>
                            </>
                          )}
                          {splitMode === 'CashBank' && (
                            <>
                              <Building className="w-3.5 h-3.5 text-[#125E45]" />
                              <span>2. Bank Transfer Amount (Rs.)</span>
                            </>
                          )}
                          {(splitMode === 'CashCheque' || splitMode === 'BankCheque') && (
                            <>
                              <FileText className="w-3.5 h-3.5 text-[#125E45]" />
                              <span>2. Cheque Amount (Rs.)</span>
                            </>
                          )}
                        </span>
                        <span className="text-[10px] text-[#8A9590]">
                          {splitMode === 'CashCheque' || splitMode === 'BankCheque' ? 'Pending Clearance' : 'Secondary Portion'}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder={splitMode === 'CashCard' ? 'Enter card amount' : splitMode === 'CashBank' ? 'Enter bank amount' : 'Enter cheque amount'}
                        value={splitSecondaryInput}
                        onChange={e => handleSplitSecondaryChange(e.target.value)}
                        className="w-full p-2 text-sm font-bold text-[#17211D] border border-[#DCE3E0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                      />
                    </div>
                  </div>
                )}

                {/* Sub-Workflow 1: Cash + Card */}
                {splitMode === 'CashCard' && (
                  <div className="p-3.5 bg-white rounded-xl border border-[#DCE3E0] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-[#17211D] flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-[#125E45]" />
                        <span>Card Portion{splitSecondaryInput ? `: Rs. ${(parseFloat(splitSecondaryInput) || 0).toLocaleString()}` : ''}</span>
                      </div>
                      <span className="text-[10px] text-[#66726D]">POS Terminal Swipe</span>
                    </div>

                    {!isWholesaleTerminalEnabled ? (
                      <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1.5">
                        <div className="font-bold text-rose-900">Card Terminal Disabled in Settings</div>
                        <p className="text-[11px] text-rose-700">
                          Integrated terminal is disabled. Enter external machine auth code or enable in settings:
                        </p>
                        <div className="pt-1">
                          <label className="text-[10px] font-bold text-[#66726D] block mb-1">
                            External Terminal Card Auth / Ref #:
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
                          Cash (Rs. {(parseFloat(splitCashInput) || 0).toLocaleString()}) Received & Card (Rs. {(parseFloat(splitSecondaryInput) || 0).toLocaleString()}) Authorized
                        </span>
                        <span className="block text-[10px] text-[#66726D]">
                          Confirmed cash collected at counter and card transaction processed.
                        </span>
                      </div>
                    </label>
                  </div>
                )}

                {/* Sub-Workflow 2: Cash + Bank Transfer OR Cash + Bank + Cheque (Bank Portion) */}
                {(splitMode === 'CashBank' || splitMode === 'CashBankCheque') && (
                  <div className="p-3.5 bg-white rounded-xl border border-[#DCE3E0] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-[#17211D] flex items-center gap-1.5">
                        <Building className="w-4 h-4 text-[#125E45]" />
                        <span>Bank Transfer Portion{splitMode === 'CashBankCheque' ? (splitBankInput ? `: Rs. ${(parseFloat(splitBankInput) || 0).toLocaleString()}` : '') : (splitSecondaryInput ? `: Rs. ${(parseFloat(splitSecondaryInput) || 0).toLocaleString()}` : '')}</span>
                      </div>
                      <span className="text-[10px] text-[#66726D]">Online / IBFT</span>
                    </div>

                    {bankAccounts.length === 0 ? (
                      <p className="text-xs text-[#C23D45]">
                        No bank accounts configured in Store Settings.
                      </p>
                    ) : bankAccounts.length === 1 ? (
                      <div className="p-3 bg-[#F6F8F7] rounded-xl border border-[#DCE3E0] space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="font-bold text-xs text-[#17211D] flex items-center gap-1.5 min-w-0">
                            <Building className="w-3.5 h-3.5 text-[#125E45] shrink-0" />
                            <span className="truncate">{bankAccounts[0].bankName}</span>
                          </span>
                          <span className="text-[10px] text-[#66726D] truncate">{bankAccounts[0].accountTitle}</span>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-2 bg-white rounded-lg border border-[#DCE3E0] mt-1">
                          <div className="min-w-0">
                            <span className="text-[9px] text-[#8A9590] block">Account Number for Customer Transfer:</span>
                            <span className="text-xs font-black font-mono text-[#17211D] tracking-wider select-all break-all">
                              {bankAccounts[0].accountNumber}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyAccount(bankAccounts[0].accountNumber, bankAccounts[0].id)}
                            className="px-2 py-1 bg-[#F6F8F7] hover:bg-[#DCEDE6] text-[#125E45] border border-[#DCE3E0] rounded-md text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer shrink-0 self-start xs:self-center"
                          >
                            {copiedBankId === bankAccounts[0].id ? (
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
                    ) : (
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] font-bold text-[#66726D] block mb-1">
                            Select Receiving Bank:
                          </label>
                          <select
                            value={selectedBank?.id || bankAccounts[0]?.id || ''}
                            onChange={e => {
                              const found = bankAccounts.find(b => b.id === e.target.value);
                              if (found) setSelectedBank(found);
                            }}
                            className="w-full p-2 text-xs font-bold text-[#17211D] bg-white border border-[#DCE3E0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#197A5A] cursor-pointer"
                          >
                            {bankAccounts.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.bankName} — {b.accountTitle}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedBank && (
                          <div className="p-3 bg-[#F6F8F7] rounded-xl border border-[#DCE3E0] space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <span className="font-bold text-xs text-[#17211D] flex items-center gap-1.5 min-w-0">
                                <Building className="w-3.5 h-3.5 text-[#125E45] shrink-0" />
                                <span className="truncate">{selectedBank.bankName}</span>
                              </span>
                              <span className="text-[10px] text-[#66726D] truncate">{selectedBank.accountTitle}</span>
                            </div>
                            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-2 bg-white rounded-lg border border-[#DCE3E0] mt-1">
                              <div className="min-w-0">
                                <span className="text-[9px] text-[#8A9590] block">Account Number for Customer Transfer:</span>
                                <span className="text-xs font-black font-mono text-[#17211D] tracking-wider select-all break-all">
                                  {selectedBank.accountNumber}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyAccount(selectedBank.accountNumber, selectedBank.id)}
                                className="px-2 py-1 bg-[#F6F8F7] hover:bg-[#DCEDE6] text-[#125E45] border border-[#DCE3E0] rounded-md text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer shrink-0 self-start xs:self-center"
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
                      </div>
                    )}

                    <input
                      type="text"
                      placeholder="Bank Transfer Slip # / Sender Details (Optional)"
                      value={splitReference}
                      onChange={e => setSplitReference(e.target.value)}
                      className="w-full p-2 text-xs border border-[#DCE3E0] rounded-lg bg-white focus:outline-none"
                    />

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
                          Cash (Rs. {(parseFloat(splitCashInput) || 0).toLocaleString()}) Received & Bank Slip (Rs. {(parseFloat(splitMode === 'CashBankCheque' ? splitBankInput : splitSecondaryInput) || 0).toLocaleString()}) Verified
                        </span>
                        <span className="block text-[10px] text-[#66726D]">
                          Confirmed cash received in drawer and bank slip confirmed.
                        </span>
                      </div>
                    </label>
                  </div>
                )}

                {/* Sub-Workflow 3, 4 & 5: Cheque Details (Pending Clearance) */}
                {(splitMode === 'CashCheque' || splitMode === 'BankCheque' || splitMode === 'CashBankCheque') && (
                  <div className="p-3.5 bg-white rounded-xl border border-[#DCE3E0] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-[#17211D] flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#125E45]" />
                        <span>Cheque Details (Pending Clearance)</span>
                      </div>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                        {splitSecondaryInput ? `Rs. ${(parseFloat(splitSecondaryInput) || 0).toLocaleString()}` : 'Enter cheque amount'}
                      </span>
                    </div>

                    {/* Bank transfer info if Bank + Cheque (not 3-way since 3-way already shows bank above) */}
                    {splitMode === 'BankCheque' && (
                      <div className="p-2.5 bg-[#F6F8F7] rounded-xl border border-[#DCE3E0] space-y-2">
                        {bankAccounts.length === 0 ? (
                          <p className="text-xs text-[#C23D45]">
                            No bank accounts configured in Store Settings.
                          </p>
                        ) : bankAccounts.length === 1 ? (
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#17211D] flex items-center gap-1.5">
                              <Building className="w-3.5 h-3.5 text-[#125E45]" />
                              <span>{bankAccounts[0].bankName}</span>
                            </span>
                            <span className="text-[10px] text-[#66726D] font-mono">{bankAccounts[0].accountNumber}</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-[#66726D] block">
                              Select Receiving Bank:
                            </label>
                            <select
                              value={selectedBank?.id || bankAccounts[0]?.id || ''}
                              onChange={e => {
                                const found = bankAccounts.find(b => b.id === e.target.value);
                                if (found) setSelectedBank(found);
                              }}
                              className="w-full p-1.5 text-xs font-bold text-[#17211D] bg-white border border-[#DCE3E0] rounded-lg focus:outline-none"
                            >
                              {bankAccounts.map(b => (
                                <option key={b.id} value={b.id}>
                                  {b.bankName} — {b.accountTitle}
                                </option>
                              ))}
                            </select>
                            {selectedBank && (
                              <div className="text-[10px] text-[#125E45] font-bold font-mono">
                                Acc: {selectedBank.accountNumber}
                              </div>
                            )}
                          </div>
                        )}
                        <input
                          type="text"
                          placeholder="Bank Transfer Reference / Slip # (Optional)"
                          value={splitReference}
                          onChange={e => setSplitReference(e.target.value)}
                          className="w-full p-1.5 text-xs border border-[#DCE3E0] rounded-lg bg-white focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Multiple Cheques List & Management */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-[#17211D] flex items-center gap-1.5">
                          <span>Client Cheque(s) Details</span>
                          <span className="bg-[#DCEDE6] text-[#125E45] font-bold text-[10px] px-2 py-0.5 rounded-full">
                            {chequeEntries.length} {chequeEntries.length === 1 ? 'Cheque' : 'Cheques'}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={handleAddCheque}
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#DCEDE6] hover:bg-[#c2e4d7] text-[#125E45] border border-[#125E45]/30 transition-all cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Another Cheque</span>
                        </button>
                      </div>

                      {/* Cheque Cards */}
                      <div className="space-y-2.5">
                        {chequeEntries.map((cheque, index) => (
                          <div
                            key={cheque.id}
                            className="p-3 bg-white rounded-xl border border-[#DCE3E0] shadow-2xs space-y-2.5 relative"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-[#125E45] bg-[#F0F4F2] px-2 py-0.5 rounded-md border border-[#DCE3E0]">
                                Cheque #{index + 1}
                              </span>
                              {chequeEntries.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCheque(cheque.id)}
                                  className="text-[10px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Remove this cheque"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Remove</span>
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-semibold text-[#66726D] block mb-1">
                                  Cheque Bank Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Meezan Bank / HBL"
                                  value={cheque.bankName}
                                  onChange={e => handleUpdateCheque(cheque.id, 'bankName', e.target.value)}
                                  list="pk-banks-list"
                                  className="w-full p-2 text-xs font-bold border border-[#DCE3E0] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                                  required
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-semibold text-[#66726D] block mb-1">
                                  Cheque Amount (PKR) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  placeholder="Cheque Amount"
                                  value={cheque.amount}
                                  onChange={e => handleUpdateCheque(cheque.id, 'amount', e.target.value)}
                                  className="w-full p-2 text-xs font-black text-[#17211D] border border-[#DCE3E0] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                                  required
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                              <div>
                                <label className="text-[10px] font-semibold text-[#66726D] flex items-center gap-1 mb-1">
                                  <Calendar className="w-3 h-3 text-[#125E45]" />
                                  <span>Scheduled Passing Date & Month <span className="text-rose-500">*</span></span>
                                </label>
                                <input
                                  type="date"
                                  value={cheque.clearingDate}
                                  onChange={e => handleUpdateCheque(cheque.id, 'clearingDate', e.target.value)}
                                  className="w-full p-1.5 text-xs font-bold border border-[#DCE3E0] rounded-lg bg-[#F8FAFA] focus:outline-none focus:ring-1 focus:ring-[#197A5A] cursor-pointer"
                                  required
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-semibold text-[#66726D] block mb-1">
                                  Cheque / Leaf # (Optional)
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. CHQ-92810"
                                  value={cheque.chequeNumber}
                                  onChange={e => handleUpdateCheque(cheque.id, 'chequeNumber', e.target.value)}
                                  className="w-full p-1.5 text-xs font-mono border border-[#DCE3E0] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <datalist id="pk-banks-list">
                        <option value="Meezan Bank" />
                        <option value="Habib Bank Limited (HBL)" />
                        <option value="MCB Bank" />
                        <option value="Allied Bank Limited (ABL)" />
                        <option value="United Bank Limited (UBL)" />
                        <option value="Bank Alfalah" />
                        <option value="Askari Bank" />
                        <option value="Faysal Bank" />
                        <option value="Bank Al Habib" />
                        <option value="Dubai Islamic Bank" />
                      </datalist>

                      {/* Add Another Cheque Button */}
                      <button
                        type="button"
                        onClick={handleAddCheque}
                        className="w-full py-2 border-2 border-dashed border-[#125E45]/40 hover:border-[#125E45] bg-[#DCEDE6]/30 hover:bg-[#DCEDE6]/60 text-[#125E45] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Add Another Cheque for This Invoice</span>
                      </button>

                      {/* Cheques Summary Box */}
                      {chequeEntries.length > 1 && (
                        <div className="p-2.5 bg-[#DCEDE6]/50 rounded-lg border border-[#125E45]/20 flex items-center justify-between text-xs font-bold text-[#125E45]">
                          <span>Total Cheques ({chequeEntries.length}):</span>
                          <span className="text-sm font-black">
                            Rs. {chequeEntries.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0).toLocaleString()}
                          </span>
                        </div>
                      )}

                      <p className="text-[10px] text-[#66726D] leading-relaxed">
                        Notifications will alert Admin & Wholesale Cashier on each cheque&apos;s scheduled passing date. Cheque amounts will <strong>NOT</strong> be deducted from client balance until marked &quot;Pass Cheque (OK)&quot;.
                      </p>
                    </div>

                    {/* Important Account Ledger Notice */}
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-[11px] leading-relaxed">
                        Client ledger will reflect the full purchase of Rs. {finalWholesaleGrandTotal.toLocaleString()}. Only the immediate {splitMode === 'CashBankCheque' ? 'Cash & Bank' : splitMode === 'BankCheque' ? 'Bank' : 'Cash'} portion (Rs. {((parseFloat(splitCashInput) || 0) + (splitMode === 'CashBankCheque' ? (parseFloat(splitBankInput) || 0) : 0)).toLocaleString()}) will be credited now. The cheque portion (Rs. {(parseFloat(splitSecondaryInput) || 0).toLocaleString()}) remains in client ledger until passed.
                      </div>
                    </div>

                    {/* Checkbox for Bank Slip if Bank + Cheque */}
                    {splitMode === 'BankCheque' && (
                      <label
                        className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
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
                        <span className="text-xs font-semibold text-[#17211D]">
                          Bank transfer portion (Rs. {(parseFloat(splitCashInput) || 0).toLocaleString()}) slip verified.
                        </span>
                      </label>
                    )}

                    {/* Cheque Verified Checkbox */}
                    <label
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                        splitChequeVerified
                          ? 'bg-[#DCEDE6] border-[#125E45]'
                          : 'bg-[#F6F8F7] border-[#DCE3E0] hover:bg-[#F0F4F2]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={splitChequeVerified}
                        onChange={e => setSplitChequeVerified(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-[#125E45] rounded accent-[#125E45] cursor-pointer shrink-0"
                      />
                      <div className="text-xs text-[#17211D]">
                        <span className="font-bold">
                          Physical Cheque & Signature Verified
                        </span>
                        <span className="block text-[10px] text-[#66726D]">
                          Confirmed physical cheque details for Rs. {(parseFloat(splitSecondaryInput) || 0).toLocaleString()} payable to store.
                        </span>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Pandi Name / Carrier Loader Autocomplete */}
            <PandiSelectInput
              value={pandiName}
              onChange={(name, obj) => {
                setPandiName(name);
                setSelectedPandi(obj || null);
              }}
              label="Pandi Name"
              placeholder="Type or select Pandi name..."
            />

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
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-[#DCE3E0]">
              <Button variant="outline" size="md" onClick={() => setIsCheckoutOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleCompleteWholesaleSale}
                className="w-full sm:w-auto inline-flex items-center justify-center font-bold rounded-xl px-5 py-2.5 text-xs text-white bg-[#125E45] hover:bg-[#197A5A] active:scale-[0.98] transition-all shadow-2xs cursor-pointer gap-2"
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

        {/* MODAL: Card Terminal (Split Mode) */}
        <CardTerminalModal
          isOpen={isSplitCardTerminalModalOpen}
          onClose={() => setIsSplitCardTerminalModalOpen(false)}
          grandTotal={parseFloat(splitSecondaryInput) || 0}
          onPaymentSuccess={authData => {
            setSplitCardAuth(authData);
            setSplitCardVerified(true);
            setIsSplitCardTerminalModalOpen(false);
            toast({
              title: 'Card Payment Approved',
              description: `Split card portion of Rs. ${(parseFloat(splitSecondaryInput) || 0).toLocaleString()} authorized.`,
              type: 'success',
            });
          }}
        />

        {/* MODAL: Wholesale Pending Cheques Management */}
        <Modal
          isOpen={isPendingChequesModalOpen}
          onClose={() => setIsPendingChequesModalOpen(false)}
          title="Wholesale Uncleared & Pending Cheques"
          description="Manage client cheques awaiting bank clearance. Pass cheques to deduct from client ledgers on today's date."
          maxWidth="4xl"
        >
          <div className="space-y-4 text-xs select-none">
            {/* Category Origin Tabs: All, Wholesale, Khata/Credit POS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#F0F4F2] rounded-2xl border border-[#DCE3E0]">
              <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-[#DCE3E0]">
                <button
                  type="button"
                  onClick={() => setPendingOriginFilter('All')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    pendingOriginFilter === 'All'
                      ? 'bg-[#125E45] text-white shadow-2xs'
                      : 'text-[#66726D] hover:text-[#17211D]'
                  }`}
                >
                  All ({pendingCheques.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPendingOriginFilter('Wholesale')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    pendingOriginFilter === 'Wholesale'
                      ? 'bg-[#125E45] text-white shadow-2xs'
                      : 'text-[#66726D] hover:text-[#17211D]'
                  }`}
                >
                  Wholesale ({pendingCheques.filter(p => p.originType === 'Wholesale').length})
                </button>
                <button
                  type="button"
                  onClick={() => setPendingOriginFilter('Khata')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    pendingOriginFilter === 'Khata'
                      ? 'bg-[#125E45] text-white shadow-2xs'
                      : 'text-[#66726D] hover:text-[#17211D]'
                  }`}
                >
                  Khata / Credit POS ({pendingCheques.filter(p => p.originType === 'Khata').length})
                </button>
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-[#8A9590] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by customer, bank, or invoice..."
                  value={pendingChequesSearch}
                  onChange={e => setPendingChequesSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#DCE3E0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                />
              </div>
            </div>

            {/* Cheques Table */}
            <div className="overflow-x-auto border border-[#DCE3E0] rounded-2xl bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFA] border-b border-[#DCE3E0] text-[10px] font-bold text-[#8A9590] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Client / Customer</th>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Cheque Details</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3">Scheduled Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3E0]/60">
                  {pendingCheques
                    .filter(item => {
                      if (pendingOriginFilter === 'Wholesale' && item.originType !== 'Wholesale') return false;
                      if (pendingOriginFilter === 'Khata' && item.originType !== 'Khata') return false;
                      if (!pendingChequesSearch.trim()) return true;
                      const q = pendingChequesSearch.toLowerCase();
                      return (
                        item.customerName.toLowerCase().includes(q) ||
                        (item.cheque.chequeNumber || '').toLowerCase().includes(q) ||
                        (item.cheque.bankName || '').toLowerCase().includes(q) ||
                        (item.cheque.invoiceNumber || '').toLowerCase().includes(q)
                      );
                    })
                    .map(item => {
                      return (
                        <tr
                          key={`${item.collectionId}-${item.cheque.id}`}
                          className={`hover:bg-[#F0F4F2]/50 transition-colors ${
                            item.isDueToday
                              ? 'bg-amber-50/50'
                              : item.isOverdue
                              ? 'bg-rose-50/40'
                              : ''
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className="font-bold text-[#17211D]">{item.customerName}</div>
                            {item.customerPhone && (
                              <div className="text-[10px] text-[#8A9590]">{item.customerPhone}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-[#125E45]">
                            {item.cheque.invoiceNumber || item.receiptNumber.replace('CHQ-', '')}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-[#17211D]">
                              {item.cheque.chequeNumber || 'N/A'}
                            </div>
                            <div className="text-[10px] text-[#66726D]">{item.cheque.bankName || 'Bank'}</div>
                          </td>
                          <td className="py-3 px-3 text-right font-black text-sm text-[#17211D]">
                            Rs. {item.cheque.chequeAmount.toLocaleString()}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-[#17211D]">
                              {item.cheque.clearingDate
                                ? new Date(item.cheque.clearingDate).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : 'N/A'}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {item.isDueToday ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                                Due Today
                              </span>
                            ) : item.isOverdue ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 w-fit inline-block">
                                Overdue
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCEDE6] text-[#125E45] border border-[#125E45]/30 w-fit inline-block">
                                Scheduled
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handlePassCheque(item.collectionId, item.cheque.id)}
                              className="px-3 py-1.5 bg-[#125E45] hover:bg-[#197A5A] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="Click to pass cheque and deduct from client statement today"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Pass Cheque (OK)</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                  {pendingCheques.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#8A9590] text-xs">
                        No pending or uncleared wholesale cheques at this time.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Explanatory footer note */}
            <div className="p-3 bg-[#F0F4F2] rounded-xl border border-[#DCE3E0] text-[11px] text-[#66726D] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#125E45] shrink-0" />
              <span>
                Clicking <strong>&quot;Pass Cheque (OK)&quot;</strong> clears the cheque on today&apos;s date and automatically posts a CREDIT transaction to the client&apos;s ledger on today&apos;s statement, whether passed before, on, or after the scheduled date.
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="md" onClick={() => setIsPendingChequesModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      </AppShell>
    </ProtectedRoute>
  );
}
