import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import { useToast } from './ToastContext';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const res = await authService.getMe();
          setUser(res.user);
        } catch (error) {
          localStorage.removeItem('accessToken');
        }
      }
      setLoading(false);
    };

    initAuth();

    // Handle token expiration event from api.js
    const handleAuthError = () => {
      setUser(null);
      showToast('Session expired. Please log in again.', 'error');
    };
    window.addEventListener('auth-error', handleAuthError);
    return () => window.removeEventListener('auth-error', handleAuthError);
  }, [showToast]);

  const login = async (credentials) => {
    const res = await authService.login(credentials);
    localStorage.setItem('accessToken', res.accessToken);
    setUser(res.user);
    return res;
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    localStorage.setItem('accessToken', res.accessToken);
    setUser(res.user);
    return res;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
