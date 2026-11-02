import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, setUnauthorizedHandler } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    api.get('/auth/me').then((r) => setUser(r.user)).catch(() => setUser(null)).finally(() => setReady(true));
  }, []);

  // If the server ever says "401" for a signed-in user (expired / revoked session), drop local state.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (username, password) => {
    const r = await api.post('/auth/login', { username, password });
    setUser(r.user);
    qc.invalidateQueries();
    return r.user;
  }, [qc]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } finally {
      setUser(null);
      qc.clear(); // nothing protected stays cached after sign-out
    }
  }, [qc]);

  // admin + general viewer open every protected ranking; a wing/club/class-union login opens only its own.
  const canViewRanking = useCallback((type) => !!user && (user.role === 'admin' || user.role === 'viewer' || (user.role === 'member' && user.scope?.type === type)), [user]);
  const value = useMemo(() => ({ user, ready, login, logout, canViewRanking, isAdmin: user?.role === 'admin', isSignedIn: !!user }), [user, ready, login, logout, canViewRanking]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
