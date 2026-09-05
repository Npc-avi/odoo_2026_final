import React, { useEffect } from 'react';
import { useDealHealth } from '../hook/useDealHealth';
import { Activity, AlertTriangle, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';

export const DealHealthPage: React.FC = () => {
  const { alerts, loading, error, loadAlerts } = useDealHealth();

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase mb-2">
            TELEMETRY // AUTONOMOUS SWEEPS
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#111111] uppercase tracking-tight">
            DEAL HEALTH RADAR
          </h1>
        </div>

        <button
          onClick={() => loadAlerts()}
          className="p-3 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-black hover:border-neutral-400 transition-colors cursor-pointer"
          title="Run Telemetry Sweep"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && (
        <div className="p-16 rounded-3xl border border-neutral-200 bg-white text-center space-y-3 font-mono shadow-sm">
          <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-[#ff3b30] animate-spin mx-auto" />
          <p className="text-xs text-neutral-500 tracking-widest uppercase">SWEEPING FOR STALLED DEALS & MARGIN EROSION...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 rounded-3xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-mono">
          {error}
        </div>
      )}

      {!loading && !error && alerts.length === 0 && (
        <div className="p-16 rounded-3xl border border-neutral-200 bg-white text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-display font-black text-xl text-neutral-900 uppercase tracking-tight">
            DEAL PIPELINE AT PEAK VELOCITY
          </h3>
          <p className="text-xs text-neutral-600 font-mono max-w-md mx-auto">
            Zero stalled negotiations or negative margin leaks detected by the hourly PostgreSQL sweep engine.
          </p>
        </div>
      )}

      {!loading && !error && alerts.length > 0 && (
        <div className="space-y-4">
          {alerts.map((al) => (
            <div
              key={al.id}
              className="rounded-3xl border border-amber-200 bg-amber-50/60 p-6 sm:p-8 flex items-start gap-4 shadow-sm"
            >
              <div className="p-3 rounded-2xl bg-amber-100 border border-amber-300 text-amber-700 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-mono text-amber-800 uppercase tracking-widest font-bold">
                  FLAG // MARGIN RISK ESCALATION
                </div>
                <h4 className="font-display font-black text-xl text-neutral-900 uppercase tracking-tight">
                  {al.title || 'Attention Required On Stalled Quotation'}
                </h4>
                <p className="text-xs text-neutral-700 font-mono leading-relaxed max-w-2xl">
                  {al.message || 'Quotation has lingered beyond SLA ceiling without customer interaction.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
