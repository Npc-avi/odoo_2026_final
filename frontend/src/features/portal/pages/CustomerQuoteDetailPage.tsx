import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  fetchCustomerQuotationDetailApi,
  fetchNegotiationThreadApi,
  submitNegotiationMessageApi,
  confirmCustomerQuotationApi,
  fetchPortalCatalogApi,
  addPortalQuotationItemApi,
  updatePortalQuotationItemApi,
  deletePortalQuotationItemApi,
} from '@/features/quotations/services/quotations.api';
import { StatusBadge } from '@/components/StatusBadge';
import {
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Percent,
  Clock,
  Send,
  Plus,
  Trash2,
  Package,
  MessageSquare,
  Sparkles,
  ChevronDown,
  X,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { useSocket } from '@/context/socket.context';
import { toast } from 'react-toastify';

export const CustomerQuoteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { socket, joinQuote, leaveQuote } = useSocket();

  const [quotation, setQuotation] = useState<any>(null);
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Item inline edit states
  const [editingDiscounts, setEditingDiscounts] = useState<{ [itemId: string]: string }>({});
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [hasCustomerModified, setHasCustomerModified] = useState<boolean>(false);

  // Add Product modal / drawer state
  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [addDiscountPct, setAddDiscountPct] = useState<string>('0');
  const [addingProduct, setAddingProduct] = useState<boolean>(false);

  // Negotiation general message inputs
  const [requestedDate, setRequestedDate] = useState<string>('');
  const [generalComment, setGeneralComment] = useState<string>('');
  const [submittingNeg, setSubmittingNeg] = useState<boolean>(false);
  const [confirming, setConfirming] = useState<boolean>(false);

  const loadData = async (quoteId: string) => {
    try {
      setLoading(true);
      setError(null);
      const [qData, negData, catData] = await Promise.all([
        fetchCustomerQuotationDetailApi(quoteId),
        fetchNegotiationThreadApi(quoteId, true).catch(() => ({ negotiations: [] })),
        fetchPortalCatalogApi().catch(() => ({ catalog: [] })),
      ]);

      const q = qData.quotation || qData;
      setQuotation(q);
      setNegotiations(negData.negotiations || []);
      setCatalog(catData.catalog || []);

      // Initialize local discounts map
      if (q?.items?.length > 0) {
        const discMap: { [key: string]: string } = {};
        q.items.forEach((it: any) => {
          discMap[it.itemId] = String(Number(it.appliedDiscountPct || 0));
        });
        setEditingDiscounts(discMap);
      }

      if (q?.promisedDeliveryDate) {
        setRequestedDate(new Date(q.promisedDeliveryDate).toISOString().slice(0, 10));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load quotation details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData(id);
      joinQuote(id);
    }
    return () => {
      if (id) {
        leaveQuote(id);
      }
    };
  }, [id, joinQuote, leaveQuote]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket || !id) return;

    const handleRealtimeQuoteUpdate = (data: any) => {
      if (!data?.quoteId || data?.quoteId === id) {
        console.log('[Socket.IO Customer Quote Detail] Real-time change:', data);
        if (data?.status === 'confirmed') {
          toast.success('Your quotation has been confirmed!');
        } else if (data?.negotiation) {
          toast.info('New negotiation update from company!');
        }
        loadData(id);
      }
    };

    socket.on('quotation:updated', handleRealtimeQuoteUpdate);
    socket.on('negotiation:updated', handleRealtimeQuoteUpdate);
    socket.on('approval:updated', handleRealtimeQuoteUpdate);

    return () => {
      socket.off('quotation:updated', handleRealtimeQuoteUpdate);
      socket.off('negotiation:updated', handleRealtimeQuoteUpdate);
      socket.off('approval:updated', handleRealtimeQuoteUpdate);
    };
  }, [socket, id]);

  const isConfirmed = quotation?.status === 'confirmed' || quotation?.status === 'approved';

  // ----------------------------------------------------
  // Inline Item Modification: Discount Percentage
  // ----------------------------------------------------
  const handleDiscountBlur = async (item: any) => {
    if (isConfirmed) return;
    const rawVal = editingDiscounts[item.itemId];
    const newDiscount = parseFloat(rawVal);

    if (isNaN(newDiscount) || newDiscount < 0 || newDiscount > 100) {
      toast.warning('Discount must be between 0% and 100%');
      setEditingDiscounts((prev) => ({
        ...prev,
        [item.itemId]: String(Number(item.appliedDiscountPct || 0)),
      }));
      return;
    }

    if (newDiscount === Number(item.appliedDiscountPct || 0)) {
      return; // No change
    }

    try {
      setUpdatingItemId(item.itemId);
      setHasCustomerModified(true);
      await updatePortalQuotationItemApi(item.itemId, {
        quantity: item.quantity,
        appliedDiscountPct: newDiscount,
      });
      toast.success(`Discount updated to ${newDiscount}%. Proposal updated to Negotiating.`);
      if (id) await loadData(id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update item discount.');
    } finally {
      setUpdatingItemId(null);
    }
  };

  // ----------------------------------------------------
  // Inline Item Modification: Quantity Change
  // ----------------------------------------------------
  const handleQuantityChange = async (item: any, delta: number) => {
    if (isConfirmed) return;
    const newQty = Math.max(1, Number(item.quantity) + delta);
    if (newQty === Number(item.quantity)) return;

    try {
      setUpdatingItemId(item.itemId);
      setHasCustomerModified(true);
      await updatePortalQuotationItemApi(item.itemId, {
        quantity: newQty,
        appliedDiscountPct: Number(item.appliedDiscountPct || 0),
      });
      toast.success(`Quantity updated to ${newQty}. Proposal updated to Negotiating.`);
      if (id) await loadData(id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update item quantity.');
    } finally {
      setUpdatingItemId(null);
    }
  };

  // ----------------------------------------------------
  // Inline Item Removal
  // ----------------------------------------------------
  const handleRemoveItem = async (itemId: string, itemName: string) => {
    if (isConfirmed) return;
    if (!window.confirm(`Remove "${itemName}" from your proposal?`)) return;

    try {
      setRemovingItemId(itemId);
      setHasCustomerModified(true);
      await deletePortalQuotationItemApi(itemId);
      toast.info(`"${itemName}" removed from quotation. Proposal updated to Negotiating.`);
      if (id) await loadData(id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove item.');
    } finally {
      setRemovingItemId(null);
    }
  };

  // ----------------------------------------------------
  // Add Product from Catalog to Proposal
  // ----------------------------------------------------
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || isConfirmed) return;

    if (!selectedProductId) {
      toast.warning('Please select a product to add.');
      return;
    }

    const prod = catalog.find((p) => p.id === selectedProductId);
    if (!prod) {
      toast.error('Selected product not found in catalog.');
      return;
    }

    const disc = parseFloat(addDiscountPct) || 0;
    if (disc < 0 || disc > 100) {
      toast.warning('Discount percentage must be between 0% and 100%');
      return;
    }

    try {
      setAddingProduct(true);
      setHasCustomerModified(true);
      await addPortalQuotationItemApi(id, {
        productId: prod.id,
        lineType: (prod.itemType as any) || 'hardware',
        quantity: Math.max(1, addQuantity),
        appliedDiscountPct: disc,
      });

      toast.success(`Added "${prod.name}" to proposal! Status set to Negotiating.`);
      setIsAddProductOpen(false);
      setSelectedProductId('');
      setAddQuantity(1);
      setAddDiscountPct('0');
      await loadData(id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add product to quotation.');
    } finally {
      setAddingProduct(false);
    }
  };

  // ----------------------------------------------------
  // Submit General Negotiation Request
  // ----------------------------------------------------
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || isConfirmed) return;

    const finalComment = generalComment.trim() || 'Customer requested counter-offer terms.';

    try {
      setSubmittingNeg(true);
      await submitNegotiationMessageApi(
        id,
        {
          requestedDeliveryDate: requestedDate || undefined,
          comments: finalComment,
        },
        true
      );
      toast.success('Negotiation request submitted! Status updated to Negotiating across all dashboards.');
      setGeneralComment('');
      await loadData(id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit negotiation request.');
    } finally {
      setSubmittingNeg(false);
    }
  };

  // ----------------------------------------------------
  // Confirm Quotation (1-Click Digital Sign-off)
  // ----------------------------------------------------
  const handleConfirmQuotation = async () => {
    if (!id || isConfirmed) return;
    try {
      setConfirming(true);
      const res = await confirmCustomerQuotationApi(id);
      toast.success(res.message || 'Quotation confirmed successfully! Proceeding to fulfillment.');
      await loadData(id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm quotation.');
    } finally {
      setConfirming(false);
    }
  };

  const getStatusLabel = () => {
    if (isConfirmed) return 'Status: Confirmed';
    if (quotation?.status === 'under_negotiation') return 'Status: Under Negotiation';
    if (['pending_manager', 'pending_finance', 'pending'].includes(quotation?.status)) return 'Status: Pending Approval';
    return 'Status: Under Negotiation';
  };

  const items = quotation?.items || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              to="/portal/quotations"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>MY QUOTATIONS</span>
            </Link>
            <span className="text-neutral-400">/</span>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-[#111111] tracking-tight">
              Proposal Negotiation
            </h1>
          </div>
          <p className="text-xs font-mono text-neutral-500">
            Review your proposal, adjust discounts, add or remove items, and negotiate live.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-4 py-1.5 rounded-full font-mono text-xs font-bold tracking-wide shadow-sm border ${
              isConfirmed
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {getStatusLabel()}
          </span>

          <button
            onClick={() => id && loadData(id)}
            className="p-2.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-black hover:border-neutral-400 transition-colors cursor-pointer"
            title="Refresh Proposal"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="p-16 rounded-3xl border border-neutral-200 bg-white text-center space-y-3 font-mono shadow-sm">
          <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-[#ff3b30] animate-spin mx-auto" />
          <p className="text-xs text-neutral-500 tracking-widest uppercase">FETCHING PROPOSAL DETAILS...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && quotation && (
        <div className="space-y-8">
          {/* Overview Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">
                PROPOSAL NUMBER
              </span>
              <span className="font-mono font-bold text-lg text-[#ff3b30]">
                {quotation.quotationCode || id?.slice(0, 8).toUpperCase()}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">
                TOTAL CONTRACT VALUE
              </span>
              <span className="font-display font-black text-2xl text-neutral-900">
                ${Number(quotation.totalAmount || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-sm">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">
                PROMISED DELIVERY
              </span>
              <span className="font-mono font-bold text-sm text-neutral-800 flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-neutral-400" />
                {quotation.promisedDeliveryDate
                  ? new Date(quotation.promisedDeliveryDate).toLocaleDateString()
                  : 'Standard Schedule'}
              </span>
            </div>
          </div>

          {/* Proposed Line Items Section */}
          <div className="rounded-3xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-4 bg-neutral-50/70">
              <div>
                <h3 className="font-display font-bold text-base text-neutral-900 uppercase tracking-tight">
                  PROPOSED ITEMS & SERVICES
                </h3>
                <p className="text-[11px] font-mono text-neutral-500">
                  Directly adjust discount percentages, quantities, or add/remove products to negotiate your rate.
                </p>
              </div>

              {!isConfirmed && (
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#ff3b30] hover:bg-[#e0342a] text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ADD PRODUCT</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 uppercase text-[10px] tracking-widest bg-neutral-50">
                    <th className="py-3.5 px-6">PRODUCT / SERVICE</th>
                    <th className="py-3.5 px-4 text-right">LIST PRICE</th>
                    <th className="py-3.5 px-4 text-center">QTY</th>
                    <th className="py-3.5 px-4 text-center">COUNTER DISCOUNT %</th>
                    <th className="py-3.5 px-4 text-right">NET UNIT PRICE</th>
                    <th className="py-3.5 px-6 text-right">LINE TOTAL</th>
                    {!isConfirmed && <th className="py-3.5 px-4 text-center w-12">REMOVE</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-900">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-neutral-500 font-mono text-xs">
                        No products currently in this proposal. Click "+ ADD PRODUCT" to select from catalog.
                      </td>
                    </tr>
                  ) : (
                    items.map((item: any) => {
                      const isUpdating = updatingItemId === item.itemId;
                      const isRemoving = removingItemId === item.itemId;
                      const unitList = Number(item.unitListPrice || 0);
                      const currentDisc = parseFloat(editingDiscounts[item.itemId] ?? String(item.appliedDiscountPct || 0)) || 0;
                      const calculatedUnit = unitList * (1 - currentDisc / 100);
                      const lineTotal = calculatedUnit * Number(item.quantity || 1);

                      return (
                        <tr
                          key={item.itemId}
                          className="hover:bg-neutral-50/80 transition-colors group"
                        >
                          {/* Product Info */}
                          <td className="py-4 px-6 align-middle">
                            <div className="font-bold text-neutral-900 text-sm">
                              {item.productName || 'Service Line'}
                            </div>
                            {item.productDescription && (
                              <div className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                                {item.productDescription}
                              </div>
                            )}
                          </td>

                          {/* Unit List Price */}
                          <td className="py-4 px-4 text-right font-mono text-neutral-600 align-middle">
                            ${unitList.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Quantity Controls */}
                          <td className="py-4 px-4 text-center align-middle">
                            {isConfirmed ? (
                              <span className="font-bold text-neutral-900">{item.quantity}</span>
                            ) : (
                              <div className="inline-flex items-center border border-neutral-300 rounded-lg bg-neutral-50 overflow-hidden shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(item, -1)}
                                  disabled={isUpdating || Number(item.quantity) <= 1}
                                  className="px-2 py-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 transition-colors disabled:opacity-30 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-2.5 py-1 text-neutral-900 font-bold text-xs min-w-[24px] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(item, 1)}
                                  disabled={isUpdating}
                                  className="px-2 py-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 transition-colors disabled:opacity-30 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Editable Discount % */}
                          <td className="py-4 px-4 text-center align-middle">
                            {isConfirmed ? (
                              <span className="text-amber-700 font-bold">{item.appliedDiscountPct}%</span>
                            ) : (
                              <div className="inline-flex items-center relative w-24">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  disabled={isUpdating}
                                  value={editingDiscounts[item.itemId] ?? ''}
                                  onChange={(e) =>
                                    setEditingDiscounts((prev) => ({
                                      ...prev,
                                      [item.itemId]: e.target.value,
                                    }))
                                  }
                                  onBlur={() => handleDiscountBlur(item)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-neutral-300 text-neutral-900 font-mono text-xs text-center focus:border-[#ff3b30] focus:ring-1 focus:ring-[#ff3b30] focus:outline-none disabled:opacity-50"
                                  placeholder="0"
                                />
                                <span className="text-neutral-400 absolute right-2 text-xs pointer-events-none">
                                  %
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Calculated Unit Price */}
                          <td className="py-4 px-4 text-right font-mono text-neutral-700 align-middle">
                            ${calculatedUnit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Line Total */}
                          <td className="py-4 px-6 text-right font-bold text-neutral-900 text-sm align-middle">
                            ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Remove Button */}
                          {!isConfirmed && (
                            <td className="py-4 px-4 text-center align-middle">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.itemId, item.productName || 'product')}
                                disabled={isRemoving}
                                className="p-2 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-40"
                                title="Remove item from proposal"
                              >
                                <Trash2 className={`w-4 h-4 ${isRemoving ? 'animate-pulse' : ''}`} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Totals */}
            {items.length > 0 && (
              <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-4">
                <span className="text-xs font-mono text-neutral-500">
                  Changes to line discounts or quantities are automatically saved and immediately synchronize with all sales reps and managers.
                </span>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block">
                    FINAL TOTAL CONTRACT
                  </span>
                  <span className="font-display font-black text-xl text-neutral-900">
                    ${Number(quotation.totalAmount || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Add Product Modal / Drawer */}
          {isAddProductOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
              <div className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-[#ff3b30]">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <h3 className="font-display font-bold text-lg text-neutral-900 uppercase tracking-tight">
                      ADD PRODUCT TO PROPOSAL
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddProductOpen(false)}
                    className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddProductSubmit} className="space-y-5">
                  {/* Select Product from Database Catalog */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-neutral-600 uppercase tracking-wider">
                      Select Catalog Item
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-300 text-neutral-900 font-mono text-xs focus:border-[#ff3b30] focus:outline-none"
                    >
                      <option value="">-- Choose from Catalog --</option>
                      {catalog.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.name} ({prod.sku}) — ${Number(prod.basePrice).toFixed(2)} [{prod.itemType || 'item'}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Quantity */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-mono text-neutral-600 uppercase tracking-wider">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={addQuantity}
                        onChange={(e) => setAddQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-300 text-neutral-900 font-mono text-xs focus:border-[#ff3b30] focus:outline-none"
                      />
                    </div>

                    {/* Counter Discount % */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-mono text-neutral-600 uppercase tracking-wider">
                        Requested Discount %
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={addDiscountPct}
                          onChange={(e) => setAddDiscountPct(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-neutral-300 text-neutral-900 font-mono text-xs focus:border-[#ff3b30] focus:outline-none"
                          placeholder="0"
                        />
                        <Percent className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-3.5 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
                    <button
                      type="button"
                      onClick={() => setIsAddProductOpen(false)}
                      className="px-5 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 font-mono text-xs hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingProduct}
                      className="px-6 py-2.5 rounded-xl bg-[#ff3b30] hover:bg-[#e0342a] text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-40 shadow-sm"
                    >
                      {addingProduct ? 'Adding...' : 'Add to Proposal'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Negotiation Form: Delivery Date & Comments */}
          <form onSubmit={handleSubmitRequest} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-mono text-neutral-600 uppercase tracking-wider">
                  Target / Requested Delivery Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    disabled={isConfirmed}
                    value={requestedDate}
                    onChange={(e) => setRequestedDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-neutral-300 text-neutral-900 font-mono text-xs focus:border-[#ff3b30] focus:outline-none disabled:opacity-60 shadow-sm"
                  />
                  <Calendar className="w-4 h-4 text-neutral-400 absolute right-4 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono text-neutral-600 uppercase tracking-wider">
                  Counter-Proposal Notes / Justification
                </label>
                <input
                  type="text"
                  disabled={isConfirmed}
                  placeholder="e.g. Requesting revised terms for volume commitment..."
                  value={generalComment}
                  onChange={(e) => setGeneralComment(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-neutral-300 text-neutral-900 font-mono text-xs focus:border-[#ff3b30] focus:outline-none disabled:opacity-60 placeholder:text-neutral-400 shadow-sm"
                />
              </div>
            </div>

            {/* Action Buttons: Submit Request & Confirm Quotation */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {!isConfirmed && (
                <button
                  type="submit"
                  disabled={submittingNeg}
                  className="px-6 py-3 rounded-2xl bg-[#ff3b30] hover:bg-[#e0342a] text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-2 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingNeg ? 'Submitting...' : 'Send Request'}</span>
                </button>
              )}

              {/* Approve / Confirm is only available if original sent quotation is accepted directly without customer negotiation */}
              {!isConfirmed && quotation?.status !== 'under_negotiation' && !hasCustomerModified && (
                <button
                  type="button"
                  onClick={handleConfirmQuotation}
                  disabled={confirming}
                  className="px-7 py-3 rounded-2xl bg-[#10b981] hover:bg-emerald-600 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer disabled:opacity-40 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{confirming ? 'Confirming...' : 'Confirm Quotation'}</span>
                </button>
              )}

              {!isConfirmed && (quotation?.status === 'under_negotiation' || hasCustomerModified) && (
                <span className="text-xs font-mono text-amber-700 font-bold flex items-center gap-1.5 ml-auto">
                  <Clock className="w-4 h-4" />
                  <span>In Negotiation — Submit your request to send counter-terms to sales team</span>
                </span>
              )}

              {isConfirmed && (
                <span className="text-xs font-mono text-emerald-700 font-bold ml-auto flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Quotation Confirmed &amp; Settled</span>
                </span>
              )}
            </div>

            {/* Governance Alert Footer Banner */}
            <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 font-mono text-xs leading-relaxed flex items-start gap-3 shadow-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Discounts up to 5.00% can be approved directly by your Sales Representative. If negotiated discounts exceed 5.00%, the quote escalates to both the Sales Representative and Sales Manager for two-tier governance approval.
              </span>
            </div>
          </form>

          {/* Negotiation Thread / Discussion History */}
          {negotiations.length > 0 && (
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-200">
                <MessageSquare className="w-4 h-4 text-neutral-500" />
                <h3 className="font-display font-bold text-sm text-neutral-900 uppercase tracking-tight">
                  NEGOTIATION THREAD & HISTORY
                </h3>
              </div>

              <div className="space-y-3">
                {negotiations.map((n: any, idx: number) => {
                  const isCustomerAuthor = Boolean(n.author_portal_user_id || n.authorPortalUserId);
                  return (
                    <div
                      key={n.id || idx}
                      className={`p-4 rounded-2xl font-mono text-xs space-y-1.5 ${
                        isCustomerAuthor
                          ? 'bg-neutral-100 border border-neutral-200 text-neutral-900 ml-6'
                          : 'bg-rose-50 border border-rose-200 text-rose-950 mr-6'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-neutral-500">
                        <span className="font-bold">
                          {isCustomerAuthor ? 'Client Message' : 'Sales Team Message'}
                        </span>
                        <span>{new Date(n.created_at || n.createdAt || Date.now()).toLocaleString()}</span>
                      </div>
                      <p className="leading-relaxed">{n.comments}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
