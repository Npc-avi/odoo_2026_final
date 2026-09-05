import React from 'react';

// Card 1: Blended Discount Risk Matrix & Approval Gate ASCII
export const DISCOUNT_GATE_ASCII = `    +===========================================+
    |       DEALFLOW360 // BLENDED RISK GATE     |
    +===========================================+
    |  CUSTOMER TIER : GOLD [MAX CEILING 15%]   |
    |-------------------------------------------|
    | LINE 01: HARDWARE (12% DISC / 15% CAP) OK |
    | LINE 02: SERVICES (18% DISC / 10% CAP) !! |
    +-------------------------------------------+
               \\   OVER-LIMIT DETECTED  /
                \\   BLENDED RISK: 0.84 /
                 +--------------------+
                 | AUTOMATED ROUTING  |
                 | -> SALES MANAGER   |
                 | -> FINANCE DIR     |
                 +--------------------+
                         ||
                 [ AUDIT LOG SEALED ]`;

export const PENGUIN_ASCII = DISCOUNT_GATE_ASCII;

// Card 2: Multi-Warehouse Auto-Split & Fulfillment Topology ASCII
export const WAREHOUSE_SPLIT_ASCII = `          [ DEALFLOW ORDER #DF-9281 ]
                     |
         +-----------+-----------+
         |                       |
   [ MAIN WAREHOUSE ]      [ EAST DEPOT ]
   * 85 Units In-Stock     * 15 Units In-Stock
   * Lowest Zone Rate      * Regional Express
         |                       |
   [ SHIPMENT #01 ]        [ SHIPMENT #02 ]
         \\                       /
          +----------+----------+
                     |
         [ BACKORDER CONSOLIDATED ]
         [ TRANSIT COST MINIMIZED ]`;

export const SHIP_VESSEL_ASCII = WAREHOUSE_SPLIT_ASCII;

// Card 3: Hybrid Billing & Subscription Proration Architecture ASCII
export const HYBRID_BILLING_ASCII = `    +-------------------------------------------+
    |      HYBRID REVENUE CONCILIATION CORE     |
    +-------------------------------------------+
    | ONE-TIME HARDWARE        RECURRING SAAS   |
    | $14,500.00 [PAID]        $2,400.00/MO     |
    +-------------------------------------------+
           |                         |
    [ NET-30 INVOICE ]       [ BILLING SCHEDULE ]
                             * CYCLE: 1ST OF MO
                             * PRORATED ADJUST
                             * AUTO CREDIT NOTE
    +-------------------------------------------+
    |   SINGLE CONTRACT // UNIFIED CASH FLOW    |
    +-------------------------------------------+`;

export const RUNNER_KINETIC_ASCII = HYBRID_BILLING_ASCII;

// Card 4: Customer Portal Live Negotiation & Deal Health Radar ASCII
export const PORTAL_RADAR_ASCII = `               .----------------.
              /   DEAL HEALTH    \\
             |   ANOMALY RADAR    |
             |      HEALTHY       |
              \\   VELOCITY 94%   /
               '--------+-------'
                        |
            [ CUSTOMER PORTAL ROOM ]
            * Live Counter-Discount: 8%
            * Margin Impact: +4.2% Delta
            * 1-Click Digital Signoff
                        |
            +-----------+-----------+
            | STATUS: BINDING CLOSE |
            +-----------------------+`;

export const RESERVED_SPACE_ASCII = PORTAL_RADAR_ASCII;
