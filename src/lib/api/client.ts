import axios from 'axios';
import { supabase } from '@/lib/supabase/client';

const baseURL =
  process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL,
});

let cachedAccessToken: string | null = null;
let isTokenHydrated = false;

supabase.auth.onAuthStateChange((_event, session) => {
  cachedAccessToken = session?.access_token ?? null;
  isTokenHydrated = true;
});

async function getAccessToken() {
  if (isTokenHydrated) {
    return cachedAccessToken;
  }

  const { data } = await supabase.auth.getSession();
  cachedAccessToken = data.session?.access_token ?? null;
  isTokenHydrated = true;
  return cachedAccessToken;
}

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      cachedAccessToken = null;
      isTokenHydrated = true;
      await supabase.auth.signOut();

      if (typeof window !== 'undefined') {
        const path = window.location.pathname + window.location.search;
        const next = encodeURIComponent(path);
        window.location.href = `/login?next=${next}`;
      }
    }

    return Promise.reject(error);
  },
);
