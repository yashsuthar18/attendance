'use client';
import { createClient } from '@supabase/supabase-js';
let browser;
export function browserSupabase() {
  if (!browser) browser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return browser;
}

// organizerFetch — now uses cookie session (no Bearer token needed)
export async function organizerFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin', // send session cookie automatically
    cache: 'no-store',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}
