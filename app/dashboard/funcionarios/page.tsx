import { prisma } from "@/app/utils/prisma"
import { auth } from "@/app/utils/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { cacheTag } from "next/cache"
import FuncionariosClient from "./_components/FuncionariosClient"

async function getUsers() {
    "use cache"
    cacheTag("users")

    return prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            emailVerified: true,
            createdAt: true,
        },
    })
}

export default async function FuncionariosPage() {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) redirect("/")

    const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, id: true },
    })

    const users = await getUsers()
    const isAdmin = currentUser?.role === "ADMIN"

    return (
        <FuncionariosClient
            users={users}
            isAdmin={isAdmin}
            currentUserId={session.user.id}
        />
    )
}
