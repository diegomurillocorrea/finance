import { redirect } from "next/navigation"

export default function NuevaCuentaPage() {
  redirect("/admin/cuentas-ahorro?nueva=1")
}
