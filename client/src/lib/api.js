const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

function qs(params) {
  if (!params) return '';
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') u.set(k, v);
  });
  const s = u.toString();
  return s ? `?${s}` : '';
}

async function request(method, path, { params, body, signal } = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let res;
  try {
    res = await fetch(`${BASE}${path}${qs(params)}`, {
      method,
      credentials: 'include',
      signal,
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/login') && onUnauthorized) onUnauthorized();
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.details);
  }
  return data;
}

export const api = {
  get: (p, params, signal) => request('GET', p, { params, signal }),
  post: (p, body) => request('POST', p, { body }),
  put: (p, body) => request('PUT', p, { body }),
  patch: (p, body) => request('PATCH', p, { body }),
  del: (p) => request('DELETE', p),
};

/** Uploaded images are served by the API host. */
export const assetUrl = (u) => (u && u.startsWith('/uploads/') ? (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + u : u || '');

/** Admin CRUD helpers: adminApi('events').list() ... */
export const adminApi = (resource) => ({
  list: (params) => api.get(`/admin/${resource}`, params),
  get: (id) => api.get(`/admin/${resource}/${id}`),
  create: (body) => api.post(`/admin/${resource}`, body),
  update: (id, body) => api.put(`/admin/${resource}/${id}`, body),
  remove: (id) => api.del(`/admin/${resource}/${id}`),
  points: (id, body) => api.post(`/admin/${resource}/${id}/points`, body),
});
