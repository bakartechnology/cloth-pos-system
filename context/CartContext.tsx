'use client';

import React, { createContext, useContext, useState } from 'react';
import { Product, CartItem } from '@/types';
import { productsService } from '@/services/productsService';
import { useToast } from './ToastContext';

interface CartContextType {
  // Retail
  retailCart: CartItem[];
  addToRetailCart: (product: Product, quantity?: number, preferredUnit?: 'Box' | 'Suit') => void;
  toggleRetailCartItemUnit: (productId: string) => void;
  setRetailCartItemUnit: (productId: string, unit: 'Box' | 'Suit' | string) => void;
  removeFromRetailCart: (productId: string) => void;
  updateRetailQuantity: (productId: string, quantity: number) => void;
  updateRetailDiscount: (productId: string, discountPercent: number) => void;
  updateRetailExtraDiscount: (productId: string, extraDiscountRs: number) => void;
  clearRetailCart: () => void;
  restoreRetailCart: (items: CartItem[]) => void;
  retailSubtotal: number;
  retailDiscountTotal: number;
  retailGrandTotal: number;

  // Wholesale
  wholesaleCart: CartItem[];
  addToWholesaleCart: (product: Product, quantity?: number) => void;
  removeFromWholesaleCart: (productId: string) => void;
  updateWholesaleQuantity: (productId: string, quantity: number) => void;
  updateWholesaleDiscount: (productId: string, discountPercent: number) => void;
  updateWholesaleExtraDiscount: (productId: string, extraDiscountRs: number) => void;
  clearWholesaleCart: () => void;
  restoreWholesaleCart: (items: CartItem[]) => void;
  wholesaleSubtotal: number;
  wholesaleDiscountTotal: number;
  wholesaleGrandTotal: number;

  // Khata Credit POS
  khataCart: CartItem[];
  addToKhataCart: (product: Product, quantity?: number) => void;
  removeFromKhataCart: (productId: string) => void;
  updateKhataQuantity: (productId: string, quantity: number) => void;
  updateKhataDiscount: (productId: string, discountPercent: number) => void;
  updateKhataExtraDiscount: (productId: string, extraDiscountRs: number) => void;
  clearKhataCart: () => void;
  restoreKhataCart: (items: CartItem[]) => void;
  khataSubtotal: number;
  khataDiscountTotal: number;
  khataGrandTotal: number;

  // Sync
  syncWithLatestProducts: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [retailCart, setRetailCart] = useState<CartItem[]>([]);
  const [wholesaleCart, setWholesaleCart] = useState<CartItem[]>([]);
  const [khataCart, setKhataCart] = useState<CartItem[]>([]);

  // Calculate line item total with unit price, per-unit rupee discount, rupee extra discount, and manual percent discount
  const computeLineTotal = (
    price: number,
    discountPerUnit: number,
    qty: number,
    discountPercent = 0,
    extraDiscountRupees = 0
  ) => {
    const netUnitPrice = Math.max(0, price - discountPerUnit - extraDiscountRupees);
    const baseTotal = netUnitPrice * qty;
    const manualDiscount = (baseTotal * discountPercent) / 100;
    return Math.max(0, Math.round(baseTotal - manualDiscount));
  };

  // Helper to resolve unit price for Box vs Suit or Thaan Roll vs Meter/Yard
  const getProductRetailUnitPrice = (product: Product, unitType?: 'Box' | 'Suit' | string) => {
    const isBox = product.packagingConfig?.type === 'box';
    const isThaan = product.packagingConfig?.type === 'thaan';

    if (isBox) {
      if (unitType === 'Suit') {
        return (
          product.packagingConfig?.retailPricePerSuit ||
          product.packagingConfig?.pricePerSuit ||
          (product.packagingConfig?.suitsPerBox
            ? Math.round(product.retailPrice / product.packagingConfig.suitsPerBox)
            : product.retailPrice)
        );
      }
      // Default or Box
      return product.packagingConfig?.boxRetailPrice || product.retailPrice;
    }

    if (isThaan) {
      const isRoll = unitType === 'Roll' || unitType === 'Box' || unitType === 'Thaan';
      if (isRoll) {
        return (
          product.packagingConfig?.thaanRetailRollPrice ||
          ((product.packagingConfig?.retailPerUnitRate || product.packagingConfig?.perUnitRate) && (product.packagingConfig?.retailThaanEqualLength || product.packagingConfig?.totalLength)
            ? Math.round((product.packagingConfig?.retailPerUnitRate || product.packagingConfig?.perUnitRate || 0) * (product.packagingConfig?.retailThaanEqualLength || product.packagingConfig?.totalLength || 1))
            : product.retailPrice)
        );
      }
      // Meter or Yard (per unit loose rate)
      return product.packagingConfig?.retailPerUnitRate || product.packagingConfig?.perUnitRate || product.retailPrice;
    }

    return product.retailPrice;
  };

  // ---------------- Retail Cart Operations ----------------
  const addToRetailCart = (product: Product, quantity = 1, preferredUnit?: 'Box' | 'Suit' | string) => {
    // Always fetch latest product record to avoid stale price or discount
    const freshProduct = productsService.getById(product.id) || product;

    const isBox = freshProduct.packagingConfig?.type === 'box';
    const isThaan = freshProduct.packagingConfig?.type === 'thaan';
    const suitsPerBox = freshProduct.packagingConfig?.suitsPerBox || 1;
    const rollLength = freshProduct.packagingConfig?.retailThaanEqualLength || freshProduct.packagingConfig?.totalLength || freshProduct.packagingConfig?.thaanEqualLength || 1;

    const retailStockLimit = isBox && freshProduct.packagingConfig?.retailBoxes !== undefined
      ? freshProduct.packagingConfig.retailBoxes * (freshProduct.packagingConfig.retailSuitsPerBox || suitsPerBox)
      : freshProduct.stock;

    if (retailStockLimit <= 0) {
      toast({
        title: 'Out of Stock',
        description: `${freshProduct.name} is currently out of retail stock!`,
        type: 'error',
      });
      return;
    }

    const defaultUnit: string = isBox
      ? 'Suit'
      : isThaan
      ? (freshProduct.packagingConfig?.retailThaanMeasurement || freshProduct.packagingConfig?.thaanMeasurement || 'Meter')
      : (freshProduct.unit || 'Standard');

    const selectedUnit: 'Box' | 'Suit' | string = preferredUnit || defaultUnit;
    const effectivePrice = getProductRetailUnitPrice(freshProduct, selectedUnit);
    const unitDiscount = freshProduct.retailDiscount || 0;

    // Match by ID AND selectedUnit so different units (e.g. loose meter vs whole roll) remain separate or match appropriately
    const existingIndex = retailCart.findIndex(
      item => item.product.id === freshProduct.id && ((!isBox && !isThaan) || item.selectedUnit === selectedUnit)
    );

    const itemsNeeded = selectedUnit === 'Box' && isBox
      ? quantity * suitsPerBox
      : (selectedUnit === 'Roll' || selectedUnit === 'Box') && isThaan
      ? quantity * rollLength
      : quantity;

    if (existingIndex !== -1) {
      const existing = retailCart[existingIndex];
      const newQty = existing.quantity + quantity;
      const totalNeeded = selectedUnit === 'Box' && isBox
        ? newQty * suitsPerBox
        : (selectedUnit === 'Roll' || selectedUnit === 'Box') && isThaan
        ? newQty * rollLength
        : newQty;

      if (totalNeeded > retailStockLimit) {
        toast({
          title: 'Stock Limit Reached',
          description: `Only ${retailStockLimit} unit(s) available in stock.`,
          type: 'warning',
        });
        return;
      }

      setRetailCart(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(
          item => item.product.id === freshProduct.id && ((!isBox && !isThaan) || item.selectedUnit === selectedUnit)
        );
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            product: freshProduct,
            price: effectivePrice,
            selectedUnit,
            discountPerUnit: unitDiscount,
            quantity: newQty,
            lineTotal: computeLineTotal(
              effectivePrice,
              unitDiscount,
              newQty,
              updated[idx].discountPercent,
              updated[idx].extraDiscountRupees || 0
            ),
          };
        }
        return updated;
      });
    } else {
      if (itemsNeeded > retailStockLimit) {
        toast({
          title: 'Stock Limit Reached',
          description: `Only ${retailStockLimit} unit(s) available in stock.`,
          type: 'warning',
        });
        return;
      }

      const item: CartItem = {
        product: freshProduct,
        quantity,
        price: effectivePrice,
        selectedUnit,
        discountPerUnit: unitDiscount,
        discountPercent: 0,
        extraDiscountRupees: 0,
        lineTotal: computeLineTotal(effectivePrice, unitDiscount, quantity, 0, 0),
      };
      setRetailCart(prev => [...prev, item]);
    }
  };

  const setRetailCartItemUnit = (productId: string, newUnit: 'Box' | 'Suit' | string) => {
    setRetailCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          if (item.selectedUnit === newUnit) return item;
          const newPrice = getProductRetailUnitPrice(item.product, newUnit);
          return {
            ...item,
            selectedUnit: newUnit,
            price: newPrice,
            lineTotal: computeLineTotal(
              newPrice,
              item.discountPerUnit || 0,
              item.quantity,
              item.discountPercent || 0,
              item.extraDiscountRupees || 0
            ),
          };
        }
        return item;
      })
    );
  };

  const toggleRetailCartItemUnit = (productId: string) => {
    setRetailCart(prev =>
      prev.map(item => {
        if (item.product.id === productId && item.product.packagingConfig?.type === 'box') {
          const newUnit: 'Box' | 'Suit' = item.selectedUnit === 'Box' ? 'Suit' : 'Box';
          const newPrice = getProductRetailUnitPrice(item.product, newUnit);
          return {
            ...item,
            selectedUnit: newUnit,
            price: newPrice,
            lineTotal: computeLineTotal(
              newPrice,
              item.discountPerUnit || 0,
              item.quantity,
              item.discountPercent || 0,
              item.extraDiscountRupees || 0
            ),
          };
        }
        return item;
      })
    );
  };

  const removeFromRetailCart = (productId: string) => {
    setRetailCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateRetailQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromRetailCart(productId);
      return;
    }

    const item = retailCart.find(i => i.product.id === productId);
    const fresh = productsService.getById(productId) || item?.product;
    const currentStock = fresh?.stock ?? item?.product.stock ?? 9999;

    const isBox = item?.product.packagingConfig?.type === 'box';
    const suitsPerBox = item?.product.packagingConfig?.suitsPerBox || 1;
    const suitsNeeded = (isBox && item?.selectedUnit === 'Box') ? quantity * suitsPerBox : quantity;

    if (item && suitsNeeded > currentStock) {
      toast({
        title: 'Stock Warning',
        description: `Requested ${quantity} ${item.selectedUnit || 'unit(s)'} (${suitsNeeded} suits), but only ${currentStock} suits available in stock.`,
        type: 'warning',
      });
      return;
    }

    setRetailCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          const freshProd = productsService.getById(productId) || item.product;
          const freshPrice = getProductRetailUnitPrice(freshProd, item.selectedUnit);
          const freshDiscount = freshProd.retailDiscount || 0;
          return {
            ...item,
            product: freshProd,
            price: freshPrice,
            discountPerUnit: freshDiscount,
            quantity,
            lineTotal: computeLineTotal(
              freshPrice,
              freshDiscount,
              quantity,
              item.discountPercent,
              item.extraDiscountRupees || 0
            ),
          };
        }
        return item;
      })
    );
  };

  const updateRetailDiscount = (productId: string, discountPercent: number) => {
    const validDiscount = Math.min(100, Math.max(0, discountPercent));
    setRetailCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          return {
            ...item,
            discountPercent: validDiscount,
            lineTotal: computeLineTotal(
              item.price,
              item.discountPerUnit || 0,
              item.quantity,
              validDiscount,
              item.extraDiscountRupees || 0
            ),
          };
        }
        return item;
      })
    );
  };

  const updateRetailExtraDiscount = (productId: string, extraDiscountRs: number) => {
    const validDiscount = Math.max(0, extraDiscountRs || 0);
    setRetailCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          return {
            ...item,
            extraDiscountRupees: validDiscount,
            discountPercent: 0,
            lineTotal: computeLineTotal(
              item.price,
              item.discountPerUnit || 0,
              item.quantity,
              0,
              validDiscount
            ),
          };
        }
        return item;
      })
    );
  };

  const clearRetailCart = () => {
    setRetailCart([]);
  };

  const restoreRetailCart = (items: CartItem[]) => {
    const refreshed = items.map(item => {
      const fresh = productsService.getById(item.product.id) || item.product;
      const unitDiscount = fresh.retailDiscount || 0;
      return {
        ...item,
        product: fresh,
        price: fresh.retailPrice,
        discountPerUnit: unitDiscount,
        lineTotal: computeLineTotal(
          fresh.retailPrice,
          unitDiscount,
          item.quantity,
          item.discountPercent || 0,
          item.extraDiscountRupees || 0
        ),
      };
    });
    setRetailCart(refreshed);
  };

  // ---------------- Wholesale Cart Operations ----------------
  const addToWholesaleCart = (product: Product, quantity = 1) => {
    const freshProduct = productsService.getById(product.id) || product;

    if (freshProduct.stock <= 0) {
      toast({
        title: 'Out of Stock',
        description: `${freshProduct.name} is currently out of stock!`,
        type: 'error',
      });
      return;
    }

    const unitDiscount = freshProduct.wholesaleDiscount || 0;
    const existingIndex = wholesaleCart.findIndex(item => item.product.id === freshProduct.id);

    if (existingIndex !== -1) {
      const existing = wholesaleCart[existingIndex];
      const newQty = existing.quantity + quantity;

      if (newQty > freshProduct.stock) {
        toast({
          title: 'Stock Limit Reach',
          description: `Only ${freshProduct.stock} ${freshProduct.unit}(s) available in stock.`,
          type: 'warning',
        });
        return;
      }

      setWholesaleCart(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(item => item.product.id === freshProduct.id);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            product: freshProduct,
            price: freshProduct.wholesalePrice,
            discountPerUnit: unitDiscount,
            quantity: newQty,
            lineTotal: computeLineTotal(
              freshProduct.wholesalePrice,
              unitDiscount,
              newQty,
              updated[idx].discountPercent,
              updated[idx].extraDiscountRupees || 0
            ),
          };
        }
        return updated;
      });
    } else {
      const item: CartItem = {
        product: freshProduct,
        quantity,
        price: freshProduct.wholesalePrice,
        discountPerUnit: unitDiscount,
        discountPercent: 0,
        extraDiscountRupees: 0,
        lineTotal: computeLineTotal(freshProduct.wholesalePrice, unitDiscount, quantity, 0, 0),
      };
      setWholesaleCart(prev => [...prev, item]);
    }
  };

  const removeFromWholesaleCart = (productId: string) => {
    setWholesaleCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateWholesaleQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromWholesaleCart(productId);
      return;
    }

    const item = wholesaleCart.find(i => i.product.id === productId);
    const fresh = productsService.getById(productId) || item?.product;
    const currentStock = fresh?.stock ?? item?.product.stock ?? 9999;

    if (item && quantity > currentStock) {
      toast({
        title: 'Stock Warning',
        description: `Requested ${quantity}, but only ${currentStock} available.`,
        type: 'warning',
      });
      return;
    }

    setWholesaleCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          const freshProd = productsService.getById(productId) || item.product;
          const freshPrice = freshProd.wholesalePrice;
          const freshDiscount = freshProd.wholesaleDiscount || 0;
          return {
            ...item,
            product: freshProd,
            price: freshPrice,
            discountPerUnit: freshDiscount,
            quantity,
            lineTotal: computeLineTotal(
              freshPrice,
              freshDiscount,
              quantity,
              item.discountPercent,
              item.extraDiscountRupees || 0
            ),
          };
        }
        return item;
      })
    );
  };

  const updateWholesaleDiscount = (productId: string, discountPercent: number) => {
    const validDiscount = Math.min(100, Math.max(0, discountPercent));
    setWholesaleCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          return {
            ...item,
            discountPercent: validDiscount,
            lineTotal: computeLineTotal(
              item.price,
              item.discountPerUnit || 0,
              item.quantity,
              validDiscount,
              item.extraDiscountRupees || 0
            ),
          };
        }
        return item;
      })
    );
  };

  const updateWholesaleExtraDiscount = (productId: string, extraDiscountRs: number) => {
    const validDiscount = Math.max(0, extraDiscountRs || 0);
    setWholesaleCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          return {
            ...item,
            extraDiscountRupees: validDiscount,
            discountPercent: 0,
            lineTotal: computeLineTotal(
              item.price,
              item.discountPerUnit || 0,
              item.quantity,
              0,
              validDiscount
            ),
          };
        }
        return item;
      })
    );
  };

  const clearWholesaleCart = () => {
    setWholesaleCart([]);
  };

  const restoreWholesaleCart = (items: CartItem[]) => {
    const refreshed = items.map(item => {
      const fresh = productsService.getById(item.product.id) || item.product;
      const unitDiscount = fresh.wholesaleDiscount || 0;
      const price = fresh.wholesalePrice || item.price;
      return {
        ...item,
        product: fresh,
        price,
        discountPerUnit: unitDiscount,
        lineTotal: computeLineTotal(
          price,
          unitDiscount,
          item.quantity,
          item.discountPercent || 0,
          item.extraDiscountRupees || 0
        ),
      };
    });
    setWholesaleCart(refreshed);
  };

  // ---------------- Khata / Wholesale Cart Operations ----------------
  const addToKhataCart = (product: Product, quantity = 1) => {
    const freshProduct = productsService.getById(product.id) || product;
    const resolvedPrice = freshProduct.wholesalePrice || freshProduct.khataPrice || 0;

    // Strict validation: Must have a valid non-zero Wholesale Price
    if (resolvedPrice <= 0) {
      toast({
        title: 'Wholesale Price Missing',
        description: `Cannot add "${freshProduct.name}" to invoice. Wholesale Price is not set. Please configure price in product catalog.`,
        type: 'error',
      });
      return;
    }

    const isBox = freshProduct.packagingConfig?.type === 'box';
    const wholesaleStockLimit = isBox && freshProduct.packagingConfig?.wholesaleBoxes !== undefined
      ? freshProduct.packagingConfig.wholesaleBoxes * (freshProduct.packagingConfig.suitsPerBox || 1)
      : freshProduct.stock;

    if (wholesaleStockLimit <= 0) {
      toast({
        title: 'Out of Stock',
        description: `${freshProduct.name} is currently out of wholesale stock.`,
        type: 'error',
      });
      return;
    }

    const unitDiscount = freshProduct.wholesaleDiscount || freshProduct.khataDiscount || 0;
    const existingIndex = khataCart.findIndex(item => item.product.id === freshProduct.id);

    if (existingIndex !== -1) {
      const existing = khataCart[existingIndex];
      const newQty = existing.quantity + quantity;

      if (newQty > wholesaleStockLimit) {
        toast({
          title: 'Stock Limit Reached',
          description: `Only ${wholesaleStockLimit} ${freshProduct.unit}(s) available in wholesale stock.`,
          type: 'warning',
        });
        return;
      }

      setKhataCart(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(item => item.product.id === freshProduct.id);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            product: freshProduct,
            price: resolvedPrice,
            discountPerUnit: unitDiscount,
            quantity: newQty,
            lineTotal: computeLineTotal(
              resolvedPrice,
              unitDiscount,
              newQty,
              updated[idx].discountPercent,
              updated[idx].extraDiscountRupees || 0
            ),
          };
        }
        return updated;
      });
    } else {
      const item: CartItem = {
        product: freshProduct,
        quantity,
        price: resolvedPrice,
        discountPerUnit: unitDiscount,
        discountPercent: 0,
        extraDiscountRupees: 0,
        lineTotal: computeLineTotal(resolvedPrice, unitDiscount, quantity, 0, 0),
      };
      setKhataCart(prev => [...prev, item]);
    }
  };

  const removeFromKhataCart = (productId: string) => {
    setKhataCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateKhataQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromKhataCart(productId);
      return;
    }

    const item = khataCart.find(i => i.product.id === productId);
    const fresh = productsService.getById(productId) || item?.product;
    const currentStock = fresh?.stock ?? item?.product.stock ?? 9999;

    if (item && quantity > currentStock) {
      toast({
        title: 'Stock Warning',
        description: `Requested ${quantity}, but only ${currentStock} available.`,
        type: 'warning',
      });
      return;
    }

    setKhataCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          const freshProd = productsService.getById(productId) || item.product;
          const freshPrice = freshProd.khataPrice ?? item.price;
          const freshDiscount = freshProd.khataDiscount || 0;
          return {
            ...item,
            product: freshProd,
            price: freshPrice,
            discountPerUnit: freshDiscount,
            quantity,
            lineTotal: computeLineTotal(
              freshPrice,
              freshDiscount,
              quantity,
              item.discountPercent,
              item.extraDiscountRupees || 0
            ),
          };
        }
        return item;
      })
    );
  };

  const updateKhataDiscount = (productId: string, discountPercent: number) => {
    const validDiscount = Math.min(100, Math.max(0, discountPercent));
    setKhataCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          return {
            ...item,
            discountPercent: validDiscount,
            lineTotal: computeLineTotal(
              item.price,
              item.discountPerUnit || 0,
              item.quantity,
              validDiscount,
              item.extraDiscountRupees || 0
            ),
          };
        }
        return item;
      })
    );
  };

  const updateKhataExtraDiscount = (productId: string, extraDiscountRs: number) => {
    const validDiscount = Math.max(0, extraDiscountRs || 0);
    setKhataCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          return {
            ...item,
            extraDiscountRupees: validDiscount,
            discountPercent: 0,
            lineTotal: computeLineTotal(
              item.price,
              item.discountPerUnit || 0,
              item.quantity,
              0,
              validDiscount
            ),
          };
        }
        return item;
      })
    );
  };

  const clearKhataCart = () => {
    setKhataCart([]);
  };

  const restoreKhataCart = (items: CartItem[]) => {
    const refreshed = items.map(item => {
      const fresh = productsService.getById(item.product.id) || item.product;
      const unitDiscount = fresh.khataDiscount || 0;
      const price = fresh.khataPrice ?? item.price;
      return {
        ...item,
        product: fresh,
        price,
        discountPerUnit: unitDiscount,
        lineTotal: computeLineTotal(
          price,
          unitDiscount,
          item.quantity,
          item.discountPercent || 0,
          item.extraDiscountRupees || 0
        ),
      };
    });
    setKhataCart(refreshed);
  };

  // Sync active cart items with latest prices and discounts from productsService
  const syncWithLatestProducts = () => {
    setRetailCart(prev =>
      prev.map(item => {
        const fresh = productsService.getById(item.product.id);
        if (!fresh) return item;
        const freshDiscount = fresh.retailDiscount || 0;
        return {
          ...item,
          product: fresh,
          price: fresh.retailPrice,
          discountPerUnit: freshDiscount,
          lineTotal: computeLineTotal(
            fresh.retailPrice,
            freshDiscount,
            item.quantity,
            item.discountPercent
          ),
        };
      })
    );

    setWholesaleCart(prev =>
      prev.map(item => {
        const fresh = productsService.getById(item.product.id);
        if (!fresh) return item;
        const freshDiscount = fresh.wholesaleDiscount || 0;
        return {
          ...item,
          product: fresh,
          price: fresh.wholesalePrice,
          discountPerUnit: freshDiscount,
          lineTotal: computeLineTotal(
            fresh.wholesalePrice,
            freshDiscount,
            item.quantity,
            item.discountPercent,
            item.extraDiscountRupees || 0
          ),
        };
      })
    );

    setKhataCart(prev =>
      prev.map(item => {
        const fresh = productsService.getById(item.product.id);
        if (!fresh) return item;
        const freshPrice = fresh.khataPrice ?? item.price;
        const freshDiscount = fresh.khataDiscount || 0;
        return {
          ...item,
          product: fresh,
          price: freshPrice,
          discountPerUnit: freshDiscount,
          lineTotal: computeLineTotal(
            freshPrice,
            freshDiscount,
            item.quantity,
            item.discountPercent,
            item.extraDiscountRupees || 0
          ),
        };
      })
    );
  };

  // Computations
  const retailSubtotal = retailCart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const retailGrandTotal = retailCart.reduce((sum, i) => sum + i.lineTotal, 0);
  const retailDiscountTotal = retailSubtotal - retailGrandTotal;

  const wholesaleSubtotal = wholesaleCart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const wholesaleGrandTotal = wholesaleCart.reduce((sum, i) => sum + i.lineTotal, 0);
  const wholesaleDiscountTotal = wholesaleSubtotal - wholesaleGrandTotal;

  const khataSubtotal = khataCart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const khataGrandTotal = khataCart.reduce((sum, i) => sum + i.lineTotal, 0);
  const khataDiscountTotal = khataSubtotal - khataGrandTotal;

  return (
    <CartContext.Provider
      value={{
        retailCart,
        addToRetailCart,
        toggleRetailCartItemUnit,
        setRetailCartItemUnit,
        removeFromRetailCart,
        updateRetailQuantity,
        updateRetailDiscount,
        updateRetailExtraDiscount,
        clearRetailCart,
        restoreRetailCart,
        retailSubtotal,
        retailDiscountTotal,
        retailGrandTotal,

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
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
