"use server"

import { revalidatePath } from "next/cache"
import {
  poolCreateSchema,
  poolUpdateSchema,
} from "@/lib/validations/finance"
import { requireSupabaseUser, type ActionResult } from "@/lib/actions/auth-context"
import { zodFirstMessage } from "@/lib/validations/zod-message"

export async function createLiquidityPool(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth

  const parsed = poolCreateSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    currency: (String(formData.get("currency") ?? "MXN") || "MXN").toUpperCase(),
    is_default: formData.get("is_default") === "on" || formData.get("is_default") === "true",
  })

  if (!parsed.success) {
    return { ok: false, message: zodFirstMessage(parsed.error) }
  }

  const { supabase } = auth.data
  const v = parsed.data

  if (v.is_default) {
    await supabase.from("liquidity_pools").update({ is_default: false }).eq("is_default", true)
  }

  const { data, error } = await supabase
    .from("liquidity_pools")
    .insert({
      name: v.name.trim(),
      currency: v.currency,
      is_default: !!v.is_default,
    })
    .select("id")
    .single()

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath("/admin")
  revalidatePath("/admin/fondos")
  return { ok: true, data: { id: data.id } }
}

export async function updateLiquidityPool(
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth

  const parsed = poolUpdateSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
    currency: (String(formData.get("currency") ?? "MXN") || "MXN").toUpperCase(),
    is_default: formData.get("is_default") === "on" || formData.get("is_default") === "true",
  })

  if (!parsed.success) {
    return { ok: false, message: "Datos inválidos" }
  }

  const { supabase } = auth.data
  const v = parsed.data

  if (v.is_default) {
    await supabase.from("liquidity_pools").update({ is_default: false }).eq("is_default", true)
  }

  const { error } = await supabase
    .from("liquidity_pools")
    .update({
      name: v.name.trim(),
      currency: v.currency,
      is_default: !!v.is_default,
    })
    .eq("id", v.id)

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath("/admin/fondos")
  revalidatePath("/admin")
  return { ok: true, data: undefined }
}
