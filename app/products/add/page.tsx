'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  Barcode as BarcodeIcon,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { productsService } from '@/services/productsService';
import { inventoryService } from '@/services/inventoryService';
import { storageService } from '@/services/storageService';
import {
  MALE_FABRIC_CATEGORIES,
  FEMALE_FABRIC_CATEGORIES,
  MALE_PACKAGING_UNITS,
  FEMALE_PACKAGING_UNITS,
} from '@/data/fabricCategories';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ProductCategory, UnitType, SeasonCategory } from '@/types';

export default function AddProductPage() {
  const router = useRouter();
  const { currentStaff } = useAuth();
  const { toast } = useToast();

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryWrapperRef = useRef<HTMLDivElement>(null);

  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const unitWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryWrapperRef.current && !categoryWrapperRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (unitWrapperRef.current && !unitWrapperRef.current.contains(event.target as Node)) {
        setIsUnitDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<ProductCategory>('' as ProductCategory);
  const [seasonCategory, setSeasonCategory] = useState<SeasonCategory | ''>('');
  const [subcategory, setSubcategory] = useState('');
  const [unit, setUnit] = useState<UnitType | ''>('');
  const [retailPrice, setRetailPrice] = useState<number | ''>('');
  const [wholesalePrice, setWholesalePrice] = useState<number | ''>('');
  const [khataPrice, setKhataPrice] = useState<number | ''>('');
  const [retailDiscount, setRetailDiscount] = useState<number | ''>('');
  const [wholesaleDiscount, setWholesaleDiscount] = useState<number | ''>('');
  const [khataDiscount, setKhataDiscount] = useState<number | ''>('');
  const [taxRate, setTaxRate] = useState<number | ''>('');
  const [initialStock, setInitialStock] = useState<number | ''>('');
  const [minStockAlert, setMinStockAlert] = useState<number | ''>('');
  const [supplier] = useState('');
  const [description] = useState('');
  const [barcode, setBarcode] = useState('896400100001');
  const [wholesaleBarcode, setWholesaleBarcode] = useState('896401100001');

  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBarcode('896400' + Math.floor(100000 + Math.random() * 900000));
      setWholesaleBarcode('896401' + Math.floor(100000 + Math.random() * 900000));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Helper to generate SKU from article name with guaranteed uniqueness
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

    // Verify uniqueness against existing inventory
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

  const filteredMaleCategories = MALE_FABRIC_CATEGORIES.filter(cat =>
    !category.trim() || cat.toLowerCase().includes(category.toLowerCase().trim())
  );
  const filteredFemaleCategories = FEMALE_FABRIC_CATEGORIES.filter(cat =>
    !category.trim() || cat.toLowerCase().includes(category.toLowerCase().trim())
  );

  const filteredMaleUnits = MALE_PACKAGING_UNITS.filter(u =>
    !unit.trim() || u.toLowerCase().includes(unit.toLowerCase().trim())
  );
  const filteredFemaleUnits = FEMALE_PACKAGING_UNITS.filter(u =>
    !unit.trim() || u.toLowerCase().includes(unit.toLowerCase().trim())
  );

  // Auto-generate realistic SKU and Barcode
  const handleAutoGenerateSKU = () => {
    const catCode = category ? category.slice(0, 3).toUpperCase() : 'FAB';
    const unitCode = unit ? unit.slice(0, 3).toUpperCase() : 'BOX';
    const newSku = name.trim()
      ? generateSkuFromName(name, category || ('Fabric' as ProductCategory))
      : `${catCode}-${unitCode}-${Math.floor(100 + Math.random() * 900)}`;

    setSku(newSku);
    setSkuManuallyEdited(false);

    const newRetailBarcode = '896400' + Math.floor(100000 + Math.random() * 900000);
    const newWholesaleBarcode = '896401' + Math.floor(100000 + Math.random() * 900000);
    setBarcode(newRetailBarcode);
    setWholesaleBarcode(newWholesaleBarcode);

    toast({
      title: 'Unique SKU & Barcodes Generated',
      description: `Generated SKU: ${newSku}`,
      type: 'info',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: 'Validation Error', description: 'Fabric / Article name is required.', type: 'error' });
      return;
    }

    if (!category.trim()) {
      toast({ title: 'Validation Error', description: 'Please select or enter a Fabric Category.', type: 'error' });
      return;
    }

    if (!unit) {
      toast({ title: 'Validation Error', description: 'Please select a Packaging / Unit Type.', type: 'error' });
      return;
    }

    const parsedRetailPrice = Number(retailPrice) || 0;
    if (parsedRetailPrice <= 0) {
      toast({ title: 'Validation Error', description: 'Retail Price must be greater than zero.', type: 'error' });
      return;
    }

    const parsedWholesalePrice = Number(wholesalePrice) || 0;
    if (parsedWholesalePrice <= 0) {
      toast({ title: 'Validation Error', description: 'Wholesale Price must be greater than zero.', type: 'error' });
      return;
    }

    const parsedKhataPrice = Number(khataPrice) || 0;
    if (parsedKhataPrice <= 0) {
      toast({ title: 'Validation Error', description: 'Khata Sale Price must be greater than zero.', type: 'error' });
      return;
    }

    const parsedInitialStock = Math.max(0, Number(initialStock) || 0);
    const parsedMinStockAlert = Math.max(1, Number(minStockAlert) || 5);

    const finalSku = sku.trim() || generateSkuFromName(name, category);

    // Validate SKU uniqueness before saving
    const existingProducts = productsService.getAll();
    const duplicate = existingProducts.find(
      p => p.sku.trim().toLowerCase() === finalSku.toLowerCase()
    );
    if (duplicate) {
      toast({
        title: 'SKU Already Exists',
        description: `The SKU "${finalSku}" is already assigned to "${duplicate.name}". Please enter or generate a unique SKU.`,
        type: 'error',
      });
      return;
    }

    const newProduct = productsService.add({
      name,
      sku: finalSku,
      category,
      seasonCategory: (seasonCategory as SeasonCategory) || 'Summer',
      subcategory: subcategory || `${category} Collection`,
      unit: (unit as UnitType) || '3-Piece Box (3PC)',
      retailPrice: parsedRetailPrice,
      wholesalePrice: parsedWholesalePrice,
      khataPrice: parsedKhataPrice,
      retailDiscount: Math.max(0, Number(retailDiscount) || 0),
      wholesaleDiscount: Math.max(0, Number(wholesaleDiscount) || 0),
      khataDiscount: Math.max(0, Number(khataDiscount) || 0),
      taxRate: Math.max(0, Number(taxRate) || 0),
      stock: parsedInitialStock,
      minStockAlert: parsedMinStockAlert,
      supplier: supplier || 'Local Mill',
      description,
      barcode,
      wholesaleBarcode,
    });

    // Log initial stock movement
    if (parsedInitialStock > 0) {
      inventoryService.recordMovement({
        productId: newProduct.id,
        productName: newProduct.name,
        sku: newProduct.sku,
        movementType: 'Initial',
        quantityChange: parsedInitialStock,
        previousStock: 0,
        newStock: parsedInitialStock,
        staffName: currentStaff?.name || 'Stock Manager',
        notes: 'Initial inventory intake for new article',
      });
    }

    toast({
      title: 'Fabric Registered Successfully',
      description: `${newProduct.name} is now in stock and available across all POS registers.`,
      type: 'success',
    });

    router.push('/products');
  };

  return (
    <ProtectedRoute permission="stock_add">
      <AppShell>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/products">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" /> Back to Products
                </Button>
              </Link>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Add New Fabric / Article
              </h1>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAutoGenerateSKU}
              className="gap-1.5 text-blue-600 font-semibold"
            >
              <Sparkles className="w-4 h-4" /> Auto-Generate SKU & Barcode
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Primary Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">General Information & Fabric Attributes</CardTitle>
                <CardDescription>Enter the primary specifications of the cloth article.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Input
                      label="Fabric / Article Name *"
                      value={name}
                      onChange={e => handleNameChange(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Input
                      label="SKU Code (Auto-generated from Name)"
                      value={sku}
                      onChange={e => {
                        setSku(e.target.value);
                        setSkuManuallyEdited(true);
                      }}
                    />
                  </div>

                  <div>
                    <Select
                      label="Summer / Winter Category *"
                      value={seasonCategory}
                      onChange={e => setSeasonCategory(e.target.value as SeasonCategory)}
                    >
                      <option value="">Select Season / Category...</option>
                      <option value="Summer">☀️ Summer</option>
                      <option value="Winter">❄️ Winter</option>
                    </Select>
                  </div>

                  {/* Fabric Category: Unified Combobox with Male & Female bold section headers */}
                  <div ref={categoryWrapperRef}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Fabric Category *
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Type custom or pick from list
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={category}
                        onChange={e => {
                          handleCategoryChange(e.target.value);
                          setIsCategoryDropdownOpen(true);
                        }}
                        onFocus={() => setIsCategoryDropdownOpen(true)}
                        required
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setIsCategoryDropdownOpen(prev => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Toggle category list"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      {isCategoryDropdownOpen && (
                        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
                          {/* Female Categories Group First */}
                          {filteredFemaleCategories.length > 0 && (
                            <div>
                              <div className="sticky top-0 z-10 px-3 py-1.5 bg-rose-50/95 border-b border-rose-200/80 flex items-center justify-between text-rose-900">
                                <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                  <span>👗</span>
                                  <span>FEMALE (Women)</span>
                                </span>
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-200/60 px-1.5 py-0.5 rounded-full">
                                  {filteredFemaleCategories.length}
                                </span>
                              </div>
                              <div className="py-1">
                                {filteredFemaleCategories.map(cat => (
                                  <button
                                    key={`female-${cat}`}
                                    type="button"
                                    onClick={() => {
                                      handleCategoryChange(cat);
                                      setIsCategoryDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-rose-50 flex items-center justify-between transition-colors cursor-pointer ${
                                      category === cat
                                        ? 'bg-rose-50/80 font-bold text-rose-900'
                                        : 'text-slate-800'
                                    }`}
                                  >
                                    <span>{cat}</span>
                                    {category === cat && <Check className="w-3.5 h-3.5 text-rose-600" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Male Categories Group Second */}
                          {filteredMaleCategories.length > 0 && (
                            <div>
                              <div className="sticky top-0 z-10 px-3 py-1.5 bg-blue-50/95 border-t border-b border-blue-200/80 flex items-center justify-between text-blue-900">
                                <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                  <span>👔</span>
                                  <span>MALE (Men)</span>
                                </span>
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-200/60 px-1.5 py-0.5 rounded-full">
                                  {filteredMaleCategories.length}
                                </span>
                              </div>
                              <div className="py-1">
                                {filteredMaleCategories.map(cat => (
                                  <button
                                    key={`male-${cat}`}
                                    type="button"
                                    onClick={() => {
                                      handleCategoryChange(cat);
                                      setIsCategoryDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center justify-between transition-colors cursor-pointer ${
                                      category === cat
                                        ? 'bg-blue-50/80 font-bold text-blue-900'
                                        : 'text-slate-800'
                                    }`}
                                  >
                                    <span>{cat}</span>
                                    {category === cat && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Custom Category fallback if typed */}
                          {category.trim() &&
                            !MALE_FABRIC_CATEGORIES.some(c => c.toLowerCase() === category.toLowerCase().trim()) &&
                            !FEMALE_FABRIC_CATEGORIES.some(c => c.toLowerCase() === category.toLowerCase().trim()) && (
                              <div className="p-2.5 text-xs text-slate-600 bg-slate-50 text-center border-t border-slate-200">
                                Using custom category: <strong className="text-slate-900">&quot;{category}&quot;</strong>
                              </div>
                            )}

                          {/* If filter didn't match any */}
                          {filteredMaleCategories.length === 0 && filteredFemaleCategories.length === 0 && (
                            <div className="p-3 text-xs text-slate-500 text-center">
                              No predefined categories match &quot;{category}&quot;. You can use it as a custom category.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Choose from Female / Male categories or type any custom fabric.
                    </span>
                  </div>

                  {/* Packaging / Unit Type: Searchable Combobox with Female then Male bold sections (Drops DOWN) */}
                  <div ref={unitWrapperRef}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Packaging / Unit Type *
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Type custom or pick from list
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={unit}
                        onChange={e => {
                          setUnit(e.target.value as UnitType);
                          setIsUnitDropdownOpen(true);
                        }}
                        onFocus={() => setIsUnitDropdownOpen(true)}
                        required
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setIsUnitDropdownOpen(prev => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Toggle packaging unit list"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      {isUnitDropdownOpen && (
                        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
                          {/* Female Units Group First */}
                          {filteredFemaleUnits.length > 0 && (
                            <div>
                              <div className="sticky top-0 z-10 px-3 py-1.5 bg-rose-50/95 border-b border-rose-200/80 flex items-center justify-between text-rose-900">
                                <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                  <span>👗</span>
                                  <span>FEMALE (Women) Units</span>
                                </span>
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-200/60 px-1.5 py-0.5 rounded-full">
                                  {filteredFemaleUnits.length}
                                </span>
                              </div>
                              <div className="py-1">
                                {filteredFemaleUnits.map(u => (
                                  <button
                                    key={`female-unit-${u}`}
                                    type="button"
                                    onClick={() => {
                                      setUnit(u as UnitType);
                                      setIsUnitDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-rose-50 flex items-center justify-between transition-colors cursor-pointer ${
                                      unit === u
                                        ? 'bg-rose-50/80 font-bold text-rose-900'
                                        : 'text-slate-800'
                                    }`}
                                  >
                                    <span>{u}</span>
                                    {unit === u && <Check className="w-3.5 h-3.5 text-rose-600" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Male Units Group Second */}
                          {filteredMaleUnits.length > 0 && (
                            <div>
                              <div className="sticky top-0 z-10 px-3 py-1.5 bg-blue-50/95 border-t border-blue-200/80 border-b flex items-center justify-between text-blue-900">
                                <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                  <span>👔</span>
                                  <span>MALE (Men) Units</span>
                                </span>
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-200/60 px-1.5 py-0.5 rounded-full">
                                  {filteredMaleUnits.length}
                                </span>
                              </div>
                              <div className="py-1">
                                {filteredMaleUnits.map(u => (
                                  <button
                                    key={`male-unit-${u}`}
                                    type="button"
                                    onClick={() => {
                                      setUnit(u as UnitType);
                                      setIsUnitDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center justify-between transition-colors cursor-pointer ${
                                      unit === u
                                        ? 'bg-blue-50/80 font-bold text-blue-900'
                                        : 'text-slate-800'
                                    }`}
                                  >
                                    <span>{u}</span>
                                    {unit === u && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Custom Unit fallback if typed */}
                          {unit.trim() &&
                            !MALE_PACKAGING_UNITS.some(u => u.toLowerCase() === unit.toLowerCase().trim()) &&
                            !FEMALE_PACKAGING_UNITS.some(u => u.toLowerCase() === unit.toLowerCase().trim()) && (
                              <div className="p-2.5 text-xs text-slate-600 bg-slate-50 text-center border-t border-slate-200">
                                Using custom unit: <strong className="text-slate-900">&quot;{unit}&quot;</strong>
                              </div>
                            )}

                          {/* If filter didn't match any */}
                          {filteredMaleUnits.length === 0 && filteredFemaleUnits.length === 0 && (
                            <div className="p-3 text-xs text-slate-500 text-center">
                              No predefined units match &quot;{unit}&quot;. You can use it as a custom unit.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Choose packaging unit or type custom unit (e.g. Suit Packet, Box, Thaan, Meter).
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing & Stock Setup */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold">Pricing & Discounts Setup (PKR / Rs.)</CardTitle>
                  <CardDescription>Define walk-in retail & wholesale rates with fixed rupee discounts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 p-3 rounded-xl bg-blue-50/40 border border-blue-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Input
                        label="Retail Price (Rs.) *"
                        type="number"
                        min="0"
                        value={retailPrice}
                        onChange={e => setRetailPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        required
                      />
                      <Input
                        label="Retail Discount (Rs.)"
                        type="number"
                        min="0"
                        value={retailDiscount}
                        onChange={e => setRetailDiscount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-blue-200/50">
                      <span className="text-slate-600 font-medium">Final Retail:</span>
                      <span className="font-mono font-bold text-blue-700">
                        Rs. {Math.max(0, (Number(retailPrice) || 0) - (Number(retailDiscount) || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 p-3 rounded-xl bg-cyan-50/40 border border-cyan-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Input
                        label="Wholesale Price (Rs.) *"
                        type="number"
                        min="0"
                        value={wholesalePrice}
                        onChange={e => setWholesalePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        required
                      />
                      <Input
                        label="Wholesale Discount (Rs.)"
                        type="number"
                        min="0"
                        value={wholesaleDiscount}
                        onChange={e => setWholesaleDiscount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-cyan-200/50">
                      <span className="text-slate-600 font-medium">Final Wholesale:</span>
                      <span className="font-mono font-bold text-cyan-700">
                        Rs. {Math.max(0, (Number(wholesalePrice) || 0) - (Number(wholesaleDiscount) || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 p-3 rounded-xl bg-amber-50/40 border border-amber-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Input
                        label="Khata Sale Price (Rs.) *"
                        type="number"
                        min="0"
                        value={khataPrice}
                        onChange={e => setKhataPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        required
                      />
                      <Input
                        label="Khata Sale Discount (Rs.)"
                        type="number"
                        min="0"
                        value={khataDiscount}
                        onChange={e => setKhataDiscount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-amber-200/50">
                      <span className="text-slate-600 font-medium">Final Khata Rate:</span>
                      <span className="font-mono font-bold text-amber-800">
                        Rs. {Math.max(0, (Number(khataPrice) || 0) - (Number(khataDiscount) || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <Input
                      label="Tax / GST Rate (%)"
                      type="number"
                      min="0"
                      max="100"
                      value={taxRate}
                      onChange={e => setTaxRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      If 0%, no tax is shown or charged at POS. When set (e.g. 5% or 18%), POS calculates tax automatically.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Stock Inventory */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold">Inventory & Reorder Levels</CardTitle>
                  <CardDescription>Set initial physical stock count and safety alerts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label={`Initial Stock Quantity ${unit ? `(${unit})` : ''} *`}
                    type="number"
                    min="0"
                    value={initialStock}
                    onChange={e => setInitialStock(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    required
                  />

                  <Input
                    label={`Minimum Stock Warning Alert ${unit ? `(${unit})` : ''}`}
                    type="number"
                    min="1"
                    value={minStockAlert}
                    onChange={e => setMinStockAlert(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  />

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Initial Retail Valuation:</span>
                      <span className="font-bold text-slate-900">
                        Rs. {((Number(initialStock) || 0) * (Number(retailPrice) || 0)).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Wholesale Valuation:</span>
                      <span className="font-bold text-cyan-700">
                        Rs. {((Number(initialStock) || 0) * (Number(wholesalePrice) || 0)).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                      <span>Total Khata Valuation:</span>
                      <span className="font-bold text-amber-800">
                        Rs. {((Number(initialStock) || 0) * (Number(khataPrice) || Number(retailPrice) || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Barcode Preview & Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarcodeIcon className="w-4 h-4 text-blue-600" /> Barcode Generation Preview
                </CardTitle>
                <CardDescription>
                  Unique optical barcode values generated for retail scanning and wholesale labels.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Retail Barcode */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col items-center text-center">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                      Retail POS Barcode
                    </span>
                    <Input
                      value={barcode}
                      onChange={e => setBarcode(e.target.value)}
                      className="text-center font-mono text-xs mb-2"
                    />
                    {/* Visual Barcode Graphic */}
                    <div className="flex items-center justify-center gap-[2px] h-8 my-1 bg-white p-2 rounded border border-slate-200 w-full max-w-[180px]">
                      {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 2, 3, 1, 4, 2].map((w, i) => (
                        <div key={i} className="bg-black h-full" style={{ width: `${w * 1.5}px` }} />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-1">{barcode}</span>
                  </div>

                  {/* Wholesale Barcode */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col items-center text-center">
                    <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider mb-1">
                      Wholesale Bulk Barcode
                    </span>
                    <Input
                      value={wholesaleBarcode}
                      onChange={e => setWholesaleBarcode(e.target.value)}
                      className="text-center font-mono text-xs mb-2"
                    />
                    {/* Visual Barcode Graphic */}
                    <div className="flex items-center justify-center gap-[2px] h-8 my-1 bg-white p-2 rounded border border-slate-200 w-full max-w-[180px]">
                      {[3, 1, 2, 1, 4, 2, 1, 3, 1, 2, 1, 3, 2, 1, 4, 1, 2].map((w, i) => (
                        <div key={i} className="bg-black h-full" style={{ width: `${w * 1.5}px` }} />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-1">{wholesaleBarcode}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submission actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link href="/products">
                <Button type="button" variant="outline" size="md">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="primary" size="lg" className="font-bold gap-2">
                <CheckCircle2 className="w-4 h-4" /> Save Article & Publish to POS
              </Button>
            </div>
          </form>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
