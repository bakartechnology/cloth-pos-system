'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
} from 'lucide-react';
import { productsService } from '@/services/productsService';
import { salesService } from '@/services/salesService';
import { storageService } from '@/services/storageService';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { Product, Bill } from '@/types';
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
    clearRetailCart,
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
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card'>('Cash');
  // Cash received state - empty by default so user enters manually or clicks quick cash
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('');

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

  // Refresh Real Products & Next Invoice Number & Terminal Access
  const loadRealData = () => {
    const all = productsService.getAll();
    setProducts(all);
    setNextInvoiceNumber(salesService.peekNextInvoiceNumber('Retail'));
    const settings = storageService.getSettings();
    setIsCardTerminalEnabled(Boolean(settings.retailCardTerminal?.enabled));
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
    // Do NOT prefill with 0 - start with empty input so user can type or click quick cash
    setCashReceivedInput('');
    setIsCheckoutOpen(true);
  };

  // Step: Click "Confirm Cash & Open Drawer"
  const handleConfirmCashAndOpenDrawer = () => {
    if (parsedCashReceived < retailGrandTotal) {
      toast({
        title: 'Insufficient Cash',
        description: `Total due is Rs. ${retailGrandTotal.toLocaleString()}. Received Rs. ${parsedCashReceived.toLocaleString()}.`,
        type: 'error',
      });
      return;
    }

    // Close tender modal and open Cash Drawer modal (exact screen from reference)
    setIsCheckoutOpen(false);
    setIsCashDrawerModalOpen(true);
  };

  // Finalize Sale: Saves to salesService (writes to Retail Statement & Bill History)
  const handleFinalizeSale = (params?: { cardAuth?: CardPaymentResponse }) => {
    if (!currentStaff) return;

    // Strict validation: Block card bill submission if terminal disabled in Store Settings
    if (paymentMethod === 'Card') {
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
      paymentMethod === 'Cash' ? parsedCashReceived || retailGrandTotal : retailGrandTotal;

    // Use salesService to complete sale so it logs to Retail Statements and Bill history
    const bill = salesService.completeSale({
      saleType: 'Retail',
      cartItems: retailCart,
      paymentMethod,
      amountReceived: finalAmountReceived,
      discountTotal: retailDiscountTotal,
      taxTotal: 0,
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      customerName: customerName.trim() === 'Walk-in customer' ? undefined : customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      cardTransactionId: params?.cardAuth?.transactionId,
    });

    setCompletedBill(bill);
    clearRetailCart();
    setCashReceivedInput('');
    setCustomerName('Walk-in customer');
    setCustomerPhone('');
    setIsCheckoutOpen(false);
    setIsCashDrawerModalOpen(false);
    setIsCardTerminalModalOpen(false);
    setIsReceiptModalOpen(true);

    // Refresh products stock & next invoice
    loadRealData();

    toast({
      title: 'Sale Completed & Logged',
      description: `Invoice ${bill.invoiceNumber} recorded in Retail Statement.`,
      type: 'success',
    });
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
                    {currentStaff?.name || 'Ayesha Khan'}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-[#8A9590] uppercase tracking-wider block">
                    COUNTER
                  </span>
                  <span className="text-xs font-bold text-[#17211D]">
                    Counter 03
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
                  <label className="text-xs font-semibold text-[#17211D] block">
                    Customer
                  </label>
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

                        {/* Line 3: Quantity Controls + Line Total */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="border border-[#DCE3E0] rounded-lg flex items-center gap-2.5 px-2 py-0.5 text-xs text-[#17211D] bg-white">
                            <button
                              type="button"
                              onClick={() => updateRetailQuantity(item.product.id, item.quantity - 1)}
                              className="text-[#66726D] hover:text-[#17211D] font-bold text-sm cursor-pointer"
                            >
                              −
                            </button>
                            <span className="font-bold min-w-[14px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateRetailQuantity(item.product.id, item.quantity + 1)}
                              className="text-[#66726D] hover:text-[#17211D] font-bold text-sm cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <div className="font-bold text-sm text-[#17211D]">
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

                  <div className="border-t border-[#DCE3E0] pt-1.5 mt-1 flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#17211D]">Total</span>
                    <span className="font-black text-xl text-[#17211D]">
                      Rs {retailGrandTotal.toLocaleString()}
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
            maxWidth="md"
          >
            <div className="space-y-4 select-none">
              {/* Net Due Header */}
              <div className="p-4 bg-[#F0F4F2] rounded-2xl border border-[#DCE3E0] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#66726D]">Net Amount Due:</span>
                  <div className="text-2xl font-black text-[#17211D]">
                    Rs. {retailGrandTotal.toLocaleString()}
                  </div>
                </div>
                <span className="bg-[#DCEDE6] text-[#125E45] text-xs font-semibold px-2.5 py-1 rounded-full">
                  Retail Counter
                </span>
              </div>

              {/* Payment Method Switcher */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#17211D]">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cash')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === 'Cash'
                        ? 'bg-[#DCEDE6] text-[#125E45] border-[#125E45]'
                        : 'bg-white border-[#DCE3E0] text-[#66726D] hover:bg-[#F0F4F2]'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Cash Tender</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('Card');
                      if (!isCardTerminalEnabled) {
                        toast({
                          title: 'Card Terminal Disabled',
                          description: 'Retail Card Terminal is disabled in Store Settings. Bill cannot be submitted via card.',
                          type: 'warning',
                        });
                      }
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === 'Card'
                        ? isCardTerminalEnabled
                          ? 'bg-[#DCEDE6] text-[#125E45] border-[#125E45]'
                          : 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-white border-[#DCE3E0] text-[#66726D] hover:bg-[#F0F4F2]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" />
                      <span>Card / POS Swipe</span>
                    </div>
                    {!isCardTerminalEnabled && (
                      <span className="text-[10px] text-rose-600 font-normal">
                        (Disabled in Settings)
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Card Terminal Settings Status Warning */}
              {paymentMethod === 'Card' && !isCardTerminalEnabled && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-900">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    <span>Card Terminal Disabled in Store Settings</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    Retail Card Terminal is currently turned OFF in Admin Store Settings. Card payment cannot be authorized and this bill cannot be submitted or created via card until enabled in Settings.
                  </p>
                </div>
              )}

              {/* Cash Tender Details & Quick Cash Buttons */}
              {paymentMethod === 'Cash' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#17211D]">Cash Received</label>
                    <input
                      type="number"
                      placeholder="Enter cash received (e.g. 5000)"
                      value={cashReceivedInput}
                      onChange={e => setCashReceivedInput(e.target.value)}
                      className="w-full p-2.5 text-sm font-bold text-[#17211D] border border-[#DCE3E0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#197A5A] placeholder:text-[#8A9590]"
                    />
                  </div>

                  {/* Quick Cash Buttons (500, 1000, 2000, 5000, 10000) */}
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
                          className="py-1.5 rounded-lg border border-[#DCE3E0] bg-[#F6F8F7] hover:bg-[#DCEDE6] hover:text-[#125E45] hover:border-[#125E45] text-xs font-bold text-[#17211D] transition-colors cursor-pointer"
                        >
                          {amount.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Change Due Display */}
                  {parsedCashReceived >= retailGrandTotal && (
                    <div className="p-3 bg-[#DCEDE6] rounded-xl text-xs flex justify-between font-bold text-[#125E45]">
                      <span>Change Due to Customer:</span>
                      <span className="text-sm font-black">
                        Rs. {changeDue.toLocaleString()}
                      </span>
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

                {paymentMethod === 'Cash' ? (
                  <button
                    type="button"
                    onClick={handleConfirmCashAndOpenDrawer}
                    className="px-5 py-2.5 bg-[#125E45] hover:bg-[#197A5A] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                  >
                    Confirm Cash & Open Drawer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isCardTerminalEnabled) {
                        toast({
                          title: 'Card Payment Blocked',
                          description: 'Retail Card Terminal is disabled in Store Settings. Bill cannot be submitted.',
                          type: 'error',
                        });
                        return;
                      }
                      setIsCheckoutOpen(false);
                      setIsCardTerminalModalOpen(true);
                    }}
                    disabled={!isCardTerminalEnabled}
                    className="px-5 py-2.5 bg-[#125E45] hover:bg-[#197A5A] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                  >
                    {isCardTerminalEnabled ? 'Authorize Card Terminal' : 'Card Terminal Disabled in Settings'}
                  </button>
                )}
              </div>
            </div>
          </Modal>

          {/* CASH DRAWER MODAL (Exact flow from user screenshot) */}
          <CashDrawerModal
            isOpen={isCashDrawerModalOpen}
            onClose={() => setIsCashDrawerModalOpen(false)}
            grandTotal={retailGrandTotal}
            cashReceived={parsedCashReceived}
            changeDue={changeDue}
            onCompleteSale={() => handleFinalizeSale()}
          />

          {/* CARD TERMINAL MODAL */}
          <CardTerminalModal
            isOpen={isCardTerminalModalOpen}
            onClose={() => setIsCardTerminalModalOpen(false)}
            grandTotal={retailGrandTotal}
            onPaymentSuccess={authData => handleFinalizeSale({ cardAuth: authData })}
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
