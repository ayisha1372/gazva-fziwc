import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — Gazva` : 'Gazva — Students Union';
  }, [title]);
}

/** GET with caching. `key` is an array; `path`/`params` form the request. */
export function useApi(path, params, options = {}) {
  return useQuery({ queryKey: [path, params ?? null], queryFn: ({ signal }) => api.get(path, params, signal), ...options });
}

export const useSettings = () => useApi('/settings', null, { staleTime: 5 * 60_000 });
