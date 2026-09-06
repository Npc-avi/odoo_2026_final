import React, { useEffect } from 'react';
import { useRfq } from '../hook/useRfq';
import { StatusBadge } from '@/components/StatusBadge';
import { GitPullRequest, RefreshCw, AlertTriangle } from 'lucide-react';

export const RfqListPage: React.FC = () => {
  const { rfqs, loading, error, loadRfqs } = useRfq();

  useEffect(() => {
    loadRfqs();
  }, [loadRfqs]);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase mb-2">
            LEAD CONVERSION // INBOUND DEMAND
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#111111] uppercase tracking-tight">
            INBOUND RFQ INQUIRIES
          </h1>
        </div>

        <button
          onClick={() => loadRfqs()}
          className="p-3 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-black hover:border-neutral-400 transition-colors cursor-pointer"
          title="Refresh RFQs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && (
        <div className="p-16 rounded-3xl border border-neutral-200 bg-white text-center space-y-3 font-mono shadow-sm">
          <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-[#ff3b30] animate-spin mx-auto" />
          <p className="text-xs text-neutral-500 tracking-widest uppercase">FETCHING PORTAL INQUIRIES...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 rounded-3xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-mono">
          {error}
        </div>
      )}

      {!loading && !error && rfqs.length === 0 && (
        <div className="p-16 rounded-3xl border border-dashed border-neutral-300 bg-neutral-50/50 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-400">
            <GitPullRequest className="w-6 h-6" />
          </div>
          <h3 className="font-display font-black text-xl text-neutral-900 uppercase tracking-tight">
            NO PENDING INQUIRIES
          </h3>
          <p className="text-xs text-neutral-500 font-mono max-w-sm mx-auto">
            Client inquiries submitted through the external customer portal will populate this queue.
          </p>
        </div>
      )}

      {!loading && !error && rfqs.length > 0 && (
        <div className="rounded-3xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-200 uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="px-6 py-4">RFQ ID</th>
                  <th className="px-6 py-4">CLIENT COMPANY</th>
                  <th className="px-6 py-4">TARGET BUDGET</th>
                  <th className="px-6 py-4">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-900">
                {rfqs.map((rfq) => (
                  <tr key={rfq.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#ff3b30]">
                      {rfq.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 font-bold text-neutral-900">
                      {rfq.company_name || 'Enterprise Buyer'}
                    </td>
                    <td className="px-6 py-4 font-bold text-neutral-900">
                      ₹{Number(rfq.estimated_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={rfq.status || 'pending'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
