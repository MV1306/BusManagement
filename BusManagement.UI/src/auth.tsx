import { createContext, useContext, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { setToken } from './api';

interface AuthState { token: string; role: string; username: string; }

interface AuthContextType {
  auth: AuthState | null;
  login: (data: AuthState) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadAuth(): AuthState | null {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const username = localStorage.getItem('username');
  return token && role && username ? { token, role, username } : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(loadAuth);

  function login(data: AuthState) {
    setToken(data.token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('username', data.username);
    setAuth(data);
  }

  function logout() {
    setToken(null);
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    setAuth(null);
  }

  return <AuthContext.Provider value={{ auth, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { auth } = useAuth();
  if (!auth) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(auth.role)) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
