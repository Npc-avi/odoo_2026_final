import React, { useState } from 'react';
import { submitPortalRfqApi } from '@/features/rfq/services/rfq.api';
import { ScrambleCTAButton } from '@/components/ScrambleCTAButton';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export const CustomerRfqPage: React.FC = () => {
  const [targetPrice, setTargetPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitPortalRfqApi({
        targetPrice: Number(targetPrice),
        notes,
        items: []
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit RFQ.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10 max-w-3xl">
      {/* Header */}
      <div className="pb-6 border-b border-neutral-200">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase mb-2">
          CLIENT PORTAL // CUSTOM INQUIRY
        </div>
        <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#111111] uppercase tracking-tight">
          COMPOSE TARGET RFQ
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 font-mono mt-2 leading-relaxed">
          Specify target budget guidelines and technical project scopes for dynamic discount evaluation.
        </p>
      </div>

      {success ? (
        <div className="p-12 rounded-3xl border border-emerald-500/25 bg-[#09090b] text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-display font-black text-2xl text-white uppercase tracking-tight">
            RFQ TRANSMITTED TO SALES DESK
          </h3>
          <p className="text-xs text-neutral-400 font-mono max-w-md mx-auto leading-relaxed">
            Your dedicated sales director has received your parameters and is formulating a proposal.
          </p>
          <div className="pt-4">
            <ScrambleCTAButton
              text="SUBMIT ANOTHER INQUIRY"
              variant="white"
              size="sm"
              onClick={() => {
                setSuccess(false);
                setTargetPrice('');
                setNotes('');
              }}
            />
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-3xl border border-neutral-800 bg-[#09090b] p-8 sm:p-10 space-y-6 shadow-2xl">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-mono font-bold tracking-widest text-neutral-400 uppercase mb-2">
              TARGET BUDGET CEILING (USD)
            </label>
            <input
              type="number"
              required
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="e.g. 75000"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-5 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#ff3b30] transition-colors font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold tracking-widest text-neutral-400 uppercase mb-2">
              SCOPE SPECIFICATIONS & DELIVERY CONSTRAINTS
            </label>
            <textarea
              rows={5}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detail required hardware units, SLA tier requirements, or target delivery dates..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-5 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#ff3b30] transition-colors font-mono resize-none"
            />
          </div>

          <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-between">
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3.5 rounded-full bg-[#ff3b30] hover:bg-[#ff4d42] text-white font-mono font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#ff3b30]/30 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'DISPATCHING TELEMETRY...' : 'SUBMIT RFQ TO SALES DESK'}
            </button>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
              CONFIDENTIAL INQUIRY
            </span>
          </div>
        </form>
      )}
    </div>
  );
};
