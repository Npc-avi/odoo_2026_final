import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const rfqApi = axios.create({
  baseURL: `${BASE_URL}/rfqs`,
  withCredentials: true,
});

export async function fetchStaffRfqsApi() {
  try {
    const res = await rfqApi.get('/');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch RFQs.' };
  }
}

export async function fetchCustomerRfqsApi() {
  try {
    const res = await rfqApi.get('/portal/my-requests');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch customer RFQs.' };
  }
}

export async function submitPortalRfqApi(payload: any) {
  try {
    const res = await rfqApi.post('/portal/submit', payload);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to submit RFQ.' };
  }
}

export async function fetchRfqDetailApi(id: string) {
  try {
    const res = await rfqApi.get(`/${id}`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch RFQ details.' };
  }
}

export async function rejectRfqApi(id: string) {
  try {
    const res = await rfqApi.post(`/${id}/decline`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to decline RFQ.' };
  }
}

export async function convertRfqApi(id: string, assignedRepId?: string) {
  try {
    const res = await rfqApi.post(`/${id}/convert`, { assignedRepId });
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to convert RFQ.' };
  }
}

