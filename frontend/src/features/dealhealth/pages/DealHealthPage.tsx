import React, { useEffect, useState, useMemo } from 'react';
import { useDealHealth } from '../hook/useDealHealth';
import { useAuth } from '@/features/auth/hook/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  Clock,
  TrendingDown,
  Truck,
  ShieldCheck,
  Send,
  ArrowUpRight,
  CheckCircle2,
  Filter,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Crown,
  Lock,
  Sparkles,
} from 'lucide-react';
import { toast } from 'react-toastify';

export const DealHealthPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { alerts, loading, sweeping, error, loadAlerts, resolveAlert, recordAction, runSweep } =
    useDealHealth();

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'sales_manager';
  const isFinance = user?.role === 'finance';
  const isSalesRep = user?.role === 'sales_rep';

  // Active filter tab: 'all' | 'stalled_deal' | 'discount_anomaly' | 'delivery_slippage' | 'escalated_to_admin'
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Strictly filter out any resolved alerts: resolved deals are removed from everywhere
  const activeAlerts = useMemo(
    () => alerts.filter((a) => !a.is_resolved),
    [alerts]
  );

  // Derived metrics from active database alerts
  const stalledAlerts = useMemo(
    () => activeAlerts.filter((a) => a.alert_type === 'stalled_deal'),
    [activeAlerts]
  );
  const discountAlerts = useMemo(
    () => activeAlerts.filter((a) => a.alert_type === 'discount_anomaly'),
    [activeAlerts]
  );
  const slippageAlerts = useMemo(
    () => activeAlerts.filter((a) => a.alert_type === 'delivery_slippage'),
    [activeAlerts]
  );
  const escalatedToAdminAlerts = useMemo(
    () => activeAlerts.filter((a) => a.action_status === 'Escalated to Admin'),
    [activeAlerts]
  );

  // Filtered list based on selected category
  const filteredAlerts = useMemo(() => {
    if (selectedCategory === 'all') return activeAlerts;
    if (selectedCategory === 'escalated_to_admin') {
      return activeAlerts.filter((a) => a.action_status === 'Escalated to Admin');
    }
    return activeAlerts.filter((a) => a.alert_type === selectedCategory);
  }, [activeAlerts, selectedCategory]);

  // Strict permission check: Sales Reps are NOT allowed to access Deal Health
  if (isSalesRep) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-12 px-4 font-sans">
        <div className="app-card p-8 border-rose-200 bg-rose-50/60 rounded-3xl space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center mx-auto text-rose-700 shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-display font-black text-2xl text-rose-950 uppercase tracking-tight">
            ACCESS RESTRICTED
          </h2>
          <p className="text-xs text-rose-800 font-mono max-w-md mx-auto leading-relaxed">
            The Deal Health and Anomaly Dashboard is restricted exclusively to <strong>Sales Managers</strong>, <strong>Finance Directors</strong>, and <strong>System Administrators</strong>. Sales Reps do not have telemetry access.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/quotations')}
              className="btn btn-secondary px-6 py-2.5 text-xs font-mono rounded-full"
            >
              Go to My Quotations
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleNudge = async (alertId: string, repName?: string) => {
    await recordAction(alertId, 'Nudge sent');
    toast.info(`Nudge notification dispatched to sales rep (${repName || 'Account Owner'})`);
  };

  const handleEscalateToAdmin = async (alertId: string) => {
    await recordAction(alertId, 'Escalated to Admin');
    toast.warn('Deal escalated to Administrator for executive review.');
  };

  // When Admin resolves an escalation, it is completely removed from the dashboard for everyone
  const handleAdminResolve = async (alertId: string) => {
    await resolveAlert(alertId);
    toast.success('Admin resolved this deal! Removed from Deal Health everywhere.');
  };

  const handleBatchEscalateToAdmin = async () => {
    const pending = filteredAlerts.filter(
      (a) => a.action_status !== 'Escalated to Admin'
    );
    if (pending.length === 0) {
      toast.info('No pending flagged deals requiring escalation to Admin.');
      return;
    }
    for (const a of pending) {
      await recordAction(a.id, 'Escalated to Admin');
    }
    toast.success(`Escalated ${pending.length} flagged deals to System Administrator.`);
  };

  const handleBatchAdminResolve = async () => {
    const adminEscalated = filteredAlerts.filter(
      (a) => a.action_status === 'Escalated to Admin'
    );
    if (adminEscalated.length === 0) {
      toast.info('No active Admin escalations to resolve.');
      return;
    }
    for (const a of adminEscalated) {
      await resolveAlert(a.id);
    }
    toast.success(`Resolved ${adminEscalated.length} escalated deals. Purged from Deal Health.`);
  };

  const handleBatchNudge = async () => {
    const unnudged = filteredAlerts.filter(
      (a) => a.action_status !== 'Nudge sent'
    );
    if (unnudged.length === 0) {
      toast.info('All active deals have already been nudged.');
      return;
    }
    for (const a of unnudged) {
      await recordAction(a.id, 'Nudge sent');
    }
    toast.success(`Nudge reminders sent for ${unnudged.length} flagged deals.`);
  };

  // Format date: "Aug 24", "Aug 25", "Sep 5"
  const formatFlagDate = (dateStr?: string) => {
    if (!dateStr) return 'Recent';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* Top Header matching Global CSS layout & User Reference Photo */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="app-screen-tag mb-2">
            SCREEN 9 // DEAL HEALTH &amp; ANOMALY RADAR
            {isAdmin && <span className="text-amber-700 ml-1.5 font-bold">• ADMIN EXECUTIVE MODE</span>}
            {isManager && <span className="text-neutral-600 ml-1.5 font-bold">• SALES MANAGEMENT VIEW</span>}
            {isFinance && <span className="text-emerald-700 ml-1.5 font-bold">• FINANCE CONTROLLER VIEW</span>}
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#111111] uppercase tracking-tight">
            Deal Health and Anomaly Dashboard
          </h1>
          <p className="app-page-subtitle">
            Real-time flags for stalled deals and unusual discount patterns
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => runSweep(3)}
            disabled={sweeping}
            className="btn btn-primary rounded-full shadow-sm"
            title="Trigger automated database scan for stalled negotiations and anomalies"
          >
            <Activity className={`w-4 h-4 ${sweeping ? 'animate-spin' : ''}`} />
            <span>{sweeping ? 'SWEEPING...' : 'RUN HEALTH SWEEP'}</span>
          </button>

          <button
            onClick={loadAlerts}
            className="btn-icon rounded-full"
            title="Refresh Telemetry Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && !loading && (
        <div className="app-alert-danger font-mono text-xs">
          {error}
        </div>
      )}

      {/* ADMIN EXCLUSIVE HIGHLIGHT: Deals Escalated to Admin by Manager or Finance */}
      {isAdmin && escalatedToAdminAlerts.length > 0 && (
        <div className="app-card border-rose-300 bg-rose-50/70 p-5 sm:p-6 space-y-3 shadow-sm animate-fadeIn rounded-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200/60 pb-3">
            <div className="flex items-center gap-2 text-rose-900 font-mono font-bold text-xs uppercase tracking-wider">
              <Crown className="w-4 h-4 text-rose-600" />
              <span>⚡ EXECUTIVE ESCALATIONS AWAITING ADMIN DECISION ({escalatedToAdminAlerts.length})</span>
            </div>
            <span className="text-[11px] font-mono text-rose-700 font-bold bg-rose-100 px-3.5 py-1 rounded-full border border-rose-300">
              ESCALATED BY SALES MANAGER / FINANCE
            </span>
          </div>

          <p className="text-xs text-rose-800 font-mono leading-relaxed">
            Sales Managers and Finance have escalated <strong>{escalatedToAdminAlerts.length} critical deals</strong> to your attention. Click <strong>Admin Resolve</strong> on any deal row below to settle it and remove it from Deal Health across all systems.
          </p>
        </div>
      )}

      {/* Top 3 Metric Blocks matching User Reference Photo using Global CSS tokens */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
        {/* Block 1: Stalled Deals */}
        <div
          onClick={() => setSelectedCategory(selectedCategory === 'stalled_deal' ? 'all' : 'stalled_deal')}
          className={`app-card p-6 cursor-pointer transition-all rounded-3xl ${
            selectedCategory === 'stalled_deal'
              ? 'ring-2 ring-[#ff3b30] shadow-md'
              : 'hover:border-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <h3 className="font-display font-black text-lg text-neutral-900 uppercase tracking-tight">
                Stalled Deals
              </h3>
            </div>
            <span className="app-badge badge-pending">
              {stalledAlerts.length} ACTIVE
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <div className="font-display font-black text-3xl text-neutral-900">
              {stalledAlerts.length} Quotes
            </div>
            <p className="text-xs font-mono text-neutral-500">
              {stalledAlerts.length > 0
                ? `${stalledAlerts.length} quotes idle 7+ days without buyer confirmation`
                : 'No stalled deals detected; healthy velocity'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>SLA: &gt; 3 Days Inactive</span>
            <span className="text-amber-700 font-bold hover:underline">
              {selectedCategory === 'stalled_deal' ? 'Filtering • Reset' : 'Filter View →'}
            </span>
          </div>
        </div>

        {/* Block 2: Discount Anomalies */}
        <div
          onClick={() => setSelectedCategory(selectedCategory === 'discount_anomaly' ? 'all' : 'discount_anomaly')}
          className={`app-card p-6 cursor-pointer transition-all rounded-3xl ${
            selectedCategory === 'discount_anomaly'
              ? 'ring-2 ring-[#ff3b30] shadow-md'
              : 'hover:border-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-rose-600" />
              <h3 className="font-display font-black text-lg text-neutral-900 uppercase tracking-tight">
                Discount Anomalies
              </h3>
            </div>
            <span className="app-badge badge-backorder">
              {discountAlerts.length} ANOMALIES
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <div className="font-display font-black text-3xl text-neutral-900">
              {discountAlerts.length} Breaches
            </div>
            <p className="text-xs font-mono text-neutral-500">
              {discountAlerts.length > 0
                ? `${discountAlerts.length} line discounts significantly above sales rep average`
                : 'All discounts within authorized rep variance'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>Historical Ceiling: 6.0% Rep Avg</span>
            <span className="text-rose-700 font-bold hover:underline">
              {selectedCategory === 'discount_anomaly' ? 'Filtering • Reset' : 'Filter View →'}
            </span>
          </div>
        </div>

        {/* Block 3: Delivery Slippage */}
        <div
          onClick={() => setSelectedCategory(selectedCategory === 'delivery_slippage' ? 'all' : 'delivery_slippage')}
          className={`app-card p-6 cursor-pointer transition-all rounded-3xl ${
            selectedCategory === 'delivery_slippage'
              ? 'ring-2 ring-[#ff3b30] shadow-md'
              : 'hover:border-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-purple-600" />
              <h3 className="font-display font-black text-lg text-neutral-900 uppercase tracking-tight">
                Delivery Slippage
              </h3>
            </div>
            <span className="app-badge badge-fulfillment">
              {slippageAlerts.length} AT RISK
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <div className="font-display font-black text-3xl text-neutral-900">
              {slippageAlerts.length} Contracts
            </div>
            <p className="text-xs font-mono text-neutral-500">
              {slippageAlerts.length > 0
                ? `${slippageAlerts.length} promise dates at risk / warehouse backorder holds`
                : 'All order promises reconciled with stock'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>Inventory Deficit Detection</span>
            <span className="text-purple-700 font-bold hover:underline">
              {selectedCategory === 'delivery_slippage' ? 'Filtering • Reset' : 'Filter View →'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Flagged Deals Table matching Reference Photo Layout with Global CSS tables.css */}
      <div className="app-card space-y-4 p-6 sm:p-8 rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#ff3b30]" />
            <h2 className="font-display font-black text-xl text-neutral-900 uppercase tracking-tight">
              Flagged Deals Ledger ({filteredAlerts.length})
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-neutral-500">Category Filter:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="app-select py-1.5 px-3 text-xs w-auto cursor-pointer rounded-full"
            >
              <option value="all">All Active Risks ({activeAlerts.length})</option>
              <option value="stalled_deal">Stalled Deals ({stalledAlerts.length})</option>
              <option value="discount_anomaly">Discount Anomalies ({discountAlerts.length})</option>
              <option value="delivery_slippage">Delivery Slippage ({slippageAlerts.length})</option>
              <option value="escalated_to_admin">
                Escalated to Admin ({escalatedToAdminAlerts.length})
              </option>
            </select>
          </div>
        </div>

        <div className="app-table-wrapper rounded-2xl overflow-hidden">
          <div className="app-table-scroll">
            <table className="app-table">
              <thead className="app-thead">
                <tr>
                  <th className="app-th">Deal</th>
                  <th className="app-th">Issue</th>
                  <th className="app-th">Flagged</th>
                  <th className="app-th">Severity</th>
                  <th className="app-th app-th-right min-w-[320px] whitespace-nowrap">Action &amp; Governance</th>
                </tr>
              </thead>
              <tbody className="app-tbody app-tbody-divide">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="app-table-empty">
                      <div className="w-6 h-6 border-2 border-neutral-300 border-t-[#ff3b30] rounded-full animate-spin mx-auto mb-2" />
                      Auditing deal pipeline health telemetry...
                    </td>
                  </tr>
                ) : filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="app-table-empty">
                      <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                      <p className="font-bold text-neutral-900">Zero active alerts in this category!</p>
                      <p className="text-neutral-500 text-xs mt-0.5">All quotations are progressing within normal velocity boundaries.</p>
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((al) => {
                    const actionTaken = al.action_status || 'Pending Review';
                    const isEscalatedToAdmin = actionTaken === 'Escalated to Admin';

                    return (
                      <tr key={al.id} className="app-tr group">
                        {/* Deal Column: Customer and Quotation code */}
                        <td className="app-td">
                          <div>
                            <div className="font-bold text-neutral-900 text-sm">
                              {al.customer_name || 'Client Account'}
                            </div>
                            <Link
                              to={`/quotations/${al.quotation_id}`}
                              className="inline-flex items-center gap-1 font-mono text-xs text-[#ff3b30] hover:underline mt-0.5"
                            >
                              <span>{al.quotation_code || 'View Quote'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </td>

                        {/* Issue Column */}
                        <td className="app-td font-mono text-xs text-neutral-700 max-w-md">
                          <div className="font-medium">
                            {al.description || 'Attention required on lingering deal progression.'}
                          </div>
                          <div className="text-[10px] text-neutral-400 mt-0.5">
                            Assigned Rep: <strong className="text-neutral-600">{al.assigned_rep_name || 'Rachel Rep'}</strong>
                          </div>
                        </td>

                        {/* Flagged Date Column */}
                        <td className="app-td font-mono text-xs text-neutral-500 whitespace-nowrap">
                          {formatFlagDate(al.created_at)}
                        </td>

                        {/* Severity Badge */}
                        <td className="app-td whitespace-nowrap">
                          <span
                            className={`app-badge ${
                              al.severity === 'critical'
                                ? 'badge-backorder'
                                : al.severity === 'medium'
                                ? 'badge-pending'
                                : 'badge-draft'
                            }`}
                          >
                            {al.severity || 'medium'}
                          </span>
                        </td>

                        {/* Action Column: PERFECT ROUND PILL BADGE & BUTTONS (NO WRAPPING) */}
                        <td className="app-td app-td-right min-w-[320px] whitespace-nowrap">
                          <div className="inline-flex items-center gap-2.5 justify-end shrink-0">
                            {/* PERFECT ROUND PILL STATUS BADGE */}
                            <span
                              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase whitespace-nowrap shrink-0 leading-none shadow-xs border transition-all ${
                                isEscalatedToAdmin
                                  ? 'bg-rose-50 border-rose-300 text-rose-800 ring-1 ring-rose-200'
                                  : actionTaken === 'Nudge sent'
                                  ? 'bg-blue-50 border-blue-300 text-blue-800 ring-1 ring-blue-200'
                                  : 'bg-neutral-100 border-neutral-300 text-neutral-700'
                              }`}
                            >
                              {isEscalatedToAdmin ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                                  <span>Escalated to Admin</span>
                                </>
                              ) : actionTaken === 'Nudge sent' ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>Nudge Sent</span>
                                </>
                              ) : (
                                <span>{actionTaken}</span>
                              )}
                            </span>

                            {/* Row Action Trigger: Nudge Rep */}
                            <button
                              onClick={() => handleNudge(al.id, al.assigned_rep_name)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95 shadow-xs"
                              title="Send nudge to sales rep"
                            >
                              <Send className="w-3 h-3" />
                              <span>Nudge</span>
                            </button>

                            {/* If Manager or Finance: Show Escalate to Admin button */}
                            {!isAdmin ? (
                              <button
                                onClick={() => handleEscalateToAdmin(al.id)}
                                disabled={isEscalatedToAdmin}
                                className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95 shadow-xs ${
                                  isEscalatedToAdmin
                                    ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300'
                                }`}
                                title="Escalate this deal to System Administrator"
                              >
                                <span>{isEscalatedToAdmin ? 'Escalated' : 'Escalate to Admin'}</span>
                              </button>
                            ) : isEscalatedToAdmin ? (
                              /* Admin Resolution Button: ONLY shown if escalated to admin. Resolves & purges deal everywhere */
                              <button
                                onClick={() => handleAdminResolve(al.id)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
                                title="Admin Resolution: settles escalated deal and removes it from Deal Health everywhere"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Admin Resolve</span>
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Trigger Buttons matching Reference Photo Bottom Bar */}
      <div className="flex flex-wrap items-center gap-4 pt-2">
        {!isAdmin ? (
          <button
            onClick={handleBatchEscalateToAdmin}
            className="px-6 py-2.5 rounded-full font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm hover:brightness-105 active:scale-95"
            style={{ backgroundColor: '#f87171', color: '#18181b' }}
          >
            Escalate to Admin
          </button>
        ) : escalatedToAdminAlerts.length > 0 ? (
          <button
            onClick={handleBatchAdminResolve}
            className="px-6 py-2.5 rounded-full font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm hover:brightness-105 active:scale-95 bg-emerald-600 text-white"
          >
            Admin Resolve Escalations ({escalatedToAdminAlerts.length})
          </button>
        ) : null}

        <button
          onClick={handleBatchNudge}
          className="px-6 py-2.5 rounded-full font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm hover:brightness-105 active:scale-95"
          style={{ backgroundColor: '#60a5fa', color: '#0f172a' }}
        >
          Nudge Reps
        </button>

        <span className="text-xs font-mono text-neutral-500">
          Staff reviews the Deal Health dashboard throughout the cycle to catch stalled or risky deals early.
        </span>
      </div>
    </div>
  );
};

export default DealHealthPage;
