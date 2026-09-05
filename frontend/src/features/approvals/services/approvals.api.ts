import axios from 'axios';
import { quotationsApi } from '@/features/quotations/services/quotations.api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const approvalsApi = axios.create({
  baseURL: `${BASE_URL}/approvals`,
  withCredentials: true,
});

export async function fetchPendingApprovalsApi() {
  try {
    const res = await quotationsApi.get('/');
    const allQuotes = res.data?.quotations || [];
    // Filter down to quotations awaiting Manager, Finance approval, or under negotiation
    const pending = allQuotes.filter((q: any) =>
      ['pending_manager', 'pending_finance', 'under_negotiation', 'sent'].includes(q.status)
    );
    return { approvals: pending, allQuotes };
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch pending approvals.' };
  }
}

export async function fetchApprovalAuditApi(quotationId: string) {
  try {
    const res = await approvalsApi.get(`/${quotationId}/audit`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch audit log.' };
  }
}

export async function submitApprovalActionApi(
  quotationId: string,
  action: 'approved' | 'rejected' | 'returned_for_revision',
  justification: string
) {
  try {
    const res = await approvalsApi.post(`/${quotationId}/action`, { action, justification });
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to process approval action.' };
  }
}

export async function fetchGovernanceRulesApi() {
  try {
    const res = await approvalsApi.get('/governance/rules');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch governance rules.' };
  }
}

export async function saveGovernanceRuleApi(rule: {
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  categoryId: string;
  maxDiscountPct: number;
}) {
  try {
    const res = await approvalsApi.post('/governance/rules', rule);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to save governance rule.' };
  }
}

export async function fetchApprovalChainsApi() {
  try {
    const res = await approvalsApi.get('/governance/chains');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch approval chains.' };
  }
}
