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
  const [isKhataTerminalEnabled, setIsKhataTerminalEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return Boolean(storageService.getSettings().khataCardTerminal?.enabled);
    }
    return false;
  });

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
      setIsKhataTerminalEnabled(Boolean(settings.khataCardTerminal?.enabled));
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
    toast({
      title: 'Previous Work Resumed',
      description: 'Your previous Khata Credit POS session has been restored.',
      type: 'success',
    });
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
    toast({
      title: 'Draft Discarded',
      description: 'Previous unfinished Khata session was permanently cleared.',
      type: 'info',
    });
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

  // Categories list
  const categoryTabs = useMemo(() => {
    const base = [
      'All fabrics',
      'Lawn',
      'Cotton',
      'Khaddar',
      'Wash & Wear',
      'Silk & Chiffon',
      'Unstitched',
      'Thaan',
      'Cut Piece',
    ];
    const fromProds = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return Array.from(new Set([...base, ...fromProds]));
  }, [products]);

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
          description: 'Please verify the bank transfer slip and click "Confirm Payment" before completing.',
          type: 'error',
        });
        return;
      }
    }

    if (selectedCustomer && selectedCustomer.type !== 'Khata') {
      customersService.update(selectedCustomer.id, { type: 'Khata' });
    }

    const bill = salesService.completeSale({
      saleType: 'Khata',
      cartItems: khataCart,
      paymentMethod: method,
      amountReceived: method === 'Credit/Khata' ? 0 : method === 'Cash' ? cashReceived : finalKhataGrandTotal,
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
        method === 'Bank Transfer' && selectedBank
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
                    <span className="bg-[#DCEDE6] text-[#125E45] text-xs font-semibold px-3 py-0.5 rounded-full">
                      Active credit account
                    </span>
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

              {/* CATEGORY FILTER PILLS (Matching Wholesale POS rounded-full) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
                {categoryTabs.map(cat => {
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

              {/* PRODUCT CATALOG HEADER (Count + Sorting Dropdown matching Wholesale POS) */}
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
              <div className="p-4 bg-[#F0F4F2] rounded-2xl border border-[#DCE3E0] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#66726D]">Net Amount Due:</span>
                  <div className="text-2xl font-black text-[#17211D]">
                    Rs. {finalKhataGrandTotal.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <span className="bg-[#DCEDE6] text-[#125E45] text-xs font-semibold px-2.5 py-1 rounded-full inline-block mb-1">
                    Khata Credit Counter
                  </span>
                  <div className="text-[11px] text-[#66726D]">
                    {selectedCustomer ? (selectedCustomer.businessName || selectedCustomer.name) : customerName.trim() || 'Select Khata Account'}
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#17211D] block">
                  Settlement Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'Credit/Khata', label: 'Credit / Khata', icon: BookOpen },
                    { id: 'Cash', label: 'Cash Payment', icon: Banknote },
                    { id: 'Bank Transfer', label: 'Bank Transfer', icon: Building },
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
                          }
                        }}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#DCEDE6] text-[#125E45] border-[#125E45]'
                            : 'bg-white border-[#DCE3E0] text-[#66726D] hover:bg-[#F0F4F2]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{m.label}</span>
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
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCE3E0]">
                <Button variant="outline" size="md" onClick={() => setIsCheckoutOpen(false)}>
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={() => handleFinalizeSale(paymentMethod)}
                  disabled={isCashInsufficient || (paymentMethod === 'Bank Transfer' && (!isBankPaymentConfirmed || !selectedBank))}
                  className={`inline-flex items-center justify-center font-bold rounded-xl px-5 py-2.5 text-xs text-white bg-[#125E45] hover:bg-[#197A5A] active:scale-[0.98] transition-all shadow-2xs cursor-pointer gap-2 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed`}
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
