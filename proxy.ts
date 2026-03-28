import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/session-proxy"

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: ["/", "/login", "/admin/:path*"],
}
