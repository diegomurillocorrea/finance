import Link from "next/link"
import { getAdminSupabaseOrRedirect } from "@/lib/supabase/require-admin-session"
import { cardClass } from "@/lib/form-classes"
import { NewLoanForm } from "./new-loan-form"

export default async function NuevoPrestamoPage() {
  const { supabase } = await getAdminSupabaseOrRedirect()

  const [{ data: persons }, { data: pools }] = await Promise.all([
    supabase.from("persons").select("id, full_name").eq("status", "active").order("full_name"),
    supabase.from("liquidity_pools").select("id, name").order("name"),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/prestamos"
          className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
        >
          ← Préstamos
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Nuevo préstamo
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Se guarda como borrador hasta que desembolses desde el detalle.
        </p>
      </div>
      <section className={cardClass}>
        <NewLoanForm persons={persons ?? []} pools={pools ?? []} />
      </section>
    </div>
  )
}
