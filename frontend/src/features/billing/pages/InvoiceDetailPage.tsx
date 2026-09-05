import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchInvoiceByIdApi, recordInvoicePaymentApi } from '../services/billing.api';
import { exportInvoiceQuotationPDF, exportInvoiceQuotationDOCX } from '../utils/documentExport';
import {
  CheckCircle2,
  Clock,
  Download,
  FileText,
  CreditCard,
  ArrowLeft,
  RefreshCw,
  Package,
  Truck,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'react-toastify';

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<any>(null);
  const [quotation, setQuotation] = useState<any>(null);
  const [relatedInvoices, setRelatedInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [paying, setPaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvoiceData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchInvoiceByIdApi(id);
      const inv = res.invoice;
      setInvoice(inv);
      setQuotation(inv?.quotation || null);
      setRelatedInvoices(inv?.relatedInvoices || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoiceData();
  }, [id]);

  const handleRecordPayment = async () => {
    if (!invoice?.id) return;
    try {
      setPaying(true);
      await recordInvoicePaymentApi(invoice.id, {
        paymentAmount: Number(invoice.total_amount || 0),
      });
      toast.success(`Payment recorded! Invoice ${invoice.invoice_number} is now settled as PAID.`);
      await loadInvoiceData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment.');
    } finally {
      setPaying(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      exportInvoiceQuotationPDF({ invoice, quotation });
      toast.success('PDF invoice & quotation downloaded successfully!');
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
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 font-mono">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-[#ff3b30] rounded-full animate-spin mb-3" />
        <p className="text-xs text-neutral-500 uppercase tracking-widest font-bold">
          Auditing invoice &amp; delivery reconciliation...
        </p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto p-8 font-mono">
        <div className="app-alert-danger">
          {error || 'Invoice not found.'}
        </div>
        <button
          onClick={() => navigate('/invoices')}
          className="btn btn-secondary"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices List</span>
        </button>
      </div>
    );
  }

  const displayInvoices = relatedInvoices.length > 0 ? relatedInvoices : [invoice];
  const items = quotation?.items?.length ? quotation.items : invoice.items || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* Top Header matching Global CSS layout & Reference Photo 2 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              to="/invoices"
              className="inline-flex items-center gap-1 text-xs font-mono text-neutral-500 hover:text-black font-bold uppercase transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Invoices Ledger</span>
            </Link>
            <span className="text-neutral-300 font-mono">/</span>
            <div className="app-screen-tag">{invoice.invoice_number}</div>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#111111] uppercase tracking-tight">
            Invoice Detail: {invoice.invoice_number} ({invoice.customer_name})
          </h1>
          <p className="app-page-subtitle">
            Opened by clicking a row on the Invoices list
          </p>
        </div>

        <button
          onClick={loadInvoiceData}
          className="btn-icon"
          title="Refresh Details"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Visual Progress Pipeline Stepper matching Reference Image 2 & Global CSS */}
      <div className="app-card p-6 sm:p-10">
        <div className="overflow-x-auto">
          <div className="min-w-[650px] flex items-center justify-between relative py-2">
            {/* Horizontal progress track line */}
            <div className="absolute left-[12%] right-[12%] top-[24px] h-[3px] bg-neutral-200 -z-0" />

            {/* Step 1: Order Confirmed */}
            <div className="flex flex-col items-center text-center relative z-10 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md ring-4 ring-emerald-50">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold text-neutral-800 uppercase tracking-wide">
                Order Confirmed
              </span>
            </div>

            {/* Step 2: Shipped */}
            <div className="flex flex-col items-center text-center relative z-10 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md ring-4 ring-emerald-50">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold text-neutral-800 uppercase tracking-wide">
                Shipped
              </span>
            </div>

            {/* Step 3: Invoiced (Active Blue Node matching Image 2) */}
            <div className="flex flex-col items-center text-center relative z-10 space-y-2">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)] ring-4 ring-blue-100">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-bold text-blue-700 uppercase tracking-wide">
                Invoiced
              </span>
            </div>

            {/* Step 4: Paid */}
            <div className="flex flex-col items-center text-center relative z-10 space-y-2">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                  isPaid
                    ? 'bg-emerald-600 text-white shadow-md ring-4 ring-emerald-50'
                    : 'bg-neutral-100 text-neutral-400 border-2 border-neutral-300'
                }`}
              >
                {isPaid ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-5 h-5" />}
              </div>
              <span
                className={`text-xs font-mono font-bold uppercase tracking-wide ${
                  isPaid ? 'text-emerald-700' : 'text-neutral-500'
                }`}
              >
                Paid
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Invoices Table matching Reference Image 2 & Global CSS tables.css */}
      <div className="app-table-wrapper">
        <div className="app-table-scroll">
          <table className="app-table">
            <thead className="app-thead">
              <tr>
                <th className="app-th">Invoice #</th>
                <th className="app-th app-th-right">Amount</th>
                <th className="app-th app-th-center">Status</th>
                <th className="app-th">Due Date</th>
              </tr>
            </thead>
            <tbody className="app-tbody app-tbody-divide">
              {displayInvoices.map((inv) => {
                const invPaid = inv.status === 'paid';
                const invAmount = Number(inv.total_amount || 0);
                const isRecurring = inv.invoice_type === 'subscription_recurring';

                return (
                  <tr key={inv.id} className="app-tr">
                    <td className="app-td app-td-brand">
                      <span>{inv.invoice_number}</span>
                      {isRecurring && (
                        <span className="ml-2 text-xs font-sans text-neutral-500 font-normal">
                          (Recurring)
                        </span>
                      )}
                    </td>
                    <td className="app-td app-td-currency text-sm">
                      ${invAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td className="app-td app-td-center">
                      <span className={`app-badge ${invPaid ? 'badge-paid' : 'badge-backorder'}`}>
                        {invPaid ? (
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
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons matching Reference Image 2 & Global CSS buttons.css */}
      <div className="flex flex-wrap items-center gap-3">
        {!isPaid ? (
          <button
            onClick={handleRecordPayment}
            disabled={paying}
            className="btn btn-success px-6 py-2.5 shadow-sm"
          >
            <CreditCard className="w-4 h-4" />
            <span>{paying ? 'RECORDING...' : 'Record Payment'}</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-mono font-bold text-xs uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Payment Reconciled &amp; Settled</span>
          </div>
        )}

        {/* Download Summary: PDF & Word (.docx) */}
        <button
          onClick={handleDownloadPDF}
          className="btn btn-secondary px-5 py-2.5"
          title="Download PDF statement"
        >
          <Download className="w-4 h-4 text-rose-600" />
          <span>Download PDF</span>
        </button>

        <button
          onClick={handleDownloadWord}
          className="btn btn-secondary px-5 py-2.5"
          title="Download Word (.docx) document"
        >
          <FileText className="w-4 h-4 text-blue-600" />
          <span>Download Word (.docx)</span>
        </button>
      </div>

      {/* Comprehensive Quotation Details Breakdown matching Global CSS cards.css */}
      <div className="app-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-200 gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase mb-1">
              <Package className="w-3.5 h-3.5" />
              QUOTATION SPECIFICATION &amp; RECONCILED LINE ITEMS
            </div>
            <p className="text-xs font-mono text-neutral-500">
              Origin Contract Code: <strong className="text-neutral-900">{quotation?.quotation_code || 'Direct Deal'}</strong>
              {quotation?.status && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700 uppercase text-[10px] font-bold">
                  Status: {quotation.status}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-neutral-400 block text-[10px] font-bold">CUSTOMER ACCOUNT</span>
              <strong className="text-neutral-900">{invoice.customer_name}</strong>
            </div>
            {quotation?.tier && (
              <div>
                <span className="text-neutral-400 block text-[10px] font-bold">TIER</span>
                <span className="text-amber-700 font-bold">{quotation.tier}</span>
              </div>
            )}
          </div>
        </div>

        {/* Itemized Quotation Table */}
        <div className="app-table-wrapper">
          <div className="app-table-scroll">
            <table className="app-table">
              <thead className="app-thead">
                <tr>
                  <th className="app-th">#</th>
                  <th className="app-th">Product / Description</th>
                  <th className="app-th">Type</th>
                  <th className="app-th app-th-center">Quantity</th>
                  <th className="app-th app-th-right">Unit Price</th>
                  <th className="app-th app-th-right">Discount</th>
                  <th className="app-th app-th-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="app-tbody app-tbody-divide">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="app-table-empty">
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
                      <tr key={item.id || idx} className="app-tr">
                        <td className="app-td app-td-muted">#{idx + 1}</td>
                        <td className="app-td app-td-bold">{desc}</td>
                        <td className="app-td uppercase text-[10px] text-neutral-600 font-semibold">{type}</td>
                        <td className="app-td app-td-center font-bold">{qty}</td>
                        <td className="app-td app-td-right">${price.toFixed(2)}</td>
                        <td className="app-td app-td-right text-emerald-700 font-bold">{discount}</td>
                        <td className="app-td app-td-currency">${total.toFixed(2)}</td>
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
            <h3 className="text-xs font-mono font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-600" />
              Reconciled Warehouse Shipments
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              {quotation.shipments.map((sh: any) => (
                <div key={sh.id} className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-neutral-500 text-[10px] block uppercase font-bold">
                      Origin Warehouse: {sh.warehouse_name || 'Primary DC'}
                    </span>
                    <strong className="text-neutral-900">{sh.shipment_code}</strong>
                  </div>
                  <div className="text-right">
                    <span className="app-badge badge-confirmed">
                      {sh.status || 'shipped'}
                    </span>
                    <span className="text-[11px] text-neutral-500 block mt-1">
                      Shipping: ${Number(sh.shipping_cost || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Reconciliation Summary Box */}
        <div className="pt-4 border-t border-neutral-200 flex justify-end">
          <div className="w-full sm:w-80 rounded-2xl bg-neutral-50 border border-neutral-200 p-4 space-y-2 font-mono text-xs shadow-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal:</span>
              <span className="font-bold text-neutral-900">
                ${Number(invoice.subtotal_amount || invoice.total_amount * 0.9259).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Tax (8%):</span>
              <span className="font-bold text-neutral-900">
                ${Number(invoice.tax_amount || invoice.total_amount * 0.0741).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-2 text-sm font-bold text-neutral-900">
              <span>Grand Total:</span>
              <span className="text-[#ff3b30] font-black">
                ${Number(invoice.total_amount || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Banner Callout matching Reference Image 2 & Global CSS cards.css */}
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
        <p className="text-xs font-mono text-amber-900 font-semibold">
          Partial invoicing stays reconciled with partial delivery, nothing is billed before it ships.
        </p>
      </div>
    </div>
  );
};

export default InvoiceDetailPage;
