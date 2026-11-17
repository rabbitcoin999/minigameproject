import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

/**
 * Get the server-side Supabase client.
 *
 * Uses the SECRET (service-role) key, which bypasses Row Level Security.
 * This client is only ever imported inside API routes — never from a
 * client component — so the secret key never reaches the browser.
 * All tables have RLS enabled with no public policies, so the
 * publishable key alone cannot read or write player data directly.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in your .env file. Get both from Supabase Dashboard → Project Settings → API Keys. See .env.example for details.'
    )
  }

  supabaseInstance = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return supabaseInstance
}
