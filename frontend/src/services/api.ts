import axios from 'axios';

// Create axios instance
export const api = axios.create({
  baseURL:  'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  // Auth
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    me: '/auth/me',
    changePassword: '/auth/change-password',
  },
  
  // Users
  users: {
    list: '/users',
    get: (id: string) => `/users/${id}`,
    update: (id: string) => `/users/${id}`,
    delete: (id: string) => `/users/${id}`,
    stats: (id: string) => `/users/${id}/stats`,
    search: '/users/search/project-members',
  },
  
  // Projects
  projects: {
    list: '/projects',
    get: (id: string) => `/projects/${id}`,
    create: '/projects',
    update: (id: string) => `/projects/${id}`,
    delete: (id: string) => `/projects/${id}`,
    addMember: (id: string) => `/projects/${id}/members`,
    removeMember: (projectId: string, userId: string) => `/projects/${projectId}/members/${userId}`,
    updateMemberRole: (projectId: string, userId: string) => `/projects/${projectId}/members/${userId}`,
  },
  
  // Tickets
  tickets: {
    list: '/tickets',
    get: (id: string) => `/tickets/${id}`,
    create: '/tickets',
    update: (id: string) => `/tickets/${id}`,
    delete: (id: string) => `/tickets/${id}`,
    addLabel: (id: string) => `/tickets/${id}/labels`,
    removeLabel: (ticketId: string, labelId: string) => `/tickets/${ticketId}/labels/${labelId}`,
  },
  
  // Comments
  comments: {
    list: (ticketId: string) => `/comments/ticket/${ticketId}`,
    create: '/comments',
    update: (id: string) => `/comments/${id}`,
    delete: (id: string) => `/comments/${id}`,
  },
};

// Helper functions for common API operations
export const apiHelpers = {
  // Get paginated results
  getPaginated: async <T>(url: string, params?: any) => {
    const response = await api.get(url, { params });
    return response.data;
  },

  // Create new resource
  create: async <T>(url: string, data: any) => {
    const response = await api.post(url, data);
    return response.data;
  },

  // Update resource
  update: async <T>(url: string, data: any) => {
    const response = await api.put(url, data);
    return response.data;
  },

  // Delete resource
  delete: async (url: string) => {
    const response = await api.delete(url);
    return response.data;
  },

  // Upload file
  upload: async (url: string, file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  },
};

export default api;
