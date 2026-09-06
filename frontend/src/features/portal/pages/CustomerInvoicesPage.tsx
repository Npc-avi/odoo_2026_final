import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchPortalInvoicesApi } from '@/features/billing/services/billing.api';
import { exportInvoiceQuotationPDF, exportInvoiceQuotationDOCX } from '@/features/billing/utils/documentExport';
import {
  FileText,
  CreditCard,
  CheckCircle2,
  Clock,
  Download,
  DollarSign,
  ArrowUpRight,
  RefreshCw,
  Receipt,
  Search,
  ChevronRight
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useSocket } from '@/context/socket.context';

export const CustomerInvoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await fetchPortalInvoicesApi();
      setInvoices(data.invoices || []);
    } catch (err: any) {
      toast.error('Failed to load billing history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleInvoiceUpdate = () => {
      loadInvoices();
    };
    socket.on('invoice:created', handleInvoiceUpdate);
    socket.on('invoice:updated', handleInvoiceUpdate);
    socket.on('quotation:updated', handleInvoiceUpdate);
    return () => {
      socket.off('invoice:created', handleInvoiceUpdate);
      socket.off('invoice:updated', handleInvoiceUpdate);
      socket.off('quotation:updated', handleInvoiceUpdate);
    };
  }, [socket]);

  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const totalPaid = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const outstandingBalance = totalBilled - totalPaid;

  const filteredInvoices = invoices.filter((inv) => {
    const isPaid = inv.status === 'paid';
    if (statusFilter === 'paid' && !isPaid) return false;
    if (statusFilter === 'unpaid' && isPaid) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = (inv.invoice_number || '').toLowerCase().includes(q);
      const matchQuote = (inv.quotation_code || '').toLowerCase().includes(q);
      if (!matchNum && !matchQuote) return false;
    }
    return true;
  });

  return (
    <div className="app-page space-y-8 font-sans animate-fadeIn text-[#111111]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-[10px] font-mono font-bold tracking-widest text-cyan-800 uppercase mb-2 shadow-xs">
            <Receipt className="w-3.5 h-3.5 text-cyan-600" />
            <span>FINANCIAL RECONCILIATION</span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-[#111111] uppercase tracking-tight">
            Billing &amp; Invoices
          </h1>
          <p className="app-page-subtitle">
            Audit your account ledger, download statements in PDF or Word, and review reconciled charges.
          </p>
        </div>

        <button
          onClick={loadInvoices}
          className="btn-icon"
          title="Refresh Invoices"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="app-card p-6 rounded-3xl border border-neutral-200 bg-white shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-500 font-mono text-xs mb-3">
            <span className="uppercase tracking-wider font-bold">Total Invoiced</span>
            <DollarSign className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-display font-black text-neutral-900">
            ₹{totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-neutral-500 mt-2">
            Cumulative reconciled orders
          </div>
        </div>

        <div className="app-card p-6 rounded-3xl border border-neutral-200 bg-white shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-500 font-mono text-xs mb-3">
            <span className="uppercase tracking-wider font-bold">Total Settled</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-display font-black text-emerald-600">
            ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-emerald-600/90 mt-2">
            Fully paid and processed
          </div>
        </div>

        <div className="app-card p-6 rounded-3xl border border-neutral-200 bg-white shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-500 font-mono text-xs mb-3">
            <span className="uppercase tracking-wider font-bold">Outstanding Balance</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className={`text-2xl sm:text-3xl font-display font-black ${outstandingBalance > 0 ? 'text-amber-600' : 'text-neutral-900'}`}>
            ₹{outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono text-neutral-500 mt-2">
            {outstandingBalance > 0 ? 'Pending payment settlement' : 'Account current & clear'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 rounded-full bg-neutral-100 border border-neutral-200 font-mono text-xs self-start">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer font-bold ${
              statusFilter === 'all'
                ? 'bg-[#ff3b30] text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            ALL ({invoices.length})
          </button>
          <button
            onClick={() => setStatusFilter('unpaid')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer font-bold ${
              statusFilter === 'unpaid'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            UNPAID ({invoices.filter((i) => i.status !== 'paid').length})
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer font-bold ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            PAID ({invoices.filter((i) => i.status === 'paid').length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoice or quote..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full bg-white border border-neutral-300 text-xs font-mono text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#ff3b30] focus:ring-1 focus:ring-[#ff3b30] shadow-2xs"
          />
        </div>
      </div>

      {/* Invoices Ledger Table */}
      <div className="app-table-wrapper rounded-3xl overflow-hidden shadow-xs border border-neutral-200 bg-white">
        <div className="app-table-scroll">
          <table className="app-table">
            <thead className="app-thead bg-neutral-50 text-neutral-600 border-b border-neutral-200">
              <tr>
                <th className="app-th">Invoice #</th>
                <th className="app-th">Origin Quotation</th>
                <th className="app-th">Issue Date</th>
                <th className="app-th">Due Date</th>
                <th className="app-th text-right">Amount</th>
                <th className="app-th text-center">Status</th>
                <th className="app-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="app-tbody divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="app-td py-12 text-center text-neutral-500">
                    <div className="w-7 h-7 border-2 border-neutral-200 border-t-[#ff3b30] rounded-full animate-spin mx-auto mb-3" />
                    <span>Loading billing history...</span>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="app-td py-12 text-center text-neutral-500">
                    No billing records found matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isPaid = inv.status === 'paid';
                  const amount = Number(inv.total_amount || 0);

                  return (
                    <tr
                      key={inv.id}
                      className="app-tr hover:bg-neutral-50/70 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/portal/invoices/${inv.id}`)}
                    >
                      <td className="app-td font-bold text-[#ff3b30] font-mono">
                        {inv.invoice_number}
                      </td>
                      <td className="app-td text-neutral-700">
                        {inv.quotation_code ? (
                          <span className="px-2.5 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[11px] text-neutral-700 font-bold font-mono">
                            {inv.quotation_code}
                          </span>
                        ) : (
                          <span className="text-neutral-400 font-mono">Direct Contract</span>
                        )}
                      </td>
                      <td className="app-td text-neutral-500 font-mono text-[11px]">
                        {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="app-td text-neutral-500 font-mono text-[11px]">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'Immediate'}
                      </td>
                      <td className="app-td text-right font-bold text-neutral-900 font-mono text-sm">
                        ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="app-td text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isPaid ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                          <span>{isPaid ? 'Paid' : 'Unpaid'}</span>
                        </span>
                      </td>
                      <td className="app-td text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => {
                              try {
                                exportInvoiceQuotationPDF({ invoice: inv, quotation: { quotation_code: inv.quotation_code } });
                                toast.success('PDF invoice downloaded!');
                              } catch (e: any) {
                                toast.error('Failed to export PDF');
                              }
                            }}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await exportInvoiceQuotationDOCX({ invoice: inv, quotation: { quotation_code: inv.quotation_code } });
                                toast.success('Word document (.docx) downloaded!');
                              } catch (e: any) {
                                toast.error('Failed to export Word doc');
                              }
                            }}
                            className="p-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 transition-colors cursor-pointer"
                            title="Download Word Document"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          {!isPaid && (
                            <button
                              onClick={() => navigate(`/portal/invoices/${inv.id}`)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#ff3b30] hover:bg-red-700 text-white text-[11px] font-mono font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer ml-1"
                              title="Pay this invoice now"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>PAY NOW</span>
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/portal/invoices/${inv.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-mono font-bold transition-colors ml-1 cursor-pointer"
                          >
                            <span>VIEW</span>
                            <ChevronRight className="w-3 h-3" />
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
    </div>
  );
};

export default CustomerInvoicesPage;
