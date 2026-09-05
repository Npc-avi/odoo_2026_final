import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const reportingApi = axios.create({
  baseURL: `${BASE_URL}/reporting`,
  withCredentials: true,
});

export interface ReportFilterParams {
  startDate?: string;
  endDate?: string;
  repId?: string;
  status?: string;
  productId?: string;
}

export async function fetchReportingMetricsApi(params?: ReportFilterParams) {
  try {
    const res = await reportingApi.get('/', { params });
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch reporting metrics.' };
  }
}

export async function downloadReportCsvApi(params?: ReportFilterParams) {
  try {
    const res = await reportingApi.get('/export', {
      params: { ...params, format: 'csv' },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'dealflow-governance-report.csv');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to export report CSV.' };
  }
}

export async function fetchStaffRepsApi() {
  try {
    const res = await axios.get(`${BASE_URL}/approvals/users`, { withCredentials: true }).catch(async () => {
      return await axios.get(`${BASE_URL}/auth/whoami`, { withCredentials: true });
    });
    return res.data;
  } catch (error: any) {
    return [];
  }
}

export interface SendReportNowPayload {
  recipientEmail?: string;
  period?: string;
  repId?: string;
  status?: string;
  productId?: string;
}

export async function sendReportNowApi(payload: SendReportNowPayload) {
  try {
    const res = await reportingApi.post('/send-now', payload);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to send report email.' };
  }
}

export interface CronSchedulePayload {
  is_active?: boolean;
  frequency?: 'hourly' | 'every_6h' | 'daily' | 'weekly' | 'custom';
  cron_expression?: string;
  recipient_email?: string;
}

export async function fetchReportCronScheduleApi() {
  try {
    const res = await reportingApi.get('/cron-schedule');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to load cron schedule.' };
  }
}

export async function saveReportCronScheduleApi(payload: CronSchedulePayload) {
  try {
    const res = await reportingApi.post('/cron-schedule', payload);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to save cron schedule.' };
  }
}

export async function deleteReportCronScheduleApi() {
  try {
    const res = await reportingApi.delete('/cron-schedule');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to disable cron schedule.' };
  }
}
