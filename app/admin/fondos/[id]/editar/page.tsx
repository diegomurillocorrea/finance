import Link from "next/link"
import { notFound } from "next/navigation"
import { getAdminSupabaseOrRedirect } from "@/lib/supabase/require-admin-session"
import type { LiquidityPoolRow } from "@/lib/database.types"
import { cardClass } from "@/lib/form-classes"
import { PoolEditForm } from "./pool-edit-form"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditarFondoPage({ params }: PageProps) {
  const { id } = await params
  const { supabase } = await getAdminSupabaseOrRedirect()

  const { data: pool, error } = await supabase
    .from("liquidity_pools")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !pool) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/fondos"
          className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
        >
          ← Fondos
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Editar fondo
        </h1>
      </div>
      <section className={cardClass}>
        <PoolEditForm pool={pool as LiquidityPoolRow} />
      </section>
    </div>
  )
}
