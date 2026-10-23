'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import {
  Barcode as BarcodeIcon,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Check,
  Package,
  Ruler,
  Boxes,
  Copy,
  AlertTriangle,
  Info,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { productsService } from '@/services/productsService';
import { inventoryService } from '@/services/inventoryService';
import { storageService } from '@/services/storageService';
import {
  MALE_FABRIC_CATEGORIES,
  FEMALE_FABRIC_CATEGORIES,
} from '@/data/fabricCategories';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ProductCategory, UnitType, SeasonCategory, StoreBusinessMode } from '@/types';

// Packaging unit presets for Female fabrics
const FEMALE_PRESET_UNITS = [
  { id: '3-Piece Box (Dabba)', label: '3-Piece Box', icon: '📦', type: 'box' },
  { id: '2-Piece Box (Dabba)', label: '2-Piece Box', icon: '📦', type: 'box' },
  { id: 'Thaan (Meter / Yard)', label: 'Thaan (Roll)', icon: '🧵', type: 'thaan' },
  { id: '3-Piece Suit (3PC)', label: '3-Piece Suit', icon: '👗', type: 'suit' },
  { id: '2-Piece Suit (2PC)', label: '2-Piece Suit', icon: '👗', type: 'suit' },
  { id: 'Stitched Suit', label: 'Stitched Suit', icon: '✨', type: 'suit' },
  { id: '1-Piece', label: '1-Piece', icon: '👚', type: 'suit' },
];

// Packaging unit presets for Male fabrics
const MALE_PRESET_UNITS = [
  { id: 'Men Suit', label: 'Men Suit', icon: '👔', type: 'thaan' },
  { id: 'Stitched Suit', label: 'Stitched Suit', icon: '✨', type: 'suit' },
];

export default function AddProductPage() {
  const router = useRouter();
  const { currentStaff } = useAuth();
  const { toast } = useToast();

  // Read saved default settings
  const initialSettings = storageService.getSettings();

  // Gender / Department state (defaults from Settings)
  const [fabricGender, setFabricGender] = useState<'Both' | 'Female' | 'Male'>(
    initialSettings.defaultFabricGender || 'Both'
  );
  const [selectedUnitGender, setSelectedUnitGender] = useState<'Female' | 'Male' | null>(null);

  // Store Business Mode state (Retail, Wholesale, or Both)
  const [storeMode, setStoreMode] = useState<StoreBusinessMode>(
    initialSettings.storeBusinessMode || 'Both'
  );

  // Category Combobox Dropdown State
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [highlightedCategoryIndex, setHighlightedCategoryIndex] = useState<number>(0);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const categoryWrapperRef = useRef<HTMLDivElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const seasonCategoryRef = useRef<HTMLButtonElement>(null);
  const seasonWrapperRef = useRef<HTMLDivElement>(null);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
  const [highlightedSeasonIndex, setHighlightedSeasonIndex] = useState<number>(0);

  // Helper to jump to first rate input in Section 3 or Section 4
  const focusFirstRateInput = () => {
    setTimeout(() => {
      const firstRate = document.querySelector<HTMLInputElement>('[data-first-rate-input="true"]');
      if (firstRate) {
        firstRate.focus();
        firstRate.select();
      }
    }, 60);
  };

  const handleSelectUnit = (selectedUnit: UnitType, gender?: 'Female' | 'Male') => {
    setUnit(selectedUnit);
    if (gender) {
      setSelectedUnitGender(gender);
    }
    if (selectedUnit === 'Men Suit') {
      setThaanType('Single');
      setRetailThaanType('Single');
    }
    focusFirstRateInput();
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryWrapperRef.current && !categoryWrapperRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (seasonWrapperRef.current && !seasonWrapperRef.current.contains(event.target as Node)) {
        setIsSeasonDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Section 1: Basic Information
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<ProductCategory>('' as ProductCategory);
  const [seasonCategory, setSeasonCategory] = useState<SeasonCategory | ''>('');
  const [unit, setUnit] = useState<UnitType | ''>('');
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);
  const [barcode, setBarcode] = useState('896400100001');
  const [suitBarcode, setSuitBarcode] = useState('896400200001');

  // Section 2: Box / Dabba Setup - Wholesale
  const [boxSuitsPerBox, setBoxSuitsPerBox] = useState<number | ''>('');
  const [boxTotalBoxes, setBoxTotalBoxes] = useState<number | ''>('');
  const [boxWholesalePerSuit, setBoxWholesalePerSuit] = useState<number | ''>('');

  // Section 2: Box / Dabba Setup - Retail
  const [retailBoxSuitsPerBox, setRetailBoxSuitsPerBox] = useState<number | ''>('');
  const [retailBoxTotalBoxes, setRetailBoxTotalBoxes] = useState<number | ''>('');
  const [boxRetailPerSuit, setBoxRetailPerSuit] = useState<number | ''>('');

  // Stock Warning Alerts (Separate for Wholesale & Retail)
  const [wholesaleMinStockAlert, setWholesaleMinStockAlert] = useState<number | ''>('');
  const [retailMinStockAlert, setRetailMinStockAlert] = useState<number | ''>('');
  const [minStockAlert, setMinStockAlert] = useState<number | ''>('');

  // Section 3: Thaan Setup
  const [thaanMeasurement, setThaanMeasurement] = useState<'Meter' | 'Yard'>('Meter');
  const [thaanType, setThaanType] = useState<'Single' | '3Thaan' | 'Sets'>('Single');
  const [thaanLengthMode, setThaanLengthMode] = useState<'Equal' | 'Individual'>('Equal');
  const [thaanEqualLength, setThaanEqualLength] = useState<number | ''>('');
  const [thaanTotalRolls, setThaanTotalRolls] = useState<number | ''>('');
  const [thaanKameezLength, setThaanKameezLength] = useState<number | ''>('');
  const [thaanShalwarLength, setThaanShalwarLength] = useState<number | ''>('');
  const [thaanDupattaLength, setThaanDupattaLength] = useState<number | ''>('');
  const [thaanWholesalePrice, setThaanWholesalePrice] = useState<number | ''>('');
  const [thaanPerUnitRetailRate, setThaanPerUnitRetailRate] = useState<number | ''>('');
  const [thaanRetailRollPrice, setThaanRetailRollPrice] = useState<number | ''>('');
  const [thaanSetsCount, setThaanSetsCount] = useState<number | ''>('');
  const [thaanSetType, setThaanSetType] = useState<string>('');
  const [thaanSuitsPerSet, setThaanSuitsPerSet] = useState<number | ''>('');
  const [thaanSetWholesaleRate, setThaanSetWholesaleRate] = useState<number | ''>('');
  const [thaanSetRetailRate, setThaanSetRetailRate] = useState<number | ''>('');
  // Section 4 Retail Thaan Setup (Independent from Wholesale)
  const [retailThaanMeasurement, setRetailThaanMeasurement] = useState<'Meter' | 'Yard'>('Meter');
  const [retailThaanType, setRetailThaanType] = useState<'Single' | '3Thaan' | 'Sets'>('Single');
  const [retailThaanEqualLength, setRetailThaanEqualLength] = useState<number | ''>('');
  const [retailThaanTotalRolls, setRetailThaanTotalRolls] = useState<number | ''>('');
  const [retailThaanSetsCount, setRetailThaanSetsCount] = useState<number | ''>('');
  const [retailThaanSetType, setRetailThaanSetType] = useState<string>('');
  const [retailThaanSuitsPerSet, setRetailThaanSuitsPerSet] = useState<number | ''>('');

  // Section 4: Suits / Other Setup
  const [suitWholesaleRate, setSuitWholesaleRate] = useState<number | ''>('');
  const [suitRetailRate, setSuitRetailRate] = useState<number | ''>('');
  const [suitStock, setSuitStock] = useState<number | ''>('');
  const [retailSuitStock, setRetailSuitStock] = useState<number | ''>('');

  // Advanced Discounts & Tax
  const [showWholesaleDiscount, setShowWholesaleDiscount] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [retailDiscount, setRetailDiscount] = useState<number | ''>('');
  const [wholesaleDiscount, setWholesaleDiscount] = useState<number | ''>('');
  const [taxRate, setTaxRate] = useState<number | ''>('');

  // Random realistic barcode on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setBarcode('896400' + Math.floor(100000 + Math.random() * 900000));
      setSuitBarcode('896401' + Math.floor(100000 + Math.random() * 900000));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Helper to generate clean SKU
  const generateSkuFromName = (articleName: string, cat?: ProductCategory) => {
    if (!articleName.trim()) return '';
    const words = articleName
      .trim()
      .split(/[\s-]+/)
      .filter(w => w.length > 0 && !['and', '&', 'the', 'piece', 'pc'].includes(w.toLowerCase()));

    let acronym = words.map(w => w[0].toUpperCase()).slice(0, 4).join('');
    if (acronym.length < 2) {
      acronym = articleName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
    }
    if (!acronym) acronym = 'FAB';

    const catCode = (cat || 'FAB').slice(0, 3).toUpperCase();
    const baseSku = `${acronym}-${catCode}`;

    const existing = productsService.getAll();
    let counter = 1;
    let candidate = `${baseSku}-${String(counter).padStart(2, '0')}`;
    while (existing.some(p => p.sku.toLowerCase() === candidate.toLowerCase())) {
      counter++;
      candidate = `${baseSku}-${String(counter).padStart(2, '0')}`;
    }
    return candidate;
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!skuManuallyEdited) {
      setSku(generateSkuFromName(val, category));
    }
  };

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat as ProductCategory);
    if (!skuManuallyEdited && name.trim()) {
      setSku(generateSkuFromName(name, newCat as ProductCategory));
    }
  };

  const handleAutoGenerateSKU = () => {
    const newSku = name.trim()
      ? generateSkuFromName(name, category)
      : `FAB-${Math.floor(100 + Math.random() * 900)}`;
    setSku(newSku);
    setSkuManuallyEdited(false);
    setBarcode('896400' + Math.floor(100000 + Math.random() * 900000));
    setSuitBarcode('896401' + Math.floor(100000 + Math.random() * 900000));
    toast({
      title: 'New SKU & Barcodes Generated',
      description: `SKU: ${newSku}`,
      type: 'info',
    });
  };

  // Determine active unit category
  const isBoxUnit = Boolean(
    unit && (unit.toLowerCase().includes('box') || unit.toLowerCase().includes('dabba'))
  );
  const isThaanUnit = Boolean(
    unit && (
      unit.toLowerCase().includes('thaan') ||
      unit.toLowerCase().includes('meter') ||
      unit.toLowerCase().includes('yard') ||
      unit.toLowerCase().includes('men suit')
    )
  );
  const isSuitUnit = Boolean(unit && !isBoxUnit && !isThaanUnit);

  // Box calculations - Wholesale
  const wholesaleSuitsInBox = Number(boxSuitsPerBox) || 0;
  const wholesaleNumBoxes = Number(boxTotalBoxes) || 0;
  const boxWholesaleSuit = Number(boxWholesalePerSuit) || 0;
  const boxWholesaleRate = boxWholesaleSuit * wholesaleSuitsInBox;
  const wholesaleTotalSuits = wholesaleSuitsInBox * wholesaleNumBoxes;
  const totalBoxWholesaleValuation = boxWholesaleRate * wholesaleNumBoxes;

  // Box calculations - Retail
  const retailSuitsInBox = Number(retailBoxSuitsPerBox) || 0;
  const retailNumBoxes = Number(retailBoxTotalBoxes) || 0;
  const boxRetailSuit = Number(boxRetailPerSuit) || 0;
  const boxRetailRate = boxRetailSuit * retailSuitsInBox;
  const retailTotalSuits = retailSuitsInBox * retailNumBoxes;
  const totalBoxRetailValuation = boxRetailRate * retailNumBoxes;

  // Aggregate Box Stock
  const totalBoxesCount = storeMode === 'Wholesale'
    ? wholesaleNumBoxes
    : storeMode === 'Retail'
    ? retailNumBoxes
    : (wholesaleNumBoxes + retailNumBoxes);

  const totalBoxSuitsCount = storeMode === 'Wholesale'
    ? wholesaleTotalSuits
    : storeMode === 'Retail'
    ? retailTotalSuits
    : (wholesaleTotalSuits + retailTotalSuits);

  // Thaan calculations
  const singleRollLength = Number(thaanEqualLength) || 0;
  const singleRetailRollLength = Number(retailThaanEqualLength) || 0;
  const retailRollLen = singleRetailRollLength;
  const thaanWholesaleRolls = Number(thaanTotalRolls) || 0;
  const thaanRetailRolls = Number(retailThaanTotalRolls) || 0;
  const totalThaanRollsCount = storeMode === 'Wholesale'
    ? thaanWholesaleRolls
    : storeMode === 'Retail'
    ? (thaanRetailRolls || thaanWholesaleRolls)
    : (thaanWholesaleRolls + thaanRetailRolls || thaanWholesaleRolls);

  const computedThaanLength =
    thaanType === 'Single'
      ? singleRollLength
      : thaanType === '3Thaan'
      ? thaanLengthMode === 'Equal'
        ? singleRollLength * 3
        : (Number(thaanKameezLength) || 0) + (Number(thaanShalwarLength) || 0) + (Number(thaanDupattaLength) || 0)
      : 0;

  const computedRetailThaanLength =
    retailThaanType === 'Single'
      ? singleRetailRollLength
      : retailThaanType === '3Thaan'
      ? singleRetailRollLength * 3
      : 0;

  const totalThaanStockMeters = storeMode === 'Wholesale'
    ? (computedThaanLength * (thaanWholesaleRolls || (computedThaanLength > 0 ? 1 : 0)))
    : storeMode === 'Retail'
    ? (computedRetailThaanLength * (thaanRetailRolls || (computedRetailThaanLength > 0 ? 1 : 0)))
    : ((computedThaanLength * thaanWholesaleRolls) + (computedRetailThaanLength * thaanRetailRolls) || (computedThaanLength > 0 ? computedThaanLength : computedRetailThaanLength));

  const totalThaanSets = storeMode === 'Wholesale'
    ? (Number(thaanSetsCount) || 0)
    : storeMode === 'Retail'
    ? (Number(retailThaanSetsCount) || Number(thaanSetsCount) || 0)
    : ((Number(thaanSetsCount) || 0) + (Number(retailThaanSetsCount) || 0) || (Number(thaanSetsCount) || 0));

  const thaanPerUnitRate = Number(thaanPerUnitRetailRate) || 0;
  const computedThaanTotalRetailValuation = (computedRetailThaanLength || computedThaanLength) * thaanPerUnitRate;

  // Resolved Final Prices for POS
  let resolvedWholesalePrice = isBoxUnit
    ? boxWholesaleRate
    : isThaanUnit
    ? (thaanType === 'Sets' ? Number(thaanSetWholesaleRate) || 0 : Number(thaanWholesalePrice) || 0)
    : Number(suitWholesaleRate) || 0;

  let resolvedRetailPrice = isBoxUnit
    ? boxRetailRate
    : isThaanUnit
    ? (retailThaanType === 'Sets' ? Number(thaanSetRetailRate) || 0 : (thaanPerUnitRate || Number(thaanRetailRollPrice) || computedThaanTotalRetailValuation))
    : Number(suitRetailRate) || 0;

  // Determine Channel based on whether Wholesale, Retail, or Both are filled
  const hasWholesale = isBoxUnit
    ? (boxWholesaleSuit > 0 || wholesaleNumBoxes > 0)
    : isThaanUnit
    ? (thaanType === 'Sets'
        ? (Number(thaanSetWholesaleRate) > 0 || Number(thaanSetsCount) > 0)
        : (Number(thaanWholesalePrice) > 0 || Number(thaanTotalRolls) > 0))
    : (Number(suitWholesaleRate) > 0 || Number(suitStock) > 0);

  const hasRetail = isBoxUnit
    ? (boxRetailSuit > 0 || retailNumBoxes > 0)
    : isThaanUnit
    ? (retailThaanType === 'Sets'
        ? (Number(thaanSetRetailRate) > 0 || Number(retailThaanSetsCount) > 0)
        : (thaanPerUnitRate > 0 || Number(thaanRetailRollPrice) > 0 || Number(retailThaanTotalRolls) > 0))
    : (Number(suitRetailRate) > 0 || Number(retailSuitStock) > 0);

  const targetChannel: 'Retail' | 'Wholesale' | 'Both' =
    hasWholesale && hasRetail
      ? 'Both'
      : hasWholesale
      ? 'Wholesale'
      : hasRetail
      ? 'Retail'
      : 'Both';

  const resolvedInitialStock: number = isBoxUnit
    ? (hasWholesale && hasRetail
        ? (wholesaleTotalSuits + retailTotalSuits)
        : hasWholesale
        ? wholesaleTotalSuits
        : retailTotalSuits)
    : isThaanUnit
    ? ((thaanType === 'Sets' || retailThaanType === 'Sets') ? totalThaanSets : totalThaanStockMeters)
    : (hasWholesale && hasRetail
        ? ((Number(suitStock) || 0) + (Number(retailSuitStock) || 0))
        : hasRetail && !hasWholesale
        ? (Number(retailSuitStock) || Number(suitStock) || 0)
        : Number(suitStock) || 0);

  const alertUnitSuffix = isBoxUnit
    ? 'Boxes'
    : isThaanUnit
    ? ((thaanType === 'Sets' || retailThaanType === 'Sets') ? 'Sets' : (storeMode === 'Retail' ? retailThaanMeasurement : thaanMeasurement))
    : 'Suits';

  // Profit Margin Preview
  const profitMarginPercent = resolvedRetailPrice > 0 && resolvedWholesalePrice > 0
    ? Math.round(((resolvedRetailPrice - resolvedWholesalePrice) / resolvedRetailPrice) * 100)
    : 0;

  // Keyboard navigation for Sets inputs (Up, Down, Left, Right, Enter)
  const handleSetNavKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    row: number,
    col: number
  ) => {
    const grid: string[][] = [
      ['ws-piece-type', 'ws-suits-set', 'ws-rate-set'],
      ['ws-stock-set', 'ws-alert-set'],
      ['ret-piece-type', 'ret-suits-set', 'ret-rate-set'],
      ['ret-stock-set', 'ret-alert-set'],
    ];

    const focusCell = (targetRow: number, targetCol: number) => {
      if (targetRow >= 0 && targetRow < grid.length) {
        const clampedCol = Math.min(Math.max(0, targetCol), grid[targetRow].length - 1);
        const id = grid[targetRow][clampedCol];
        if (id) {
          const el = document.getElementById(id);
          if (el) {
            el.focus();
            if (el instanceof HTMLInputElement) {
              el.select();
            }
          }
        }
      }
    };

    if (e.key === 'Enter') {
      e.preventDefault();
      if (col < grid[row].length - 1) {
        focusCell(row, col + 1);
      } else if (row < grid.length - 1) {
        focusCell(row + 1, 0);
      }
    } else if (e.key === 'ArrowRight') {
      const inputEl = e.currentTarget instanceof HTMLInputElement ? e.currentTarget : null;
      const atEnd = !inputEl || inputEl.selectionEnd === inputEl.value.length;
      if (atEnd) {
        e.preventDefault();
        if (col < grid[row].length - 1) {
          focusCell(row, col + 1);
        } else if (row < grid.length - 1) {
          focusCell(row + 1, 0);
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const inputEl = e.currentTarget instanceof HTMLInputElement ? e.currentTarget : null;
      const atStart = !inputEl || inputEl.selectionStart === 0;
      if (atStart) {
        e.preventDefault();
        if (col > 0) {
          focusCell(row, col - 1);
        } else if (row > 0) {
          focusCell(row - 1, grid[row - 1].length - 1);
        }
      }
    } else if (e.key === 'ArrowDown') {
      if (e.currentTarget.tagName !== 'SELECT' || e.altKey) {
        e.preventDefault();
        focusCell(row + 1, col);
      }
    } else if (e.key === 'ArrowUp') {
      if (e.currentTarget.tagName !== 'SELECT' || e.altKey) {
        e.preventDefault();
        focusCell(row - 1, col);
      }
    }
  };

  // Quick Copy Wholesale -> Retail helpers
  const handleCopyBoxWholesaleToRetail = () => {
    if (!boxWholesalePerSuit) {
      toast({ title: 'Wholesale Required', description: 'Enter wholesale suit rate first.', type: 'warning' });
      return;
    }
    setBoxRetailPerSuit(boxWholesalePerSuit);
    if (!retailBoxSuitsPerBox && boxSuitsPerBox) {
      setRetailBoxSuitsPerBox(boxSuitsPerBox);
    }
    toast({ title: 'Retail Matched Wholesale', description: 'Retail price set same as wholesale.', type: 'success' });
  };

  const handleThaanLengthChange = (lengthVal: number | '') => {
    setThaanEqualLength(lengthVal);
  };

  const handleRetailThaanLengthChange = (lengthVal: number | '') => {
    setRetailThaanEqualLength(lengthVal);
    const len = Number(lengthVal);
    if (len > 0) {
      if (thaanRetailRollPrice !== '') {
        const calculatedRate = parseFloat((Number(thaanRetailRollPrice) / len).toFixed(2));
        setThaanPerUnitRetailRate(calculatedRate);
      } else if (thaanPerUnitRetailRate !== '') {
        const calculatedRoll = Math.round(Number(thaanPerUnitRetailRate) * len);
        setThaanRetailRollPrice(calculatedRoll);
      }
    }
  };

  const handleRetailRollPriceChange = (rollPriceVal: number | '') => {
    setThaanRetailRollPrice(rollPriceVal);
    const len = Number(retailThaanEqualLength) || Number(thaanEqualLength) || 0;
    if (rollPriceVal !== '' && len > 0) {
      const calculatedRate = parseFloat((Number(rollPriceVal) / len).toFixed(2));
      setThaanPerUnitRetailRate(calculatedRate);
    } else if (rollPriceVal === '') {
      setThaanPerUnitRetailRate('');
    }
  };

  const handleRetailPerUnitRateChange = (rateVal: number | '') => {
    setThaanPerUnitRetailRate(rateVal);
    const len = Number(retailThaanEqualLength) || Number(thaanEqualLength) || 0;
    if (rateVal !== '' && len > 0) {
      const calculatedRoll = Math.round(Number(rateVal) * len);
      setThaanRetailRollPrice(calculatedRoll);
    } else if (rateVal === '') {
      setThaanRetailRollPrice('');
    }
  };

  const handleCopyThaanWholesaleToRetail = () => {
    if (!thaanWholesalePrice || computedThaanLength <= 0) {
      toast({ title: 'Wholesale Required', description: 'Enter wholesale roll rate first.', type: 'warning' });
      return;
    }
    const perUnit = parseFloat((Number(thaanWholesalePrice) / computedThaanLength).toFixed(2));
    setThaanRetailRollPrice(Number(thaanWholesalePrice));
    setThaanPerUnitRetailRate(perUnit);
    toast({ title: 'Retail Rate Matched', description: `Retail set to Rs. ${Number(thaanWholesalePrice).toLocaleString()} / Roll (Rs. ${perUnit.toLocaleString()} / ${thaanMeasurement.toLowerCase()}).`, type: 'success' });
  };

  const handleCopyThaanSetWholesaleToRetail = () => {
    if (!thaanSetWholesaleRate) {
      toast({ title: 'Wholesale Required', description: 'Enter wholesale set rate first.', type: 'warning' });
      return;
    }
    setThaanSetRetailRate(thaanSetWholesaleRate);
    if (thaanSetType) setRetailThaanSetType(thaanSetType);
    if (thaanSuitsPerSet) setRetailThaanSuitsPerSet(thaanSuitsPerSet);
    toast({ title: 'Retail Matched Wholesale', description: 'Retail rate set same as wholesale.', type: 'success' });
  };

  const handleCopySuitWholesaleToRetail = () => {
    if (!suitWholesaleRate) {
      toast({ title: 'Wholesale Required', description: 'Enter wholesale suit rate first.', type: 'warning' });
      return;
    }
    setSuitRetailRate(suitWholesaleRate);
    toast({ title: 'Retail Matched Wholesale', description: 'Retail price set same as wholesale.', type: 'success' });
  };

  // Submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: 'Name Required', description: 'Please enter fabric or article name.', type: 'error' });
      return;
    }

    if (!category.trim()) {
      toast({ title: 'Category Required', description: 'Please select a fabric category.', type: 'error' });
      return;
    }

    if (!seasonCategory) {
      toast({ title: 'Season Required', description: 'Please select a season collection.', type: 'error' });
      return;
    }

    if (!unit) {
      toast({ title: 'Unit Required', description: 'Please pick a Packaging & Unit Type.', type: 'error' });
      return;
    }

    if (!hasWholesale && !hasRetail) {
      toast({
        title: 'Price / Stock Required',
        description: 'Please enter pricing and stock details for Wholesale POS, Retail POS, or Both.',
        type: 'error',
      });
      return;
    }

    const finalSku = sku.trim() || generateSkuFromName(name, category);

    // Validate SKU uniqueness
    const existing = productsService.getAll();
    if (existing.some(p => p.sku.trim().toLowerCase() === finalSku.toLowerCase())) {
      toast({
        title: 'SKU Already Exists',
        description: `The SKU "${finalSku}" is already taken. Please change or regenerate it.`,
        type: 'error',
      });
      return;
    }

    // Prepare packaging metadata
    const packagingConfig = isBoxUnit
      ? {
          type: 'box' as const,
          suitsPerBox: wholesaleSuitsInBox || retailSuitsInBox,
          totalBoxes: (hasWholesale ? wholesaleNumBoxes : 0) + (hasRetail ? retailNumBoxes : 0),
          wholesaleBoxes: hasWholesale ? wholesaleNumBoxes : 0,
          retailBoxes: hasRetail ? retailNumBoxes : 0,
          retailSuitsPerBox: retailSuitsInBox || wholesaleSuitsInBox,
          wholesaleMinStockAlert: hasWholesale && wholesaleMinStockAlert !== '' ? Number(wholesaleMinStockAlert) : undefined,
          retailMinStockAlert: hasRetail && retailMinStockAlert !== '' ? Number(retailMinStockAlert) : undefined,
          pricePerSuit: hasWholesale ? boxWholesaleSuit : 0,
          retailPricePerSuit: hasRetail ? boxRetailSuit : 0,
          boxRetailPrice: hasRetail ? boxRetailRate : 0,
          boxWholesalePrice: hasWholesale ? boxWholesaleRate : 0,
        }
      : isThaanUnit
      ? {
          type: 'thaan' as const,
          thaanMeasurement,
          retailThaanMeasurement,
          thaanType,
          retailThaanType,
          thaanLengthMode,
          thaanEqualLength: Number(thaanEqualLength) || 0,
          retailThaanEqualLength: Number(retailThaanEqualLength) || Number(thaanEqualLength) || 0,
          thaanKameezLength: Number(thaanKameezLength) || 0,
          thaanShalwarLength: Number(thaanShalwarLength) || 0,
          thaanDupattaLength: Number(thaanDupattaLength) || 0,
          totalLength: computedThaanLength,
          totalRolls: totalThaanRollsCount,
          retailTotalRolls: Number(retailThaanTotalRolls) || Number(thaanTotalRolls) || 0,
          perUnitRate: thaanPerUnitRate,
          retailPerUnitRate: thaanPerUnitRate,
          thaanRetailRollPrice: Number(thaanRetailRollPrice) || (thaanPerUnitRate * singleRetailRollLength),
          thaanSetsCount: (thaanType === 'Sets' || retailThaanType === 'Sets') ? totalThaanSets : undefined,
          retailThaanSetsCount: retailThaanType === 'Sets' ? (Number(retailThaanSetsCount) || undefined) : undefined,
          thaanSetType: (thaanType === 'Sets' || retailThaanType === 'Sets') ? (thaanSetType || undefined) : undefined,
          retailThaanSetType: retailThaanType === 'Sets' ? (retailThaanSetType || thaanSetType || undefined) : undefined,
          thaanSuitsPerSet: (thaanType === 'Sets' || retailThaanType === 'Sets') ? (Number(thaanSuitsPerSet) || undefined) : undefined,
          retailThaanSuitsPerSet: retailThaanType === 'Sets' ? (Number(retailThaanSuitsPerSet) || Number(thaanSuitsPerSet) || undefined) : undefined,
          thaanSetWholesaleRate: Number(thaanSetWholesaleRate) || undefined,
          thaanSetRetailRate: Number(thaanSetRetailRate) || undefined,
        }
      : {
          type: 'suit' as const,
          pricePerSuit: hasWholesale ? resolvedWholesalePrice : 0,
        };

    const effectiveMinStockAlert = targetChannel === 'Retail'
      ? (Number(retailMinStockAlert) || Number(minStockAlert) || 5)
      : targetChannel === 'Wholesale'
      ? (Number(wholesaleMinStockAlert) || Number(minStockAlert) || 5)
      : (Number(retailMinStockAlert) || Number(wholesaleMinStockAlert) || Number(minStockAlert) || 5);

    const finalWholesalePrice = hasWholesale ? resolvedWholesalePrice : 0;
    const finalRetailPrice = hasRetail ? resolvedRetailPrice : 0;
    const finalWholesaleDisc = hasWholesale ? Math.max(0, Number(wholesaleDiscount) || 0) : 0;
    const finalRetailDisc = hasRetail ? Math.max(0, Number(retailDiscount) || 0) : 0;

    const newProduct = productsService.add({
      name: name.trim(),
      sku: finalSku,
      category,
      seasonCategory: seasonCategory as SeasonCategory,
      subcategory: `${category} Collection`,
      unit: unit as UnitType,
      channel: targetChannel,
      retailPrice: finalRetailPrice,
      wholesalePrice: finalWholesalePrice,
      khataPrice: finalWholesalePrice,
      retailDiscount: finalRetailDisc,
      wholesaleDiscount: finalWholesaleDisc,
      khataDiscount: finalWholesaleDisc,
      taxRate: Math.max(0, Number(taxRate) || 0),
      stock: resolvedInitialStock,
      minStockAlert: Math.max(1, effectiveMinStockAlert),
      wholesaleMinStockAlert: hasWholesale && wholesaleMinStockAlert !== '' ? Number(wholesaleMinStockAlert) : undefined,
      retailMinStockAlert: hasRetail && retailMinStockAlert !== '' ? Number(retailMinStockAlert) : undefined,
      supplier: 'Local Mill',
      description: '',
      barcode,
      suitBarcode: isBoxUnit ? suitBarcode : undefined,
      packagingConfig,
    });

    if (resolvedInitialStock > 0) {
      inventoryService.recordMovement({
        productId: newProduct.id,
        productName: newProduct.name,
        sku: newProduct.sku,
        movementType: 'Initial',
        quantityChange: resolvedInitialStock,
        previousStock: 0,
        newStock: resolvedInitialStock,
        staffName: currentStaff?.name || 'Stock Manager',
        notes: `Opening inventory: ${resolvedInitialStock} ${unit}`,
      });
    }

    const channelNotice = targetChannel === 'Wholesale'
      ? 'Wholesale POS only'
      : targetChannel === 'Retail'
      ? 'Retail POS only'
      : 'both Retail and Wholesale POS';

    toast({
      title: 'Fabric Registered Successfully',
      description: `${newProduct.name} is now live in ${channelNotice}.`,
      type: 'success',
    });

    router.push('/products');
  };

  // Filtered categories for combobox based on selected department
  const filteredFemaleCategories = useMemo(() => {
    return FEMALE_FABRIC_CATEGORIES.filter(c =>
      !category.trim() || c.toLowerCase().includes(category.toLowerCase().trim())
    );
  }, [category]);

  const filteredMaleCategories = useMemo(() => {
    return MALE_FABRIC_CATEGORIES.filter(c =>
      !category.trim() || c.toLowerCase().includes(category.toLowerCase().trim())
    );
  }, [category]);

  const availableCategories = useMemo(() => {
    if (fabricGender === 'Female') return filteredFemaleCategories;
    if (fabricGender === 'Male') return filteredMaleCategories;
    return [...filteredFemaleCategories, ...filteredMaleCategories];
  }, [fabricGender, filteredFemaleCategories, filteredMaleCategories]);

  // Keep highlightedCategoryIndex in valid range when categories change
  useEffect(() => {
    setHighlightedCategoryIndex(0);
  }, [category, fabricGender, isCategoryDropdownOpen]);

  // Auto-scroll highlighted category into view
  useEffect(() => {
    if (isCategoryDropdownOpen && highlightedCategoryIndex >= 0) {
      const el = document.getElementById(`cat-item-${highlightedCategoryIndex}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedCategoryIndex, isCategoryDropdownOpen]);

  const handleSeasonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isSeasonDropdownOpen) {
        setIsSeasonDropdownOpen(true);
      } else {
        setHighlightedSeasonIndex(prev => (prev === 0 ? 1 : 0));
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isSeasonDropdownOpen) {
        setIsSeasonDropdownOpen(true);
      } else {
        setHighlightedSeasonIndex(prev => (prev === 1 ? 0 : 1));
      }
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isSeasonDropdownOpen) {
        setIsSeasonDropdownOpen(true);
      } else {
        const selected = highlightedSeasonIndex === 0 ? 'Summer' : 'Winter';
        setSeasonCategory(selected);
        setIsSeasonDropdownOpen(false);
        const firstUnitBtn = document.querySelector<HTMLButtonElement>('[data-unit-preset="true"]');
        if (firstUnitBtn) {
          firstUnitBtn.focus();
        } else {
          focusFirstRateInput();
        }
      }
      return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
      e.preventDefault();
      setIsSeasonDropdownOpen(false);
      categoryInputRef.current?.focus();
      categoryInputRef.current?.select();
      setIsCategoryDropdownOpen(true);
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setIsSeasonDropdownOpen(false);
      const firstUnitBtn = document.querySelector<HTMLButtonElement>('[data-unit-preset="true"]');
      if (firstUnitBtn) {
        firstUnitBtn.focus();
      } else {
        focusFirstRateInput();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsSeasonDropdownOpen(false);
      return;
    }
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (!isCategoryDropdownOpen) {
        setIsCategoryDropdownOpen(true);
        setHighlightedCategoryIndex(0);
      } else if (availableCategories.length > 0) {
        setHighlightedCategoryIndex(prev => 
          prev < availableCategories.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (isCategoryDropdownOpen && availableCategories.length > 0) {
        setHighlightedCategoryIndex(prev => 
          prev > 0 ? prev - 1 : availableCategories.length - 1
        );
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (isCategoryDropdownOpen && highlightedCategoryIndex >= 0 && highlightedCategoryIndex < availableCategories.length) {
        handleCategoryChange(availableCategories[highlightedCategoryIndex]);
      }
      setIsCategoryDropdownOpen(false);
      seasonCategoryRef.current?.focus();
      setIsSeasonDropdownOpen(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsCategoryDropdownOpen(false);
    }
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const isEnter = e.key === 'Enter';
    const isDown = e.key === 'ArrowDown';
    const isUp = e.key === 'ArrowUp';
    const isLeft = e.key === 'ArrowLeft';
    const isRight = e.key === 'ArrowRight';

    if (!isEnter && !isDown && !isUp && !isLeft && !isRight) return;

    const target = e.target as HTMLElement;

    // Don't intercept inside textarea or if submit button on Enter
    if (target.tagName === 'TEXTAREA') return;
    if (isEnter && target.tagName === 'BUTTON' && (target as HTMLButtonElement).type === 'submit') {
      return;
    }

    // If in Season Category dropdown button:
    if (target === seasonCategoryRef.current || target.id === 'seasonCategory') {
      return; // Handled directly by handleSeasonKeyDown
    }

    // 1. If in Category combobox:
    if (target === categoryInputRef.current) {
      if (isCategoryDropdownOpen) {
        // Let handleCategoryKeyDown handle arrow navigation & Enter when dropdown is open
        if (isDown || isUp || isEnter || e.key === 'Escape') {
          return;
        }
      }
      if (isRight) {
        const input = target as HTMLInputElement;
        if (input.selectionStart === null || input.selectionStart === (input.value?.length || 0)) {
          e.preventDefault();
          setIsCategoryDropdownOpen(false);
          seasonCategoryRef.current?.focus();
          setIsSeasonDropdownOpen(true);
          return;
        }
      }
      if (isLeft) {
        const input = target as HTMLInputElement;
        if (input.selectionStart === null || input.selectionStart === 0) {
          e.preventDefault();
          setIsCategoryDropdownOpen(false);
          if (nameInputRef.current) {
            nameInputRef.current.focus();
            nameInputRef.current.select();
          }
          return;
        }
      }
    }

    // 2. If inside Fabric Name (text input)
    if (target instanceof HTMLInputElement && target.type === 'text' && target !== categoryInputRef.current) {
      if (isLeft && target.selectionStart !== null && target.selectionStart > 0) {
        return; // Allow natural text cursor movement inside text
      }
      if (isRight && target.selectionStart !== null && target.selectionStart < (target.value?.length || 0)) {
        return; // Allow natural text cursor movement inside text
      }
    }

    // 3. If inside a <select> element:
    if (target.tagName === 'SELECT') {
      if (isDown || isUp) {
        return; // Let native select change options
      }
      if (isRight) {
        e.preventDefault();
        const firstUnitBtn = document.querySelector<HTMLButtonElement>('[data-unit-preset="true"]');
        if (firstUnitBtn) {
          firstUnitBtn.focus();
        } else {
          focusFirstRateInput();
        }
        return;
      }
      if (isLeft) {
        e.preventDefault();
        categoryInputRef.current?.focus();
        categoryInputRef.current?.select();
        setIsCategoryDropdownOpen(true);
        return;
      }
    }

    // 4. Section 2: If user is focused on a Unit preset button:
    if (target.getAttribute('data-unit-preset') === 'true') {
      const unitBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-unit-preset="true"]'));
      const idx = unitBtns.indexOf(target as HTMLButtonElement);

      if (isEnter || e.key === ' ') {
        (target as HTMLButtonElement).click();
        e.preventDefault();
        return;
      }

      if (isRight) {
        e.preventDefault();
        if (idx > -1) {
          const nextIdx = (idx + 1) % unitBtns.length;
          unitBtns[nextIdx].focus();
        }
        return;
      }

      if (isLeft) {
        e.preventDefault();
        if (idx > -1) {
          if (idx === 0) {
            seasonCategoryRef.current?.focus();
            setIsSeasonDropdownOpen(true);
          } else {
            unitBtns[idx - 1].focus();
          }
        }
        return;
      }

      if (isDown) {
        e.preventDefault();
        const cols = 4;
        if (idx > -1 && idx + cols < unitBtns.length) {
          unitBtns[idx + cols].focus();
        } else {
          focusFirstRateInput();
        }
        return;
      }

      if (isUp) {
        e.preventDefault();
        const cols = 4;
        if (idx > -1 && idx - cols >= 0) {
          unitBtns[idx - cols].focus();
        } else {
          seasonCategoryRef.current?.focus();
          setIsSeasonDropdownOpen(true);
        }
        return;
      }
    }

    // 5. Section 3 (Wholesale) & Section 4 (Retail) & general inputs
    e.preventDefault();

    if (isCategoryDropdownOpen) {
      setIsCategoryDropdownOpen(false);
    }

    const isBackward = (isEnter && e.shiftKey) || isUp || isLeft;
    const isForward = isEnter || isDown || isRight;

    // Find all focusable input/select/submit elements in form order
    const form = e.currentTarget;
    const selector = 'input:not([type="hidden"]):not([disabled]):not([readonly]):not([tabindex="-1"]), select:not([disabled]):not([readonly]):not([tabindex="-1"]), button[type="submit"]:not([disabled])';
    
    const allElements = Array.from(form.querySelectorAll<HTMLElement>(selector)).filter(el => {
      return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    });

    const currentIndex = allElements.indexOf(target);

    // If moving backward from the first rate input of Section 3:
    if (isBackward && target.getAttribute('data-first-rate-input') === 'true') {
      const unitBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-unit-preset="true"]'));
      // Find selected unit button or first unit button
      const activeUnitBtn = unitBtns.find(b => b.className.includes('rose-950') || b.className.includes('blue-950')) || unitBtns[0];
      if (activeUnitBtn) {
        activeUnitBtn.focus();
        return;
      }
    }

    // If moving forward from Season Category:
    if (isForward && (target.id === 'seasonCategory' || target === seasonCategoryRef.current)) {
      if (!unit) {
        const firstUnitBtn = document.querySelector<HTMLButtonElement>('[data-unit-preset="true"]');
        if (firstUnitBtn) {
          firstUnitBtn.focus();
          return;
        }
      } else {
        focusFirstRateInput();
        return;
      }
    }

    if (currentIndex > -1) {
      const nextIndex = isBackward ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex >= 0 && nextIndex < allElements.length) {
        const nextEl = allElements[nextIndex];
        nextEl.focus();
        if (nextEl instanceof HTMLInputElement && (nextEl.type === 'text' || nextEl.type === 'number')) {
          nextEl.select();
        }
      }
    }
  };

  return (
    <ProtectedRoute permission="stock_add">
      <AppShell>
        <div className="max-w-6xl mx-auto space-y-6 pb-16">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <Link href="/products">
                <Button variant="outline" size="sm" className="gap-1.5 hover:bg-slate-100">
                  <ArrowLeft className="w-4 h-4" /> Products
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Add New Fabric / Article
                </h1>
                <p className="text-xs text-slate-500">
                  Cloth inventory registration with Pakistani market packaging & pricing.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
            {/* 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: Clean Form Inputs (8 Columns on desktop) */}
              <div className="lg:col-span-8 space-y-5">
                {/* 1. Basic Fabric Details */}
                <Card className="shadow-xs border-slate-200">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
                      Basic Fabric Details
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Article name, fabric category, and season collection.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-4">
                    {/* Article Name */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        Fabric / Article Name *
                      </label>
                      <input
                        ref={nameInputRef}
                        type="text"
                        required
                        value={name}
                        onChange={e => handleNameChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#125E45] focus:border-transparent transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Fabric Category Combobox (reacts to Male / Female / Both) */}
                      <div ref={categoryWrapperRef} className="relative">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                          Fabric Category {fabricGender !== 'Both' ? `(${fabricGender}) ` : ''}*
                        </label>
                        <div className="relative">
                          <input
                            ref={categoryInputRef}
                            type="text"
                            required
                            value={category}
                            onChange={e => {
                              handleCategoryChange(e.target.value);
                              setIsCategoryDropdownOpen(true);
                            }}
                            onFocus={() => setIsCategoryDropdownOpen(true)}
                            onKeyDown={handleCategoryKeyDown}
                            className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-900 pr-9 focus:outline-none focus:ring-2 focus:ring-[#125E45]"
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setIsCategoryDropdownOpen(prev => !prev)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Searchable Combobox Menu */}
                        {isCategoryDropdownOpen && (
                          <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                            {/* Female Group (shown if Female or Both) */}
                            {(fabricGender === 'Female' || fabricGender === 'Both') && filteredFemaleCategories.length > 0 && (
                              <div>
                                <div className="sticky top-0 z-10 px-3 py-1 bg-rose-50 border-b border-rose-100 text-[11px] font-black text-rose-900 flex items-center justify-between">
                                  <span>👗 FEMALE FABRICS</span>
                                  <span className="text-[10px] bg-rose-200/70 text-rose-800 px-1.5 py-0.2 rounded-full font-bold">
                                    {filteredFemaleCategories.length}
                                  </span>
                                </div>
                                {filteredFemaleCategories.map(cat => {
                                  const itemIdx = availableCategories.indexOf(cat);
                                  const isHighlighted = highlightedCategoryIndex === itemIdx;
                                  return (
                                    <button
                                      key={`fem-${cat}`}
                                      id={`cat-item-${itemIdx}`}
                                      type="button"
                                      onMouseEnter={() => setHighlightedCategoryIndex(itemIdx)}
                                      onClick={() => {
                                        handleCategoryChange(cat);
                                        setIsCategoryDropdownOpen(false);
                                        seasonCategoryRef.current?.focus();
                                      }}
                                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                        isHighlighted
                                          ? 'bg-rose-100 text-rose-950 font-bold border-l-4 border-rose-600'
                                          : category === cat
                                          ? 'bg-rose-50 font-bold text-rose-900'
                                          : 'text-slate-800 hover:bg-rose-50'
                                      }`}
                                    >
                                      <span>{cat}</span>
                                      {(isHighlighted || category === cat) && <Check className="w-3.5 h-3.5 text-rose-600" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Male Group (shown if Male or Both) */}
                            {(fabricGender === 'Male' || fabricGender === 'Both') && filteredMaleCategories.length > 0 && (
                              <div>
                                <div className="sticky top-0 z-10 px-3 py-1 bg-blue-50 border-b border-blue-100 text-[11px] font-black text-blue-900 flex items-center justify-between">
                                  <span>👔 MALE FABRICS</span>
                                  <span className="text-[10px] bg-blue-200/70 text-blue-800 px-1.5 py-0.2 rounded-full font-bold">
                                    {filteredMaleCategories.length}
                                  </span>
                                </div>
                                {filteredMaleCategories.map(cat => {
                                  const itemIdx = availableCategories.indexOf(cat);
                                  const isHighlighted = highlightedCategoryIndex === itemIdx;
                                  return (
                                    <button
                                      key={`male-${cat}`}
                                      id={`cat-item-${itemIdx}`}
                                      type="button"
                                      onMouseEnter={() => setHighlightedCategoryIndex(itemIdx)}
                                      onClick={() => {
                                        handleCategoryChange(cat);
                                        setIsCategoryDropdownOpen(false);
                                        seasonCategoryRef.current?.focus();
                                        setIsSeasonDropdownOpen(true);
                                      }}
                                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                        isHighlighted
                                          ? 'bg-blue-100 text-blue-950 font-bold border-l-4 border-blue-600'
                                          : category === cat
                                          ? 'bg-blue-50 font-bold text-blue-900'
                                          : 'text-slate-800 hover:bg-blue-50'
                                      }`}
                                    >
                                      <span>{cat}</span>
                                      {(isHighlighted || category === cat) && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Season Category Dropdown */}
                      <div ref={seasonWrapperRef} className="relative">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                          Season Collection *
                        </label>
                        <div className="relative">
                          <button
                            ref={seasonCategoryRef}
                            id="seasonCategory"
                            type="button"
                            onClick={() => setIsSeasonDropdownOpen(prev => !prev)}
                            onKeyDown={handleSeasonKeyDown}
                            className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-800 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#125E45] cursor-pointer"
                          >
                            <span className={seasonCategory ? 'text-slate-900 font-bold' : 'text-slate-400 font-normal'}>
                              {seasonCategory === 'Summer' && '☀️ Summer'}
                              {seasonCategory === 'Winter' && '❄️ Winter'}
                              {!seasonCategory && 'Select Season...'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isSeasonDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                        </div>

                        {/* Searchable / Clickable Custom Dropdown Menu */}
                        {isSeasonDropdownOpen && (
                          <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100">
                            <button
                              type="button"
                              onMouseEnter={() => setHighlightedSeasonIndex(0)}
                              onClick={() => {
                                setSeasonCategory('Summer');
                                setIsSeasonDropdownOpen(false);
                                const firstUnitBtn = document.querySelector<HTMLButtonElement>('[data-unit-preset="true"]');
                                if (firstUnitBtn) firstUnitBtn.focus();
                                else focusFirstRateInput();
                              }}
                              className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                highlightedSeasonIndex === 0
                                  ? 'bg-amber-50 text-amber-950 font-bold border-l-4 border-amber-600'
                                  : seasonCategory === 'Summer'
                                  ? 'bg-amber-50/50 font-bold text-amber-900'
                                  : 'text-slate-800 hover:bg-slate-50'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-base">☀️</span>
                                <span>Summer</span>
                              </span>
                              {seasonCategory === 'Summer' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                            </button>

                            <button
                              type="button"
                              onMouseEnter={() => setHighlightedSeasonIndex(1)}
                              onClick={() => {
                                setSeasonCategory('Winter');
                                setIsSeasonDropdownOpen(false);
                                const firstUnitBtn = document.querySelector<HTMLButtonElement>('[data-unit-preset="true"]');
                                if (firstUnitBtn) firstUnitBtn.focus();
                                else focusFirstRateInput();
                              }}
                              className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                highlightedSeasonIndex === 1
                                  ? 'bg-blue-50 text-blue-950 font-bold border-l-4 border-blue-600'
                                  : seasonCategory === 'Winter'
                                  ? 'bg-blue-50/50 font-bold text-blue-900'
                                  : 'text-slate-800 hover:bg-slate-50'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-base">❄️</span>
                                <span>Winter</span>
                              </span>
                              {seasonCategory === 'Winter' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Packaging & Unit Type */}
                <Card className="shadow-xs border-slate-200">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">2</span>
                        <span>Packaging & Unit Type <span className="text-rose-500">*</span></span>
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Pick how this article is packaged and sold in your shop.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {/* FEMALE PRESETS (when Female or Both) */}
                    {(fabricGender === 'Female' || fabricGender === 'Both') && (
                      <div>
                        {fabricGender === 'Both' && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 bg-rose-50 px-2 py-0.5 rounded block mb-2 w-max">
                            👗 Female Units
                          </span>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {FEMALE_PRESET_UNITS.map(u => {
                            const isSelected = unit === u.id && (fabricGender !== 'Both' || selectedUnitGender === 'Female');
                            return (
                              <button
                                key={`f-unit-${u.id}`}
                                type="button"
                                data-unit-preset="true"
                                onClick={() => handleSelectUnit(u.id as UnitType, 'Female')}
                                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-rose-950 text-white border-rose-950 shadow-sm'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <span className="text-lg mb-1">{u.icon}</span>
                                <span className="text-xs font-bold line-clamp-1">{u.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* MALE PRESETS (when Male or Both) */}
                    {(fabricGender === 'Male' || fabricGender === 'Both') && (
                      <div className={fabricGender === 'Both' ? 'pt-2 border-t border-slate-100' : ''}>
                        {fabricGender === 'Both' && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 bg-blue-50 px-2 py-0.5 rounded block mb-2 w-max">
                            👔 Male Units
                          </span>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {MALE_PRESET_UNITS.map(u => {
                            const isSelected = unit === u.id && (fabricGender !== 'Both' || selectedUnitGender === 'Male');
                            return (
                              <button
                                key={`m-unit-${u.id}`}
                                type="button"
                                data-unit-preset="true"
                                onClick={() => handleSelectUnit(u.id as UnitType, 'Male')}
                                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-950 text-white border-blue-950 shadow-sm'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <span className="text-lg mb-1">{u.icon}</span>
                                <span className="text-xs font-bold line-clamp-1">{u.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 3. Wholesale Rates & Inventory Setup */}
                {storeMode !== 'Retail' && (
                  <Card className="shadow-xs border-cyan-200 bg-gradient-to-br from-cyan-50/20 via-white to-teal-50/20">
                    <CardHeader className="pb-3 border-b border-cyan-100">
                      <CardTitle className="text-sm font-bold text-cyan-950 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-cyan-700 text-white flex items-center justify-center text-xs font-bold">3</span>
                        Wholesale Rates & Inventory Setup
                      </CardTitle>
                      <CardDescription className="text-xs text-cyan-800/80 mt-0.5">
                        Set bulk wholesale prices, packaging box units, initial stock counts, and reorder alerts.
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-4">
                      {!unit && (
                        <div className="py-8 px-4 text-center rounded-xl border border-dashed border-cyan-200 bg-cyan-50/20">
                          <p className="text-xs font-bold text-cyan-950">Select a Unit Type in Section 2</p>
                          <p className="text-[11px] text-cyan-800/70 mt-1">
                            Choose Box, Thaan, or Suit above to enter wholesale rates and opening stock.
                          </p>
                        </div>
                      )}

                      {/* CASE A: BOX / DABBA WHOLESALE SETUP */}
                      {isBoxUnit && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* 1st: Wholesale Rate Per Suit */}
                            <div>
                              <label className="text-xs font-bold text-cyan-900 uppercase tracking-wider block mb-1">
                                Wholesale Rate / Suit (Rs.) *
                              </label>
                              <input
                                type="number"
                                min="0"
                                data-first-rate-input="true"
                                value={boxWholesalePerSuit}
                                onChange={e => setBoxWholesalePerSuit(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="w-full px-3 py-2 text-xs border border-cyan-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                              />
                              {boxWholesaleRate > 0 && wholesaleSuitsInBox > 0 && (
                                <span className="text-[11px] font-semibold text-cyan-800 mt-1 block">
                                  = Rs. {boxWholesaleRate.toLocaleString()} / Box ({wholesaleSuitsInBox} suits)
                                </span>
                              )}
                            </div>

                            {/* 2nd: Suits per Box */}
                            <div>
                              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                Suits Per Box *
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={boxSuitsPerBox}
                                onChange={e => setBoxSuitsPerBox(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#125E45]"
                              />
                            </div>
                          </div>

                          {/* Stock & Warning Alert in 1 row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-cyan-100">
                            <div>
                              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                Total Boxes in Stock (Dabbay) *
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={boxTotalBoxes}
                                  onChange={e => setBoxTotalBoxes(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#125E45]"
                                />
                                {wholesaleTotalSuits > 0 && (
                                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                                    = {wholesaleTotalSuits} Suits
                                  </span>
                                )}
                              </div>
                              {totalBoxWholesaleValuation > 0 && wholesaleNumBoxes > 0 && (
                                <span className="text-[11px] font-bold text-[#125E45] mt-1 block">
                                  = Total Value: Rs. {totalBoxWholesaleValuation.toLocaleString()} ({wholesaleNumBoxes} Dabbay / {wholesaleTotalSuits} Suits)
                                </span>
                              )}
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                Low Stock Warning Alert (Boxes)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={wholesaleMinStockAlert}
                                onChange={e => {
                                  const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                  setWholesaleMinStockAlert(val);
                                }}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#125E45]"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* CASE B: THAAN WHOLESALE SETUP */}
                      {isThaanUnit && (
                        <div className="space-y-4">
                          {/* Meter vs Yard & Thaan Mode selector */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-slate-600 mr-1">Unit:</span>
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => {
                                  setThaanMeasurement('Meter');
                                  if (thaanType === 'Sets') setThaanType('Single');
                                }}
                                className={`text-xs font-bold px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                                  thaanType !== 'Sets' && thaanMeasurement === 'Meter'
                                    ? 'bg-[#125E45] text-white shadow-2xs'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                📏 Meter (m)
                              </button>
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => {
                                  setThaanMeasurement('Yard');
                                  if (thaanType === 'Sets') setThaanType('Single');
                                }}
                                className={`text-xs font-bold px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                                  thaanType !== 'Sets' && thaanMeasurement === 'Yard'
                                    ? 'bg-[#125E45] text-white shadow-2xs'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                📐 Yard / Gaz (yd)
                              </button>
                            </div>

                            {unit !== 'Men Suit' && (
                              <div className="flex items-center gap-1 text-xs">
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onClick={() => setThaanType('Single')}
                                  className={`px-2.5 py-1 rounded-md font-bold cursor-pointer ${
                                    thaanType === 'Single' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  1 Thaan
                                </button>
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onClick={() => setThaanType('3Thaan')}
                                  className={`px-2.5 py-1 rounded-md font-bold cursor-pointer ${
                                    thaanType === '3Thaan' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  3 Thaan
                                </button>
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onClick={() => setThaanType('Sets')}
                                  className={`px-2.5 py-1 rounded-md font-bold cursor-pointer ${
                                    thaanType === 'Sets' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  2/3pcs
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Thaan Mode Details */}
                          {thaanType === 'Single' && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Roll Length ({thaanMeasurement}) *
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    data-first-rate-input="true"
                                    value={thaanEqualLength}
                                    onChange={e => handleThaanLengthChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#125E45]"
                                  />
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-cyan-900 uppercase tracking-wider block mb-1">
                                    Wholesale Roll Price (Rs.) *
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={thaanWholesalePrice}
                                    onChange={e => setThaanWholesalePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    className="w-full px-3 py-2 text-xs border border-cyan-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                                  />
                                  {Number(thaanWholesalePrice) > 0 && Number(thaanEqualLength) > 0 && (
                                    <span className="text-[11px] font-semibold text-cyan-800 mt-1 block">
                                      = Rs. {(Number(thaanWholesalePrice) / Number(thaanEqualLength)).toFixed(1)} / {thaanMeasurement}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Row 2: Total Stock in Hand & Alert */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-cyan-100">
                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Total Stock (Thaans / Rolls) *
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={thaanTotalRolls}
                                      onChange={e => setThaanTotalRolls(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#125E45]"
                                    />
                                    {Number(thaanTotalRolls) > 0 && Number(thaanEqualLength) > 0 && (
                                      <span className="text-xs font-bold text-[#125E45] whitespace-nowrap bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                                        = {(Number(thaanTotalRolls) * Number(thaanEqualLength)).toLocaleString()} {thaanMeasurement}
                                      </span>
                                    )}
                                  </div>
                                  {Number(thaanTotalRolls) > 0 && Number(thaanWholesalePrice) > 0 && (
                                    <span className="text-[11px] font-bold text-[#125E45] mt-1 block">
                                      = Total Value: Rs. {(Number(thaanTotalRolls) * Number(thaanWholesalePrice)).toLocaleString()} ({thaanTotalRolls} Rolls)
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Minimum Stock Warning Alert ({thaanMeasurement})
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={wholesaleMinStockAlert}
                                    onChange={e => {
                                      const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                      setWholesaleMinStockAlert(val);
                                    }}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#125E45]"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {thaanType === '3Thaan' && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Roll Length / Piece ({thaanMeasurement}) *
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    data-first-rate-input="true"
                                    value={thaanEqualLength}
                                    onChange={e => setThaanEqualLength(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#125E45]"
                                  />
                                  <span className="text-[10px] text-slate-500 mt-1 block">
                                    Thaan Bundle = {(Number(thaanEqualLength) || 0) * 3} {thaanMeasurement}
                                  </span>
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-cyan-900 uppercase tracking-wider block mb-1">
                                    Thaan Wholesale Price (Rs.) *
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={thaanWholesalePrice}
                                    onChange={e => setThaanWholesalePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    className="w-full px-3 py-2 text-xs border border-cyan-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                                  />
                                </div>
                              </div>

                              {/* Row 2: Total Stock in Hand & Alert */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-cyan-100">
                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Total Stock (Thaan Bundles) *
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={thaanTotalRolls}
                                      onChange={e => setThaanTotalRolls(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#125E45]"
                                    />
                                    {Number(thaanTotalRolls) > 0 && Number(thaanEqualLength) > 0 && (
                                      <span className="text-xs font-bold text-[#125E45] whitespace-nowrap bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                                        = {(Number(thaanTotalRolls) * Number(thaanEqualLength) * 3).toLocaleString()} {thaanMeasurement}
                                      </span>
                                    )}
                                  </div>
                                  {Number(thaanTotalRolls) > 0 && Number(thaanWholesalePrice) > 0 && (
                                    <span className="text-[11px] font-bold text-[#125E45] mt-1 block">
                                      = Total Value: Rs. {(Number(thaanTotalRolls) * Number(thaanWholesalePrice)).toLocaleString()} ({thaanTotalRolls} Bundles / {Number(thaanTotalRolls) * 3} Thaans)
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Minimum Stock Warning Alert ({thaanMeasurement})
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={wholesaleMinStockAlert}
                                    onChange={e => {
                                      const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                      setWholesaleMinStockAlert(val);
                                    }}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#125E45]"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {thaanType === 'Sets' && (
                            <div className="space-y-3">
                              {/* Row 1: Field 1 (Piece Type), Field 2 (Suits in Set), Field 3 (Wholesale / Set Rs.) */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Piece Type (2-Piece / 3-Piece) *
                                  </label>
                                  <select
                                    id="ws-piece-type"
                                    value={thaanSetType}
                                    onChange={e => setThaanSetType(e.target.value)}
                                    onKeyDown={e => handleSetNavKeyDown(e, 0, 0)}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#125E45]"
                                  >
                                    <option value="">Select Piece Type...</option>
                                    <option value="1-Piece">1-Piece</option>
                                    <option value="2-Piece">2-Piece</option>
                                    <option value="3-Piece">3-Piece</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Suits in Set *
                                  </label>
                                  <input
                                    id="ws-suits-set"
                                    type="number"
                                    min="1"
                                    value={thaanSuitsPerSet}
                                    onChange={e => setThaanSuitsPerSet(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                    onKeyDown={e => handleSetNavKeyDown(e, 0, 1)}
                                    placeholder=""
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#125E45]"
                                  />
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-cyan-900 uppercase tracking-wider block mb-1">
                                    Wholesale / Set (Rs.) *
                                  </label>
                                  <input
                                    id="ws-rate-set"
                                    type="number"
                                    min="0"
                                    value={thaanSetWholesaleRate}
                                    onChange={e => setThaanSetWholesaleRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    onKeyDown={e => handleSetNavKeyDown(e, 0, 2)}
                                    placeholder=""
                                    className="w-full px-3 py-2 text-xs border border-cyan-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                                  />
                                </div>
                              </div>

                              {/* Row 2: Field 4 (Total Stock Sets) & Field 5 (Minimum Stock Warning Alert Sets) */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-cyan-100">
                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Total Stock (Sets) *
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      id="ws-stock-set"
                                      type="number"
                                      min="0"
                                      data-first-rate-input="true"
                                      value={thaanSetsCount}
                                      onChange={e => setThaanSetsCount(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                      onKeyDown={e => handleSetNavKeyDown(e, 1, 0)}
                                      placeholder=""
                                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#125E45]"
                                    />
                                    {Number(thaanSetsCount) > 0 && (
                                      <span className="text-xs font-bold text-[#125E45] whitespace-nowrap bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                                        = {thaanSetsCount} Sets {Number(thaanSuitsPerSet) > 0 ? `(${Number(thaanSetsCount) * Number(thaanSuitsPerSet)} Suits)` : ''}
                                      </span>
                                    )}
                                  </div>
                                  {Number(thaanSetsCount) > 0 && Number(thaanSetWholesaleRate) > 0 && (
                                    <span className="text-[11px] font-bold text-[#125E45] mt-1 block">
                                      = Total Value: Rs. {(Number(thaanSetsCount) * Number(thaanSetWholesaleRate)).toLocaleString()}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Minimum Stock Warning Alert (Sets)
                                  </label>
                                  <input
                                    id="ws-alert-set"
                                    type="number"
                                    min="1"
                                    value={wholesaleMinStockAlert}
                                    onChange={e => {
                                      const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                      setWholesaleMinStockAlert(val);
                                    }}
                                    onKeyDown={e => handleSetNavKeyDown(e, 1, 1)}
                                    placeholder=""
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#125E45]"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* CASE C: SUITS WHOLESALE SETUP */}
                      {isSuitUnit && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-cyan-900 uppercase tracking-wider block mb-1">
                                Wholesale Rate / Suit (Rs.) *
                              </label>
                              <input
                                type="number"
                                min="0"
                                data-first-rate-input="true"
                                value={suitWholesaleRate}
                                onChange={e => setSuitWholesaleRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="w-full px-3 py-2 text-xs border border-cyan-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                Stock (Suits) *
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={suitStock}
                                onChange={e => setSuitStock(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#125E45]"
                              />
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                              Minimum Stock Warning Alert (Suits)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={wholesaleMinStockAlert}
                              onChange={e => {
                                const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                setWholesaleMinStockAlert(val);
                                if (storeMode === 'Wholesale') setMinStockAlert(val);
                              }}
                              className="w-full sm:w-1/2 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {/* Optional Wholesale Discount Accordion (Matching Retail Accordion Style) */}
                      <div className="pt-2 border-t border-cyan-100">
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowWholesaleDiscount(prev => !prev)}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>{showWholesaleDiscount ? 'Hide' : 'Add'} Wholesale Discount (Optional)</span>
                        </button>

                        {showWholesaleDiscount && (
                          <div className="mt-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">
                              Wholesale Discount per Unit (Rs.)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={wholesaleDiscount}
                              onChange={e => setWholesaleDiscount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                              className="w-full sm:w-1/2 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 4. Retail Pricing Setup (Dedicated Card directly below Wholesale) */}
                {storeMode !== 'Wholesale' && (
                  <Card className="shadow-xs border-blue-200 bg-gradient-to-br from-blue-50/20 via-white to-indigo-50/20">
                    <CardHeader className="pb-3 border-b border-blue-100">
                      <CardTitle className="text-sm font-bold text-blue-950 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-blue-700 text-white flex items-center justify-center text-xs font-bold">
                          {storeMode === 'Retail' ? '3' : '4'}
                        </span>
                        Retail Pricing Setup
                      </CardTitle>
                      <CardDescription className="text-xs text-blue-800/80 mt-0.5">
                        Set walk-in customer selling prices, unit retail rates, and retail discounts.
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-4">
                      {!unit && (
                        <div className="py-6 px-4 text-center rounded-xl border border-dashed border-blue-200 bg-blue-50/20">
                          <p className="text-xs text-blue-900/80 font-medium">
                            Select a Unit Type in Section 2 to enter retail selling rates.
                          </p>
                        </div>
                      )}

                      {/* CASE A: BOX / DABBA RETAIL SETUP */}
                      {isBoxUnit && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* 1st: Retail Rate Per Suit */}
                            <div>
                              <label className="text-xs font-bold text-blue-900 uppercase tracking-wider block mb-1">
                                Retail Rate / Suit (Rs.) *
                              </label>
                              <input
                                type="number"
                                min="0"
                                data-first-rate-input={storeMode === 'Retail' ? 'true' : undefined}
                                value={boxRetailPerSuit}
                                onChange={e => setBoxRetailPerSuit(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="w-full px-3 py-2 text-xs border border-blue-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                              />
                              {boxRetailRate > 0 && retailSuitsInBox > 0 && (
                                <span className="text-[11px] font-semibold text-blue-800 mt-1 block">
                                  = Rs. {boxRetailRate.toLocaleString()} / Box ({retailSuitsInBox} suits)
                                </span>
                              )}
                            </div>

                            {/* 2nd: Suits per Box */}
                            <div>
                              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                Suits Per Box *
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={retailBoxSuitsPerBox}
                                onChange={e => setRetailBoxSuitsPerBox(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#125E45]"
                              />
                            </div>
                          </div>

                          {/* Stock & Warning Alert in 1 row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-blue-100">
                            <div>
                              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                Total Boxes in Stock (Dabbay) *
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={retailBoxTotalBoxes}
                                  onChange={e => setRetailBoxTotalBoxes(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#125E45]"
                                />
                                {retailTotalSuits > 0 && (
                                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                                    = {retailTotalSuits} Suits
                                  </span>
                                )}
                              </div>
                              {totalBoxRetailValuation > 0 && retailNumBoxes > 0 && (
                                <span className="text-[11px] font-bold text-blue-900 mt-1 block">
                                  = Total Value: Rs. {totalBoxRetailValuation.toLocaleString()} ({retailNumBoxes} Dabbay / {retailTotalSuits} Suits)
                                </span>
                              )}
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                Low Stock Warning Alert (Boxes)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={retailMinStockAlert}
                                onChange={e => {
                                  const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                  setRetailMinStockAlert(val);
                                  if (storeMode === 'Retail') setMinStockAlert(val);
                                }}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#125E45]"
                              />
                            </div>
                          </div>

                          {/* Dual Barcode & QR Setup for Box & Individual Suits */}
                          <div className="pt-3 border-t border-blue-100">
                            <div className="mb-2">
                              <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                                <BarcodeIcon className="w-3.5 h-3.5 text-blue-700" />
                                Dual Barcode / QR Codes (Box & Suit)
                              </span>
                              <p className="text-[11px] text-slate-500">
                                Box barcode scan karein to full dabba add hoga. Suit barcode scan karein to 1 single suit add hoga.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Box Barcode Card */}
                              <div className="p-2.5 rounded-xl border border-blue-200 bg-white shadow-2xs space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                                    📦 Full Box Barcode
                                  </span>
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                    {boxRetailRate > 0 ? `Rs. ${boxRetailRate.toLocaleString()}` : 'Full Dabba'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={barcode}
                                    onChange={e => setBarcode(e.target.value)}
                                    className="w-full px-2 py-1 text-xs font-mono font-bold border border-slate-300 rounded bg-slate-50 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                    placeholder="Box Barcode"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(barcode);
                                      toast({ title: 'Box Barcode Copied', description: barcode, type: 'info' });
                                    }}
                                    className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                                    title="Copy Box Barcode"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="flex items-center justify-center gap-[1.5px] h-4 bg-slate-50 p-0.5 rounded border border-slate-200">
                                  {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 2, 3].map((w, i) => (
                                    <div key={i} className="bg-slate-800 h-full" style={{ width: `${w * 1.2}px` }} />
                                  ))}
                                </div>
                              </div>

                              {/* Suit Barcode Card */}
                              <div className="p-2.5 rounded-xl border border-indigo-200 bg-white shadow-2xs space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                                    👗 Single Suit Barcode / QR
                                  </span>
                                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                    {boxRetailSuit > 0 ? `Rs. ${boxRetailSuit.toLocaleString()}` : '1 Suit'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={suitBarcode}
                                    onChange={e => setSuitBarcode(e.target.value)}
                                    className="w-full px-2 py-1 text-xs font-mono font-bold border border-indigo-300 rounded bg-indigo-50/30 text-indigo-950 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                                    placeholder="Suit Barcode"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(suitBarcode);
                                      toast({ title: 'Suit Barcode Copied', description: suitBarcode, type: 'info' });
                                    }}
                                    className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                                    title="Copy Suit Barcode"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="flex items-center justify-center gap-[1.5px] h-4 bg-indigo-50/50 p-0.5 rounded border border-indigo-200">
                                  {[1, 3, 2, 1, 4, 1, 2, 1, 3, 2, 1, 3, 1, 2].map((w, i) => (
                                    <div key={i} className="bg-indigo-900 h-full" style={{ width: `${w * 1.2}px` }} />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* CASE B: THAAN RETAIL SETUP */}
                      {isThaanUnit && (
                        <div className="space-y-4">
                          {/* Meter vs Yard & Thaan Mode selector */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-slate-600 mr-1">Unit:</span>
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => {
                                  setRetailThaanMeasurement('Meter');
                                  if (retailThaanType === 'Sets') setRetailThaanType('Single');
                                }}
                                className={`text-xs font-bold px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                                  retailThaanType !== 'Sets' && retailThaanMeasurement === 'Meter'
                                    ? 'bg-[#125E45] text-white shadow-2xs'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                📏 Meter (m)
                              </button>
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => {
                                  setRetailThaanMeasurement('Yard');
                                  if (retailThaanType === 'Sets') setRetailThaanType('Single');
                                }}
                                className={`text-xs font-bold px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                                  retailThaanType !== 'Sets' && retailThaanMeasurement === 'Yard'
                                    ? 'bg-[#125E45] text-white shadow-2xs'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                📐 Yard / Gaz (yd)
                              </button>
                            </div>

                            {unit !== 'Men Suit' && (
                              <div className="flex items-center gap-1 text-xs">
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onClick={() => setRetailThaanType('Single')}
                                  className={`px-2.5 py-1 rounded-md font-bold cursor-pointer ${
                                    retailThaanType === 'Single' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  1 Thaan
                                </button>
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onClick={() => setRetailThaanType('3Thaan')}
                                  className={`px-2.5 py-1 rounded-md font-bold cursor-pointer ${
                                    retailThaanType === '3Thaan' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  3 Thaan
                                </button>
                                <button
                                  type="button"
                                  tabIndex={-1}
                                  onClick={() => setRetailThaanType('Sets')}
                                  className={`px-2.5 py-1 rounded-md font-bold cursor-pointer ${
                                    retailThaanType === 'Sets' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  2/3pcs
                                </button>
                              </div>
                            )}
                          </div>

                          {retailThaanType === 'Single' && (
                            <div className="space-y-3">
                              {/* Row 1: Roll Length, Retail Roll Price, Retail Rate / {retailThaanMeasurement} */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Roll Length ({retailThaanMeasurement}) *
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={retailThaanEqualLength}
                                    onChange={e => handleRetailThaanLengthChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                  />
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-blue-900 uppercase tracking-wider block mb-1">
                                    Retail Roll Price (Rs.) *
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={thaanRetailRollPrice}
                                    onChange={e => handleRetailRollPriceChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    className="w-full px-3 py-2 text-xs border border-blue-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                  />
                                  {Number(thaanRetailRollPrice) > 0 && retailRollLen > 0 && (
                                    <span className="text-[11px] font-semibold text-blue-800 mt-1 block">
                                      = Rs. {(Number(thaanRetailRollPrice) / retailRollLen).toFixed(2)} / {retailThaanMeasurement}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-blue-900 uppercase tracking-wider block mb-1">
                                    Retail Rate / {retailThaanMeasurement} *
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={thaanPerUnitRetailRate}
                                    onChange={e => handleRetailPerUnitRateChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    className="w-full px-3 py-2 text-xs border border-blue-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                  />
                                  {Number(thaanPerUnitRetailRate) > 0 && retailRollLen > 0 && (
                                    <span className="text-[11px] font-semibold text-blue-800 mt-1 block">
                                      = Rs. {Math.round(Number(thaanPerUnitRetailRate) * retailRollLen).toLocaleString()} / Roll
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Row 2: Total Stock in Hand & Alert */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-blue-100">
                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Total Stock (Thaans / Rolls) *
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={retailThaanTotalRolls}
                                      onChange={e => {
                                        const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                        setRetailThaanTotalRolls(val);
                                        if (storeMode === 'Retail') {
                                          setThaanTotalRolls(val);
                                        }
                                      }}
                                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    />
                                    {Number(retailThaanTotalRolls) > 0 && retailRollLen > 0 && (
                                      <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                                        = {(Number(retailThaanTotalRolls) * retailRollLen).toLocaleString()} {retailThaanMeasurement}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Minimum Stock Warning Alert ({retailThaanMeasurement})
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={retailMinStockAlert}
                                    onChange={e => {
                                      const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                      setRetailMinStockAlert(val);
                                      if (storeMode === 'Retail') setMinStockAlert(val);
                                    }}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {retailThaanType === '3Thaan' && (
                            <div className="space-y-3">
                              {/* Row 1: Roll Length / Piece, Retail Roll Price, Retail Rate / {retailThaanMeasurement} */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Roll Length / Piece ({retailThaanMeasurement}) *
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={retailThaanEqualLength}
                                    onChange={e => handleRetailThaanLengthChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                  />
                                  <span className="text-[10px] text-slate-500 mt-1 block">
                                    Thaan Bundle = {(retailRollLen * 3)} {retailThaanMeasurement}
                                  </span>
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-blue-900 uppercase tracking-wider block mb-1">
                                    Thaan Retail Price (Rs.) *
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={thaanRetailRollPrice}
                                    onChange={e => {
                                      const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                                      setThaanRetailRollPrice(val);
                                      const totalM = retailRollLen * 3;
                                      if (val !== '' && totalM > 0) {
                                        setThaanPerUnitRetailRate(parseFloat((Number(val) / totalM).toFixed(2)));
                                      } else if (val === '') {
                                        setThaanPerUnitRetailRate('');
                                      }
                                    }}
                                    className="w-full px-3 py-2 text-xs border border-blue-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                  />
                                  {Number(thaanRetailRollPrice) > 0 && retailRollLen > 0 && (
                                    <span className="text-[11px] font-semibold text-blue-800 mt-1 block">
                                      = Rs. {(Number(thaanRetailRollPrice) / (retailRollLen * 3)).toFixed(2)} / {retailThaanMeasurement}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-blue-900 uppercase tracking-wider block mb-1">
                                    Retail Rate / {retailThaanMeasurement} *
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={thaanPerUnitRetailRate}
                                    onChange={e => {
                                      const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                                      setThaanPerUnitRetailRate(val);
                                      const totalM = retailRollLen * 3;
                                      if (val !== '' && totalM > 0) {
                                        setThaanRetailRollPrice(Math.round(Number(val) * totalM));
                                      } else if (val === '') {
                                        setThaanRetailRollPrice('');
                                      }
                                    }}
                                    className="w-full px-3 py-2 text-xs border border-blue-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                  />
                                  {Number(thaanPerUnitRetailRate) > 0 && retailRollLen > 0 && (
                                    <span className="text-[11px] font-semibold text-blue-800 mt-1 block">
                                      = Rs. {Math.round(Number(thaanPerUnitRetailRate) * (retailRollLen * 3)).toLocaleString()} / Bundle
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Row 2: Total Stock in Hand & Alert */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-blue-100">
                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Total Stock (Thaan Bundles) *
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={retailThaanTotalRolls}
                                      onChange={e => {
                                        const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                        setRetailThaanTotalRolls(val);
                                        if (storeMode === 'Retail') {
                                          setThaanTotalRolls(val);
                                        }
                                      }}
                                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    />
                                    {Number(retailThaanTotalRolls) > 0 && retailRollLen > 0 && (
                                      <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                                        = {(Number(retailThaanTotalRolls) * retailRollLen * 3).toLocaleString()} {retailThaanMeasurement}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Minimum Stock Warning Alert ({retailThaanMeasurement})
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={retailMinStockAlert}
                                    onChange={e => {
                                      const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                      setRetailMinStockAlert(val);
                                      if (storeMode === 'Retail') setMinStockAlert(val);
                                    }}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {retailThaanType === 'Sets' && (
                            <div className="space-y-3">
                              {/* Row 1: Field 1 (Piece Type), Field 2 (Suits in Set), Field 3 (Retail / Set Rs.) */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Piece Type (2-Piece / 3-Piece) *
                                  </label>
                                  <select
                                    id="ret-piece-type"
                                    value={retailThaanSetType}
                                    onChange={e => setRetailThaanSetType(e.target.value)}
                                    onKeyDown={e => handleSetNavKeyDown(e, 2, 0)}
                                    className="w-full px-3 py-2 text-xs border border-blue-300 rounded-lg bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                  >
                                    <option value="">Select Piece Type...</option>
                                    <option value="1-Piece">1-Piece</option>
                                    <option value="2-Piece">2-Piece</option>
                                    <option value="3-Piece">3-Piece</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Suits in Set *
                                  </label>
                                  <input
                                    id="ret-suits-set"
                                    type="number"
                                    min="1"
                                    value={retailThaanSuitsPerSet}
                                    onChange={e => setRetailThaanSuitsPerSet(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                                    onKeyDown={e => handleSetNavKeyDown(e, 2, 1)}
                                    placeholder=""
                                    className="w-full px-3 py-2 text-xs border border-blue-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                  />
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-blue-900 uppercase tracking-wider block mb-1">
                                    Retail / Set (Rs.) *
                                  </label>
                                  <input
                                    id="ret-rate-set"
                                    type="number"
                                    min="0"
                                    value={thaanSetRetailRate}
                                    onChange={e => setThaanSetRetailRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    onKeyDown={e => handleSetNavKeyDown(e, 2, 2)}
                                    placeholder=""
                                    className="w-full px-3 py-2 text-xs border border-blue-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                  />
                                </div>
                              </div>

                              {/* Row 2: Field 4 (Total Stock Sets) & Field 5 (Minimum Stock Warning Alert Sets) */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-blue-100">
                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Total Stock (Sets) *
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      id="ret-stock-set"
                                      type="number"
                                      min="0"
                                      value={retailThaanSetsCount}
                                      onChange={e => {
                                        const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                        setRetailThaanSetsCount(val);
                                        if (storeMode === 'Retail') {
                                          setThaanSetsCount(val);
                                        }
                                      }}
                                      onKeyDown={e => handleSetNavKeyDown(e, 3, 0)}
                                      placeholder=""
                                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    />
                                    {Number(retailThaanSetsCount) > 0 && (
                                      <span className="text-xs font-bold text-slate-600 whitespace-nowrap bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                                        = {retailThaanSetsCount} Sets {Number(retailThaanSuitsPerSet) > 0 ? `(${Number(retailThaanSetsCount) * Number(retailThaanSuitsPerSet)} Suits)` : ''}
                                      </span>
                                    )}
                                  </div>
                                  {Number(retailThaanSetsCount) > 0 && Number(thaanSetRetailRate) > 0 && (
                                    <span className="text-[11px] font-bold text-blue-700 mt-1 block">
                                      = Total Value: Rs. {(Number(retailThaanSetsCount) * Number(thaanSetRetailRate)).toLocaleString()}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                    Minimum Stock Warning Alert (Sets)
                                  </label>
                                  <input
                                    id="ret-alert-set"
                                    type="number"
                                    min="1"
                                    value={retailMinStockAlert}
                                    onChange={e => {
                                      const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                      setRetailMinStockAlert(val);
                                      if (storeMode === 'Retail') setMinStockAlert(val);
                                    }}
                                    onKeyDown={e => handleSetNavKeyDown(e, 3, 1)}
                                    placeholder=""
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          {/* If both modes active, show live stock summary pill */}
                          {storeMode === 'Both' && (totalThaanRollsCount > 0 || totalThaanSets > 0) && (
                            <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200/80 flex items-center justify-between text-xs text-blue-950">
                              <span className="font-semibold flex items-center gap-1.5">
                                📦 Shared Inventory Stock:
                              </span>
                              <span className="font-mono font-bold text-blue-900">
                                {retailThaanType === 'Sets'
                                  ? `${retailThaanSetsCount || totalThaanSets} Sets`
                                  : `${retailThaanTotalRolls || totalThaanRollsCount} ${retailThaanType === '3Thaan' ? 'Bundles' : 'Thaans'} (${(Number(retailThaanTotalRolls) || totalThaanRollsCount) * singleRetailRollLength * (retailThaanType === '3Thaan' ? 3 : 1)} ${retailThaanMeasurement})`}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* CASE C: SUITS RETAIL SETUP */}
                      {isSuitUnit && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-blue-900 uppercase tracking-wider block mb-1">
                                Retail Rate / Suit *
                              </label>
                              <input
                                type="number"
                                min="0"
                                data-first-rate-input={storeMode === 'Retail' ? 'true' : undefined}
                                value={suitRetailRate}
                                onChange={e => setSuitRetailRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="w-full px-3 py-2 text-xs border border-blue-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                Stock (Suits) *
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={retailSuitStock}
                                onChange={e => {
                                  const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                  setRetailSuitStock(val);
                                  if (storeMode === 'Retail') setSuitStock(val);
                                }}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                              />
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                              Minimum Stock Warning Alert (Suits)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={retailMinStockAlert}
                              onChange={e => {
                                const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                setRetailMinStockAlert(val);
                                if (storeMode === 'Retail') setMinStockAlert(val);
                              }}
                              className="w-full sm:w-1/2 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {/* Optional Discounts & Tax */}
                      <div className="pt-2 border-t border-blue-100">
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowAdvancedOptions(prev => !prev)}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>{showAdvancedOptions ? 'Hide' : 'Add'} Retail Discount or GST Tax (Optional)</span>
                        </button>

                        {showAdvancedOptions && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                Retail Discount (Rs.)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={retailDiscount}
                                onChange={e => setRetailDiscount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                GST Tax Rate (%)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={taxRate}
                                onChange={e => setTaxRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* RIGHT COLUMN: Live Article Preview & Summary Card (4 Columns on desktop) */}
              <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6">
                <Card className="border-slate-300 bg-white shadow-sm overflow-hidden">
                  <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Live Article Summary
                    </span>
                    <span className="text-[11px] font-mono text-slate-300">
                      {sku || 'FAB-AUTO'}
                    </span>
                  </div>

                  <CardContent className="p-4 space-y-3.5 text-xs">
                    {/* Title preview */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Article Title</span>
                      <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2">
                        {name || 'New Fabric Article'}
                      </h3>
                      {(category || seasonCategory || unit) ? (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {category && (
                            <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              {category}
                            </span>
                          )}
                          {seasonCategory && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              seasonCategory === 'Summer' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                            }`}>
                              {seasonCategory}
                            </span>
                          )}
                          {unit && (
                            <span className="bg-purple-100 text-purple-900 text-[10px] font-bold px-2 py-0.5 rounded">
                              {isThaanUnit && (thaanType === 'Sets' || retailThaanType === 'Sets')
                                ? `Thaan (2/3pcs Sets)`
                                : unit}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-1 italic">Category, season & unit not selected yet</p>
                      )}
                    </div>

                    {/* PRICING BREAKDOWN */}
                    {/* PRICING & INVENTORY BREAKDOWN */}
                    <div className="border-t border-slate-100 pt-3 space-y-2.5">
                      {isBoxUnit ? (
                        <div className="space-y-2.5">
                          {/* Wholesale Box Rates & Inventory Card */}
                          {storeMode !== 'Retail' && (
                            <div className="p-2.5 rounded-xl bg-cyan-50/70 border border-cyan-200/80 space-y-1.5">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-950 block">
                                Wholesale Rates {wholesaleSuitsInBox > 0 ? `(${wholesaleSuitsInBox} suits/box)` : ''}
                              </span>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-600">Rate / Suit:</span>
                                <span className="font-mono font-bold text-cyan-900">
                                  {boxWholesaleSuit > 0 ? `Rs. ${boxWholesaleSuit.toLocaleString()}` : '-'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-600 font-medium">Rate / Full Box:</span>
                                <span className="font-mono font-extrabold text-cyan-950">
                                  {boxWholesaleRate > 0 ? `Rs. ${boxWholesaleRate.toLocaleString()}` : '-'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-cyan-200/60">
                                <span className="text-slate-600 font-medium">Stock in Hand:</span>
                                <span className="font-mono font-bold text-cyan-900">
                                  {wholesaleNumBoxes > 0 ? `${wholesaleNumBoxes} Boxes (${wholesaleTotalSuits} Suits)` : '-'}
                                </span>
                              </div>
                              {wholesaleNumBoxes > 0 && totalBoxWholesaleValuation > 0 && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-600 font-medium">Stock Value:</span>
                                  <span className="font-mono font-bold text-cyan-950">
                                    Rs. {totalBoxWholesaleValuation.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-cyan-200/60">
                                <span className="text-cyan-900 font-medium flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-cyan-700" /> Low Stock Alert:
                                </span>
                                <span className="font-mono font-bold text-cyan-950">
                                  {wholesaleMinStockAlert !== '' ? `≤ ${wholesaleMinStockAlert} Boxes` : '-'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Retail Box Rates & Inventory Card */}
                          {storeMode !== 'Wholesale' && (
                            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1.5">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-950 block">
                                Retail Rates {retailSuitsInBox > 0 ? `(${retailSuitsInBox} suits/box)` : ''}
                              </span>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-600">Rate / Suit:</span>
                                <span className="font-mono font-bold text-blue-900">
                                  {boxRetailSuit > 0 ? `Rs. ${boxRetailSuit.toLocaleString()}` : '-'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-600 font-medium">Rate / Full Box:</span>
                                <span className="font-mono font-extrabold text-blue-950">
                                  {boxRetailRate > 0 ? `Rs. ${boxRetailRate.toLocaleString()}` : '-'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-blue-200/60">
                                <span className="text-slate-600 font-medium">Stock in Hand:</span>
                                <span className="font-mono font-bold text-blue-900">
                                  {retailNumBoxes > 0 ? `${retailNumBoxes} Boxes (${retailTotalSuits} Suits)` : '-'}
                                </span>
                              </div>
                              {retailNumBoxes > 0 && totalBoxRetailValuation > 0 && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-600 font-medium">Stock Value:</span>
                                  <span className="font-mono font-bold text-blue-950">
                                    Rs. {totalBoxRetailValuation.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-blue-200/60">
                                <span className="text-blue-900 font-medium flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-blue-700" /> Low Stock Alert:
                                </span>
                                <span className="font-mono font-bold text-blue-950">
                                  {retailMinStockAlert !== '' ? `≤ ${retailMinStockAlert} Boxes` : '-'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Profit Margin */}
                          {storeMode === 'Both' && boxRetailSuit > 0 && boxWholesaleSuit > 0 && profitMarginPercent > 0 && (
                            <div className="flex items-center justify-between text-[11px] pt-0.5">
                              <span className="text-slate-500">Retail Margin:</span>
                              <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                +{profitMarginPercent}% Margin
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {storeMode !== 'Retail' && (
                            <div className="p-2.5 rounded-xl bg-cyan-50/70 border border-cyan-200/80 space-y-1.5">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-950 block">
                                Wholesale Setup
                              </span>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-600">Wholesale Rate:</span>
                                <span className="font-mono font-bold text-cyan-900">
                                  {resolvedWholesalePrice > 0 ? (
                                    isThaanUnit && thaanType === 'Sets' ? (
                                      `Rs. ${resolvedWholesalePrice.toLocaleString()} / Set`
                                    ) : (
                                      `Rs. ${resolvedWholesalePrice.toLocaleString()}`
                                    )
                                  ) : '-'}
                                </span>
                              </div>
                              {isThaanUnit && thaanType === 'Sets' && (
                                <>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600 font-medium">Piece Type:</span>
                                    <span className="font-mono font-bold text-cyan-900">
                                      {thaanSetType || '-'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600 font-medium">Suits in Set:</span>
                                    <span className="font-mono font-bold text-cyan-900">
                                      {thaanSuitsPerSet ? `${thaanSuitsPerSet} Suits` : '-'}
                                    </span>
                                  </div>
                                </>
                              )}
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-cyan-200/60">
                                <span className="text-slate-600 font-medium">Stock in Hand:</span>
                                <span className="font-mono font-bold text-cyan-900">
                                  {isThaanUnit ? (
                                    thaanType === 'Sets' ? (
                                      Number(thaanSetsCount) > 0 ? (
                                        `${thaanSetsCount} Sets`
                                      ) : '-'
                                    ) : (
                                      totalThaanRollsCount > 0 ? (
                                        `${totalThaanRollsCount} ${thaanType === '3Thaan' ? 'Bundles' : 'Thaans'} (${resolvedInitialStock} ${thaanMeasurement})`
                                      ) : '-'
                                    )
                                  ) : (
                                    Number(suitStock) > 0 ? `${suitStock} Suits` : '-'
                                  )}
                                </span>
                              </div>
                              {((isThaanUnit && (
                                (thaanType === 'Sets' && Number(thaanSetWholesaleRate) > 0 && Number(thaanSetsCount) > 0) ||
                                (thaanType !== 'Sets' && Number(thaanWholesalePrice) > 0 && totalThaanRollsCount > 0)
                              )) || (isSuitUnit && Number(suitWholesaleRate) > 0 && Number(suitStock) > 0)) && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-600 font-medium">Stock Value:</span>
                                  <span className="font-mono font-bold text-cyan-950">
                                    Rs. {(isThaanUnit
                                      ? (thaanType === 'Sets'
                                          ? Number(thaanSetsCount) * Number(thaanSetWholesaleRate)
                                          : totalThaanRollsCount * Number(thaanWholesalePrice))
                                      : Number(suitStock) * Number(suitWholesaleRate)
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-cyan-200/60">
                                <span className="text-cyan-900 font-medium flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-cyan-700" /> Low Stock Alert:
                                </span>
                                <span className="font-mono font-bold text-cyan-950">
                                  {wholesaleMinStockAlert !== ''
                                    ? `≤ ${wholesaleMinStockAlert} ${isThaanUnit ? (thaanType === 'Sets' ? 'Sets' : thaanMeasurement) : alertUnitSuffix}`
                                    : (storeMode === 'Wholesale' && minStockAlert !== '' ? `≤ ${minStockAlert} ${alertUnitSuffix}` : '-')}
                                </span>
                              </div>
                            </div>
                          )}

                          {storeMode !== 'Wholesale' && (
                            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1.5">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-950 block">
                                Retail Setup
                              </span>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-600">Retail Rate:</span>
                                <span className="font-mono font-bold text-blue-900">
                                  {resolvedRetailPrice > 0 ? (
                                    isThaanUnit && retailThaanType === 'Single' ? (
                                      `Rs. ${resolvedRetailPrice.toLocaleString()} / ${retailThaanMeasurement}`
                                    ) : isThaanUnit && retailThaanType === 'Sets' ? (
                                      `Rs. ${resolvedRetailPrice.toLocaleString()} / Set`
                                    ) : (
                                      `Rs. ${resolvedRetailPrice.toLocaleString()}`
                                    )
                                  ) : '-'}
                                </span>
                              </div>
                              {isThaanUnit && retailThaanType === 'Sets' && (
                                <>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600 font-medium">Piece Type:</span>
                                    <span className="font-mono font-bold text-blue-900">
                                      {retailThaanSetType || '-'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600 font-medium">Suits in Set:</span>
                                    <span className="font-mono font-bold text-blue-900">
                                      {retailThaanSuitsPerSet ? `${retailThaanSuitsPerSet} Suits` : '-'}
                                    </span>
                                  </div>
                                </>
                              )}
                              {isThaanUnit && (retailThaanType === 'Single' || retailThaanType === '3Thaan') && Number(thaanRetailRollPrice) > 0 && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-600">{retailThaanType === '3Thaan' ? 'Thaan Price:' : 'Roll Price:'}</span>
                                  <span className="font-mono font-bold text-blue-950">
                                    Rs. {Number(thaanRetailRollPrice).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-blue-200/60">
                                <span className="text-slate-600 font-medium">Stock in Hand:</span>
                                <span className="font-mono font-bold text-blue-900">
                                  {isThaanUnit ? (
                                    retailThaanType === 'Sets' ? (
                                      Number(retailThaanSetsCount) > 0 ? (
                                        `${retailThaanSetsCount} Sets`
                                      ) : '-'
                                    ) : Number(retailThaanTotalRolls) > 0 ? (
                                      `${retailThaanTotalRolls} ${retailThaanType === '3Thaan' ? 'Bundles' : 'Thaans'} (${Number(retailThaanTotalRolls) * (Number(retailThaanEqualLength) || Number(thaanEqualLength) || 0) * (retailThaanType === '3Thaan' ? 3 : 1)} ${retailThaanMeasurement})`
                                    ) : '-'
                                  ) : isSuitUnit ? (
                                    Number(retailSuitStock) > 0 ? (
                                      `${retailSuitStock} Suits`
                                    ) : '-'
                                  ) : (
                                    isBoxUnit && retailTotalSuits > 0 ? `${retailTotalSuits} Suits` : '-'
                                  )}
                                </span>
                              </div>
                              {((isThaanUnit && retailThaanType === 'Sets' && Number(thaanSetRetailRate) > 0 && Number(retailThaanSetsCount) > 0) ||
                                (isSuitUnit && Number(suitRetailRate) > 0 && Number(retailSuitStock) > 0)) && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-600 font-medium">Stock Value:</span>
                                  <span className="font-mono font-bold text-blue-950">
                                    Rs. {(isThaanUnit
                                      ? Number(retailThaanSetsCount) * Number(thaanSetRetailRate)
                                      : Number(retailSuitStock) * Number(suitRetailRate)
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-blue-200/60">
                                <span className="text-blue-900 font-medium flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-blue-700" /> Low Stock Alert:
                                </span>
                                <span className="font-mono font-bold text-blue-950">
                                  {retailMinStockAlert !== ''
                                    ? `≤ ${retailMinStockAlert} ${isThaanUnit ? (retailThaanType === 'Sets' ? 'Sets' : retailThaanMeasurement) : alertUnitSuffix}`
                                    : (storeMode === 'Retail' && minStockAlert !== '' ? `≤ ${minStockAlert} ${alertUnitSuffix}` : '-')}
                                </span>
                              </div>
                            </div>
                          )}

                          {storeMode === 'Both' && profitMarginPercent > 0 && (
                            <div className="flex items-center justify-between text-[11px] pt-1">
                              <span className="text-slate-500">Retail Margin:</span>
                              <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                +{profitMarginPercent}% Margin
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Compact Barcode Preview */}
                    <div className="border-t border-slate-100 pt-3 text-center space-y-1.5">
                      {isBoxUnit ? (
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                          <div className="p-1 rounded bg-slate-50 border border-slate-200">
                            <span className="text-slate-400 block text-[9px]">Box Barcode</span>
                            <span className="font-bold text-slate-800">{barcode}</span>
                          </div>
                          <div className="p-1 rounded bg-indigo-50/50 border border-indigo-200">
                            <span className="text-indigo-400 block text-[9px]">Suit Barcode</span>
                            <span className="font-bold text-indigo-900">{suitBarcode}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono block mb-1">{barcode}</span>
                      )}
                      <div className="flex items-center justify-center gap-[2px] h-6 bg-white p-1 rounded border border-slate-200 mx-auto max-w-[140px]">
                        {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 2, 3].map((w, i) => (
                          <div key={i} className="bg-slate-900 h-full" style={{ width: `${w * 1.2}px` }} />
                        ))}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full font-bold gap-2 bg-[#125E45] hover:bg-[#197A5A] text-white shadow-sm cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Save & Publish to POS
                      </Button>
                      <Link href="/products" className="block text-center mt-2 text-xs text-slate-500 hover:text-slate-800">
                        Cancel & Return
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
