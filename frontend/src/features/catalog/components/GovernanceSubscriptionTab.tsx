import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  fetchSubscriptionsApi,
  fetchSubscriptionDetailApi,
  updateSubscriptionStatusApi,
  cancelSubscriptionApi,
  adjustSubscriptionSeatsApi,
  fetchSubscriptionPlansApi,
  createSubscriptionPlanApi,
  updateCustomerTierApi,
} from '../services/subscription.api';
import {
  fetchGovernanceRulesApi,
  saveGovernanceRuleApi,
} from '@/features/approvals/services/approvals.api';
import { fetchCategoriesApi } from '../services/catalog.api';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  RefreshCw,
  Sliders,
  Shield,
  Percent,
  Layers,
  ChevronRight,
  Calendar,
  DollarSign,
  X,
  CreditCard,
  Settings2,
  Play,
  Pause,
  Award,
  User,
} from 'lucide-react';
import { toast } from 'react-toastify';

export const GovernanceSubscriptionTab: React.FC = () => {
  // Subscriptions & Plans
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'canceled'>('all');
  const [selectedSubDetail, setSelectedSubDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Modals & Forms
  const [showNewPlanModal, setShowNewPlanModal] = useState<boolean>(false);
  const [showModifyModal, setShowModifyModal] = useState<boolean>(false);
  const [modifyQty, setModifyQty] = useState<number>(1);
  const [newPlanName, setNewPlanName] = useState<string>('');
  const [newPlanCadence, setNewPlanCadence] = useState<'monthly' | 'yearly'>('monthly');
  const [newPlanInterval, setNewPlanInterval] = useState<number>(30);

  // Customer Tier Discount Governance Matrix
  const [rules, setRules] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [savingRuleTier, setSavingRuleTier] = useState<string | null>(null);
  const [editingTierDiscounts, setEditingTierDiscounts] = useState<Record<string, Record<string, number>>>({});

  // Loading States
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subsRes, plansRes, rulesRes, catRes] = await Promise.all([
        fetchSubscriptionsApi().catch(() => ({ subscriptions: [] })),
        fetchSubscriptionPlansApi().catch(() => ({ plans: [] })),
        fetchGovernanceRulesApi().catch(() => ({ rules: [] })),
        fetchCategoriesApi().catch(() => ({ categories: [] })),
      ]);

      const subs = subsRes.subscriptions || subsRes || [];
      setSubscriptions(subs);
      setPlans(plansRes.plans || plansRes || []);
      const rList = rulesRes.rules || [];
      setRules(rList);
      const cats = catRes.categories || [];
      setCategories(cats);

      // Build editing structure for tier discount ceilings
      const tiers = ['Platinum', 'Gold', 'Silver', 'Bronze'];
      const initialMap: Record<string, Record<string, number>> = {};
      tiers.forEach((t) => {
        initialMap[t] = {};
        cats.forEach((c) => {
          const rule = rList.find((r: any) => r.tier === t && r.category_id === c.id);
          initialMap[t][c.id] = rule ? Number(rule.max_discount_pct) : Number(c.default_discount_ceiling_pct || 10);
        });
      });
      setEditingTierDiscounts(initialMap);
    } catch (err: any) {
      toast.error('Failed to load subscription governance telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDetail = async (subId: string) => {
    try {
      setLoadingDetail(true);
      const res = await fetchSubscriptionDetailApi(subId);
      const detail = res.subscription || res;
      setSelectedSubDetail(detail);
      setModifyQty(detail.quantity || 1);
    } catch (err: any) {
      toast.error('Failed to load billing details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCancelSub = async (subId: string) => {
    if (!window.confirm('Are you sure you want to cancel this recurring subscription contract?')) return;
    try {
      setSaving(true);
      await cancelSubscriptionApi(subId);
      toast.success('Subscription canceled and credit note generated.');
      if (selectedSubDetail?.id === subId) {
        setSelectedSubDetail({ ...selectedSubDetail, status: 'canceled' });
      }
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel subscription.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (subId: string, newStatus: string) => {
    try {
      setSaving(true);
      await updateSubscriptionStatusApi(subId, newStatus);
      toast.success(`Subscription marked as ${newStatus}.`);
      if (selectedSubDetail?.id === subId) {
        setSelectedSubDetail({ ...selectedSubDetail, status: newStatus });
      }
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update subscription status.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCustomerTier = async (customerId: string, newTier: string) => {
    try {
      setSaving(true);
      await updateCustomerTierApi(customerId, newTier);
      toast.success(`Customer plan updated to ${newTier} Tier.`);
      if (selectedSubDetail && selectedSubDetail.customer_id === customerId) {
        setSelectedSubDetail({ ...selectedSubDetail, customer_tier: newTier });
      }
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update customer tier.');
    } finally {
      setSaving(false);
    }
  };

  const handleModifySeats = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubDetail) return;
    try {
      setSaving(true);
      await adjustSubscriptionSeatsApi(selectedSubDetail.id, Number(modifyQty));
      toast.success(`Subscription updated to ${modifyQty} seats with proration.`);
      setShowModifyModal(false);
      await handleOpenDetail(selectedSubDetail.id);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to adjust subscription seats.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) {
      toast.error('Plan name is required.');
      return;
    }
    try {
      setSaving(true);
      await createSubscriptionPlanApi({
        name: newPlanName.trim(),
        cadence: newPlanCadence,
        billingIntervalDays: Number(newPlanInterval),
        allowsProration: true,
      });
      toast.success(`Subscription plan "${newPlanName}" created!`);
      setNewPlanName('');
      setShowNewPlanModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create plan.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTierDiscounts = async (tier: string) => {
    try {
      setSavingRuleTier(tier);
      const tierMap = editingTierDiscounts[tier] || {};
      for (const cat of categories) {
        const pct = tierMap[cat.id];
        if (pct !== undefined) {
          await saveGovernanceRuleApi({
            tier: tier as any,
            categoryId: cat.id,
            maxDiscountPct: Number(pct),
          });
        }
      }
      toast.success(`${tier} Tier discount ceilings successfully saved!`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || `Failed to update ${tier} ceilings.`);
    } finally {
      setSavingRuleTier(null);
    }
  };

  // Filtered subscriptions
  const filteredSubs = subscriptions.filter((s) => {
    if (statusFilter === 'all') return true;
    return s.status?.toLowerCase() === statusFilter.toLowerCase();
  });

  const activeCount = subscriptions.filter((s) => s.status === 'active').length;
  const pausedCount = subscriptions.filter((s) => s.status === 'paused').length;
  const canceledCount = subscriptions.filter((s) => s.status === 'canceled').length;

  return (
    <div className="space-y-10 animate-pageEnter">
      {/* 1. CUSTOMER TIER DISCOUNT PLANS & CEILINGS */}
      <div className="app-card p-6 rounded-3xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-200 gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#ff3b30]">
              <Shield className="w-3.5 h-3.5" />
              <span>TIER DISCOUNT CEILINGS &amp; GOVERNANCE MATRIX</span>
            </div>
            <h2 className="font-display font-black text-2xl text-neutral-900 uppercase tracking-tight mt-1">
              Customer Tier Plans &amp; Discount Caps
            </h2>
            <p className="text-xs font-mono text-neutral-500 mt-0.5">
              Admin controls: Modify max allowable discount % per customer tier (Platinum, Gold, Silver, Bronze) across product categories.
            </p>
          </div>

          <button
            onClick={() => setShowNewPlanModal(true)}
            className="btn btn-primary rounded-full shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Plan (Admin)</span>
          </button>
        </div>

        {/* 4 Tier Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['Platinum', 'Gold', 'Silver', 'Bronze'].map((tier) => {
            const isSaving = savingRuleTier === tier;
            const tierBadgeClass =
              tier === 'Platinum'
                ? 'bg-purple-100 text-purple-800 border-purple-300'
                : tier === 'Gold'
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : tier === 'Silver'
                ? 'bg-slate-100 text-slate-800 border-slate-300'
                : 'bg-orange-100 text-orange-800 border-orange-300';

            return (
              <div
                key={tier}
                className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/60 flex flex-col justify-between space-y-4 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${tierBadgeClass}`}>
                      {tier.toUpperCase()} TIER
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">Discount Ceilings</span>
                  </div>

                  <div className="mt-3 space-y-2.5">
                    {categories.map((cat) => {
                      const currentVal = editingTierDiscounts[tier]?.[cat.id] ?? 10;
                      return (
                        <div key={cat.id} className="flex items-center justify-between text-xs font-mono">
                          <span className="text-neutral-600 truncate max-w-[120px]" title={cat.name}>
                            {cat.name.split(' ')[0]}
                          </span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={currentVal}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setEditingTierDiscounts((prev) => ({
                                  ...prev,
                                  [tier]: {
                                    ...(prev[tier] || {}),
                                    [cat.id]: val,
                                  },
                                }));
                              }}
                              className="w-16 px-2 py-1 rounded-lg border border-neutral-300 bg-white font-mono text-right text-xs font-bold text-neutral-900 focus:ring-1 focus:ring-[#ff3b30] focus:border-[#ff3b30]"
                            />
                            <span className="text-neutral-400 font-bold">%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => handleSaveTierDiscounts(tier)}
                  disabled={isSaving}
                  className="w-full py-1.5 px-3 rounded-full text-xs font-mono font-bold uppercase transition-all duration-200 bg-neutral-900 hover:bg-black text-white active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : `Save ${tier} Caps`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Existing Plans Ticker */}
        {plans.length > 0 && (
          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-mono text-neutral-600">
            <span className="font-bold text-neutral-900 uppercase">Available Cadence Plans:</span>
            {plans.map((p) => (
              <span
                key={p.id}
                className="px-3 py-1 rounded-full bg-white border border-neutral-200 text-[11px] text-neutral-700 shadow-xs"
              >
                <strong>{p.name}</strong> ({p.cadence}, {p.billing_interval_days}d interval)
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 2. SUBSCRIPTIONS LIST (Matches Screenshot 2) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h3 className="font-display font-black text-2xl sm:text-3xl text-[#111111] uppercase tracking-tight">
              Subscriptions (List)
            </h3>
            <p className="app-page-subtitle">
              Every recurring plan across every customer, regardless of which order it came from
            </p>
          </div>

          {/* Metric Status Pills matching Reference Screenshot 2 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
              className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase transition-all duration-200 cursor-pointer shadow-xs ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                  : 'bg-emerald-500/90 text-white hover:bg-emerald-600'
              }`}
            >
              {activeCount} Active
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'paused' ? 'all' : 'paused')}
              className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase transition-all duration-200 cursor-pointer shadow-xs ${
                statusFilter === 'paused'
                  ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                  : 'bg-amber-600/90 text-white hover:bg-amber-600'
              }`}
            >
              {pausedCount} Paused
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'canceled' ? 'all' : 'canceled')}
              className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase transition-all duration-200 cursor-pointer shadow-xs ${
                statusFilter === 'canceled'
                  ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                  : 'bg-rose-400 text-neutral-900 hover:bg-rose-500'
              }`}
            >
              {canceledCount} Cancelled
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="app-table-wrapper rounded-3xl overflow-hidden shadow-xs border border-neutral-200 bg-white">
          <div className="app-table-scroll">
            <table className="app-table">
              <thead className="app-thead">
                <tr>
                  <th className="app-th">Customer</th>
                  <th className="app-th">Plan &amp; Tier</th>
                  <th className="app-th">Cadence</th>
                  <th className="app-th">Next Bill</th>
                  <th className="app-th">Status</th>
                  <th className="app-th app-th-right">Admin Controls</th>
                </tr>
              </thead>
              <tbody className="app-tbody app-tbody-divide">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="app-table-empty">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#ff3b30]" />
                      Loading active recurring contracts...
                    </td>
                  </tr>
                ) : filteredSubs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="app-table-empty">
                      <Layers className="w-6 h-6 text-neutral-400 mx-auto mb-1.5" />
                      <p className="font-bold text-neutral-800">No subscriptions found</p>
                      <p className="text-xs text-neutral-500">No matching contracts in this category.</p>
                    </td>
                  </tr>
                ) : (
                  filteredSubs.map((sub) => {
                    const isSelected = selectedSubDetail?.id === sub.id;
                    const nextBill = sub.next_billing_date
                      ? new Date(sub.next_billing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '-';
                    const cycle = sub.cadence ? sub.cadence.charAt(0).toUpperCase() + sub.cadence.slice(1) : 'Monthly';
                    const tier = sub.customer_tier || 'Gold';

                    const tierBadgeClass =
                      tier === 'Platinum'
                        ? 'bg-purple-50 text-purple-700 border-purple-300'
                        : tier === 'Gold'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : tier === 'Silver'
                        ? 'bg-sky-50 text-sky-700 border-sky-300'
                        : 'bg-orange-50 text-orange-800 border-orange-300';

                    return (
                      <tr
                        key={sub.id}
                        onClick={() => handleOpenDetail(sub.id)}
                        className={`app-tr cursor-pointer transition-colors duration-200 ${
                          isSelected ? 'bg-neutral-100/90 ring-1 ring-neutral-300' : ''
                        }`}
                      >
                        {/* Customer */}
                        <td className="app-td">
                          <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                            <span className="truncate">{sub.customer_name || 'Client Account'}</span>
                          </div>
                          <div className="text-[11px] font-mono text-neutral-400 truncate max-w-[180px]">
                            {sub.customer_email || sub.customer_contact || 'direct client'}
                          </div>
                        </td>

                        {/* Plan & Tier */}
                        <td className="app-td" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${tierBadgeClass}`}>
                              <Award className="w-3 h-3" />
                              {tier}
                            </span>
                            <select
                              value={tier}
                              onChange={(e) => handleUpdateCustomerTier(sub.customer_id, e.target.value)}
                              title="Change customer membership tier"
                              className="text-[10px] font-mono font-bold bg-white border border-neutral-200 rounded-lg px-1.5 py-0.5 text-neutral-700 hover:border-neutral-400 cursor-pointer shadow-2xs"
                            >
                              <option value="Bronze">Bronze</option>
                              <option value="Silver">Silver</option>
                              <option value="Gold">Gold</option>
                              <option value="Platinum">Platinum</option>
                            </select>
                          </div>
                          <div className="text-[11px] font-mono text-neutral-600 mt-1 truncate max-w-[200px]">
                            {sub.plan_name || sub.product_name || 'Care Plan'}
                          </div>
                        </td>

                        {/* Cadence */}
                        <td className="app-td font-mono text-xs text-neutral-600">
                          {cycle}
                        </td>

                        {/* Next Bill */}
                        <td className="app-td font-mono text-xs text-neutral-500">
                          {nextBill}
                        </td>

                        {/* Status */}
                        <td className="app-td">
                          <span
                            className={`app-badge ${
                              sub.status === 'active'
                                ? 'badge-confirmed'
                                : sub.status === 'paused'
                                ? 'badge-pending'
                                : 'badge-danger'
                            }`}
                          >
                            {sub.status ? sub.status.charAt(0).toUpperCase() + sub.status.slice(1) : 'Active'}
                          </span>
                        </td>

                        {/* Admin Controls */}
                        <td className="app-td app-td-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {sub.status === 'active' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(sub.id, 'paused')}
                                  title="Pause membership"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-bold rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-colors shadow-2xs cursor-pointer"
                                >
                                  <Pause className="w-3 h-3" />
                                  Pause
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelSub(sub.id)}
                                  title="Cancel membership"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-bold rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 transition-colors shadow-2xs cursor-pointer"
                                >
                                  <XCircle className="w-3 h-3" />
                                  Cancel
                                </button>
                              </>
                            ) : sub.status === 'paused' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(sub.id, 'active')}
                                  title="Resume active membership"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-bold rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors shadow-2xs cursor-pointer"
                                >
                                  <Play className="w-3 h-3" />
                                  Resume
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelSub(sub.id)}
                                  title="Cancel membership"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-bold rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 transition-colors shadow-2xs cursor-pointer"
                                >
                                  <XCircle className="w-3 h-3" />
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(sub.id, 'active')}
                                title="Reactivate membership"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-bold rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors shadow-2xs cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Activate
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenDetail(sub.id)}
                              className="btn btn-secondary py-1 px-3 text-[11px] rounded-full"
                            >
                              Details
                            </button>
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

        {/* Callout Banner matching Reference Screenshot 2 */}
        <div className="p-3.5 rounded-2xl border border-amber-300 bg-amber-50/80 text-xs font-mono text-amber-900 flex items-center justify-between gap-3 shadow-xs">
          <span>Click a subscription row to open its billing detail, line items, and proration controls.</span>
          <button
            onClick={() => setShowNewPlanModal(true)}
            className="btn btn-secondary py-1 px-3.5 text-xs rounded-full bg-white text-neutral-900 border-neutral-300 shrink-0"
          >
            + New Plan (Admin)
          </button>
        </div>
      </div>

      {/* 3. BILLING DETAIL VIEW (Matches Reference Screenshot 1) */}
      {selectedSubDetail && (
        <div className="app-card p-6 sm:p-8 rounded-3xl border border-neutral-200 bg-white text-[#111111] space-y-6 shadow-md animate-pageEnter">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-200 gap-4">
            <div>
              <div className="text-[10px] font-mono tracking-widest text-[#ff3b30] uppercase font-bold mb-1">
                CONTRACT TELEMETRY // HYBRID BILLING &amp; PRORATION
              </div>
              <h3 className="font-display font-black text-2xl sm:text-3xl text-[#111111] uppercase tracking-tight">
                Billing Detail: {selectedSubDetail.customer_name} - {selectedSubDetail.plan_name || selectedSubDetail.product_name || 'Care Plan 2yr'}
              </h3>
              <p className="app-page-subtitle">
                Opened by clicking a row on the Subscriptions list
              </p>
            </div>

            <button
              onClick={() => setSelectedSubDetail(null)}
              className="btn-icon"
              title="Close detail"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section 1: One-Time Lines (from originating order) */}
          <div className="space-y-3">
            <h4 className="text-sm font-mono font-bold text-sky-700 uppercase tracking-wide">
              One-Time Lines (from originating order)
            </h4>
            <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-neutral-50/80">
              <table className="w-full text-left font-mono text-xs text-neutral-800">
                <thead className="bg-neutral-100 text-neutral-600 uppercase text-[10px] border-b border-neutral-200">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/70">
                  {selectedSubDetail.oneTimeLines && selectedSubDetail.oneTimeLines.length > 0 ? (
                    selectedSubDetail.oneTimeLines.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-neutral-100/50 transition-colors">
                        <td className="p-3 font-medium text-neutral-900">{item.product_name || item.name || 'Equipment'}</td>
                        <td className="p-3 text-center text-neutral-600">{item.quantity}</td>
                        <td className="p-3 text-right font-bold text-neutral-900">
                          ₹{Number(item.line_total || item.total_amount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-3 font-medium text-neutral-900">Laptop Pro 14</td>
                      <td className="p-3 text-center text-neutral-600">2</td>
                      <td className="p-3 text-right font-bold text-neutral-900">₹2,280</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Recurring Lines */}
          <div className="space-y-3">
            <h4 className="text-sm font-mono font-bold text-sky-700 uppercase tracking-wide">
              Recurring Lines
            </h4>
            <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-neutral-50/80">
              <table className="w-full text-left font-mono text-xs text-neutral-800">
                <thead className="bg-neutral-100 text-neutral-600 uppercase text-[10px] border-b border-neutral-200">
                  <tr>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Cycle</th>
                    <th className="p-3">Next Bill Date</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/70">
                  <tr className="hover:bg-neutral-100/50 transition-colors">
                    <td className="p-3 font-medium text-neutral-900">
                      {selectedSubDetail.plan_name || 'Care Plan 2yr'} ({selectedSubDetail.quantity || 1} seats)
                    </td>
                    <td className="p-3 text-neutral-600">
                      {selectedSubDetail.cadence ? selectedSubDetail.cadence.charAt(0).toUpperCase() + selectedSubDetail.cadence.slice(1) : 'Monthly'}
                    </td>
                    <td className="p-3 text-neutral-500">
                      {selectedSubDetail.next_billing_date ? new Date(selectedSubDetail.next_billing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Sep 15'}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-700">
                      ₹{Number(selectedSubDetail.unit_recurring_price || 46).toFixed(2)}/mo
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Action Controls (Modify Subscription & Cancel Subscription & Tier Changer) */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-neutral-200">
            {/* Membership Tier Changer */}
            <div className="flex items-center gap-2 bg-neutral-100 px-3 py-1.5 rounded-full border border-neutral-200">
              <span className="text-[11px] font-mono text-neutral-600 uppercase font-bold">Tier:</span>
              <select
                value={selectedSubDetail.customer_tier || 'Gold'}
                onChange={(e) => handleUpdateCustomerTier(selectedSubDetail.customer_id, e.target.value)}
                className="bg-white border border-neutral-300 text-neutral-900 text-xs font-mono font-bold rounded-lg px-2 py-0.5 focus:border-[#ff3b30]"
              >
                <option value="Bronze">Bronze</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum</option>
              </select>
            </div>

            <button
              onClick={() => setShowModifyModal(true)}
              className="btn btn-secondary rounded-full"
            >
              Modify Seats
            </button>

            {selectedSubDetail.status === 'active' ? (
              <button
                onClick={() => handleUpdateStatus(selectedSubDetail.id, 'paused')}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-mono font-bold text-xs uppercase tracking-wider bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-all cursor-pointer active:scale-95"
              >
                <Pause className="w-3.5 h-3.5" />
                Pause Membership
              </button>
            ) : selectedSubDetail.status === 'paused' ? (
              <button
                onClick={() => handleUpdateStatus(selectedSubDetail.id, 'active')}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-mono font-bold text-xs uppercase tracking-wider bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-all cursor-pointer active:scale-95"
              >
                <Play className="w-3.5 h-3.5" />
                Resume Membership
              </button>
            ) : (
              <button
                onClick={() => handleUpdateStatus(selectedSubDetail.id, 'active')}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-mono font-bold text-xs uppercase tracking-wider bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-all cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Reactivate Membership
              </button>
            )}

            {selectedSubDetail.status !== 'canceled' && (
              <button
                onClick={() => handleCancelSub(selectedSubDetail.id)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-mono font-bold text-xs uppercase tracking-wider bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel Membership
              </button>
            )}

            <span className="text-xs font-mono text-neutral-500 ml-auto flex items-center gap-2">
              Status: <strong className="uppercase text-neutral-900 px-2.5 py-0.5 rounded-full bg-neutral-100 border border-neutral-200">{selectedSubDetail.status}</strong>
            </span>
          </div>
        </div>
      )}

      {/* MODAL: Modify Subscription Seats */}
      {showModifyModal &&
        createPortal(
          <div
            className="app-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModifyModal(false);
            }}
          >
            <div className="app-modal-dialog max-w-md w-full bg-white text-[#111111] shadow-2xl border border-neutral-200 rounded-3xl p-6 space-y-4 animate-modalScaleIn">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <h4 className="font-display font-bold text-lg text-neutral-900 uppercase">
                  Modify Subscription Seats
                </h4>
                <button
                  type="button"
                  onClick={() => setShowModifyModal(false)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleModifySeats} className="space-y-4 font-mono text-xs">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Contract / Plan</label>
                  <div className="px-3 py-2 bg-neutral-100 rounded-xl text-neutral-800 font-medium">
                    {selectedSubDetail?.plan_name || 'Care Plan'} ({selectedSubDetail?.customer_name})
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Total Quantity / Active Seats</label>
                  <input
                    type="number"
                    min="1"
                    value={modifyQty}
                    onChange={(e) => setModifyQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 font-mono text-sm focus:border-[#ff3b30] focus:ring-1 focus:ring-[#ff3b30]"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Mid-cycle changes compute daily proration credit/charge automatically.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setShowModifyModal(false)}
                    className="btn btn-secondary py-1.5 px-4 text-xs rounded-full"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary py-1.5 px-5 text-xs rounded-full"
                  >
                    {saving ? 'Saving...' : 'Apply Proration Change'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL: + New Plan (Admin) */}
      {showNewPlanModal &&
        createPortal(
          <div
            className="app-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowNewPlanModal(false);
            }}
          >
            <div className="app-modal-dialog max-w-md w-full bg-white text-[#111111] shadow-2xl border border-neutral-200 rounded-3xl p-6 space-y-4 animate-modalScaleIn">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <h4 className="font-display font-bold text-lg text-neutral-900 uppercase">
                  Create Subscription Plan
                </h4>
                <button
                  type="button"
                  onClick={() => setShowNewPlanModal(false)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePlan} className="space-y-4 font-mono text-xs">
                <div>
                  <label className="block text-neutral-700 font-bold mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Enterprise SLA Care Plan"
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 font-mono text-sm focus:border-[#ff3b30] focus:ring-1 focus:ring-[#ff3b30]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-700 font-bold mb-1">Billing Cadence</label>
                    <select
                      value={newPlanCadence}
                      onChange={(e) => setNewPlanCadence(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 font-mono text-sm focus:border-[#ff3b30] focus:ring-1 focus:ring-[#ff3b30]"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-neutral-700 font-bold mb-1">Interval Days</label>
                    <input
                      type="number"
                      min="1"
                      value={newPlanInterval}
                      onChange={(e) => setNewPlanInterval(Math.max(1, parseInt(e.target.value) || 30))}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 font-mono text-sm focus:border-[#ff3b30] focus:ring-1 focus:ring-[#ff3b30]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setShowNewPlanModal(false)}
                    className="btn btn-secondary py-1.5 px-4 text-xs rounded-full"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary py-1.5 px-5 text-xs rounded-full"
                  >
                    {saving ? 'Creating...' : 'Create Plan'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default GovernanceSubscriptionTab;
