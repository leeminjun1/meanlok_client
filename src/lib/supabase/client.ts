import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://example.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'public-anon-key';

function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY,
  };
}

export function createClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}

let browserClient: SupabaseClient | undefined;

export function getSupabaseClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient();
  }

  return browserClient;
}

export const supabase = getSupabaseClient();
