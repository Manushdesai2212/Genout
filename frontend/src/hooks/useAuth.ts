import { useState, useEffect } from 'react';
import api from '../api/axios';

type User = { id: number; name: string; email: string };

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  const fetchMe = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setUser(null);
      return;
    }

    fetchMe();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    await fetchMe();
  };

  const logout = async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const signup = async (name: string, email: string, password: string) => {
    await api.post('/auth/signup', { name, email, password });
  };

  return { user, login, logout, signup };
};