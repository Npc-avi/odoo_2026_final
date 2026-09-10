# Walkthrough: Invoices List, Detail Page & Document Export

We have completed the requested changes matching the reference screenshots:
1. Removed the **RFQS** page from the top navigation bar.
2. Renamed **BILLING** to **INVOICES** (`/invoices`) in the navigation header.
3. Created the **Invoices (List)** page according to the reference photo with status pills and bifurcation filters.
4. Created the **Invoice Detail** page (`/invoices/:id`) featuring the 4-step pipeline stepper, quotation specifications, line items breakdown, warehouse delivery records, and payment recording.
5. Added client-side export libraries (**`jspdf`**, **`jspdf-autotable`**, **`docx`**, **`file-saver`**) allowing instant one-click download as **PDF** or Microsoft Word (**`.docx`**).

---
##

## 1. Changes Implemented

### Top Navigation (`AppNavbar.tsx`)
- Removed `{ label: 'RFQS', path: '/rfqs' }` from `staffNavItems`.
- Changed `{ label: 'BILLING', path: '/billing' }` to `{ label: 'INVOICES', path: '/invoices' }`.

### Invoices List Page (`InvoiceListPage.tsx`)
Matches Reference Screenshot 1:
- **Header**: `Invoices (List)` with subtitle: *"Every invoice generated from one-time and recurring contracts"*.
- **Status Count Pills**:
  - `4 Unpaid` (rose pill) & `21 Paid` (emerald pill).
  - Clicking either pill dynamically toggles filtering by Unpaid, Paid, or All.
- **Bifurcation Controls**:
  - **Customer Name Bifurcation**: Filter dropdown containing all distinct customer accounts (*Acme Corp*, *Zenith Co*, *Nova Retail*, *Wayne Enterprises*, *Stark Industries*, *Cyberdyne Systems*, *Initech Corporation*).
  - **Amount Range Bifurcation**: Range filter (*All*, *< $1,000*, *$1,000 – $5,000*, *$5,000 – $10,000*, *> $10,000*).
  - Search bar for instant text matching on Invoice # and Client name.
- **Table Columns**:
  - `Invoice #` | `Customer` | `Amount` | `Status` | `Due Date`
  - Formatted like the screenshot (e.g. `INV-1042`, `Acme Corp`, `$2,730`, `Unpaid`, `Sep 10`).
  - Clicking any row smoothly navigates to that invoice's detail page.
- **Bottom Callout Banner**:
  - *"Click an invoice row to open its full payment and delivery reconciliation detail."*

### Invoice Detail Page (`InvoiceDetailPage.tsx`)
Matches Reference Screenshot 2:
- **Header**: `Invoice Detail: INV-XXXX (Customer Name)` with subtitle *"Opened by clicking a row on the Invoices list"*.
- **Visual Progress Pipeline Stepper**:
  - `Order Confirmed` (Green checkmark node) &rarr; `Shipped` (Green checkmark node) &rarr; `Invoiced` (Blue active glowing node) &rarr; `Paid` (Dynamic state node).
- **Contract Invoices Table**:
  - Displays primary invoice (`INV-1042`) and recurring contract charges (`INV-1043 (Recurring)`).
- **Quotation Details & Line Items Breakdown**:
  - Origin Quotation code, customer tier, and assigned account rep.
  - Complete line item table: Product / Description, Line Type, Quantity, Unit Price, Applied Discount %, Line Total.
  - Reconciled warehouse shipment orders (warehouse name, shipment tracking code, shipping cost).
  - Financial reconciliation: Subtotal, Tax (8%), Grand Total.
- **Action Buttons**:
  - **Record Payment**: Calls `/api/billing/invoices/:id/pay`, settles the invoice as PAID, and updates the stepper and ledger in real time.
  - **Download PDF**: Generates a high-resolution, branded PDF invoice and quotation statement with `jspdf` and `jspdf-autotable`.
  - **Download Word (.docx)**: Generates a formatted Microsoft Word document with `docx` and `file-saver`.
- **Bottom Callout Banner**:
  - *"Partial invoicing stays reconciled with partial delivery, nothing is billed before it ships."*

---

## 2. Global CSS Design System Styling Applied

The styling of both pages was seamlessly upgraded to adopt the DealFlow360 `global css` system:
- **Containers & Layout**: Uses `max-w-7xl mx-auto pb-16` with `app-screen-tag` header badges and `app-page-subtitle`.
- **Cards & Surfaces**: Uses `app-card` with clean white surfaces, subtle borders (`var(--app-border)`), and soft shadows.
- **Tables**: Built using `app-table-wrapper`, `app-table`, `app-thead`, `app-tbody`, `app-tr app-tr-clickable`, `app-td-brand`, and `app-td-currency` for high-contrast, crisp typography.

---

## 4. Governance Hub Architecture: Subscriptions, Live Reports, Products & Staff

The Governance page (`/governance`) has been expanded into an administrative hub featuring a sub-navigation bar with 4 dedicated functional areas:

### 1. Sub-Navigation Bar
- **4 Tabbed Modules**:
  - `SUBSCRIPTIONS` (Default selected)
  - `REPORTS`
  - `PRODUCTS`
  - `STAFF`
- Integrated with soft, fluid cubic-bezier transitions (`duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`) using DealFlow360 `global css` tokens.

### 2. Tab 1: Subscriptions
Matches Reference Screenshots 1 & 2:
- **Customer Tier Discount Ceilings (Above)**:
  - Editable cards for **Platinum**, **Gold**, **Silver**, and **Bronze** customer tiers.
  - Displays category-specific discount rate ceilings (Hardware, Services, Software & Subscriptions).
  - Admin can edit any discount rate and click **Save [Tier] Caps** to update PostgreSQL `discount_governance_rules` in real time.
- **Subscription Plans**:
  - Displays cadence plans (*Enterprise Monthly*, *Annual Scale*, etc.).
  - "+ New Plan (Admin)" modal to create custom cadence plans with billing interval days.
- **Subscriptions List (Matching Screenshot 2)**:
  - Metric status pills: `Active` (green), `Paused` (amber), `Cancelled` (rose) with instant filtering.
  - Table: Customer, Plan, Cycle (Monthly/Quarterly/Yearly), Next Bill Date, Status.
- **Billing Detail Drawer (Matching Screenshot 1)**:
  - Opens when any subscription row is clicked.
  - **One-Time Lines (from originating order)**: Products, quantities, and line totals from the confirmed quotation.
  - **Recurring Lines**: Active plan cadence, billing cycle, next bill date, and recurring fee.
  - **Controls**:
    - **Modify Subscription**: Adjust active seats with automated mid-cycle daily proration recalculation.
    - **Cancel Subscription**: Terminates recurring plan in DB and generates credit note.
    - **Pause / Resume Contract**: Toggles status between Active and Paused.

### 3. Tab 2: Reports (100% Connected to Database)
Matches Reference Screenshot 5:
- **Filters**:
  - **Period**: *All Time*, *This Month*, *Last 30 Days*, *This Quarter*, *This Year*.
  - **Sales Team**: Filter by individual sales representative.
  - **Approval Status**: *All*, *Confirmed / Won*, *Pending Manager*, *Pending Finance*, *Under Negotiation*, *Draft*, *Rejected*.
  - **Product**: Filter by individual catalog product.
- **Live Database KPI Cards**:
  - **Quotes Created**: Real quotation count matching filter window.
  - **Avg Approval Time**: Calculated live from `approval_audit_logs` and quotation timestamps (`6.4 hours`).
  - **Top Upsold Product**: Real top-performing upsell product and volume quoted.
  - **Pipeline Volume**: Sum of deal values in pipeline.
- **Export Actions**:
  - **Export PDF**: Generates and downloads an executive PDF report.
  - **Export XLS**: Downloads a complete CSV/XLS report with quotation ledger and sales rep performance statistics.
- **Ledger & Rep Performance Table**:
  - Displays quotation ledger with risk scores and approval duration, plus sales rep won revenue and average discounts given.

### 4. Tab 3: Products (Full Catalog Management)
Matches Reference Screenshots 3 & 4:
- **Catalog Overview (Matching Screenshot 4)**:
  - Metrics: **Total Products** (active vs archived), **Pricelists** (tier and currency counts), and **Variants** (SKU count).
  - Search filter by product name, SKU, or category.
  - Product Catalog Table: Product Name, Category, Variants, Price, Unit, Tax %, Status.
- **Product & Pricelist Modal Configurator (Matching Screenshot 3)**:
  - **General Info**: Product Name, Category, Price, Unit, Description, Tax %, Quantity on Hand (saves to `warehouse_inventory` in PostgreSQL).
  - **Subscription Toggle**: Yes / No toggle. When Yes, the **Recurring** dropdown (*Monthly/Quarterly/Yearly/Weekly*) smoothly appears.
  - **Product Variants**: Table with Attribute (*Color*, *RAM*, *Manufacturer*), Values, and Extra Price (+/- $). Quick add variant controls.
  - **Pricelists**: Tier (*Bronze*, *Silver*, *Gold*, *Platinum*), Currency (*USD*, *EUR*), Price Rule (*Price no adjustment*, *Price minus 10% base*).
  - Clicking **Save Product** updates or creates the record in PostgreSQL, instantly propagating to the quotation builder and customer portal.

### 5. Tab 4: Staff & Members
- Styled placeholder adhering to `global css` tokens and typography, ready for future member management specifications.

---

## 3. Deal Health and Anomaly Dashboard

Created the **Deal Health and Anomaly Dashboard** ([`DealHealthPage.tsx`](file:///c:/Users/Avyay%20kachhia/OneDrive/Desktop/odoo_2026_final/frontend/src/features/dealhealth/pages/DealHealthPage.tsx)) using the `global css` styling reference, powered by real database statistics, and secured with role-based access control:

- **Role-Based Access (Manager & Finance Only; Sales Rep Blocked)**:
  - Top navigation bar ([`AppNavbar.tsx`](file:///c:/Users/Avyay%20kachhia/OneDrive/Desktop/odoo_2026_final/frontend/src/components/AppNavbar.tsx)): DEAL HEALTH is visible only to `['admin', 'sales_manager', 'finance']`. Sales Reps (`sales_rep`) cannot see or access it.
  - Page-level guard: If a `sales_rep` attempts to visit `/dealhealth`, a secure `Access Restricted` message is shown.
  - Backend API guard ([`dealhealth.route.js`](file:///c:/Users/Avyay%20kachhia/OneDrive/Desktop/odoo_2026_final/backend/src/routes/dealhealth.route.js)): Enforced `requireStaffRole('admin', 'sales_manager', 'finance')`.
- **"Escalate to Admin" & Resolution Workflow**:
  - Replaced generic "Escalate to Manager" with **`Escalate to Admin`**.
  - When a Sales Manager or Finance user clicks **`Escalate to Admin`**, the deal's status transitions to `Escalated to Admin`, which persists in PostgreSQL.
  - When the **Admin** logs in, the Deal Health dashboard features a prominent **⚡ EXECUTIVE ESCALATIONS AWAITING ADMIN REVIEW** banner highlighting all deals escalated by Managers and Finance.
  - **Complete Removal Upon Resolution**: When the Admin clicks **`Admin Resolve`** (or a staff member resolves an alert), the backend updates `is_resolved = TRUE` and the query filters `WHERE COALESCE(dha.is_resolved, FALSE) = FALSE`. The resolved deal is **immediately and permanently removed from Deal Health everywhere** (across Admin, Manager, and Finance views).
- **Pill Badge & Button CSS Improvements**:
  - Fixed the text-wrapping bug where "Nudge sent" broke into two lines.
  - Formatted all action badges (`Nudge Sent`, `Escalated to Admin`, `Pending Review`) as **perfect round pills** (`rounded-full px-3.5 py-1.5 whitespace-nowrap shrink-0 leading-none`).
  - Added `min-w-[320px] whitespace-nowrap` on the Action table column to prevent crowding.
  - Standardized all row buttons and bottom batch buttons to sleek `rounded-full` pill shapes.
- **Top 3 Metric Blocks**:
  - **Stalled Deals**: Evaluates quotations lingering in non-terminal states without customer confirmation (e.g. quotes idle 7+ days).
  - **Discount Anomalies**: Evaluates quotations where applied discounts exceed the sales rep's historical average or governance ceilings (e.g. 18% vs 6% rep avg).
  - **Delivery Slippage**: Evaluates orders at risk of delay, dual-warehouse dispatch bottlenecks, or warehouse inventory stockouts (e.g. Server Blade backorder deficit).
  - Clicking any card dynamically filters the ledger table to that risk category.
- **Flagged Deals Ledger Table**:
  - Columns: `Deal` | `Issue` | `Flagged` | `Severity` | `Action & Governance`.
  - Displays real quotation records (`Q-1030`, `QT-DEMO-BLENDED-01`, `QT-20260905-5F63V1`, `Q-1042`, `QT-20260905-GLL63Z`).
  - Interactive Action triggers: **`Nudge Rep`** and **`Escalate to Admin`**, plus **`Admin Resolve`** for executive clearance.

---

---

## 5. Catalog Products: Fix for ON CONFLICT Error & Database Connectivity

### Root Cause
- When creating or editing products with inventory (`quantityOnHand`), the backend was executing:
  ```sql
  INSERT INTO warehouse_inventory (tenant_id, warehouse_id, product_id, qty_on_hand, qty_reserved)
  VALUES ($1, $2, $3, $4, 0)
  ON CONFLICT (tenant_id, warehouse_id, product_id)
  DO UPDATE SET qty_on_hand = EXCLUDED.qty_on_hand;
  ```
- PostgreSQL thrown the error: `there is no unique or exclusion constraint matching the ON CONFLICT specification`.
- In the database schema, the unique constraint `uk_warehouse_product` on `warehouse_inventory` is `(warehouse_id, product_id)` (not `(tenant_id, warehouse_id, product_id)`).

### Changes Implemented
1. **Backend Repository (`backend/src/repository/catalog.repository.js`)**:
   - Updated both `createProduct` and `updateProduct` queries to specify:
     ```sql
     ON CONFLICT (warehouse_id, product_id)
     DO UPDATE SET qty_on_hand = EXCLUDED.qty_on_hand;
     ```
   - Matches the PostgreSQL unique constraint `uk_warehouse_product` perfectly.
2. **Frontend UI & Database Connectivity (`frontend/src/features/catalog/components/GovernanceProductsTab.tsx`)**:
   - Upgraded both "+ New Product" and "Edit" modals with prominent sticky action footers:
     - **Add Mode**: "Confirm & Add Product" (`+ Add Product to Database`) with clear database indicators.
     - **Edit Mode**: "Confirm & Update Product" (`Save Changes to Database`).
     - Real-time indicator displaying database connection status.
   - Connected `handleOpenEditModal` to `fetchProductDetailApi(p.id)` to load existing variants directly from PostgreSQL.
   - Connected `handleSaveProduct` to create new variants, update product attributes, and sync inventory with the warehouse.
   - Added removal actions (`X` icon) on variant and pricelist rows for quick editing.

### Verification Results
- **Automated End-to-End API & Database Test (`test_catalog_api.js`)**:
  - `POST /api/catalog/products`: Succeeded with **201 Created**.
  - `warehouse_inventory` quantity on hand: Verified in PostgreSQL (`45` units).
  - `PATCH /api/catalog/products/:id`: Succeeded with **200 OK**.
  - `warehouse_inventory` updated quantity on hand: Verified in PostgreSQL (`80` units).
  - Cleaned up test record from database.
- **Frontend TypeScript Lint (`npm run lint`)**: Passed with **0 errors**.
- **Frontend Production Build (`npm run build`)**: Built in **6.29s** with 0 errors.
