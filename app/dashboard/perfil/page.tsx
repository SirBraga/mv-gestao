import { getProfile } from "@/app/actions/profile"
import PerfilPageClient from "./PerfilPageClient"

export default async function PerfilPage() {
  const profile = await getProfile()

  if (!profile) {
    throw new Error("Perfil não encontrado")
  }

  return <PerfilPageClient initialProfile={profile} />
}
