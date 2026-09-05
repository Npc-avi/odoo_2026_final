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

export async function fetchProductDetailApi(productId: string) {
  try {
    const res = await catalogApi.get(`/products/${productId}`);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch product details.' };
  }
}

export async function createProductApi(data: any) {
  try {
    const res = await catalogApi.post('/products', data);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to create product.' };
  }
}

export async function updateProductApi(productId: string, data: any) {
  try {
    const res = await catalogApi.patch(`/products/${productId}`, data);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to update product.' };
  }
}

export async function createVariantApi(productId: string, data: any) {
  try {
    const res = await catalogApi.post(`/products/${productId}/variants`, data);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to create product variant.' };
  }
}

export async function fetchPriceListsApi() {
  try {
    const res = await catalogApi.get('/price-lists');
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to fetch price lists.' };
  }
}

export async function createPriceListApi(data: any) {
  try {
    const res = await catalogApi.post('/price-lists', data);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to create price list.' };
  }
}

export async function createPriceListItemApi(priceListId: string, data: any) {
  try {
    const res = await catalogApi.post(`/price-lists/${priceListId}/items`, data);
    return res.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Failed to create price list item.' };
  }
}
