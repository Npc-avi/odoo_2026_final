import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  updateQuotationApi,
} from '../services/quotations.api';
import { fetchProductsApi } from '@/features/catalog/services/catalog.api';
import { StatusBadge } from '@/components/StatusBadge';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Send,
  Lock,
  Clock,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Layers,
  X,
} from 'lucide-react';
import { useSocket } from '@/context/socket.context';
import { toast } from 'react-toastify';
import { useThrottledCallback } from '@/hooks/useThrottle';

// Performance Optimization: Memoize individual line item rows to prevent re-rendering when typing in form
const QuotationLineRow = React.memo<{
  item: any;
  isReadOnly: boolean;
  onDeleteItem: (id: string) => void;
}>(({ item, isReadOnly, onDeleteItem }) => {
  const discount = Number(item.applied_discount_pct || 0);
  const limit = item.line_type === 'service' ? 10 : item.line_type === 'software' ? 12 : 15;
  const isOver = discount > limit;
  const overPoints = (discount - limit).toFixed(0);

  return (
    <tr className="hover:bg-neutral-50/60 transition-colors">
      <td className="py-4 px-4 font-bold text-neutral-900">
        {item.product_name || 'Product'}
        {item.product_sku && (
          <span className="block text-[10px] text-neutral-400 font-normal">
            {item.product_sku}
          </span>
        )}
      </td>
      <td className="py-4 px-4 text-center font-semibold text-neutral-700">{item.quantity}</td>
      <td className="py-4 px-4 text-right font-bold text-neutral-900">
        ₹{Number(item.unit_list_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </td>
      <td className="py-4 px-4 text-center font-bold text-neutral-900">{discount}%</td>
      <td className="py-4 px-4 text-center text-neutral-500 font-medium">{limit}%</td>
      <td className="py-4 px-4 text-center">
        {isOver ? (
          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-[#ff3b30] border border-rose-200 text-[10px] font-bold">
            OVER (+{overPoints}pt)
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
            OK
          </span>
        )}
      </td>
      {!isReadOnly && (
        <td className="py-4 px-4 text-right">
          <button
            onClick={() => onDeleteItem(item.id)}
            title="Remove item"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      )}
    </tr>
  );
});

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
  const [deliveryDate, setDeliveryDate] = useState<string>('2026-09-06');

  // Form states for adding line item
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQty, setItemQty] = useState<string>('1');
  const [itemDiscountPct, setItemDiscountPct] = useState<string>('0');
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

  const { socket, joinQuote, leaveQuote } = useSocket();

  useEffect(() => {
    if (id && id !== 'new') {
      loadQuotation(id);
      joinQuote(id);
    } else {
      setLoading(false);
    }
    return () => {
      if (id && id !== 'new') {
        leaveQuote(id);
      }
    };
  }, [id, joinQuote, leaveQuote]);

  // Real-time socket updates
  useEffect(() => {
    if (!socket || !id || id === 'new') return;

    const handleRealtimeChange = (data: any) => {
      if (!data?.quoteId || data?.quoteId === id) {
        console.log('[Socket.IO QuotationBuilder] Live change:', data);
        loadQuotation(id);
      }
    };

    socket.on('quotation:updated', handleRealtimeChange);
    socket.on('quotation:item_added', handleRealtimeChange);
    socket.on('quotation:item_deleted', handleRealtimeChange);
    socket.on('approval:updated', handleRealtimeChange);

    return () => {
      socket.off('quotation:updated', handleRealtimeChange);
      socket.off('quotation:item_added', handleRealtimeChange);
      socket.off('quotation:item_deleted', handleRealtimeChange);
      socket.off('approval:updated', handleRealtimeChange);
    };
  }, [socket, id]);

  const selectedCustomer =
    customers.find((c) => c.id === selectedCustomerId) ||
    (quotation ? { company_name: quotation.customer_company_name, tier: 'Bronze' } : null);

  // Selected product metadata for add item form
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Status flags
  const isInFulfillment = quotation?.status === 'in_fulfillment' || quotation?.status === 'fulfillment';
  const isConfirmed = quotation?.status === 'confirmed' || quotation?.status === 'approved';
  const isPendingApproval =
    quotation?.status === 'pending_manager' ||
    quotation?.status === 'pending_finance' ||
    quotation?.status === 'pending' ||
    quotation?.status === 'under_review';
  const isUnderNegotiation = quotation?.status === 'under_negotiation' || quotation?.status === 'sent';
  const isReadOnly = isInFulfillment || isConfirmed || isPendingApproval || isUnderNegotiation;

  // Save Draft action
  const handleSaveDraft = async () => {
    if (isInFulfillment) {
      toast.info('Quotation is in fulfillment and cannot be modified.');
      return;
    }
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
        await createQuotationApi(payload);
        toast.success('Quotation draft saved successfully!');
        navigate('/quotations');
      } catch (err: any) {
        toast.error(err.message || 'Failed to save quotation draft.');
      } finally {
        setSubmitting(false);
      }
    } else {
      try {
        setSubmitting(true);
        await updateQuotationApi(quotation.id, {
          customerId: selectedCustomerId,
          promisedDeliveryDate: deliveryDate || undefined,
        });
        toast.success('Quotation draft saved successfully!');
        navigate('/quotations');
      } catch (err: any) {
        toast.error(err.message || 'Failed to update quotation draft.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Customer dropdown change handler (editable while in draft)
  const handleCustomerChange = async (newCustomerId: string) => {
    setSelectedCustomerId(newCustomerId);
    if (quotation && quotation.status === 'draft') {
      try {
        await updateQuotationApi(quotation.id, { customerId: newCustomerId });
        toast.success('Customer updated for draft quotation.');
        loadQuotation(quotation.id);
      } catch (err: any) {
        toast.error(err.message || 'Failed to update customer.');
      }
    }
  };

  // Submit for Approval action (Performance: Throttled against rapid double-clicks)
  const handleSubmitForApproval = useThrottledCallback(async () => {
    if (isInFulfillment) {
      toast.info('Quotation is in fulfillment and cannot be modified.');
      return;
    }
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
  }, 1000);

  // Add line item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInFulfillment) {
      toast.error('Quotation is in fulfillment and cannot be modified.');
      return;
    }
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
      const parsedQty = Math.max(1, parseInt(itemQty, 10) || 1);
      const parsedDiscount = Math.max(0, Math.min(100, parseFloat(itemDiscountPct) || 0));

      const payload = {
        productId: selectedProductId,
        lineType: (selectedProduct?.item_type as any) || 'hardware',
        quantity: parsedQty,
        appliedDiscountPct: parsedDiscount,
        lineNotes: itemNotes || undefined,
      };

      await addItemToQuotationApi(currentQuoteId, payload);
      toast.success('Line item added! Real-time limits & risk re-calculated.');
      // Reset form
      setSelectedProductId('');
      setItemQty('1');
      setItemDiscountPct('0');
      setItemNotes('');
      // Reload quote
      loadQuotation(currentQuoteId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add item.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete line item (Performance: Memoized callback for QuotationLineRow)
  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (isInFulfillment || isConfirmed) return;
    if (!quotation?.id) return;
    try {
      await deleteQuotationItemApi(itemId);
      toast.info('Item removed from quotation.');
      loadQuotation(quotation.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove item.');
    }
  }, [isInFulfillment, isConfirmed, quotation?.id, loadQuotation]);

  // Add upsell recommendation directly
  const handleAddUpsell = async (upsell: any) => {
    if (isInFulfillment || isConfirmed) return;
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

  // Send to Customer Portal (Performance: Throttled against double-clicks)
  const handleSendToCustomer = useThrottledCallback(async () => {
    if (isInFulfillment || isConfirmed) return;
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
  }, 1000);

  // Performance Optimization: Memoize complex aggregation calculations
  const totalAmount = Number(quotation?.total_amount || 0);
  const subtotalAmount = Number(quotation?.subtotal_amount || totalAmount);
  const items = quotation?.items || [];

  const totalCost = useMemo(() => {
    return items.reduce(
      (acc: number, it: any) => acc + Number(it.unit_cost_price || it.unit_cost || 0) * Number(it.quantity || 1),
      0
    );
  }, [items]);

  const grossProfit = useMemo(() => Math.max(0, totalAmount - totalCost), [totalAmount, totalCost]);
  const liveMarginPct = useMemo(() => (totalAmount > 0 ? ((grossProfit / totalAmount) * 100).toFixed(1) : '0.0'), [grossProfit, totalAmount]);

  const riskScore = Math.round(Number(quotation?.blended_risk_score || 0));
  const clientTier = selectedCustomer?.tier || 'Bronze';
  const tierCeiling = useMemo(() => {
    return clientTier === 'Platinum'
      ? '20.00%'
      : clientTier === 'Gold'
      ? '15.00%'
      : clientTier === 'Silver'
      ? '10.00%'
      : '5.00%';
  }, [clientTier]);

  // Only show products that actually exist in the database for upsells (Memoized)
  const displayUpsells = useMemo(() => {
    const existingProductIds = items.map((item: any) => item.product_id);
    const dbCandidateProducts = products.filter((p: any) => !existingProductIds.includes(p.id));
    return (upsells.length > 0 ? upsells : dbCandidateProducts.slice(0, 4)).map((p: any) => ({
      suggested_product_id: p.suggested_product_id || p.id,
      suggested_product_name: p.suggested_product_name || p.name,
      item_type: p.item_type || 'hardware',
      suggested_price: p.suggested_price || p.base_price,
      promo_text: p.is_promoted ? 'PROMOTED' : 'CO-PURCHASE',
    }));
  }, [items, products, upsells]);

  const clientName = quotation?.customer_company_name || selectedCustomer?.company_name || 'Initech Corporation';
  const quoteDisplayCode = quotation?.quotation_code || (id && id !== 'new' ? `QT-${id.slice(0, 8)}` : 'QT-undefined');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 text-neutral-900">
      {/* ---------------------------------------------------- */}
      {/* HEADER & BREADCRUMB (Matching Screenshot 1)          */}
      {/* ---------------------------------------------------- */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link
              to="/quotations"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-neutral-500 hover:text-black transition-colors uppercase tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>PIPELINE</span>
            </Link>
            <span className="text-neutral-400 font-mono">/</span>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-neutral-900 tracking-tight">
              Quotation Builder: {quoteDisplayCode} ({clientName})
            </h1>
          </div>

          {quotation && (
            <div className="flex items-center gap-2.5">
              <StatusBadge status={quotation.status} />
              {isInFulfillment && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-300 text-purple-700 font-mono text-xs font-bold">
                  <Lock className="w-3.5 h-3.5" />
                  IN FULFILLMENT (LOCKED)
                </span>
              )}
              {isConfirmed && !isInFulfillment && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 font-mono text-xs font-bold">
                  <Lock className="w-3.5 h-3.5" />
                  LOCKED
                </span>
              )}
              {isPendingApproval && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-700 font-mono text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  PENDING APPROVAL
                </span>
              )}
              {!isInFulfillment && !isConfirmed && !isPendingApproval && ['draft', 'approved'].includes(quotation.status) && (
                <button
                  onClick={handleSendToCustomer}
                  disabled={sendingQuote}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all shadow-sm cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>{sendingQuote ? 'SENDING...' : 'SEND TO PORTAL'}</span>
                </button>
              )}
            </div>
          )}
        </div>
        <p className="text-xs font-mono text-neutral-500">
          Enforces discount discipline, live upsells, blended risk scoring, and automated approval routing.
        </p>
      </div>

      {loading && (
        <div className="p-16 rounded-3xl border border-neutral-200 bg-white text-center space-y-3 font-mono shadow-sm">
          <div className="w-8 h-8 rounded-full border-2 border-neutral-300 border-t-[#ff3b30] animate-spin mx-auto" />
          <p className="text-xs text-neutral-500 tracking-widest uppercase">INITIALIZING QUOTATION ENGINE...</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          {/* ---------------------------------------------------- */}
          {/* 1. TOP 4 METRICS CARDS ROW (Screenshot 1)            */}
          {/* ---------------------------------------------------- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: CONTRACT VALUE */}
            <div className="p-6 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-1">
              <span className="block text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                CONTRACT VALUE
              </span>
              <div className="font-display font-black text-3xl text-neutral-900 tracking-tight">
                ₹{totalAmount.toFixed(2)}
              </div>
              <p className="text-xs font-mono text-neutral-400">Subtotal: ₹{subtotalAmount.toFixed(2)}</p>
            </div>

            {/* Card 2: LIVE MARGIN */}
            <div className="p-6 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-1">
              <span className="block text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                LIVE MARGIN
              </span>
              <div className="font-display font-black text-3xl text-[#ff3b30] tracking-tight">
                {liveMarginPct}%
              </div>
              <p className="text-xs font-mono text-neutral-400">Gross Profit: ₹{grossProfit.toFixed(2)}</p>
            </div>

            {/* Card 3: BLENDED RISK SCORE (Mint Green Border/Tint) */}
            <div className="p-6 rounded-3xl bg-[#f0fdf4]/80 border border-emerald-300 shadow-sm space-y-1 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="block text-[11px] font-mono font-bold text-neutral-500 uppercase tracking-wider">
                  BLENDED RISK SCORE
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="font-display font-black text-3xl text-neutral-900 tracking-tight flex items-baseline gap-1">
                <span>{riskScore}</span>
                <span className="text-sm font-mono text-neutral-400 font-normal">/100</span>
              </div>
              <p className="text-xs font-mono text-emerald-700 font-semibold">
                {riskScore === 0 ? 'Zero Violations (Self-Governed)' : 'Ceilings Breached (Requires Approval)'}
              </p>
            </div>

            {/* Card 4: CLIENT TIER & CEILING */}
            <div className="p-6 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-1">
              <span className="block text-[11px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                CLIENT TIER & CEILING
              </span>
              <div className="font-display font-black text-2xl sm:text-3xl text-neutral-900 tracking-tight">
                {clientTier} Tier
              </div>
              <p className="text-xs font-mono text-neutral-400">Standard Ceiling: {tierCeiling}</p>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* 2. QUOTATION SCOPE INPUTS (Screenshot 1)             */}
          {/* ---------------------------------------------------- */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-neutral-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Customer */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono font-bold text-neutral-500 uppercase tracking-wider">
                  CUSTOMER ACCOUNT *
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  disabled={isReadOnly || (!!quotation && quotation.status !== 'draft')}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#fcfcfc] border border-neutral-200 text-neutral-900 font-mono text-xs focus:border-neutral-400 focus:outline-none disabled:opacity-60 shadow-xs cursor-pointer"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} ({c.tier || 'Bronze'} Tier - {c.tier_ceiling_pct || 10}% max)
                    </option>
                  ))}
                </select>
              </div>

              {/* Price List Schedule */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono font-bold text-neutral-500 uppercase tracking-wider">
                  PRICE LIST SCHEDULE
                </label>
                <input
                  type="text"
                  value={priceList}
                  onChange={(e) => setPriceList(e.target.value)}
                  disabled={isReadOnly}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#fcfcfc] border border-neutral-200 text-neutral-900 font-mono text-xs focus:border-neutral-400 focus:outline-none disabled:opacity-60 shadow-xs"
                />
              </div>

              {/* Promised Delivery Date */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono font-bold text-neutral-500 uppercase tracking-wider">
                  PROMISED DELIVERY DATE
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  disabled={isReadOnly}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#fcfcfc] border border-neutral-200 text-neutral-900 font-mono text-xs focus:border-neutral-400 focus:outline-none disabled:opacity-60 shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Fulfillment Locked Banner */}
          {isInFulfillment && (
            <div className="p-4 sm:p-5 rounded-3xl bg-purple-50 border border-purple-200 text-purple-950 font-mono text-xs flex items-center gap-3.5 shadow-xs">
              <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-300 flex items-center justify-center shrink-0 text-purple-700">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="font-bold uppercase tracking-wider text-purple-900">Quotation In Fulfillment (Read-Only)</div>
                <div className="text-purple-700/90 text-[11px] leading-relaxed">
                  This quotation is currently being fulfilled by the warehouse and logistics pipeline. Line items, quantities, discounts, and customer terms are locked and cannot be updated.
                </div>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* 3. CONFIGURED QUOTATION LINES (Screenshot 1)         */}
          {/* ---------------------------------------------------- */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-6">
            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-neutral-700">
                <Layers className="w-4 h-4 text-[#ff3b30]" />
                <span>CONFIGURED QUOTATION LINES ({items.length})</span>
              </div>

              {riskScore === 0 ? (
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>ALL LINES WITHIN GOVERNANCE CEILINGS</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#ff3b30]">
                  <AlertTriangle className="w-4 h-4 text-[#ff3b30]" />
                  <span>CEILINGS BREACHED - APPROVAL REQUIRED</span>
                </div>
              )}
            </div>

            {/* Lines List / Empty State */}
            {items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-400 uppercase text-[10px] tracking-wider bg-neutral-50/70">
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Price</th>
                      <th className="py-3 px-4 text-center">Discount</th>
                      <th className="py-3 px-4 text-center">Limit</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      {!isReadOnly && <th className="py-3 px-4 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
                    {items.map((item: any) => (
                      <QuotationLineRow
                        key={item.id}
                        item={item}
                        isReadOnly={isReadOnly}
                        onDeleteItem={handleDeleteItem}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 rounded-2xl bg-[#f9fafb] border border-neutral-200/80 text-center space-y-1 font-mono">
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  NO PRODUCTS CONFIGURED YET
                </p>
                <p className="text-[11px] text-neutral-400">
                  Add a product from the catalog below to begin building this quotation.
                </p>
              </div>
            )}

            {/* Governance Info Banner (Screenshot 1) */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-amber-900 font-mono text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>BLENDED DISCOUNT GOVERNANCE RULE (Section 10 & 12)</span>
              </div>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                Even if a customer is Gold Tier (5.00% max), strict category ceilings apply (e.g. Services max 10%). The
                system checks every line against its category ceiling in real-time, computes the blended risk score across
                the order, and automatically routes to Manager or Finance if ceilings are breached.
              </p>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* 4. ADD PRODUCT OR SERVICE TO QUOTATION (Screenshot 2)*/}
          {/* ---------------------------------------------------- */}
          {!isReadOnly && (
            <div className="p-6 sm:p-7 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-[#ff3b30] font-mono text-[10px] font-bold tracking-wider uppercase">
                <Plus className="w-3 h-3" />
                <span>ADD PRODUCT OR SERVICE TO QUOTATION</span>
              </div>

              <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-[11px] font-mono font-bold text-neutral-500 uppercase tracking-wider">
                    PRODUCT / SERVICE *
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#fcfcfc] border border-neutral-200 text-neutral-900 font-mono text-xs focus:border-neutral-400 focus:outline-none cursor-pointer shadow-xs"
                  >
                    <option value="">-- Select Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{Number(p.base_price).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono font-bold text-neutral-500 uppercase tracking-wider">
                    QUANTITY *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#fcfcfc] border border-neutral-200 text-neutral-900 font-mono text-xs text-center focus:border-neutral-400 focus:outline-none shadow-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono font-bold text-neutral-500 uppercase tracking-wider">
                    APPLIED DISCOUNT %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={itemDiscountPct}
                    onChange={(e) => setItemDiscountPct(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#fcfcfc] border border-neutral-200 text-neutral-900 font-mono text-xs text-center focus:border-neutral-400 focus:outline-none shadow-xs"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 rounded-2xl bg-[#ff3b30] hover:bg-[#e03126] text-white font-mono text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    {submitting ? 'Adding...' : '+ ADD ITEM'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* 5. LIVE UPSELL & CROSS-SELL (Screenshot 2)           */}
          {/* ---------------------------------------------------- */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-[#06b6d4] font-mono text-[10px] font-bold tracking-wider uppercase">
                <span>SECTION B5 // LIVE UPSELL & CROSS-SELL RECOMMENDATIONS</span>
              </div>
              <span className="text-[11px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
                HISTORICAL CO-PURCHASE INTELLIGENCE
              </span>
            </div>

            {/* 4 Cards in a row */}
            {displayUpsells.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {displayUpsells.map((rec: any, idx: number) => {
                  const title = rec.suggested_product_name || 'Recommended Module';
                  const price = Number(rec.suggested_price || 95).toLocaleString();
                  const isPromoted = rec.promo_text === 'PROMOTED';

                  return (
                    <div
                      key={rec.suggested_product_id || idx}
                      className="p-4 rounded-2xl border border-neutral-200 bg-[#fafafa] hover:bg-white hover:border-neutral-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                              isPromoted
                                ? 'bg-cyan-100 text-cyan-800'
                                : 'bg-neutral-200 text-neutral-700'
                            }`}
                          >
                            {rec.promo_text}
                          </span>
                          <span className="text-neutral-400 text-xs">
                            <X className="w-3 h-3" />
                          </span>
                        </div>
                        <h4 className="font-display font-bold text-xs text-neutral-900 leading-snug line-clamp-2">
                          {title}
                        </h4>
                        <p className="text-[11px] font-mono font-bold text-emerald-600">+2.1% Margin Delta</p>
                        <p className="text-xs font-mono text-neutral-500 font-semibold">₹{price} Base</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => !isReadOnly && handleAddUpsell(rec)}
                        disabled={isReadOnly}
                        className="w-full py-2 rounded-xl bg-black hover:bg-neutral-800 text-white font-mono text-[11px] font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer disabled:opacity-40"
                      >
                        + ADD TO QUOTE
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 text-center font-mono text-xs text-neutral-500">
                All database catalog products have already been added to this quotation.
              </div>
            )}
          </div>

          {/* ---------------------------------------------------- */}
          {/* 6. BOTTOM ACTIONS & TOTAL DEAL (Screenshot 2)        */}
          {/* ---------------------------------------------------- */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              {isInFulfillment ? (
                <>
                  <Link
                    to="/quotations"
                    className="px-6 py-3 rounded-2xl bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
                  >
                    &larr; Back to Pipeline
                  </Link>
                  <Link
                    to="/fulfillment"
                    className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
                  >
                    View in Fulfillment &rarr;
                  </Link>
                </>
              ) : isPendingApproval ? (
                <>
                  <Link
                    to="/quotations"
                    className="px-6 py-3 rounded-2xl bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
                  >
                    &larr; Back to Pipeline
                  </Link>
                  <Link
                    to="/approvals"
                    className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
                  >
                    Review in Approvals Inbox &rarr;
                  </Link>
                </>
              ) : isUnderNegotiation ? (
                <>
                  <Link
                    to="/quotations"
                    className="px-6 py-3 rounded-2xl bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
                  >
                    &larr; Back to Pipeline
                  </Link>
                  <Link
                    to="/approvals"
                    className="px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
                  >
                    View Active Negotiation &rarr;
                  </Link>
                </>
              ) : !isConfirmed ? (
                <>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={submitting}
                    className="px-6 py-3 rounded-2xl bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer disabled:opacity-40"
                  >
                    SAVE DRAFT
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitForApproval}
                    disabled={submitting}
                    className="px-7 py-3 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer disabled:opacity-40"
                  >
                    {submitting ? 'PROCESSING...' : 'APPROVE & MOVE TO FULFILLMENT'}
                  </button>
                </>
              ) : (
                <Link
                  to="/quotations"
                  className="px-6 py-3 rounded-2xl bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
                >
                  &larr; Back to Pipeline
                </Link>
              )}
            </div>

            {quotation && (
              <div className="font-mono text-sm text-neutral-500 font-medium">
                Total Deal:{' '}
                <strong className="text-neutral-900 text-lg font-bold ml-1">
                  ₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default QuotationBuilderPage;
