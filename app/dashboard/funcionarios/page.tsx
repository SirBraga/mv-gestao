import { prisma } from "@/app/utils/prisma"
import { auth } from "@/app/utils/auth"
import { hasPermission, sanitizePermissions, type Role } from "@/app/utils/permissions"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import FuncionariosManagerClient from "./_components/FuncionariosManagerClient"

export default async function FuncionariosPage() {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) redirect("/")

    const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, permissions: true },
    })
    if (!currentUser) redirect("/dashboard")

    const role = currentUser.role as Role
    const permissions = sanitizePermissions(currentUser.permissions, role)

    if (role !== "ADMIN" && !hasPermission(permissions, role, "funcionarios")) {
        redirect("/dashboard")
    }

    return (
        <FuncionariosManagerClient
            isAdmin={role === "ADMIN"}
            currentUserId={session.user.id}
            currentUserRole={role}
        />
    )
}
