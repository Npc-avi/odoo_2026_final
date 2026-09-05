# DealFlow 360 — Backend API Layer

Enterprise multi-tenant B2B Sales Operations & Quote-to-Cash deal engine built on PostgreSQL with Row-Level Security (RLS), column-level access controls, trigger-maintained discount governance, warehouse fulfillment splitting, and hybrid subscription billing.

---

## 🏗️ Architecture & Technology Stack

- **Runtime & Language**: Node.js (ESM `"type": "module"`), Express.js
- **Database**: PostgreSQL 16+ via raw `pg` driver (no ORM, parameterized queries only)
- **Multi-Tenant Isolation**:
  - PostgreSQL Row-Level Security (`FORCE ROW LEVEL SECURITY`) driven by transaction-scoped GUCs:
    - `app.current_tenant_id`
    - `app.current_actor_type` (`'staff'` vs `'customer_portal'`)
    - `app.current_user_id` / `app.current_role`
    - `app.current_customer_id` / `app.current_portal_user_id`
  - Dual PostgreSQL Database Roles:
    - `app_role_staff` (internal operational permissions)
    - `app_role_customer_portal` (restricted portal view permissions)
  - Non-Owner Connection Role: Prevents RLS and column-grant bypass.
  - Reset Guarantee: Connection pool cleans up session state with mandatory `RESET ROLE` before client release.
- **Authentication**: Dual-cookie JWT auth with Argon2 password hashing:
  - Internal Staff: Cookie `staff_token` (7 days expiry)
  - External Customer Portal: Cookie `portal_token` (24 hours expiry) + passwordless Magic Link support
- **Automations**:
  - Blended Discount Risk Score evaluation via triggers on `quotation_items`
  - Automated Approval Routing via GiST non-overlapping range constraints (`approval_chains`)
  - Warehouse fulfillment split & backorder allocation algorithm (`service/warehouse-split.service.js`)
  - Subscription proration math for mid-cycle seat changes & cancellations (`service/proration.service.js`)
  - Background time-based stalled deal monitor (`node-cron` calling `sp_flag_stalled_deals`)

---

## 📂 Project Structure

```
backend/
├── dealflow360_schema.sql     # Finalized DDL schema with RLS, triggers & stored procedures
├── package.json
├── server.js                  # Application server entry point
├── .env.example
├── scripts/
│   ├── setup-db.js            # Automated DDL execution and role setup
│   └── seed.js                # Full demo scenario seeder
└── src/
    ├── app.js                 # Express app assembly, CORS allow-list & routing
    ├── config/
    │   ├── database.js        # pg Pool setup (non-owner role + admin pool)
    │   └── init.js            # Database and role membership verification
    ├── middleware/
    │   ├── auth.middleware.js # verifyStaffToken, verifyPortalToken, requireStaffRole
    │   ├── tenant-context.middleware.js # withTenantContext with GUCs & SET ROLE
    │   └── error.middleware.js # PG error code mapping & RLS denial handler
    ├── validation/            # Hand-written route validators
    ├── queries/               # Parameterized SQL string constants ($1, $2)
    ├── repository/            # DB access and transactional execution layer
    ├── controller/            # HTTP request/response handling
    ├── routes/                # Route definitions wired to middleware
    ├── service/
    │   ├── warehouse-split.service.js # Pure warehouse allocation algorithm
    │   ├── proration.service.js       # Pure billing proration math
    │   └── email.service.js           # Async non-blocking nodemailer service
    ├── jobs/
    │   └── stalled-deal.job.js        # Hourly node-cron stalled deal sweep
    └── utils/
        ├── token.util.js      # JWT signing & verification
        ├── cookie.util.js     # httpOnly cookie helpers
        └── magic-link.util.js # Magic link token generator
```

---

## 🚀 Quickstart & Setup

### 1. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure `DATABASE_URL` points to your PostgreSQL database using the non-owner role `dealflow_app_user` (or run setup script below to create it):
```env
DATABASE_URL=postgresql://dealflow_app_user:StrongPassword123@localhost:5432/dealflow360
ADMIN_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dealflow360
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Schema & Seed Data
Run the automated schema setup and seeder:
```bash
npm run setup:db
npm run seed
```

### 4. Start Server
```bash
# Development mode (nodemon)
npm run dev

# Production mode
npm start
```
The API server will start on port `5000` (or `PORT` from `.env`).

---

## 🔐 Seed Demo Credentials

| Actor Type | Email | Password | Role / Tier |
|---|---|---|---|
| **Admin** | `admin@acme.com` | `Password123!` | Staff Admin |
| **Sales Manager** | `manager@acme.com` | `Password123!` | Sales Manager |
| **Sales Rep** | `rep@acme.com` | `Password123!` | Sales Representative |
| **Finance** | `finance@acme.com` | `Password123!` | Finance & Operations |
| **Customer Portal** | `bruce@wayne.com` | `Password123!` | Wayne Enterprises (Gold Tier) |
| **Customer Portal** | `tony@stark.com` | `Password123!` | Stark Industries (Platinum Tier) |

---

## 📡 API Endpoint Overview

### 1. Authentication
- `POST /api/auth/register` — Staff registration
- `POST /api/auth/login` — Staff login (issues `staff_token` cookie)
- `GET /api/auth/me` — Authenticated staff profile
- `POST /api/auth/logout` — Clear staff session
- `POST /api/portal/auth/login` — Customer portal password login (issues `portal_token` cookie)
- `POST /api/portal/auth/request-link` — Request passwordless magic link email
- `GET /api/portal/auth/verify?token=...` — Verify magic link and sign in
- `GET /api/portal/auth/me` — Authenticated customer profile
- `POST /api/portal/auth/logout` — Clear customer portal session

### 2. Catalog & Products
- `GET /api/catalog/portal` — Safe customer catalog (uses `view_customer_portal_catalog`, hides costs/margins)
- `GET /api/catalog/categories` — List product categories
- `POST /api/catalog/categories` — Create category (Manager/Admin)
- `GET /api/catalog/products` — Full internal catalog with costs and margins
- `GET /api/catalog/products/:id` — Product detail with variants
- `POST /api/catalog/products` — Create product
- `PATCH /api/catalog/products/:id` — Update product
- `POST /api/catalog/products/:id/variants` — Create product variant
- `GET /api/catalog/price-lists` — Tier price lists
- `POST /api/catalog/price-lists/:id/items` — Custom price list overrides
- `GET /api/catalog/upsell-rules` — Upsell product pairings

### 3. Customer RFQ (Inquiries)
- `POST /api/rfq/portal/submit` — Customer portal submits cart inquiry
- `GET /api/rfq/portal/my-requests` — Customer lists submitted RFQs
- `GET /api/rfq` — Staff lists incoming RFQs (auto-notified)
- `GET /api/rfq/:id` — Staff views RFQ detail and requested items
- `POST /api/rfq/:id/convert` — Staff 1-click conversion to draft quotation via stored procedure
- `POST /api/rfq/:id/decline` — Staff declines inquiry

### 4. Quotation Builder
- `GET /api/quotations` — Staff lists active/draft quotations
- `GET /api/quotations/:id` — Quotation detail with lines and upsells
- `POST /api/quotations` — Create new quotation draft
- `POST /api/quotations/:id/items` — Add line item (automatically recalculates totals, margins, and risk score)
- `PATCH /api/quotations/items/:itemId` — Update line quantity or discount
- `DELETE /api/quotations/items/:itemId` — Remove line item
- `GET /api/quotations/:id/upsells` — Live upsell suggestions with margin delta
- `GET /api/quotations/portal/my-quotations` — Customer lists their quotations
- `GET /api/quotations/portal/:id` — Customer views safe quotation (hides sensitive internal margins)

### 5. Approval Flow & Governance
- `GET /api/approvals/:id/audit` — Immutable approval audit trail
- `POST /api/approvals/:id/action` — Manager/Finance decision (`approved`, `rejected`, `returned_for_revision`)
- `GET /api/approvals/governance/rules` — List discount ceilings (Tier x Category)
- `POST /api/approvals/governance/rules` — Upsert discount rule
- `GET /api/approvals/governance/chains` — List approval routing brackets
- `POST /api/approvals/governance/chains` — Create approval chain bracket

### 6. Customer Negotiation Portal
- `GET /api/negotiations/portal/:id` — Customer views negotiation thread
- `POST /api/negotiations/portal/:id` — Customer posts comment or counter-discount
- `POST /api/negotiations/portal/:id/confirm` — Customer confirms quotation (re-evaluates governance)
- `GET /api/negotiations/:id` — Staff views negotiation thread
- `POST /api/negotiations/:id` — Staff replies to negotiation

### 7. Fulfillment & Warehouse Splitting
- `GET /api/fulfillment/warehouses` — List warehouses and shipping weights
- `POST /api/fulfillment/warehouses` — Create warehouse
- `GET /api/fulfillment/inventory` — View real-time stock levels
- `PATCH /api/fulfillment/inventory` — Update warehouse stock
- `GET /api/fulfillment/quotations/:id/suggest-split` — Run pure allocation algorithm
- `POST /api/fulfillment/quotations/:id/confirm-split` — Commit shipment orders (suggested or manual override)
- `GET /api/fulfillment/quotations/:id/shipments` — List generated shipment orders and backorders
- `POST /api/fulfillment/quotations/:id/consolidate-backorders` — Consolidate remaining backorders

### 8. Subscriptions & Hybrid Billing
- `GET /api/subscriptions/plans` — List subscription billing plans
- `POST /api/subscriptions/plans` — Create subscription plan
- `GET /api/subscriptions` — List active customer subscriptions
- `PATCH /api/subscriptions/:id/adjust` — Mid-cycle seat adjustment with pure proration math
- `POST /api/subscriptions/:id/cancel` — Cancel subscription and generate credit note
- `POST /api/billing/quotations/:id/generate` — Generate hybrid billing from confirmed quote
- `GET /api/billing/invoices` — List invoices
- `GET /api/billing/invoices/:id` — Invoice detail with prorated items
- `POST /api/billing/invoices/:id/pay` — Record payment

### 9. Deal Health & Anomaly Dashboard
- `GET /api/dealhealth/alerts` — Real-time anomaly alerts (discount anomalies, stalled deals)
- `PATCH /api/dealhealth/alerts/:id/resolve` — Mark alert as resolved
- `POST /api/dealhealth/check-stalled` — Trigger stalled deal check on-demand

### 10. Notifications
- `GET /api/notifications` — In-app notifications for rep
- `PATCH /api/notifications/:id/read` — Mark notification read
- `POST /api/notifications/read-all` — Mark all notifications read

### 11. Reporting & Analytics
- `GET /api/reporting` — Aggregated revenue, margins, rep performance, top products
- `GET /api/reporting/export?format=csv` — Export reporting data

---

## 🔒 Security Guarantees
1. **Row-Level Security**: Enforced on every tenant table using Postgres session GUCs.
2. **Column-Level Protection**: Customers can NEVER read internal unit costs, margins, or audit logs even if crafting manual queries.
3. **Connection Sanitization**: Every tenant execution is wrapped in a strict transaction with guaranteed `RESET ROLE` in `finally`.
