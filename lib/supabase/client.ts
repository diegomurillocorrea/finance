"use client"

import { createBrowserClient } from "@supabase/ssr"
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/env"

export function createSupabaseBrowserClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublicKey())
}
