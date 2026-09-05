import { useState, useCallback } from 'react';
import { fetchStaffRfqsApi } from '../services/rfq.api';

export function useRfq() {
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadRfqs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchStaffRfqsApi();
      setRfqs(data.rfqs || data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load RFQs.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { rfqs, loading, error, loadRfqs };
}

export default useRfq;
