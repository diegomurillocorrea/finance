import { redirect } from "next/navigation"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditarFondoPage({ params }: PageProps) {
  const { id } = await params
  redirect(`/admin/fondos?editar=${encodeURIComponent(id)}`)
}
