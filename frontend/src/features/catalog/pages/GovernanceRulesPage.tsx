import React, { useEffect, useState } from 'react';
import {
  fetchGovernanceRulesApi,
  saveGovernanceRuleApi,
  fetchApprovalChainsApi,
} from '@/features/approvals/services/approvals.api';
import { fetchCategoriesApi } from '@/features/catalog/services/catalog.api';
import {
  ShieldAlert,
  Percent,
  Plus,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { toast } from 'react-toastify';

export const GovernanceRulesPage: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [chains, setChains] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // New rule form
  const [selectedTier, setSelectedTier] = useState<'Bronze' | 'Silver' | 'Gold' | 'Platinum'>('Gold');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [maxDiscount, setMaxDiscount] = useState<number>(15);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rulesData, chainsData, catData] = await Promise.all([
        fetchGovernanceRulesApi().catch(() => ({ rules: [] })),
        fetchApprovalChainsApi().catch(() => ({ chains: [] })),
        fetchCategoriesApi().catch(() => ({ categories: [] })),
      ]);
      setRules(rulesData.rules || []);
      setChains(chainsData.chains || []);
      const cats = catData.categories || [];
      setCategories(cats);
      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load governance matrix.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;

    try {
      setSaving(true);
      await saveGovernanceRuleApi({
        tier: selectedTier,
        categoryId: selectedCategory,
        maxDiscountPct: Number(maxDiscount),
      });
      toast.success('Discount governance ceiling rule updated!');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update rule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase mb-2">
            SCREEN 9 // DISCOUNT CEILINGS &amp; APPROVAL MATRIX
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-[#111111] uppercase tracking-tight">
            DISCOUNT GOVERNANCE RULES
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-mono mt-1">
            Deterministic customer tier discount caps and multi-level approval escalation triggers.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-3 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-black hover:border-neutral-400 transition-colors cursor-pointer"
          title="Refresh Governance"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="p-16 rounded-3xl border border-neutral-200 bg-white text-center space-y-3 font-mono shadow-xs">
          <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-[#ff3b30] animate-spin mx-auto" />
          <p className="text-xs text-neutral-500 tracking-widest uppercase">AUDITING COMPLIANCE POLICIES...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Excalidraw Screen 9: Matrices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Matrix 1: Customer Tier Ceilings */}
            <div className="p-6 sm:p-8 rounded-3xl border border-neutral-200 bg-white space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-neutral-900 uppercase">
                  <Lock className="w-3.5 h-3.5 text-[#ff3b30]" />
                  CUSTOMER TIER DISCOUNT CEILINGS
                </div>
                <span className="text-[10px] font-mono text-neutral-500 font-bold">BY ACCOUNT TIER</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {[
                  { tier: 'Platinum', max: '20.00%', color: 'border-cyan-200 text-cyan-800 bg-cyan-50' },
                  { tier: 'Gold', max: '15.00%', color: 'border-amber-200 text-amber-800 bg-amber-50' },
                  { tier: 'Silver', max: '10.00%', color: 'border-neutral-200 text-neutral-800 bg-neutral-100' },
                  { tier: 'Bronze', max: '5.00%', color: 'border-amber-200 text-amber-800 bg-amber-50/50' },
                ].map((t) => (
                  <div
                    key={t.tier}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between ${t.color}`}
                  >
                    <span className="font-bold uppercase tracking-wider">{t.tier} Tier</span>
                    <span className="font-mono font-black text-sm">MAX {t.max}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Matrix 2: Product Category Ceilings */}
            <div className="p-6 sm:p-8 rounded-3xl border border-neutral-200 bg-white space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-neutral-900 uppercase">
                  <Sliders className="w-3.5 h-3.5 text-cyan-700" />
                  PRODUCT CATEGORY CEILINGS
                </div>
                <span className="text-[10px] font-mono text-neutral-500 font-bold">DEFAULT CAPS</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50 flex items-center justify-between"
                  >
                    <span className="font-bold text-neutral-900 uppercase">{c.name}</span>
                    <span className="font-mono font-black text-cyan-700">
                      MAX {Number(c.default_discount_ceiling_pct).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Matrix 3: Multi-Level Approval Escalation Thresholds */}
          <div className="p-6 sm:p-8 rounded-3xl border border-neutral-200 bg-white space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-neutral-900 uppercase">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                DISCOUNT ESCALATION THRESHOLDS (NON-OVERLAPPING RANGES)
              </div>
              <span className="text-[10px] font-mono text-neutral-500 font-bold">PG GiST EXCLUDE ENFORCED</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-900 space-y-2">
                <div className="text-[10px] text-emerald-800 uppercase font-bold">LEVEL 1: SALES REP SELF-AUTH</div>
                <div className="text-xl font-black text-neutral-900">0.00% &ndash; 5.00%</div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  No managerial approval required. Straight to customer portal.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 space-y-2">
                <div className="text-[10px] text-amber-800 uppercase font-bold">LEVEL 2: SALES MANAGER REVIEW</div>
                <div className="text-xl font-black text-neutral-900">5.01% &ndash; 10.00%</div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Requires sign-off from sales management before customer proposal release.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 space-y-2">
                <div className="text-[10px] text-rose-800 uppercase font-bold">LEVEL 3: FINANCE EXECUTIVE SIGN-OFF</div>
                <div className="text-xl font-black text-neutral-900">10.01% &ndash; 50.00%</div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Dual approval: Sales Manager + Chief Financial Officer sign-off.
                </p>
              </div>
            </div>
          </div>

          {/* Add / Update Rule Form */}
          <div className="p-6 sm:p-8 rounded-3xl border border-neutral-200 bg-white space-y-6 shadow-sm">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase">
              <Plus className="w-3 h-3" />
              CONFIGURE TIER &times; CATEGORY OVERRIDE RULE
            </div>

            <form onSubmit={handleSaveRule} className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="block text-[10px] text-neutral-500 font-bold uppercase">CUSTOMER TIER</label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 focus:border-[#ff3b30] focus:outline-none shadow-xs"
                >
                  <option value="Bronze">Bronze</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] text-neutral-500 font-bold uppercase">PRODUCT CATEGORY</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 focus:border-[#ff3b30] focus:outline-none shadow-xs"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] text-neutral-500 font-bold uppercase">MAX DISCOUNT %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-900 focus:border-[#ff3b30] focus:outline-none shadow-xs"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 rounded-full bg-[#ff3b30] hover:bg-red-600 text-white font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {saving ? 'SAVING...' : 'SAVE GOVERNANCE RULE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
