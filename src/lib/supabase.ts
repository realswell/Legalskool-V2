import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || 'https://nbrcnqpibtbsljoevrhy.supabase.co';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_GqQq73pt9bm7kOCbLiDkxQ_dQp8DQCr';

let client: SupabaseClient | null = null;

export function getSupabase() {
  if (!client) {
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
  }
  return client;
}

export function isInAppBrowser() {
  return /FBAN|FBAV|Instagram|FB_IAB|FBIOS/i.test(navigator.userAgent || '');
}
