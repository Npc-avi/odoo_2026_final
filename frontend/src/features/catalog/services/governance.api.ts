import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const governanceApi = axios.create({
  baseURL: `${BASE_URL}/governance`,
  withCredentials: true,
});

export async function fetchGovernanceStaffApi() {
  try {
    const res = await governanceApi.get('/staff');
    return res.data;
  } catch (err: any) {
    throw err.response?.data || { message: 'Failed to fetch staff members.' };
  }
}

export async function updateStaffRoleApi(id: string, role: string) {
  try {
    const res = await governanceApi.patch(`/staff/${id}/role`, { role });
    return res.data;
  } catch (err: any) {
    throw err.response?.data || { message: 'Failed to update staff role.' };
  }
}

export async function toggleStaffStatusApi(id: string, is_active: boolean) {
  try {
    const res = await governanceApi.patch(`/staff/${id}/status`, { is_active });
    return res.data;
  } catch (err: any) {
    throw err.response?.data || { message: 'Failed to update staff status.' };
  }
}

export async function createStaffMemberApi(payload: {
  full_name: string;
  email: string;
  role: string;
}) {
  try {
    const res = await governanceApi.post('/staff', payload);
    return res.data;
  } catch (err: any) {
    throw err.response?.data || { message: 'Failed to create staff member.' };
  }
}

export async function fetchGovernanceCustomersApi() {
  try {
    const res = await governanceApi.get('/customers');
    return res.data;
  } catch (err: any) {
    throw err.response?.data || { message: 'Failed to fetch customer accounts.' };
  }
}

export async function createCustomerMemberApi(payload: {
  company_name: string;
  contact_name: string;
  email: string;
  tier: string;
  credit_limit?: number;
  subscription_plan_id?: string;
}) {
  try {
    const res = await governanceApi.post('/customers', payload);
    return res.data;
  } catch (err: any) {
    throw err.response?.data || { message: 'Failed to create customer account.' };
  }
}
