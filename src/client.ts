import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import { createClient, processLock } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const configured = Boolean(url && key);

// Each replacement publishes its index after every chunk has reached the keychain.
type Index = { generation: string; count: number };
async function indexFor(name: string): Promise<Index | null> {
  const value = await SecureStore.getItemAsync(name);
  return value ? JSON.parse(value) : null;
}
async function removeChunks(name: string, index: Index | null) {
  if (!index) return;
  await Promise.all(Array.from({ length: index.count }, (_, i) =>
    SecureStore.deleteItemAsync(name + '.' + index.generation + '.' + i)));
}
const secureStorage = {
  async getItem(name: string) {
    const index = await indexFor(name);
    if (!index) return null;
    const chunks = await Promise.all(Array.from({ length: index.count }, (_, i) =>
      SecureStore.getItemAsync(name + '.' + index.generation + '.' + i)));
    return chunks.includes(null) ? null : chunks.join('');
  },
  async setItem(name: string, value: string) {
    const oldIndex = await indexFor(name);
    const chunks = value.match(/[\s\S]{1,420}/gu) || [''];
    const index = { generation: Date.now().toString(36) + Math.random().toString(36).slice(2), count: chunks.length };
    try {
      await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(name + '.' + index.generation + '.' + i, chunk)));
      await SecureStore.setItemAsync(name, JSON.stringify(index));
    } catch (error) {
      await removeChunks(name, index);
      throw error;
    }
    await removeChunks(name, oldIndex);
  },
  async removeItem(name: string) {
    const index = await indexFor(name);
    await SecureStore.deleteItemAsync(name);
    await removeChunks(name, index);
  },
};
export const db = createClient(url || 'https://unconfigured.invalid', key || 'unconfigured', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: Platform.OS === 'web',
    lock: processLock, ...(Platform.OS === 'web' ? {} : { storage: secureStorage }) },
});
export function publicUrl(path: string) {
  const origin = process.env.EXPO_PUBLIC_WEB_URL || (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : '');
  if (!origin) throw new Error('Alamat web Ronda Pak belum dikonfigurasi.');
  return new URL(path, origin).href;
}
export function apiUrl(path: string) {
  return process.env.EXPO_PUBLIC_API_URL ? new URL(path, process.env.EXPO_PUBLIC_API_URL).href : publicUrl(path);
}
export function trackForeground() {
  if (Platform.OS === 'web') return;
  const update = (state: string) => {
    if (state === 'active') db.auth.startAutoRefresh();
    else db.auth.stopAutoRefresh();
  };
  update(AppState.currentState);
  const subscription = AppState.addEventListener('change', update);
  return () => { subscription.remove(); db.auth.stopAutoRefresh(); };
}
