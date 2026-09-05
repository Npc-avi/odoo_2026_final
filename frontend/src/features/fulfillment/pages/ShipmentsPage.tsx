import React, { useEffect, useState } from 'react';
import {
  fetchWarehousesApi,
  fetchInventoryApi,
  fetchConfirmedQuotationsApi,
  suggestWarehouseSplitApi,
  confirmSplitDispatchApi,
} from '../services/fulfillment.api';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Truck,
  RefreshCw,
  AlertTriangle,
  Layers,
  CheckCircle2,
  Package,
  ArrowRight,
  Warehouse as WarehouseIcon,
  Sparkles,
  Send,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';

export const ShipmentsPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [confirmedQuotes, setConfirmedQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Split suggestion modal state
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [splitPlan, setSplitPlan] = useState<any>(null);
  const [loadingSplit, setLoadingSplit] = useState<boolean>(false);
  const [dispatching, setDispatching] = useState<boolean>(false);
  const [activeShipments, setActiveShipments] = useState<any[]>([]);

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

  const handleOpenSplit = async (quotationId: string) => {
    try {
      setSelectedQuoteId(quotationId);
      setLoadingSplit(true);
      const res = await suggestWarehouseSplitApi(quotationId);
      setSplitPlan(res.fulfillmentPlan);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate split plan.');
      setSelectedQuoteId(null);
    } finally {
      setLoadingSplit(false);
    }
  };

  const handleConfirmDispatch = async () => {
    if (!selectedQuoteId || !splitPlan?.suggestedSplits) return;

    try {
      setDispatching(true);
      // Flatten suggestedSplits into the expected { splits: [{ warehouseId, quotationItemId, fulfilledQty }] }
      const flatSplits: Array<{ warehouseId: string; quotationItemId: string; fulfilledQty: number }> = [];

      for (const whSplit of splitPlan.suggestedSplits) {
        for (const item of whSplit.items || []) {
          flatSplits.push({
            warehouseId: whSplit.warehouseId,
            quotationItemId: item.quotationItemId,
            fulfilledQty: item.fulfilledQty,
          });
        }
      }

      const res = await confirmSplitDispatchApi(selectedQuoteId, { splits: flatSplits });
      toast.success(res.message || 'Shipment dispatch orders created successfully!');
      if (res.shipments) {
        setActiveShipments((prev) => [...res.shipments, ...prev]);
      }
      setSelectedQuoteId(null);
      setSplitPlan(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm dispatch split.');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase mb-2">
            SCREEN 7 // MULTI-WAREHOUSE AUTO-FULFILLMENT
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#111111] uppercase tracking-tight">
            WAREHOUSE DISPATCH &amp; SPLIT
          </h1>
        </div>

        <button
          onClick={loadData}
          className="p-3 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-black hover:border-neutral-400 transition-colors cursor-pointer"
          title="Refresh Fulfillment"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && (
        <div className="p-16 rounded-3xl border border-neutral-800 bg-[#09090b] text-center space-y-3 font-mono">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-[#ff3b30] animate-spin mx-auto" />
          <p className="text-xs text-neutral-400 tracking-widest uppercase">SCANNING MULTI-DEPOT INVENTORY & LOGISTICS...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 rounded-3xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Screen 7 Top: Multi-Warehouse Inventory Status */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {warehouses.map((wh) => (
            <div
              key={wh.id}
              className="p-6 rounded-3xl border border-neutral-800 bg-[#09090b] space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-[#ff3b30]">
                    <WarehouseIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-mono text-xs font-bold text-white uppercase">{wh.name}</h3>
                    <p className="text-[10px] font-mono text-neutral-400">
                      CODE: {wh.code} &bull; {wh.location}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-cyan-400 font-bold">
                  Weight: {wh.shipping_cost_weight}x
                </span>
              </div>

              {/* Stock in this depot */}
              <div className="space-y-2 font-mono text-xs">
                {inventory
                  .filter((i) => i.warehouse_id === wh.id)
                  .map((inv) => (
                    <div
                      key={inv.id}
                      className="p-2.5 rounded-xl bg-black/50 border border-neutral-800/80 flex items-center justify-between"
                    >
                      <span className="text-neutral-300 font-semibold">{inv.product_name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-neutral-400 text-[11px]">
                          Avail: <strong className="text-white">{inv.qty_available}</strong>
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          (Hand: {inv.qty_on_hand} | Res: {inv.qty_reserved})
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Screen 7: Confirmed Deals Awaiting Auto-Split Dispatch */}
      {!loading && (
        <div className="rounded-3xl border border-neutral-800 bg-[#09090b] p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase">
              <Package className="w-3.5 h-3.5" />
              CONFIRMED QUOTATIONS AWAITING DISPATCH ({confirmedQuotes.length})
            </div>
            <span className="text-xs font-mono text-neutral-400">AUTO-SPLIT ALGORITHM READY</span>
          </div>

          {confirmedQuotes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">QUOTATION CODE</th>
                    <th className="py-3 px-4">CLIENT ACCOUNT</th>
                    <th className="py-3 px-4">ORDER VALUE</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4 text-right">DISPATCH ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {confirmedQuotes.map((q) => (
                    <tr key={q.id} className="hover:bg-neutral-900/30 transition-colors">
                      <td className="py-4 px-4 font-bold text-white">
                        {q.quotation_code || q.quotation_number || q.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="py-4 px-4 text-neutral-300">
                        {q.customer_company_name || q.company_name || 'Acme Client'}
                      </td>
                      <td className="py-4 px-4 text-white font-bold">
                        ${Number(q.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleOpenSplit(q.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-cyan-950/40"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>SUGGEST WAREHOUSE SPLIT</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-neutral-800 rounded-2xl">
              <Truck className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-xs font-mono text-neutral-400 uppercase">NO CONFIRMED ORDERS PENDING SHIPMENT</p>
              <p className="text-[11px] font-mono text-neutral-500 mt-1">
                Once a quotation is accepted in the Customer Portal, it will appear here for multi-warehouse auto-split!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Split Allocation Modal */}
      {selectedQuoteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-2xl w-full rounded-3xl border border-cyan-500/40 bg-[#09090b] p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedQuoteId(null)}
              className="absolute right-6 top-6 p-2 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/40 text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase mb-2">
                <Sparkles className="w-3 h-3" />
                OPTIMAL MULTI-DEPOT ALLOCATION
              </div>
              <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight">
                AUTO-SPLIT FULFILLMENT PLAN
              </h2>
            </div>

            {loadingSplit ? (
              <div className="py-12 text-center font-mono text-xs text-neutral-400 space-y-3">
                <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-cyan-400 animate-spin mx-auto" />
                <p>COMPUTING MINIMUM-LEG SHIPPING MATRIX...</p>
              </div>
            ) : splitPlan ? (
              <div className="space-y-6 font-mono text-xs">
                <div className="p-4 rounded-2xl bg-black border border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase">CALCULATED CARRIER LEGS</span>
                    <div className="font-bold text-white text-sm">
                      {splitPlan.suggestedSplits?.length || 1} Distinct Warehouse Dispatches
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase">ESTIMATED FREIGHT COST</span>
                    <div className="font-bold text-emerald-400 text-sm">
                      ${Number(splitPlan.totalShippingCost || 45.0).toFixed(2)} USD
                    </div>
                  </div>
                </div>

                {/* Warehouse Split Groups */}
                <div className="space-y-4">
                  {splitPlan.suggestedSplits?.map((whSplit: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-neutral-800 bg-neutral-950/60 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                        <span className="font-bold text-cyan-400 uppercase">
                          LEG #{idx + 1}: {whSplit.warehouseName || whSplit.warehouseCode}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {whSplit.items?.length || 0} Line Items
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {whSplit.items?.map((item: any, iIdx: number) => (
                          <div
                            key={iIdx}
                            className="flex items-center justify-between text-neutral-300 text-[11px]"
                          >
                            <span>{item.productName || 'Line Item'}</span>
                            <span className="font-bold text-white">
                              Allocate: {item.fulfilledQty} Units
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Confirm Dispatch Button */}
                <div className="pt-4 border-t border-neutral-800 flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedQuoteId(null)}
                    className="px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 font-bold uppercase tracking-wider hover:bg-neutral-800"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleConfirmDispatch}
                    disabled={dispatching}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold uppercase tracking-wider hover:opacity-95 flex items-center gap-2 shadow-lg shadow-emerald-950/50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{dispatching ? 'DISPATCHING SHIPMENTS...' : 'CONFIRM DISPATCH & GENERATE TRACKING'}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Dispatched Shipments History */}
      {activeShipments.length > 0 && (
        <div className="rounded-3xl border border-neutral-800 bg-[#09090b] p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/40 text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
            <CheckCircle2 className="w-3.5 h-3.5" />
            DISPATCHED REAL-TIME SHIPMENTS
          </div>

          <div className="space-y-3 font-mono text-xs">
            {activeShipments.map((shp, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-neutral-800 bg-neutral-950/60 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white text-sm">
                    TRACKING: <span className="text-cyan-400">{shp.tracking_number || `TRK-PACIFIC-${shp.id?.slice(0, 6)}`}</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    CARRIER: FedEx Freight &bull; CODE: {shp.shipment_code}
                  </div>
                </div>
                <StatusBadge status={shp.status || 'shipped'} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
