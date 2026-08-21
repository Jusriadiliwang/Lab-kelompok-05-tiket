import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './client';
import type { AuthToken } from '../types';

// POST /auth/register → api-gateway (buat user baru)
export async function registerUser(userId: string, name: string, email?: string): Promise<AuthToken & { name: string }> {
  const res = await apiClient.post<any>('/auth/register', { userId, name, email });
  const data = res.data;
  await AsyncStorage.setItem('auth_token', data.token);
  await AsyncStorage.setItem('auth_user', JSON.stringify({ userId: data.userId, name: data.name, role: data.role }));
  return data;
}

// POST /auth/login → api-gateway (login dengan userId yang sudah ada)
export async function loginWithUserId(userId: string): Promise<AuthToken & { name?: string }> {
  const res = await apiClient.post<any>('/auth/login', { userId });
  const data = res.data;
  await AsyncStorage.setItem('auth_token', data.token);
  await AsyncStorage.setItem('auth_user', JSON.stringify({ userId: data.userId, name: data.name ?? data.userId, role: data.role }));
  return data;
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem('auth_token');
  await AsyncStorage.removeItem('auth_user');
}

export async function getStoredUser(): Promise<{ userId: string; name: string; role: string } | null> {
  const raw = await AsyncStorage.getItem('auth_user');
  return raw ? JSON.parse(raw) : null;
}
