import React, { useEffect } from 'react';
import { useBilling } from '../hook/useBilling';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Receipt,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  Sparkles,
  CheckCircle2,
  Calendar,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

export const InvoiceListPage: React.FC = () => {
  const {
    invoices,
    billableQuotes,
    loading,
    generating,
    error,
    loadData,
    generateBilling,
    recordPayment,
  } = useBilling();

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalRevenueSettled = invoices
    .filter((i) => i.status === 'paid')
    .reduce((acc, i) => acc + Number(i.total_amount || 0), 0);

  const totalOutstanding = invoices
    .filter((i) => i.status !== 'paid')
    .reduce((acc, i) => acc + Number(i.total_amount || 0), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase mb-2">
            SCREEN 8 // HYBRID BILLING &amp; PAYMENT SETTLEMENT
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#111111] uppercase tracking-tight">
            INVOICES &amp; REVENUE LEDGER
          </h1>
        </div>

        <button
          onClick={loadData}
          className="p-3 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-black hover:border-neutral-400 transition-colors cursor-pointer"
          title="Refresh Invoices"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && (
        <div className="p-16 rounded-3xl border border-neutral-800 bg-[#09090b] text-center space-y-3 font-mono">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-emerald-400 animate-spin mx-auto" />
          <p className="text-xs text-neutral-400 tracking-widest uppercase">AUDITING BILLING & SETTLEMENT ENGINE...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 rounded-3xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Screen 8 Revenue KPIs */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 font-mono">
          <div className="p-6 rounded-3xl border border-neutral-800 bg-[#09090b] space-y-2">
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest">SETTLED CASH REVENUE</span>
            <div className="font-display font-black text-3xl text-emerald-400">
              ${totalRevenueSettled.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-neutral-500">Paid Invoices Ledger</p>
          </div>

          <div className="p-6 rounded-3xl border border-neutral-800 bg-[#09090b] space-y-2">
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest">OUTSTANDING ACCOUNTS RECEIVABLE</span>
            <div className="font-display font-black text-3xl text-amber-400">
              ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-neutral-500">Draft & Issued Invoices</p>
          </div>

          <div className="p-6 rounded-3xl border border-neutral-800 bg-[#09090b] space-y-2">
            <span className="text-[10px] text-neutral-400 uppercase tracking-widest">INVOICED CONTRACTS</span>
            <div className="font-display font-black text-3xl text-white">
              {invoices.length}
            </div>
            <p className="text-[11px] text-neutral-500">Hybrid One-Time & Subscriptions</p>
          </div>
        </div>
      )}

      {/* Screen 8 Step 1: Confirmed Quotations Ready for Invoicing */}
      {!loading && billableQuotes.length > 0 && (
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/10 p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-emerald-900/40 pb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/40 text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              CONFIRMED DEALS READY FOR HYBRID BILLING GENERATION ({billableQuotes.length})
            </div>
            <span className="text-xs font-mono text-emerald-400/80">AUTOMATIC CHARGE SPLITTING</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-emerald-900/40 text-emerald-300/60 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">QUOTATION</th>
                  <th className="py-3 px-4">CLIENT ACCOUNT</th>
                  <th className="py-3 px-4">TOTAL CONTRACT VALUE</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/20">
                {billableQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-emerald-950/20 transition-colors">
                    <td className="py-4 px-4 font-bold text-white">
                      {q.quotation_code || q.quotation_number || q.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-4 px-4 text-neutral-300">
                      {q.customer_company_name || q.company_name || 'Acme Client'}
                    </td>
                    <td className="py-4 px-4 font-bold text-white">
                      ${Number(q.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => generateBilling(q.id)}
                        disabled={generating}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>{generating ? 'GENERATING...' : 'GENERATE HYBRID BILLING'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Screen 8 Step 2: Issued Invoices & Settlement Table */}
      {!loading && (
        <div className="rounded-3xl border border-neutral-800 bg-[#09090b] p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-mono font-bold tracking-widest text-white uppercase">
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              INVOICES LEDGER & SETTLEMENT
            </div>
            <span className="text-xs font-mono text-neutral-400">TOTAL: {invoices.length} INVOICES</span>
          </div>

          {invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">INVOICE #</th>
                    <th className="py-3 px-4">CUSTOMER</th>
                    <th className="py-3 px-4">TYPE</th>
                    <th className="py-3 px-4">DUE DATE</th>
                    <th className="py-3 px-4">NET AMOUNT</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4 text-right">SETTLEMENT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {invoices.map((inv) => {
                    const isPaid = inv.status === 'paid';
                    return (
                      <tr key={inv.id} className="hover:bg-neutral-900/30 transition-colors">
                        <td className="py-4 px-4 font-bold text-white">
                          {inv.invoice_number || `INV-${inv.id.slice(0, 8).toUpperCase()}`}
                        </td>
                        <td className="py-4 px-4 text-neutral-300">
                          {inv.customer_company_name || inv.company_name || 'Client Account'}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-bold text-neutral-300 uppercase">
                            {inv.invoice_type === 'subscription_recurring' ? 'SaaS Recurring' : 'Standard Delivery'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-neutral-400">
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'Immediate'}
                        </td>
                        <td className="py-4 px-4 font-bold text-white text-sm">
                          ${Number(inv.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-4">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="py-4 px-4 text-right">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              SETTLED
                            </span>
                          ) : (
                            <button
                              onClick={() => recordPayment(inv.id)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>SETTLE / PAY NOW</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-neutral-800 rounded-2xl">
              <Receipt className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-xs font-mono text-neutral-400 uppercase">NO INVOICES ISSUED YET</p>
              <p className="text-[11px] font-mono text-neutral-500 mt-1">
                Confirm a quotation and click "Generate Hybrid Billing" to generate the invoices ledger!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
