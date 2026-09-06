import React, { useEffect, useState } from 'react';
import {
  fetchWarehousesApi,
  fetchInventoryApi,
  fetchConfirmedQuotationsApi,
  suggestWarehouseSplitApi,
  confirmSplitDispatchApi,
  updateStockApi,
} from '../services/fulfillment.api';
import { StatusBadge } from '@/components/StatusBadge';
import {
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  Warehouse as WarehouseIcon,
  Send,
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useSocket } from '@/context/socket.context';

export const ShipmentsPage: React.FC = () => {
  const { socket } = useSocket();

  // Data states
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [confirmedQuotes, setConfirmedQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected quotation for Fulfillment Detail View
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [splitPlan, setSplitPlan] = useState<any>(null);
  const [loadingSplit, setLoadingSplit] = useState<boolean>(false);
  const [dispatching, setDispatching] = useState<boolean>(false);

  // Split Mode: 'suggested' or 'manual'
  const [splitMode, setSplitMode] = useState<'suggested' | 'manual'>('suggested');

  // Manual split state: array of { warehouseId, quotationItemId, fulfilledQty }
  const [manualSplits, setManualSplits] = useState<
    Array<{ warehouseId: string; quotationItemId: string; fulfilledQty: number }>
  >([]);

  // Restock action loading
  const [restocking, setRestocking] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [whData, invData, quotes] = await Promise.all([
        fetchWarehousesApi().catch(() => ({ warehouses: [] })),
        fetchInventoryApi().catch(() => ({ inventory: [] })),
        fetchConfirmedQuotationsApi().catch(() => []),
      ]);

      setWarehouses(whData.warehouses || []);
      setInventory(invData.inventory || []);
      setConfirmedQuotes(quotes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load fulfillment data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;

    const handleFulfillmentLiveUpdate = (data: any) => {
      console.log('[Socket.IO Fulfillment] Real-time change detected:', data);
      loadData();
      if (selectedQuoteId && data?.quoteId === selectedQuoteId) {
        loadSplitDetail(selectedQuoteId);
      }
    };

    socket.on('quotation:created', handleFulfillmentLiveUpdate);
    socket.on('quotation:updated', handleFulfillmentLiveUpdate);
    socket.on('negotiation:updated', handleFulfillmentLiveUpdate);
    socket.on('approval:updated', handleFulfillmentLiveUpdate);

    return () => {
      socket.off('quotation:created', handleFulfillmentLiveUpdate);
      socket.off('quotation:updated', handleFulfillmentLiveUpdate);
      socket.off('negotiation:updated', handleFulfillmentLiveUpdate);
      socket.off('approval:updated', handleFulfillmentLiveUpdate);
    };
  }, [socket, selectedQuoteId]);

  const loadSplitDetail = async (quotationId: string) => {
    try {
      setLoadingSplit(true);
      const res = await suggestWarehouseSplitApi(quotationId);
      const plan = res.fulfillmentPlan;
      setSplitPlan(plan);

      // Pre-fill manual splits from suggested plan
      if (plan?.suggestedSplits) {
        const initialManual: Array<{ warehouseId: string; quotationItemId: string; fulfilledQty: number }> = [];
        for (const s of plan.suggestedSplits) {
          for (const item of s.items || []) {
            initialManual.push({
              warehouseId: s.warehouseId,
              quotationItemId: item.quotationItemId,
              fulfilledQty: Number(item.fulfilledQty || 0),
            });
          }
        }
        setManualSplits(initialManual);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate warehouse split suggestion.');
    } finally {
      setLoadingSplit(false);
    }
  };

  const handleOpenDetail = (quotationId: string) => {
    const targetQuote = confirmedQuotes.find((q) => q.id === quotationId);
    if (targetQuote && (targetQuote.status === 'in_fulfillment' || targetQuote.status === 'fulfillment')) {
      toast.info('Orders with status in fulfillment cannot be opened.');
      return;
    }
    setSelectedQuoteId(quotationId);
    setSplitMode('suggested');
    loadSplitDetail(quotationId);
  };

  const handleCloseDetail = () => {
    setSelectedQuoteId(null);
    setSplitPlan(null);
    setManualSplits([]);
  };

  // Selected quotation metadata
  const selectedQuote = confirmedQuotes.find((q) => q.id === selectedQuoteId);

  // Manual split item quantity change
  const handleManualQtyChange = (whId: string, qItemId: string, qty: number) => {
    setManualSplits((prev) =>
      prev.map((s) => (s.warehouseId === whId && s.quotationItemId === qItemId ? { ...s, fulfilledQty: qty } : s))
    );
  };

  // Manual split warehouse change
  const handleManualWarehouseChange = (oldWhId: string, qItemId: string, newWhId: string) => {
    setManualSplits((prev) =>
      prev.map((s) => (s.warehouseId === oldWhId && s.quotationItemId === qItemId ? { ...s, warehouseId: newWhId } : s))
    );
  };

  // Helper to find warehouses capable of fulfilling a product (having positive available stock)
  const getCapableWarehouses = (productId: string) => {
    return warehouses.filter((w) => {
      const inv = inventory.find((i) => i.warehouse_id === w.id && i.product_id === productId);
      return Number(inv?.qty_available || 0) > 0;
    });
  };

  // Helper to get available stock in a specific warehouse for a product
  const getWarehouseAvailableQty = (warehouseId: string, productId: string) => {
    const inv = inventory.find((i) => i.warehouse_id === warehouseId && i.product_id === productId);
    return Number(inv?.qty_available || 0);
  };

  // Add another warehouse split leg for an item (defaults to first capable warehouse)
  const handleAddManualSplit = (qItemId: string, productId: string) => {
    const capable = getCapableWarehouses(productId);
    if (capable.length === 0) {
      toast.error('No warehouse has available stock for this product.');
      return;
    }
    const defaultWh = capable[0]?.id;
    setManualSplits((prev) => [...prev, { warehouseId: defaultWh, quotationItemId: qItemId, fulfilledQty: 1 }]);
  };

  // Remove manual warehouse split row
  const handleRemoveManualSplit = (whId: string, qItemId: string) => {
    setManualSplits((prev) => prev.filter((s) => !(s.warehouseId === whId && s.quotationItemId === qItemId)));
  };

  // Quick Restock action for Backorders
  const handleQuickRestock = async (warehouseId: string, productId: string) => {
    try {
      setRestocking(true);
      const currentInv = inventory.find((i) => i.warehouse_id === warehouseId && i.product_id === productId);
      const currentOnHand = Number(currentInv?.qty_on_hand || 0);
      const newOnHand = currentOnHand + 50;

      await updateStockApi(warehouseId, productId, newOnHand);
      toast.success('Warehouse inventory restocked! Re-evaluating optimal splits...');
      await loadData();
      if (selectedQuoteId) {
        await loadSplitDetail(selectedQuoteId);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to restock inventory.');
    } finally {
      setRestocking(false);
    }
  };

  // Send to Fulfillment action
  const handleSendFulfillment = async () => {
    if (!selectedQuoteId) return;

    try {
      setDispatching(true);

      let payloadSplits: Array<{
        warehouseId: string;
        items: Array<{ quotationItemId: string; fulfilledQty: number }>;
      }> = [];

      if (splitMode === 'suggested') {
        if (!splitPlan?.suggestedSplits || splitPlan.suggestedSplits.length === 0) {
          toast.warn('No items allocated to fulfill. Check inventory or use manual override.');
          setDispatching(false);
          return;
        }

        payloadSplits = splitPlan.suggestedSplits.map((s: any) => ({
          warehouseId: s.warehouseId,
          items: (s.items || []).map((it: any) => ({
            quotationItemId: it.quotationItemId,
            fulfilledQty: Number(it.fulfilledQty),
          })),
        }));
      } else {
        // Strict Validation: Fulfilled quantity must strictly equal ordered quantity for each item (neither more nor less)
        const physicalItems = (splitPlan?.requestedItems || []).filter((it: any) => it.lineType === 'hardware');

        for (const item of physicalItems) {
          const itemSplits = manualSplits.filter((s) => s.quotationItemId === item.quotationItemId);
          const totalFulfilled = itemSplits.reduce((sum, s) => sum + Number(s.fulfilledQty || 0), 0);
          const orderedQty = Number(item.quantity || 0);

          if (totalFulfilled > orderedQty) {
            toast.error(
              `Error: Fulfilled quantity for "${item.productName}" exceeds ordered quantity (${orderedQty} units). Total allocated is ${totalFulfilled} units.`
            );
            setDispatching(false);
            return;
          }

          if (totalFulfilled < orderedQty) {
            toast.error(
              `Error: Fulfilled quantity for "${item.productName}" (${totalFulfilled} units) is less than ordered quantity (${orderedQty} units). Fulfilled quantity must equal ordered quantity exactly.`
            );
            setDispatching(false);
            return;
          }

          // Validate that each chosen warehouse has enough stock for its allocated quantity
          for (const s of itemSplits) {
            const availInWh = getWarehouseAvailableQty(s.warehouseId, item.productId);
            const wh = warehouses.find((w) => w.id === s.warehouseId);
            if (s.fulfilledQty > availInWh) {
              toast.error(
                `Error: Warehouse "${wh?.name || 'Selected Warehouse'}" does not have enough stock to fulfill ${s.fulfilledQty} units of "${item.productName}" (only ${availInWh} available).`
              );
              setDispatching(false);
              return;
            }
          }
        }

        // Group manual splits by warehouseId
        const grouped: { [whId: string]: Array<{ quotationItemId: string; fulfilledQty: number }> } = {};
        for (const s of manualSplits) {
          if (s.fulfilledQty > 0) {
            if (!grouped[s.warehouseId]) grouped[s.warehouseId] = [];
            grouped[s.warehouseId].push({
              quotationItemId: s.quotationItemId,
              fulfilledQty: Number(s.fulfilledQty),
            });
          }
        }

        payloadSplits = Object.entries(grouped).map(([warehouseId, items]) => ({
          warehouseId,
          items,
        }));
      }

      if (payloadSplits.length === 0) {
        toast.error('At least one line item must be allocated to a warehouse.');
        setDispatching(false);
        return;
      }

      const res = await confirmSplitDispatchApi(selectedQuoteId, {
        splits: payloadSplits,
        isManualOverride: splitMode === 'manual',
      });

      toast.success(res.message || 'Quotation pushed to Fulfillment! Shipments generated.');
      handleCloseDetail();
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send quotation to fulfillment.');
    } finally {
      setDispatching(false);
    }
  };

  // Helper to determine quote fulfillment status & supplying warehouses dynamically (Zero hardcoding)
  const getOrderFulfillmentMetadata = (quote: any) => {
    const isAlreadyFulfilling = quote.status === 'in_fulfillment' || quote.status === 'fulfillment';
    const quoteItems = quote.items || [];
    let isBackorder = false;
    const supplyingWarehouses = new Set<string>();

    for (const item of quoteItems) {
      if (item.line_type === 'hardware') {
        const itemInv = inventory.filter((i) => i.product_id === item.product_id);
        const totalAvailForProduct = itemInv.reduce((acc, i) => acc + Number(i.qty_available || 0), 0);

        if (totalAvailForProduct < Number(item.quantity || 0)) {
          isBackorder = true;
        }

        itemInv.forEach((invRow) => {
          if (Number(invRow.qty_available || 0) > 0) {
            supplyingWarehouses.add(invRow.warehouse_name);
          }
        });
      }
    }

    let statusLabel = 'Split Pending';
    if (isAlreadyFulfilling) {
      statusLabel = 'In Fulfillment';
    } else if (isBackorder) {
      statusLabel = 'Backorder';
    }

    let warehouseDisplay = Array.from(supplyingWarehouses).join(' + ');
    if (!warehouseDisplay) {
      warehouseDisplay = warehouses.map((w) => w.name).join(' + ') || 'Distribution Center';
    }

    return { statusLabel, warehouseDisplay, isBackorder, isAlreadyFulfilling };
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-24">
      {/* ---------------------------------------------------- */}
      {/* VIEW 1: FULFILLMENT AND STOCK (LIST) (Screenshot 1)  */}
      {/* ---------------------------------------------------- */}
      {!selectedQuoteId && (
        <div className="space-y-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 border-b border-neutral-200 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase mb-2">
                FULFILLMENT LOGISTICS // STOCK LEDGER
              </div>
              <h1 className="font-display font-black text-3xl sm:text-4xl text-[#111111] uppercase tracking-tight">
                Fulfillment and Stock (List)
              </h1>
              <p className="text-xs font-mono text-neutral-500 mt-1">
                Live stock per warehouse, plus every order that still needs fulfilling
              </p>
            </div>

            <button
              onClick={loadData}
              className="p-3 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-black hover:border-neutral-400 transition-colors cursor-pointer self-start sm:self-auto"
              title="Refresh Fulfillment"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading && (
            <div className="p-16 rounded-3xl border border-neutral-200 bg-white text-center space-y-3 font-mono shadow-xs">
              <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-[#ff3b30] animate-spin mx-auto" />
              <p className="text-xs text-neutral-500 tracking-widest uppercase">SCANNING WAREHOUSE INVENTORY...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-6 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-mono">
              {error}
            </div>
          )}

          {!loading && (
            <>
              {/* Top Table: Live stock per warehouse */}
              <div className="rounded-3xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-neutral-200 text-neutral-500 uppercase text-[11px] tracking-wider bg-neutral-50">
                        <th className="py-4 px-6">Warehouse</th>
                        <th className="py-4 px-6">Product</th>
                        <th className="py-4 px-4 text-center">In Stock</th>
                        <th className="py-4 px-4 text-center">Reserved</th>
                        <th className="py-4 px-4 text-center">Available</th>
                        <th className="py-4 px-6 text-right">Warehouse Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-neutral-800">
                      {inventory.length > 0 ? (
                        inventory.map((inv) => (
                          <tr key={inv.id} className="hover:bg-neutral-50/80 transition-colors">
                            <td className="py-4 px-6 font-bold text-neutral-900 flex items-center gap-2">
                              <WarehouseIcon className="w-3.5 h-3.5 text-neutral-400" />
                              <span>{inv.warehouse_name}</span>
                            </td>
                            <td className="py-4 px-6 text-neutral-800 font-semibold">
                              {inv.product_name}
                              {inv.product_sku && (
                                <span className="block text-[10px] text-neutral-400 font-normal">
                                  {inv.product_sku}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-center text-neutral-700">{inv.qty_on_hand}</td>
                            <td className="py-4 px-4 text-center text-amber-700 font-medium">
                              {inv.qty_reserved}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded font-bold border ${
                                  Number(inv.qty_available) > 10
                                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                    : Number(inv.qty_available) > 0
                                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                                    : 'text-rose-700 bg-rose-50 border-rose-200'
                                }`}
                              >
                                {inv.qty_available}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right font-bold text-neutral-900">
                              ₹{Number(inv.warehouse_cost ?? inv.unit_cost ?? 0).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-neutral-500">
                            No warehouse inventory records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Table: Orders Awaiting Fulfillment */}
              <div className="space-y-4">
                <h2 className="font-display font-black text-xl text-neutral-900 uppercase tracking-tight">
                  Orders Awaiting Fulfillment
                </h2>

                <div className="rounded-3xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-neutral-200 text-neutral-500 uppercase text-[11px] tracking-wider bg-neutral-50">
                          <th className="py-4 px-6">Order</th>
                          <th className="py-4 px-6">Customer</th>
                          <th className="py-4 px-6">Status</th>
                          <th className="py-4 px-6">Warehouses</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 text-neutral-800">
                        {confirmedQuotes.length > 0 ? (
                          confirmedQuotes.map((q) => {
                            const meta = getOrderFulfillmentMetadata(q);
                            const isLocked = meta.isAlreadyFulfilling;
                            return (
                              <tr
                                key={q.id}
                                onClick={() => {
                                  if (isLocked) {
                                    toast.info('Orders with status in fulfillment cannot be opened.');
                                    return;
                                  }
                                  handleOpenDetail(q.id);
                                }}
                                className={`transition-colors group ${
                                  isLocked
                                    ? 'bg-neutral-50/60 opacity-70 cursor-not-allowed'
                                    : 'hover:bg-neutral-50/80 cursor-pointer'
                                }`}
                                title={isLocked ? 'In Fulfillment — Order cannot be opened' : 'Click to open warehouse split detail'}
                              >
                                <td className="py-4 px-6 font-bold flex items-center gap-2">
                                  <span className={isLocked ? 'text-neutral-500' : 'text-[#ff3b30] group-hover:text-red-700 transition-colors'}>
                                    {q.quotation_code || q.id.slice(0, 8).toUpperCase()}
                                  </span>
                                  {isLocked && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-neutral-200 text-neutral-600 border border-neutral-300">
                                      <Lock className="w-3 h-3 text-neutral-500" />
                                      LOCKED
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-6 text-neutral-900 font-semibold">
                                  {q.customer_company_name || q.company_name || 'Client Organization'}
                                </td>
                                <td className="py-4 px-6">
                                  <StatusBadge status={meta.statusLabel} />
                                </td>
                                <td className="py-4 px-6 text-neutral-600 font-medium">
                                  {meta.warehouseDisplay}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-neutral-500">
                              No confirmed quotations currently awaiting fulfillment.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bottom Instruction Banner */}
                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 font-mono text-xs flex items-center gap-3 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span>Click an order row to open its warehouse split detail.</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* VIEW 2: FULFILLMENT DETAIL VIEW (Screenshot 2)       */}
      {/* ---------------------------------------------------- */}
      {selectedQuoteId && selectedQuote && (
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-3 pb-4 border-b border-neutral-200">
            <button
              onClick={handleCloseDetail}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>BACK TO FULFILLMENT AND STOCK (LIST)</span>
            </button>

            <h1 className="font-display font-black text-2xl sm:text-3xl text-[#111111] uppercase tracking-tight">
              Fulfillment Detail: {selectedQuote.quotation_code || selectedQuote.id.slice(0, 8).toUpperCase()} (
              {selectedQuote.customer_company_name || selectedQuote.company_name || 'Customer'})
            </h1>
            <p className="text-xs font-mono text-neutral-500">
              Opened by clicking an order row on the Fulfillment list
            </p>
          </div>

          {loadingSplit ? (
            <div className="p-16 rounded-3xl border border-neutral-200 bg-white text-center space-y-3 font-mono shadow-xs">
              <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-[#ff3b30] animate-spin mx-auto" />
              <p className="text-xs text-neutral-500 tracking-widest uppercase">
                ANALYZING WAREHOUSE AVAILABILITY & CALCULATING SPLIT...
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* SECTION 1: Products in this Quotation (As requested by user) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-lg text-neutral-900 tracking-tight flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#ff3b30]" />
                    <span>Products in this Quotation</span>
                  </h3>
                  <span className="text-[11px] font-mono text-neutral-500">
                    Ordered items requiring multi-warehouse delivery
                  </span>
                </div>

                <div className="rounded-3xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-neutral-200 text-neutral-500 uppercase text-[10px] tracking-wider bg-neutral-50">
                          <th className="py-3 px-6">Product</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4 text-center">Ordered Qty</th>
                          <th className="py-3 px-6 text-right">Single Product Cost</th>
                          <th className="py-3 px-6 text-right">Unit Price</th>
                          <th className="py-3 px-6 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 text-neutral-800">
                        {splitPlan?.requestedItems && splitPlan.requestedItems.length > 0 ? (
                          splitPlan.requestedItems.map((item: any) => (
                            <tr key={item.quotationItemId} className="hover:bg-neutral-50/80 transition-colors">
                              <td className="py-3.5 px-6 font-bold text-neutral-900">
                                {item.productName}
                                {item.productSku && (
                                  <span className="block text-[10px] text-neutral-400 font-normal">
                                    SKU: {item.productSku}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-neutral-500 uppercase text-[10px]">
                                {item.lineType}
                              </td>
                              <td className="py-3.5 px-4 text-center font-bold text-cyan-700">
                                {item.quantity} units
                              </td>
                              <td className="py-3.5 px-6 text-right text-amber-800 font-semibold">
                                ₹{Number(item.unitCost || 0).toFixed(2)}
                              </td>
                              <td className="py-3.5 px-6 text-right text-neutral-600">
                                ₹{Number(item.unitPrice || 0).toFixed(2)}
                              </td>
                              <td className="py-3.5 px-6 text-right font-bold text-neutral-900">
                                ₹{Number(item.lineTotal || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-neutral-500">
                              No physical products in this quotation.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Warehouse Fulfillment Split (Screenshot 2) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-lg text-neutral-900 tracking-tight flex items-center gap-2">
                    <WarehouseIcon className="w-4 h-4 text-[#ff3b30]" />
                    <span>Warehouse Fulfillment Split & Cost</span>
                  </h3>
                  <span className="text-[11px] font-mono text-neutral-500">
                    Calculated by multiplying single product cost with units taken from each warehouse
                  </span>
                </div>

                <div className="rounded-3xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-neutral-200 text-neutral-500 uppercase text-[11px] tracking-wider bg-neutral-50">
                          <th className="py-4 px-6">Warehouse</th>
                          <th className="py-4 px-6">Qty Fulfilled</th>
                          <th className="py-4 px-6">Est. Shipments</th>
                          <th className="py-4 px-6 text-right">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 text-neutral-800">
                        {splitMode === 'suggested' ? (
                          splitPlan?.suggestedSplits && splitPlan.suggestedSplits.length > 0 ? (
                            splitPlan.suggestedSplits.map((whSplit: any, idx: number) => {
                              return (
                                <tr key={whSplit.warehouseId || idx} className="hover:bg-neutral-50/80">
                                  <td className="py-4 px-6 font-bold text-neutral-900 flex items-center gap-2">
                                    <WarehouseIcon className="w-3.5 h-3.5 text-neutral-400" />
                                    <span>{whSplit.warehouseName || whSplit.warehouseCode}</span>
                                  </td>
                                  <td className="py-4 px-6 text-neutral-700 font-medium">
                                    <span className="text-neutral-900 font-bold">{whSplit.totalQty} units</span>
                                    <div className="text-[10px] text-neutral-500 mt-0.5 space-y-0.5">
                                      {(whSplit.items || []).map((i: any, iIdx: number) => (
                                        <div key={iIdx}>
                                          {i.productName}: <strong>{i.fulfilledQty} units</strong> (@ ₹{Number(i.unitCost).toFixed(2)}/ea)
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="py-4 px-6 text-neutral-600">1</td>
                                  <td className="py-4 px-6 text-right font-bold text-emerald-700 text-sm">
                                    ₹{Number(whSplit.warehouseCost).toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-neutral-500">
                                No warehouse stock available to fulfill these items.
                              </td>
                            </tr>
                          )
                        ) : (
                          /* Manual Override Allocation Rows */
                          manualSplits.map((ms, idx) => {
                            const wh = warehouses.find((w) => w.id === ms.warehouseId);
                            const reqItem = splitPlan?.requestedItems?.find(
                              (it: any) => it.quotationItemId === ms.quotationItemId
                            );
                            const unitCost = Number(reqItem?.unitCost || 0);
                            const lineCost = ms.fulfilledQty * unitCost;

                            // Filter to only warehouses capable of supplying this product (available stock > 0)
                            const capableWarehouses = reqItem ? getCapableWarehouses(reqItem.productId) : [];
                            const availInSelectedWh = reqItem && wh ? getWarehouseAvailableQty(wh.id, reqItem.productId) : 0;
                            const isOverCapacity = ms.fulfilledQty > availInSelectedWh;

                            return (
                              <tr key={idx} className="hover:bg-neutral-50/80">
                                <td className="py-4 px-6">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={ms.warehouseId}
                                        onChange={(e) =>
                                          handleManualWarehouseChange(ms.warehouseId, ms.quotationItemId, e.target.value)
                                        }
                                        className={`px-3 py-1.5 rounded-xl bg-white border font-mono text-xs focus:outline-none ${
                                          isOverCapacity
                                            ? 'border-rose-300 text-rose-700 bg-rose-50'
                                            : 'border-neutral-300 text-neutral-900 focus:border-[#ff3b30]'
                                        }`}
                                      >
                                        {capableWarehouses.length > 0 ? (
                                          capableWarehouses.map((w) => {
                                            const avail = reqItem ? getWarehouseAvailableQty(w.id, reqItem.productId) : 0;
                                            return (
                                              <option key={w.id} value={w.id} className="text-neutral-900 bg-white">
                                                {w.name} ({w.code}) - {avail} avail
                                              </option>
                                            );
                                          })
                                        ) : (
                                          <option value="" disabled className="text-neutral-400 bg-white">
                                            No warehouse has available stock
                                          </option>
                                        )}
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveManualSplit(ms.warehouseId, ms.quotationItemId)}
                                        className="p-1 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                                        title="Remove split leg"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    {isOverCapacity && (
                                      <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 shrink-0" />
                                        <span>Exceeds stock ({availInSelectedWh} available in {wh?.name})</span>
                                      </p>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={ms.fulfilledQty}
                                      onChange={(e) =>
                                        handleManualQtyChange(
                                          ms.warehouseId,
                                          ms.quotationItemId,
                                          Math.max(0, parseInt(e.target.value) || 0)
                                        )
                                      }
                                      className={`w-20 px-2 py-1.5 rounded-xl bg-white border font-mono text-xs text-center font-bold focus:outline-none ${
                                        isOverCapacity
                                          ? 'border-rose-300 text-rose-700 bg-rose-50'
                                          : 'border-neutral-300 text-neutral-900 focus:border-[#ff3b30]'
                                      }`}
                                    />
                                    <span className="text-neutral-500 text-[11px]">
                                      units of {reqItem?.productName || 'Product'} (@ ₹{unitCost.toFixed(2)}/ea)
                                    </span>
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-neutral-600">1</td>
                                <td className="py-4 px-6 text-right font-bold text-emerald-700">
                                  ₹{lineCost.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {splitMode === 'manual' && splitPlan?.requestedItems && (
                    <div className="p-4 border-t border-neutral-200 bg-neutral-50/60 space-y-3">
                      {/* Product Allocation Balance Checkers */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block font-bold">
                          Allocation Balance Check:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {splitPlan.requestedItems
                            .filter((it: any) => it.lineType === 'hardware')
                            .map((it: any) => {
                              const totalFulfilled = manualSplits
                                .filter((s) => s.quotationItemId === it.quotationItemId)
                                .reduce((sum, s) => sum + Number(s.fulfilledQty || 0), 0);
                              const orderedQty = Number(it.quantity || 0);
                              const isExact = totalFulfilled === orderedQty;
                              const isOver = totalFulfilled > orderedQty;

                              return (
                                <div
                                  key={it.quotationItemId}
                                  className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
                                    isExact
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                      : isOver
                                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                                      : 'bg-amber-50 border-amber-200 text-amber-800'
                                  }`}
                                >
                                  <span className="font-bold">{it.productName}:</span>
                                  <span>
                                    {totalFulfilled} / {orderedQty} units ({isExact ? 'Matched' : isOver ? 'Over-allocated' : 'Under-allocated'})
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {/* Add split leg buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-200">
                        <span className="text-[11px] font-mono text-neutral-500 mr-2 font-bold">Add Warehouse Split Leg:</span>
                        {splitPlan.requestedItems.map((it: any) => (
                          <button
                            key={it.quotationItemId}
                            type="button"
                            onClick={() => handleAddManualSplit(it.quotationItemId, it.productId)}
                            className="px-2.5 py-1 rounded-lg border border-neutral-300 hover:border-[#ff3b30] bg-white text-[10px] font-mono text-neutral-700 hover:text-neutral-900 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Plus className="w-3 h-3 text-[#ff3b30]" />
                            <span>{it.productName}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Backorder Banner with Consolidate Prompt (Screenshot 2) */}
              {splitPlan?.backorders && splitPlan.backorders.length > 0 && (
                <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 font-mono text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        "Consolidate Remaining Backorder" prompt appears automatically once East Depot restocks.
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-700">
                      Unfulfilled Demand: {splitPlan.backorders.map((b: any) => `${b.productName} (${b.backorderQty} units backordered)`).join(', ')}.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const firstBo = splitPlan.backorders[0];
                      const targetWh = warehouses.find((w) => w.code === 'WH-EAST') || warehouses[0];
                      if (firstBo && targetWh) {
                        handleQuickRestock(targetWh.id, firstBo.productId);
                      }
                    }}
                    disabled={restocking}
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase tracking-wider text-[11px] transition-colors shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${restocking ? 'animate-spin' : ''}`} />
                    <span>{restocking ? 'Restocking Depot...' : 'Quick Restock Depot +50'}</span>
                  </button>
                </div>
              )}

              {/* Selection Buttons: Accept Suggested Split & Manual Override (Screenshot 2) */}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => setSplitMode('suggested')}
                  className={`px-6 py-3 rounded-full font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
                    splitMode === 'suggested'
                      ? 'bg-[#ff3b30] text-white shadow-red-500/20'
                      : 'bg-neutral-100 text-neutral-700 border border-neutral-200 hover:text-black hover:bg-neutral-200'
                  }`}
                >
                  Accept Suggested Split
                </button>

                <button
                  type="button"
                  onClick={() => setSplitMode('manual')}
                  className={`px-6 py-3 rounded-full font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
                    splitMode === 'manual'
                      ? 'bg-[#ff3b30] text-white shadow-red-500/20'
                      : 'bg-neutral-100 text-neutral-700 border border-neutral-200 hover:text-black hover:bg-neutral-200'
                  }`}
                >
                  Manual Override
                </button>
              </div>

              {/* Action Button Down Below: Send Fulfillment (User Request) */}
              <div className="pt-6 border-t border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="font-mono text-xs text-neutral-500">
                  Ready to dispatch? Pressing send transitions this quotation from <strong className="text-neutral-800">CONFIRMED</strong> to{' '}
                  <strong className="text-purple-700">IN FULFILLMENT</strong> and commits the warehouse split.
                </div>

                <button
                  type="button"
                  onClick={handleSendFulfillment}
                  disabled={dispatching}
                  className="px-8 py-3.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span>{dispatching ? 'DISPATCHING TO FULFILLMENT...' : 'SEND FULFILLMENT'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default ShipmentsPage;
