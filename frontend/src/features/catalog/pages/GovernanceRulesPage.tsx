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
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-800 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase mb-2">
            SCREEN 9 // DISCOUNT CEILINGS & APPROVAL MATRIX
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-white uppercase tracking-tight">
            DISCOUNT GOVERNANCE RULES
          </h1>
        </div>

        <button
          onClick={loadData}
          className="p-3 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer"
          title="Refresh Governance"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="p-16 rounded-3xl border border-neutral-800 bg-[#09090b] text-center space-y-3 font-mono">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-[#ff3b30] animate-spin mx-auto" />
          <p className="text-xs text-neutral-400 tracking-widest uppercase">AUDITING COMPLIANCE POLICIES...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Excalidraw Screen 9: Matrices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Matrix 1: Customer Tier Ceilings */}
            <div className="p-6 sm:p-8 rounded-3xl border border-neutral-800 bg-[#09090b] space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-white uppercase">
                  <Lock className="w-3.5 h-3.5 text-[#ff3b30]" />
                  CUSTOMER TIER DISCOUNT CEILINGS
                </div>
                <span className="text-[10px] font-mono text-neutral-400">BY ACCOUNT TIER</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {[
                  { tier: 'Platinum', max: '20.00%', color: 'border-cyan-500/40 text-cyan-400 bg-cyan-950/20' },
                  { tier: 'Gold', max: '15.00%', color: 'border-amber-500/40 text-amber-400 bg-amber-950/20' },
                  { tier: 'Silver', max: '10.00%', color: 'border-neutral-500/40 text-neutral-300 bg-neutral-900/40' },
                  { tier: 'Bronze', max: '5.00%', color: 'border-amber-800/40 text-amber-600 bg-amber-950/10' },
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
            <div className="p-6 sm:p-8 rounded-3xl border border-neutral-800 bg-[#09090b] space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-white uppercase">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  PRODUCT CATEGORY CEILINGS
                </div>
                <span className="text-[10px] font-mono text-neutral-400">DEFAULT CAPS</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-2xl border border-neutral-800 bg-neutral-950/60 flex items-center justify-between"
                  >
                    <span className="font-bold text-white uppercase">{c.name}</span>
                    <span className="font-mono font-black text-cyan-400">
                      MAX {Number(c.default_discount_ceiling_pct).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Matrix 3: Multi-Level Approval Escalation Thresholds */}
          <div className="p-6 sm:p-8 rounded-3xl border border-neutral-800 bg-[#09090b] space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="inline-flex items-center gap-2 font-mono text-xs font-bold text-white uppercase">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                DISCOUNT ESCALATION THRESHOLDS (NON-OVERLAPPING RANGES)
              </div>
              <span className="text-[10px] font-mono text-neutral-400">PG GiST EXCLUDE ENFORCED</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 space-y-2">
                <div className="text-[10px] text-emerald-400 uppercase font-bold">LEVEL 1: SALES REP SELF-AUTH</div>
                <div className="text-xl font-bold text-white">0.00% &ndash; 5.00%</div>
                <p className="text-[11px] text-neutral-400">
                  No managerial approval required. Straight to customer portal.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-950/10 space-y-2">
                <div className="text-[10px] text-amber-400 uppercase font-bold">LEVEL 2: SALES MANAGER REVIEW</div>
                <div className="text-xl font-bold text-white">5.01% &ndash; 10.00%</div>
                <p className="text-[11px] text-neutral-400">
                  Requires sign-off from sales management before customer proposal release.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-950/10 space-y-2">
                <div className="text-[10px] text-rose-400 uppercase font-bold">LEVEL 3: FINANCE EXECUTIVE SIGN-OFF</div>
                <div className="text-xl font-bold text-white">10.01% &ndash; 50.00%</div>
                <p className="text-[11px] text-neutral-400">
                  Dual approval: Sales Manager + Chief Financial Officer sign-off.
                </p>
              </div>
            </div>
          </div>

          {/* Add / Update Rule Form */}
          <div className="p-6 sm:p-8 rounded-3xl border border-neutral-800 bg-[#09090b] space-y-6 shadow-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase">
              <Plus className="w-3 h-3" />
              CONFIGURE TIER &times; CATEGORY OVERRIDE RULE
            </div>

            <form onSubmit={handleSaveRule} className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="block text-[10px] text-neutral-400 uppercase">CUSTOMER TIER</label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-800 text-white focus:border-[#ff3b30] focus:outline-none"
                >
                  <option value="Bronze">Bronze</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] text-neutral-400 uppercase">PRODUCT CATEGORY</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-800 text-white focus:border-[#ff3b30] focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] text-neutral-400 uppercase">MAX DISCOUNT %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-800 text-white focus:border-[#ff3b30] focus:outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-[#ff3b30] hover:bg-red-600 text-white font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-red-950/40"
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
