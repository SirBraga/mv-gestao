import { redirect } from "next/navigation"
import { auth } from "../utils/auth"
import Sidebar from "./_components/sidebar"
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
        <div className="flex h-screen">
            <Sidebar avatar={session?.user.image || ""} name={session?.user.name || ""} />
            <main className="flex-1 bg-white h-full overflow-hidden">{children}</main>
        </div>
    )
}