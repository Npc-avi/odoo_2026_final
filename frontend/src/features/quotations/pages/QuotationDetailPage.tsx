import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchQuotationByIdApi } from '../services/quotations.api';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';

export const QuotationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchQuotationByIdApi(id)
      .then((data) => setQuotation(data.quotation || data))
      .catch((err) => setError(err.message || 'Failed to load quotation details.'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex items-center justify-between pb-6 border-b border-neutral-200">
        <div className="flex items-center gap-4">
          <Link
            to="/quotations"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-mono text-neutral-600 hover:text-black hover:border-neutral-400 transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-[#ff3b30]" />
            <span>BACK TO PIPELINE</span>
          </Link>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-[#111111] uppercase tracking-tight">
            QUOTATION #{quotation?.quotation_number || id?.slice(0, 8).toUpperCase()}
          </h1>
        </div>

        {quotation && (
          <StatusBadge status={quotation.status || 'draft'} />
        )}
      </div>

      {loading && (
        <div className="p-16 rounded-3xl border border-neutral-800 bg-[#09090b] text-center space-y-3 font-mono">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-[#ff3b30] animate-spin mx-auto" />
          <p className="text-xs text-neutral-400 tracking-widest uppercase">LOADING QUOTATION AUDIT...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 rounded-3xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-mono">
          {error}
        </div>
      )}

      {!loading && quotation && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Line Items Column */}
          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-3xl border border-neutral-800 bg-[#09090b] p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase">
                  CONFIRMED LINE ITEMS
                </div>
                <span className="text-xs font-mono text-neutral-400">CURRENCY: USD</span>
              </div>

              {/* Items List or Empty */}
              {quotation.items && quotation.items.length > 0 ? (
                <div className="divide-y divide-neutral-800/60 font-mono text-xs">
                  {quotation.items.map((item: any) => (
                    <div key={item.id} className="py-4 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white uppercase">{item.product_name || 'Product'}</div>
                        <div className="text-[11px] text-neutral-400">Qty: {item.quantity} &bull; Unit: ${Number(item.unit_price).toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">${Number(item.subtotal || item.total_price).toFixed(2)}</div>
                        {item.discount_pct > 0 && (
                          <div className="text-[10px] text-[#ff3b30]">Discount: {item.discount_pct}%</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-500 font-mono py-4">Standard quotation line items pending formulation.</p>
              )}
            </div>
          </div>

          {/* Sidebar Summary Column */}
          <div className="space-y-8">
            <div className="rounded-3xl border border-neutral-800 bg-[#09090b] p-6 sm:p-8 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
                DEAL FINANCIAL TELEMETRY
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="flex justify-between py-2 border-b border-neutral-800/60">
                  <span className="text-neutral-400">TOTAL DEAL VALUE</span>
                  <span className="font-bold text-white font-display text-lg">
                    ${Number(quotation.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-800/60">
                  <span className="text-neutral-400">BLENDED RISK SCORE</span>
                  <span className="text-emerald-400 font-bold">OPTIMAL // 0.00</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-800/60">
                  <span className="text-neutral-400">DISCOUNT CEILING</span>
                  <span className="text-white">ENFORCED (GOLD TIER)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
