import { redirect } from "next/navigation"
import { auth } from "../utils/auth"
import DashboardShellClient from "./_components/dashboard-shell-client"
import { headers } from "next/headers"
import { prisma } from "../utils/prisma"
import { sanitizePermissions, type Role } from "../utils/permissions"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {

    const session = await auth.api.getSession({
        headers: await headers(),
    })

    if (!session) {
        redirect("/")
    }

    const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            role: true,
            permissions: true,
        },
    })

    const role = (currentUser?.role || (session.session as unknown as Record<string, string>).role || "USER") as Role
    const permissions = sanitizePermissions(currentUser?.permissions, role)

    return (
        <DashboardShellClient
            avatar={session?.user.image || ""}
            name={session?.user.name || ""}
            userId={session.user.id}
            role={role}
            permissions={permissions}
        >
            {children}
        </DashboardShellClient>
    )
}