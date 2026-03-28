"use server"

import type { SupabaseClient } from "@supabase/supabase-js"
import { createSupabaseAdminDataClient } from "@/lib/supabase/admin-data"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; message: string }

export async function requireSupabaseUser(): Promise<
  ActionResult<{ supabase: SupabaseClient }>
> {
  const sessionClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()
  if (!user) {
    return { ok: false, message: "Inicia sesión para continuar" }
  }
  const supabase = await createSupabaseAdminDataClient()
  return { ok: true, data: { supabase } }
}
