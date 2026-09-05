import { useState, useCallback } from 'react';
import { fetchDealHealthAlertsApi } from '../services/dealhealth.api';

export function useDealHealth() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDealHealthAlertsApi();
      setAlerts(data.alerts || data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load deal health alerts.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { alerts, loading, error, loadAlerts };
}

export default useDealHealth;
