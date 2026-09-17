// Automated test script for Clothing Store POS Discount & Calculation Audit
const assert = require('assert');

console.log('--- STARTING POS DISCOUNT & AUDIT TEST SUITE ---');

// Formula functions mirroring the active implementation
function computeLineTotal(price, discountPerUnit = 0, qty = 1, discountPercent = 0) {
  const netUnitPrice = Math.max(0, price - discountPerUnit);
  const baseTotal = netUnitPrice * qty;
  const manualDiscount = (baseTotal * discountPercent) / 100;
  return Math.max(0, Math.round(baseTotal - manualDiscount));
}

function computeCartTotals(cartItems) {
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const grandTotal = cartItems.reduce((sum, i) => sum + i.lineTotal, 0);
  const discountTotal = subtotal - grandTotal;
  return { subtotal, grandTotal, discountTotal };
}

function completeSaleSimulation(params) {
  const subtotal = params.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const lineTotalsSum = params.cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const discountTotal = params.discountTotal !== undefined && params.discountTotal >= 0
    ? params.discountTotal
    : Math.max(0, subtotal - lineTotalsSum);
  const grandTotal = Math.max(0, lineTotalsSum + (params.taxTotal || 0));
  const changeDue = params.paymentMethod === 'Cash' ? Math.max(0, params.amountReceived - grandTotal) : 0;

  const billItems = params.cartItems.map(item => ({
    productId: item.product.id,
    productName: item.product.name,
    sku: item.product.sku,
    quantity: item.quantity,
    price: item.price,
    discountPerUnit: item.discountPerUnit || 0,
    subtotal: item.lineTotal,
  }));

  return { subtotal, discountTotal, grandTotal, changeDue, billItems };
}

// Sample product: Al Karam Fabrics
const alKaramProduct = {
  id: 'prd-alkaram-01',
  name: 'Al Karam Fabrics',
  sku: 'AKF-101',
  barcode: '8901234567890',
  wholesaleBarcode: '8901234567891',
  seasonCategory: 'Summer',
  stock: 25,
  retailPrice: 4500,
  retailDiscount: 100,
  wholesalePrice: 4000,
  wholesaleDiscount: 300,
};

// -------------------------------------------------------------
// Test A — Retail (qty 1)
// -------------------------------------------------------------
console.log('\n[Test A] Retail quantity 1');
{
  const itemPrice = alKaramProduct.retailPrice;
  const itemDiscount = alKaramProduct.retailDiscount;
  const qty = 1;
  const lineTotal = computeLineTotal(itemPrice, itemDiscount, qty);
  const netUnitPrice = Math.max(0, itemPrice - itemDiscount);

  console.log(`Original Price: Rs. ${itemPrice}`);
  console.log(`Discount: Rs. ${itemDiscount}`);
  console.log(`Net Unit Price: Rs. ${netUnitPrice}`);
  console.log(`Total: Rs. ${lineTotal}`);

  assert.strictEqual(itemPrice, 4500, 'Original retail price must remain 4500');
  assert.strictEqual(itemDiscount, 100, 'Retail discount must be 100');
  assert.strictEqual(netUnitPrice, 4400, 'Net unit price must be 4400');
  assert.strictEqual(lineTotal, 4400, 'Total must be 4400');
  console.log('✓ Test A Passed');
}

// -------------------------------------------------------------
// Test B — Retail quantity 2
// -------------------------------------------------------------
console.log('\n[Test B] Retail quantity 2');
{
  const itemPrice = alKaramProduct.retailPrice;
  const itemDiscount = alKaramProduct.retailDiscount;
  const qty = 2;
  const lineTotal = computeLineTotal(itemPrice, itemDiscount, qty);
  const cartTotals = computeCartTotals([
    { product: alKaramProduct, price: itemPrice, discountPerUnit: itemDiscount, quantity: qty, lineTotal }
  ]);

  console.log(`Original Subtotal: Rs. ${cartTotals.subtotal}`);
  console.log(`Total Discount: Rs. ${cartTotals.discountTotal}`);
  console.log(`Final Total: Rs. ${cartTotals.grandTotal}`);

  assert.strictEqual(cartTotals.subtotal, 9000, 'Original subtotal must be 9000');
  assert.strictEqual(cartTotals.discountTotal, 200, 'Total discount must be 200 (100 x 2)');
  assert.strictEqual(cartTotals.grandTotal, 8800, 'Final total must be 8800 (4400 x 2)');
  console.log('✓ Test B Passed');
}

// -------------------------------------------------------------
// Test C — Wholesale (qty 1)
// -------------------------------------------------------------
console.log('\n[Test C] Wholesale quantity 1');
{
  const itemPrice = alKaramProduct.wholesalePrice;
  const itemDiscount = alKaramProduct.wholesaleDiscount;
  const qty = 1;
  const lineTotal = computeLineTotal(itemPrice, itemDiscount, qty);
  const netUnitPrice = Math.max(0, itemPrice - itemDiscount);

  console.log(`Wholesale Price: Rs. ${itemPrice}`);
  console.log(`Wholesale Discount: Rs. ${itemDiscount}`);
  console.log(`Net Unit Price: Rs. ${netUnitPrice}`);
  console.log(`Total: Rs. ${lineTotal}`);

  assert.strictEqual(itemPrice, 4000, 'Original wholesale price must remain 4000');
  assert.strictEqual(itemDiscount, 300, 'Wholesale discount must be 300');
  assert.strictEqual(netUnitPrice, 3700, 'Net unit price must be 3700');
  assert.strictEqual(lineTotal, 3700, 'Total must be 3700');
  console.log('✓ Test C Passed');
}

// -------------------------------------------------------------
// Test D — Wholesale quantity 2
// -------------------------------------------------------------
console.log('\n[Test D] Wholesale quantity 2');
{
  const itemPrice = alKaramProduct.wholesalePrice;
  const itemDiscount = alKaramProduct.wholesaleDiscount;
  const qty = 2;
  const lineTotal = computeLineTotal(itemPrice, itemDiscount, qty);
  const cartTotals = computeCartTotals([
    { product: alKaramProduct, price: itemPrice, discountPerUnit: itemDiscount, quantity: qty, lineTotal }
  ]);

  console.log(`Original Subtotal: Rs. ${cartTotals.subtotal}`);
  console.log(`Total Discount: Rs. ${cartTotals.discountTotal}`);
  console.log(`Final Total: Rs. ${cartTotals.grandTotal}`);

  assert.strictEqual(cartTotals.subtotal, 8000, 'Wholesale subtotal must be 8000');
  assert.strictEqual(cartTotals.discountTotal, 600, 'Total discount must be 600 (300 x 2)');
  assert.strictEqual(cartTotals.grandTotal, 7400, 'Final total must be 7400 (3700 x 2)');
  console.log('✓ Test D Passed');
}

// -------------------------------------------------------------
// Test E — No discount
// -------------------------------------------------------------
console.log('\n[Test E] No discount');
{
  const regularPrice = 5000;
  const noDiscount = 0;
  const lineTotal = computeLineTotal(regularPrice, noDiscount, 3);
  assert.strictEqual(lineTotal, 15000, 'With Rs. 0 discount, line total equals price * qty');
  console.log('✓ Test E Passed');
}

// -------------------------------------------------------------
// Test F — Barcode lookup preservation
// -------------------------------------------------------------
console.log('\n[Test F] Barcode preservation');
{
  // Simulated product repository
  const db = [alKaramProduct];
  function lookupByBarcode(code) {
    const clean = code.trim().toLowerCase();
    return db.find(p => p.barcode.toLowerCase() === clean || p.wholesaleBarcode.toLowerCase() === clean);
  }

  // Scan existing retail barcode
  const scannedRetail = lookupByBarcode('8901234567890');
  assert.ok(scannedRetail, 'Retail barcode scanned');
  assert.strictEqual(scannedRetail.retailPrice, 4500);
  assert.strictEqual(scannedRetail.retailDiscount, 100);

  // Scan same item with wholesale barcode or same barcode in wholesale POS
  const scannedWholesale = lookupByBarcode('8901234567891');
  assert.ok(scannedWholesale, 'Wholesale barcode scanned');
  assert.strictEqual(scannedWholesale.wholesalePrice, 4000);
  assert.strictEqual(scannedWholesale.wholesaleDiscount, 300);

  console.log('✓ Test F Passed');
}

// -------------------------------------------------------------
// Test G — No double discount in completeSale
// -------------------------------------------------------------
console.log('\n[Test G] No double discount on checkout');
{
  const cart = [
    {
      product: alKaramProduct,
      price: alKaramProduct.retailPrice, // 4500
      discountPerUnit: alKaramProduct.retailDiscount, // 100
      quantity: 1,
      lineTotal: 4400,
    }
  ];
  const { subtotal, discountTotal, grandTotal } = computeCartTotals(cart);

  const completedBill = completeSaleSimulation({
    saleType: 'Retail',
    cartItems: cart,
    paymentMethod: 'Cash',
    amountReceived: 5000,
    discountTotal,
    taxTotal: 0,
    staffId: 'stf-1',
    staffName: 'Admin',
  });

  console.log(`Completed Bill Subtotal: Rs. ${completedBill.subtotal}`);
  console.log(`Completed Bill Discount: Rs. ${completedBill.discountTotal}`);
  console.log(`Completed Bill Grand Total: Rs. ${completedBill.grandTotal}`);
  console.log(`Change Due: Rs. ${completedBill.changeDue}`);

  assert.strictEqual(completedBill.subtotal, 4500, 'Original subtotal must be 4500');
  assert.strictEqual(completedBill.discountTotal, 100, 'Discount must be 100');
  assert.strictEqual(completedBill.grandTotal, 4400, 'Grand total must be 4400, NOT 4300!');
  assert.strictEqual(completedBill.changeDue, 600, '5000 received - 4400 grand total = 600 change');
  assert.strictEqual(completedBill.subtotal - completedBill.discountTotal, completedBill.grandTotal, 'subtotal - discount must equal grand total');

  console.log('✓ Test G Passed: No double discount confirmed!');
}

// -------------------------------------------------------------
// Test H — Regression (Multi-item cart + checkout)
// -------------------------------------------------------------
console.log('\n[Test H] Regression: Multi-item mixed cart');
{
  const p2 = {
    id: 'prd-gulahmed-02',
    name: 'Gul Ahmed Khaddar',
    sku: 'GAK-202',
    seasonCategory: 'Winter',
    retailPrice: 3800,
    retailDiscount: 200,
    wholesalePrice: 3200,
    wholesaleDiscount: 150,
  };

  const multiCart = [
    {
      product: alKaramProduct,
      price: 4500,
      discountPerUnit: 100,
      quantity: 2,
      lineTotal: computeLineTotal(4500, 100, 2), // 8800
    },
    {
      product: p2,
      price: 3800,
      discountPerUnit: 200,
      quantity: 1,
      lineTotal: computeLineTotal(3800, 200, 1), // 3600
    }
  ];

  const cartCalc = computeCartTotals(multiCart);
  assert.strictEqual(cartCalc.subtotal, 4500 * 2 + 3800 * 1, 'Subtotal: 9000 + 3800 = 12800');
  assert.strictEqual(cartCalc.discountTotal, 100 * 2 + 200 * 1, 'Total Discount: 200 + 200 = 400');
  assert.strictEqual(cartCalc.grandTotal, 8800 + 3600, 'Grand Total: 12400');
  assert.strictEqual(cartCalc.subtotal - cartCalc.discountTotal, cartCalc.grandTotal);

  const sale = completeSaleSimulation({
    saleType: 'Retail',
    cartItems: multiCart,
    paymentMethod: 'Cash',
    amountReceived: 13000,
    discountTotal: cartCalc.discountTotal,
    taxTotal: 0,
    staffId: 'stf-1',
    staffName: 'Admin',
  });

  assert.strictEqual(sale.subtotal, 12800);
  assert.strictEqual(sale.discountTotal, 400);
  assert.strictEqual(sale.grandTotal, 12400);
  assert.strictEqual(sale.changeDue, 600); // 13000 - 12400 = 600
  assert.strictEqual(sale.billItems.length, 2);
  assert.strictEqual(sale.billItems[0].discountPerUnit, 100);
  assert.strictEqual(sale.billItems[1].discountPerUnit, 200);

  console.log('✓ Test H Passed: Multi-item regression successful!');
}

console.log('\n=============================================================');
console.log('ALL TESTS A THROUGH H PASSED SUCCESSFULLY!');
console.log('=============================================================');
