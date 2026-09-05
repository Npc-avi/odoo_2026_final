import React, { useEffect, useState } from 'react';
import { useApprovals } from '../hook/useApprovals';
import { StatusBadge } from '@/components/StatusBadge';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  ShieldAlert,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

export const ApprovalInboxPage: React.FC = () => {
  const { approvals, allQuotes, loading, error, loadApprovals, makeDecision, getAuditLogs } =
    useApprovals();

  // Selected quotation for Detail View (Screenshot 2)
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);
  const [decisionNotes, setDecisionNotes] = useState<string>('');
  const [pendingOnly, setPendingOnly] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  // When a quote is selected, fetch its audit logs
  useEffect(() => {
    if (selectedQuoteId) {
      setLoadingAudit(true);
      getAuditLogs(selectedQuoteId).then((logs) => {
        setAuditLogs(logs);
        setLoadingAudit(false);
      });
    }
  }, [selectedQuoteId]);

  // Counters for Top Summary Pills (Screenshot 3)
  const pool = allQuotes.length > 0 ? allQuotes : approvals;
  const pendingQuotes = pool.filter((q) =>
    ['pending_manager', 'pending_finance', 'pending'].includes(q.status)
  );
  const returnedQuotes = pool.filter((q) =>
    ['under_negotiation', 'sent'].includes(q.status)
  );
  const approvedQuotes = pool.filter((q) =>
    ['confirmed', 'approved'].includes(q.status)
  );

  const displayedQuotes = pendingOnly ? pendingQuotes : pool;

  // Selected Quote Detail
  const activeQuote = pool.find((q) => q.id === selectedQuoteId);
  const isConfirmed = activeQuote?.status === 'confirmed' || activeQuote?.status === 'approved';

  // Handle Decision Actions (Screenshot 2: Approve, Return for Revision, Reject)
  const handleDecision = async (action: 'approved' | 'rejected' | 'returned_for_revision') => {
    if (!selectedQuoteId || isConfirmed) return;

    try {
      setActionLoading(true);
      const justification = decisionNotes.trim() || `Decision executed via Approvals Dashboard (${action})`;
      await makeDecision(selectedQuoteId, action, justification);
      setDecisionNotes('');
      // Reload quote state
      await loadApprovals();
      if (action === 'approved') {
        toast.success('Quotation approved! Status changed to Confirmed across all portals.');
      } else if (action === 'returned_for_revision') {
        toast.info('Returned for revision. Status set to Negotiating.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to process decision.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* ---------------------------------------------------- */}
      {/* VIEW 1: APPROVAL DETAIL SCREEN (SCREENSHOT 2)        */}
      {/* ---------------------------------------------------- */}
      {selectedQuoteId && activeQuote && (
        <div className="space-y-8">
          {/* Header & Subheader (Screenshot 2) */}
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
                Approval Detail: {activeQuote.quotation_code || 'Q-1042'} ({activeQuote.customer_company_name || activeQuote.company_name || 'Acme Corp'})
              </h1>
              <p className="text-xs font-mono text-neutral-400">
                Opened by clicking a row on the Approvals list
              </p>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={activeQuote.status} />
              {isConfirmed && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
                  LOCKED
                </span>
              )}
            </div>
          </div>

          {/* Badges: Blended Risk & Customer Tier (Screenshot 2) */}
          <div className="flex items-center gap-3">
            <span className="px-4 py-1.5 rounded-2xl bg-[#f87171] text-black font-mono text-xs font-black uppercase tracking-wide">
              Blended Risk: {Number(activeQuote.blended_risk_score || 0) > 15 ? 'HIGH' : Number(activeQuote.blended_risk_score || 0) > 5 ? 'MEDIUM' : 'LOW'}
            </span>
            <span className="px-4 py-1.5 rounded-2xl bg-[#38bdf8] text-black font-mono text-xs font-black uppercase tracking-wide">
              Customer Tier: {activeQuote.customer_tier || 'Gold'}
            </span>
          </div>

          {/* Section: Why This Quote Was Flagged (Screenshot 2) */}
          <div className="space-y-3">
            <h3 className="font-mono text-base font-bold text-cyan-400 tracking-wide">
              Why This Quote Was Flagged
            </h3>

            {/* Flagged Lines Table */}
            <div className="rounded-2xl border border-neutral-800 bg-[#09090b] overflow-hidden shadow-xl">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 uppercase text-[11px] tracking-wider bg-black/40">
                    <th className="py-3 px-5">Line</th>
                    <th className="py-3 px-5">Discount Given</th>
                    <th className="py-3 px-5">Limit Allowed</th>
                    <th className="py-3 px-5">Over By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-white">
                  <tr className="hover:bg-neutral-900/40">
                    <td className="py-3.5 px-5">Laptop (Hardware)</td>
                    <td className="py-3.5 px-5">12%</td>
                    <td className="py-3.5 px-5 text-neutral-400">15%</td>
                    <td className="py-3.5 px-5 text-neutral-300 font-bold">0 pt - OK</td>
                  </tr>
                  <tr className="hover:bg-neutral-900/40">
                    <td className="py-3.5 px-5">Setup Service (Services)</td>
                    <td className="py-3.5 px-5 text-amber-400 font-bold">18%</td>
                    <td className="py-3.5 px-5 text-neutral-400">10%</td>
                    <td className="py-3.5 px-5 text-amber-400 font-bold">8 pt OVER</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Amber Note Banner (Screenshot 2) */}
            <div className="p-3.5 rounded-2xl border border-neutral-800 bg-neutral-950/80 text-amber-300/90 font-mono text-xs">
              Worst single line (8pt over) plus overall pattern across the order sets the blended score. One bad line is enough to require approval.
            </div>
          </div>

          {/* Stepper Chain (Screenshot 2: Submitted -> Sales Manager -> Finance -> Confirmed) */}
          <div className="py-6 px-8 rounded-3xl border border-neutral-800 bg-[#09090b]">
            <div className="flex items-center justify-between max-w-2xl mx-auto relative">
              {/* Connecting line */}
              <div className="absolute left-6 right-6 top-4 h-0.5 bg-neutral-800 -z-0" />

              {/* Step 1: Submitted */}
              <div className="flex flex-col items-center gap-2 z-10">
                <div className="w-8 h-8 rounded-full bg-[#10b981] border-2 border-emerald-400 flex items-center justify-center text-black font-bold text-xs">
                  ✓
                </div>
                <span className="font-mono text-xs font-bold text-neutral-300">Submitted</span>
              </div>

              {/* Step 2: Sales Manager */}
              <div className="flex flex-col items-center gap-2 z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 ${
                    activeQuote.status === 'pending_manager'
                      ? 'bg-[#38bdf8] border-cyan-400 text-black animate-pulse'
                      : isConfirmed || activeQuote.status === 'pending_finance'
                      ? 'bg-[#10b981] border-emerald-400 text-black'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                >
                  {isConfirmed || activeQuote.status === 'pending_finance' ? '✓' : '2'}
                </div>
                <span className="font-mono text-xs font-bold text-neutral-300">Sales Manager</span>
              </div>

              {/* Step 3: Finance */}
              <div className="flex flex-col items-center gap-2 z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 ${
                    activeQuote.status === 'pending_finance'
                      ? 'bg-[#38bdf8] border-cyan-400 text-black animate-pulse'
                      : isConfirmed
                      ? 'bg-[#10b981] border-emerald-400 text-black'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                >
                  {isConfirmed ? '✓' : '3'}
                </div>
                <span className="font-mono text-xs font-bold text-neutral-300">Finance</span>
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
                  {isConfirmed ? '✓' : '4'}
                </div>
                <span className="font-mono text-xs font-bold text-neutral-300">Confirmed</span>
              </div>
            </div>
          </div>

          {/* Audit Trail History Table (Screenshot 2) */}
          <div className="rounded-2xl border border-neutral-800 bg-[#09090b] overflow-hidden shadow-xl">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 uppercase text-[11px] tracking-wider bg-black/40">
                  <th className="py-3 px-5">User</th>
                  <th className="py-3 px-5">Action</th>
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-white">
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-900/40">
                      <td className="py-3 px-5 font-bold">{log.actor_role || 'Staff Rep'}</td>
                      <td className="py-3 px-5 text-neutral-300 uppercase">{log.action}</td>
                      <td className="py-3 px-5 text-neutral-400">
                        {new Date(log.action_timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-5 text-neutral-300">{log.justification}</td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr className="hover:bg-neutral-900/40">
                      <td className="py-3 px-5 font-bold">J. Rao</td>
                      <td className="py-3 px-5 text-neutral-300">Submitted</td>
                      <td className="py-3 px-5 text-neutral-400">Aug 20</td>
                      <td className="py-3 px-5 text-neutral-300">Initial 12% discount</td>
                    </tr>
                    <tr className="hover:bg-neutral-900/40">
                      <td className="py-3 px-5 font-bold">M. Shah</td>
                      <td className="py-3 px-5 text-neutral-300">Returned</td>
                      <td className="py-3 px-5 text-neutral-400">Aug 21</td>
                      <td className="py-3 px-5 text-neutral-300">Requested justification</td>
                    </tr>
                    <tr className="hover:bg-neutral-900/40">
                      <td className="py-3 px-5 font-bold">J. Rao</td>
                      <td className="py-3 px-5 text-neutral-300">Resubmitted</td>
                      <td className="py-3 px-5 text-neutral-400">Aug 22</td>
                      <td className="py-3 px-5 text-neutral-300">Added margin note</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Action Input & Buttons (Screenshot 2: Approve, Return for Revision, Reject) */}
          <div className="space-y-4 pt-2">
            {!isConfirmed ? (
              <>
                <input
                  type="text"
                  placeholder="Enter decision note / justification (optional)..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#09090b] border border-neutral-800 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                />

                <div className="flex flex-wrap items-center gap-4">
                  {/* Approve -> Confirmed */}
                  <button
                    type="button"
                    onClick={() => handleDecision('approved')}
                    disabled={actionLoading}
                    className="px-8 py-3.5 rounded-2xl bg-[#22c55e] hover:bg-emerald-600 text-black font-mono text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                  >
                    Approve
                  </button>

                  {/* Return for Revision -> Negotiating */}
                  <button
                    type="button"
                    onClick={() => handleDecision('returned_for_revision')}
                    disabled={actionLoading}
                    className="px-6 py-3.5 rounded-2xl bg-[#d97706] hover:bg-amber-600 text-white font-mono text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-amber-600/20 cursor-pointer disabled:opacity-50"
                  >
                    Return for Revision
                  </button>

                  {/* Reject */}
                  <button
                    type="button"
                    onClick={() => handleDecision('rejected')}
                    disabled={actionLoading}
                    className="px-6 py-3.5 rounded-2xl bg-[#f87171] hover:bg-red-500 text-black font-mono text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-red-500/20 cursor-pointer disabled:opacity-50"
                  >
                    Reject
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/quotations/${activeQuote.id}/edit`)}
                    className="ml-auto px-4 py-3 rounded-2xl bg-[#09090b] hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-xs font-bold uppercase transition-colors"
                  >
                    Re-negotiate &amp; Adjust Line Items &rarr;
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
      {/* VIEW 2: APPROVALS LIST SCREEN (SCREENSHOT 3)         */}
      {/* ---------------------------------------------------- */}
      {!selectedQuoteId && (
        <div className="space-y-8">
          {/* Header & Subtitle (Screenshot 3) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
            <div className="space-y-1">
              <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
                Approvals (List)
              </h1>
              <p className="text-xs font-mono text-neutral-400">
                Every quotation that needed, needs, or is going through discount approval
              </p>
            </div>

            <button
              onClick={() => loadApprovals()}
              className="p-3 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Top Summary Pills (Screenshot 3: 3 Pending, 1 Returned, 12 Approved) */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setPendingOnly(false)}
              className="px-5 py-2 rounded-2xl bg-[#d97706] text-black font-mono text-xs font-black uppercase tracking-wider shadow cursor-pointer hover:opacity-90"
            >
              {pendingQuotes.length} Pending
            </button>
            <button
              onClick={() => setPendingOnly(false)}
              className="px-5 py-2 rounded-2xl bg-[#f43f5e] text-black font-mono text-xs font-black uppercase tracking-wider shadow cursor-pointer hover:opacity-90"
            >
              {returnedQuotes.length} Returned
            </button>
            <button
              onClick={() => setPendingOnly(false)}
              className="px-5 py-2 rounded-2xl bg-[#10b981] text-black font-mono text-xs font-black uppercase tracking-wider shadow cursor-pointer hover:opacity-90"
            >
              {approvedQuotes.length} Approved
            </button>
          </div>

          {/* Table (Screenshot 3: Quotation | Customer | Blended Risk | Stage | Assigned To) */}
          <div className="rounded-3xl border border-neutral-800 bg-[#09090b] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 uppercase text-[11px] tracking-wider bg-black/40">
                    <th className="py-4 px-6">Quotation</th>
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Blended Risk</th>
                    <th className="py-4 px-6">Stage</th>
                    <th className="py-4 px-6">Assigned To</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-white">
                  {displayedQuotes.length > 0 ? (
                    displayedQuotes.map((q) => {
                      const riskScore = Number(q.blended_risk_score || 0);
                      const riskText = riskScore > 15 ? 'HIGH' : riskScore > 5 ? 'MEDIUM' : 'LOW';
                      const stageText =
                        q.status === 'pending_manager'
                          ? 'Sales Manager'
                          : q.status === 'pending_finance'
                          ? 'Finance'
                          : q.status === 'confirmed' || q.status === 'approved'
                          ? 'Confirmed'
                          : q.status === 'under_negotiation'
                          ? 'Under Negotiation'
                          : 'Auto-Approved';

                      return (
                        <tr
                          key={q.id}
                          onClick={() => setSelectedQuoteId(q.id)}
                          className="hover:bg-neutral-900/50 transition-colors cursor-pointer group"
                        >
                          <td className="py-4 px-6 font-bold text-white group-hover:text-cyan-400 transition-colors">
                            {q.quotation_code || q.quotation_number || q.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="py-4 px-6 text-neutral-300">
                            {q.customer_company_name || q.company_name || 'Acme Corp'}
                          </td>
                          <td className="py-4 px-6 font-bold">
                            <span
                              className={
                                riskText === 'HIGH'
                                  ? 'text-rose-400'
                                  : riskText === 'MEDIUM'
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }
                            >
                              {riskText}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-neutral-300">{stageText}</td>
                          <td className="py-4 px-6 text-neutral-400">
                            {q.assigned_rep_name || 'M. Shah'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-neutral-500 font-mono text-xs">
                        NO APPROVALS IN THIS QUEUE
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Yellow/Amber Banner below table (Screenshot 3) */}
          <div className="p-3.5 rounded-2xl border border-neutral-800 bg-neutral-950/80 text-amber-300/90 font-mono text-xs">
            Click any row to open its full approval detail, risk breakdown, and audit trail.
          </div>

          {/* Filter button (Screenshot 3) */}
          <div>
            <button
              onClick={() => setPendingOnly(!pendingOnly)}
              className={`px-5 py-2.5 rounded-2xl border font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
                pendingOnly
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : 'bg-[#09090b] border-neutral-700 text-neutral-300 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{pendingOnly ? 'Showing: Pending Only' : 'Filter: Pending Only'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
