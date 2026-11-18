import React, { createContext, useCallback, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
  getServerUrl,
  preWarmServer,
  restoreSession,
  clearCachedSession,
  setServerUrl as authServiceSetServerUrl,
} from '../services/authService';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  role: string;
  profile_picture?: string;
}

export interface ConfirmedSession {
  email: string;
  serverUrl: string;
  signal: AbortSignal;
  fetch: (path: string, options?: RequestInit) => Promise<Response>;
}

interface AuthContextType {
  user: UserProfile | null;
  session: ConfirmedSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  serverUrl: string;
  setServerUrl: (url: string) => Promise<void>;
  login: (userData: UserProfile) => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [serverUrl, setServerUrlState] = useState(window.location.origin);
  const [session, setSession] = useState<ConfirmedSession | null>(null);
  const sessionController = useRef<AbortController | null>(null);

  const logout = useCallback(() => {
    sessionController.current?.abort();
    sessionController.current = null;
    setSession(null);
    clearCachedSession();
    setUser(null);
    setIsLoading(false);
  }, []);

  const loadSession = useCallback(async () => {
    sessionController.current?.abort();
    const controller = new AbortController();
    const { signal } = controller;
    sessionController.current = controller;
    setSession(null);
    let confirmed = false;

    try {
      const url = await getServerUrl();
      if (signal.aborted) return;
      setServerUrlState(url);

      const cachedEmail = localStorage.getItem('byahero_cached_email');
      if (!cachedEmail) {
        setUser(null);
        void preWarmServer();
        return;
      }
      const cachedRole = localStorage.getItem('byahero_cached_role') || 'passenger';
      const cachedName =
        localStorage.getItem('byahero_cached_name') || cachedEmail.split('@')[0];
      const cachedPhone = localStorage.getItem('byahero_cached_phone') || '';
      const cachedPic = localStorage.getItem('byahero_cached_profile_picture') || undefined;

      setUser({ email: cachedEmail, name: cachedName, phone: cachedPhone, role: cachedRole, profile_picture: cachedPic });
      if (!navigator.onLine) return;

      const timeout = window.setTimeout(() => controller.abort(), 12000);
      const restored = await restoreSession(cachedEmail, signal).finally(() => window.clearTimeout(timeout));
      if (signal.aborted) return;
      if (restored.statusCode === 401 || (restored.success && restored.user?.email?.toLowerCase() !== cachedEmail.toLowerCase())) {
        logout();
        return;
      }
      if (!restored.success) return;

      confirmed = true;
      setSession({
        email: cachedEmail,
        serverUrl: url,
        signal,
        async fetch(path, options) {
          signal.throwIfAborted();
          const response = await fetch(`${url}/api/${path}`, {
            ...options,
            credentials: 'include',
            signal,
          });
          signal.throwIfAborted();
          if (response.status === 401) {
            logout();
            signal.throwIfAborted();
          }
          return response;
        },
      });
    } catch (e) {
      console.error('Session load error:', e);
    } finally {
      if (sessionController.current === controller) {
        if (!confirmed) sessionController.current = null;
        setIsLoading(false);
      }
    }
  }, [logout]);

  useEffect(() => {
    void loadSession();
    const checkSession = () => {
      if (!sessionController.current && navigator.onLine && localStorage.getItem('byahero_cached_email')) {
        void loadSession();
      }
    };
    window.addEventListener('online', checkSession);
    window.addEventListener('focus', checkSession);
    return () => {
      window.removeEventListener('online', checkSession);
      window.removeEventListener('focus', checkSession);
      sessionController.current?.abort();
    };
  }, [loadSession]);

  const login = (userData: UserProfile) => {
    setUser(userData);
    localStorage.setItem('byahero_cached_email', userData.email);
    localStorage.setItem('byahero_cached_name', userData.name);
    localStorage.setItem('byahero_cached_phone', userData.phone || '');
    localStorage.setItem('byahero_cached_role', userData.role || 'passenger');
    if (userData.profile_picture) {
      localStorage.setItem('byahero_cached_profile_picture', userData.profile_picture);
    }
    void loadSession();
  };

  const setServerUrl = async (url: string) => {
    await authServiceSetServerUrl(url);
    const configuredUrl = await getServerUrl();
    if (configuredUrl !== serverUrl) {
      logout();
      setServerUrlState(configuredUrl);
    }
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      if (updates.name) localStorage.setItem('byahero_cached_name', updates.name);
      if (updates.phone) {
        localStorage.setItem('byahero_cached_phone', updates.phone);
        localStorage.setItem('byahero_cached_contacts', updates.phone);
      }
      if (updates.profile_picture) {
        localStorage.setItem('byahero_cached_profile_picture', updates.profile_picture);
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!user?.email,
        isLoading,
        serverUrl,
        setServerUrl,
        login,
        updateUserProfile,
        logout,
        refreshSession: loadSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
