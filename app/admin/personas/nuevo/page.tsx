import { redirect } from "next/navigation"

export default function PersonasNuevoRedirectPage() {
  redirect("/admin/personas?nueva=1")
}
