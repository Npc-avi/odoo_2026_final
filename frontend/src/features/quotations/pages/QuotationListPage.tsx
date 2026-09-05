import React, { useEffect, useState } from 'react';
import { useQuotations } from '../hook/useQuotations';
import { useSocket } from '@/context/socket.context';
import { StatusBadge } from '@/components/StatusBadge';
import { ScrambleCTAButton } from '@/components/ScrambleCTAButton';
import {
  FileText,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  Kanban,
  Table as TableIcon,
  List,
  Plus,
  ArrowRight,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const QuotationListPage: React.FC = () => {
  const { quotations, loading, error, loadQuotations } = useQuotations();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  // Real-time Socket.IO listeners for Kanban & Table updates
  useEffect(() => {
    if (!socket) return;

    const handleRealtimeChange = (data: any) => {
      console.log('[Socket.IO Kanban/Table] Real-time quotation change detected:', data);
      loadQuotations();
    };

    socket.on('quotation:created', handleRealtimeChange);
    socket.on('quotation:updated', handleRealtimeChange);
    socket.on('negotiation:updated', handleRealtimeChange);
    socket.on('approval:updated', handleRealtimeChange);

    return () => {
      socket.off('quotation:created', handleRealtimeChange);
      socket.off('quotation:updated', handleRealtimeChange);
      socket.off('negotiation:updated', handleRealtimeChange);
      socket.off('approval:updated', handleRealtimeChange);
    };
  }, [socket, loadQuotations]);

  const filteredQuotes = quotations.filter((q) => {
    const qCode = (q.quotation_code || q.quotation_number || '').toLowerCase();
    const cName = (q.customer_company_name || q.company_name || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return qCode.includes(query) || cName.includes(query);
  });

  // Stages for Kanban Pipeline
  const pipelineStages = [
    {
      id: 'draft',
      title: '1. DRAFT',
      statuses: ['draft'],
      color: 'border-neutral-700',
    },
    {
      id: 'approval',
      title: '2. PENDING APPROVAL',
      statuses: ['pending_manager', 'pending_finance', 'pending'],
      color: 'border-amber-500/40 text-amber-400',
    },
    {
      id: 'negotiating',
      title: '3. NEGOTIATING',
      statuses: ['sent', 'under_negotiation'],
      color: 'border-cyan-500/40 text-cyan-400',
    },
    {
      id: 'confirmed',
      title: '4. CONFIRMED',
      statuses: ['confirmed', 'approved'],
      color: 'border-emerald-500/40 text-emerald-400',
    },
    {
      id: 'fulfillment',
      title: '5. IN FULFILLMENT',
      statuses: ['in_fulfillment', 'fulfillment'],
      color: 'border-purple-500/40 text-purple-400',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase mb-2">
            SCREEN 3 // PIPELINE & KANBAN
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#111111] uppercase tracking-tight">
            QUOTATION PIPELINE
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center p-1 rounded-full bg-neutral-100 border border-neutral-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-[#ff3b30] text-white shadow-sm'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>KANBAN</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#ff3b30] text-white shadow-sm'
                  : 'text-neutral-600 hover:text-black'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>TABLE</span>
            </button>
          </div>

          <button
            onClick={() => loadQuotations()}
            className="p-3 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-black hover:border-neutral-400 transition-colors cursor-pointer"
            title="Refresh Pipeline"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/quotations/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#ff3b30] hover:bg-red-600 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-red-950/40"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE QUOTATION</span>
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Filter by quote code or customer name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-80 px-4 py-2 rounded-xl bg-white border border-neutral-300 text-[#111111] font-mono text-xs focus:border-[#ff3b30] focus:outline-none placeholder:text-neutral-400 shadow-sm"
        />
        <span className="text-xs font-mono text-neutral-600 font-bold shrink-0">
          TOTAL: {filteredQuotes.length} DEALS
        </span>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-16 rounded-3xl border border-neutral-200 bg-white text-center space-y-3 font-mono shadow-sm">
          <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-[#ff3b30] animate-spin mx-auto" />
          <p className="text-xs text-neutral-500 tracking-widest uppercase">FETCHING PIPELINE LEDGER...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-6 rounded-3xl border border-rose-200 bg-rose-50 flex items-center gap-3 text-rose-700 text-xs font-mono">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Kanban View */}
      {!loading && !error && viewMode === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {pipelineStages.map((stage) => {
            const stageQuotes = filteredQuotes.filter((q) =>
              stage.statuses.includes(q.status)
            );
            const totalStageValue = stageQuotes.reduce(
              (acc, q) => acc + Number(q.total_amount || 0),
              0
            );

            return (
              <div
                key={stage.id}
                className="flex flex-col rounded-3xl border border-neutral-200 bg-neutral-50/70 p-4 space-y-4 min-h-[500px]"
              >
                {/* Stage Header */}
                <div className="border-b border-neutral-200 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black tracking-wider text-neutral-800">
                      {stage.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-neutral-200 text-[10px] font-mono text-neutral-600 font-bold shadow-xs">
                      {stageQuotes.length}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-neutral-500 mt-1 font-semibold">
                    ${totalStageValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </div>
                </div>

                {/* Stage Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {stageQuotes.map((quote) => (
                    <div
                      key={quote.id}
                      onClick={() => navigate(`/quotations/${quote.id}/edit`)}
                      className="p-4 rounded-2xl border border-neutral-200 hover:border-[#ff3b30]/60 bg-white hover:shadow-md transition-all cursor-pointer space-y-3 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-neutral-900 group-hover:text-[#ff3b30] transition-colors">
                          {quote.quotation_code || quote.quotation_number || quote.id.slice(0, 8).toUpperCase()}
                        </span>
                        <StatusBadge status={quote.status} repApproved={quote.rep_approved} />
                      </div>

                      <div className="font-mono text-xs text-neutral-700 font-semibold truncate">
                        {quote.customer_company_name || quote.company_name || 'Client Account'}
                      </div>

                      <div className="flex items-baseline justify-between pt-2 border-t border-neutral-100 font-mono">
                        <span className="text-neutral-900 font-bold text-sm">
                          ${Number(quote.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        {quote.total_margin_pct && (
                          <span className="text-[11px] text-emerald-700 font-bold">
                            {Number(quote.total_margin_pct).toFixed(0)}% Margin
                          </span>
                        )}
                      </div>

                      {Number(quote.blended_risk_score || 0) > 0 && (
                        <div className="text-[10px] font-mono text-amber-700 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Risk: {Number(quote.blended_risk_score).toFixed(1)} pts</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {stageQuotes.length === 0 && (
                    <div className="text-center py-12 border border-dashed border-neutral-300 rounded-2xl">
                      <span className="text-[10px] font-mono text-neutral-400 uppercase">NO DEALS</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {!loading && !error && viewMode === 'table' && (
        <div className="rounded-3xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500 uppercase text-[10px] tracking-wider">
                  <th className="py-4 px-6">QUOTE NUMBER</th>
                  <th className="py-4 px-6">CUSTOMER</th>
                  <th className="py-4 px-6">STATUS</th>
                  <th className="py-4 px-6">TOTAL AMOUNT</th>
                  <th className="py-4 px-6">MARGIN %</th>
                  <th className="py-4 px-6">RISK SCORE</th>
                  <th className="py-4 px-6 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-900">
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-4 px-6 font-bold text-neutral-900">
                      {quote.quotation_code || quote.quotation_number || quote.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-4 px-6 text-neutral-700">
                      {quote.customer_company_name || quote.company_name || 'Acme Client'}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={quote.status} repApproved={quote.rep_approved} />
                    </td>
                    <td className="py-4 px-6 text-neutral-900 font-bold">
                      ${Number(quote.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-emerald-700 font-bold">
                      {quote.total_margin_pct ? `${Number(quote.total_margin_pct).toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`font-bold ${
                          Number(quote.blended_risk_score || 0) > 0 ? 'text-amber-700' : 'text-neutral-400'
                        }`}
                      >
                        {Number(quote.blended_risk_score || 0).toFixed(1)} pts
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        to={`/quotations/${quote.id}/edit`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-[#ff3b30] text-neutral-700 hover:text-white font-mono text-xs transition-colors border border-neutral-200"
                      >
                        <span>OPEN BUILDER</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
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
