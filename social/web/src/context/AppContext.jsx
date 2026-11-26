import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('lumen.theme') || 'dark');
  const [toast, setToast] = useState(null);
  const [unread, setUnread] = useState(0);
  const toastTimer = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('lumen.theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b0b12' : '#f7f7fb');
  }, [theme]);

  const refreshMe = useCallback(async () => {
    try {
      const data = await api.get('/auth/me');
      setUser(data.user);
      setCounts(data.counts || null);
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return undefined;
    }
    let alive = true;
    const load = () =>
      api
        .get('/notifications/count')
        .then((d) => alive && setUnread(d.unread))
        .catch(() => {});
    load();
    const timer = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [user]);

  const notifyToast = useCallback((message, tone = 'default') => {
    setToast({ message, tone, key: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* session may already be gone */
    }
    setUser(null);
    setCounts(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      counts,
      loading,
      refreshMe,
      setUser,
      setCounts,
      theme,
      setTheme,
      toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
      toast,
      notifyToast,
      unread,
      setUnread,
      logout,
    }),
    [user, counts, loading, refreshMe, theme, toast, notifyToast, unread, logout]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
