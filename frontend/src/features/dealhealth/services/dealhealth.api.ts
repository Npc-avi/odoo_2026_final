import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const dealHealthApi = axios.create({
  baseURL: `${BASE_URL}/dealhealth`,
  withCredentials: true,
});

export async function fetchDealHealthAlertsApi() {
  try {
    const res = await dealHealthApi.get('/alerts');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch deal health alerts.' };
  }
}

export async function resolveDealHealthAlertApi(id: string) {
  try {
    const res = await dealHealthApi.patch(`/alerts/${id}/resolve`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to resolve alert.' };
  }
}

export async function recordDealHealthActionApi(id: string, action: string) {
  try {
    const res = await dealHealthApi.post(`/alerts/${id}/action`, { action });
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to record alert action.' };
  }
}

export async function triggerDealHealthSweepApi(idleDays = 3) {
  try {
    const res = await dealHealthApi.post('/check-stalled', { idleDays });
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to trigger sweep.' };
  }
}
