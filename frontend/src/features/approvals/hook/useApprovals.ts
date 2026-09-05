import { useState, useCallback } from 'react';
import {
  fetchPendingApprovalsApi,
  submitApprovalActionApi,
  fetchApprovalAuditApi,
} from '../services/approvals.api';
import { toast } from 'react-toastify';

export function useApprovals() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [allQuotes, setAllQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPendingApprovalsApi();
      setApprovals(data.approvals || []);
      setAllQuotes(data.allQuotes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load approvals.');
    } finally {
      setLoading(false);
    }
  }, []);

  const makeDecision = async (
    id: string,
    action: 'approved' | 'rejected' | 'returned_for_revision',
    justification = 'Decision recorded via Approval Chain'
  ) => {
    try {
      await submitApprovalActionApi(id, action, justification);
      toast.success(`Quotation action '${action}' processed successfully!`);
      await loadApprovals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process approval decision.');
      throw err;
    }
  };

  const getAuditLogs = async (id: string) => {
    try {
      const res = await fetchApprovalAuditApi(id);
      return res.auditLogs || [];
    } catch (err) {
      return [];
    }
  };

  return { approvals, allQuotes, loading, error, loadApprovals, makeDecision, getAuditLogs };
}

export default useApprovals;
