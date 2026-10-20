'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { WholesaleInvoicePrint } from '@/components/print/WholesaleInvoicePrint';
import { PrintableWholesaleReturn } from '@/components/print/PrintableWholesaleReturn';
import { PrintableWholesaleExchange } from '@/components/print/PrintableWholesaleExchange';
import { KhataStatementPrint } from '@/components/print/KhataStatementPrint';
import { WholesaleBillSearchModal } from '@/components/wholesale-pos/WholesaleBillSearchModal';
import { WholesaleReturnModal } from '@/components/wholesale-pos/WholesaleReturnModal';
import { WholesaleExchangeModal } from '@/components/wholesale-pos/WholesaleExchangeModal';
import {
  BookOpen,
  Search,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Printer,
  Clock,
  Sparkles,
  Check,
  History,
  AlertTriangle,
  ChevronDown,
  User,
  SlidersHorizontal,
  X,
  CreditCard,
  Banknote,
  Building,
  CheckCircle2,
  Scan,
  Barcode as BarcodeIcon,
  ShoppingBag,
  Layers,
  Copy,
  FileText,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { productsService } from '@/services/productsService';
import { customersService } from '@/services/customersService';
import { salesService } from '@/services/salesService';
import { storageService } from '@/services/storageService';
import { khataSessionService } from '@/services/khataSessionService';
import { barcodeScannerService } from '@/services/hardware/barcodeScannerService';
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
  Pandi,
  SplitMode,
} from '@/types';
import { PandiSelectInput } from '@/components/pandi/PandiSelectInput';

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
    restoreKhataCart,
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

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All fabrics');
  const [sortOption, setSortOption] = useState<'inStock' | 'recent' | 'priceAsc' | 'priceDesc'>('inStock');
  const [visibleCount, setVisibleCount] = useState(9);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [currentTime, setCurrentTime] = useState<string>('');

  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return salesService.peekNextInvoiceNumber('Khata');
    }
    return 'KHT-2026-000001';
  });

  // Work Session Resume State
  const [availableDraft, setAvailableDraft] = useState<KhataSessionDraft | null>(null);
  const [hasCheckedDraft, setHasCheckedDraft] = useState(false);

  // Khata Checkout State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit/Khata');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [pandiName, setPandiName] = useState('');
  const [selectedPandi, setSelectedPandi] = useState<Pandi | null>(null);

  // Bank Transfer Payment States
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    if (typeof window !== 'undefined') {
      const allBanks = storageService.getSettings().bankAccounts || [];
      return allBanks.filter(b => b.isActive !== false && (!b.channels || b.channels.length === 0 || b.channels.includes('Khata')));
    }
    return [];
  });
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(() => {
    if (typeof window !== 'undefined') {
      const allBanks = storageService.getSettings().bankAccounts || [];
      const banks = allBanks.filter(b => b.isActive !== false && (!b.channels || b.channels.length === 0 || b.channels.includes('Khata')));
      return banks.length > 0 ? banks[0] : null;
    }
    return null;
  });
  const [isBankPaymentConfirmed, setIsBankPaymentConfirmed] = useState(false);

  // Card Terminal Payment States
  const [cardPaymentState, setCardPaymentState] = useState<CardPaymentState>('idle');
  const [cardStatusMessage, setCardStatusMessage] = useState('');
  const [cardTransactionId, setCardTransactionId] = useState<string | undefined>(undefined);
  const [isKhataTerminalEnabled, setIsKhataTerminalEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return Boolean(storageService.getSettings().khataCardTerminal?.enabled);
    }
    return false;
  });

  // Split / Mixed Payment States (Khata POS: Cash + Bank, Cash + Cheque, Bank + Cheque, Cash + Bank + Cheque - NO CARD)
  const [splitMode, setSplitMode] = useState<Exclude<SplitMode, 'CashCard'>>('CashBank');
  const [splitCashInput, setSplitCashInput] = useState<string>('');
  const [splitBankInput, setSplitBankInput] = useState<string>('');
  const [splitSecondaryInput, setSplitSecondaryInput] = useState<string>('');
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
  // Multiple Cheques State for Khata Finalize
  const [chequeEntries, setChequeEntries] = useState<Array<{
    id: string;
    bankName: string;
    chequeNumber: string;
    amount: string;
    clearingDate: string;
  }>>([
    {
      id: 'khata-chq-init-1',
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
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);

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

  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // Live Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-PK', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }) +
          ' • ' +
          now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus and storage sync
  useEffect(() => {
    const refreshData = () => {
      setProducts(productsService.getAll());
      setNextInvoiceNumber(salesService.peekNextInvoiceNumber('Khata'));
      const settings = storageService.getSettings();
      const banks = (settings.bankAccounts || []).filter(
        b => b.isActive !== false && (!b.channels || b.channels.length === 0 || b.channels.includes('Khata'))
      );
      setBankAccounts(banks);
      if (banks.length > 0) {
        setSelectedBank(prev => (prev && banks.some(b => b.id === prev.id)) ? prev : banks[0]);
      } else {
        setSelectedBank(null);
      }
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

  // Auto-save active khata draft to persistent storage
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
      restoreKhataCart(availableDraft.cartItems);
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
      khataSessionService.discardDraft(currentStaff.id);
    }
    setAvailableDraft(null);
    clearKhataCart();
    setSelectedCustomer(null);
    setCustomerName('');
    setNotes('');
    setCashReceived(0);
  };

  // Keyboard Shortcuts (F1: Barcode, F2: Search, F8: Charge)
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
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (khataCart.length > 0 && selectedCustomer) {
          handleDirectChargeKhata();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [khataCart.length, selectedCustomer]);

  // Filtered Products (matching Wholesale POS sorting & search)
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = products.filter(p => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode?.includes(q) ||
        p.wholesaleBarcode?.includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q));

      const matchesCat =
        selectedCategory === 'All fabrics' ||
        selectedCategory === 'All' ||
        p.category.toLowerCase() === selectedCategory.toLowerCase() ||
        (selectedCategory === 'Silk & Chiffon' &&
          (p.category.toLowerCase().includes('silk') || p.category.toLowerCase().includes('chiffon')));

      return matchesSearch && matchesCat;
    });

    if (sortOption === 'priceAsc') {
      list.sort((a, b) => (a.khataPrice || a.wholesalePrice) - (b.khataPrice || b.wholesalePrice));
    } else if (sortOption === 'priceDesc') {
      list.sort((a, b) => (b.khataPrice || b.wholesalePrice) - (a.khataPrice || a.wholesalePrice));
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

  // Paginated displayed products
  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

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
        addToKhataCart(matched);
        barcodeScannerService.playSuccessBeep();
        toast({
          title: `Added: ${matched.name}`,
          description: `Khata Rate: PKR ${(matched.khataPrice || Math.round(matched.wholesalePrice * 1.05)).toLocaleString()}`,
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

  // Filtered Khata Customers for dropdowns
  const allCustomers = useMemo(() => customersService.getAll(), []);

  const khataAccountsList = useMemo(() => {
    const q = accountSearchQuery.toLowerCase().trim();
    return allCustomers.filter(c => {
      const isKhata = c.type === 'Khata' || (c.creditLimit && c.creditLimit > 0);
      if (!isKhata) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.businessName && c.businessName.toLowerCase().includes(q)) ||
        c.phone.includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    });
  }, [allCustomers, accountSearchQuery]);

  const shopperSuggestions = useMemo(() => {
    const q = customerSearchQuery.toLowerCase().trim();
    if (!q) return allCustomers.slice(0, 8);
    return allCustomers
      .filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.businessName && c.businessName.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [allCustomers, customerSearchQuery]);

  // Dynamic Tax Calculation
  const { khataTaxAmount, khataTaxRate } = useMemo(() => {
    const storeTaxRate = storageService.getSettings()?.defaultTaxRate || 0;
    let taxSum = 0;
    let taxableBase = 0;
    khataCart.forEach(item => {
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
      khataTaxAmount: Math.round(taxSum),
      khataTaxRate: avgRate,
    };
  }, [khataCart]);

  const finalKhataGrandTotal = khataSubtotal - khataDiscountTotal + khataTaxAmount;

  // Credit Limit Calculations
  const currentBalance = selectedCustomer?.currentBalance ?? selectedCustomer?.balance ?? 0;
  const creditLimit = selectedCustomer?.creditLimit || 0;
  const newProjectedBalance = currentBalance + finalKhataGrandTotal;
  const availableCredit = Math.max(0, creditLimit - currentBalance);
  const availableCreditAfterCharge = Math.max(0, creditLimit - newProjectedBalance);
  const isLimitExceeded = creditLimit > 0 && newProjectedBalance > creditLimit;
  const excessAmount = isLimitExceeded ? newProjectedBalance - creditLimit : 0;

  const totalMetres = useMemo(() => {
    return khataCart.reduce((sum, item) => sum + item.quantity, 0);
  }, [khataCart]);

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
    const remaining = Math.max(0, Math.round((finalKhataGrandTotal - num) * 100) / 100);
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
    const remaining = Math.max(0, Math.round((finalKhataGrandTotal - num) * 100) / 100);
    setSplitCashInput(String(remaining));
  };

  const handleSplit3WayChange = (field: 'cash' | 'bank' | 'cheque', val: string) => {
    if (field === 'cash') {
      setSplitCashInput(val);
      if (val === '') return;
      const c = parseFloat(val) || 0;
      const b = parseFloat(splitBankInput) || 0;
      const rem = Math.max(0, Math.round((finalKhataGrandTotal - c - b) * 100) / 100);
      setSplitSecondaryInput(String(rem));
      if (chequeEntries.length === 1) {
        setChequeEntries([{ ...chequeEntries[0], amount: rem > 0 ? String(rem) : '' }]);
      }
    } else if (field === 'bank') {
      setSplitBankInput(val);
      if (val === '') return;
      const b = parseFloat(val) || 0;
      const c = parseFloat(splitCashInput) || 0;
      const rem = Math.max(0, Math.round((finalKhataGrandTotal - c - b) * 100) / 100);
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
      const rem = Math.max(0, Math.round((finalKhataGrandTotal - c - chq) * 100) / 100);
      setSplitBankInput(String(rem));
    }
  };

  const handleAddCheque = () => {
    const primary = (parseFloat(splitCashInput) || 0) + (splitMode === 'CashBankCheque' ? (parseFloat(splitBankInput) || 0) : 0);
    const existingChequesSum = chequeEntries.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    const remaining = Math.max(0, Math.round((finalKhataGrandTotal - primary - existingChequesSum) * 100) / 100);

    const prevDate = chequeEntries[chequeEntries.length - 1]?.clearingDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d.toISOString().split('T')[0];
    })();
    const prevBank = chequeEntries[chequeEntries.length - 1]?.bankName || 'Meezan Bank';

    const newCheque = {
      id: `khata-chq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
        const remaining = Math.max(0, Math.round((finalKhataGrandTotal - totalCheques) * 100) / 100);
        setSplitCashInput(remaining > 0 ? String(remaining) : '');
      } else if (splitMode === 'CashBankCheque') {
        const c = parseFloat(splitCashInput) || 0;
        const remaining = Math.max(0, Math.round((finalKhataGrandTotal - c - totalCheques) * 100) / 100);
        setSplitBankInput(remaining > 0 ? String(remaining) : '');
      }
    }
  };

  // Open Checkout Modal
  const handleOpenCheckout = () => {
    if (khataCart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add fabrics to the bill before charging to Khata.',
        type: 'warning',
      });
      return;
    }
    if (!selectedCustomer) {
      toast({
        title: 'Khata Account Required',
        description: 'Please select a registered Khata customer / credit account first.',
        type: 'error',
      });
      return;
    }

    setPaymentMethod('Credit/Khata');
    setCashReceived(khataGrandTotal);
    setIsBankPaymentConfirmed(false);
    setCardPaymentState('idle');
    setCardTransactionId(undefined);

    // Reset Split states
    setSplitMode('CashBank');
    setSplitCashInput('');
    setSplitBankInput('');
    setSplitSecondaryInput('');
    setSplitBankSlipVerified(false);
    setSplitChequeVerified(false);
    setSplitReference('');
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setChequeEntries([
      {
        id: `khata-chq-${Date.now()}`,
        bankName: 'Meezan Bank',
        chequeNumber: '',
        amount: '',
        clearingDate: d.toISOString().split('T')[0],
      },
    ]);
    setIsCheckoutOpen(true);
  };

  // Direct Charge to Khata Account (Instant 1-Click action as in design)
  const handleDirectChargeKhata = () => {
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
        description: 'Please select a customer / Khata account to charge.',
        type: 'error',
      });
      return;
    }

    setPaymentMethod('Credit/Khata');
    handleFinalizeSale('Credit/Khata');
  };

  // Trigger Card Payment
  const handleStartCardPayment = async () => {
    if (!isKhataTerminalEnabled) {
      toast({
        title: 'Card Terminal Disabled',
        description: 'Khata Card Terminal is disabled in Store Settings.',
        type: 'error',
      });
      return;
    }

    setCardPaymentState('waiting_card');
    setCardStatusMessage('Waiting for customer card tap/insert on terminal...');
    const result = await cardTerminalService.startCardPayment(finalKhataGrandTotal, (state, msg) => {
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
  const handleFinalizeSale = (method: PaymentMethod = paymentMethod) => {
    if (!currentStaff) return;
    if (!selectedCustomer) {
      toast({
        title: 'Khata Account Required',
        description: 'Please select a customer / Khata account to finalize.',
        type: 'warning',
      });
      return;
    }

    // Validation per payment method
    if (method === 'Cash') {
      if (cashReceived < finalKhataGrandTotal) {
        toast({
          title: 'Insufficient Cash Tendered',
          description: 'Cannot finalize invoice with insufficient cash received.',
          type: 'error',
        });
        return;
      }
    } else if (method === 'Card') {
      if (!isKhataTerminalEnabled) {
        toast({
          title: 'Card Terminal Disabled',
          description: 'Khata Card Terminal is disabled in Store Settings.',
          type: 'error',
        });
        return;
      }
      if (cardPaymentState !== 'authorized' || !cardTransactionId) {
        toast({
          title: 'Card Payment Incomplete',
          description: 'Please wait for the card terminal payment to be approved.',
          type: 'error',
        });
        return;
      }
    } else if (method === 'Bank Transfer') {
      if (!isBankPaymentConfirmed || !selectedBank) {
        toast({
          title: 'Payment Verification Required',
          description: 'Please verify the bank transfer slip and click "Confirm Slip Received" before completing.',
          type: 'error',
        });
        return;
      }
    } else if (method === 'Split') {
      const primaryAmt = parseFloat(splitCashInput) || 0;
      const bankAmt = parseFloat(splitBankInput) || 0;
      const secondaryAmt = parseFloat(splitSecondaryInput) || 0;
      const totalSplit = splitMode === 'CashBankCheque' ? (primaryAmt + bankAmt + secondaryAmt) : (primaryAmt + secondaryAmt);

      if (Math.round(totalSplit) < Math.round(finalKhataGrandTotal)) {
        toast({
          title: 'Incomplete Split Payment',
          description: `Total split payment (Rs. ${totalSplit.toLocaleString()}) is less than net payable (Rs. ${finalKhataGrandTotal.toLocaleString()}).`,
          type: 'error',
        });
        return;
      }

      if (splitMode === 'CashBank' || splitMode === 'BankCheque' || splitMode === 'CashBankCheque') {
        if (!splitBankSlipVerified) {
          toast({
            title: 'Bank Transfer Slip Required',
            description: 'Please verify the bank transfer portion slip and confirm checkbox.',
            type: 'warning',
          });
          return;
        }
      }

      if (splitMode === 'CashCheque' || splitMode === 'BankCheque' || splitMode === 'CashBankCheque') {
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

    if (selectedCustomer && selectedCustomer.type !== 'Khata') {
      customersService.update(selectedCustomer.id, { type: 'Khata' });
    }

    const primaryAmt = parseFloat(splitCashInput) || 0;
    const bankAmt = parseFloat(splitBankInput) || 0;
    const secondaryAmt = parseFloat(splitSecondaryInput) || 0;

    const bill = salesService.completeSale({
      saleType: 'Khata',
      cartItems: khataCart,
      paymentMethod: method,
      amountReceived:
        method === 'Credit/Khata'
          ? 0
          : method === 'Cash'
          ? cashReceived
          : method === 'Split'
          ? (splitMode === 'CashBankCheque'
              ? (primaryAmt + bankAmt)
              : (splitMode === 'CashCheque' || splitMode === 'BankCheque'
                  ? primaryAmt
                  : finalKhataGrandTotal))
          : finalKhataGrandTotal,
      discountTotal: khataDiscountTotal,
      taxTotal: khataTaxAmount,
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      counter: currentStaff.counter,
      customer: selectedCustomer,
      customerName: customerName.trim() || undefined,
      customerPhone: selectedCustomer.phone,
      clientId: selectedCustomer.id,
      clientName: selectedCustomer.businessName || selectedCustomer.name,
      cardTransactionId: method === 'Card' ? cardTransactionId : undefined,
      pandiId: selectedPandi?.id,
      pandiName: pandiName.trim() || undefined,
      bankDetails:
        (method === 'Bank Transfer' || (method === 'Split' && (splitMode === 'CashBank' || splitMode === 'BankCheque' || splitMode === 'CashBankCheque'))) && selectedBank
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
        method === 'Split'
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
                splitMode === 'CashBank'
                  ? 'Bank Transfer'
                  : 'Cheque',
              secondaryAmount: secondaryAmt,
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

    khataSessionService.clearDraft(currentStaff.id);

    const updatedCustomer = customersService.getById(selectedCustomer.id);
    if (updatedCustomer) {
      setSelectedCustomer(updatedCustomer);
    }

    setCompletedBill(bill);
    clearKhataCart();
    setCashReceived(0);
    setNotes('');
    setPandiName('');
    setSelectedPandi(null);
    setSplitCashInput('');
    setSplitBankInput('');
    setSplitSecondaryInput('');
    setSplitReference('');
    setSplitBankSlipVerified(false);
    setSplitChequeVerified(false);
    const dReset = new Date();
    dReset.setDate(dReset.getDate() + 7);
    setChequeEntries([
      {
        id: `khata-chq-${Date.now()}`,
        bankName: 'Meezan Bank',
        chequeNumber: '',
        amount: '',
        clearingDate: dReset.toISOString().split('T')[0],
      },
    ]);
    setIsCheckoutOpen(false);
    setIsInvoiceModalOpen(true);
    setProducts(productsService.getAll());
    setNextInvoiceNumber(salesService.peekNextInvoiceNumber('Khata'));

    toast({
      title: 'Khata Credit Sale Recorded',
      description: `Invoice #${bill.invoiceNumber} recorded and debited to ${selectedCustomer.name}'s Khata ledger.`,
      type: 'success',
    });
  };

  const calculatedChange = Math.max(0, cashReceived - finalKhataGrandTotal);
  const isCashInsufficient = paymentMethod === 'Cash' && cashReceived < finalKhataGrandTotal;

  return (
    <ProtectedRoute permission="pos_khata">
      <AppShell>
        <div className="space-y-4 max-w-[1750px] mx-auto select-none pb-12 font-sans text-[#17211D]">
          {/* ============================================================== */}
          {/* 1. TOP HEADER / NAVBAR (Exact sequence matching Image 1) */}
          {/* ============================================================== */}
          <div className="bg-white rounded-2xl border border-[#DCE3E0] px-4 py-2.5 shadow-2xs flex items-center justify-between gap-4 flex-wrap xl:flex-nowrap">
            {/* Left: Logo & Title + Metadata */}
            <div className="flex items-center gap-6 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-[#197A5A] flex items-center justify-center text-white shrink-0 shadow-2xs">
                  <Scan className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-[#17211D] leading-none">
                    Khata Credit POS
                  </h1>
                  <p className="text-[11px] text-[#66726D] mt-0.5">
                    Main Store • {currentStaff?.counter || 'Counter 03'}
                  </p>
                </div>
              </div>

              {/* Metadata Columns */}
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
                    {currentStaff?.name || 'Ayesha Khan'}
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

            {/* Right: Search Bills/Returns + Time */}
            <div className="flex items-center gap-3 shrink-0 ml-auto">
              <button
                type="button"
                onClick={() => setIsBillSearchOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCE3E0] bg-white hover:bg-[#F0F4F2] text-xs font-semibold text-[#17211D] transition-colors shadow-2xs cursor-pointer"
                title="Search past bills or process returns"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#197A5A]" />
                <span>Search Bills/Returns</span>
              </button>

              <div className="text-right pl-3 border-l border-[#DCE3E0]">
                <div className="font-bold text-xs text-[#17211D] font-mono leading-tight">
                  {currentTime || '17 Oct 2026 • 10:42 AM'}
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* PERSISTENT WORK SESSION RESUME BANNER */}
          {/* ============================================================== */}
          {availableDraft && (
            <div className="p-3 rounded-2xl bg-[#DCEDE6] border border-[#197A5A]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#125E45] text-white flex items-center justify-center font-bold shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#125E45] flex items-center gap-2">
                    <span>Unfinished Khata Session Detected</span>
                    <span className="text-[10px] bg-white text-[#125E45] px-1.5 py-0.2 rounded font-mono font-semibold">
                      {new Date(availableDraft.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#66726D]">
                    {availableDraft.cartItems?.length || 0} fabric(s) • Total: PKR{' '}
                    {availableDraft.grandTotal?.toLocaleString() || 0}
                    {availableDraft.selectedClient ? ` • Account: ${availableDraft.selectedClient.businessName || availableDraft.selectedClient.name}` : ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="px-2.5 py-1 text-[#C23D45] hover:bg-[#C23D45]/10 font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Discard Draft
                </button>
                <button
                  type="button"
                  onClick={handleResumeDraft}
                  className="px-3 py-1 bg-[#125E45] hover:bg-[#197A5A] text-white font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Resume Work</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 2. MAIN WORKSPACE GRID: CATALOG (LEFT) vs CURRENT BILL (RIGHT) */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT COLUMN: Customer Card + Search + Catalog (8 of 12) */}
            <div className="lg:col-span-8 space-y-4">
              {/* Card 1: Customer & Khata Account */}
              <div className="bg-white rounded-2xl border border-[#DCE3E0] p-4 sm:p-5 shadow-2xs space-y-4">
                {/* Header Row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-[#17211D]">
                    Customer & Khata account
                  </h2>
                  <div className="flex items-center gap-2">
                    {(customerName.trim() || selectedCustomer) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerName('');
                          setSelectedCustomer(null);
                        }}
                        className="text-xs font-semibold text-[#C23D45] hover:underline cursor-pointer ml-1"
                      >
                        Switch Account
                      </button>
                    )}
                  </div>
                </div>

                {/* Dual Input Fields (Side by Side) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Field 1: Customer Name (Person visiting / taking fabric) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#17211D] mb-1.5">
                      Customer Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#8A9590] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Enter person / visitor name..."
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#DCE3E0] hover:border-[#197A5A] focus:border-[#197A5A] rounded-xl text-xs font-semibold text-[#17211D] placeholder:text-[#8A9590] placeholder:font-normal focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Field 2: Khata Account */}
                  <div className="relative" ref={accountDropdownRef}>
                    <label className="block text-xs font-semibold text-[#17211D] mb-1.5">
                      Khata Account
                    </label>
                    {selectedCustomer ? (
                      <div className="w-full flex items-center justify-between px-3.5 py-2 bg-[#DCEDE6] border border-[#197A5A]/50 rounded-xl text-xs font-semibold text-[#125E45]">
                        <div className="flex items-center gap-2 truncate">
                          <Building className="w-4 h-4 text-[#125E45] shrink-0" />
                          <span className="truncate">
                            {selectedCustomer.businessName || selectedCustomer.name} · {selectedCustomer.id}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(null);
                            setAccountSearchQuery('');
                          }}
                          className="text-xs font-bold text-[#C23D45] hover:underline cursor-pointer ml-2 shrink-0"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="w-4 h-4 text-[#8A9590] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Type or search Khata account (e.g. Raza Fabrics)..."
                          value={accountSearchQuery}
                          onChange={e => {
                            setAccountSearchQuery(e.target.value);
                            setIsAccountDropdownOpen(true);
                          }}
                          onFocus={() => setIsAccountDropdownOpen(true)}
                          className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#DCE3E0] hover:border-[#197A5A] focus:border-[#197A5A] rounded-xl text-xs text-[#17211D] placeholder:text-[#8A9590] focus:outline-none transition-colors"
                        />
                        {isAccountDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-[#DCE3E0] shadow-xl p-2 z-40 max-h-56 overflow-y-auto">
                            {khataAccountsList.length === 0 ? (
                              <div className="p-3 text-xs text-center text-[#8A9590]">
                                No matching Khata account found
                              </div>
                            ) : (
                              khataAccountsList.map(acc => (
                                <button
                                  key={acc.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCustomer(acc);
                                    setIsAccountDropdownOpen(false);
                                    setAccountSearchQuery('');
                                  }}
                                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-[#E9F3EF] text-xs transition-colors cursor-pointer"
                                >
                                  <div>
                                    <div className="font-bold text-[#17211D]">
                                      {acc.businessName ? `${acc.businessName} (${acc.name})` : acc.name}
                                    </div>
                                    <div className="text-[11px] text-[#66726D] font-mono">
                                      ID: {acc.id} • {acc.phone}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-[10px] text-[#66726D]">Balance:</div>
                                    <div className="font-bold font-mono text-[#125E45] text-xs">
                                      PKR {(acc.currentBalance ?? acc.balance ?? 0).toLocaleString()}
                                    </div>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Account Balance & Credit Stats Banner */}
                <div className="bg-[#F0F4F2] border border-[#DCE3E0] rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-[#66726D] block">
                      Current balance owed
                    </span>
                    <span className="text-sm font-bold text-[#17211D] font-mono mt-0.5 block">
                      PKR {currentBalance.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-[#66726D] block">
                      Available credit
                    </span>
                    <span className="text-sm font-bold text-[#197A5A] font-mono mt-0.5 block">
                      PKR {availableCredit.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-[#66726D] block">
                      Credit limit
                    </span>
                    <span className="text-sm font-bold text-[#17211D] font-mono mt-0.5 block">
                      PKR {creditLimit.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Credit Limit Alert Banner */}
                {isLimitExceeded && (
                  <div className="p-2.5 rounded-xl bg-[#FDE8E9] border border-[#C23D45] flex items-center gap-2 text-xs text-[#C23D45] font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-[#C23D45]" />
                    <span>
                      Alert: This sale will exceed {selectedCustomer?.name}&apos;s credit limit (PKR {creditLimit.toLocaleString()}) by PKR {excessAmount.toLocaleString()}!
                    </span>
                  </div>
                )}
              </div>

              {/* SEARCH FABRIC NAME, SKU OR TYPE (Matching Wholesale POS) */}
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
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-[#8A9590] hover:text-[#17211D] mr-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
                <span className="px-1.5 py-0.5 rounded bg-[#F0F4F2] text-[10px] text-[#8A9590] font-mono border border-[#DCE3E0]">
                  F2
                </span>
              </div>

              {/* PRODUCT CATALOG HEADER (Count + Sorting Dropdown matching Wholesale POS) */}
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

              {/* PRODUCT CARDS GRID (Exact Wholesale POS Card UI/UX) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {displayedProducts.map(prod => {
                  const isOutOfStock = prod.stock <= 0;
                  const seasonTag = prod.seasonCategory
                    ? `${prod.seasonCategory} '26`
                    : prod.subcategory || 'Summer \'26';

                  const inCart = khataCart.find(i => i.product.id === prod.id);
                  const khataPrice = prod.khataPrice || Math.round(prod.wholesalePrice * 1.05);

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
                          {prod.category} · {prod.subcategory || prod.description || '58-inch width'}
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
                            PKR {khataPrice.toLocaleString()}
                          </div>
                          {inCart && (
                            <div className="text-[10px] text-[#197A5A] font-semibold mt-0.5">
                              {inCart.quantity} {prod.unit || 'm'} added
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => !isOutOfStock && addToKhataCart(prod)}
                          disabled={isOutOfStock}
                          className="w-8 h-8 rounded-lg bg-[#125E45] hover:bg-[#197A5A] disabled:bg-slate-300 text-white flex items-center justify-center font-bold text-lg transition-colors shadow-2xs cursor-pointer active:scale-95 disabled:cursor-not-allowed"
                          title={`Add ${prod.name} to Khata invoice`}
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

            {/* ============================================================== */}
            {/* RIGHT COLUMN: CURRENT BILL PANEL (Exact Wholesale POS UX/UI) */}
            {/* ============================================================== */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-[#DCE3E0] p-4 shadow-2xs flex flex-col justify-between sticky top-4 min-h-[580px] max-h-[calc(100vh-8.5rem)] overflow-hidden">
              <div className="shrink-0 space-y-3">
                {/* Cart Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#DCE3E0]/70">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base text-[#17211D]">Current Bill</h2>
                    <span className="bg-[#DCEDE6] text-[#125E45] text-xs font-semibold px-2 py-0.5 rounded-full">
                      {khataCart.length} {khataCart.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {khataCart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Clear active Khata bill?')) {
                          clearKhataCart();
                        }
                      }}
                      className="p-1.5 rounded-lg border border-[#DCE3E0] text-[#8A9590] hover:text-[#C23D45] hover:bg-[#F0F4F2] transition-colors cursor-pointer"
                      title="Clear Bill"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Customer Section */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#17211D] block">
                    Customer & Khata Account
                  </label>
                  <div className="border border-[#DCE3E0] rounded-xl px-3 py-2 text-xs text-[#17211D] bg-[#F0F4F2] flex items-center justify-between">
                    <span className="font-semibold truncate">
                      {selectedCustomer ? (selectedCustomer.businessName || selectedCustomer.name) : 'Select Khata Account'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAccountDropdownOpen(true)}
                      className="text-xs font-semibold text-[#125E45] hover:underline cursor-pointer ml-2 shrink-0"
                    >
                      Change
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-[#66726D] truncate">
                      {customerName.trim() ? `Customer: ${customerName.trim()}` : 'No customer name entered'} {selectedCustomer ? `· ID: ${selectedCustomer.id}` : ''}
                    </span>
                    <span className="text-[#8A9590] font-mono text-[10px]">
                      #{nextInvoiceNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cart Items List - Internally Scrollable matching Wholesale POS */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 my-2 min-h-[200px] max-h-[340px]">
                {khataCart.length === 0 ? (
                  <div className="py-6 text-center text-[#8A9590] text-xs space-y-1.5">
                    <ShoppingBag className="w-7 h-7 text-[#C7D2CD] mx-auto" />
                    <p className="font-semibold text-[#17211D]">Bill is empty</p>
                    <p className="text-[11px] text-[#66726D]">
                      Scan fabric barcode or click [+] on a fabric to add to Khata bill.
                    </p>
                  </div>
                ) : (
                  khataCart.map(item => {
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
                            onClick={() => removeFromKhataCart(item.product.id)}
                            className="text-[#C23D45] hover:opacity-80 p-0.5 cursor-pointer shrink-0 transition-opacity"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Line 2: Spec / SKU & Unit Rate */}
                        <div className="flex items-center justify-between text-[11px] text-[#66726D]">
                          <span>
                            {item.product.sku} · Qty: {item.quantity}
                          </span>
                          <span className="text-[#8A9590] text-[10px]">
                            PKR {unitPrice.toLocaleString()}
                          </span>
                        </div>

                        {/* Line 3: Quantity Controls + Rs Discount Input + Line Total */}
                        <div className="flex items-center justify-between pt-1 gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="border border-[#DCE3E0] rounded-lg flex items-center gap-1.5 px-2 h-7 text-xs text-[#17211D] bg-white shadow-2xs">
                              <button
                                type="button"
                                onClick={() => updateKhataQuantity(item.product.id, Math.max(1, item.quantity - 1))}
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
                                    updateKhataQuantity(item.product.id, clamped);
                                  }
                                }}
                                className="font-bold min-w-[20px] max-w-[34px] text-center text-xs text-[#17211D] bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateKhataQuantity(item.product.id, Math.min(item.product.stock, item.quantity + 1))}
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
                                  updateKhataExtraDiscount(item.product.id, val);
                                }}
                                className="w-14 px-2 text-xs font-bold font-mono text-center text-[#16835B] bg-transparent focus:outline-none placeholder:text-[#8A9590] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          </div>

                          <div className="font-bold text-sm text-[#17211D] shrink-0">
                            PKR {item.lineTotal.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Financial Totals & Khata Impact Box */}
              <div className="shrink-0 pt-2 border-t border-[#DCE3E0] space-y-2 bg-white">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[#66726D]">
                    <span>Subtotal</span>
                    <span className="font-medium text-[#17211D]">
                      PKR {khataSubtotal.toLocaleString()}
                    </span>
                  </div>

                  {khataDiscountTotal > 0 && (
                    <div className="flex items-center justify-between text-[#66726D]">
                      <span>Discount</span>
                      <span className="font-semibold text-[#16835B]">
                        − PKR {khataDiscountTotal.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {khataTaxAmount > 0 && (
                    <div className="flex items-center justify-between text-[#66726D]">
                      <span>Tax ({khataTaxRate}%)</span>
                      <span className="font-semibold text-[#17211D]">
                        PKR {khataTaxAmount.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-[#DCE3E0] pt-1.5 mt-1 flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#17211D]">Total to charge</span>
                    <span className="font-black text-xl text-[#17211D]">
                      PKR {finalKhataGrandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Balance Impact Preview Box */}
                <div className="p-2.5 bg-[#F0F4F2] rounded-xl border border-[#DCE3E0] space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#66726D]">Balance after charge:</span>
                    <span className="font-bold text-[#17211D]">
                      PKR {newProjectedBalance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#66726D]">Credit remaining:</span>
                    <span className={`font-bold ${isLimitExceeded ? 'text-[#C23D45]' : 'text-[#197A5A]'}`}>
                      PKR {availableCreditAfterCharge.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Primary Proceed to Tender Button (F8) */}
                <button
                  type="button"
                  onClick={handleOpenCheckout}
                  disabled={khataCart.length === 0 || !selectedCustomer}
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
                  Credit / Khata settlement, cash, or bank transfer
                </p>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* MODAL: Khata Settlement & Payment Modes (Identical to Wholesale, Card Terminal Removed) */}
          {/* ============================================================== */}
          <Modal
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            title="Finalize Khata Credit Invoice"
            description="Confirm billing details, settlement method, and ledger posting status."
            maxWidth="2xl"
          >
            <div className="space-y-4 text-xs select-none">
              {/* Net Due Header */}
              <div className="p-3.5 sm:p-4 bg-[#F0F4F2] rounded-2xl border border-[#DCE3E0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <span className="text-[11px] sm:text-xs text-[#66726D]">Net Amount Due:</span>
                  <div className="text-xl sm:text-2xl font-black text-[#17211D]">
                    Rs. {finalKhataGrandTotal.toLocaleString()}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="bg-[#DCEDE6] text-[#125E45] text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full inline-block mb-1">
                    Khata Credit Counter
                  </span>
                  <div className="text-[11px] text-[#66726D] truncate max-w-full sm:max-w-xs">
                    {selectedCustomer ? (selectedCustomer.businessName || selectedCustomer.name) : customerName.trim() || 'Select Khata Account'}
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#17211D] block">
                  Settlement Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  {[
                    { id: 'Credit/Khata', label: 'Credit / Khata', icon: BookOpen },
                    { id: 'Cash', label: 'Cash Payment', icon: Banknote },
                    { id: 'Bank Transfer', label: 'Bank Transfer', icon: Building },
                    { id: 'Split', label: 'Split / Mixed', icon: Layers },
                  ].map(m => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(m.id as PaymentMethod);
                          if (m.id === 'Credit/Khata') {
                            setCashReceived(0);
                          } else if (m.id === 'Cash') {
                            setCashReceived(Math.round(finalKhataGrandTotal));
                          } else if (m.id === 'Split') {
                            setSplitMode('CashBank');
                            setSplitCashInput('');
                            setSplitBankInput('');
                            setSplitSecondaryInput('');
                            setSplitBankSlipVerified(false);
                            setSplitChequeVerified(false);
                            setSplitReference('');
                          }
                        }}
                        className={`p-2 sm:p-3 rounded-xl border flex flex-col items-center justify-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#DCEDE6] text-[#125E45] border-[#125E45]'
                            : 'bg-white border-[#DCE3E0] text-[#66726D] hover:bg-[#F0F4F2]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span className="truncate max-w-full">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CREDIT / KHATA LEDGER WORKFLOW */}
              {paymentMethod === 'Credit/Khata' && (
                <div className="p-4 bg-[#F7EEDC] rounded-2xl border border-[#9A6A16]/30 space-y-2">
                  <div className="font-bold text-[#17211D] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-[#9A6A16]" />
                      <span>Ledger Credit Charging</span>
                    </div>
                    {selectedCustomer && (
                      <span className="text-[11px] font-mono text-[#9A6A16]">
                        Current Balance: Rs. {selectedCustomer.currentBalance.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#66726D]">
                    Net invoice amount <strong>Rs. {finalKhataGrandTotal.toLocaleString()}</strong> will be charged directly to the ledger account of{' '}
                    <strong>{selectedCustomer?.businessName || selectedCustomer?.name || 'Customer'}</strong>.
                  </p>
                  {customerName.trim() && (
                    <div className="text-[11px] text-[#17211D] bg-white/70 p-2 rounded-lg border border-[#9A6A16]/20">
                      <span className="text-[#66726D]">Visitor / Bearer picking up: </span>
                      <strong>{customerName.trim()}</strong>
                    </div>
                  )}
                  {selectedCustomer && selectedCustomer.creditLimit > 0 && (
                    <div className="pt-2 border-t border-[#9A6A16]/20 flex justify-between text-[11px]">
                      <span className="text-[#66726D]">Credit Limit: Rs. {selectedCustomer.creditLimit.toLocaleString()}</span>
                      <span className={`font-semibold ${selectedCustomer.currentBalance + finalKhataGrandTotal > selectedCustomer.creditLimit ? 'text-[#C23D45]' : 'text-[#125E45]'}`}>
                        Projected: Rs. {(selectedCustomer.currentBalance + finalKhataGrandTotal).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

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
                  {cashReceived >= finalKhataGrandTotal && (
                    <div className="p-3 bg-[#DCEDE6] rounded-xl text-xs flex justify-between font-bold text-[#125E45]">
                      <span>Change Due Customer:</span>
                      <span className="text-sm font-black">
                        Rs. {calculatedChange.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* BANK TRANSFER DETAILS (Matched to Wholesale POS) */}
              {paymentMethod === 'Bank Transfer' && (
                <div className="p-4 bg-[#F0F4F2] rounded-2xl border border-[#DCE3E0] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#17211D] flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-[#125E45]" />
                      <span>Bank Transfer Receiving Details</span>
                    </span>
                    <span className="text-[10px] text-[#66726D]">Online / IBFT</span>
                  </div>

                  {bankAccounts.length === 0 ? (
                    <p className="text-xs text-[#C23D45]">
                      No bank accounts configured in Store Settings.
                    </p>
                  ) : bankAccounts.length === 1 ? (
                    <div className="p-3 bg-white rounded-xl border border-[#DCE3E0] space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-bold text-xs text-[#17211D] flex items-center gap-1.5 min-w-0">
                          <Building className="w-3.5 h-3.5 text-[#125E45] shrink-0" />
                          <span className="truncate">{bankAccounts[0].bankName}</span>
                        </span>
                        <span className="text-[10px] text-[#66726D] truncate">{bankAccounts[0].accountTitle}</span>
                      </div>
                      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-2 bg-[#F6F8F7] rounded-lg border border-[#DCE3E0] mt-1">
                        <div className="min-w-0">
                          <span className="text-[9px] text-[#8A9590] block">Account Number for Customer Transfer:</span>
                          <span className="text-xs font-black font-mono text-[#17211D] tracking-wider select-all break-all">
                            {bankAccounts[0].accountNumber}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyAccount(bankAccounts[0].accountNumber, bankAccounts[0].id)}
                          className="px-2 py-1 bg-white hover:bg-[#DCEDE6] text-[#125E45] border border-[#DCE3E0] rounded-md text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer shrink-0 self-start xs:self-center"
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
                        <div className="p-3 bg-white rounded-xl border border-[#DCE3E0] space-y-1">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="font-bold text-xs text-[#17211D] flex items-center gap-1.5 min-w-0">
                              <Building className="w-3.5 h-3.5 text-[#125E45] shrink-0" />
                              <span className="truncate">{selectedBank.bankName}</span>
                            </span>
                            <span className="text-[10px] text-[#66726D] truncate">{selectedBank.accountTitle}</span>
                          </div>
                          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-2 bg-[#F6F8F7] rounded-lg border border-[#DCE3E0] mt-1">
                            <div className="min-w-0">
                              <span className="text-[9px] text-[#8A9590] block">Account Number for Customer Transfer:</span>
                              <span className="text-xs font-black font-mono text-[#17211D] tracking-wider select-all break-all">
                                {selectedBank.accountNumber}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyAccount(selectedBank.accountNumber, selectedBank.id)}
                              className="px-2 py-1 bg-white hover:bg-[#DCEDE6] text-[#125E45] border border-[#DCE3E0] rounded-md text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer shrink-0 self-start xs:self-center"
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

              {/* SPLIT / MIXED WORKFLOW (4 Modes: Cash+Bank, Cash+Cheque, Bank+Cheque, Cash+Bank+Cheque - NO CARD) */}
              {paymentMethod === 'Split' && (
                <div className="space-y-3.5 p-3 sm:p-4 bg-[#F8FAFA] rounded-2xl border border-[#DCE3E0]">
                  {/* Mode Selector (4 Tabs) */}
                  <div className="space-y-1.5">
                    <div>
                      <span className="text-xs font-bold text-[#17211D] block mb-1">Split Mode Selection:</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-1.5 p-1 bg-white rounded-xl border border-[#DCE3E0]">
                      <button
                        type="button"
                        onClick={() => {
                          setSplitMode('CashBank');
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
                            <Banknote className="w-3.5 h-3.5 text-[#125E45] shrink-0" />
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
                            <Building className="w-3.5 h-3.5 text-[#125E45] shrink-0" />
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
                            <FileText className="w-3.5 h-3.5 text-[#125E45] shrink-0" />
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
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

                      {/* Portion 2: Bank or Cheque Amount */}
                      <div className="p-3 bg-white rounded-xl border border-[#DCE3E0] space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#17211D] flex items-center gap-1.5">
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
                          placeholder={splitMode === 'CashBank' ? 'Enter bank amount' : 'Enter cheque amount'}
                          value={splitSecondaryInput}
                          onChange={e => handleSplitSecondaryChange(e.target.value)}
                          className="w-full p-2 text-sm font-bold text-[#17211D] border border-[#DCE3E0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#197A5A]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Sub-Workflow: Bank Transfer Receiving Info (when Cash+Bank or Cash+Bank+Cheque) */}
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

                  {/* Sub-Workflow: Cheque Details (when Cash+Cheque, Bank+Cheque, or Cash+Bank+Cheque) */}
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
                                    list="pk-banks-list-khata"
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

                        <datalist id="pk-banks-list-khata">
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
                          Notification will alert Admin on each cheque&apos;s scheduled passing date. Cheque amounts will <strong>NOT</strong> be deducted from client balance until marked &quot;Pass Cheque (OK)&quot;.
                        </p>
                      </div>

                      {/* Important Account Ledger Notice */}
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-[11px] leading-relaxed">
                          Client ledger will reflect the full purchase of Rs. {finalKhataGrandTotal.toLocaleString()}. Only the immediate {splitMode === 'CashBankCheque' ? 'Cash & Bank' : splitMode === 'BankCheque' ? 'Bank' : 'Cash'} portion (Rs. {((parseFloat(splitCashInput) || 0) + (splitMode === 'CashBankCheque' ? (parseFloat(splitBankInput) || 0) : 0)).toLocaleString()}) will be credited now. The cheque portion (Rs. {(parseFloat(splitSecondaryInput) || 0).toLocaleString()}) remains in client ledger until passed.
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
                label="Pandi Name / Delivery Loader"
                placeholder="Type or select Pandi name..."
              />

              {/* Notes / PO Reference */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#17211D]">
                  Khata Reference / Gate Pass / Builty Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sent via loader Haji Bashir, gate pass # 410"
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
                  onClick={() => handleFinalizeSale(paymentMethod)}
                  disabled={
                    isCashInsufficient ||
                    (paymentMethod === 'Bank Transfer' && (!isBankPaymentConfirmed || !selectedBank)) ||
                    (paymentMethod === 'Split' && (
                      splitMode === 'CashBankCheque'
                        ? ((parseFloat(splitCashInput) || 0) + (parseFloat(splitBankInput) || 0) + (parseFloat(splitSecondaryInput) || 0)) < finalKhataGrandTotal
                        : ((parseFloat(splitCashInput) || 0) + (parseFloat(splitSecondaryInput) || 0)) < finalKhataGrandTotal
                    ))
                  }
                  className={`w-full sm:w-auto inline-flex items-center justify-center font-bold rounded-xl px-5 py-2.5 text-xs text-white bg-[#125E45] hover:bg-[#197A5A] active:scale-[0.98] transition-all shadow-2xs cursor-pointer gap-2 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed`}
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Complete Sale & Save Invoice</span>
                </button>
              </div>
            </div>
          </Modal>

          {/* ============================================================== */}
          {/* SEARCH BILLS & HISTORICAL RETURNS MODAL */}
          {/* ============================================================== */}
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

          {/* Return Modal */}
          {billForAction && (
            <WholesaleReturnModal
              isOpen={isReturnModalOpen}
              onClose={() => {
                setIsReturnModalOpen(false);
                setBillForAction(null);
              }}
              bill={billForAction}
              onReturnCompleted={(retTx, updatedBill) => {
                setCompletedReturn(retTx);
                setBillForAction(updatedBill);
                setIsReturnPrintOpen(true);
                setProducts(productsService.getAll());
              }}
            />
          )}

          {/* Exchange Modal */}
          {billForAction && (
            <WholesaleExchangeModal
              isOpen={isExchangeModalOpen}
              onClose={() => {
                setIsExchangeModalOpen(false);
                setBillForAction(null);
              }}
              bill={billForAction}
              onExchangeCompleted={(excTx, updatedBill) => {
                setCompletedExchange(excTx);
                setBillForAction(updatedBill);
                setIsExchangePrintOpen(true);
                setProducts(productsService.getAll());
              }}
            />
          )}

          {/* Return Print Modal */}
          {completedReturn && (
            <Modal
              isOpen={isReturnPrintOpen}
              onClose={() => {
                setIsReturnPrintOpen(false);
                setCompletedReturn(null);
              }}
              title={`Return Slip #${completedReturn.id}`}
              maxWidth="4xl"
            >
              <PrintableWholesaleReturn
                returnTx={completedReturn}
                bill={billForAction}
                onClose={() => {
                  setIsReturnPrintOpen(false);
                  setCompletedReturn(null);
                }}
              />
            </Modal>
          )}

          {/* Exchange Print Modal */}
          {completedExchange && (
            <Modal
              isOpen={isExchangePrintOpen}
              onClose={() => {
                setIsExchangePrintOpen(false);
                setCompletedExchange(null);
              }}
              title={`Exchange Voucher #${completedExchange.id}`}
              maxWidth="4xl"
            >
              <PrintableWholesaleExchange
                exchangeTx={completedExchange}
                bill={billForAction}
                onClose={() => {
                  setIsExchangePrintOpen(false);
                  setCompletedExchange(null);
                }}
              />
            </Modal>
          )}

          {/* Completed Sale Invoice Print Modal */}
          <Modal
            isOpen={isInvoiceModalOpen}
            onClose={() => setIsInvoiceModalOpen(false)}
            title={`Invoice #${completedBill?.invoiceNumber || ''}`}
            maxWidth="4xl"
          >
            {completedBill && (
              <WholesaleInvoicePrint
                bill={completedBill}
                onClose={() => setIsInvoiceModalOpen(false)}
              />
            )}
          </Modal>

          {/* Khata Statement Modal */}
          {selectedCustomer && (
            <Modal
              isOpen={isStatementModalOpen}
              onClose={() => setIsStatementModalOpen(false)}
              title={`${selectedCustomer.name} - Khata Statement`}
              maxWidth="4xl"
            >
              <KhataStatementPrint
                customer={selectedCustomer}
                transactions={customersService.getKhataTransactions(selectedCustomer.id)}
                onClose={() => setIsStatementModalOpen(false)}
              />
            </Modal>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
