<div align="center">

# 🚀 DealFlow 360 — B2B Sales Operations & Quote-to-Cash Platform

<img src="./deal_flow.png" alt="DealFlow 360" width="300" />

<br />

**Enterprise-Grade Multi-Tenant B2B Sales Operations, Quote-to-Cash (QTC), & Deal Execution Engine**

<br />

[![Frontend Stack](https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript%20%7C%20Vite%206-blue?style=flat-square)](#1-frontend-architecture--client-stack)
[![Backend Stack](https://img.shields.io/badge/Backend-Node.js%20(ESM)%20%7C%20Express-green?style=flat-square)](#2-backend-services--application-layer)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2016%20(Native%20RLS)-336791?style=flat-square)](#3-database-engine-row-level-security--logic)
[![Redis Stack](https://img.shields.io/badge/Cache%20%26%20Queues-Redis%20Stack%20%7C%20BullMQ-red?style=flat-square)](#2-backend-services--application-layer)
[![Observability](https://img.shields.io/badge/Observability-Prometheus%20%7C%20Loki%20%7C%20Grafana-orange?style=flat-square)](#4-devops-infrastructure--observability-suite)
[![Nginx](https://img.shields.io/badge/Reverse%20Proxy-Nginx%20Alpine-009639?style=flat-square)](#4-devops-infrastructure--observability-suite)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## 📑 Table of Contents

- [Overview & Key Highlights](#-overview--key-highlights)
- [System Architecture](#-system-architecture)
- [Technology Stack Breakdown](#-technology-stack-breakdown)
  - [1. Frontend Architecture & Client Stack](#1-frontend-architecture--client-stack)
  - [2. Backend Services & Application Layer](#2-backend-services--application-layer)
  - [3. Database Engine, Row-Level Security & Logic](#3-database-engine-row-level-security--logic)
  - [4. DevOps, Infrastructure & Observability Suite](#4-devops-infrastructure--observability-suite)
- [Core Features & Modules](#-core-features--modules)
  - [1. Quotation Builder & Pricing Engine](#1-quotation-builder--pricing-engine)
  - [2. Blended Risk Scoring & Discount Governance](#2-blended-risk-scoring--discount-governance)
  - [3. Customer Portal & Real-Time Negotiation](#3-customer-portal--real-time-negotiation)
  - [4. Multi-Tier Approval Routing](#4-multi-tier-approval-routing)
  - [5. Governance Hub (Subscriptions, Reports, Products, Staff)](#5-governance-hub)
  - [6. Invoices & Contract Billing (List, Detail & Export)](#6-invoices--contract-billing)
  - [7. Split-Warehouse Fulfillment & Backorders](#7-split-warehouse-fulfillment--backorders)
  - [8. Deal Health & Anomaly Dashboard](#8-deal-health--anomaly-dashboard)
- [Enterprise Multi-Tenancy & Database Security](#-enterprise-multi-tenancy--database-security)
- [Project Directory Structure](#-project-directory-structure)
- [Quickstart & Local Installation](#-quickstart--local-installation)
  - [Prerequisites](#prerequisites)
  - [Method A: Docker Compose (Full Stack with Observability)](#method-a-docker-compose-recommended)
  - [Method B: Manual Local Setup](#method-b-manual-local-setup)
- [Demo Credentials & Persona Walkthrough](#-demo-credentials--persona-walkthrough)
- [API Reference Overview](#-api-reference-overview)
- [License](#-license)

---

## 🌟 Overview & Key Highlights

**DealFlow 360** is an enterprise-grade B2B Sales Operations and Quote-to-Cash (QTC) deal execution platform built for high-velocity sales organizations. It solves the operational friction between sales reps, sales managers, finance controllers, and external buyers by enforcing rigorous discount governance, calculating live margins, managing warehouse deliveries, and automating subscription billing.

### Key Pillars:
- **Zero Trust Multi-Tenancy via PostgreSQL Row-Level Security (RLS):** Complete multi-tenant isolation enforced directly at the database engine level with transaction-scoped session variables (`SET LOCAL app.current_tenant_id`), eliminating vulnerability to missing application-level `WHERE` clauses.
- **Column-Level Access Control (CLAC):** Database permissions strictly isolate staff roles from customer portal roles. Sensitive internal columns (`unit_cost`, `total_cost`, `line_margin_pct`, `blended_risk_score`) are mathematically impossible for external buyers to query.
- **Trigger-Maintained Discount Governance:** Real-time calculation of order totals, line margins, discount ceiling overages, and blended risk scores executed instantly through PostgreSQL PL/pgSQL triggers.
- **Bidirectional Real-Time Negotiation:** Socket.IO integration powers instant quote synchronization, live counter-offers, chat negotiation, and approval queue notifications.
- **Reconciled Split-Warehouse Fulfillment:** Smart inventory allocation balances line items across regional warehouses, auto-generates backorders, and ensures billing reconciles strictly with verified deliveries.
- **Client-Side Document Engine:** Instant zero-server-load PDF and Word (`.docx`) document generation with automated styling, headers, and itemized reconciliation tables.

---

## 🏗️ System Architecture

The following diagram illustrates the complete end-to-end topology of DealFlow 360, spanning client single-page applications, reverse proxy ingress, application workers, caching layers, secure database isolation, and observability telemetry.

<p align="center">
  <img src="./architecture.png" alt="DealFlow 360 System Architecture" width="850" />
</p>

---

## 💻 Technology Stack Breakdown

DealFlow 360 leverages a modern, decoupled architecture designed for high throughput, sub-millisecond query isolation, real-time collaboration, and enterprise audit compliance.

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                FRONTEND LAYER                                     │
│  React 19 (SPA)  │  TypeScript 5.8  │  Vite 6  │  Tailwind CSS v4  │  Socket.IO   │
│  Motion          │  Lucide Icons    │  SWR     │  jsPDF + docx     │  Axios       │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │ HTTP / WebSocket
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           GATEWAY & REVERSE PROXY                                 │
│  Nginx (Alpine) — Ingress Routing, Asset Caching, WebSocket Upgrade, Rate-Limiting │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │
                     ┌────────────────────┴────────────────────┐
                     ▼                                         ▼
┌───────────────────────────────────────────┐ ┌─────────────────────────────────────┐
│               BACKEND API                 │ │          ASYNC WORKERS & CACHE      │
│  Node.js (ESM) + Express.js 4.21          │ │  Redis Stack (Broker, Sessions)     │
│  Socket.IO Real-Time Gateway              │ │  BullMQ (Async Job Queue Workers)   │
│  Argon2 + Dual JWT HttpOnly Cookies       │ │  node-cron (Governance Sweeper)     │
│  Raw pg Driver (Transaction Context)      │ │  RedisInsight (Key-Space Analytics) │
└─────────────────────┬─────────────────────┘ └──────────────────┬──────────────────┘
                      │                                          │
                      └─────────────────────┬────────────────────┘
                                            ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                 DATABASE LAYER                                    │
│  PostgreSQL 16+ Alpine                                                            │
│  ├─ Row-Level Security (RLS) & Column-Level Grants (CLAC)                         │
│  ├─ PL/pgSQL Reactive Triggers (Live Margin & Blended Risk Calculations)          │
│  └─ Stored Procedures (Atomic Quotation Confirmation, Stalled Deal Sweep)         │
└───────────────────────────────────────────────────────────────────────────────────┘
                                            │ Metrics & Logs
                                            ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           OBSERVABILITY & MONITORING                              │
│  Prometheus v2.52 (Scraping /metrics) │ Loki v3.0 (Logs) │ Grafana 11 (Dashboards)│
└───────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Frontend Architecture & Client Stack

The client application is built as a responsive Single Page Application (SPA) offering rapid load times, smooth state transitions, and immediate visual feedback.

- **React 19 & TypeScript 5.8:** Utilizes modern React concurrent rendering features and strict TypeScript type-checking to ensure robust deal builder forms, calculations, and state machines.
- **Vite 6:** Ultra-fast build tool and development server providing lightning-fast Hot Module Replacement (HMR) and optimized ES-module production bundles.
- **Tailwind CSS v4 & Global CSS Design Tokens:** Sleek, modern enterprise user interface styled with custom DealFlow 360 design tokens, crisp typography, clean cards, responsive grids, and subtle borders.
- **Motion (`motion`):** Smooth fluid transitions and micro-animations for drawers, modals, notification cards, and approval stepper nodes.
- **Lucide Icons (`lucide-react`):** Comprehensive, consistent iconography across navigation, status pills, and administrative toolbars.
- **Data Fetching & Cache (`swr` & `axios`):** Stale-while-revalidate strategy for live data freshness, optimistic UI updates, and automated revalidation.
- **Real-Time Client (`socket.io-client`):** Establishes persistent WebSocket connections for live chat negotiation, deal status transitions, and instant approval notices.
- **Client-Side Document Generation Suite:**
  - **`jspdf` & `jspdf-autotable`:** Compiles branded, vector-quality PDF quotation summaries and invoice reconciliation statements entirely in the browser without server overhead.
  - **`docx` & `file-saver`:** Assembles formatted Microsoft Word documents (`.docx`) client-side with native tables, metadata, and styling.
- **Notification System (`react-toastify`):** Non-blocking notifications for save confirmations, errors, and real-time socket events.

---

### 2. Backend Services & Application Layer

The backend is built around a modular Controller-Service-Repository architecture, emphasizing predictable data flow and transaction safety.

- **Node.js (ESM) & Express.js 4.21:** High-throughput, asynchronous RESTful API server using native ECMAScript Modules (ESM).
- **Native PostgreSQL Client (`pg`) with Transaction-Scoped Context:**
  - *Why not an ORM?* Traditional ORMs obscure or mishandle connection pooling with session-level PostgreSQL commands. Raw `pg` allows wrapping every transaction in a custom `withTenantContext` helper:
    ```sql
    SET LOCAL app.current_tenant_id = $1;
    SET LOCAL app.current_actor_type = $2;
    SET LOCAL ROLE app_role_staff; -- or app_role_customer_portal
    ```
  - `SET LOCAL` guarantees that GUCs (Grand Unified Configuration variables) automatically reset at the end of the transaction, preventing cross-tenant context leaks in connection pools.
- **In-Memory Cache & Message Queue (`bullmq`, `ioredis`, `redis`):**
  - **BullMQ:** Asynchronous job processing queue for decoupling heavy background tasks (email notifications, audit archiving, stalled deal checks) from the request-response lifecycle.
  - **ioredis:** Robust Redis client handling connection reconnections, pub/sub, and cluster awareness.
- **Distributed Session & Rate Limiting (`connect-redis`, `express-rate-limit`, `rate-limit-redis`):**
  - Distributed Redis-backed rate limiting to mitigate denial-of-service attempts and brute-force attacks on authentication endpoints.
- **Security & Identity:**
  - **Argon2 (`argon2`):** State-of-the-art password hashing resisting GPU-based brute-force cracking.
  - **Dual JWTs (`jsonwebtoken`, `cookie-parser`):** Role-partitioned tokens stored in `httpOnly`, `SameSite=Lax`, secure cookies for internal staff and external customer portal users.
- **Bi-Directional Event Gateway (`socket.io`):** Manages room-based real-time broadcasts for negotiation threads, approval requests, and quotation lock state changes.
- **Job Scheduling (`node-cron`):** Periodic cron jobs that invoke database stored procedures (e.g., `sp_flag_stalled_deals`) and trigger governance checks.
- **External Gateways:**
  - **Razorpay SDK (`razorpay`):** Payment verification and order capture for customer invoice settlement.
  - **Nodemailer (`nodemailer`):** SMTP transactional email dispatcher for quote links, nudges, and approval updates.

---

### 3. Database Engine, Row-Level Security & Logic

The PostgreSQL database acts as the single source of truth for both data persistence and core business rules.

- **PostgreSQL 16+ Alpine:** Enterprise-grade relational database running in a lightweight Alpine container with persistent volume storage.
- **Native Row-Level Security (RLS):**
  - All tables enforce `ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.
  - Policies check `current_setting('app.current_tenant_id', true)::UUID` against `tenant_id`. Data outside the active tenant is completely invisible to queries.
- **Column-Level Access Control (CLAC):**
  - Staff role (`app_role_staff`) can read line costs, margins, and risk scores.
  - Portal role (`app_role_customer_portal`) has explicit column grants omitting sensitive financial margins.
- **PL/pgSQL Trigger Engine:**
  - Automatically computes `line_subtotal`, `line_discount_amount`, `line_cost_subtotal`, `line_margin_pct`, `gross_margin_pct`, and `blended_risk_score` on insert or update.
  - Enforces customer-tier category discount caps directly at the database engine level.
- **Transactional Stored Procedures:**
  - `sp_customer_confirm_quotation`: Atomically validates deal state, locks quotation records, transitions deal to confirmed, and initiates fulfillment orders.
  - `sp_flag_stalled_deals`: Sweeps active pipeline for quotes lingering without customer confirmation.

---

### 4. DevOps, Infrastructure & Observability Suite

The entire platform is containerized and instrumented for production-grade deployment and real-time monitoring.

- **Docker & Docker Compose:**
  - Multi-container orchestration managing Nginx, PostgreSQL, Redis Stack, Prometheus, Loki, and Grafana in an isolated bridge network (`app-network`).
- **Nginx (Alpine) Gateway & Reverse Proxy:**
  - Port `80` ingress gateway routing `/api/` to the backend, `/socket.io/` with `Upgrade` headers for WebSockets, static brand assets (`/deal_flow_logo.png`, `/favicon.ico`), and SPA frontend requests.
- **Redis Stack & RedisInsight:**
  - Redis 7 engine with Append-Only File (`AOF`) persistence.
  - Web-based **RedisInsight** GUI exposed on port `8001` for real-time key-space inspection, stream monitoring, and memory profiling.
- **Prometheus v2.52 (`prom/prometheus`):**
  - Scrapes application metrics via `prom-client` at `/metrics` (HTTP request duration, response codes, active WebSocket connections, database pool utilization).
- **Grafana Loki v3.0 (`grafana/loki`):**
  - High-efficiency log aggregation system collecting structured server logs, Morgan access logs, and error traces.
- **Grafana v11.0 (`grafana/grafana`):**
  - Pre-provisioned dashboards on port `3001` with connected Prometheus and Loki datasources for unified metrics and log visualization.

---

## 📦 Core Features & Modules

### 1. Quotation Builder & Pricing Engine
- **Visual Deal Builder (`/quotations/new`, `/quotations/:id/edit`):** Build complex multi-product quotes with live calculation of subtotals, applied discounts, gross margin, and contract value.
- **Live Margin Breakdown & Explainability:** Clickable **Live Margin** card opening an interactive explainability modal revealing unit costs, line margins, profit contributions, and mathematical formulas.
- **Contextual Upsell & Cross-Sell Engine:** Real-time upsell recommendations driven by historical co-purchase patterns with one-click insertion into the quotation.
- **Instant Trigger Recalculation:** Sub-second recalculation of margins, line totals, and risk thresholds as quantities or discounts are adjusted.

### 2. Blended Risk Scoring & Discount Governance
- **Blended Risk Score ($0 - 10$ Scale):**
  - **$< 5$ / 10 (Green):** Within approved governance rules; instant dispatch permitted.
  - **$= 5$ / 10 (Yellow):** Ceiling reached; review suggested before submission.
  - **$> 5$ / 10 (Red):** Threshold breached; mandatory approval chain enforced.
- **Tiered Discount Ceilings:** Category-based discount limits across **Hardware**, **Services**, and **Software & Subscriptions** for **Platinum** (20%), **Gold** (15%), **Silver** (10%), and **Bronze** (5%) customer tiers.

### 3. Customer Portal & Real-Time Negotiation
- **Dedicated External Portal (`/portal`):** Secure external view where clients inspect proposals, download PDFs, and accept or reject offers.
- **Bidirectional Negotiation Thread:** Real-time chat with price counter-offers synchronized via WebSockets between the sales rep and customer.
- **One-Click Quotation Confirmation:** Executes `sp_customer_confirm_quotation`, locking the deal and advancing it directly to fulfillment.

### 4. Multi-Tier Approval Routing
- **Governance Chain Automation:** Quotes exceeding discount rules automatically transition to `pending_manager` or `pending_finance` status.
- **Approvals Inbox (`/approvals`):** Reviewers evaluate discount deltas, risk scores, line items, and audit history to **Approve**, **Reject**, or request revisions with mandatory audit logging in `approval_audit_logs`.

### 5. Governance Hub
Accessible at `/governance` with 4 sub-modules:
1. **Subscriptions:** Manage tier discount ceilings, cadence schedules, active recurring contracts, and mid-cycle seat proration with daily calculations.
2. **Reports:** 100% database-backed analytics (Quotes Created, Avg Approval Time, Top Upsell, Pipeline Volume) with instant PDF and CSV/XLS export.
3. **Products:** Complete catalog management for products, variants, SKUs, base pricing, recurring subscription toggles, and warehouse inventory synchronization.
4. **Staff & Members:** Internal team roster, role assignments, and historical sales rep discount telemetry.

### 6. Invoices & Contract Billing
- **Invoices List (`/invoices`):**
  - **Status Count Pills:** Dynamic count pills (`Paid` / `Unpaid`) with one-click filtering.
  - **Bifurcation Controls:** Filter by customer account, amount ranges (`< $1k`, `$1k - $5k`, `$5k - $10k`, `> $10k`), and text search.
- **Invoice Detail (`/invoices/:id`):**
  - **4-Step Visual Progress Stepper:** `Order Confirmed` &rarr; `Shipped` &rarr; `Invoiced` &rarr; `Paid`.
  - **Delivery Reconciliation:** Displays linked warehouse shipments and tracking numbers; partial shipments match partial invoices.
  - **Payment Recording:** Direct payment settlement updating ledger states in real time.
- **Client-Side Document Export:**
  - **Download PDF:** High-resolution branded PDF generated client-side via `jspdf` and `jspdf-autotable`.
  - **Download Word (.docx):** Formatted Microsoft Word document generated via `docx` and `file-saver`.

### 7. Split-Warehouse Fulfillment & Backorders
- **Smart Inventory Allocation (`warehouse-split.service.js`):** Intelligently splits line items across regional warehouses (Central, East Coast, West Coast) based on on-hand quantities.
- **Automated Backorders:** Generates split shipment tracking numbers and automatic backorder records for stock deficits without delaying available inventory.

### 8. Deal Health & Anomaly Dashboard
- **Executive Telemetry (`/dealhealth`):** Win probability scoring, pipeline velocity, and churn risk metrics.
- **Anomaly Detection:**
  - **Stalled Deals:** Flags quotations idling in non-terminal states.
  - **Discount Anomalies:** Highlights deals where discounts exceed the rep's historical baseline.
  - **Delivery Slippage:** Identifies fulfillment risks and backorder bottlenecks.
- **Governance Workflows:**
  - **Role-Based Protection:** Accessible only to Admin, Sales Manager, and Finance roles (Sales Reps blocked).
  - **Escalate to Admin:** Managers and Finance can escalate critical deal anomalies directly to executive management.
  - **Executive Clearance:** One-click **Admin Resolve** permanently clears resolved anomalies from the active monitoring ledger.

---

## 🔒 Enterprise Multi-Tenancy & Database Security

```sql
-- Transaction-scoped isolation executed before every query
BEGIN;
  SET LOCAL app.current_tenant_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  SET LOCAL app.current_actor_type = 'staff';
  SET LOCAL app.current_user_id = 'f9e8d7c6-b5a4-3210-fedc-ba9876543210';
  SET LOCAL app.current_role = 'sales_rep';
  SET LOCAL ROLE app_role_staff;

  -- Queries run with database-enforced row filtering and column permissions
  SELECT id, quote_number, total_amount FROM quotations WHERE id = $1;
COMMIT;
```

1. **Transaction-Scoped GUCs:** Handled via `SET LOCAL`, guaranteeing that parameters are discarded automatically on `COMMIT` or `ROLLBACK` with zero connection pool cross-contamination.
2. **Dual Database Roles:**
   - `app_role_staff`: Access to all business entities within the active tenant.
   - `app_role_customer_portal`: Strict column whitelist; proprietary cost and margin columns cannot be selected.
3. **Non-Owner Execution:** All operational queries execute under `dealflow_app_user` (non-superuser, non-table owner), ensuring PostgreSQL strictly enforces `FORCE ROW LEVEL SECURITY`.

---

## 📁 Project Directory Structure

```
odoo_2026_final/
├── docker-compose.yml             # Multi-service stack (Nginx, Postgres, Redis, Prometheus, Loki, Grafana)
├── architecture.png               # System architecture diagram
├── deal_flow_logo.png             # DealFlow 360 brand asset
├── LICENSE                        # MIT License
├── README.md                      # Complete system documentation
│
├── nginx/
│   ├── nginx.conf                 # Reverse proxy, WebSocket upgrade, caching & routing config
│   └── assets/                    # Static brand logos and favicon assets
│
├── config/
│   ├── prometheus.yml             # Prometheus metric scrape configurations
│   └── loki-config.yml            # Loki log ingestion configuration
│
├── grafana/
│   └── provisioning/              # Pre-configured Grafana datasources & dashboard definitions
│
├── backend/
│   ├── dealflow360_schema.sql     # Complete PostgreSQL DDL (Tables, Indexes, RLS, Triggers)
│   ├── server.js                  # Express server & Socket.IO initialization
│   ├── package.json               # Backend dependencies & scripts
│   ├── scripts/
│   │   ├── setup-db.js            # Automated DDL execution and role setup
│   │   ├── seed.js                # Master multi-tenant demo scenario seeder
│   │   ├── seed_invoices.js       # Invoices & billing seed script
│   │   ├── seed_dealhealth.js     # Deal health telemetry seed script
│   │   └── test_email.js          # Email notification tester
│   └── src/
│       ├── app.js                 # Express application setup, middleware & CORS
│       ├── config/                # Database pool, Redis & environment configuration
│       ├── controller/            # REST controllers (quotations, billing, governance, catalog, etc.)
│       ├── jobs/                  # Background cron jobs (stalled deal sweeper)
│       ├── middleware/            # RLS tenant context, auth verification & role guards
│       ├── queries/               # Parameterized SQL statements ($1, $2, ...)
│       ├── repository/            # Database access layer with RLS context wrappers
│       ├── routes/                # API route definitions
│       └── service/               # Pure algorithms (warehouse split, proration, razorpay, email)
│
└── frontend/
    ├── index.html                 # Main HTML entry point
    ├── vite.config.ts             # Vite configuration & dev server proxy
    ├── package.json               # Frontend dependencies & build scripts
    └── src/
        ├── app/                   # App root, React Router configuration & navigation
        ├── components/            # Reusable UI components (Navbar, StatusBadge, Modals)
        ├── context/               # Auth, Socket.IO & Theme context providers
        ├── global css/            # DealFlow 360 CSS design tokens & typography
        └── features/              # Feature modules:
            ├── approvals/         # Multi-tier approval inbox & review workflows
            ├── auth/              # Login, Sign-up & Magic Link verification
            ├── billing/           # Invoices list, detail view, payment & PDF/DOCX export
            ├── catalog/           # Governance Hub (Subscriptions, Reports, Products, Staff)
            ├── dealhealth/        # Deal health analytics & pipeline anomaly dashboard
            ├── fulfillment/       # Split shipments & warehouse tracking
            ├── portal/            # Customer Portal, quotation review & negotiation
            └── quotations/        # Quotation list, Kanban & Quotation Builder
```

---

## ⚡ Quickstart & Local Installation

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **PostgreSQL:** v15.0 or higher (or via Docker)
- **Docker & Docker Compose** *(optional for automated containerized stack)*

---

### Method A: Docker Compose (Recommended)

To start the infrastructure services (Nginx, PostgreSQL, Redis Stack, Prometheus, Loki, Grafana) in one step:

1. Clone repository and start Docker Compose:
   ```bash
   docker compose up -d
   ```

2. Inspect the running services:
   | Service | Container Name | URL / Port | Purpose |
   | :--- | :--- | :--- | :--- |
   | **Nginx Gateway** | `dealflow360-nginx` | `http://localhost:80` | Reverse proxy, static assets & WebSocket gateway |
   | **PostgreSQL 16** | `dealflow360-postgres`| `localhost:5432` | Relational database with Row-Level Security |
   | **Redis Stack** | `dealflow360-redis` | `localhost:6379` | Cache & BullMQ queue broker |
   | **RedisInsight** | `dealflow360-redis` | `http://localhost:8001` | Web-based Redis analytics dashboard |
   | **Prometheus** | `dealflow360-prometheus`| `http://localhost:9090` | Time-series metrics collection |
   | **Grafana Loki**| `dealflow360-loki` | `localhost:3100` | Centralized log ingestion |
   | **Grafana** | `dealflow360-grafana` | `http://localhost:3001` | Visual telemetry & log monitoring |

3. Setup the database and run backend/frontend as shown in [Method B](#method-b-manual-local-setup).

---

### Method B: Manual Local Setup

#### 1. Backend Setup & Database Migration

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `backend/.env`:
   ```env
   PORT=4000
   NODE_ENV=development
   DATABASE_URL=postgresql://dealflow_app_user:StrongPassword123@localhost:5432/deal_flow
   ADMIN_DATABASE_URL=postgresql://postgres:avyay1012@localhost:5432/deal_flow
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=dealflow360_default_jwt_secret_dev_key
   SESSION_SECRET=dealflow360_enterprise_session_secret_2026
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001
   FRONTEND_STAFF_URL=http://localhost:3000
   FRONTEND_PORTAL_URL=http://localhost:3001
   ```

4. Create database and apply schema, roles, and RLS policies:
   ```bash
   npm run setup:db
   ```

5. Seed demo data (scenarios, customers, tiered rules, catalog products, invoices):
   ```bash
   npm run seed
   ```

6. Start backend development server:
   ```bash
   npm run dev
   ```
   *Backend API runs on `http://localhost:4000`.*

---

#### 2. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start Vite development server:
   ```bash
   npm run dev
   ```
   *Frontend application runs on `http://localhost:3000`.*

---

## 👥 Demo Credentials & Persona Walkthrough

All seed accounts use the uniform demo password: **`Password123!`**

### 🏢 Internal Staff Accounts (Login at `/login`)

| Role | Email | Full Name | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **Sales Rep** | `rep@acme.com` | Rachel Rep | Creates quotations, reviews live margins, manages customer chat |
| **Sales Manager** | `manager@acme.com` | Mark Manager | Approves discounts $> 10\%$, reviews Deal Health, manages team |
| **Finance Manager**| `finance@acme.com`| Frank Finance | Approves discounts $> 15\%$, reviews margin health & settles invoices |
| **Administrator** | `admin@acme.com` | Alice Admin | Manages catalog rules, discount caps, resolves executive escalations |

### 🌐 Customer Portal Accounts (Login at `/portal/login`)

| Customer Account | Tier | Portal Login Email | Portal Capabilities |
| :--- | :--- | :--- | :--- |
| **Wayne Enterprises** | Gold | `bruce@wayne.com` | Review quotes, counter-offer in live chat, confirm orders, view invoices |
| **Stark Industries** | Platinum | `tony@stark.com` | Review quotes, counter-offer in live chat, confirm orders, view invoices |
| **Cyberdyne Systems** | Silver | `miles@cyberdyne.com` | Review quotes, counter-offer in live chat, confirm orders, view invoices |
| **Initech Corporation**| Bronze | `peter@initech.com` | Review quotes, counter-offer in live chat, confirm orders, view invoices |

---

## 📡 API Reference Overview

### Quotations (`/api/quotations`)
- `GET /` &mdash; List quotations for the authenticated tenant.
- `GET /:id` &mdash; Fetch full quotation details, line items, and contextual upsell hints.
- `POST /` &mdash; Create a new quotation draft.
- `POST /:id/items` &mdash; Add line item (automatically triggers live margin & risk calculations).
- `DELETE /items/:itemId` &mdash; Remove line item from quotation.
- `POST /:id/submit-approval` &mdash; Submit quotation into approval chain.
- `POST /:id/send` &mdash; Dispatch quotation to customer portal.

### Invoices & Billing (`/api/billing`)
- `GET /invoices` &mdash; Retrieve tenant invoices with customer and status filters.
- `GET /invoices/:id` &mdash; Retrieve reconciled invoice statement with delivery records.
- `POST /invoices/:id/pay` &mdash; Record payment and advance deal stepper to Paid.

### Governance & Catalog (`/api/governance`, `/api/catalog`)
- `GET /api/governance/rules` &mdash; Fetch customer tier discount ceilings.
- `PUT /api/governance/rules/:id` &mdash; Update category ceiling caps.
- `GET /api/governance/subscriptions` &mdash; Retrieve active recurring contracts.
- `PATCH /api/governance/subscriptions/:id` &mdash; Modify seat counts with automated proration.
- `GET /api/catalog/products` &mdash; Fetch catalog products, variants, and stock.
- `POST /api/catalog/products` &mdash; Create catalog product with inventory.
- `PATCH /api/catalog/products/:id` &mdash; Update product attributes and sync inventory.

### Deal Health (`/api/dealhealth`)
- `GET /` &mdash; Fetch deal health telemetry, anomalies, and velocity scores *(Admin, Manager, Finance only)*.
- `POST /:id/nudge` &mdash; Send automated rep nudge for idling quotes.
- `POST /:id/escalate` &mdash; Escalate stalled deal or discount anomaly to Admin.
- `POST /:id/resolve` &mdash; Executive resolve deal alert and clear from active ledger.

### Customer Portal (`/api/quotations/portal`)
- `GET /my-quotations` &mdash; Retrieve quotations available to the logged-in customer account.
- `GET /:id` &mdash; Retrieve quote details (sanitized with cost and margin columns omitted).
- `POST /:id/confirm` &mdash; Confirm and lock deal (`sp_customer_confirm_quotation`).
- `POST /:id/negotiate` &mdash; Dispatch negotiation message or price counter-offer.

---

## 📄 License

This project is licensed under the **MIT License** &mdash; see the [LICENSE](LICENSE) file for full details.

Copyright &copy; 2026 DealFlow 360 Contributors.
