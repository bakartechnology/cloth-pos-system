'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Lock, Save } from 'lucide-react';
import { productsService } from '@/services/productsService';
import { inventoryService } from '@/services/inventoryService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Product, ProductCategory, UnitType, SeasonCategory } from '@/types';

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
  const [retailDiscount, setRetailDiscount] = useState<number>(0);
  const [wholesaleDiscount, setWholesaleDiscount] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);
  const [supplier, setSupplier] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (product) {
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
      setWholesalePrice(product.wholesalePrice || 0);
      setRetailDiscount(product.retailDiscount || 0);
      setWholesaleDiscount(product.wholesaleDiscount || 0);
      setStock(product.stock || 0);
      setMinStockAlert(product.minStockAlert || 5);
      setSupplier(product.supplier || '');
      setDescription(product.description || '');
    }
  }, [product]);

  if (!product) return null;

  const finalRetail = Math.max(0, retailPrice - retailDiscount);
  const finalWholesale = Math.max(0, wholesalePrice - wholesaleDiscount);

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

    const previousStock = product.stock;
    const newStock = Math.max(0, stock);
    const stockDiff = newStock - previousStock;

    // Update product strictly keeping the same ID and barcode
    const updated = productsService.update(product.id, {
      name: name.trim(),
      sku: targetSku,
      category,
      seasonCategory,
      subcategory: subcategory.trim(),
      unit,
      retailPrice: Math.max(0, retailPrice),
      wholesalePrice: Math.max(0, wholesalePrice),
      retailDiscount: Math.max(0, retailDiscount),
      wholesaleDiscount: Math.max(0, wholesaleDiscount),
      stock: newStock,
      minStockAlert: Math.max(1, minStockAlert),
      supplier: supplier.trim(),
      description: description.trim(),
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
          newStock,
          staffName: currentStaff?.name || 'Stock Manager',
          notes: `Stock updated via Edit Product (${previousStock} -> ${newStock})`,
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

          <div>
            <Select
              label="Fabric Material Category"
              value={category}
              onChange={e => setCategory(e.target.value as ProductCategory)}
            >
              <option value="Lawn">Lawn</option>
              <option value="Cotton">Cotton</option>
              <option value="Khaddar">Khaddar</option>
              <option value="Wash & Wear">Wash & Wear</option>
              <option value="Unstitched">Unstitched</option>
              <option value="Suit">Suit</option>
              <option value="Thaan">Thaan</option>
              <option value="Cut Piece">Cut Piece</option>
              <option value="Silk & Chiffon">Silk & Chiffon</option>
            </Select>
          </div>

          <div>
            <Select
              label="Unit / Packaging Type"
              value={unit}
              onChange={e => setUnit(e.target.value as UnitType)}
            >
              <option value="Unstitched Box">Unstitched Box (3PC/2PC Box)</option>
              <option value="Suit Packet">Suit Packet</option>
              <option value="Thaan">Thaan (Roll: 30m-40m)</option>
              <option value="Meter">Meter (Running yardage)</option>
              <option value="Cut Piece">Cut Piece</option>
            </Select>
          </div>
        </div>

        {/* Stock & Reorder */}
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

        {/* Pricing & Discounts (Fixed Rs amounts, No Cost Price!) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                Wholesale B2B Pricing
              </span>
              <Badge variant="secondary" size="sm" className="bg-cyan-100 text-cyan-800">
                Wholesale POS
              </Badge>
            </div>

            <Input
              label="Wholesale Price (Rs.) *"
              type="number"
              min="0"
              value={wholesalePrice}
              onChange={e => setWholesalePrice(parseFloat(e.target.value) || 0)}
              required
            />

            <Input
              label="Wholesale Discount (Rs.)"
              type="number"
              min="0"
              value={wholesaleDiscount}
              onChange={e => setWholesaleDiscount(parseFloat(e.target.value) || 0)}
            />

            <div className="pt-2 border-t border-cyan-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-600">Final Wholesale Price:</span>
              <span className="font-black text-cyan-700 font-mono text-sm">
                Rs. {finalWholesale.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Supplier & Subcategory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="sm:col-span-2">
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
