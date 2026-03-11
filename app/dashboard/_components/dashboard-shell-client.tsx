"use client"

import { AblyChatProvider } from "@/app/providers/AblyChatProvider"
import type { UserPermissions } from "@/app/utils/permissions"
import { ChatStateProvider } from "@/components/chat/ChatStateProvider"
import Sidebar from "./sidebar"

interface DashboardShellClientProps {
    avatar: string
    name: string
    userId: string
    role: string
    permissions: UserPermissions
    children: React.ReactNode
}

export default function DashboardShellClient({
    avatar,
    name,
    userId,
    role,
    permissions,
    children,
}: DashboardShellClientProps) {
    return (
        <AblyChatProvider clientId={userId}>
            <ChatStateProvider>
                <div className="flex h-screen">
                    <Sidebar avatar={avatar} name={name} role={role} permissions={permissions} />
                    <main className="flex-1 bg-white h-full overflow-hidden">{children}</main>
                </div>
            </ChatStateProvider>
        </AblyChatProvider>
    )
}
