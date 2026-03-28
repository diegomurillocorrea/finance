import { redirect } from "next/navigation"

/** `/` is handled by middleware; this satisfies the route and acts as fallback */
export default function Home() {
  redirect("/login")
}
