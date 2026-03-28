import Link from "next/link"
import { getAdminSupabaseOrRedirect } from "@/lib/supabase/require-admin-session"
import { cardClass } from "@/lib/form-classes"
import { NewAccountForm } from "./new-account-form"

export default async function NuevaCuentaPage() {
  const { supabase } = await getAdminSupabaseOrRedirect()

  const [{ data: persons }, { data: pools }] = await Promise.all([
    supabase.from("persons").select("id, full_name").eq("status", "active").order("full_name"),
    supabase.from("liquidity_pools").select("id, name").order("name"),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/cuentas-ahorro"
          className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
        >
          ← Cuentas de ahorro
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Nueva cuenta de ahorro
        </h1>
      </div>
      <section className={cardClass}>
        <NewAccountForm
          persons={persons ?? []}
          pools={pools ?? []}
        />
      </section>
    </div>
  )
}
