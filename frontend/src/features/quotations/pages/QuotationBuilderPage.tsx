import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  fetchCustomersApi,
  createQuotationApi,
  fetchQuotationByIdApi,
  addItemToQuotationApi,
  deleteQuotationItemApi,
  fetchUpsellsApi,
  sendQuotationApi,
  submitQuotationForApprovalApi,
} from '../services/quotations.api';
import { fetchProductsApi } from '@/features/catalog/services/catalog.api';
import { StatusBadge } from '@/components/StatusBadge';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  Send,
  Building,
  Calendar,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'react-toastify';

export const QuotationBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data states
  const [quotation, setQuotation] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [upsells, setUpsells] = useState<any[]>([]);

  // Form states for quotation scope
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [priceList, setPriceList] = useState<string>('Standard Commercial 2026');
  const [deliveryDate, setDeliveryDate] = useState<string>('');

  // Form states for adding line item
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemDiscountPct, setItemDiscountPct] = useState<number>(0);
  const [itemNotes, setItemNotes] = useState<string>('');

  // UI states
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [sendingQuote, setSendingQuote] = useState<boolean>(false);

  // Load initial dropdowns
  useEffect(() => {
    Promise.all([fetchCustomersApi(), fetchProductsApi()])
      .then(([custData, prodData]) => {
        const custList = custData.customers || [];
        setCustomers(custList);
        if (custList.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(custList[0].id);
        }
        setProducts(prodData.products || []);
      })
      .catch((err) => {
        console.error('Initial data load error:', err);
      });
  }, []);

  // Load quotation if editing existing
  const loadQuotation = async (quoteId: string) => {
    try {
      setLoading(true);
      const data = await fetchQuotationByIdApi(quoteId);
      const q = data.quotation || data;
      setQuotation(q);
      if (q.customer_id) setSelectedCustomerId(q.customer_id);
      if (q.promised_delivery_date) {
        setDeliveryDate(new Date(q.promised_delivery_date).toISOString().slice(0, 10));
      }

      // Load upsell suggestions
      fetchUpsellsApi(quoteId)
        .then((uData) => setUpsells(uData.suggestions || []))
        .catch(() => setUpsells([]));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && id !== 'new') {
      loadQuotation(id);
    } else {
      setLoading(false);
    }
  }, [id]);

  // Selected customer metadata
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const customerTier = selectedCustomer?.tier || quotation?.customer_tier || 'Gold';
  const tierDiscountCeiling =
    selectedCustomer?.tier_ceiling_pct ||
    (customerTier === 'Platinum' ? 20 : customerTier === 'Gold' ? 15 : customerTier === 'Silver' ? 10 : 5);

  // Selected product metadata for add item form
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Check if locked in Confirmed/Approved state
  const isConfirmed = quotation?.status === 'confirmed' || quotation?.status === 'approved';

  // Save Draft action (Bottom Button 1)
  const handleSaveDraft = async () => {
    if (isConfirmed) {
      toast.info('Confirmed quotation cannot be modified.');
      return;
    }

    if (!quotation) {
      if (!selectedCustomerId) {
        toast.error('Please select a customer first.');
        return;
      }
      try {
        setSubmitting(true);
        const payload = {
          customerId: selectedCustomerId,
          promisedDeliveryDate: deliveryDate || undefined,
          status: 'draft',
        };
        const res = await createQuotationApi(payload);
        toast.success('Quotation draft saved successfully!');
        navigate('/quotations');
      } catch (err: any) {
        toast.error(err.message || 'Failed to save quotation draft.');
      } finally {
        setSubmitting(false);
      }
    } else {
      toast.success('Quotation draft saved successfully!');
      navigate('/quotations');
    }
  };

  // Submit for Approval action (Bottom Button 2)
  const handleSubmitForApproval = async () => {
    if (isConfirmed) {
      toast.info('Confirmed quotation cannot be modified.');
      return;
    }

    if (!quotation) {
      if (!selectedCustomerId) {
        toast.error('Please select a customer first.');
        return;
      }
      try {
        setSubmitting(true);
        const payload = {
          customerId: selectedCustomerId,
          promisedDeliveryDate: deliveryDate || undefined,
          status: 'pending_manager',
        };
        await createQuotationApi(payload);
        toast.success('Quotation submitted for approval! Visible in Approvals and Customer Portal.');
        navigate('/quotations');
      } catch (err: any) {
        toast.error(err.message || 'Failed to submit quotation for approval.');
      } finally {
        setSubmitting(false);
      }
    } else {
      try {
        setSubmitting(true);
        await submitQuotationForApprovalApi(quotation.id);
        toast.success('Quotation submitted for approval! Status updated to Pending Approval.');
        navigate('/quotations');
      } catch (err: any) {
        toast.error(err.message || 'Failed to submit for approval.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Add line item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfirmed) {
      toast.error('Confirmed quotation cannot be modified.');
      return;
    }

    if (!selectedProductId) {
      toast.error('Please select a product.');
      return;
    }

    // Auto create quotation draft first if still on /quotations/new
    let currentQuoteId = quotation?.id;
    if (!currentQuoteId) {
      if (!selectedCustomerId) {
        toast.error('Please select a customer first.');
        return;
      }
      try {
        setSubmitting(true);
        const res = await createQuotationApi({
          customerId: selectedCustomerId,
          promisedDeliveryDate: deliveryDate || undefined,
          status: 'draft',
        });
        currentQuoteId = res.quotation.id;
        navigate(`/quotations/${currentQuoteId}/edit`, { replace: true });
      } catch (err: any) {
        toast.error(err.message || 'Failed to initialize draft.');
        setSubmitting(false);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        productId: selectedProductId,
        lineType: (selectedProduct?.item_type as any) || 'hardware',
        quantity: Number(itemQty),
        appliedDiscountPct: Number(itemDiscountPct) || 0,
        lineNotes: itemNotes || undefined,
      };

      await addItemToQuotationApi(currentQuoteId, payload);
      toast.success('Line item added! Real-time limits & risk re-calculated.');
      // Reset form
      setSelectedProductId('');
      setItemQty(1);
      setItemDiscountPct(0);
      setItemNotes('');
      // Reload quote
      loadQuotation(currentQuoteId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add item.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete line item
  const handleDeleteItem = async (itemId: string) => {
    if (isConfirmed) return;
    if (!quotation?.id) return;
    try {
      await deleteQuotationItemApi(itemId);
      toast.info('Item removed from quotation.');
      loadQuotation(quotation.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove item.');
    }
  };

  // Add upsell recommendation directly
  const handleAddUpsell = async (upsell: any) => {
    if (isConfirmed) return;
    let targetQuoteId = quotation?.id;

    if (!targetQuoteId) {
      if (!selectedCustomerId) {
        toast.error('Please select a customer first.');
        return;
      }
      try {
        const res = await createQuotationApi({
          customerId: selectedCustomerId,
          promisedDeliveryDate: deliveryDate || undefined,
          status: 'draft',
        });
        targetQuoteId = res.quotation.id;
        navigate(`/quotations/${targetQuoteId}/edit`, { replace: true });
      } catch (err: any) {
        toast.error('Failed to initialize quotation.');
        return;
      }
    }

    try {
      const payload = {
        productId: upsell.suggested_product_id || products[0]?.id,
        lineType: upsell.item_type || 'service',
        quantity: 1,
        appliedDiscountPct: 0,
        lineNotes: 'Added via Upsell Engine Recommendation',
      };
      await addItemToQuotationApi(targetQuoteId, payload);
      toast.success(`Upsell item '${upsell.suggested_product_name || 'Upsell'}' added!`);
      loadQuotation(targetQuoteId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add upsell item.');
    }
  };

  // Send to Customer Portal
  const handleSendToCustomer = async () => {
    if (!quotation?.id) return;
    try {
      setSendingQuote(true);
      await sendQuotationApi(quotation.id);
      toast.success('Quotation sent to Customer Portal! Customer can now review & negotiate.');
      loadQuotation(quotation.id);
    } catch (err: any) {
      toast.error(err.message || 'Could not send quotation.');
    } finally {
      setSendingQuote(false);
    }
  };

  // Only show products that actually exist in the database!
  const existingProductIds = quotation?.items?.map((item: any) => item.product_id) || [];
  const dbCandidateProducts = products.filter(
    (p: any) => !existingProductIds.includes(p.id)
  );

  const displayUpsells = (
    upsells.length > 0
      ? upsells
      : dbCandidateProducts.slice(0, 3)
  ).map((p: any) => ({
    suggested_product_id: p.suggested_product_id || p.id,
    suggested_product_name: p.suggested_product_name || p.name,
    item_type: p.item_type || 'hardware',
    suggested_price: p.suggested_price || p.base_price,
    margin_text: `Base Price: $${Number(p.suggested_price || p.base_price || 0).toLocaleString()}`,
    promo_text: p.is_promoted ? 'Promoted' : null,
  }));

  const clientName =
    quotation?.customer_company_name || selectedCustomer?.company_name || 'Acme Corp';
  const quoteDisplayCode = quotation?.quotation_code || 'Q-1042';

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* Header & Subheading (Matching Screenshot 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              to="/quotations"
              className="inline-flex items-center gap-1 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>PIPELINE</span>
            </Link>
            <span className="text-neutral-600">/</span>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
              Quotation Detail: {quoteDisplayCode} ({clientName})
            </h1>
          </div>
          <p className="text-xs font-mono text-neutral-400">
            Opened by clicking a row on the Quotations list. Add products, apply discounts, review upsells.
          </p>
        </div>

        {quotation && (
          <div className="flex items-center gap-3">
            <StatusBadge status={quotation.status} />
            {isConfirmed && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
                <Lock className="w-3.5 h-3.5" />
                READ ONLY
              </span>
            )}
            {!isConfirmed && ['draft', 'approved'].includes(quotation.status) && (
              <button
                onClick={handleSendToCustomer}
                disabled={sendingQuote}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-mono text-xs font-bold uppercase tracking-wider hover:opacity-95 disabled:opacity-50 transition-all shadow-lg"
              >
                <Send className="w-3 h-3" />
                <span>{sendingQuote ? 'SENDING...' : 'SEND TO PORTAL'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div className="p-16 rounded-3xl border border-neutral-800 bg-[#09090b] text-center space-y-3 font-mono">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-[#3b82f6] animate-spin mx-auto" />
          <p className="text-xs text-neutral-400 tracking-widest uppercase">LOADING QUOTATION DETAIL...</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-8">
          {/* Inputs Row: Customer & Price List (Screenshot 1) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-mono text-neutral-400 uppercase tracking-wider">
                Customer
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                disabled={isConfirmed || !!quotation}
                className="w-full px-4 py-3 rounded-2xl bg-[#09090b] border border-neutral-800 text-white font-mono text-sm focus:border-[#3b82f6] focus:outline-none disabled:opacity-60"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.tier || 'Gold'} Tier)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-neutral-400 uppercase tracking-wider">
                Price List
              </label>
              <input
                type="text"
                value={priceList}
                onChange={(e) => setPriceList(e.target.value)}
                disabled={isConfirmed}
                placeholder="e.g. Standard Commercial 2026"
                className="w-full px-4 py-3 rounded-2xl bg-[#09090b] border border-neutral-800 text-white font-mono text-sm focus:border-[#3b82f6] focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>

          {/* Line Items Table (Screenshot 1) */}
          <div className="rounded-3xl border border-neutral-800 bg-[#09090b] p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-300">
                Configured Line Items ({quotation?.items?.length || 0})
              </span>
              {isConfirmed && (
                <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  CONFIRMED CONTRACT - LOCKED
                </span>
              )}
            </div>

            {quotation?.items && quotation.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 uppercase text-[11px] tracking-wider">
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Qty</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Discount</th>
                      <th className="py-3 px-4">Limit</th>
                      <th className="py-3 px-4">Status</th>
                      {!isConfirmed && <th className="py-3 px-4 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {quotation.items.map((item: any) => {
                      const discount = Number(item.applied_discount_pct || 0);
                      const limit =
                        item.line_type === 'service'
                          ? 10
                          : item.line_type === 'software'
                          ? 12
                          : 15;
                      const isOver = discount > limit;
                      const overPoints = (discount - limit).toFixed(0);

                      return (
                        <tr key={item.id} className="hover:bg-neutral-900/30 transition-colors">
                          <td className="py-4 px-4 font-bold text-white">
                            {item.product_name || 'Product'}
                          </td>
                          <td className="py-4 px-4 text-neutral-300">{item.quantity}</td>
                          <td className="py-4 px-4 text-white font-bold">
                            ${Number(item.unit_list_price).toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                            })}
                          </td>
                          <td className="py-4 px-4 font-bold text-neutral-200">{discount}%</td>
                          <td className="py-4 px-4 text-neutral-400 font-bold">{limit}%</td>
                          <td className="py-4 px-4">
                            {isOver ? (
                              <span className="font-bold text-amber-400">
                                OVER (+{overPoints}pt)
                              </span>
                            ) : (
                              <span className="font-bold text-emerald-400">OK</span>
                            )}
                          </td>
                          {!isConfirmed && (
                            <td className="py-4 px-4 text-right">
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                title="Remove item"
                                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 border border-neutral-800 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed border-neutral-800 rounded-2xl">
                <p className="text-xs font-mono text-neutral-400 uppercase">NO PRODUCTS ADDED YET</p>
                <p className="text-[11px] font-mono text-neutral-500 mt-1">
                  Select a product below to add it to this quotation.
                </p>
              </div>
            )}

            {/* Info box under table (Screenshot 1) */}
            <div className="p-3.5 rounded-2xl border border-neutral-800 bg-neutral-950/80 text-amber-300/90 font-mono text-xs">
              Discount is checked against each line's own limit live, as soon as it is entered, not only at submit time.
            </div>
          </div>

          {/* Add Product Form (if not confirmed) */}
          {!isConfirmed && (
            <div className="rounded-3xl border border-neutral-800 bg-[#09090b] p-6 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-mono font-bold tracking-widest text-[#3b82f6] uppercase">
                <Plus className="w-3 h-3" />
                ADD PRODUCT OR SERVICE TO QUOTATION
              </div>

              <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                    Product / Service *
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-800 text-white font-mono text-xs focus:border-[#3b82f6] focus:outline-none"
                  >
                    <option value="">-- Select Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (${Number(p.base_price).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={itemQty}
                    onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-800 text-white font-mono text-xs focus:border-[#3b82f6] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                    Discount %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={itemDiscountPct}
                    onChange={(e) => setItemDiscountPct(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-800 text-white font-mono text-xs focus:border-[#3b82f6] focus:outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-xl bg-[#3b82f6] hover:bg-blue-600 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Adding...' : '+ Add Line'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Upsell and Cross-Sell Suggestions (Screenshot 1) */}
          <div className="space-y-3">
            <h3 className="font-mono text-sm font-bold text-cyan-400 tracking-wide">
              Upsell and Cross-Sell Suggestions
            </h3>

            {displayUpsells.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {displayUpsells.map((rec: any, idx: number) => {
                  const title = rec.suggested_product_name || rec.name || 'Catalog Item';
                  return (
                    <div
                      key={rec.suggested_product_id || idx}
                      onClick={() => !isConfirmed && handleAddUpsell(rec)}
                      className={`p-5 rounded-2xl border border-neutral-800 bg-[#09090b] space-y-2 transition-all ${
                        isConfirmed
                          ? 'opacity-60 cursor-not-allowed'
                          : 'hover:border-cyan-500/50 hover:bg-neutral-900/60 cursor-pointer'
                      }`}
                    >
                      <div className="font-mono text-sm font-bold text-white">+ {title}</div>
                      <div className="font-mono text-xs text-neutral-400">
                        {rec.promo_text ? rec.promo_text : rec.margin_text}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-dashed border-neutral-800 bg-[#09090b] font-mono text-xs text-neutral-500">
                All database catalog products have already been added to this quotation.
              </div>
            )}
          </div>

          {/* Bottom Action Buttons (Screenshot 1: Save Draft, Submit for Approval) */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={submitting || isConfirmed}
              className="px-6 py-3 rounded-2xl bg-[#09090b] hover:bg-neutral-800 text-white border border-neutral-700 font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-40"
            >
              Save Draft
            </button>

            <button
              type="button"
              onClick={handleSubmitForApproval}
              disabled={submitting || isConfirmed}
              className="px-7 py-3 rounded-2xl bg-[#3b82f6] hover:bg-blue-600 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-40"
            >
              {submitting ? 'Submitting...' : 'Submit for Approval'}
            </button>

            {quotation && (
              <div className="ml-auto font-mono text-sm text-neutral-400">
                Total Deal: <strong className="text-white text-base">${Number(quotation.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
