"use client"

import { AblyChatProvider } from "@/app/providers/AblyChatProvider"
import { ChatStateProvider } from "@/components/chat/ChatStateProvider"
import Sidebar from "./sidebar"

interface DashboardShellClientProps {
    avatar: string
    name: string
    userId: string
    role: string
    children: React.ReactNode
}

export default function DashboardShellClient({
    avatar,
    name,
    userId,
    role,
    children,
}: DashboardShellClientProps) {
    return (
        <AblyChatProvider clientId={userId}>
            <ChatStateProvider>
                <div className="flex h-screen">
                    <Sidebar avatar={avatar} name={name} userId={userId} role={role} />
                    <main className="flex-1 bg-white h-full overflow-hidden">{children}</main>
                </div>
            </ChatStateProvider>
        </AblyChatProvider>
    )
}
