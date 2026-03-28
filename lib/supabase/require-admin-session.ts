import { redirect } from "next/navigation"
import { createSupabaseAdminDataClient } from "@/lib/supabase/admin-data"
import { createSupabaseServerClient } from "@/lib/supabase/server"

/**
 * Exige sesión Supabase (JWT en cookies) y devuelve cliente de datos para el panel.
 */
export async function getAdminSupabaseOrRedirect() {
  const sessionClient = await createSupabaseServerClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()
  if (!user) {
    redirect("/login")
  }
  const supabase = await createSupabaseAdminDataClient()
  return { user, supabase }
}
