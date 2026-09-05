import React, { useEffect } from 'react';
import { useCatalog } from '../hook/useCatalog';
import { ScrambleCTAButton } from '@/components/ScrambleCTAButton';
import { Package, RefreshCw, AlertTriangle } from 'lucide-react';

export const CatalogPage: React.FC = () => {
  const { products, loading, error, loadProducts } = useCatalog();

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-200 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-bold tracking-widest text-[#ff3b30] uppercase mb-2">
            CATALOG &amp; PRICE LISTS // MATRIX
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-[#111111] uppercase tracking-tight">
            ENTERPRISE CATALOG
          </h1>
        </div>

        <button
          onClick={() => loadProducts()}
          className="p-3 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-black hover:border-neutral-400 transition-colors cursor-pointer"
          title="Refresh Catalog"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && (
        <div className="p-16 rounded-3xl border border-neutral-200 bg-white text-center space-y-3 font-mono shadow-sm">
          <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-[#ff3b30] animate-spin mx-auto" />
          <p className="text-xs text-neutral-500 tracking-widest uppercase">LOADING SKU TELEMETRY...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 rounded-3xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-mono">
          {error}
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="p-16 rounded-3xl border border-dashed border-neutral-300 bg-neutral-50/50 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-400">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="font-display font-black text-xl text-neutral-900 uppercase tracking-tight">
            NO SKUS SEEDED
          </h3>
          <p className="text-xs text-neutral-500 font-mono max-w-sm mx-auto">
            Configured products across Hardware, Professional Services, and SaaS Subscriptions will appear here.
          </p>
        </div>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((prod, idx) => (
            <div
              key={prod.id}
              className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 flex flex-col justify-between hover:border-neutral-300 hover:shadow-md transition-all duration-300 group shadow-sm space-y-6"
            >
              <div>
                {/* Index Bar */}
                <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-neutral-500 mb-4 border-b border-neutral-100 pb-3">
                  <span className="text-[#ff3b30] font-bold text-[10px]">
                    SKU // {prod.sku || `ITEM-00${idx + 1}`}
                  </span>
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    ACTIVE
                  </span>
                </div>

                <h3 className="font-display font-black text-xl sm:text-2xl text-neutral-900 uppercase tracking-tight mb-2 group-hover:text-[#ff3b30] transition-colors">
                  {prod.name}
                </h3>

                <p className="text-xs text-neutral-600 font-mono leading-relaxed line-clamp-3 mb-4">
                  {prod.description || 'Enterprise grade offering with dynamic multi-tier volume discount ceiling rules.'}
                </p>

                <div className="font-display font-black text-2xl sm:text-3xl text-neutral-900">
                  ${Number(prod.base_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                <ScrambleCTAButton
                  text="ADD TO QUOTE"
                  variant="red"
                  size="xs"
                  arrowIcon="diagonal"
                  onClick={() => {}}
                />
                <span className="text-[10px] font-mono text-neutral-400 uppercase font-semibold">
                  STD LIST PRICE
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
