import React, { useEffect, useState } from 'react';
import { useApprovals } from '../hook/useApprovals';
import { useAuth } from '@/features/auth/hook/useAuth';
import { StatusBadge } from '@/components/StatusBadge';
import {
  fetchQuotationByIdApi,
  updateQuotationItemApi,
  fetchNegotiationThreadApi,
  submitNegotiationMessageApi,
} from '@/features/quotations/services/quotations.api';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  Filter,
  Send,
  MessageSquare,
  Sparkles,
  Percent,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export const ApprovalInboxPage: React.FC = () => {
  const { approvals, allQuotes, loading, error, loadApprovals, makeDecision, getAuditLogs } =
    useApprovals();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Selected quotation for Detail View (Screenshot 2)
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [fullQuote, setFullQuote] = useState<any>(null);
  const [loadingQuote, setLoadingQuote] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [decisionNotes, setDecisionNotes] = useState<string>('');
  const [pendingOnly, setPendingOnly] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Line item edits in Approval Screen
  const [editingDiscounts, setEditingDiscounts] = useState<{ [itemId: string]: string }>({});
  const [editingQuantities, setEditingQuantities] = useState<{ [itemId: string]: number }>({});
  const [hasChangedItems, setHasChangedItems] = useState<boolean>(false);
  const [savingChanges, setSavingChanges] = useState<boolean>(false);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  // When a quote is selected, fetch its full details, audit logs, and negotiation thread
  const loadSelectedQuote = async (quoteId: string) => {
    try {
      setLoadingQuote(true);
      const [qData, logs, negData] = await Promise.all([
        fetchQuotationByIdApi(quoteId),
        getAuditLogs(quoteId),
        fetchNegotiationThreadApi(quoteId).catch(() => ({ negotiations: [] })),
      ]);

      const q = qData?.quotation || qData;
      setFullQuote(q);
      setAuditLogs(logs || []);
      setNegotiations(negData?.negotiations || []);

      if (q?.items?.length > 0) {
        const discMap: { [key: string]: string } = {};
        const qtyMap: { [key: string]: number } = {};
        q.items.forEach((it: any) => {
          discMap[it.id] = String(Number(it.applied_discount_pct || 0));
          qtyMap[it.id] = Number(it.quantity || 1);
        });
        setEditingDiscounts(discMap);
        setEditingQuantities(qtyMap);
      }
      setHasChangedItems(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load quotation details.');
    } finally {
      setLoadingQuote(false);
    }
  };

  useEffect(() => {
    if (selectedQuoteId) {
      loadSelectedQuote(selectedQuoteId);
    } else {
      setFullQuote(null);
      setAuditLogs([]);
      setNegotiations([]);
      setDecisionNotes('');
      setHasChangedItems(false);
    }
  }, [selectedQuoteId]);

  // Quotations pool: ONLY active quotes requiring review / in negotiation are stored in Approvals
  const pool = (allQuotes.length > 0 ? allQuotes : approvals).filter((q) =>
    ['under_negotiation', 'pending_manager', 'pending_finance', 'sent', 'pending'].includes(q.status)
  );

  const pendingQuotes = pool.filter((q) =>
    ['pending_manager', 'pending_finance', 'pending'].includes(q.status)
  );
  const negotiatingQuotes = pool.filter((q) =>
    ['under_negotiation', 'sent'].includes(q.status)
  );

  const displayedQuotes = pendingOnly ? pendingQuotes : pool;

  // Selected Quote Detail
  const activeQuote = fullQuote || pool.find((q) => q.id === selectedQuoteId);
  const isConfirmed = activeQuote?.status === 'confirmed' || activeQuote?.status === 'approved';

  // Rep Limit & Tier ceiling
  const repLimit = 5.0;
  const items = fullQuote?.items || [];
  const maxDiscountInQuote = items.reduce(
    (max: number, it: any) => Math.max(max, parseFloat(editingDiscounts[it.id] || it.applied_discount_pct || 0)),
    0
  );
  const requiresManagerApproval = maxDiscountInQuote > repLimit;

  // ----------------------------------------------------
  // Handle Line Item Modifications in Approvals
  // ----------------------------------------------------
  const handleLineDiscountChange = (itemId: string, val: string) => {
    setEditingDiscounts((prev) => ({ ...prev, [itemId]: val }));
    setHasChangedItems(true);
  };

  const handleLineQuantityChange = (itemId: string, val: number) => {
    setEditingQuantities((prev) => ({ ...prev, [itemId]: Math.max(1, val) }));
    setHasChangedItems(true);
  };

  // ----------------------------------------------------
  // Send Revised Terms to Customer (Counter Offer)
  // ----------------------------------------------------
  const handleSendCounterToCustomer = async () => {
    if (!selectedQuoteId || isConfirmed) return;

    try {
      setSavingChanges(true);

      // 1. Update all modified items
      for (const it of items) {
        const disc = parseFloat(editingDiscounts[it.id]);
        const qty = editingQuantities[it.id];
        const prevDisc = Number(it.applied_discount_pct || 0);
        const prevQty = Number(it.quantity || 1);

        if (!isNaN(disc) && (disc !== prevDisc || qty !== prevQty)) {
          await updateQuotationItemApi(it.id, {
            appliedDiscountPct: disc,
            quantity: qty,
          });
        }
      }

      // 2. Post negotiation message
      const note = decisionNotes.trim() || 'Sales team countered quotation with revised terms.';
      await submitNegotiationMessageApi(selectedQuoteId, { comments: note }, false);

      toast.success('Revised quotation sent to customer! Proposal remains in negotiation.');
      setDecisionNotes('');
      setHasChangedItems(false);
      await loadSelectedQuote(selectedQuoteId);
      await loadApprovals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update quotation terms.');
    } finally {
      setSavingChanges(false);
    }
  };

  // ----------------------------------------------------
  // Handle Decision Actions (Approve / Reject)
  // ----------------------------------------------------
  const handleDecision = async (action: 'approved' | 'rejected' | 'returned_for_revision') => {
    if (!selectedQuoteId || isConfirmed) return;

    try {
      setActionLoading(true);
      const justification = decisionNotes.trim() || `Decision executed via Approvals Dashboard (${action})`;
      await makeDecision(selectedQuoteId, action, justification);
      setDecisionNotes('');
      await loadApprovals();

      // If approved or rejected, return to list since it is settled
      if (action === 'approved' || action === 'rejected') {
        setSelectedQuoteId(null);
      } else {
        await loadSelectedQuote(selectedQuoteId);
      }
    } catch (err: any) {
      // Error handled in makeDecision
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      {/* ---------------------------------------------------- */}
      {/* VIEW 1: APPROVAL DETAIL SCREEN                       */}
      {/* ---------------------------------------------------- */}
      {selectedQuoteId && activeQuote && (
        <div className="space-y-8">
          {/* Header & Subheader */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedQuoteId(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>BACK TO APPROVALS LIST</span>
                </button>
              </div>
              <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight mt-1">
                Approval Detail: {activeQuote.quotation_code || activeQuote.quotationCode || 'Q-1042'} ({activeQuote.customer_company_name || activeQuote.company_name || 'Acme Corp'})
              </h1>
              <p className="text-xs font-mono text-neutral-400">
                Review proposed line items, adjust discounts or quantities, and approve or counter-negotiate.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={activeQuote.status} />
              {isConfirmed && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
                  CONFIRMED &amp; SETTLED
                </span>
              )}
            </div>
          </div>

          {/* Badges: Blended Risk & Customer Tier */}
          <div className="flex items-center gap-3">
            <span className="px-4 py-1.5 rounded-2xl bg-[#f87171] text-black font-mono text-xs font-black uppercase tracking-wide">
              Blended Risk: {Number(activeQuote.blended_risk_score || 0) > 15 ? 'HIGH' : Number(activeQuote.blended_risk_score || 0) > 5 ? 'MEDIUM' : 'LOW'}
            </span>
            <span className="px-4 py-1.5 rounded-2xl bg-[#38bdf8] text-black font-mono text-xs font-black uppercase tracking-wide">
              Customer Tier: {activeQuote.customer_tier || 'Gold'}
            </span>
            <span className="px-4 py-1.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono text-xs font-bold">
              Total Contract: ${Number(activeQuote.total_amount || activeQuote.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Section: Live Proposed Lines & Governance Limits */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-base font-bold text-cyan-400 tracking-wide">
                Configured Line Items &amp; Governance Limits
              </h3>
              {hasChangedItems && !isConfirmed && (
                <span className="text-xs font-mono text-amber-400 font-bold animate-pulse">
                  Modified unsaved line terms
                </span>
              )}
            </div>

            {loadingQuote ? (
              <div className="p-8 rounded-2xl border border-neutral-800 bg-[#09090b] text-center font-mono text-xs text-neutral-400">
                Loading line items...
              </div>
            ) : (
              <div className="rounded-2xl border border-neutral-800 bg-[#09090b] overflow-hidden shadow-xl">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 uppercase text-[11px] tracking-wider bg-black/40">
                      <th className="py-3 px-5">Line / Product</th>
                      <th className="py-3 px-5 text-right">List Price</th>
                      <th className="py-3 px-5 text-center">Qty</th>
                      <th className="py-3 px-5 text-center">Discount Given %</th>
                      <th className="py-3 px-5 text-center">Limit Allowed</th>
                      <th className="py-3 px-5 text-center">Over By</th>
                      <th className="py-3 px-5 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 text-white">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-neutral-500">
                          No line items found on this quotation.
                        </td>
                      </tr>
                    ) : (
                      items.map((it: any) => {
                        const unitPrice = Number(it.unit_list_price || 0);
                        const disc = parseFloat(editingDiscounts[it.id] ?? String(it.applied_discount_pct || 0)) || 0;
                        const qty = Number(editingQuantities[it.id] ?? it.quantity ?? 1);
                        const lineTotal = unitPrice * (1 - disc / 100) * qty;
                        const isOver = disc > repLimit;

                        return (
                          <tr key={it.id} className="hover:bg-neutral-900/40 transition-colors">
                            <td className="py-3.5 px-5 font-bold">
                              {it.product_name || 'Item'}
                              {it.product_sku && (
                                <span className="block text-[10px] text-neutral-500 font-normal">
                                  SKU: {it.product_sku} [{it.line_type || 'item'}]
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-right text-neutral-400">
                              ${unitPrice.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-5 text-center">
                              {isConfirmed ? (
                                <span>{qty}</span>
                              ) : (
                                <input
                                  type="number"
                                  min="1"
                                  value={qty}
                                  onChange={(e) => handleLineQuantityChange(it.id, parseInt(e.target.value) || 1)}
                                  className="w-16 px-2 py-1 rounded bg-black border border-neutral-700 text-white font-mono text-xs text-center focus:border-cyan-400 focus:outline-none"
                                />
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-center">
                              {isConfirmed ? (
                                <span className="font-bold">{disc.toFixed(1)}%</span>
                              ) : (
                                <div className="inline-flex items-center relative w-20">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={editingDiscounts[it.id] ?? ''}
                                    onChange={(e) => handleLineDiscountChange(it.id, e.target.value)}
                                    className="w-full px-2 py-1 rounded bg-black border border-neutral-700 text-white font-mono text-xs text-center focus:border-cyan-400 focus:outline-none"
                                  />
                                  <span className="text-neutral-500 text-[10px] absolute right-2 pointer-events-none">
                                    %
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-center text-neutral-400">
                              {repLimit.toFixed(1)}% (Rep)
                            </td>
                            <td className="py-3.5 px-5 text-center">
                              {isOver ? (
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                                  +{(disc - repLimit).toFixed(1)}pt OVER
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                                  0 pt - OK
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-right font-bold text-white">
                              ${lineTotal.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Amber Note Banner */}
            <div className="p-3.5 rounded-2xl border border-neutral-800 bg-neutral-950/80 text-amber-300/90 font-mono text-xs leading-relaxed">
              {requiresManagerApproval ? (
                <span>
                  <strong>Two-Tier Governance Triggered:</strong> Max line discount ({maxDiscountInQuote.toFixed(1)}%) exceeds the 5.00% Sales Representative discretion limit. Approval from both the Sales Representative and Sales Manager is required before confirmation.
                </span>
              ) : (
                <span>
                  <strong>Single-Tier Governance:</strong> All line discounts are within the 5.00% Sales Representative limit. Sales Representative approval alone will directly confirm this quotation.
                </span>
              )}
            </div>
          </div>

          {/* Stepper Chain: Submitted -> Sales Rep -> Sales Manager -> Confirmed */}
          <div className="py-6 px-8 rounded-3xl border border-neutral-800 bg-[#09090b]">
            <div className="flex items-center justify-between max-w-2xl mx-auto relative">
              <div className="absolute left-6 right-6 top-4 h-0.5 bg-neutral-800 -z-0" />

              {/* Step 1: In Review / Submitted */}
              <div className="flex flex-col items-center gap-2 z-10">
                <div className="w-8 h-8 rounded-full bg-[#10b981] border-2 border-emerald-400 flex items-center justify-center text-black font-bold text-xs">
                  ✓
                </div>
                <span className="font-mono text-xs font-bold text-neutral-300">Submitted</span>
              </div>

              {/* Step 2: Sales Rep */}
              <div className="flex flex-col items-center gap-2 z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 ${
                    activeQuote.status === 'under_negotiation' || activeQuote.status === 'sent'
                      ? 'bg-cyan-500 border-cyan-300 text-black animate-pulse'
                      : activeQuote.status === 'pending_manager' || isConfirmed
                      ? 'bg-[#10b981] border-emerald-400 text-black'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                >
                  {activeQuote.status === 'pending_manager' || isConfirmed ? '✓' : '1'}
                </div>
                <span className="font-mono text-xs font-bold text-neutral-300">Sales Rep</span>
              </div>

              {/* Step 3: Sales Manager */}
              <div className="flex flex-col items-center gap-2 z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 ${
                    activeQuote.status === 'pending_manager'
                      ? 'bg-amber-500 border-amber-300 text-black animate-pulse'
                      : isConfirmed
                      ? 'bg-[#10b981] border-emerald-400 text-black'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                >
                  {isConfirmed ? '✓' : '2'}
                </div>
                <span className="font-mono text-xs font-bold text-neutral-300">
                  Manager {requiresManagerApproval ? '(Required)' : '(Bypassed)'}
                </span>
              </div>

              {/* Step 4: Confirmed */}
              <div className="flex flex-col items-center gap-2 z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 ${
                    isConfirmed
                      ? 'bg-[#10b981] border-emerald-400 text-black'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                >
                  {isConfirmed ? '✓' : '3'}
                </div>
                <span className="font-mono text-xs font-bold text-neutral-300">Confirmed</span>
              </div>
            </div>
          </div>

          {/* Negotiation Thread History */}
          {negotiations.length > 0 && (
            <div className="rounded-2xl border border-neutral-800 bg-[#09090b] p-5 space-y-3">
              <div className="flex items-center gap-2 text-neutral-400 text-xs font-mono font-bold uppercase">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <span>Live Negotiation Conversation</span>
              </div>
              <div className="space-y-2">
                {negotiations.map((n: any, idx: number) => {
                  const isClient = Boolean(n.author_portal_user_id || n.authorPortalUserId);
                  return (
                    <div
                      key={n.id || idx}
                      className={`p-3 rounded-xl font-mono text-xs ${
                        isClient
                          ? 'bg-cyan-950/40 border border-cyan-800/40 text-cyan-200 ml-6'
                          : 'bg-neutral-900 border border-neutral-800 text-neutral-200 mr-6'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                        <span className="font-bold">{isClient ? 'Client Counter' : 'Company Staff Response'}</span>
                        <span>{new Date(n.created_at || n.createdAt || Date.now()).toLocaleTimeString()}</span>
                      </div>
                      <p>{n.comments}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Audit Trail History Table */}
          {auditLogs.length > 0 && (
            <div className="rounded-2xl border border-neutral-800 bg-[#09090b] overflow-hidden shadow-xl">
              <div className="px-5 py-3 border-b border-neutral-800 font-mono text-xs font-bold text-neutral-400 uppercase">
                Approval Governance Audit Log
              </div>
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 uppercase text-[11px] tracking-wider bg-black/40">
                    <th className="py-3 px-5">User Role</th>
                    <th className="py-3 px-5">Action</th>
                    <th className="py-3 px-5">Timestamp</th>
                    <th className="py-3 px-5">Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-white">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-900/40">
                      <td className="py-3 px-5 font-bold uppercase">{log.reviewer_role || 'Staff'}</td>
                      <td className="py-3 px-5 text-neutral-300 uppercase">{log.action}</td>
                      <td className="py-3 px-5 text-neutral-400">
                        {new Date(log.action_timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-5 text-neutral-300">{log.justification}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Action Input & Buttons */}
          <div className="space-y-4 pt-2">
            {!isConfirmed ? (
              <>
                <input
                  type="text"
                  placeholder="Enter decision note / counter terms explanation..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#09090b] border border-neutral-800 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                />

                <div className="flex flex-wrap items-center gap-4">
                  {/* Approve -> Confirmed or Escalated */}
                  <button
                    type="button"
                    onClick={() => handleDecision('approved')}
                    disabled={actionLoading || savingChanges}
                    className="px-8 py-3.5 rounded-2xl bg-[#22c55e] hover:bg-emerald-600 text-black font-mono text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Quotation</span>
                  </button>

                  {/* Send Revised Terms (Counter-offer) */}
                  {hasChangedItems && (
                    <button
                      type="button"
                      onClick={handleSendCounterToCustomer}
                      disabled={savingChanges || actionLoading}
                      className="px-6 py-3.5 rounded-2xl bg-[#0284c7] hover:bg-sky-600 text-white font-mono text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-sky-600/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>{savingChanges ? 'Sending...' : 'Send Revised Terms to Customer'}</span>
                    </button>
                  )}

                  {/* Return for Revision */}
                  {!hasChangedItems && (
                    <button
                      type="button"
                      onClick={() => handleDecision('returned_for_revision')}
                      disabled={actionLoading || savingChanges}
                      className="px-6 py-3.5 rounded-2xl bg-[#d97706] hover:bg-amber-600 text-white font-mono text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-amber-600/20 cursor-pointer disabled:opacity-50"
                    >
                      Return for Revision
                    </button>
                  )}

                  {/* Reject */}
                  <button
                    type="button"
                    onClick={() => handleDecision('rejected')}
                    disabled={actionLoading || savingChanges}
                    className="px-6 py-3.5 rounded-2xl bg-[#f87171] hover:bg-red-500 text-black font-mono text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-red-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/quotations/${activeQuote.id}/edit`)}
                    className="ml-auto px-4 py-3 rounded-2xl bg-[#09090b] hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-xs font-bold uppercase transition-colors"
                  >
                    Open Full Builder &rarr;
                  </button>
                </div>
              </>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  <strong>Confirmed Quotation (Read-Only)</strong>: This quotation has already been approved and confirmed. It cannot be altered.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* VIEW 2: APPROVALS LIST SCREEN                        */}
      {/* ---------------------------------------------------- */}
      {!selectedQuoteId && (
        <div className="space-y-8">
          {/* Header & Subtitle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
            <div className="space-y-1">
              <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
                Approvals &amp; Negotiations
              </h1>
              <p className="text-xs font-mono text-neutral-400">
                Every quotation that requires approval or is currently in customer negotiation
              </p>
            </div>

            <button
              onClick={() => loadApprovals()}
              className="p-3 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Refresh Approvals"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Top Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#09090b] border border-neutral-800 shadow-lg">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">
                PENDING APPROVAL
              </span>
              <span className="font-mono font-bold text-2xl text-amber-400">
                {pendingQuotes.length}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#09090b] border border-neutral-800 shadow-lg">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">
                IN NEGOTIATION
              </span>
              <span className="font-mono font-bold text-2xl text-cyan-400">
                {negotiatingQuotes.length}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#09090b] border border-neutral-800 shadow-lg">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">
                TOTAL REQUIRING ACTION
              </span>
              <span className="font-mono font-bold text-2xl text-white">
                {pool.length}
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPendingOnly(!pendingOnly)}
              className={`px-4 py-2 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                pendingOnly
                  ? 'bg-amber-500 text-black border-amber-400'
                  : 'bg-[#09090b] text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{pendingOnly ? 'Showing: Pending Approvals Only' : 'Showing: All In-Flight'}</span>
            </button>
          </div>

          {loading && (
            <div className="p-16 rounded-3xl border border-neutral-800 bg-[#09090b] text-center space-y-3 font-mono">
              <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-[#ff3b30] animate-spin mx-auto" />
              <p className="text-xs text-neutral-400 tracking-widest uppercase">FETCHING ACTIVE APPROVALS...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-mono">
              {error}
            </div>
          )}

          {!loading && !error && displayedQuotes.length === 0 && (
            <div className="p-16 rounded-3xl border border-dashed border-neutral-800 bg-[#09090b]/50 text-center space-y-3 font-mono">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mx-auto" />
              <h3 className="font-display font-bold text-lg text-white">ALL QUOTATIONS CONFIRMED &amp; SETTLED</h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                There are no quotations currently awaiting approval or under negotiation.
              </p>
            </div>
          )}

          {!loading && !error && displayedQuotes.length > 0 && (
            <div className="rounded-3xl border border-neutral-800 bg-[#09090b] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 uppercase text-[10px] tracking-widest bg-neutral-950/60">
                      <th className="py-4 px-6">QUOTATION #</th>
                      <th className="py-4 px-6">CUSTOMER</th>
                      <th className="py-4 px-4">TOTAL CONTRACT</th>
                      <th className="py-4 px-4">RISK SCORE</th>
                      <th className="py-4 px-4">STATUS</th>
                      <th className="py-4 px-6 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 text-white">
                    {displayedQuotes.map((q) => (
                      <tr
                        key={q.id}
                        onClick={() => setSelectedQuoteId(q.id)}
                        className="hover:bg-neutral-900/40 transition-colors group cursor-pointer"
                      >
                        <td className="py-4 px-6 font-bold text-[#ff3b30]">
                          {q.quotation_code || q.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-bold text-white block">
                            {q.customer_company_name || q.company_name || 'Client'}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            Tier: {q.customer_tier || 'Standard'}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-white">
                          ${Number(q.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                              Number(q.blended_risk_score || 0) > 15
                                ? 'bg-rose-500/20 text-rose-300'
                                : Number(q.blended_risk_score || 0) > 5
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {Number(q.blended_risk_score || 0).toFixed(1)} pts
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <StatusBadge status={q.status} />
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-400 group-hover:text-white transition-colors">
                            <span>REVIEW</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
