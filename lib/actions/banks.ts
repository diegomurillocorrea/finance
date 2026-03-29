"use server"

import { revalidatePath } from "next/cache"
import { bankCreateSchema, bankUpdateSchema } from "@/lib/validations/finance"
import { requireSupabaseUser, type ActionResult } from "@/lib/actions/auth-context"
import { zodFirstMessage } from "@/lib/validations/zod-message"

export async function createBank(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth

  const parsed = bankCreateSchema.safeParse({
    name: String(formData.get("name") ?? ""),
  })

  if (!parsed.success) {
    return { ok: false, message: zodFirstMessage(parsed.error) }
  }

  const { supabase } = auth.data
  const { data, error } = await supabase
    .from("banks")
    .insert({ name: parsed.data.name.trim() })
    .select("id")
    .single()

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath("/admin/bancos")
  return { ok: true, data: { id: data.id } }
}

export async function updateBank(formData: FormData): Promise<ActionResult> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth

  const parsed = bankUpdateSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    name: String(formData.get("name") ?? ""),
  })

  if (!parsed.success) {
    return { ok: false, message: "Datos inválidos" }
  }

  const { supabase } = auth.data
  const { error } = await supabase
    .from("banks")
    .update({ name: parsed.data.name.trim() })
    .eq("id", parsed.data.id)

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath("/admin/bancos")
  return { ok: true, data: undefined }
}

export async function deleteBank(id: string): Promise<ActionResult> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth

  const trimmed = id.trim()
  if (!trimmed) {
    return { ok: false, message: "Identificador inválido" }
  }

  const { supabase } = auth.data
  const { error } = await supabase.from("banks").delete().eq("id", trimmed)

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath("/admin/bancos")
  return { ok: true, data: undefined }
}
