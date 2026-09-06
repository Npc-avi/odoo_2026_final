import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '@/context/socket.context';
import { StatusBadge } from '@/components/StatusBadge';
import { FileText, RefreshCw, AlertTriangle, ArrowUpRight } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const CustomerQuotesPage: React.FC = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadPortalQuotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${BASE_URL}/quotations/portal/my-quotations`, { withCredentials: true });
      setQuotes(res.data.quotations || res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load your quotations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalQuotes();
  }, []);

  // Real-time Socket.IO listeners for Customer Proposals
  useEffect(() => {
    if (!socket) return;

    const handlePortalQuoteChange = (data: any) => {
      console.log('[Socket.IO Customer Quotes] Real-time change detected:', data);
      loadPortalQuotes();
    };

    socket.on('quotation:created', handlePortalQuoteChange);
    socket.on('quotation:updated', handlePortalQuoteChange);
    socket.on('negotiation:updated', handlePortalQuoteChange);
    socket.on('approval:updated', handlePortalQuoteChange);

    return () => {
      socket.off('quotation:created', handlePortalQuoteChange);
      socket.off('quotation:updated', handlePortalQuoteChange);
      socket.off('negotiation:updated', handlePortalQuoteChange);
      socket.off('approval:updated', handlePortalQuoteChange);
    };
  }, [socket]);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase mb-2">
            CLIENT PORTAL // PROPOSALS
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#111111] uppercase tracking-tight">
            MY QUOTATIONS
          </h1>
        </div>

        <button
          onClick={loadPortalQuotes}
          className="p-3 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-black hover:border-neutral-400 transition-colors cursor-pointer"
          title="Refresh Proposals"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && (
        <div className="p-16 rounded-3xl border border-neutral-200 bg-white text-center space-y-3 font-mono shadow-sm">
          <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-[#ff3b30] animate-spin mx-auto" />
          <p className="text-xs text-neutral-500 tracking-widest uppercase">FETCHING ACTIVE PROPOSALS...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 rounded-3xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-mono">
          {error}
        </div>
      )}

      {!loading && !error && quotes.length === 0 && (
        <div className="p-16 rounded-3xl border border-dashed border-neutral-300 bg-neutral-50/50 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-400">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-display font-black text-xl text-neutral-900 uppercase tracking-tight">
            NO ACTIVE PROPOSALS
          </h3>
          <p className="text-xs text-neutral-500 font-mono max-w-sm mx-auto">
            Proposals drafted by your account executive will appear here for your review and digital acceptance.
          </p>
        </div>
      )}

      {!loading && !error && quotes.length > 0 && (
        <div className="rounded-3xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-200 uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="px-6 py-4">PROPOSAL #</th>
                  <th className="px-6 py-4">TOTAL CONTRACT VALUE</th>
                  <th className="px-6 py-4">STATUS</th>
                  <th className="px-6 py-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-900">
                {quotes.map((q) => {
                  const targetId = q.quotation_id || q.id;
                  return (
                    <tr
                      key={targetId}
                      onClick={() => navigate(`/portal/quotations/${targetId}`)}
                      className="hover:bg-neutral-50/80 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4 font-bold text-[#ff3b30]">
                        {q.quotation_code || q.quotation_number || targetId.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 font-bold text-neutral-900 text-sm">
                        ₹{Number(q.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={q.status || 'draft'} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 group-hover:text-[#ff3b30] transition-colors">
                          <span>REVIEW & SIGN</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
