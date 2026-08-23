import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  serverUrl: string;
  setServerUrl: (url: string) => Promise<void>;
  setServerUrlState: (url: string) => void;
  login: (userData: UserProfile) => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [serverUrl, setServerUrlState] = useState('https://byahero.alwaysdata.net');

  const loadSession = async () => {
    try {
      const url = await getServerUrl();
      setServerUrlState(url);
      preWarmServer();

      const cachedEmail = localStorage.getItem('byahero_cached_email');
      const cachedRole = localStorage.getItem('byahero_cached_role') || 'passenger';
      const cachedName =
        localStorage.getItem('byahero_cached_name') || (cachedEmail ? cachedEmail.split('@')[0] : 'Guest');
      const cachedPhone = localStorage.getItem('byahero_cached_phone') || '';
      const cachedPic = localStorage.getItem('byahero_cached_profile_picture') || undefined;

      if (cachedEmail) {
        setUser({
          email: cachedEmail,
          name: cachedName,
          phone: cachedPhone,
          role: cachedRole,
          profile_picture: cachedPic,
        });

        // Restore session on server
        restoreSession(cachedEmail).catch(console.warn);
      }
    } catch (e) {
      console.error('Session load error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const login = (userData: UserProfile) => {
    setUser(userData);
    localStorage.setItem('byahero_cached_email', userData.email);
    localStorage.setItem('byahero_cached_name', userData.name);
    localStorage.setItem('byahero_cached_phone', userData.phone || '');
    localStorage.setItem('byahero_cached_role', userData.role || 'passenger');
    if (userData.profile_picture) {
      localStorage.setItem('byahero_cached_profile_picture', userData.profile_picture);
    }
  };

  const setServerUrl = async (url: string) => {
    await authServiceSetServerUrl(url);
    setServerUrlState(url);
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

  const logout = () => {
    clearCachedSession();
    setUser(null);
  };

  const refreshSession = async () => {
    await loadSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user?.email,
        isLoading,
        serverUrl,
        setServerUrl,
        setServerUrlState,
        login,
        updateUserProfile,
        logout,
        refreshSession,
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
