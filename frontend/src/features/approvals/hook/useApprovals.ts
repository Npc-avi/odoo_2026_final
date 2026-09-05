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
      const res = await submitApprovalActionApi(id, action, justification);
      const newStatus = res?.decision?.newStatus;
      if (action === 'approved' && newStatus === 'under_negotiation') {
        toast.info('Rep Approved! Request exceeds package standard limit—remaining in negotiation awaiting Sales Manager approval.');
      } else if (newStatus === 'pending_manager') {
        toast.info('Endorsed by Sales Rep. Escalated to Sales Manager.');
      } else if (newStatus === 'confirmed') {
        toast.success('Quotation approved and confirmed!');
      } else if (newStatus === 'under_negotiation') {
        toast.info('Returned for revision. Status set to Negotiating.');
      } else if (newStatus === 'rejected') {
        toast.error('Quotation rejected.');
      } else {
        toast.success(res?.message || `Action '${action}' processed successfully.`);
      }
      await loadApprovals();
      return res;
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
