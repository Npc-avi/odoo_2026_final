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
      toast.success('Alert resolved and removed from Deal Health.');
      await loadAlerts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve alert.');
      await loadAlerts();
    }
  };

  const recordAction = async (id: string, action: string) => {
    try {
      await recordDealHealthActionApi(id, action);
      toast.success(`Action recorded: ${action}`);
      await loadAlerts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record action.');
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
