// General API Client for TRIP E-Bikes App
// Interacts with the PHP backend at /api/

export interface ApiResponse<T = any> {
  data: T | null;
  error: { message: string } | null;
}

const BASE_URL = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    // Normalize endpoint (make sure it has .php if calling auth, products, quotations etc., and starts with /)
    let url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // If the endpoint does not end with .php and does not have query parameters indicating otherwise,
    // we can append .php if it's one of our known endpoints, or simply keep it.
    // To make it easy, we'll map or check if it needs .php
    const cleanPath = url.split('?')[0];
    if (!cleanPath.endsWith('.php') && !cleanPath.includes('.')) {
      const parts = url.split('?');
      parts[0] = parts[0] + '.php';
      url = parts.join('?');
    }

    const headers = {
      ...getAuthHeader(),
      ...(options.headers || {}),
    } as Record<string, string>;

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(`${BASE_URL}${url}`, config);
    
    // Handle unauthorized globally
    if (response.status === 401) {
      localStorage.removeItem('token');
    }

    const contentType = response.headers.get('content-type');
    let result: any;
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      result = { message: await response.text() };
    }

    if (!response.ok || (result && result.status === 'error')) {
      return {
        data: null,
        error: { message: result.message || response.statusText || 'Request failed' },
      };
    }

    // Adapt PHP responses which usually wrap data in key/values
    // PHP success responses have { status: 'success', data: ... } or other fields directly at root
    let adaptedData = result;
    if (result && result.status === 'success') {
      // If result contains other keys like products, appointments, user, etc.
      // let's return the whole result, or filter it out.
      // But standard api responses can just return the response object itself.
      // Let's make it return result.data !== undefined ? result.data : result.
      adaptedData = result.data !== undefined ? result.data : result;
    }

    return {
      data: adaptedData,
      error: null,
    };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || 'Network error' },
    };
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { method: 'GET', ...options }),
  
  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
      ...options,
    }),
  
  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
      ...options,
    }),
  
  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { method: 'DELETE', ...options }),
};
