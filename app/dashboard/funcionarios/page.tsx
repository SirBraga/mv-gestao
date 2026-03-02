import { prisma } from "@/app/utils/prisma"
import { auth } from "@/app/utils/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import FuncionariosClient from "./_components/FuncionariosClient"

export default async function FuncionariosPage() {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) redirect("/")

    const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    })
    const isAdmin = currentUser?.role === "ADMIN"

    return (
        <FuncionariosClient
            isAdmin={isAdmin}
            currentUserId={session.user.id}
        />
    )
}
