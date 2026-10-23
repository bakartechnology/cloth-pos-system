'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Lock, Save, ChevronDown, Check, Package } from 'lucide-react';
import { productsService } from '@/services/productsService';
import { inventoryService } from '@/services/inventoryService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Product, ProductCategory, UnitType, SeasonCategory } from '@/types';
import { BOTH_FABRIC_CATEGORIES, BOTH_PACKAGING_UNITS } from '@/data/fabricCategories';

interface EditProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Product) => void;
}

export function EditProductModal({
  product,
  isOpen,
  onClose,
  onSuccess,
}: EditProductModalProps) {
  const { currentStaff } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Lawn');
  const [seasonCategory, setSeasonCategory] = useState<SeasonCategory>('Summer');
  const [subcategory, setSubcategory] = useState('');
  const [unit, setUnit] = useState<UnitType>('Unstitched Box');
  const [retailPrice, setRetailPrice] = useState<number>(0);
  const [wholesalePrice, setWholesalePrice] = useState<number>(0);
  const [khataPrice, setKhataPrice] = useState<number>(0);
  const [retailDiscount, setRetailDiscount] = useState<number>(0);
  const [wholesaleDiscount, setWholesaleDiscount] = useState<number>(0);
  const [khataDiscount, setKhataDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);

  // Box specific states for wholesale & retail
  const [wholesaleBoxes, setWholesaleBoxes] = useState<number>(0);
  const [suitsPerBox, setSuitsPerBox] = useState<number>(16);
  const [wholesaleMinStockAlert, setWholesaleMinStockAlert] = useState<number>(5);

  const [retailBoxes, setRetailBoxes] = useState<number>(0);
  const [retailSuitsPerBox, setRetailSuitsPerBox] = useState<number>(16);
  const [retailMinStockAlert, setRetailMinStockAlert] = useState<number>(5);

  const [supplier, setSupplier] = useState('');
  const [description, setDescription] = useState('');

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryWrapperRef.current && !categoryWrapperRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!product) return;
    const timer = setTimeout(() => {
      setName(product.name || '');
      setSku(product.sku || '');
      setCategory(product.category || 'Lawn');
      setSeasonCategory(
        product.seasonCategory ||
          (['Khaddar', 'Wash & Wear'].includes(product.category) ? 'Winter' : 'Summer')
      );
      setSubcategory(product.subcategory || '');
      setUnit(product.unit || 'Unstitched Box');
      setRetailPrice(product.retailPrice || 0);
      const initialWholesale = product.wholesalePrice || product.khataPrice || 0;
      const initialWholesaleDisc = product.wholesaleDiscount || product.khataDiscount || 0;
      setWholesalePrice(initialWholesale);
      setKhataPrice(initialWholesale);
      setRetailDiscount(product.retailDiscount || 0);
      setWholesaleDiscount(initialWholesaleDisc);
      setKhataDiscount(initialWholesaleDisc);
      setTaxRate(product.taxRate || 0);
      setStock(product.stock || 0);
      setMinStockAlert(product.minStockAlert || 5);

      const isBox = product.packagingConfig?.type === 'box' || (product.unit && product.unit.toLowerCase().includes('box'));
      const defaultSpb = product.packagingConfig?.suitsPerBox || 16;
      setWholesaleBoxes(product.packagingConfig?.wholesaleBoxes ?? (isBox ? Math.floor(product.stock / defaultSpb) : 0));
      setSuitsPerBox(defaultSpb);
      setWholesaleMinStockAlert(product.packagingConfig?.wholesaleMinStockAlert || product.wholesaleMinStockAlert || product.minStockAlert || 5);

      setRetailBoxes(product.packagingConfig?.retailBoxes ?? 0);
      setRetailSuitsPerBox(product.packagingConfig?.retailSuitsPerBox || defaultSpb);
      setRetailMinStockAlert(product.packagingConfig?.retailMinStockAlert || product.retailMinStockAlert || product.minStockAlert || 5);

      setSupplier(product.supplier || '');
      setDescription(product.description || '');
    }, 0);
    return () => clearTimeout(timer);
  }, [product]);

  if (!product) return null;

  const finalRetail = Math.max(0, retailPrice - retailDiscount);
  const finalWholesale = Math.max(0, wholesalePrice - wholesaleDiscount);
  const finalKhata = Math.max(0, khataPrice - khataDiscount);
  const isBoxUnit = Boolean(unit && (unit.toLowerCase().includes('box') || unit.toLowerCase().includes('dabba')));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Product name cannot be empty.',
        type: 'error',
      });
      return;
    }

    const targetSku = sku.trim() || product.sku;
    const existing = productsService.getAll();
    if (existing.some(p => p.id !== product.id && p.sku.toLowerCase() === targetSku.toLowerCase())) {
      toast({
        title: 'Duplicate SKU',
        description: `The SKU "${targetSku}" is already assigned to another fabric article. Please enter a unique SKU.`,
        type: 'error',
      });
      return;
    }

    if (wholesalePrice <= 0 && retailPrice <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid price for Retail or Wholesale / Credit.',
        type: 'error',
      });
      return;
    }

    const isBox = unit && (unit.toLowerCase().includes('box') || unit.toLowerCase().includes('dabba'));
    const previousStock = product.stock;
    const computedStock = isBox
      ? (wholesaleBoxes * suitsPerBox) + (retailBoxes * retailSuitsPerBox)
      : Math.max(0, stock);
    const stockDiff = computedStock - previousStock;

    const packagingConfig = isBox ? {
      ...product.packagingConfig,
      type: 'box' as const,
      totalBoxes: wholesaleBoxes + retailBoxes,
      wholesaleBoxes,
      retailBoxes,
      suitsPerBox,
      retailSuitsPerBox,
      wholesaleMinStockAlert,
      retailMinStockAlert,
      pricePerSuit: Math.round(wholesalePrice / suitsPerBox),
      retailPricePerSuit: Math.round(retailPrice / retailSuitsPerBox),
      boxRetailPrice: retailPrice,
      boxWholesalePrice: wholesalePrice,
    } : product.packagingConfig;

    const hasRetail = isBox ? (retailBoxes > 0 || retailPrice > 0) : retailPrice > 0;
    const hasWholesale = isBox ? (wholesaleBoxes > 0 || wholesalePrice > 0) : wholesalePrice > 0;
    const determinedChannel: 'Retail' | 'Wholesale' | 'Both' =
      hasRetail && hasWholesale ? 'Both' : hasWholesale ? 'Wholesale' : 'Retail';

    // Update product strictly keeping the same ID and barcode
    const updated = productsService.update(product.id, {
      name: name.trim(),
      sku: targetSku,
      category,
      seasonCategory,
      subcategory: subcategory.trim(),
      unit,
      channel: determinedChannel,
      retailPrice: Math.max(0, retailPrice),
      wholesalePrice: Math.max(0, wholesalePrice),
      khataPrice: Math.max(0, wholesalePrice),
      retailDiscount: Math.max(0, retailDiscount),
      wholesaleDiscount: Math.max(0, wholesaleDiscount),
      khataDiscount: Math.max(0, wholesaleDiscount),
      taxRate: Math.max(0, taxRate),
      stock: computedStock,
      minStockAlert: isBox ? Math.max(1, retailMinStockAlert || wholesaleMinStockAlert || 5) : Math.max(1, minStockAlert),
      wholesaleMinStockAlert: isBox ? wholesaleMinStockAlert : undefined,
      retailMinStockAlert: isBox ? retailMinStockAlert : undefined,
      supplier: supplier.trim(),
      description: description.trim(),
      packagingConfig,
      // Barcode and wholesaleBarcode remain unchanged (handled inside update)
    });

    if (updated) {
      // Record stock movement audit if quantity changed
      if (stockDiff !== 0) {
        inventoryService.recordMovement({
          productId: updated.id,
          productName: updated.name,
          sku: updated.sku,
          movementType: stockDiff > 0 ? 'Restock' : 'Adjustment',
          quantityChange: stockDiff,
          previousStock,
          newStock: computedStock,
          staffName: currentStaff?.name || 'Stock Manager',
          notes: `Stock updated via Edit Product (${previousStock} -> ${computedStock})`,
        });
      }

      toast({
        title: 'Product Updated Successfully',
        description: `${updated.name} updated. Stock: ${updated.stock} (Barcode & ID preserved).`,
        type: 'success',
      });

      onSuccess(updated);
      onClose();
    } else {
      toast({
        title: 'Update Failed',
        description: 'Could not update the product. Please try again.',
        type: 'error',
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Existing Product / Stock"
      description="Update stock quantity, pricing, discounts, and categories. Barcode and Product ID are permanently preserved."
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Barcode & ID Immutable Notice */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold">Permanent Barcode: </span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-800">
                {product.barcode}
              </span>
              {product.wholesaleBarcode && (
                <>
                  <span className="ml-2 font-bold">Wholesale: </span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-800">
                    {product.wholesaleBarcode}
                  </span>
                </>
              )}
            </div>
          </div>
          <Badge variant="secondary" size="sm" className="bg-white text-blue-700 font-mono">
            ID: {product.id}
          </Badge>
        </div>

        {/* General Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Product / Suit Name *"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Al-Karam Embroidered Lawn 3-Piece"
              required
            />
          </div>

          <div>
            <Input
              label="SKU Code"
              value={sku}
              onChange={e => setSku(e.target.value)}
              placeholder="e.g. AK-LAWN-01"
            />
          </div>

          <div>
            <Select
              label="Summer / Winter Category *"
              value={seasonCategory}
              onChange={e => setSeasonCategory(e.target.value as SeasonCategory)}
            >
              <option value="Summer">☀️ Summer</option>
              <option value="Winter">❄️ Winter</option>
            </Select>
          </div>

          {/* Fabric Material Category: Single Unified Combobox */}
          <div className="relative" ref={categoryWrapperRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Fabric Material Category *
              </label>
              <span className="text-[10px] text-slate-400">Type or pick from list</span>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Category name..."
                value={category}
                onChange={e => {
                  setCategory(e.target.value as ProductCategory);
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
            </div>

            {isCategoryDropdownOpen && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto divide-y divide-slate-100">
                {BOTH_FABRIC_CATEGORIES
                  .filter(cat =>
                    !category.trim() || cat.toLowerCase().includes(category.toLowerCase().trim())
                  )
                  .map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategory(cat as ProductCategory);
                        setIsCategoryDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center justify-between transition-colors cursor-pointer ${
                        category === cat
                          ? 'bg-blue-50/70 font-bold text-blue-900'
                          : 'text-slate-800'
                      }`}
                    >
                      <span>{cat}</span>
                      {category === cat && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Unit / Packaging Type: Single Standard Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Unit / Packaging Type *
            </label>
            <Select
              value={unit}
              onChange={e => setUnit(e.target.value as UnitType)}
              required
            >
              {BOTH_PACKAGING_UNITS.map(u => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Stock & Reorder */}
        {isBoxUnit ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-600" />
                  Box Stock Management (Wholesale & Retail)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Update wholesale and retail boxes independently.
                </p>
              </div>
              <div className="text-left sm:text-right bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Combined Suits</span>
                <span className="text-xs font-black text-slate-800">
                  {(wholesaleBoxes * suitsPerBox) + (retailBoxes * retailSuitsPerBox)} Suits ({(wholesaleBoxes + retailBoxes)} Boxes)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Wholesale Box Stock */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">Wholesale Stock</span>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                    {wholesaleBoxes * suitsPerBox} Suits ({wholesaleBoxes} Boxes)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Available Boxes *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={wholesaleBoxes}
                      onChange={e => setWholesaleBoxes(parseInt(e.target.value, 10) || 0)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Suits Per Box
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={suitsPerBox}
                      onChange={e => setSuitsPerBox(parseInt(e.target.value, 10) || 1)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Min Stock Warning Alert (Boxes)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={wholesaleMinStockAlert}
                    onChange={e => setWholesaleMinStockAlert(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
              </div>

              {/* Retail Box Stock */}
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Retail Stock</span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    {retailBoxes * retailSuitsPerBox} Suits ({retailBoxes} Boxes)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Available Boxes *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={retailBoxes}
                      onChange={e => setRetailBoxes(parseInt(e.target.value, 10) || 0)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Suits Per Box
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={retailSuitsPerBox}
                      onChange={e => setRetailSuitsPerBox(parseInt(e.target.value, 10) || 1)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Min Stock Warning Alert (Boxes)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={retailMinStockAlert}
                    onChange={e => setRetailMinStockAlert(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Stock & Inventory Quantity
              </h4>
              <span className="text-[11px] text-slate-500">
                Currently held: <strong className="text-slate-900">{product.stock}</strong> {product.unit}(s)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label={`Available Stock Quantity (${unit}) *`}
                  type="number"
                  min="0"
                  value={stock}
                  onChange={e => setStock(parseInt(e.target.value, 10) || 0)}
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {stock <= 0 ? (
                    <span className="text-rose-600 font-bold">Will show as Out of Stock</span>
                  ) : stock <= minStockAlert ? (
                    <span className="text-amber-600 font-bold">Will show as Low Stock</span>
                  ) : (
                    <span className="text-emerald-600 font-bold">Will show as In Stock</span>
                  )}
                </span>
              </div>

              <div>
                <Input
                  label={`Minimum Stock Warning Alert (${unit})`}
                  type="number"
                  min="1"
                  value={minStockAlert}
                  onChange={e => setMinStockAlert(parseInt(e.target.value, 10) || 1)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Pricing & Discounts (Retail & Wholesale/Credit Channels) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Retail Section */}
          <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Retail Walk-in Pricing
              </span>
              <Badge variant="secondary" size="sm" className="bg-blue-100 text-blue-800">
                Retail POS
              </Badge>
            </div>

            <Input
              label="Retail Price (Rs.) *"
              type="number"
              min="0"
              value={retailPrice}
              onChange={e => setRetailPrice(parseFloat(e.target.value) || 0)}
              required
            />

            <Input
              label="Retail Discount (Rs.)"
              type="number"
              min="0"
              value={retailDiscount}
              onChange={e => setRetailDiscount(parseFloat(e.target.value) || 0)}
            />

            <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-600">Final Retail Price:</span>
              <span className="font-black text-blue-700 font-mono text-sm">
                Rs. {finalRetail.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Wholesale Section */}
          <div className="p-4 rounded-xl border border-cyan-100 bg-cyan-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-900 uppercase tracking-wider">
                Wholesale Pricing
              </span>
              <Badge variant="secondary" size="sm" className="bg-cyan-100 text-cyan-800">
                Wholesale / Credit POS
              </Badge>
            </div>

            <Input
              label="Wholesale Price (Rs.) *"
              type="number"
              min="0"
              value={wholesalePrice}
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                setWholesalePrice(val);
                setKhataPrice(val);
              }}
              required
            />

            <Input
              label="Wholesale Discount (Rs.)"
              type="number"
              min="0"
              value={wholesaleDiscount}
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                setWholesaleDiscount(val);
                setKhataDiscount(val);
              }}
            />

            <div className="pt-2 border-t border-cyan-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-600">Final Wholesale Price:</span>
              <span className="font-black text-cyan-700 font-mono text-sm">
                Rs. {finalWholesale.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Supplier, Subcategory & Tax */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Input
              label="Supplier / Mill"
              value={supplier}
              onChange={e => setSupplier(e.target.value)}
              placeholder="e.g. Gul Ahmed or Al-Karam"
            />
          </div>
          <div>
            <Input
              label="Subcategory / Style"
              value={subcategory}
              onChange={e => setSubcategory(e.target.value)}
              placeholder="e.g. Luxury Digital Print"
            />
          </div>
          <div>
            <Input
              label="Tax Rate (%)"
              type="number"
              min="0"
              max="100"
              value={taxRate}
              onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
              placeholder="0 (Tax free if 0)"
            />
          </div>
          <div className="sm:col-span-3">
            <Input
              label="Fabric Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. 100% Cotton, 4.5 meters suit packet"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" className="gap-1.5 font-bold shadow-sm">
            <Save className="w-4 h-4" /> Save Changes & Update Stock
          </Button>
        </div>
      </form>
    </Modal>
  );
}
