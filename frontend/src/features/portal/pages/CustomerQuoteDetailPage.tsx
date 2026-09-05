import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  fetchCustomerQuotationDetailApi,
  fetchNegotiationThreadApi,
  submitNegotiationMessageApi,
  confirmCustomerQuotationApi,
} from '@/features/quotations/services/quotations.api';
import { StatusBadge } from '@/components/StatusBadge';
import {
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Percent,
  Clock,
  Send,
} from 'lucide-react';
import { toast } from 'react-toastify';

export const CustomerQuoteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [quotation, setQuotation] = useState<any>(null);
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Negotiation form inputs (Screenshot 4)
  const [counterDiscount, setCounterDiscount] = useState<string>('');
  const [requestedDate, setRequestedDate] = useState<string>('');
  const [lineComments, setLineComments] = useState<{ [key: string]: string }>({});
  const [generalComment, setGeneralComment] = useState<string>('');

  const [submittingNeg, setSubmittingNeg] = useState<boolean>(false);
  const [confirming, setConfirming] = useState<boolean>(false);

  const loadData = async (quoteId: string) => {
    try {
      setLoading(true);
      setError(null);
      const [qData, negData] = await Promise.all([
        fetchCustomerQuotationDetailApi(quoteId),
        fetchNegotiationThreadApi(quoteId, true).catch(() => ({ negotiations: [] })),
      ]);
      const q = qData.quotation || qData;
      setQuotation(q);
      setNegotiations(negData.negotiations || []);
      if (q.promisedDeliveryDate) {
        setRequestedDate(new Date(q.promisedDeliveryDate).toISOString().slice(0, 10));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load quotation details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  // Confirm quotation (green button)
  const handleConfirmQuotation = async () => {
    if (!id) return;
    try {
      setConfirming(true);
      const res = await confirmCustomerQuotationApi(id);
      toast.success(res.message || 'Quotation confirmed successfully! Proceeding to fulfillment.');
      await loadData(id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm quotation.');
    } finally {
      setConfirming(false);
    }
  };

  // Submit request / negotiate (dark button)
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const compiledComments = Object.entries(lineComments)
      .filter(([_, comment]) => typeof comment === 'string' && comment.trim().length > 0)
      .map(([lineName, comment]) => `${lineName}: ${(comment as string).trim()}`)
      .join(' | ');

    const finalComment = [compiledComments, generalComment.trim()].filter(Boolean).join(' - ') || 'Customer requested counter-offer terms.';

    try {
      setSubmittingNeg(true);
      await submitNegotiationMessageApi(
        id,
        {
          proposedDiscountPct: counterDiscount ? parseFloat(counterDiscount) : undefined,
          requestedDeliveryDate: requestedDate || undefined,
          comments: finalComment,
        },
        true
      );
      toast.success('Negotiation request submitted! Status updated to Negotiating across all dashboards.');
      setCounterDiscount('');
      setGeneralComment('');
      await loadData(id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit negotiation request.');
    } finally {
      setSubmittingNeg(false);
    }
  };

  const isConfirmed = quotation?.status === 'confirmed' || quotation?.status === 'approved';

  // Fallback demo items if no backend items yet
  const items = quotation?.items?.length > 0
    ? quotation.items
    : [
        {
          itemId: '1',
          productName: 'Extended Warranty',
          unitListPrice: 180,
          appliedDiscountPct: 10,
        },
        {
          itemId: '2',
          productName: 'Onsite Setup',
          unitListPrice: 450,
          appliedDiscountPct: 18,
        },
      ];

  const getStatusLabel = () => {
    if (isConfirmed) return 'Status: Confirmed';
    if (quotation?.status === 'under_negotiation') return 'Status: Under Negotiation';
    if (['pending_manager', 'pending_finance', 'pending'].includes(quotation?.status)) return 'Status: Pending Approval';
    return 'Status: Under Negotiation';
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Top Navigation & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              to="/portal/quotations"
              className="inline-flex items-center gap-1 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>MY QUOTATIONS</span>
            </Link>
            <span className="text-neutral-600">/</span>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
              Customer Portal Negotiation Screen
            </h1>
          </div>
          <p className="text-xs font-mono text-neutral-400">
            Customer reviews and negotiates the quote directly, no email needed
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-4 py-1.5 rounded-2xl bg-amber-600/90 text-white font-mono text-xs font-bold tracking-wide shadow">
            {getStatusLabel()}
          </span>
        </div>
      </div>

      {loading && (
        <div className="p-16 rounded-3xl border border-neutral-800 bg-[#09090b] text-center space-y-3 font-mono">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-[#ff3b30] animate-spin mx-auto" />
          <p className="text-xs text-neutral-400 tracking-widest uppercase">LOADING PROPOSAL DETAILS...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-mono">
          {error}
        </div>
      )}

      {!loading && (
        <form onSubmit={handleSubmitRequest} className="space-y-8">
          {/* Table: Line | Customer Comment (Screenshot 4) */}
          <div className="rounded-3xl border border-neutral-800 bg-[#09090b] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 uppercase text-[11px] tracking-wider bg-black/40">
                    <th className="py-3.5 px-6 w-1/3">Line</th>
                    <th className="py-3.5 px-6">Customer Comment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {items.map((item: any) => {
                    const itemName = item.productName || item.product_name || 'Service Line';
                    return (
                      <tr key={item.itemId || item.id} className="hover:bg-neutral-900/40 transition-colors">
                        <td className="py-4 px-6 font-bold text-white align-middle">
                          {itemName}
                        </td>
                        <td className="py-4 px-6 align-middle">
                          <input
                            type="text"
                            disabled={isConfirmed}
                            placeholder={`Comment on ${itemName}... (e.g. Can this be 15% off?)`}
                            value={lineComments[itemName] || ''}
                            onChange={(e) =>
                              setLineComments((prev) => ({
                                ...prev,
                                [itemName]: e.target.value,
                              }))
                            }
                            className="w-full px-4 py-2.5 rounded-xl bg-black border border-neutral-800 text-white font-mono text-xs focus:border-amber-500 focus:outline-none disabled:opacity-60 placeholder:text-neutral-600"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form Inputs: Counter Discount % & Requested Delivery Date (Screenshot 4) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-mono text-neutral-400 uppercase tracking-wider">
                Counter Discount %
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  disabled={isConfirmed}
                  placeholder="e.g. 15"
                  value={counterDiscount}
                  onChange={(e) => setCounterDiscount(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#09090b] border border-neutral-800 text-white font-mono text-sm focus:border-amber-500 focus:outline-none disabled:opacity-60"
                />
                <Percent className="w-4 h-4 text-neutral-500 absolute right-4 top-3.5 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-neutral-400 uppercase tracking-wider">
                Requested Delivery Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  disabled={isConfirmed}
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#09090b] border border-neutral-800 text-white font-mono text-sm focus:border-amber-500 focus:outline-none disabled:opacity-60"
                />
                <Calendar className="w-4 h-4 text-neutral-500 absolute right-4 top-3.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Action Buttons: Submit Request & Confirm Quotation (Screenshot 4) */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={submittingNeg || isConfirmed}
              className="px-6 py-3 rounded-2xl bg-[#09090b] hover:bg-neutral-800 text-white border border-neutral-700 font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-40"
            >
              {submittingNeg ? 'Submitting...' : 'Submit Request'}
            </button>

            <button
              type="button"
              onClick={handleConfirmQuotation}
              disabled={confirming || isConfirmed}
              className="px-7 py-3 rounded-2xl bg-[#10b981] hover:bg-emerald-600 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-40 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{confirming ? 'Confirming...' : 'Confirm Quotation'}</span>
            </button>

            {isConfirmed && (
              <span className="text-xs font-mono text-emerald-400 font-bold ml-auto">
                Quotation Confirmed & Settled
              </span>
            )}
          </div>

          {/* Yellow/Amber Banner at bottom (Screenshot 4) */}
          <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-950/80 text-amber-300/90 font-mono text-xs leading-relaxed">
            If final terms exceed thresholds, the quote automatically re-enters approval (Screen 6).
          </div>
        </form>
      )}
    </div>
  );
};
