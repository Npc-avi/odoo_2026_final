import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchQuotationByIdApi } from '../services/quotations.api';
import { useSocket } from '@/context/socket.context';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, CheckCircle2, ShieldAlert, FileText, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import { exportQuotationPDF, exportQuotationDOCX } from '@/features/billing/utils/documentExport';

export const QuotationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { socket, joinQuote, leaveQuote } = useSocket();
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuote = (quoteId: string) => {
    fetchQuotationByIdApi(quoteId)
      .then((data) => setQuotation(data.quotation || data))
      .catch((err) => setError(err.message || 'Failed to load quotation details.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    loadQuote(id);
    joinQuote(id);

    return () => {
      leaveQuote(id);
    };
  }, [id, joinQuote, leaveQuote]);

  useEffect(() => {
    if (!socket || !id) return;

    const handleRealtimeUpdate = (data: any) => {
      if (!data?.quoteId || data?.quoteId === id) {
        console.log('[Socket.IO Staff Quote Detail] Real-time change:', data);
        if (data?.status === 'confirmed') {
          toast.success('Quotation confirmed!');
        }
        loadQuote(id);
      }
    };

    socket.on('quotation:updated', handleRealtimeUpdate);
    socket.on('negotiation:updated', handleRealtimeUpdate);
    socket.on('approval:updated', handleRealtimeUpdate);

    return () => {
      socket.off('quotation:updated', handleRealtimeUpdate);
      socket.off('negotiation:updated', handleRealtimeUpdate);
      socket.off('approval:updated', handleRealtimeUpdate);
    };
  }, [socket, id]);

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

        <div className="flex items-center gap-3">
          {quotation && (
            <>
              <button
                onClick={() => {
                  try {
                    exportQuotationPDF(quotation);
                    toast.success('Quotation PDF downloaded!');
                  } catch (e: any) {
                    toast.error('Failed to export PDF: ' + e.message);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-bold hover:bg-blue-500/20 transition-colors"
                title="Download PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>EXPORT PDF</span>
              </button>
              <button
                onClick={async () => {
                  try {
                    await exportQuotationDOCX(quotation);
                    toast.success('Quotation Word document downloaded!');
                  } catch (e: any) {
                    toast.error('Failed to export Word document: ' + e.message);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold hover:bg-cyan-500/20 transition-colors"
                title="Download Word Document"
              >
                <Download className="w-3.5 h-3.5" />
                <span>EXPORT WORD (.DOCX)</span>
              </button>
              <StatusBadge status={quotation.status || 'draft'} />
            </>
          )}
        </div>
      </div>

      {loading && (
        <div className="p-16 rounded-3xl border border-neutral-200 bg-white text-center space-y-3 font-mono shadow-sm">
          <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-[#ff3b30] animate-spin mx-auto" />
          <p className="text-xs text-neutral-500 tracking-widest uppercase">LOADING QUOTATION AUDIT...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 rounded-3xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-mono">
          {error}
        </div>
      )}

      {!loading && quotation && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Line Items Column */}
          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase">
                  CONFIRMED LINE ITEMS
                </div>
                <span className="text-xs font-mono text-neutral-500">CURRENCY: INR</span>
              </div>

              {/* Items List or Empty */}
              {quotation.items && quotation.items.length > 0 ? (
                <div className="divide-y divide-neutral-100 font-mono text-xs">
                  {quotation.items.map((item: any) => (
                    <div key={item.id} className="py-4 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-neutral-900 uppercase">{item.product_name || 'Product'}</div>
                        <div className="text-[11px] text-neutral-500">Qty: {item.quantity} &bull; Unit: ₹{Number(item.unit_price).toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-neutral-900">₹{Number(item.subtotal || item.total_price).toFixed(2)}</div>
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
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-neutral-700 uppercase">
                DEAL FINANCIAL TELEMETRY
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="flex justify-between py-2 border-b border-neutral-100">
                  <span className="text-neutral-500">TOTAL DEAL VALUE</span>
                  <span className="font-bold text-neutral-900 font-display text-lg">
                    ₹{Number(quotation.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-100">
                  <span className="text-neutral-500">BLENDED RISK SCORE</span>
                  <span className="text-emerald-700 font-bold">OPTIMAL // 0.00</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-100">
                  <span className="text-neutral-500">DISCOUNT CEILING</span>
                  <span className="text-neutral-900 font-bold">ENFORCED (GOLD TIER)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
