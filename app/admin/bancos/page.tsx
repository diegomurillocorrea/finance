import { getAdminSupabaseOrRedirect } from "@/lib/supabase/require-admin-session"
import type { BankRow } from "@/lib/database.types"
import { BancosPanel } from "@/components/admin/bancos/bancos-panel"

interface PageProps {
  searchParams: Promise<{ nueva?: string; editar?: string }>
}

export default async function BancosPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const { supabase } = await getAdminSupabaseOrRedirect()

  const { data: banks, error } = await supabase
    .from("banks")
    .select("id, name, created_at")
    .order("name")

  const rows = (banks ?? []) as BankRow[]

  return (
    <BancosPanel
      banks={rows}
      errorMessage={error?.message ?? null}
      initialOpenCreate={sp.nueva === "1"}
      initialEditId={typeof sp.editar === "string" ? sp.editar : null}
    />
  )
}
