# 🚀 DealFlow 360 — B2B Sales Operations & Quote-to-Cash Platform

DealFlow 360 is an enterprise-grade, multi-tenant B2B Sales Operations and Quote-to-Cash (QTC) deal execution engine. Built for high-velocity sales organizations, it enforces discount discipline, triggers real-time blended risk scoring, automates multi-tier approval chains, manages split-warehouse fulfillment, and handles hybrid one-time & recurring subscription billing.

---

## 📑 Table of Contents

- [Overview & Key Highlights](#-overview--key-highlights)
- [System Architecture](#-system-architecture)
- [Core Features & Modules](#-core-features--modules)
  - [1. Quotation Builder & Pricing Engine](#1-quotation-builder--pricing-engine)
  - [2. Blended Risk Scoring & Discount Governance](#2-blended-risk-scoring--discount-governance)
  - [3. Customer Portal & Real-time Negotiation](#3-customer-portal--real-time-negotiation)
  - [4. Multi-Tier Approval Routing](#4-multi-tier-approval-routing)
  - [5. Governance Hub (Subscriptions, Reports, Products, Staff)](#5-governance-hub)
  - [6. Invoicing, Payments & Document Export](#6-invoicing-payments--document-export)
  - [7. Split-Warehouse Fulfillment & Backorders](#7-split-warehouse-fulfillment--backorders)
  - [8. Deal Health & Stalled Deal Sweeper](#8-deal-health--stalled-deal-sweeper)
- [Security & PostgreSQL Row-Level Security (RLS)](#-security--postgresql-row-level-security-rls)
- [Technology Stack](#-technology-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Quickstart & Local Installation](#-quickstart--local-installation)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup & Database Migration](#1-backend-setup--database-migration)
  - [2. Seed Demo Data](#2-seed-demo-data)
  - [3. Frontend Setup](#3-frontend-setup)
- [Demo Credentials & Persona Walkthrough](#-demo-credentials--persona-walkthrough)
- [API Reference Overview](#-api-reference-overview)
- [License](#-license)

---

## 🌟 Overview & Key Highlights

- **PostgreSQL Row-Level Security (RLS):** True multi-tenant isolation enforced at the database engine level with zero reliance on application-layer `WHERE tenant_id = ...` filters.
- **Column-Level Access Control (CLAC):** Database permissions strictly separate internal staff from external customers. Sensitive columns (`unit_cost`, `total_cost`, `line_margin_pct`, `blended_risk_score`) cannot be selected by customer portal roles.
- **Trigger-Maintained Discount Discipline:** Real-time calculation of line margins, order totals, discount overages, and blended risk scores directly via PostgreSQL triggers.
- **Real-Time Collaboration:** Socket.IO integration powers synchronized updates across the quotation builder, approval inbox, customer portal, and negotiation threads.
- **Audit-Ready & Reconciled:** Nothing is invoiced before it ships; partial deliveries reconcile cleanly with partial invoicing; mid-cycle subscription seat modifications compute daily proration math automatically.

---

## 🏗️ System Architecture

<p align="center">
  <img src="./docs/images/architecture.png" alt="DealFlow 360 System Architecture" width="850" />
</p>

---

## 📦 Core Features & Modules

### 1. Quotation Builder & Pricing Engine
- **Visual Deal Builder (`/quotations/new`, `/quotations/:id/edit`):** Configure multi-product quotations with live subtotal, contract value, margin, and discount limits.
- **Product Margin Breakdown & Explainability:** Click the **Live Margin** card to inspect unit acquisition costs, line revenues, gross profit contributions, and mathematical formulas in an explainability modal.
- **AI-Powered Upsell & Cross-Sell Engine:** Contextual suggestions driven by historical co-purchase patterns with one-click injection into the quotation.
- **Real-Time Synchronous Calculation:** Instant re-computation of total margins and delivery estimates on line addition, removal, or discount adjustments.

### 2. Blended Risk Scoring & Discount Governance
- **Blended Risk Score ($/10$ Scale):**
  - **$< 5$ / 10:** Green indicator (`border-emerald-400`) &mdash; within approved governance boundaries.
  - **$= 5$ / 10:** Yellow indicator (`border-yellow-400`) &mdash; ceiling threshold reached, review advised.
  - **$> 5$ / 10:** Red indicator (`border-[#ff3b30]`) &mdash; discount ceiling breached, automatic approval routing triggered.
- **Customer Tier Ceilings:** Tiered caps for Platinum ($20\%$), Gold ($15\%$), Silver ($10\%$), and Bronze ($5\%$) customers across Hardware, Services, and Software.

### 3. Customer Portal & Real-time Negotiation
- **Dedicated External Portal (`/portal`):** Restricted view where buyers inspect quotation details, download PDFs, and accept or reject offers.
- **Two-Way Negotiation Thread:** Live chat allowing reps and customers to counter-offer line item prices with real-time socket broadcasts.
- **One-Click Quotation Confirmation:** Calls PostgreSQL stored procedure `sp_customer_confirm_quotation`, locking the deal and advancing fulfillment.

### 4. Multi-Tier Approval Routing
- **Governance Automation:** Quotations exceeding category or tier caps are automatically placed into `pending_manager` or `pending_finance` status.
- **Approvals Inbox (`/approvals`):** Reviewers inspect the deal telemetry, discount delta, risk score, and line items to **Approve**, **Reject**, or request revision with full audit logging in `approval_audit_logs`.

### 5. Governance Hub
Accessible at `/governance` with 4 administrative modules:
1. **Subscriptions:** Manage tier discount ceilings, cadence schedules, active recurring contracts, and mid-cycle seat proration.
2. **Reports:** 100% database-backed analytics (Quotes Created, Avg Approval Time, Top Upsell, Pipeline Volume) with instant PDF and CSV/XLS export.
3. **Products:** Complete catalog administration for products, variants, SKUs, base pricing, and upsell rules.
4. **Staff:** Team roster management, role assignments, and sales rep historical discount tracking.

### 6. Invoicing, Payments & Document Export
- **Invoices Dashboard (`/invoices`):** Status count pills (Paid/Unpaid), customer bifurcation, amount filtering, and search.
- **4-Step Pipeline Stepper:** Visual deal progression tracking: `Order Confirmed` &rarr; `Shipped` &rarr; `Invoiced` &rarr; `Paid`.
- **Reconciliation Engine:** Partial invoicing matches partial warehouse shipments; nothing is billed before it ships.
- **Document Export:** Instant client-side download as high-resolution branded **PDF** (`jspdf`, `jspdf-autotable`) or Microsoft Word **DOCX** (`docx`, `file-saver`).
- **Payment Settlement:** Razorpay gateway integration and manual payment recording.

### 7. Split-Warehouse Fulfillment & Backorders
- **Inventory Allocation Algorithm (`warehouse-split.service.js`):** Distributes line items across regional warehouses (e.g., Central, East Coast, West Coast) based on available stock.
- **Automated Backorders:** Generates split shipment tracking records and backorders for out-of-stock quantities without delaying available goods.

### 8. Deal Health & Stalled Deal Sweeper
- **Deal Health Analytics (`/dealhealth`):** Win probability scoring, pipeline velocity tracking, and churn risk metrics.
- **Scheduled Stalled Deal Monitor:** Hourly background cron job (`node-cron`) executing `sp_flag_stalled_deals` to identify dormant quotations.

---

## 🔒 Security & PostgreSQL Row-Level Security (RLS)

DealFlow 360 enforces enterprise multi-tenancy at the database level:

1. **Transaction-Scoped GUCs:**
   Every query executes inside `withTenantContext`:
   ```sql
   SET LOCAL app.current_tenant_id = '...';
   SET LOCAL app.current_actor_type = 'staff'; -- or 'customer_portal'
   SET LOCAL app.current_user_id = '...';
   SET LOCAL app.current_role = 'sales_rep';
   SET LOCAL ROLE app_role_staff; -- or app_role_customer_portal
   ```
2. **Dual Database Roles:**
   - `app_role_staff`: Can select, insert, update business records within their tenant.
   - `app_role_customer_portal`: Restricted access. Columns such as `unit_cost`, `total_cost`, `line_margin_pct`, and `blended_risk_score` are explicitly excluded from portal grants.
3. **Non-Owner Execution:** All connections use `dealflow_app_user` (non-superuser, non-table owner), ensuring `FORCE ROW LEVEL SECURITY` cannot be bypassed.
4. **Connection Pool Hygiene:** Mandatory `RESET ROLE` and parameter resets executed upon connection checkout and release.

---

## 💻 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide Icons, React Router v7 |
| **Documents & Export**| jsPDF, jsPDF-AutoTable, docx, file-saver |
| **Real-time** | Socket.IO (Client & Server) |
| **Backend API** | Node.js (ESM), Express.js, nodemon |
| **Database** | PostgreSQL 16+, raw `pg` driver (no ORM), custom PL/pgSQL triggers & procedures |
| **Authentication** | Argon2 password hashing, dual JWT cookies (`httpOnly`, `SameSite=Lax`) |
| **Payments & Mail** | Razorpay SDK, Nodemailer |
| **Job Scheduling** | node-cron (automated stalled deal checks & governance sweeps) |

---

## 📁 Project Directory Structure

```
odoo_2026_final/
├── backend/
│   ├── dealflow360_schema.sql     # Complete DDL: tables, indexes, RLS, triggers & functions
│   ├── server.js                  # HTTP server & Socket.IO initialization
│   ├── package.json
│   ├── scripts/
│   │   ├── setup-db.js            # Automated DDL execution and role setup
│   │   ├── seed.js                # Master multi-tenant demo scenario seeder
│   │   ├── seed_invoices.js       # Invoices & billing seed script
│   │   ├── seed_dealhealth.js     # Deal health telemetry seed script
│   │   └── test_email.js          # Email notification tester
│   └── src/
│       ├── app.js                 # Express application setup, CORS & middleware
│       ├── config/                # Database pool & environment initialization
│       ├── controller/            # Express controllers (quotations, billing, governance, etc.)
│       ├── jobs/                  # Background cron jobs (stalled deal sweeper)
│       ├── middleware/            # RLS tenant context, auth verification & error handling
│       ├── queries/               # Parameterized SQL statements ($1, $2, ...)
│       ├── repository/            # Database access layer with RLS context wrappers
│       ├── routes/                # API route definitions
│       └── service/               # Pure algorithms (warehouse split, proration, email, razorpay)
│
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── src/
│       ├── app/                   # App root, React Router configuration & navigation
│       ├── components/            # Reusable UI components (Navbar, Sidebar, StatusBadge)
│       ├── context/               # Auth, Socket.IO & Theme context providers
│       ├── global css/            # Standardized DealFlow 360 CSS design tokens
│       └── features/              # Feature modules:
│           ├── approvals/         # Multi-tier approval inbox & review workflows
│           ├── auth/              # Login, Sign-up & Magic Link verification
│           ├── billing/           # Invoices list, detail view, payment & PDF/DOCX export
│           ├── catalog/           # Governance Hub (Subscriptions, Reports, Products, Staff)
│           ├── dealhealth/        # Deal health analytics & pipeline velocity
│           ├── fulfillment/       # Split shipments & warehouse tracking
│           ├── portal/            # Customer Portal, quotation review & negotiation
│           └── quotations/        # Quotation list, Kanban & Quotation Builder
└── README.md
```

---

## ⚡ Quickstart & Local Installation

### Prerequisites
- **Node.js**: v18.0.0 or later
- **npm**: v9.0.0 or later
- **PostgreSQL**: v15.0 or later (running locally or via Docker)

---

### 1. Backend Setup & Database Migration

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in `backend/` (or copy from `.env.example`):
   ```env
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000

   # Admin connection (used to create roles and execute schema DDL)
   ADMIN_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dealflow360

   # Non-owner runtime connection (enforces RLS and column-level grants)
   DATABASE_URL=postgresql://dealflow_app_user:StrongPassword123@localhost:5432/dealflow360

   JWT_STAFF_SECRET=dealflow_staff_jwt_super_secret_key_2026!
   JWT_PORTAL_SECRET=dealflow_portal_jwt_super_secret_key_2026!
   COOKIE_DOMAIN=localhost
   ```

4. Create the database in PostgreSQL:
   ```sql
   CREATE DATABASE dealflow360;
   ```

5. Run database initialization (creates roles, applies DDL, triggers, and RLS policies):
   ```bash
   npm run setup:db
   ```

---

### 2. Seed Demo Data

Populate the database with demo companies, tiered customers, staff accounts, catalog items, quotations, invoices, and audit logs:
```bash
npm run seed
```

Start the backend server:
```bash
npm run dev
```
*Backend API will run on `http://localhost:5000` with WebSocket listening on the same port.*

---

### 3. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch Vite development server:
   ```bash
   npm run dev
   ```
*Frontend application will run on `http://localhost:3000`.*

---

## 👥 Demo Credentials & Persona Walkthrough

All seed accounts use the default password: **`Password123!`**

### 🏢 Internal Staff Accounts (Login at `/login`)

| Role | Email | Full Name | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **Sales Rep** | `rep@acme.com` | Rachel Rep | Creates quotations, negotiates deals, reviews upsell hints |
| **Sales Manager** | `manager@acme.com` | Mark Manager | Approves discounts $> 10\%$, manages team quotas & governance |
| **Finance Manager**| `finance@acme.com`| Frank Finance | Approves discounts $> 15\%$, reviews margins & settles invoices |
| **Administrator** | `admin@acme.com` | Alice Admin | Manages catalog rules, discount caps, staff & subscriptions |

### 🌐 Customer Portal Accounts (Login at `/portal/login`)

| Customer Account | Tier | Portal Login Email | Portal Access |
| :--- | :--- | :--- | :--- |
| **Wayne Enterprises** | Gold | `bruce@wayne.com` | View quotations, counter-offer, approve deals, view invoices |
| **Stark Industries** | Platinum | `tony@stark.com` | View quotations, counter-offer, approve deals, view invoices |
| **Cyberdyne Systems** | Silver | `miles@cyberdyne.com` | View quotations, counter-offer, approve deals, view invoices |
| **Initech Corporation**| Bronze | `peter@initech.com` | View quotations, counter-offer, approve deals, view invoices |

---

## 📡 API Reference Overview

### Quotations (`/api/quotations`)
- `GET /` &mdash; List all quotations for the authenticated tenant.
- `GET /:id` &mdash; Get full quotation detail, line items, and upsell suggestions.
- `POST /` &mdash; Create a new quotation draft.
- `POST /:id/items` &mdash; Add line item (automatically calculates margins & risk score via triggers).
- `DELETE /items/:itemId` &mdash; Remove line item from quotation.
- `POST /:id/submit-approval` &mdash; Submit quotation for manager/finance review.
- `POST /:id/send` &mdash; Dispatch quotation to customer portal.

### Invoices & Billing (`/api/billing`)
- `GET /invoices` &mdash; List all tenant invoices with customer & status filters.
- `GET /invoices/:id` &mdash; Get detailed invoice reconciliation statement with line items.
- `POST /invoices/:id/pay` &mdash; Record payment and update pipeline stepper to Paid.

### Governance & Administration (`/api/governance`)
- `GET /rules` &mdash; Retrieve customer tier category discount ceilings.
- `PUT /rules/:id` &mdash; Update category ceiling cap.
- `GET /subscriptions` &mdash; Retrieve recurring subscription contracts.
- `PATCH /subscriptions/:id` &mdash; Modify subscription seat counts with proration math.

### Customer Portal (`/api/quotations/portal`)
- `GET /my-quotations` &mdash; List quotations available to the logged-in customer.
- `GET /:id` &mdash; Get quotation details (cost and margin columns sanitized via RLS).
- `POST /:id/confirm` &mdash; Accept quotation (executes `sp_customer_confirm_quotation`).
- `POST /:id/negotiate` &mdash; Send negotiation chat message or counter-offer.

---

## 📄 License

This project is developed for enterprise demonstration purposes under the ISC License. All rights reserved.
