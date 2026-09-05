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
