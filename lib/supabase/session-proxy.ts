import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/env"

/**
 * Refresca la sesión de Supabase y aplica redirecciones de rutas protegidas.
 * Al redirigir, copia las cookies de sesión para no cerrar la sesión por error.
 * (Lógica compartida con el archivo raíz proxy.ts de Next.js.)
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublicKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const redirectWithSession = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone()
    url.pathname = user ? "/admin" : "/login"
    return redirectWithSession(url)
  }

  if (pathname.startsWith("/admin") && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return redirectWithSession(url)
  }

  if (pathname === "/login" && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/admin"
    return redirectWithSession(url)
  }

  return supabaseResponse
}
