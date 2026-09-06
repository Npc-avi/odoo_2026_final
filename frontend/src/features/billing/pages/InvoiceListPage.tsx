import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchInvoicesApi } from '../services/billing.api';
import { RefreshCw, Search, ArrowRight, Receipt, CheckCircle2, Clock } from 'lucide-react';
import { useSocket } from '@/context/socket.context';
import { useDebounce } from '@/hooks/useDebounce';
import { useSWR } from '@/hooks/useSWR';

export const InvoiceListPage: React.FC = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();

  // Filters & Bifurcation state
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [amountRange, setAmountRange] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Performance Optimization 1: Debounce search input to prevent re-filtering on every keystroke
  const debouncedSearchQuery = useDebounce(searchQuery, 250);

  // Performance Optimization 2: Stale-While-Revalidate caching (instant tab loads, zero flicker)
  const fetchInvoicesWrapper = useCallback(async () => {
    const res = await fetchInvoicesApi();
    return res.invoices || [];
  }, []);

  const { data: cachedInvoices, isLoading: loading, error: swrError, revalidate } = useSWR<any[]>(
    'invoices-list',
    fetchInvoicesWrapper,
    { ttl: 15000 }
  );

  const invoices = cachedInvoices || [];
  const error = swrError ? swrError.message : null;

  useEffect(() => {
    if (!socket) return;
    const handleInvoiceUpdate = () => {
      revalidate();
    };
    socket.on('invoice:created', handleInvoiceUpdate);
    socket.on('invoice:updated', handleInvoiceUpdate);
    socket.on('quotation:updated', handleInvoiceUpdate);
    return () => {
      socket.off('invoice:created', handleInvoiceUpdate);
      socket.off('invoice:updated', handleInvoiceUpdate);
      socket.off('quotation:updated', handleInvoiceUpdate);
    };
  }, [socket, revalidate]);

  // Performance Optimization 3: Memoize status calculations
  const unpaidCount = useMemo(() => invoices.filter((i) => i.status !== 'paid').length, [invoices]);
  const paidCount = useMemo(() => invoices.filter((i) => i.status === 'paid').length, [invoices]);

  // Extract distinct customers for bifurcation
  const uniqueCustomers = useMemo(() => {
    const custs = new Set<string>();
    invoices.forEach((i) => {
      if (i.customer_name) custs.add(i.customer_name);
    });
    return Array.from(custs).sort();
  }, [invoices]);

  // Filtered invoices by status, customer, amount range, and search query
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const isPaid = inv.status === 'paid';
      const amount = Number(inv.total_amount || 0);

      // Status filter
      if (selectedStatus === 'unpaid' && isPaid) return false;
      if (selectedStatus === 'paid' && !isPaid) return false;

      // Customer filter (bifurcation by customer)
      if (selectedCustomer !== 'all' && inv.customer_name !== selectedCustomer) {
        return false;
      }

      // Amount Range filter (bifurcation by amount range)
      if (amountRange === 'under_1k' && amount >= 1000) return false;
      if (amountRange === '1k_to_5k' && (amount < 1000 || amount > 5000)) return false;
      if (amountRange === '5k_to_10k' && (amount < 5000 || amount > 10000)) return false;
      if (amountRange === 'over_10k' && amount <= 10000) return false;

      // Search query (invoice # or customer) - debounced for optimal UI responsiveness
      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase();
        const matchesNum = inv.invoice_number?.toLowerCase().includes(query);
        const matchesCust = inv.customer_name?.toLowerCase().includes(query);
        const matchesQuote = inv.quotation_code?.toLowerCase().includes(query);
        if (!matchesNum && !matchesCust && !matchesQuote) return false;
      }

      return true;
    });
  }, [invoices, selectedStatus, selectedCustomer, amountRange, debouncedSearchQuery]);

  // Format due date like screenshot: "Sep 10", "Sep 15", "Aug 30"
  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return 'Immediate';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* Top Header matching Global CSS layout & Reference Photo 1 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="app-screen-tag mb-2">
            SCREEN 8 // REVENUE &amp; INVOICE SETTLEMENT
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#111111] uppercase tracking-tight">
            Invoices (List)
          </h1>
          <p className="app-page-subtitle">
            Every invoice generated from one-time and recurring contracts
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Count Pills matching Reference Image 1 with Global CSS Tokens */}
          <button
            onClick={() => setSelectedStatus(selectedStatus === 'unpaid' ? 'all' : 'unpaid')}
            className={`px-4 py-2 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
              selectedStatus === 'unpaid'
                ? 'ring-2 ring-rose-500 bg-rose-200 text-rose-900 scale-105'
                : 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
            }`}
            title="Click to filter Unpaid invoices"
          >
            {unpaidCount} Unpaid
          </button>

          <button
            onClick={() => setSelectedStatus(selectedStatus === 'paid' ? 'all' : 'paid')}
            className={`px-4 py-2 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm ${
              selectedStatus === 'paid'
                ? 'ring-2 ring-emerald-500 bg-emerald-200 text-emerald-900 scale-105'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
            }`}
            title="Click to filter Paid invoices"
          >
            {paidCount} Paid
          </button>

          {selectedStatus !== 'all' && (
            <button
              onClick={() => setSelectedStatus('all')}
              className="text-xs font-mono text-neutral-500 hover:text-black underline px-1 cursor-pointer"
            >
              Show All
            </button>
          )}

          <button
            onClick={() => revalidate()}
            className="btn-icon ml-1"
            title="Refresh Invoices Ledger"
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

      {/* Bifurcation & Filter Bar: Customer Name and Amount Range */}
      <div className="app-card p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 font-mono text-xs">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice or client..."
              className="app-input pl-9"
            />
          </div>

          {/* Customer Bifurcation */}
          <div>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="app-select"
            >
              <option value="all">All Customers ({uniqueCustomers.length})</option>
              {uniqueCustomers.map((cust) => (
                <option key={cust} value={cust}>
                  Customer: {cust}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Range Bifurcation */}
          <div>
            <select
              value={amountRange}
              onChange={(e) => setAmountRange(e.target.value)}
              className="app-select"
            >
              <option value="all">All Amount Ranges</option>
              <option value="under_1k">Amount &lt; ₹1,000</option>
              <option value="1k_to_5k">Amount ₹1,000 – ₹5,000</option>
              <option value="5k_to_10k">Amount ₹5,000 – ₹10,000</option>
              <option value="over_10k">Amount &gt; ₹10,000</option>
            </select>
          </div>

          {/* Result Count Indicator & Reset */}
          <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-600">
            <span>
              Matches: <strong className="text-neutral-900">{filteredInvoices.length}</strong>
            </span>
            {(selectedCustomer !== 'all' || amountRange !== 'all' || searchQuery.trim() || selectedStatus !== 'all') && (
              <button
                onClick={() => {
                  setSelectedCustomer('all');
                  setAmountRange('all');
                  setSearchQuery('');
                  setSelectedStatus('all');
                }}
                className="text-[#ff3b30] hover:underline font-bold cursor-pointer text-xs"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Invoices Table matching Global CSS tables.css & Reference Image 1 */}
      <div className="app-table-wrapper">
        <div className="app-table-scroll">
          <table className="app-table">
            <thead className="app-thead">
              <tr>
                <th className="app-th">Invoice #</th>
                <th className="app-th">Customer</th>
                <th className="app-th app-th-right">Amount</th>
                <th className="app-th app-th-center">Status</th>
                <th className="app-th">Due Date</th>
              </tr>
            </thead>
            <tbody className="app-tbody app-tbody-divide">
              {loading ? (
                <tr>
                  <td colSpan={5} className="app-table-empty">
                    <div className="w-6 h-6 border-2 border-neutral-300 border-t-[#ff3b30] rounded-full animate-spin mx-auto mb-2" />
                    Auditing invoices ledger...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="app-table-empty">
                    No invoices match the selected bifurcation filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isPaid = inv.status === 'paid';
                  const amount = Number(inv.total_amount || 0);

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="app-tr app-tr-clickable group"
                    >
                      <td className="app-td app-td-brand group-hover:underline">
                        {inv.invoice_number || `INV-${inv.id.slice(0, 6).toUpperCase()}`}
                      </td>
                      <td className="app-td app-td-bold">
                        {inv.customer_name || 'Client Account'}
                      </td>
                      <td className="app-td app-td-currency text-sm">
                        ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className="app-td app-td-center">
                        <span className={`app-badge ${isPaid ? 'badge-paid' : 'badge-backorder'}`}>
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Paid</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-rose-600" />
                              <span>Unpaid</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="app-td app-td-muted">
                        {formatDueDate(inv.due_date)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Banner Callout matching Reference Image 1 & Global CSS cards.css alert */}
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
        <p className="text-xs font-mono text-amber-900 font-semibold">
          Click an invoice row to open its full payment and delivery reconciliation detail.
        </p>
      </div>
    </div>
  );
};

export default InvoiceListPage;
