import { useState, useCallback } from 'react';
import { fetchShipmentsApi } from '../services/fulfillment.api';

export function useFulfillment() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadShipments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchShipmentsApi();
      setShipments(data.shipments || data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load shipments.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { shipments, loading, error, loadShipments };
}

export default useFulfillment;
