const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

const TOKEN_KEY = 'chitrakala_admin_token';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function clearAdminToken(): void {
  setAdminToken(null);
}

function authHeaders(): Record<string, string> {
  const t = getAdminToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function jsonRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...(init.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `HTTP error! status: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type AdminAuthUser = {
  id: number | string;
  username: string;
  email: string;
  name: string | null;
  role: string;
};

export type AdminLoginResult = {
  success?: boolean;
  token?: string;
  user?: AdminAuthUser;
  error?: string;
};

export type AdminMeResult = {
  success: boolean;
  user?: AdminAuthUser;
  error?: string;
};

export type ListUsersParams = {
  profile_complete?: string;
  language?: string;
  state?: string;
  district?: string;
  tahsil?: string;
  designation?: string;
  political_party?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export const api = {
  health: () => jsonRequest<{ status: string; message?: string }>('/health', { method: 'GET' }),

  adminLogin: async (username: string, password: string): Promise<AdminLoginResult> => {
    const res = await fetch(`${API_BASE}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = (await res.json().catch(() => ({}))) as AdminLoginResult;
    if (!res.ok) {
      throw new Error(data.error || `HTTP error! status: ${res.status}`);
    }
    return data;
  },

  adminMe: () => jsonRequest<AdminMeResult>('/admin/auth/me', { method: 'GET' }),

  listUsers: (filters: ListUsersParams = {}) => {
    const t = new URLSearchParams();
    if (filters.profile_complete != null) t.set('profile_complete', filters.profile_complete);
    if (filters.language?.trim()) t.set('language', filters.language.trim());
    if (filters.state?.trim()) t.set('state', filters.state.trim());
    if (filters.district?.trim()) t.set('district', filters.district.trim());
    if (filters.tahsil?.trim()) t.set('tahsil', filters.tahsil.trim());
    if (filters.designation?.trim()) t.set('designation', filters.designation.trim());
    if (filters.political_party?.trim()) t.set('political_party', filters.political_party.trim());
    if (filters.category?.trim()) t.set('category', filters.category.trim());
    if (filters.search?.trim()) t.set('search', filters.search.trim());
    if (filters.limit != null) t.set('limit', String(filters.limit));
    if (filters.offset != null) t.set('offset', String(filters.offset));
    const q = t.toString();
    return jsonRequest(`/admin/users${q ? `?${q}` : ''}`, { method: 'GET' });
  },

  signUp: (phone: string, password: string) =>
    jsonRequest('/auth/signup', { method: 'POST', body: JSON.stringify({ phone, password }) }),

  login: (phone: string, password: string) =>
    jsonRequest('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),

  sendOTP: (phone: string) =>
    jsonRequest('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),

  verifyOTP: (phone: string, otp: string) =>
    jsonRequest('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp }) }),

  completeProfile: (userId: string | number, body: Record<string, unknown>) =>
    jsonRequest('/auth/complete-profile', { method: 'PUT', body: JSON.stringify({ userId, ...body }) }),

  getProfile: (userId: string | number) => jsonRequest(`/auth/profile/${userId}`, { method: 'GET' }),

  getAllUsers: () => jsonRequest('/admin/users', { method: 'GET' }),

  getUserStats: () => jsonRequest('/admin/stats/users', { method: 'GET' }),

  getRevenueStats: () => jsonRequest('/admin/stats/revenue', { method: 'GET' }),

  getTemplatesStats: () => jsonRequest('/admin/stats/templates', { method: 'GET' }),

  getRecentTransactions: () => jsonRequest('/admin/transactions/recent', { method: 'GET' }),

  getDashboardOverview: (opts?: { year?: number; month?: number }) => {
    const t = new URLSearchParams();
    if (opts?.year != null) t.set('year', String(opts.year));
    if (opts?.month != null) t.set('month', String(opts.month));
    const q = t.toString();
    return jsonRequest(`/admin/stats/overview${q ? `?${q}` : ''}`, { method: 'GET' });
  },

  getCategories: () => jsonRequest('/admin/categories', { method: 'GET' }),

  createCategory: (body: Record<string, unknown>) =>
    jsonRequest('/admin/categories', { method: 'POST', body: JSON.stringify(body) }),

  updateCategory: (id: string | number, body: Record<string, unknown>) =>
    jsonRequest(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteCategory: (id: string | number) =>
    jsonRequest(`/admin/categories/${id}`, { method: 'DELETE' }),

  createTemplate: (formData: FormData) =>
    fetch(`${API_BASE}/admin/templates`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    }).then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || res.statusText);
      return data;
    }),

  getTemplates: (params?: { category?: string; status?: string; search?: string }) => {
    const t = new URLSearchParams();
    if (params?.category) t.append('category', params.category);
    if (params?.status) t.append('status', params.status);
    if (params?.search) t.append('search', params.search);
    const q = t.toString();
    return jsonRequest(`/admin/templates${q ? `?${q}` : ''}`, { method: 'GET' });
  },

  getTemplate: (id: string | number) => jsonRequest(`/admin/templates/${id}`, { method: 'GET' }),

  updateTemplate: (id: string | number, body: Record<string, unknown>) =>
    jsonRequest(`/admin/templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteTemplate: (id: string | number) =>
    jsonRequest(`/admin/templates/${id}`, { method: 'DELETE' }),

  createNotification: (body: Record<string, unknown>) =>
    jsonRequest('/admin/notifications', { method: 'POST', body: JSON.stringify(body) }),

  getNotifications: () => jsonRequest('/admin/notifications', { method: 'GET' }),

  getSuggestions: () => jsonRequest('/admin/suggestions', { method: 'GET' }),

  getAdminHomeCarouselSlides: () => jsonRequest('/admin/home-carousel-slides', { method: 'GET' }),

  createHomeCarouselSlide: (formData: FormData) =>
    fetch(`${API_BASE}/admin/home-carousel-slides`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    }).then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || res.statusText || `HTTP ${res.status}`);
      return data;
    }),

  updateHomeCarouselSlide: (id: string | number, body: Record<string, unknown>) =>
    jsonRequest(`/admin/home-carousel-slides/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteHomeCarouselSlide: (id: string | number) =>
    jsonRequest(`/admin/home-carousel-slides/${id}`, { method: 'DELETE' }),

  getPushTokenSummary: () => jsonRequest('/admin/push/tokens/summary', { method: 'GET' }),

  getPushTokens: (opts?: { userId?: string; active?: boolean; limit?: number }) => {
    const t = new URLSearchParams();
    if (opts?.userId) t.append('user_id', opts.userId);
    if (opts?.active !== undefined) t.append('active', String(opts.active));
    if (opts?.limit != null) t.append('limit', String(opts.limit));
    const q = t.toString();
    return jsonRequest(`/admin/push/tokens${q ? `?${q}` : ''}`, { method: 'GET' });
  },

  getPoliticalPartiesAdmin: () => jsonRequest('/admin/political-parties', { method: 'GET' }),

  uploadPoliticalPartyLogoAdmin: (partyId: string | number, formData: FormData) =>
    fetch(`${API_BASE}/admin/political-parties/${encodeURIComponent(String(partyId))}/logo`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    }).then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || res.statusText || `HTTP ${res.status}`);
      return data;
    }),

  getStates: () => jsonRequest('/locations/states', { method: 'GET' }),

  getDistricts: (stateId: string | number) =>
    jsonRequest(`/locations/districts?state_id=${encodeURIComponent(String(stateId))}`, { method: 'GET' }),

  getTehsils: (districtId: string | number) =>
    jsonRequest(`/locations/tehsils?district_id=${encodeURIComponent(String(districtId))}`, {
      method: 'GET',
    }),
};
