import { getAdminSupabaseOrRedirect } from "@/lib/supabase/require-admin-session"
import type { BankRow, PersonRow } from "@/lib/database.types"
import { PersonasPanel } from "@/components/admin/personas/personas-panel"

interface PageProps {
  searchParams: Promise<{ nueva?: string; editar?: string }>
}

export default async function PersonasPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const { supabase } = await getAdminSupabaseOrRedirect()

  const [{ data: persons, error }, { data: banksData }] = await Promise.all([
    supabase.from("persons").select("*").order("full_name"),
    supabase.from("banks").select("id, name").order("name"),
  ])

  const rows = (persons ?? []) as PersonRow[]
  const banks = (banksData ?? []) as Pick<BankRow, "id" | "name">[]

  return (
    <PersonasPanel
      persons={rows}
      banks={banks}
      errorMessage={error?.message ?? null}
      initialOpenCreate={sp.nueva === "1"}
      initialEditId={typeof sp.editar === "string" ? sp.editar : null}
    />
  )
}
