import { redirect } from "next/navigation"

export default function NuevoFondoPage() {
  redirect("/admin/fondos?nueva=1")
}
