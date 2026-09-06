import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchInvoiceByIdApi, recordPaymentApi } from '../services/billing.api';
import { exportInvoiceQuotationPDF, exportInvoiceQuotationDOCX } from '../utils/documentExport';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  CreditCard,
  Truck,
  FileText,
  RefreshCw,
  Package,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '@/features/auth/hook/useAuth';
import { useRazorpayCheckout } from '../hook/useRazorpay';
import { useSocket } from '@/context/socket.context';
import { Zap } from 'lucide-react';
import { useThrottledCallback } from '@/hooks/useThrottle';

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { initiatePayment, processing: razorpayProcessing } = useRazorpayCheckout();

  const isPortal = user?.role === 'customer_portal';
  const canRecordPayment = !isPortal && ['admin', 'finance', 'sales_manager'].includes(user?.role || '');

  const [invoice, setInvoice] = useState<any>(null);
  const [quotation, setQuotation] = useState<any>(null);
  const [relatedInvoices, setRelatedInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<boolean>(false);

  const loadInvoiceData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchInvoiceByIdApi(id);
      const inv = data.invoice;
      setInvoice(inv);
      setQuotation(data.quotation || inv?.quotation || null);
      setRelatedInvoices(data.relatedInvoices || inv?.relatedInvoices || []);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve invoice breakdown.');
      toast.error('Could not load invoice audit telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoiceData();
  }, [id]);

  useEffect(() => {
    if (!socket || !id) return;
    const handleInvoiceUpdate = (data: any) => {
      if (data?.invoiceId === id || !data?.invoiceId) {
        loadInvoiceData();
      }
    };
    socket.on('invoice:updated', handleInvoiceUpdate);
    return () => {
      socket.off('invoice:updated', handleInvoiceUpdate);
    };
  }, [socket, id]);

  // Performance Optimization: Guard checkout modal launch against duplicate rapid clicks
  const handlePayWithRazorpay = useThrottledCallback(() => {
    if (!invoice?.id) return;
    initiatePayment({
      invoice,
      currency: quotation?.currency || undefined,
      user,
      onSuccess: () => {
        // Immediate state change to 'paid'
        setInvoice((prev: any) => (prev ? { ...prev, status: 'paid', paid_at: new Date().toISOString() } : prev));
        loadInvoiceData();
      },
    });
  }, 1000);

  // Performance Optimization: Guard manual payment recording against double-submits
  const handleRecordPayment = useThrottledCallback(async () => {
    if (!invoice?.id || paying) return;
    try {
      setPaying(true);
      await recordPaymentApi(invoice.id);
      toast.success(`Payment recorded! Invoice ${invoice.invoice_number} is now PAID.`);
      await loadInvoiceData();
    } catch (err: any) {
      toast.error(err.message || 'Payment settlement failed.');
    } finally {
      setPaying(false);
    }
  }, 1000);

  const handleDownloadPDF = () => {
    try {
      exportInvoiceQuotationPDF({ invoice, quotation });
      toast.success('PDF invoice statement downloaded successfully!');
    } catch (err: any) {
      toast.error('Failed to generate PDF: ' + err.message);
    }
  };

  const handleDownloadWord = async () => {
    try {
      await exportInvoiceQuotationDOCX({ invoice, quotation });
      toast.success('Word document (.docx) downloaded successfully!');
    } catch (err: any) {
      toast.error('Failed to generate Word document: ' + err.message);
    }
  };

  const isPaid = invoice?.status === 'paid';

  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return 'Immediate';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 font-mono">
        <div className="w-9 h-9 border-2 border-white/20 border-t-[#ff3b30] rounded-full animate-spin mb-4" />
        <p className="text-xs text-neutral-400 uppercase tracking-widest font-bold animate-pulse">
          Auditing invoice &amp; delivery reconciliation...
        </p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-8 font-mono">
        <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error || 'Invoice record not found.'}</span>
        </div>
        <button
          onClick={() => navigate(isPortal ? '/portal/invoices' : '/invoices')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-mono transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices</span>
        </button>
      </div>
    );
  }

  const displayInvoices = relatedInvoices.length > 0 ? relatedInvoices : [invoice];
  const items = quotation?.items?.length ? quotation.items : invoice.items || [];

  return (
    <div className="app-page space-y-8 font-sans animate-fadeIn text-[#111111]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => navigate(isPortal ? '/portal/invoices' : '/invoices')}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-500 hover:text-neutral-900 font-bold uppercase transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <span className="text-neutral-400 font-mono">/</span>
            <div className="px-2.5 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono text-neutral-700 uppercase tracking-widest font-bold">
              {invoice.invoice_number}
            </div>
          </div>

          <h1 className="font-display font-black text-2xl sm:text-4xl text-[#111111] uppercase tracking-tight">
            Invoice: {invoice.invoice_number}
          </h1>
          <p className="app-page-subtitle">
            Customer Account: <span className="text-neutral-900 font-bold">{invoice.customer_name}</span> &bull; Issued {invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : 'Recent'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3.5 py-1.5 rounded-full font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
              isPaid
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs'
                : 'bg-amber-50 border-amber-200 text-amber-700 shadow-xs'
            }`}
          >
            {isPaid ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-amber-600" />}
            <span>{isPaid ? 'PAID / RECONCILED' : 'PAYMENT PENDING'}</span>
          </span>

          <button
            onClick={loadInvoiceData}
            className="btn-icon"
            title="Refresh Details"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visual Progress Pipeline Stepper */}
      <div className="app-card rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-xs relative overflow-hidden text-neutral-900">
        <div className="overflow-x-auto">
          <div className="min-w-[640px] max-w-4xl mx-auto py-2">
            {/* Row of Circles and Connectors */}
            <div className="flex items-center justify-between px-6 sm:px-10">
              {/* Step 1 Circle */}
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center font-bold shadow-xs shrink-0">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              {/* Connector 1 -> 2 (Confirmed to Shipped) */}
              <div className="flex-1 h-[3px] bg-emerald-500 rounded-full mx-2 sm:mx-3" />

              {/* Step 2 Circle */}
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center font-bold shadow-xs shrink-0">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              {/* Connector 2 -> 3 (Shipped to Invoiced) */}
              <div className="flex-1 h-[3px] bg-emerald-500 rounded-full mx-2 sm:mx-3" />

              {/* Step 3 Circle */}
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold shrink-0 transition-all ${
                  isPaid
                    ? 'bg-emerald-50 border-2 border-emerald-500 text-emerald-600 shadow-xs'
                    : 'bg-blue-600 border-2 border-blue-500 text-white shadow-md ring-4 ring-blue-100'
                }`}
              >
                {isPaid ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <FileText className="w-5 h-5" />}
              </div>

              {/* Connector 3 -> 4 (Invoiced to Paid) */}
              <div
                className={`flex-1 h-[3px] rounded-full mx-2 sm:mx-3 transition-colors duration-500 ${
                  isPaid ? 'bg-emerald-500' : 'bg-neutral-200'
                }`}
              />

              {/* Step 4 Circle */}
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold shrink-0 transition-all ${
                  isPaid
                    ? 'bg-emerald-50 border-2 border-emerald-500 text-emerald-600 shadow-xs'
                    : 'bg-neutral-100 text-neutral-400 border-2 border-neutral-300'
                }`}
              >
                {isPaid ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <Clock className="w-5 h-5" />}
              </div>
            </div>

            {/* Row of Labels positioned under their respective circles */}
            <div className="flex items-start justify-between px-1 sm:px-4 mt-3">
              <div className="w-24 sm:w-28 text-center">
                <span className="text-[10px] sm:text-[11px] font-mono font-bold text-emerald-700 uppercase tracking-wider block">
                  Order Confirmed
                </span>
              </div>
              <div className="w-24 sm:w-28 text-center">
                <span className="text-[10px] sm:text-[11px] font-mono font-bold text-emerald-700 uppercase tracking-wider block">
                  Shipped
                </span>
              </div>
              <div className="w-24 sm:w-28 text-center">
                <span
                  className={`text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider block ${
                    isPaid ? 'text-emerald-700' : 'text-blue-700'
                  }`}
                >
                  Invoiced
                </span>
              </div>
              <div className="w-24 sm:w-28 text-center">
                <span
                  className={`text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider block ${
                    isPaid ? 'text-emerald-700' : 'text-neutral-400'
                  }`}
                >
                  Paid
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Invoices Table */}
      <div className="app-table-wrapper rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="text-xs font-mono font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-600" />
            <span>Associated Billing Records</span>
          </div>
          <span className="text-[11px] font-mono text-neutral-500">
            {displayInvoices.length} invoice(s) on file
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="app-table">
            <thead className="app-thead bg-neutral-50 text-neutral-600 border-b border-neutral-200">
              <tr>
                <th className="app-th">Invoice #</th>
                <th className="app-th text-right">Amount</th>
                <th className="app-th text-center">Status</th>
                <th className="app-th">Due Date</th>
              </tr>
            </thead>
            <tbody className="app-tbody divide-y divide-neutral-100">
              {displayInvoices.map((inv) => {
                const invPaid = inv.status === 'paid';
                const invAmount = Number(inv.total_amount || 0);
                const isRecurring = inv.invoice_type === 'subscription_recurring';

                return (
                  <tr key={inv.id} className="app-tr hover:bg-neutral-50/70 transition-colors">
                    <td className="app-td font-bold text-neutral-900 flex items-center gap-2">
                      <span className="text-[#ff3b30] font-mono">{inv.invoice_number}</span>
                      {isRecurring && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[10px]">
                          Recurring
                        </span>
                      )}
                    </td>
                    <td className="app-td text-right font-bold text-neutral-900 font-mono text-sm">
                      ₹{invAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="app-td text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${
                          invPaid
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {invPaid ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                        <span>{invPaid ? 'Paid' : 'Unpaid'}</span>
                      </span>
                    </td>
                    <td className="app-td text-neutral-500 font-mono text-[11px]">
                      {formatDueDate(inv.due_date)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        {!isPaid && (
          <button
            onClick={handlePayWithRazorpay}
            disabled={razorpayProcessing || paying}
            className="btn rounded-full bg-gradient-to-r from-[#ff3b30] to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer px-6 py-2.5"
            title="Settle invoice securely via Razorpay"
          >
            {razorpayProcessing ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>PROCESSING RAZORPAY...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                <span>PAY NOW (RAZORPAY)</span>
              </>
            )}
          </button>
        )}

        {!isPaid && canRecordPayment && (
          <button
            onClick={handleRecordPayment}
            disabled={paying || razorpayProcessing}
            className="btn btn-secondary rounded-full shadow-sm cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>{paying ? 'RECORDING SETTLEMENT...' : 'Manual Settlement'}</span>
          </button>
        )}

        {!isPaid && !canRecordPayment && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-mono font-bold text-xs uppercase tracking-wider">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Payment Due</span>
          </div>
        )}

        {isPaid && (
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Settled &amp; Reconciled</span>
          </div>
        )}

        {/* Download Buttons */}
        <button
          onClick={handleDownloadPDF}
          className="btn btn-secondary rounded-full shadow-xs"
          title="Download PDF statement"
        >
          <Download className="w-4 h-4 text-blue-600" />
          <span>Download PDF</span>
        </button>

        <button
          onClick={handleDownloadWord}
          className="btn btn-secondary rounded-full shadow-xs"
          title="Download Word document"
        >
          <FileText className="w-4 h-4 text-cyan-600" />
          <span>Download Word (.docx)</span>
        </button>
      </div>

      {/* Comprehensive Line Items Breakdown */}
      <div className="app-card rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-200 gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase mb-1">
              <Package className="w-3.5 h-3.5" />
              QUOTATION SPECIFICATION &amp; RECONCILED LINE ITEMS
            </div>
            <p className="text-xs font-mono text-neutral-500">
              Origin Contract Code: <strong className="text-neutral-900">{quotation?.quotation_code || 'Direct Deal'}</strong>
              {quotation?.status && (
                <span className="ml-2 px-2.5 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700 uppercase text-[10px] font-bold">
                  Status: {quotation.status}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-neutral-500 block text-[10px] font-bold uppercase">Customer Account</span>
              <strong className="text-neutral-900">{invoice.customer_name}</strong>
            </div>
            {quotation?.tier && (
              <div>
                <span className="text-neutral-500 block text-[10px] font-bold uppercase">Tier</span>
                <span className="text-amber-700 font-bold">{quotation.tier}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="app-table-wrapper rounded-2xl border border-neutral-200 overflow-hidden shadow-none">
          <div className="overflow-x-auto">
            <table className="app-table">
              <thead className="app-thead bg-neutral-50 text-neutral-600 border-b border-neutral-200">
                <tr>
                  <th className="app-th">#</th>
                  <th className="app-th">Product / Description</th>
                  <th className="app-th">Type</th>
                  <th className="app-th text-center">Quantity</th>
                  <th className="app-th text-right">Unit Price</th>
                  <th className="app-th text-right">Discount</th>
                  <th className="app-th text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="app-tbody divide-y divide-neutral-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="app-td py-8 text-center text-neutral-500 font-mono">
                      No specific line item records attached to this invoice.
                    </td>
                  </tr>
                ) : (
                  items.map((item: any, idx: number) => {
                    const desc = item.description || item.product_name || `Line #${idx + 1}`;
                    const type = item.line_type || item.item_type || 'standard';
                    const qty = item.quantity || 1;
                    const price = Number(item.calculated_unit_price || item.unit_price || 0);
                    const discount = item.applied_discount_pct ? `${Number(item.applied_discount_pct).toFixed(1)}%` : '0%';
                    const total = Number(item.line_total || price * qty);

                    return (
                      <tr key={item.id || idx} className="app-tr hover:bg-neutral-50/70 transition-colors">
                        <td className="app-td text-neutral-400 font-mono">#{idx + 1}</td>
                        <td className="app-td font-bold text-neutral-900">{desc}</td>
                        <td className="app-td uppercase text-[10px] text-neutral-500 font-semibold">{type}</td>
                        <td className="app-td text-center font-bold text-neutral-900 font-mono">{qty}</td>
                        <td className="app-td text-right text-neutral-700 font-mono">₹{price.toFixed(2)}</td>
                        <td className="app-td text-right text-emerald-600 font-bold font-mono">{discount}</td>
                        <td className="app-td text-right font-bold text-neutral-900 font-mono">₹{total.toFixed(2)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Warehouse Shipments Breakdown */}
        {quotation?.shipments && quotation.shipments.length > 0 && (
          <div className="pt-4 border-t border-neutral-200 space-y-3">
            <h3 className="text-xs font-mono font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-600" />
              Reconciled Warehouse Shipments
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              {quotation.shipments.map((sh: any) => (
                <div key={sh.id} className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                  <div>
                    <span className="text-neutral-500 text-[10px] block uppercase font-bold">
                      Origin Warehouse: {sh.warehouse_name || 'Primary DC'}
                    </span>
                    <strong className="text-neutral-900">{sh.shipment_code}</strong>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase">
                      {sh.status || 'shipped'}
                    </span>
                    <span className="text-[11px] text-neutral-500 block mt-1 font-mono">
                      Shipping: ₹{Number(sh.shipping_cost || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Reconciliation Summary Box */}
        <div className="pt-4 border-t border-neutral-200 flex justify-end">
          <div className="w-full sm:w-80 rounded-2xl bg-neutral-50 border border-neutral-200 p-4 space-y-2.5 font-mono text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal:</span>
              <span className="font-bold text-neutral-900">
                ₹{Number(invoice.subtotal_amount || invoice.total_amount * 0.9259).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Tax (8%):</span>
              <span className="font-bold text-neutral-900">
                ₹{Number(invoice.tax_amount || invoice.total_amount * 0.0741).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-2 text-sm font-bold text-neutral-900">
              <span>Grand Total:</span>
              <span className="text-[#ff3b30] font-black text-base">
                ₹{Number(invoice.total_amount || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Banner Callout */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center">
        <p className="text-xs font-mono text-neutral-500">
          Reconciliation Guarantee: Partial invoicing stays strictly synchronized with partial warehouse delivery.
        </p>
      </div>
    </div>
  );
};

export default InvoiceDetailPage;
