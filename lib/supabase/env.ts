function requiredEnv(label: string, value: string | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    throw new Error(`Falta variable de entorno: ${label}`)
  }
  return trimmed
}

export function getSupabaseUrl(): string {
  return requiredEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL)
}

/** Clave pública: anon clásica o publishable nueva del dashboard */
export function getSupabasePublicKey(): string {
  const fromAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  const fromPublishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim()
  const key = fromAnon || fromPublishable
  return requiredEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
    key
  )
}
