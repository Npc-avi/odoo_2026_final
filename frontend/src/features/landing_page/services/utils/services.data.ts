import { ServiceItem } from '@/types';

export const SERVICES_DATA: ServiceItem[] = [
  {
    id: 'governance',
    index: '001',
    title: 'DISCOUNT GOVERNANCE',
    tagline: 'Automated Multi-Tier Risk Evaluation & Approval Chains',
    description:
      'Enforce pricing discipline without bottlenecking sales velocity. Compute blended risk across disparate category ceilings and automatically route quotes to Sales Managers and Finance.',
    image:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop',
    features: [
      'Blended Risk Scoring (catches accumulated micro-violations)',
      'Customer Tier Ceilings (Bronze 5%, Silver 10%, Gold 15%)',
      'Category-Specific Ceilings (e.g. 15% Hardware vs 10% Services)',
      'Automated Multi-Level Escalation (Manager & Finance Audit Trail)',
    ],
    equipment: [
      'Blended Risk Engine',
      'Approval Chain Dispatcher',
      'Immutable Audit Log',
      'Real-Time Margin Safeguard',
    ],
    targetAthletes: 'Sales Reps, Deal Desk Approvers, Finance Directors & CROs',
  },
  {
    id: 'fulfillment',
    index: '002',
    title: 'WAREHOUSE SPLITTING',
    tagline: 'Dynamic Stock Availability & Automated Backorder Routing',
    description:
      'React to inventory reality in real time. Automatically split orders across Main Warehouse and regional East Depots to minimize delivery legs, with automated backorder consolidation prompts.',
    image:
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1200&auto=format&fit=crop',
    features: [
      'Multi-Warehouse Stock Splitting Algorithm',
      'Weighted Shipping Cost & Shipment Count Minimization',
      'Automated "Consolidate Backorder" Mid-Fulfillment Prompts',
      'Granular Manual Allocation Override for Operations Teams',
    ],
    equipment: [
      'Multi-Depot Stock Matrix',
      'Replenishment Triggers',
      'Backorder Consolidation Queue',
      'Cost-Optimized Split Engine',
    ],
    targetAthletes: 'Operations Managers, Logistics Dispatchers & Inventory Leads',
  },
  {
    id: 'billing',
    index: '003',
    title: 'HYBRID BILLING',
    tagline: 'Unified Orders for Physical Assets & Recurring SaaS Subscriptions',
    description:
      'Unify complex B2B commerce onto a single contract. Seamlessly combine one-time hardware purchases with monthly, quarterly, or annual subscription lines complete with automated proration.',
    image:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop',
    features: [
      'Single-Order Reconciled Hardware + Subscription Contracts',
      'Automated Mid-Cycle Proration on Quantity or Plan Changes',
      'Upcoming Billing Schedules & Milestone Milestones View',
      'Automated Credit Note & Partial Refund Cancellation Rules',
    ],
    equipment: [
      'Proration Calculation Engine',
      'Unified Recurring Scheduler',
      'Multi-Cadence Invoicing Core',
      'Credit Note Reconciler',
    ],
    targetAthletes: 'Billing Operations, Finance Controllers & Enterprise Account Teams',
  },
  {
    id: 'portal',
    index: '004',
    title: 'PORTAL NEGOTIATION',
    tagline: 'Living Collaborative Deal Room for Frictionless Closes',
    description:
      'Replace static PDF attachments and endless email threads with a live, customer-facing negotiation portal. Buyers propose counter-discounts and confirm terms with a single click.',
    image:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop',
    features: [
      'Interactive Customer Portal with Magic Link Authentication',
      'Line-Item Specific Comments & Structured Change Requests',
      'Counter-Discount Proposal Field with Instant Margin Preview',
      'Automatic Re-Approval Loop if Counter Exceeds Policy Limits',
    ],
    equipment: [
      'Restricted Client Portal View',
      'WebSocket Collaboration Room',
      'One-Click Terms Confirmation',
      'Counter-Offer Impact Simulator',
    ],
    targetAthletes: 'B2B Customers, Procurement Teams & Enterprise Account Executives',
  },
];
