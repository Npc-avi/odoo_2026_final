import { useState, useCallback } from 'react';
import { fetchQuotationsApi } from '../services/quotations.api';

export function useQuotations() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuotations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchQuotationsApi();
      setQuotations(data.quotations || data || []);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to load quotations.');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    quotations,
    loading,
    error,
    loadQuotations
  };
}

export default useQuotations;
