import React, { createContext, useContext, useEffect, useState } from 'react';
import { loginWithUserId, registerUser, logout, getStoredUser } from '../api/auth';

interface AuthUser {
  userId: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (userId: string) => Promise<void>;
  register: (userId: string, name: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoredUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const handleLogin = async (userId: string) => {
    const data = await loginWithUserId(userId);
    setUser({ userId: data.userId, name: (data as any).name ?? data.userId, role: data.role });
  };

  const handleRegister = async (userId: string, name: string, email?: string) => {
    const data = await registerUser(userId, name, email);
    setUser({ userId: data.userId, name: data.name, role: data.role });
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
