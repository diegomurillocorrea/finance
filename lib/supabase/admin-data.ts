import { createClient } from "@supabase/supabase-js"
import { getSupabaseUrl } from "@/lib/supabase/env"
import { createSupabaseServerClient } from "@/lib/supabase/server"

/**
 * Cliente para consultas del panel admin.
 * Si existe SUPABASE_SERVICE_ROLE_KEY, ignora RLS (solo usar en servidor).
 * Si no, usa la sesión del usuario (requiere políticas RLS para `authenticated`).
 */
export async function createSupabaseAdminDataClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (serviceKey) {
    return createClient(getSupabaseUrl(), serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return createSupabaseServerClient()
}
