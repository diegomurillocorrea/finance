"use server"

import { revalidatePath } from "next/cache"
import {
  personCreateSchema,
  personUpdateSchema,
} from "@/lib/validations/finance"
import { requireSupabaseUser, type ActionResult } from "@/lib/actions/auth-context"
import { zodFirstMessage } from "@/lib/validations/zod-message"

export async function createPerson(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth

  const parsed = personCreateSchema.safeParse({
    full_name: String(formData.get("full_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    document_type: String(formData.get("document_type") ?? ""),
    document_number: String(formData.get("document_number") ?? ""),
    is_member: formData.get("is_member") === "on" || formData.get("is_member") === "true",
    notes: String(formData.get("notes") ?? ""),
  })

  if (!parsed.success) {
    const issues = parsed.error.flatten().fieldErrors
    const first =
      issues.full_name?.[0] ??
      issues.email?.[0] ??
      issues.document_number?.[0] ??
      zodFirstMessage(parsed.error)
    return { ok: false, message: first }
  }

  const v = parsed.data
  const { supabase } = auth.data

  const { data, error } = await supabase
    .from("persons")
    .insert({
      full_name: v.full_name.trim(),
      email: v.email?.trim() || null,
      phone: v.phone?.trim() || null,
      document_type: v.document_type?.trim() || null,
      document_number: v.document_number?.trim() || null,
      is_member: v.is_member ?? true,
      notes: v.notes?.trim() || null,
      status: "active",
    })
    .select("id")
    .single()

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath("/admin")
  revalidatePath("/admin/personas")
  return { ok: true, data: { id: data.id } }
}

export async function updatePerson(
  formData: FormData
): Promise<ActionResult> {
  const auth = await requireSupabaseUser()
  if (!auth.ok) return auth

  const parsed = personUpdateSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    full_name: String(formData.get("full_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    document_type: String(formData.get("document_type") ?? ""),
    document_number: String(formData.get("document_number") ?? ""),
    is_member: formData.get("is_member") === "on" || formData.get("is_member") === "true",
    notes: String(formData.get("notes") ?? ""),
    status: formData.get("status") === "inactive" ? "inactive" : "active",
  })

  if (!parsed.success) {
    const issues = parsed.error.flatten().fieldErrors
    const first =
      issues.full_name?.[0] ??
      issues.email?.[0] ??
      issues.document_number?.[0] ??
      zodFirstMessage(parsed.error)
    return { ok: false, message: first }
  }

  const v = parsed.data
  const { supabase } = auth.data

  const { error } = await supabase
    .from("persons")
    .update({
      full_name: v.full_name.trim(),
      email: v.email?.trim() || null,
      phone: v.phone?.trim() || null,
      document_type: v.document_type?.trim() || null,
      document_number: v.document_number?.trim() || null,
      is_member: v.is_member ?? true,
      notes: v.notes?.trim() || null,
      status: v.status,
    })
    .eq("id", v.id)

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath("/admin/personas")
  revalidatePath("/admin")
  return { ok: true, data: undefined }
}
