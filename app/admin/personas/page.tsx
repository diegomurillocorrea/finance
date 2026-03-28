import { getAdminSupabaseOrRedirect } from "@/lib/supabase/require-admin-session"
import type { PersonRow } from "@/lib/database.types"
import { PersonasPanel } from "@/components/admin/personas/personas-panel"

interface PageProps {
  searchParams: Promise<{ nueva?: string; editar?: string }>
}

export default async function PersonasPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const { supabase } = await getAdminSupabaseOrRedirect()

  const { data: persons, error } = await supabase
    .from("persons")
    .select("*")
    .order("full_name")

  const rows = (persons ?? []) as PersonRow[]

  return (
    <PersonasPanel
      persons={rows}
      errorMessage={error?.message ?? null}
      initialOpenCreate={sp.nueva === "1"}
      initialEditId={typeof sp.editar === "string" ? sp.editar : null}
    />
  )
}
