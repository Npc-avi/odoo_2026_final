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
        <div className="p-16 rounded-3xl border border-neutral-200 bg-white text-center space-y-3 font-mono shadow-sm">
          <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-neutral-500 tracking-widest uppercase">AUDITING BILLING & SETTLEMENT ENGINE...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 rounded-3xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Screen 8 Revenue KPIs */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 font-mono">
          <div className="p-6 rounded-3xl border border-neutral-200 bg-white space-y-2 shadow-sm">
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">SETTLED CASH REVENUE</span>
            <div className="font-display font-black text-3xl text-emerald-700">
              ${totalRevenueSettled.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-neutral-500">Paid Invoices Ledger</p>
          </div>

          <div className="p-6 rounded-3xl border border-neutral-200 bg-white space-y-2 shadow-sm">
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">OUTSTANDING ACCOUNTS RECEIVABLE</span>
            <div className="font-display font-black text-3xl text-amber-700">
              ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-neutral-500">Draft & Issued Invoices</p>
          </div>

          <div className="p-6 rounded-3xl border border-neutral-200 bg-white space-y-2 shadow-sm">
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">INVOICED CONTRACTS</span>
            <div className="font-display font-black text-3xl text-neutral-900">
              {invoices.length}
            </div>
            <p className="text-[11px] text-neutral-500">Hybrid One-Time & Subscriptions</p>
          </div>
        </div>
      )}

      {/* Screen 8 Step 1: Confirmed Quotations Ready for Invoicing */}
      {!loading && billableQuotes.length > 0 && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-[10px] font-mono font-bold tracking-widest text-emerald-800 uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              CONFIRMED DEALS READY FOR HYBRID BILLING GENERATION ({billableQuotes.length})
            </div>
            <span className="text-xs font-mono text-emerald-700 font-semibold">AUTOMATIC CHARGE SPLITTING</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-emerald-200 text-emerald-800 uppercase text-[10px] tracking-wider bg-emerald-100/60">
                  <th className="py-3 px-4">QUOTATION</th>
                  <th className="py-3 px-4">CLIENT ACCOUNT</th>
                  <th className="py-3 px-4">TOTAL CONTRACT VALUE</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100 text-neutral-900">
                {billableQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-emerald-100/40 transition-colors">
                    <td className="py-4 px-4 font-bold text-neutral-900">
                      {q.quotation_code || q.quotation_number || q.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-4 px-4 text-neutral-700">
                      {q.customer_company_name || q.company_name || 'Acme Client'}
                    </td>
                    <td className="py-4 px-4 font-bold text-neutral-900">
                      ${Number(q.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => generateBilling(q.id)}
                        disabled={generating}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-black uppercase tracking-wider transition-all shadow-sm disabled:opacity-50 cursor-pointer"
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
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-neutral-800 uppercase">
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              INVOICES LEDGER & SETTLEMENT
            </div>
            <span className="text-xs font-mono text-neutral-500">TOTAL: {invoices.length} INVOICES</span>
          </div>

          {invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">INVOICE #</th>
                    <th className="py-3 px-4">CUSTOMER</th>
                    <th className="py-3 px-4">TYPE</th>
                    <th className="py-3 px-4">DUE DATE</th>
                    <th className="py-3 px-4">NET AMOUNT</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4 text-right">SETTLEMENT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-900">
                  {invoices.map((inv) => {
                    const isPaid = inv.status === 'paid';
                    return (
                      <tr key={inv.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="py-4 px-4 font-bold text-neutral-900">
                          {inv.invoice_number || `INV-${inv.id.slice(0, 8).toUpperCase()}`}
                        </td>
                        <td className="py-4 px-4 text-neutral-700">
                          {inv.customer_company_name || inv.company_name || 'Client Account'}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-bold text-neutral-700 uppercase">
                            {inv.invoice_type === 'subscription_recurring' ? 'SaaS Recurring' : 'Standard Delivery'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-neutral-500">
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'Immediate'}
                        </td>
                        <td className="py-4 px-4 font-bold text-neutral-900 text-sm">
                          ${Number(inv.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-4">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="py-4 px-4 text-right">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              SETTLED
                            </span>
                          ) : (
                            <button
                              onClick={() => recordPayment(inv.id)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
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
            <div className="text-center py-12 border border-dashed border-neutral-300 rounded-2xl">
              <Receipt className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              <p className="text-xs font-mono text-neutral-600 uppercase font-bold">NO INVOICES ISSUED YET</p>
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
