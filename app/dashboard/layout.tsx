import { redirect } from "next/navigation"
import { auth } from "../utils/auth"
import DashboardShellClient from "./_components/dashboard-shell-client"
import { headers } from "next/headers"

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

    return (
        <DashboardShellClient
            avatar={session?.user.image || ""}
            name={session?.user.name || ""}
            userId={session.user.id}
            role={(session.session as unknown as Record<string, string>).role || "USER"}
        >
            {children}
        </DashboardShellClient>
    )
}