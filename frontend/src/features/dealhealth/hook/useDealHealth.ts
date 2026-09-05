import { useState, useCallback } from 'react';
import {
  fetchDealHealthAlertsApi,
  resolveDealHealthAlertApi,
  recordDealHealthActionApi,
  triggerDealHealthSweepApi,
} from '../services/dealhealth.api';
import { toast } from 'react-toastify';

export function useDealHealth() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sweeping, setSweeping] = useState<boolean>(false);
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

  const resolveAlert = async (id: string) => {
    try {
      // Optimistically remove from state immediately
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      await resolveDealHealthAlertApi(id);
      // Silent sync in background without toggling loading state (prevents UI flicker)
      const data = await fetchDealHealthAlertsApi();
      setAlerts(data.alerts || data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve alert.');
      const data = await fetchDealHealthAlertsApi();
      setAlerts(data.alerts || data || []);
    }
  };

  const recordAction = async (id: string, action: string) => {
    try {
      // Optimistically update action_status immediately for seamless instant feedback
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, action_status: action } : a))
      );
      await recordDealHealthActionApi(id, action);
      // Silent sync in background without flickering loading state
      const data = await fetchDealHealthAlertsApi();
      setAlerts(data.alerts || data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to record action.');
      const data = await fetchDealHealthAlertsApi();
      setAlerts(data.alerts || data || []);
    }
  };

  const runSweep = async (idleDays = 3) => {
    try {
      setSweeping(true);
      const res = await triggerDealHealthSweepApi(idleDays);
      toast.success(res.message || 'Deal health telemetry sweep completed.');
      await loadAlerts();
    } catch (err: any) {
      toast.error(err.message || 'Sweep failed.');
    } finally {
      setSweeping(false);
    }
  };

  return {
    alerts,
    loading,
    sweeping,
    error,
    loadAlerts,
    resolveAlert,
    recordAction,
    runSweep,
  };
}

export default useDealHealth;
