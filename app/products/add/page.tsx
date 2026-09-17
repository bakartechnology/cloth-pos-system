'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  PackagePlus,
  Barcode as BarcodeIcon,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import { productsService } from '@/services/productsService';
import { inventoryService } from '@/services/inventoryService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ProductCategory, UnitType, SeasonCategory } from '@/types';

export default function AddProductPage() {
  const router = useRouter();
  const { currentStaff } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Lawn');
  const [seasonCategory, setSeasonCategory] = useState<SeasonCategory>('Summer');
  const [subcategory, setSubcategory] = useState('');
  const [unit, setUnit] = useState<UnitType>('Unstitched Box');
  const [retailPrice, setRetailPrice] = useState<number>(4500);
  const [wholesalePrice, setWholesalePrice] = useState<number>(3600);
  const [retailDiscount, setRetailDiscount] = useState<number>(0);
  const [wholesaleDiscount, setWholesaleDiscount] = useState<number>(0);
  const [initialStock, setInitialStock] = useState<number>(30);
  const [minStockAlert, setMinStockAlert] = useState<number>(8);
  const [supplier, setSupplier] = useState('Gul Ahmed Textiles');
  const [description, setDescription] = useState('');
  const [barcode, setBarcode] = useState('896400' + Math.floor(100000 + Math.random() * 900000));
  const [wholesaleBarcode, setWholesaleBarcode] = useState('896401' + Math.floor(100000 + Math.random() * 900000));

  // Auto-generate realistic SKU and Barcode
  const handleAutoGenerateSKU = () => {
    const catCode = category.slice(0, 3).toUpperCase();
    const unitCode = unit.slice(0, 3).toUpperCase();
    const rand = Math.floor(100 + Math.random() * 900);
    const newSku = `${catCode}-${unitCode}-${rand}`;
    setSku(newSku);

    const newRetailBarcode = '896400' + Math.floor(100000 + Math.random() * 900000);
    const newWholesaleBarcode = '896401' + Math.floor(100000 + Math.random() * 900000);
    setBarcode(newRetailBarcode);
    setWholesaleBarcode(newWholesaleBarcode);

    toast({
      title: 'SKU & Barcodes Generated',
      description: `Generated SKU: ${newSku}`,
      type: 'info',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: 'Validation Error', description: 'Product name is required.', type: 'error' });
      return;
    }

    const finalSku = sku.trim() || `FAB-${Date.now().toString().slice(-4)}`;

    const newProduct = productsService.add({
      name,
      sku: finalSku,
      category,
      seasonCategory,
      subcategory: subcategory || `${category} Collection`,
      unit,
      retailPrice: Math.max(0, retailPrice),
      wholesalePrice: Math.max(0, wholesalePrice),
      retailDiscount: Math.max(0, retailDiscount),
      wholesaleDiscount: Math.max(0, wholesaleDiscount),
      stock: initialStock,
      minStockAlert,
      supplier: supplier || 'Local Mill',
      description,
      barcode,
      wholesaleBarcode,
    });

    // Log initial stock movement
    if (initialStock > 0) {
      inventoryService.recordMovement({
        productId: newProduct.id,
        productName: newProduct.name,
        sku: newProduct.sku,
        movementType: 'Initial',
        quantityChange: initialStock,
        previousStock: 0,
        newStock: initialStock,
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
                      placeholder="e.g. Al-Karam Luxury Digital Printed Lawn 3-Piece"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Input
                      label="SKU Code"
                      placeholder="e.g. AK-LAWN-3P-01"
                      value={sku}
                      onChange={e => setSku(e.target.value)}
                    />
                  </div>

                  <div>
                    <Input
                      label="Subcategory / Style"
                      placeholder="e.g. Swiss Voile or Luxury Digital"
                      value={subcategory}
                      onChange={e => setSubcategory(e.target.value)}
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
                      label="Fabric Category *"
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
                      label="Packaging / Unit Type *"
                      value={unit}
                      onChange={e => setUnit(e.target.value as UnitType)}
                    >
                      <option value="Unstitched Box">Unstitched Box (3PC/2PC Box)</option>
                      <option value="Suit Packet">Suit Packet (Standard 4.5m / 4.0m)</option>
                      <option value="Thaan">Thaan (Roll: 30m to 40m)</option>
                      <option value="Meter">Meter (Running Yardage)</option>
                      <option value="Cut Piece">Cut Piece (Assorted remnant)</option>
                    </Select>
                  </div>

                  <div>
                    <Input
                      label="Manufacturer / Supplier"
                      placeholder="e.g. Gul Ahmed or Nishat Mills"
                      value={supplier}
                      onChange={e => setSupplier(e.target.value)}
                    />
                  </div>

                  <div>
                    <Input
                      label="Detailed Fabric Description"
                      placeholder="e.g. 100% Giza Cotton, 4.5 meters unstitched"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
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
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-blue-200/50">
                      <span className="text-slate-600 font-medium">Final Retail:</span>
                      <span className="font-mono font-bold text-blue-700">
                        Rs. {Math.max(0, retailPrice - retailDiscount).toLocaleString()}
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
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-cyan-200/50">
                      <span className="text-slate-600 font-medium">Final Wholesale:</span>
                      <span className="font-mono font-bold text-cyan-700">
                        Rs. {Math.max(0, wholesalePrice - wholesaleDiscount).toLocaleString()}
                      </span>
                    </div>
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
                    label={`Initial Stock Quantity (${unit}) *`}
                    type="number"
                    min="0"
                    value={initialStock}
                    onChange={e => setInitialStock(parseInt(e.target.value, 10) || 0)}
                    required
                  />

                  <Input
                    label={`Minimum Stock Warning Alert (${unit})`}
                    type="number"
                    min="1"
                    value={minStockAlert}
                    onChange={e => setMinStockAlert(parseInt(e.target.value, 10) || 1)}
                  />

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Initial Retail Valuation:</span>
                      <span className="font-bold text-slate-900">
                        Rs. {(initialStock * retailPrice).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Wholesale Value:</span>
                      <span className="font-bold text-cyan-700">
                        Rs. {(initialStock * wholesalePrice).toLocaleString()}
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
