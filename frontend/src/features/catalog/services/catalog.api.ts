import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const catalogApi = axios.create({
  baseURL: `${BASE_URL}/catalog`,
  withCredentials: true,
});

export async function fetchProductsApi() {
  try {
    const res = await catalogApi.get('/products');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch catalog products.' };
  }
}

export async function fetchCategoriesApi() {
  try {
    const res = await catalogApi.get('/categories');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch product categories.' };
  }
}
