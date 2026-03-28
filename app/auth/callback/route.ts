import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/env"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const nextRaw = searchParams.get("next") ?? "/admin"
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/admin"

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Enlace de acceso inválido o caducado")}`
    )
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublicKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // ignorar si el contexto no permite cookies
        }
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    )
  }

  return NextResponse.redirect(`${origin}${next}`)
}
