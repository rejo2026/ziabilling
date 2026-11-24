// ============================================================
// POSPage — Quick Billing / POS Counter
// ============================================================
import React, { useState } from 'react';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, X, Clock,
  Pause, Play, CreditCard, QrCode, Banknote, User, Tag,
  CheckCircle2, Printer, RefreshCw
} from 'lucide-react';
import { Product, HeldBill, Invoice, PaymentMethod } from '../types';
import { api } from '../api';

interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  taxRate: number;
  quantity: number;
  total: number;
}

interface POSPageProps {
  products: Product[];
  heldBills: HeldBill[];
  customers: { id: string; name: string; phone: string }[];
  onRefresh: () => void;
  onViewInvoice: (inv: Invoice) => void;
}

export default function POSPage({ products, heldBills, customers, onRefresh, onViewInvoice }: POSPageProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [holdLoading, setHoldLoading] = useState(false);

  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode || '').includes(search) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchSearch && matchCat && p.stock > 0;
  });

  const cartSubtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const cartTax = cart.reduce((s, i) => s + (i.unitPrice * i.quantity * i.taxRate) / 100, 0);
  const discountAmt = parseFloat(discount) || 0;
  const cartTotal = cartSubtotal + cartTax - discountAmt;

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice }
            : i
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        unitPrice: product.sellingPrice,
        taxRate: product.taxRate,
        quantity: 1,
        total: product.sellingPrice
      }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart(prev =>
      prev
        .map(i => i.productId === productId
          ? { ...i, quantity: i.quantity + delta, total: (i.quantity + delta) * i.unitPrice }
          : i)
        .filter(i => i.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(i => i.productId !== productId));
  }

  function clearCart() {
    setCart([]);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setDiscount('0');
    setPaymentMethod('Cash');
  }

  async function handleCheckout() {
    if (cart.length === 0) return;
    setCheckoutLoading(true);
    try {
      const inv = await api.post<Invoice>('/invoices', {
        type: 'POS',
        customerName,
        customerPhone,
        paymentMethod,
        items: cart.map(i => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          taxRate: i.taxRate,
          total: i.quantity * i.unitPrice * (1 + i.taxRate / 100)
        })),
        subtotal: cartSubtotal,
        tax: cartTax,
        discount: discountAmt,
        total: cartTotal,
        status: paymentMethod === 'Credit' ? 'PENDING' : 'PAID'
      });
      onRefresh();
      clearCart();
      onViewInvoice(inv);
    } catch (e) {
      alert('Checkout failed. Check server connection.');
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleHoldBill() {
    if (cart.length === 0) return;
    setHoldLoading(true);
    try {
      await api.post('/pos/hold', {
        customerName,
        items: cart,
        total: cartTotal
      });
      onRefresh();
      clearCart();
    } catch (e) {
      alert('Hold failed.');
    } finally {
      setHoldLoading(false);
    }
  }

  async function resumeHeldBill(bill: HeldBill) {
    await api.del(`/pos/hold/${bill.id}`);
    setCart(bill.items as CartItem[]);
    setCustomerName(bill.customerName);
    setShowHeldModal(false);
    onRefresh();
  }

  async function deleteHeldBill(id: string) {
    await api.del(`/pos/hold/${id}`);
    onRefresh();
  }

  const payBtnBase = 'flex-1 py-2 rounded-lg text-sm font-semibold transition-all border';
  const payActive = 'bg-indigo-600 text-white border-indigo-600 shadow-lg';
  const payInactive = 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700';

  return (
    <div className="flex h-full gap-3 overflow-hidden">
      {/* ── LEFT: Product Grid ── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Search + Category */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              placeholder="Search by name, SKU or barcode…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <select
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 content-start">
          {filteredProducts.map(p => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-left hover:border-indigo-500 hover:bg-slate-750 transition-all group"
            >
              <div className="w-full h-16 bg-slate-700 rounded-lg mb-2 flex items-center justify-center group-hover:bg-slate-600 transition-colors">
                <ShoppingCart className="w-6 h-6 text-slate-400 group-hover:text-indigo-400" />
              </div>
              <p className="text-xs font-semibold text-white truncate">{p.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{p.category}</p>
              <p className="text-sm font-bold text-emerald-400 mt-1">AED {p.sellingPrice.toFixed(2)}</p>
              <p className="text-xs text-slate-500">Stock: {p.stock} {(p as any).oemNumber ? `• OEM: ${(p as any).oemNumber}` : ''}</p>
            </button>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No products found</p>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart & Payment ── */}
      <div className="w-80 flex flex-col bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {/* Cart Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-white text-sm">Cart</span>
            <span className="bg-indigo-600 text-white text-xs rounded-full px-1.5">{cart.length}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowHeldModal(true)}
              className="relative text-slate-400 hover:text-amber-400 transition-colors"
              title="Held Bills"
            >
              <Clock className="w-4 h-4" />
              {heldBills.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-3.5 h-3.5 flex items-center justify-center text-[10px]">
                  {heldBills.length}
                </span>
              )}
            </button>
            <button onClick={clearCart} className="text-slate-400 hover:text-red-400 transition-colors" title="Clear Cart">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Customer Info */}
        <div className="px-3 py-2 border-b border-slate-700 space-y-1.5">
          <div className="relative">
            <User className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
            <input
              className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              placeholder="Customer name"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
            />
          </div>
          <input
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            placeholder="Phone (optional)"
            value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)}
          />
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Add products to cart</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.productId} className="flex items-center gap-2 bg-slate-900 rounded-lg p-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                  <p className="text-xs text-slate-400">₹{item.unitPrice.toFixed(2)} × {item.quantity}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.productId, -1)} className="w-5 h-5 flex items-center justify-center bg-slate-700 rounded text-slate-300 hover:bg-red-600 hover:text-white transition-colors">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs text-white w-5 text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.productId, 1)} className="w-5 h-5 flex items-center justify-center bg-slate-700 rounded text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                  <button onClick={() => removeFromCart(item.productId)} className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors ml-0.5">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-xs font-bold text-indigo-400 w-14 text-right">
                  ₹{(item.unitPrice * item.quantity).toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-slate-700 px-3 py-2 space-y-1 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal</span><span>₹{cartSubtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Tax</span><span>₹{cartTax.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1"><Tag className="w-3 h-3" />Discount</span>
            <input
              className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-0.5 text-right text-white focus:outline-none focus:border-indigo-500"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              type="number"
              min="0"
            />
          </div>
          <div className="flex justify-between text-white font-bold text-base border-t border-slate-700 pt-1">
            <span>Total</span><span>AED {Math.max(0, cartTotal).toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="px-3 py-2 border-t border-slate-700">
          <p className="text-xs text-slate-400 mb-1.5">Payment Method</p>
          <div className="flex gap-1.5">
            {(['Cash', 'UPI', 'Card', 'Credit'] as const).map(m => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`${payBtnBase} ${paymentMethod === m ? payActive : payInactive} flex-1 py-1.5 text-xs`}
              >
                {m === 'Cash' && <Banknote className="w-3 h-3 mx-auto mb-0.5" />}
                {m === 'UPI' && <QrCode className="w-3 h-3 mx-auto mb-0.5" />}
                {m === 'Card' && <CreditCard className="w-3 h-3 mx-auto mb-0.5" />}
                {m === 'Credit' && <User className="w-3 h-3 mx-auto mb-0.5" />}
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-3 py-3 border-t border-slate-700 space-y-2">
          <button
            onClick={handleHoldBill}
            disabled={cart.length === 0 || holdLoading}
            className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-lg py-2 text-sm font-semibold transition-colors"
          >
            <Pause className="w-4 h-4" />
            {holdLoading ? 'Holding…' : 'Hold Bill'}
          </button>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || checkoutLoading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg py-2.5 text-sm font-bold transition-colors"
          >
            <Printer className="w-4 h-4" />
            {checkoutLoading ? 'Processing…' : 'Complete & Print'}
          </button>
        </div>
      </div>

      {/* ── Held Bills Modal ── */}
      {showHeldModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" /> Held Bills ({heldBills.length})
              </h3>
              <button onClick={() => setShowHeldModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {heldBills.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No held bills</p>
              ) : heldBills.map(bill => (
                <div key={bill.id} className="bg-slate-900 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{bill.customerName}</p>
                    <p className="text-xs text-slate-400">{bill.time} — {(bill.items as any[]).length} items — ₹{bill.total.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => resumeHeldBill(bill)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                      <Play className="w-3 h-3" /> Resume
                    </button>
                    <button onClick={() => deleteHeldBill(bill.id)} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs px-2 py-1.5 rounded-lg transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
