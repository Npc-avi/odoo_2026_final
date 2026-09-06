import React, { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hook/useAuth';
import { fetchQuotationsApi } from '@/features/quotations/services/quotations.api';
import { fetchStaffRfqsApi, rejectRfqApi } from '@/features/rfq/services/rfq.api';
import { StatusBadge } from '@/components/StatusBadge';
import {
  DollarSign,
  CheckCircle2,
  FileText,
  TrendingUp,
  ArrowRight,
  Plus,
  RefreshCw,
  Clock,
  ShieldAlert,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quotations, setQuotations] = useState<any[]>([]);
  const [catalogRequests, setCatalogRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setLoadingRequests(true);
      const [quoteRes, rfqRes] = await Promise.all([
        fetchQuotationsApi(),
        fetchStaffRfqsApi().catch((err) => {
          console.warn('Failed to load RFQs on dashboard:', err);
          return { rfqs: [] };
        }),
      ]);
      setQuotations(quoteRes.quotations || []);
      const pendingRfqs = (rfqRes.rfqs || []).filter(
        (r: any) => r.status === 'pending'
      );
      setCatalogRequests(pendingRfqs);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
      setLoadingRequests(false);
    }
  };

  const handleRejectRequest = async (e: React.MouseEvent, requestId: string) => {
    e.stopPropagation();
    try {
      await rejectRfqApi(requestId);
      setCatalogRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.info('Quotation request rejected and removed from queue.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject quotation request.');
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute live real-time metrics
  const activeQuotes = quotations.filter((q) => q.status !== 'rejected');
  const pipelineValue = activeQuotes.reduce(
    (acc, q) => acc + Number(q.total_amount || 0),
    0
  );

  const pendingApprovalsCount = quotations.filter((q) =>
    ['pending_manager', 'pending_finance'].includes(q.status)
  ).length;

  const avgMargin =
    activeQuotes.length > 0
      ? activeQuotes.reduce((acc, q) => acc + Number(q.total_margin_pct || 0), 0) /
      activeQuotes.length
      : 0;

  const metrics = [
    {
      index: '001',
      title: 'ACTIVE PIPELINE VALUE',
      value: `₹${pipelineValue.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`,
      tagline: `${activeQuotes.length} active opportunities across tenant accounts`,
      icon: DollarSign,
      status: 'HEALTHY // LIVE REVENUE',
      accentColor: 'text-emerald-400',
    },
    {
      index: '002',
      title: 'DISCOUNT APPROVALS QUEUE',
      value: `${pendingApprovalsCount} DEALS`,
      tagline: 'Multi-tier blended risk sign-off required',
      icon: CheckCircle2,
      status: pendingApprovalsCount > 0 ? 'ACTION REQUIRED' : 'QUEUE CLEAR',
      accentColor: pendingApprovalsCount > 0 ? 'text-[#ff3b30]' : 'text-emerald-400',
    },
    {
      index: '003',
      title: 'OPEN QUOTATIONS',
      value: `${quotations.length} TOTAL`,
      tagline: 'Continuous Quote-to-Cash velocity',
      icon: FileText,
      status: 'IN FLIGHT',
      accentColor: 'text-cyan-400',
    },
    {
      index: '004',
      title: 'BLENDED GROSS MARGIN',
      value: `${avgMargin.toFixed(1)}%`,
      tagline: 'Across hardware, services & recurring SaaS',
      icon: TrendingUp,
      status: 'CEILING PROTECTED',
      accentColor: 'text-purple-400',
    },
  ];

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-16">
      {/* Header matching Excalidraw Screen 2 & Landing Page Module Style */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase mb-2">
            SCREEN 2 // SALES DASHBOARD &amp; TELEMETRY &bull; {user?.tenantName || 'ACME CORP'}
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#111111] uppercase tracking-tight">
            SALES OPERATIONS COCKPIT
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-mono mt-1">
            Autonomous discount governance, stock-aware warehouse dispatch, and real-time deal health telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            className="p-3 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-black hover:border-neutral-400 transition-colors cursor-pointer"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/quotations/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#ff3b30] hover:bg-red-600 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-red-950/40"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE QUOTATION</span>
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((m) => (
          <div
            key={m.index}
            className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 flex flex-col justify-between hover:border-neutral-300 hover:shadow-md transition-all shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-neutral-500 mb-6 border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200">
                  <span className="text-[#ff3b30] font-bold text-[9px]">METRIC</span>
                </div>
                <span className="font-mono text-xs font-bold text-neutral-600 px-2.5 py-0.5 rounded-full bg-neutral-100 border border-neutral-200">
                  {m.index}
                </span>
              </div>

              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-500 mb-2">
                {m.title}
              </div>
              <div className="font-display font-black text-3xl sm:text-4xl text-neutral-900 tracking-tight mb-2">
                {m.value}
              </div>
              <p className="text-xs text-neutral-500 font-mono leading-relaxed">
                {m.tagline}
              </p>
            </div>

            <div className="pt-6 border-t border-neutral-100 mt-6 flex items-center justify-between">
              <span className={`text-[10px] font-mono font-bold tracking-widest uppercase ${m.accentColor === 'text-emerald-400' ? 'text-emerald-700' : m.accentColor === 'text-cyan-400' ? 'text-cyan-700' : m.accentColor === 'text-purple-400' ? 'text-purple-700' : 'text-[#ff3b30]'}`}>
                {m.status}
              </span>
              <span className="w-2 h-2 rounded-full bg-[#ff3b30] animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Screen 2 Recent Quotations Pipeline Table */}
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase mb-1">
              RECENT QUOTATION PIPELINE
            </div>
            <h3 className="font-display font-black text-xl text-neutral-900 uppercase tracking-tight">
              ACTIVE DEALS IN FLIGHT
            </h3>
          </div>

          <Link
            to="/quotations"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <span>VIEW ALL PIPELINE</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center font-mono text-xs text-neutral-500 space-y-2">
            <div className="w-6 h-6 rounded-full border-2 border-neutral-200 border-t-[#ff3b30] animate-spin mx-auto" />
            <p>SYNCING PIPELINE LEDGER...</p>
          </div>
        ) : quotations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">QUOTE CODE</th>
                  <th className="py-3 px-4">CUSTOMER</th>
                  <th className="py-3 px-4">ASSIGNED REP</th>
                  <th className="py-3 px-4">CONTRACT AMOUNT</th>
                  <th className="py-3 px-4">MARGIN %</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-900">
                {quotations.slice(0, 5).map((q) => (
                  <tr key={q.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-4 px-4 font-bold text-neutral-900">
                      {q.quotation_code || q.quotation_number || q.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-4 px-4 text-neutral-700">
                      {q.customer_company_name || q.company_name || 'Corporate Account'}
                    </td>
                    <td className="py-4 px-4 text-neutral-500">{q.assigned_rep_name || 'Rachel Rep'}</td>
                    <td className="py-4 px-4 font-bold text-neutral-900">
                      ₹{Number(q.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-emerald-700 font-bold">
                      {Number(q.total_margin_pct || 0).toFixed(1)}%
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link
                        to={`/quotations/${q.id}/edit`}
                        className="inline-flex items-center gap-1 text-xs font-mono text-[#ff3b30] hover:text-red-700 font-bold"
                      >
                        <span>OPEN BUILDER</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-neutral-300 rounded-2xl">
            <p className="text-xs font-mono text-neutral-600 uppercase font-bold">NO QUOTATIONS IN PIPELINE</p>
            <p className="text-[11px] font-mono text-neutral-500 mt-1">
              Click &quot;Create Quotation&quot; above to initialize your first deal.
            </p>
          </div>
        )}
      </div>

      {/* SECTION: INBOUND CATALOGUE QUOTATION REQUESTS */}
      <div className="app-card rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-200 gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] font-bold tracking-widest text-[#ff3b30] uppercase bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                PORTAL INBOUND DEALS // CATALOGUE
              </span>
              {catalogRequests.length > 0 && (
                <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {catalogRequests.length} PENDING ACTION
                </span>
              )}
            </div>
            <h2 className="font-display font-black text-xl sm:text-2xl text-neutral-900 uppercase tracking-tight">
              INBOUND CATALOGUE QUOTATION REQUESTS
            </h2>
            <p className="text-xs font-mono text-neutral-500 mt-0.5">
              Client requests initiated directly from the product catalogue with requested quantities and custom discount rates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadDashboardData}
              className="btn btn-secondary py-2 px-3 text-xs font-mono inline-flex items-center gap-1.5"
              title="Refresh requests"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>SYNC REQUESTS</span>
            </button>
          </div>
        </div>

        {loadingRequests ? (
          <div className="py-12 text-center font-mono text-xs text-neutral-500 space-y-2">
            <div className="w-6 h-6 rounded-full border-2 border-neutral-200 border-t-[#ff3b30] animate-spin mx-auto" />
            <p>FETCHING INBOUND REQUESTS...</p>
          </div>
        ) : catalogRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">REQUEST CODE</th>
                  <th className="py-3 px-4">CUSTOMER</th>
                  <th className="py-3 px-4">REQUESTED PRODUCTS &amp; DISCOUNTS</th>
                  <th className="py-3 px-4">DELIVERY / SCOPE</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4 text-right">OPERATIONAL ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-900">
                {catalogRequests.map((req) => {
                  const itemsList = Array.isArray(req.items) ? req.items : [];
                  return (
                    <tr
                      key={req.id}
                      onClick={() => navigate(`/quotations/new?fromRequest=${req.id}`)}
                      className="hover:bg-neutral-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-4 font-bold text-neutral-900 whitespace-nowrap">
                        <span className="text-[#ff3b30]">RFQ-</span>
                        {req.id.slice(0, 8).toUpperCase()}
                        <span className="block text-[10px] text-neutral-400 font-normal">
                          {new Date(req.created_at).toLocaleDateString('en-IN')}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-bold text-neutral-900 block">
                          {req.customer_company_name || 'Enterprise Account'}
                        </span>
                        {req.customer_tier && (
                          <span className="text-[10px] text-neutral-500 uppercase">
                            TIER: {req.customer_tier}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 max-w-xs">
                        {itemsList.length > 0 ? (
                          <div className="space-y-1">
                            {itemsList.slice(0, 3).map((it: any, idx: number) => {
                              let reqDiscount = 0;
                              try {
                                const parsedNotes = JSON.parse(it.lineNotes || '{}');
                                reqDiscount = parsedNotes.requestedDiscountPct || 0;
                              } catch {
                                const m = (it.lineNotes || '').match(/(\d+(?:\.\d+)?)%/);
                                if (m) reqDiscount = parseFloat(m[1]);
                              }
                              return (
                                <div key={idx} className="text-[11px] text-neutral-700 flex items-center gap-1.5 truncate">
                                  <span className="font-bold text-neutral-900">{it.requestedQty}x</span>
                                  <span className="truncate">{it.productName || 'Product'}</span>
                                  {reqDiscount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200 text-[#ff3b30] font-bold text-[9px] shrink-0">
                                      {reqDiscount}% REQ
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                            {itemsList.length > 3 && (
                              <span className="text-[10px] text-neutral-400 font-bold block">
                                +{itemsList.length - 3} more item(s)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic text-[11px]">
                            {req.item_count || 0} line item(s)
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-neutral-600 max-w-xs">
                        {req.requested_delivery_date ? (
                          <span className="block font-bold text-neutral-800 text-[11px]">
                            Target: {new Date(req.requested_delivery_date).toLocaleDateString('en-IN')}
                          </span>
                        ) : null}
                        {req.customer_notes ? (
                          <p className="text-[10px] text-neutral-500 truncate" title={req.customer_notes}>
                            {req.customer_notes}
                          </p>
                        ) : (
                          <span className="text-neutral-400 text-[10px]">Standard delivery</span>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="app-badge badge-pending">
                          PENDING REVIEW
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => navigate(`/quotations/new?fromRequest=${req.id}`)}
                            className="btn btn-primary py-1.5 px-3 text-xs font-mono font-bold uppercase inline-flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Create quotation with prefilled products & discounts"
                          >
                            <span>CREATE QUOTATION</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleRejectRequest(e, req.id)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                            title="Reject and dismiss quotation request"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 border border-dashed border-neutral-300 rounded-2xl">
            <p className="text-xs font-mono text-neutral-600 uppercase font-bold">ALL INBOUND REQUESTS CLEAR</p>
            <p className="text-[11px] font-mono text-neutral-400 mt-1">
              New customer catalogue inquiries and quote requests will stream into this dashboard queue in real-time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
