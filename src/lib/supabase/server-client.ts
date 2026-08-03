/**
 * Server-only Supabase client, built with the SERVICE ROLE key.
 *
 * Use this for any storage write or listing that must be authorized by OUR
 * session rather than by Supabase's own auth. The customer session here is a
 * `jose` JWT cookie, not Supabase Auth, so storage RLS has no `auth.uid()` to
 * key on — an anon-key client is therefore governed only by whatever the
 * bucket policy allows for the anon role, which is not the same thing as
 * "the signed-in customer". Doing the check in a route handler while writing
 * with the anon key leaves the bucket reachable directly with a key that is
 * non-secret by design.
 *
 * NEVER import this from a client component — the service role key bypasses
 * RLS entirely.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient | null {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
