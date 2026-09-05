import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layout guards
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { PublicOnlyRoute } from '@/features/auth/components/PublicOnlyRoute';

// Public & Landing
import { LandingPage } from './LandingPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { SignUpPage } from '@/features/auth/pages/SignUpPage';
import { PortalVerifyPage } from '@/features/auth/pages/PortalVerifyPage';

// Staff App Pages
import { Dashboard } from './Dashboard';
import { QuotationListPage } from '@/features/quotations/pages/QuotationListPage';
import { QuotationDetailPage } from '@/features/quotations/pages/QuotationDetailPage';
import { QuotationBuilderPage } from '@/features/quotations/pages/QuotationBuilderPage';
import { RfqListPage } from '@/features/rfq/pages/RfqListPage';
import { ApprovalInboxPage } from '@/features/approvals/pages/ApprovalInboxPage';
import { CatalogPage } from '@/features/catalog/pages/CatalogPage';
import { GovernanceRulesPage } from '@/features/catalog/pages/GovernanceRulesPage';
import { ShipmentsPage } from '@/features/fulfillment/pages/ShipmentsPage';
import { InvoiceListPage } from '@/features/billing/pages/InvoiceListPage';
import { DealHealthPage } from '@/features/dealhealth/pages/DealHealthPage';

// Customer Portal Pages
import { CustomerPortalHome } from '@/features/portal/pages/CustomerPortalHome';
import { CustomerQuotesPage } from '@/features/portal/pages/CustomerQuotesPage';
import { CustomerQuoteDetailPage } from '@/features/portal/pages/CustomerQuoteDetailPage';
import { CustomerRfqPage } from '@/features/portal/pages/CustomerRfqPage';

export const router = createBrowserRouter([
  // 1. Public Marketing Landing Page
  {
    path: '/',
    element: <LandingPage />,
  },

  // 2. Public-only Auth Pages (redirect if already logged in)
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/signup',
        element: <SignUpPage />,
      },
      {
        path: '/register',
        element: <SignUpPage />,
      },
      {
        path: '/portal/login',
        element: <LoginPage />,
      },
    ],
  },

  // 3. Magic Link Verification Callback
  {
    path: '/portal/verify',
    element: <PortalVerifyPage />,
  },

  // 4. Protected Internal Staff Routes
  {
    element: <ProtectedRoute allowedRoles={['admin', 'sales_manager', 'sales_rep', 'finance']} />,
    children: [
      {
        path: '/dashboard',
        element: <Dashboard />,
      },
      {
        path: '/quotations',
        element: <QuotationListPage />,
      },
      {
        path: '/quotations/new',
        element: <QuotationBuilderPage />,
      },
      {
        path: '/quotations/:id',
        element: <QuotationDetailPage />,
      },
      {
        path: '/quotations/:id/edit',
        element: <QuotationBuilderPage />,
      },
      {
        path: '/rfqs',
        element: <RfqListPage />,
      },
      {
        path: '/approvals',
        element: <ApprovalInboxPage />,
      },
      {
        path: '/catalog',
        element: <CatalogPage />,
      },
      {
        path: '/governance',
        element: <GovernanceRulesPage />,
      },
      {
        path: '/fulfillment',
        element: <ShipmentsPage />,
      },
      {
        path: '/billing',
        element: <InvoiceListPage />,
      },
      {
        path: '/dealhealth',
        element: <DealHealthPage />,
      },
    ],
  },

  // 5. Protected Customer Portal Routes
  {
    element: <ProtectedRoute allowedRoles={['customer_portal']} />,
    children: [
      {
        path: '/portal',
        element: <CustomerPortalHome />,
      },
      {
        path: '/portal/quotations',
        element: <CustomerQuotesPage />,
      },
      {
        path: '/portal/quotations/:id',
        element: <CustomerQuoteDetailPage />,
      },
      {
        path: '/portal/rfqs',
        element: <CustomerRfqPage />,
      },
    ],
  },

  // Fallback 404 redirect
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
