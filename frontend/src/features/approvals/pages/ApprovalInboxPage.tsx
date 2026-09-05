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
  ShieldAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '@/context/socket.context';
import { toast } from 'react-toastify';

export const ApprovalInboxPage: React.FC = () => {
  const { approvals, allQuotes, loading, error, loadApprovals, makeDecision, getAuditLogs } =
    useApprovals();
  const { user } = useAuth();
  const { socket } = useSocket();
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

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleApprovalEvent = (data: any) => {
      console.log('[Socket.IO Approvals] Real-time event received:', data);
      loadApprovals();

      if (selectedQuoteId && data?.quoteId === selectedQuoteId) {
        if (data.status === 'confirmed') {
          toast.success('Quotation confirmed! Removed from approvals.');
        }
        loadSelectedQuote(selectedQuoteId);
      }
    };

    socket.on('quotation:created', handleApprovalEvent);
    socket.on('quotation:updated', handleApprovalEvent);
    socket.on('negotiation:updated', handleApprovalEvent);
    socket.on('approval:updated', handleApprovalEvent);

    return () => {
      socket.off('quotation:created', handleApprovalEvent);
      socket.off('quotation:updated', handleApprovalEvent);
      socket.off('negotiation:updated', handleApprovalEvent);
      socket.off('approval:updated', handleApprovalEvent);
    };
  }, [socket, loadApprovals, selectedQuoteId]);

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

  // Role permissions & governance checks
  const isAdmin = user?.role === 'admin';
  const isSalesRep = user?.role === 'sales_rep';
  const isSalesManager = user?.role === 'sales_manager';
  const isRepApproved = Boolean(activeQuote?.rep_approved);

  // Customer package standard limit (Gold 15%, Platinum 20%, Silver 10%, Bronze 5%)
  const customerTier = activeQuote?.customer_tier || 'Gold';
  const tierCeilings: { [key: string]: number } = { Platinum: 20, Gold: 15, Silver: 10, Bronze: 5 };
  const standardPackageLimit = tierCeilings[customerTier] || 15;

  const items = fullQuote?.items || [];
  const maxDiscountInQuote = items.reduce(
    (max: number, it: any) => Math.max(max, parseFloat(editingDiscounts[it.id] || it.applied_discount_pct || 0)),
    0
  );
  const requiresManagerApproval = maxDiscountInQuote > standardPackageLimit || Number(activeQuote?.blended_risk_score || 0) > 0;

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedQuoteId(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>BACK TO APPROVALS LIST</span>
                </button>
              </div>
              <h1 className="font-display font-black text-2xl sm:text-3xl text-[#111111] uppercase tracking-tight mt-1">
                Approval Detail: {activeQuote.quotation_code || activeQuote.quotationCode || 'Q-1042'} ({activeQuote.customer_company_name || activeQuote.company_name || 'Acme Corp'})
              </h1>
              <p className="text-xs font-mono text-neutral-500">
                Review proposed line items, adjust discounts or quantities, and approve or counter-negotiate.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={activeQuote.status} />
              {isConfirmed && (
                <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-xs font-bold">
                  CONFIRMED &amp; SETTLED
                </span>
              )}
            </div>
          </div>

          {/* Badges: Blended Risk & Customer Tier */}
          <div className="flex items-center gap-3">
            <span className="px-4 py-1.5 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 font-mono text-xs font-bold uppercase tracking-wide">
              Blended Risk: {Number(activeQuote.blended_risk_score || 0) > 15 ? 'HIGH' : Number(activeQuote.blended_risk_score || 0) > 5 ? 'MEDIUM' : 'LOW'}
            </span>
            <span className="px-4 py-1.5 rounded-2xl bg-cyan-50 text-cyan-800 border border-cyan-200 font-mono text-xs font-bold uppercase tracking-wide">
              Customer Tier: {activeQuote.customer_tier || 'Gold'}
            </span>
            <span className="px-4 py-1.5 rounded-2xl bg-neutral-100 border border-neutral-200 text-neutral-800 font-mono text-xs font-bold">
              Total Contract: ${Number(activeQuote.total_amount || activeQuote.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Section: Live Proposed Lines & Governance Limits */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-base font-bold text-neutral-900 tracking-wide">
                Configured Line Items &amp; Governance Limits
              </h3>
              {hasChangedItems && !isConfirmed && (
                <span className="text-xs font-mono text-amber-700 font-bold animate-pulse">
                  Modified unsaved line terms
                </span>
              )}
            </div>

            {loadingQuote ? (
              <div className="p-8 rounded-2xl border border-neutral-200 bg-white text-center font-mono text-xs text-neutral-500 shadow-xs">
                Loading line items...
              </div>
            ) : (
              <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500 uppercase text-[11px] tracking-wider bg-neutral-50">
                      <th className="py-3 px-5">Line / Product</th>
                      <th className="py-3 px-5 text-right">List Price</th>
                      <th className="py-3 px-5 text-center">Qty</th>
                      <th className="py-3 px-5 text-center">Discount Given %</th>
                      <th className="py-3 px-5 text-center">Limit Allowed</th>
                      <th className="py-3 px-5 text-center">Over By</th>
                      <th className="py-3 px-5 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
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
                        const lineLimit =
                          it.line_type === 'service'
                            ? Math.min(10.0, standardPackageLimit)
                            : it.line_type === 'subscription' || it.line_type === 'software'
                            ? Math.min(12.0, standardPackageLimit)
                            : standardPackageLimit;
                        const isOver = disc > lineLimit;

                        return (
                          <tr key={it.id} className="hover:bg-neutral-50/80 transition-colors">
                            <td className="py-3.5 px-5 font-bold text-neutral-900">
                              {it.product_name || 'Item'}
                              {it.product_sku && (
                                <span className="block text-[10px] text-neutral-400 font-normal">
                                  SKU: {it.product_sku} [{it.line_type || 'item'}]
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-right text-neutral-600">
                              ${unitPrice.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-5 text-center">
                              {isConfirmed ? (
                                <span className="font-bold text-neutral-900">{qty}</span>
                              ) : (
                                <input
                                  type="number"
                                  min="1"
                                  value={qty}
                                  onChange={(e) => handleLineQuantityChange(it.id, parseInt(e.target.value) || 1)}
                                  className="w-16 px-2 py-1 rounded bg-white border border-neutral-300 text-neutral-900 font-mono text-xs text-center font-bold focus:border-[#ff3b30] focus:outline-none"
                                />
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-center">
                              {isConfirmed ? (
                                <span className="font-bold text-neutral-900">{disc.toFixed(1)}%</span>
                              ) : (
                                <div className="inline-flex items-center relative w-20">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={editingDiscounts[it.id] ?? ''}
                                    onChange={(e) => handleLineDiscountChange(it.id, e.target.value)}
                                    className="w-full px-2 py-1 rounded bg-white border border-neutral-300 text-neutral-900 font-mono text-xs text-center font-bold focus:border-[#ff3b30] focus:outline-none"
                                  />
                                  <span className="text-neutral-400 text-[10px] absolute right-2 pointer-events-none">
                                    %
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-center text-neutral-600">
                              {lineLimit.toFixed(1)}% ({customerTier})
                            </td>
                            <td className="py-3.5 px-5 text-center">
                              {isOver ? (
                                <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[10px]">
                                  +{(disc - lineLimit).toFixed(1)}pt OVER
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[10px]">
                                  0 pt - OK
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-right font-bold text-neutral-900">
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
            <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 font-mono text-xs leading-relaxed shadow-xs">
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
          <div className="py-6 px-8 rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex items-center justify-between max-w-2xl mx-auto relative">
              <div className="absolute left-6 right-6 top-4 h-0.5 bg-neutral-200 -z-0" />

              {/* Step 1: In Review / Submitted */}
              <div className="flex flex-col items-center gap-2 z-10">
                <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-emerald-400 flex items-center justify-center text-white font-bold text-xs">
                  ✓
                </div>
                <span className="font-mono text-xs font-bold text-neutral-700">Submitted</span>
              </div>

              {/* Step 2: Sales Rep */}
              <div className="flex flex-col items-center gap-2 z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 ${
                    isRepApproved
                      ? 'bg-emerald-500 border-emerald-400 text-white'
                      : 'bg-neutral-100 border-neutral-300 text-neutral-600'
                  }`}
                >
                  {isRepApproved ? '✓' : '1'}
                </div>
                <span className="font-mono text-xs font-bold text-neutral-700">
                  Sales Rep {isRepApproved ? '(Approved)' : ''}
                </span>
              </div>

              {/* Step 3: Sales Manager */}
              <div className="flex flex-col items-center gap-2 z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 ${
                    isConfirmed
                      ? 'bg-emerald-500 border-emerald-400 text-white'
                      : isRepApproved && requiresManagerApproval
                      ? 'bg-amber-100 border-amber-400 text-amber-800 animate-pulse'
                      : 'bg-neutral-100 border-neutral-300 text-neutral-600'
                  }`}
                >
                  {isConfirmed ? '✓' : '2'}
                </div>
                <span className="font-mono text-xs font-bold text-neutral-700">
                  Sales Manager {requiresManagerApproval ? '(Required)' : '(Discretionary)'}
                </span>
              </div>

              {/* Step 4: Confirmed */}
              <div className="flex flex-col items-center gap-2 z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 ${
                    isConfirmed
                      ? 'bg-emerald-500 border-emerald-400 text-white'
                      : 'bg-neutral-100 border-neutral-300 text-neutral-600'
                  }`}
                >
                  {isConfirmed ? '✓' : '3'}
                </div>
                <span className="font-mono text-xs font-bold text-neutral-700">Confirmed</span>
              </div>
            </div>
          </div>

          {/* Negotiation Thread History */}
          {negotiations.length > 0 && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-neutral-700 text-xs font-mono font-bold uppercase">
                <MessageSquare className="w-4 h-4 text-[#ff3b30]" />
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
                          ? 'bg-cyan-50 border border-cyan-200 text-cyan-900 ml-6'
                          : 'bg-neutral-100 border border-neutral-200 text-neutral-900 mr-6'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1">
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
            <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-neutral-200 font-mono text-xs font-bold text-neutral-800 uppercase bg-neutral-50">
                Approval Governance Audit Log
              </div>
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 uppercase text-[11px] tracking-wider bg-neutral-50">
                    <th className="py-3 px-5">User Role</th>
                    <th className="py-3 px-5">Action</th>
                    <th className="py-3 px-5">Timestamp</th>
                    <th className="py-3 px-5">Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50/80">
                      <td className="py-3 px-5 font-bold uppercase text-neutral-900">{log.reviewer_role || 'Staff'}</td>
                      <td className="py-3 px-5 text-neutral-700 uppercase font-semibold">{log.action}</td>
                      <td className="py-3 px-5 text-neutral-500">
                        {new Date(log.action_timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-5 text-neutral-700">{log.justification}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Action Input & Buttons */}
          <div className="space-y-4 pt-2">
            {isAdmin ? (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 font-mono text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0" />
                  <span>
                    <strong>Administrator View-Only Access</strong>: Administrators can observe audit logs and inspect quotation terms, but cannot approve, counter, or reject. Quotations must be approved by Sales Representatives and Sales Managers.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/quotations/${activeQuote.id}/edit`)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold uppercase transition-colors shrink-0"
                >
                  View in Builder &rarr;
                </button>
              </div>
            ) : !isConfirmed ? (
              <>
                {isRepApproved && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 font-mono text-xs flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      <strong>Rep Approved (In Negotiation)</strong>: A Sales Representative has endorsed this proposal. Because requested discount exceeds {customerTier} package standard ({standardPackageLimit}%), Sales Manager approval is required to confirm.
                    </span>
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Enter decision note / counter terms explanation..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 font-mono text-xs focus:border-[#ff3b30] focus:outline-none shadow-xs"
                />

                <div className="flex flex-wrap items-center gap-4">
                  {/* Approve -> Confirmed or Kept in Negotiation */}
                  {isSalesRep && isRepApproved ? (
                    <button
                      type="button"
                      disabled={true}
                      className="px-8 py-3.5 rounded-full bg-neutral-200 text-neutral-500 font-mono text-xs font-bold uppercase tracking-wider cursor-not-allowed flex items-center gap-2"
                      title="You have already approved this quote. Awaiting Sales Manager sign-off."
                    >
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      <span>Rep Approved (Awaiting Manager)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDecision('approved')}
                      disabled={actionLoading || savingChanges}
                      className="px-8 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isSalesManager
                          ? isRepApproved
                            ? 'Manager Sign-off & Confirm'
                            : 'Approve & Confirm'
                          : requiresManagerApproval
                          ? 'Rep Approve (Keep in Negotiation)'
                          : 'Approve Quotation'}
                      </span>
                    </button>
                  )}

                  {/* Send Revised Terms (Counter-offer) */}
                  {hasChangedItems && (
                    <button
                      type="button"
                      onClick={handleSendCounterToCustomer}
                      disabled={savingChanges || actionLoading}
                      className="px-6 py-3.5 rounded-full bg-[#0284c7] hover:bg-sky-700 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
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
                      className="px-6 py-3.5 rounded-full bg-[#d97706] hover:bg-amber-700 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      Return for Revision
                    </button>
                  )}

                  {/* Reject */}
                  <button
                    type="button"
                    onClick={() => handleDecision('rejected')}
                    disabled={actionLoading || savingChanges}
                    className="px-6 py-3.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/quotations/${activeQuote.id}/edit`)}
                    className="ml-auto px-4 py-3 rounded-full bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 font-mono text-xs font-bold uppercase transition-colors"
                  >
                    Open Full Builder &rarr;
                  </button>
                </div>
              </>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-xs flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase mb-1">
                DISCOUNT GOVERNANCE // QUEUE
              </div>
              <h1 className="font-display font-black text-2xl sm:text-3xl text-[#111111] uppercase tracking-tight">
                Approvals &amp; Negotiations
              </h1>
              <p className="text-xs font-mono text-neutral-500">
                Every quotation that requires approval or is currently in customer negotiation
              </p>
            </div>

            <button
              onClick={() => loadApprovals()}
              className="p-3 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-black hover:border-neutral-400 transition-colors cursor-pointer"
              title="Refresh Approvals"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Top Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-neutral-200 shadow-sm">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1 font-bold">
                PENDING APPROVAL
              </span>
              <span className="font-display font-black text-3xl text-amber-700">
                {pendingQuotes.length}
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-neutral-200 shadow-sm">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1 font-bold">
                IN NEGOTIATION
              </span>
              <span className="font-display font-black text-3xl text-cyan-700">
                {negotiatingQuotes.length}
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-neutral-200 shadow-sm">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1 font-bold">
                TOTAL REQUIRING ACTION
              </span>
              <span className="font-display font-black text-3xl text-neutral-900">
                {pool.length}
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPendingOnly(!pendingOnly)}
              className={`px-4 py-2 rounded-full border text-xs font-mono font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                pendingOnly
                  ? 'bg-amber-500 text-black border-amber-400 shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:text-black hover:bg-neutral-200'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{pendingOnly ? 'Showing: Pending Approvals Only' : 'Showing: All In-Flight'}</span>
            </button>
          </div>

          {loading && (
            <div className="p-16 rounded-3xl border border-neutral-200 bg-white text-center space-y-3 font-mono shadow-xs">
              <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-[#ff3b30] animate-spin mx-auto" />
              <p className="text-xs text-neutral-500 tracking-widest uppercase">FETCHING ACTIVE APPROVALS...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-6 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-mono">
              {error}
            </div>
          )}

          {!loading && !error && displayedQuotes.length === 0 && (
            <div className="p-16 rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/50 text-center space-y-3 font-mono">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="font-display font-bold text-lg text-neutral-900 uppercase">ALL QUOTATIONS CONFIRMED &amp; SETTLED</h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                There are no quotations currently awaiting approval or under negotiation.
              </p>
            </div>
          )}

          {!loading && !error && displayedQuotes.length > 0 && (
            <div className="rounded-3xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500 uppercase text-[10px] tracking-widest bg-neutral-50">
                      <th className="py-4 px-6">QUOTATION #</th>
                      <th className="py-4 px-6">CUSTOMER</th>
                      <th className="py-4 px-4">TOTAL CONTRACT</th>
                      <th className="py-4 px-4">RISK SCORE</th>
                      <th className="py-4 px-4">STATUS</th>
                      <th className="py-4 px-6 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-800">
                    {displayedQuotes.map((q) => (
                      <tr
                        key={q.id}
                        onClick={() => setSelectedQuoteId(q.id)}
                        className="hover:bg-neutral-50/80 transition-colors group cursor-pointer"
                      >
                        <td className="py-4 px-6 font-bold text-[#ff3b30]">
                          {q.quotation_code || q.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-bold text-neutral-900 block">
                            {q.customer_company_name || q.company_name || 'Client'}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            Tier: {q.customer_tier || 'Standard'}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-neutral-900">
                          ${Number(q.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2.5 py-1 rounded text-[10px] font-bold border ${
                              Number(q.blended_risk_score || 0) > 15
                                ? 'bg-rose-50 border-rose-200 text-rose-700'
                                : Number(q.blended_risk_score || 0) > 5
                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            }`}
                          >
                            {Number(q.blended_risk_score || 0).toFixed(1)} pts
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <StatusBadge status={q.status} repApproved={q.rep_approved} />
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 group-hover:text-neutral-900 transition-colors">
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
