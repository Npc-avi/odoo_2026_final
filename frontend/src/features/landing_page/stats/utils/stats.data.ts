import { StatMetric } from '@/types';

export const STATS_DATA: StatMetric[] = [
  {
    id: 'engine',
    number: '360°',
    label: 'SELF-GOVERNING DEAL ENGINE',
    subtext:
      'Autonomous quotation-to-cash lifecycle enforcing pricing rules, stock allocation, and proration on a single living order.',
  },
  {
    id: 'margin',
    number: '+4.8%',
    label: 'AVERAGE MARGIN PROTECTION',
    subtext:
      'Blended discount scoring stops micro-violations across hardware and services from leaking profitability.',
    tags: ['Bronze 5%', 'Silver 10%', 'Gold 15%', 'Finance Approval Gate'],
  },
  {
    id: 'fulfillment',
    number: '98.6%',
    label: 'MULTI-DEPOT FULFILLMENT EFFICIENCY',
    subtext:
      'Intelligent stock-aware order splitting across Main Warehouse and East Depot with weighted freight optimization.',
    listItems: [
      'Multi-Warehouse Splitting',
      'Automated Backorder Consolidation',
      'Live Replenishment Triggers',
      'Manual Dispatch Overrides',
      'Unified Carrier Tracking',
    ],
  },
  {
    id: 'velocity',
    number: '4.2x',
    label: 'FASTER NEGOTIATION VELOCITY',
    subtext:
      'Live customer negotiation portal eliminates slow email chains with line-level change requests and 1-click binding terms.',
  },
];
