import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPortalCatalogApi, fetchProductsApi } from '@/features/catalog/services/catalog.api';
import { submitPortalRfqApi } from '@/features/rfq/services/rfq.api';
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  ArrowRight,
  Send,
  Sparkles,
  Calendar,
  FileText,
} from 'lucide-react';
import { toast } from 'react-toastify';

interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  description?: string;
  itemType?: string;
  item_type?: string;
  basePrice?: number | string;
  base_price?: number | string;
  taxRate?: number;
  tax_rate?: number;
  categoryId?: string;
  category_id?: string;
  isPromoted?: boolean;
  variants?: any[];
}

interface SelectedItemConfig {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number | string;
  discountPct: number | string;
  itemType: string;
}

export const CustomerCatalogPage: React.FC = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Selected products state map: productId -> SelectedItemConfig
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItemConfig>>({});

  // Submission meta
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedRfqId, setSubmittedRfqId] = useState<string | null>(null);

  // Load catalog data
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setLoading(true);
        let prods: CatalogProduct[] = [];
        try {
          const res = await fetchPortalCatalogApi();
          prods = res.catalog || [];
        } catch {
          // Fallback to general products API
          const res = await fetchProductsApi();
          prods = res.products || [];
        }
        setProducts(prods);
      } catch (err: any) {
        console.error('Failed to load catalog products:', err);
        toast.error('Failed to load product catalog.');
      } finally {
        setLoading(false);
      }
    };
    loadCatalog();
  }, []);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const type = (p.itemType || p.item_type || '').toLowerCase();
      const matchesCategory =
        selectedCategory === 'all' ||
        type === selectedCategory.toLowerCase();

      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        p.name?.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term));

      return matchesCategory && matchesSearch;
    });
  }, [products, searchTerm, selectedCategory]);

  // Product selection and modification handlers
  const handleToggleSelect = (product: CatalogProduct) => {
    const price = Number(product.basePrice || product.base_price || 0);
    const type = product.itemType || product.item_type || 'hardware';

    setSelectedItems((prev) => {
      if (prev[product.id]) {
        const next = { ...prev };
        delete next[product.id];
        return next;
      }
      return {
        ...prev,
        [product.id]: {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unitPrice: price,
          quantity: 1,
          discountPct: '', // Blank by default so user can type cleanly without a stuck '0'
          itemType: type,
        },
      };
    });
  };

  const handleUpdateQuantity = (productId: string, val: number | string) => {
    setSelectedItems((prev) => {
      if (!prev[productId]) return prev;
      if (val === '') {
        return {
          ...prev,
          [productId]: {
            ...prev[productId],
            quantity: '',
          },
        };
      }
      const num = parseInt(String(val), 10);
      const valid = isNaN(num) ? '' : Math.max(1, num);
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          quantity: valid,
        },
      };
    });
  };

  const handleUpdateDiscount = (productId: string, val: string) => {
    setSelectedItems((prev) => {
      if (!prev[productId]) return prev;
      if (val === '') {
        return {
          ...prev,
          [productId]: {
            ...prev[productId],
            discountPct: '',
          },
        };
      }
      const num = parseFloat(val);
      const valid = isNaN(num) ? '' : Math.max(0, Math.min(100, num));
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          discountPct: valid,
        },
      };
    });
  };

  // Summary calculations
  const selectedList = Object.values(selectedItems);
  const totalItemsCount = selectedList.reduce(
    (sum, item) => sum + (Number(item.quantity) || 1),
    0
  );

  const subtotalGross = selectedList.reduce(
    (sum, item) => sum + item.unitPrice * (Number(item.quantity) || 1),
    0
  );

  const totalDiscountAmount = selectedList.reduce((sum, item) => {
    const qty = Number(item.quantity) || 1;
    const disc = Number(item.discountPct) || 0;
    const lineGross = item.unitPrice * qty;
    return sum + lineGross * (disc / 100);
  }, 0);

  const estimatedTotal = subtotalGross - totalDiscountAmount;

  // Submit quotation request
  const handleSubmitQuotationRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedList.length === 0) {
      toast.error('Please select at least one product to request a quotation.');
      return;
    }

    try {
      setSubmitting(true);

      const itemsPayload = selectedList.map((item) => {
        const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
        const disc = Math.max(0, Math.min(100, Number(item.discountPct) || 0));
        return {
          productId: item.productId,
          requestedQty: qty,
          lineNotes: JSON.stringify({
            requestedDiscountPct: disc,
            unitListPrice: item.unitPrice,
            productName: item.name,
            productSku: item.sku,
            estimatedLineTotal: item.unitPrice * qty * (1 - disc / 100),
          }),
        };
      });

      const payload = {
        items: itemsPayload,
        requestedDeliveryDate: deliveryDate || undefined,
        customerNotes: customerNotes
          ? `${customerNotes} [Catalogue Inbound Quote Request]`
          : `Client requested quote for ${selectedList.length} product(s) via Product Catalogue with customized discount rates.`,
      };

      const res = await submitPortalRfqApi(payload);
      const rfqId = res.request?.id || res.rfq?.id || 'SUBMITTED';
      setSubmittedRfqId(rfqId);
      // Immediately reset selectedItems, deliveryDate, and notes so subsequent submissions are clean!
      setSelectedItems({});
      setDeliveryDate('');
      setCustomerNotes('');
      toast.success('Quotation request submitted to your sales desk!');
    } catch (err: any) {
      console.error('RFQ submission error:', err);
      toast.error(err.message || 'Failed to submit quotation request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-24">
      {/* Top Header Banner matching global css & portal style */}
      <div className="pb-6 border-b border-neutral-200">
        <div className="flex flex-wrap items-center gap-2.5 mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase">
            <ShoppingBag className="w-3.5 h-3.5" />
            ENTERPRISE CATALOGUE // DIRECT QUOTATION REQUEST
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-mono font-bold tracking-widest text-emerald-700 uppercase">
            VERIFIED PRICING
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#111111] uppercase tracking-tight">
              PRODUCT CATALOGUE
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 font-mono mt-1.5 max-w-3xl leading-relaxed">
              Browse enterprise hardware, recurring SaaS, and engineering services. Configure quantity tiers, input your target discount rate, and submit an authorized quotation request directly to sales operations.
            </p>
          </div>

          {/* Quick Counter */}
          {selectedList.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-neutral-100 border border-neutral-200 font-mono text-xs">
              <span className="text-neutral-500 font-bold uppercase">SELECTED:</span>
              <span className="px-2 py-0.5 rounded-full bg-[#ff3b30] text-white font-black text-xs">
                {selectedList.length} items ({totalItemsCount} units)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Success Confirmation Card */}
      {submittedRfqId && (
        <div className="app-card border-2 border-emerald-500 bg-emerald-50/40 p-8 sm:p-10 rounded-3xl text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-700 uppercase">
              TRANSMISSION CONFIRMED // ID: {submittedRfqId.slice(0, 8).toUpperCase()}
            </span>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-neutral-900 uppercase tracking-tight">
              QUOTATION REQUEST SUBMITTED
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 font-mono max-w-lg mx-auto leading-relaxed">
              Your requested products, quantities, and discount rates have been queued for the sales desk. The assigned sales manager will evaluate terms and generate your formal quotation.
            </p>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/portal/quotations')}
              className="btn btn-primary font-mono text-xs uppercase"
            >
              <span>VIEW MY QUOTATIONS</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 inline" />
            </button>
            <button
              type="button"
              onClick={() => {
                setSubmittedRfqId(null);
                setSelectedItems({});
              }}
              className="btn btn-secondary font-mono text-xs uppercase"
            >
              CREATE ANOTHER REQUEST
            </button>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Filters and Product Grid (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Search & Category Filter Toolbar */}
          <div className="app-card p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products by title, SKU, or specs..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#ff3b30] focus:bg-white transition-colors"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'ALL' },
                { id: 'hardware', label: 'HARDWARE' },
                { id: 'software', label: 'SOFTWARE' },
                { id: 'service', label: 'SERVICES' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase transition-colors cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards List */}
          {loading ? (
            <div className="app-card p-12 text-center font-mono text-xs text-neutral-500 space-y-3">
              <div className="w-6 h-6 rounded-full border-2 border-neutral-200 border-t-[#ff3b30] animate-spin mx-auto" />
              <p>LOADING PRODUCT CATALOGUE...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="app-card p-12 text-center rounded-2xl border-dashed border-neutral-300">
              <p className="font-mono text-xs font-bold text-neutral-700 uppercase">
                NO MATCHING PRODUCTS FOUND
              </p>
              <p className="font-mono text-[11px] text-neutral-400 mt-1">
                Try searching for another keyword or change the category filter.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => {
                const isSelected = !!selectedItems[product.id];
                const config = selectedItems[product.id] || {
                  quantity: 1,
                  discountPct: '',
                };
                const price = Number(product.basePrice || product.base_price || 0);
                const itemType = product.itemType || product.item_type || 'hardware';

                // Calculated values
                const qtyVal = Number(config.quantity) || 1;
                const discVal = Number(config.discountPct) || 0;
                const discountedUnitPrice = price * (1 - discVal / 100);
                const lineTotal = discountedUnitPrice * qtyVal;

                return (
                  <div
                    key={product.id}
                    className={`app-card transition-all duration-200 p-5 rounded-2xl ${
                      isSelected
                        ? 'border-neutral-900 bg-neutral-50/50 shadow-sm'
                        : 'hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Product Info */}
                      <div className="flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded uppercase">
                            {product.sku}
                          </span>
                          <span
                            className={`app-badge ${
                              itemType === 'service'
                                ? 'badge-confirmed'
                                : itemType === 'software'
                                ? 'badge-negotiating'
                                : 'badge-draft'
                            }`}
                          >
                            {itemType.toUpperCase()}
                          </span>
                          {product.isPromoted && (
                            <span className="app-badge badge-pending flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> FEATURED
                            </span>
                          )}
                        </div>

                        <h3 className="font-display font-black text-lg text-neutral-900 uppercase tracking-tight">
                          {product.name}
                        </h3>

                        {product.description && (
                          <p className="text-xs font-mono text-neutral-500 line-clamp-2">
                            {product.description}
                          </p>
                        )}

                        <div className="pt-1 flex items-baseline gap-2 font-mono">
                          <span className="text-[10px] uppercase text-neutral-400 font-semibold">
                            LIST PRICE:
                          </span>
                          <span className="text-sm font-bold text-neutral-900">
                            ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Right: Selection Toggle & Controls */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-neutral-200">
                        {isSelected ? (
                          <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs">
                            {/* Quantity Stepper */}
                            <div>
                              <label className="block text-[9px] font-mono font-bold text-neutral-500 uppercase mb-1">
                                QUANTITY
                              </label>
                              <div className="app-stepper">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const curr = Number(config.quantity) || 1;
                                    handleUpdateQuantity(product.id, Math.max(1, curr - 1));
                                  }}
                                  className="app-stepper-btn cursor-pointer"
                                  title="Decrease quantity"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={config.quantity ?? ''}
                                  onChange={(e) =>
                                    handleUpdateQuantity(product.id, e.target.value)
                                  }
                                  className="w-12 text-center text-xs font-mono font-bold text-neutral-900 bg-transparent border-0 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const curr = Number(config.quantity) || 1;
                                    handleUpdateQuantity(product.id, curr + 1);
                                  }}
                                  className="app-stepper-btn cursor-pointer"
                                  title="Increase quantity"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Requested Discount % Input (Backspaceable) */}
                            <div>
                              <label className="block text-[9px] font-mono font-bold text-neutral-500 uppercase mb-1">
                                REQ. DISCOUNT (%)
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  placeholder="0"
                                  value={config.discountPct ?? ''}
                                  onChange={(e) =>
                                    handleUpdateDiscount(product.id, e.target.value)
                                  }
                                  className="w-20 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-neutral-900 focus:outline-none focus:border-[#ff3b30] pr-6"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-xs text-neutral-400 font-bold">
                                  %
                                </span>
                              </div>
                            </div>

                            {/* Line Subtotal Preview */}
                            <div className="text-right min-w-[100px]">
                              <span className="block text-[9px] font-mono font-bold text-neutral-400 uppercase">
                                LINE TOTAL
                              </span>
                              <span className="font-mono font-bold text-xs text-neutral-900">
                                ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>

                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => handleToggleSelect(product)}
                              className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer"
                              title="Remove from quote"
                            >
                              REMOVE
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(product)}
                            className="btn btn-secondary font-mono text-xs uppercase cursor-pointer whitespace-nowrap"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1 inline" />
                            <span>SELECT FOR QUOTE</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Sticky Quotation Request Summary (4 cols) */}
        <div className="lg:col-span-4 sticky top-24">
          <form
            onSubmit={handleSubmitQuotationRequest}
            className="app-card rounded-3xl p-6 sm:p-7 space-y-6 shadow-sm border border-neutral-200 bg-white"
          >
            {/* Summary Header */}
            <div className="border-b border-neutral-100 pb-4">
              <div className="flex items-center justify-between font-mono text-xs uppercase text-neutral-500 mb-1">
                <span className="text-[#ff3b30] font-bold">SUMMARY</span>
                <span>TELEMETRY</span>
              </div>
              <h2 className="font-display font-black text-xl text-neutral-900 uppercase tracking-tight">
                REQUEST CONFIGURATION
              </h2>
            </div>

            {/* Selected Items Breakdown List */}
            {selectedList.length === 0 ? (
              <div className="py-8 text-center font-mono text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-2xl px-4 space-y-1">
                <ShoppingBag className="w-6 h-6 mx-auto text-neutral-300" />
                <p className="font-bold uppercase text-neutral-600">NO PRODUCTS SELECTED</p>
                <p className="text-[11px]">Select items from the catalogue to configure quantities and discounts.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {selectedList.map((item) => {
                  const qty = Number(item.quantity) || 1;
                  const disc = Number(item.discountPct) || 0;
                  const discountedPrice = item.unitPrice * (1 - disc / 100);
                  const itemTotal = discountedPrice * qty;
                  return (
                    <div
                      key={item.productId}
                      className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 font-mono text-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-neutral-900 truncate uppercase text-[11px]">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          {qty} unit{qty > 1 ? 's' : ''} &times; ₹{item.unitPrice.toLocaleString('en-IN')}
                          {disc > 0 && (
                            <span className="text-[#ff3b30] font-bold ml-1">
                              (-{disc}%)
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-neutral-900 text-xs">
                          ₹{itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pricing Financial Tiers */}
            <div className="space-y-2.5 pt-2 border-t border-neutral-100 font-mono text-xs">
              <div className="flex items-center justify-between text-neutral-600">
                <span>TOTAL UNITS:</span>
                <span className="font-bold text-neutral-900">{totalItemsCount}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-600">
                <span>GROSS LIST PRICE:</span>
                <span className="font-bold text-neutral-900">
                  ₹{subtotalGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-neutral-600">
                <span>REQUESTED SAVINGS:</span>
                <span className="font-bold text-[#ff3b30]">
                  -₹{totalDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-neutral-200 text-sm">
                <span className="font-display font-black text-neutral-900 uppercase">
                  ESTIMATED QUOTE:
                </span>
                <span className="font-bold text-[#111111] text-base">
                  ₹{estimatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Delivery Date & Project Notes */}
            <div className="space-y-4 pt-2 border-t border-neutral-100 font-mono text-xs">
              <div>
                <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-neutral-400" />
                  TARGET DELIVERY DATE
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs font-mono text-neutral-900 focus:outline-none focus:border-[#ff3b30] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-neutral-400" />
                  PROJECT NOTES / CONSTRAINTS
                </label>
                <textarea
                  rows={3}
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Specify SLA tiers, delivery windows, or special procurement clauses..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs font-mono text-neutral-900 focus:outline-none focus:border-[#ff3b30] focus:bg-white resize-none"
                />
              </div>
            </div>

            {/* Action Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || selectedList.length === 0}
                className="w-full btn btn-primary py-3.5 font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>TRANSMITTING TELEMETRY...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>REQUEST QUOTATION</span>
                  </>
                )}
              </button>
              <p className="text-[10px] font-mono text-neutral-400 text-center uppercase tracking-widest mt-2">
                FAST-TRACK SALES ROUTING
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
