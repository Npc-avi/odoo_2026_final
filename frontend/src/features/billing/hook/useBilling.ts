import { useState, useCallback } from 'react';
import {
  fetchInvoicesApi,
  fetchBillableQuotationsApi,
  generateBillingForQuotationApi,
  recordInvoicePaymentApi,
} from '../services/billing.api';
import { toast } from 'react-toastify';

export function useBilling() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [billableQuotes, setBillableQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [invData, quotes] = await Promise.all([
        fetchInvoicesApi().catch(() => ({ invoices: [] })),
        fetchBillableQuotationsApi().catch(() => []),
      ]);
      setInvoices(invData.invoices || []);
      setBillableQuotes(quotes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load billing ledger.');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateBilling = async (quotationId: string) => {
    try {
      setGenerating(true);
      const res = await generateBillingForQuotationApi(quotationId);
      toast.success(res.message || 'Hybrid billing generated successfully!');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate billing.');
      throw err;
    } finally {
      setGenerating(false);
    }
  };

  const recordPayment = async (invoiceId: string) => {
    try {
      const res = await recordInvoicePaymentApi(invoiceId, { paymentAmount: 1000 });
      toast.success(res.message || 'Payment recorded! Invoice settled as PAID.');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment.');
      throw err;
    }
  };

  return {
    invoices,
    billableQuotes,
    loading,
    generating,
    error,
    loadData,
    generateBilling,
    recordPayment,
  };
}

export default useBilling;
