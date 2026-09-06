import axios from 'axios';
import { quotationsApi } from '@/features/quotations/services/quotations.api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const billingApi = axios.create({
  baseURL: `${BASE_URL}/billing`,
  withCredentials: true,
});

export async function fetchInvoicesApi() {
  try {
    const res = await billingApi.get('/invoices');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch invoices.' };
  }
}

export async function fetchInvoiceByIdApi(id: string) {
  try {
    const res = await billingApi.get(`/invoices/${id}`);
    return res.data;
  } catch (error: any) {
    try {
      const portalRes = await billingApi.get(`/portal/invoices/${id}`);
      return portalRes.data;
    } catch {
      throw error.response?.data || { message: `Failed to fetch invoice ${id}.` };
    }
  }
}

export async function generateBillingForQuotationApi(quotationId: string) {
  try {
    const res = await billingApi.post(`/quotations/${quotationId}/generate`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to generate billing for quotation.' };
  }
}

export async function recordInvoicePaymentApi(
  invoiceId: string,
  payload: {
    paymentAmount: number;
    paymentReference?: string;
  }
) {
  try {
    const res = await billingApi.post(`/invoices/${invoiceId}/pay`, payload);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to record invoice payment.' };
  }
}

export async function recordPaymentApi(invoiceId: string, payload: any = {}) {
  try {
    const res = await billingApi.post(`/invoices/${invoiceId}/pay`, payload);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to record invoice payment.' };
  }
}

export async function fetchBillableQuotationsApi() {
  try {
    const res = await quotationsApi.get('/');
    const all = res.data?.quotations || [];
    return all.filter((q: any) => ['confirmed', 'shipped', 'delivered'].includes(q.status));
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch billable orders.' };
  }
}

export async function fetchPortalInvoicesApi() {
  try {
    const res = await billingApi.get('/portal/invoices');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch portal invoices.' };
  }
}

export async function fetchPortalInvoiceByIdApi(id: string) {
  try {
    const res = await billingApi.get(`/portal/invoices/${id}`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: `Failed to fetch invoice ${id}.` };
  }
}

/**
 * Razorpay Payment Gateway APIs
 */
export async function createRazorpayOrderApi(invoiceId: string, currency?: string) {
  try {
    const res = await billingApi.post(`/invoices/${invoiceId}/razorpay-order`, { currency });
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to initiate Razorpay order.' };
  }
}

export async function verifyRazorpayPaymentApi(
  invoiceId: string,
  payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }
) {
  try {
    const res = await billingApi.post(`/invoices/${invoiceId}/verify-razorpay`, payload);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to verify Razorpay payment.' };
  }
}

