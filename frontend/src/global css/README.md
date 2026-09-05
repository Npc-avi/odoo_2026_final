# DealFlow360 Global CSS Component Reference

This directory contains the global CSS design system and component references for all internal application and customer portal pages in DealFlow360.

> **Scope**: Applied to all staff screens (Dashboard, Quotations, Approvals, Fulfillment, Billing, Catalog, Governance, Deal Health, RFQs) and Customer Portal pages.  
> **Excluded**: Public marketing landing page (`/`) and authentication screens (`/login`, `/signup`), which retain their dark-mode visual identities.

---

## File Structure

| File | Purpose |
|---|---|
| [`tokens.css`](./tokens.css) | Core design tokens (colors, borders, shadows, radii) |
| [`cards.css`](./cards.css) | Light cards, KPI metric blocks, and alert banners |
| [`tables.css`](./tables.css) | Ledger tables, headers, data rows, currency cells |
| [`forms.css`](./forms.css) | Inputs, selects, textareas, quantity steppers, search bars |
| [`buttons.css`](./buttons.css) | Primary red buttons, secondary neutrals, success, icon buttons |
| [`badges.css`](./badges.css) | Workflow status pills (draft, confirmed, pending, etc.) |
| [`modals.css`](./modals.css) | Modal overlays, dialogs, drawers, animations |
| [`layout.css`](./layout.css) | Page wrappers, headers, titles, Kanban columns |
| [`index.css`](./index.css) | Master bundle importing all stylesheets |

---

## Quick Component Reference

### 1. Cards
```html
<!-- Standard Card -->
<div class="app-card">
  <div class="app-card-header">
    <h3 class="font-bold">Card Title</h3>
  </div>
  <div class="app-card-body">
    <p>Card content here...</p>
  </div>
  <div class="app-card-footer">
    <span>Footer Note</span>
  </div>
</div>

<!-- KPI Metric Card -->
<div class="app-metric-card">
  <div class="app-metric-header">
    <span>METRIC</span>
    <span>001</span>
  </div>
  <div class="app-metric-title">TOTAL PIPELINE</div>
  <div class="app-metric-value">$1,240,000</div>
  <div class="app-metric-tagline">Active qualified deals in flight</div>
  <div class="app-metric-footer">
    <span class="badge-confirmed">HEALTHY</span>
  </div>
</div>
```

### 2. Tables
```html
<div class="app-table-wrapper">
  <div class="app-table-scroll">
    <table class="app-table">
      <thead class="app-thead">
        <tr>
          <th class="app-th">QUOTE #</th>
          <th class="app-th">CUSTOMER</th>
          <th class="app-th app-th-right">AMOUNT</th>
          <th class="app-th app-th-center">STATUS</th>
        </tr>
      </thead>
      <tbody class="app-tbody app-tbody-divide">
        <tr class="app-tr">
          <td class="app-td app-td-brand">QT-2026-001</td>
          <td class="app-td app-td-bold">Acme Corp</td>
          <td class="app-td app-td-currency">$45,000.00</td>
          <td class="app-td app-td-center">
            <span class="app-badge badge-confirmed">CONFIRMED</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

### 3. Forms & Inputs
```html
<!-- Input with Label -->
<div>
  <label class="app-label">Target Delivery Date</label>
  <input type="date" class="app-input" />
</div>

<!-- Quantity Stepper -->
<div class="app-stepper">
  <button type="button" class="app-stepper-btn">-</button>
  <span class="app-stepper-val">5</span>
  <button type="button" class="app-stepper-btn">+</button>
</div>
```

### 4. Buttons
```html
<button class="btn btn-primary">Create Quotation</button>
<button class="btn btn-secondary">Cancel</button>
<button class="btn btn-success">Confirm Quotation</button>
<button class="btn-icon" title="Refresh"><RefreshIcon /></button>
```

### 5. Status Badges
```html
<span class="app-badge badge-draft">Draft</span>
<span class="app-badge badge-pending">Pending Approval</span>
<span class="app-badge badge-negotiating">Negotiating</span>
<span class="app-badge badge-confirmed">Confirmed</span>
<span class="app-badge badge-fulfillment">In Fulfillment</span>
<span class="app-badge badge-backorder">Backorder</span>
```

### 6. Modals
```html
<div class="app-modal-overlay">
  <div class="app-modal-dialog">
    <div class="app-modal-header">
      <h3 class="app-modal-title">System Action</h3>
      <button class="app-modal-close"><XIcon /></button>
    </div>
    <div>Modal content...</div>
    <div class="app-modal-footer">
      <button class="btn btn-secondary">Close</button>
      <button class="btn btn-primary">Save</button>
    </div>
  </div>
</div>
```
