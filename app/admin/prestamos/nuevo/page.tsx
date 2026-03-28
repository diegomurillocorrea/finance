import { redirect } from "next/navigation"

export default function NuevoPrestamoPage() {
  redirect("/admin/prestamos?nueva=1")
}
