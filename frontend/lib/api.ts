import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API functions
export const auth = {
  register: async (data: { email: string; password: string; full_name?: string }) => {
    const response = await api.post('/api/auth/register', data);
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },
  
  login: async (email: string, password: string) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await api.post('/api/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
  },
  
  getMe: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('token');
  }
};

export const workspaces = {
  create: async (data: any) => {
    const response = await api.post('/api/workspaces', data);
    return response.data;
  },
  
  list: async () => {
    const response = await api.get('/api/workspaces');
    return response.data;
  },
  
  get: async (id: string) => {
    const response = await api.get(`/api/workspaces/${id}`);
    return response.data;
  },
  
  getDashboardStats: async (workspaceId: string) => {
    const response = await api.get(`/api/workspaces/${workspaceId}/dashboard/stats`);
    return response.data;
  }
};

export const bookings = {
  create: async (workspaceId: string, data: any) => {
    const response = await api.post(`/api/workspaces/${workspaceId}/bookings`, data);
    return response.data;
  },
  
  list: async (workspaceId: string) => {
    const response = await api.get(`/api/workspaces/${workspaceId}/bookings`);
    return response.data;
  }
};

export const contacts = {
  create: async (workspaceId: string, data: any) => {
    const response = await api.post(`/api/workspaces/${workspaceId}/contacts`, data);
    return response.data;
  },
  
  list: async (workspaceId: string) => {
    const response = await api.get(`/api/workspaces/${workspaceId}/contacts`);
    return response.data;
  }
};

export const publicApi = {
  getWorkspace: async (slug: string) => {
    const response = await axios.get(`${API_URL}/api/public/workspaces/${slug}`);
    return response.data;
  },
  
  getServices: async (slug: string) => {
    const response = await axios.get(`${API_URL}/api/public/workspaces/${slug}/services`);
    return response.data;
  },
  
  createBooking: async (slug: string, data: any) => {
    const response = await axios.post(`${API_URL}/api/public/workspaces/${slug}/bookings`, data);
    return response.data;
  }
};
