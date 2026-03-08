"use client"

import { Message } from "@ably/chat"

interface GlobalMessageListenerProps {
    currentUserId: string
    channels: Array<{ id: string }>
    onNewMessage: (channelId: string, message: Message, senderId: string) => void
}

export function GlobalMessageListener(_: GlobalMessageListenerProps) {
    return null
}
