import { useCallback } from 'react';
import { fetchQuotationsApi } from '../services/quotations.api';
import { useSWR } from '@/hooks/useSWR';

export function useQuotations() {
  const fetcher = useCallback(async () => {
    const data = await fetchQuotationsApi();
    return data.quotations || data || [];
  }, []);

  const {
    data: quotations = [],
    isLoading: loading,
    error,
    revalidate: loadQuotations
  } = useSWR<any[]>('quotations-list', fetcher, { ttl: 20000 });

  return {
    quotations,
    loading,
    error: error ? error.message : null,
    loadQuotations
  };
}

export default useQuotations;

