import { redirect } from "next/navigation"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PersonasEditarRedirectPage({ params }: PageProps) {
  const { id } = await params
  redirect(`/admin/personas?editar=${id}`)
}
