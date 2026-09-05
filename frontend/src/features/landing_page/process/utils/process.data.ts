import { ProcessStep } from '@/types';

export const PROCESS_STEPS_DATA: ProcessStep[] = [
  {
    step: 'STAGE',
    index: '001',
    title: 'QUOTE BUILDER & REAL-TIME UPSELLS',
    highlight: 'Instant margin preview and historical co-purchase recommendations',
    description:
      'Sales reps build quotations across hardware, services, and subscription categories. Live upsell and cross-sell suggestions surface automatically alongside the cart, calculating real-time margin impact before submission.',
  },
  {
    step: 'STAGE',
    index: '002',
    title: 'BLENDED RISK GOVERNANCE & APPROVALS',
    highlight: 'Preventing margin leaks through cross-category risk evaluation',
    description:
      'The engine evaluates line-by-line discount ceilings against customer tier limits (Bronze, Silver, Gold). Blended risk scoring catches distributed micro-violations and auto-routes for Sales Manager and Finance sign-off.',
  },
  {
    step: 'STAGE',
    index: '003',
    title: 'MULTI-WAREHOUSE AUTO-FULFILLMENT',
    highlight: 'Optimized inventory dispatch across Main Warehouse and East Depot',
    description:
      'Approved orders automatically split fulfillment according to real-time stock levels, applying shipping cost weightings to minimize carrier legs. Automated prompts consolidate remaining backorders when stock arrives.',
  },
  {
    step: 'STAGE',
    index: '004',
    title: 'CLIENT PORTAL NEGOTIATION & HYBRID BILLING',
    highlight: 'A living, collaborative agreement from counter-offer to recurring cash',
    description:
      'Buyers negotiate in a restricted customer portal with line-level commenting and counter-discount proposals. Upon 1-click confirmation, the hybrid billing engine schedules recurring subscription invoices alongside one-time charges.',
  },
];
