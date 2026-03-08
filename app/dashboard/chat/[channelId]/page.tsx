"use client"

import { use } from "react"
import { ChatApp } from "@/components/chat/ChatApp"

interface PageProps {
    params: Promise<{ channelId: string }>
}

export default function ChatChannelPage({ params }: PageProps) {
    const { channelId } = use(params)
    
    return (
        <div className="h-full">
            <ChatApp initialChannelId={channelId} />
        </div>
    )
}
