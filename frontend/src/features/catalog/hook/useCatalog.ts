import { useState, useCallback } from 'react';
import { fetchProductsApi } from '../services/catalog.api';

export function useCatalog() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProductsApi();
      setProducts(data.products || data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { products, loading, error, loadProducts };
}

export default useCatalog;
