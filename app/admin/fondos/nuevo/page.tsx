import Link from "next/link"
import { cardClass } from "@/lib/form-classes"
import { PoolCreateForm } from "./pool-form"

export default function NuevoFondoPage() {
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
          Nuevo fondo
        </h1>
      </div>
      <section className={cardClass}>
        <PoolCreateForm />
      </section>
    </div>
  )
}
