import {
  AdminMeta,
  ApplicationFilters,
  ApplicationsResponse,
  AuthUser,
  CandidateApplication,
} from './types';

const API_BASE = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_BASE || '';
export const TOKEN_STORAGE_KEY = 'kinozritel_admin_token';

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const buildUrl = (path: string, query?: URLSearchParams) => {
  const base = `${API_BASE}${path}`;
  if (!query || [...query.keys()].length === 0) {
    return base;
  }
  return `${base}?${query.toString()}`;
};

const readErrorMessage = async (response: Response) => {
  try {
    const json = await response.json();
    if (json?.error && typeof json.error === 'string') {
      return json.error;
    }
    return `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

const request = async <T>(path: string, options: RequestInit = {}, token?: string): Promise<T> => {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const isAbsolute = /^https?:\/\//i.test(path);
  const response = await fetch(isAbsolute ? path : buildUrl(path), {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
};

const filtersToQuery = (filters: ApplicationFilters) => {
  const query = new URLSearchParams();
  if (filters.status.length > 0) {
    query.set('status', filters.status.join(','));
  }
  if (filters.city.trim()) {
    query.set('city', filters.city.trim());
  }
  if (filters.date_from) {
    query.set('date_from', filters.date_from);
  }
  if (filters.date_to) {
    query.set('date_to', filters.date_to);
  }
  if (filters.source.trim()) {
    query.set('source', filters.source.trim());
  }
  if (filters.q.trim()) {
    query.set('q', filters.q.trim());
  }
  return query;
};

export const login = async (username: string, password: string) => {
  return request<{ token: string; user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
};

export const getCurrentUser = async (token: string) => {
  return request<{ user: AuthUser }>('/api/auth/me', {}, token);
};

export const getMeta = async (token: string) => {
  return request<AdminMeta>('/api/admin/meta', {}, token);
};

export const getApplications = async (token: string, filters: ApplicationFilters) => {
  const query = filtersToQuery(filters);
  const path = `/api/admin/applications${query.toString() ? `?${query.toString()}` : ''}`;
  return request<ApplicationsResponse>(path, {}, token);
};

export const getApplication = async (token: string, id: string) => {
  return request<CandidateApplication>(`/api/admin/applications/${id}`, {}, token);
};

export const patchApplication = async (
  token: string,
  id: string,
  patch: Record<string, unknown>,
) => {
  return request<{ item: CandidateApplication; excel: { synced: boolean; reason?: string } }>(
    `/api/admin/applications/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
    token,
  );
};

export const markContactAttempt = async (token: string, id: string, action: 'called' | 'messaged') => {
  return request<{ item: CandidateApplication; excel: { synced: boolean; reason?: string } }>(
    `/api/admin/applications/${id}/contact`,
    {
      method: 'POST',
      body: JSON.stringify({ action }),
    },
    token,
  );
};

export const downloadExportCsv = async (token: string, filters: ApplicationFilters) => {
  const query = filtersToQuery(filters);
  const response = await fetch(buildUrl('/api/admin/export.csv', query), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const filenameMatch = disposition.match(/filename="(.+?)"/i);
  return {
    blob,
    filename: filenameMatch?.[1] || `applications-${new Date().toISOString().slice(0, 10)}.csv`,
  };
};

export { ApiError };
