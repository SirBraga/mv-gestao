"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ChatMessageEvent, ChatMessageEventType } from "@ably/chat"
import { getUserChannels, markChannelAsRead } from "@/app/actions/chat"
import { useAblyChat } from "@/app/providers/AblyChatProvider"

interface SidebarMessage {
    text: string
    clientId: string | null
    timestamp: Date
}

interface Channel {
    id: string
    name: string
    type: string
    members: Array<{
        id: string
        userId: string
        user: {
            id: string
            name: string
            image: string | null
            onlineStatus?: { isOnline: boolean; lastSeen: Date } | null
        }
    }>
    messages: Array<{
        content: string
        type: string
        createdAt: Date
        senderId: string
    }>
    unreadCount: number
    updatedAt: Date
}

interface ChatStateContextValue {
    channels: Channel[]
    currentUserId: string
    channelsLoading: boolean
    lastMessages: Map<string, SidebarMessage>
    unreadCounts: Map<string, number>
    totalUnreadCount: number
    setActiveChannelId: (channelId: string | null) => void
    markChannelRead: (channelId: string) => Promise<void>
}

const ChatStateContext = createContext<ChatStateContextValue | null>(null)

export function useChatState() {
    const context = useContext(ChatStateContext)
    if (!context) {
        throw new Error("useChatState deve ser usado dentro de ChatStateProvider")
    }
    return context
}

export function ChatStateProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient()
    const { getRoom, isConnected } = useAblyChat()
    const [lastMessages, setLastMessages] = useState<Map<string, SidebarMessage>>(new Map())
    const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map())
    const activeChannelIdRef = useRef<string | null>(null)
    const processedMessageKeysRef = useRef<Set<string>>(new Set())
    const unreadStorageKeyRef = useRef<string | null>(null)

    const { data: channelsData, isLoading: channelsLoading } = useQuery({
        queryKey: ["chat-channels"],
        queryFn: getUserChannels,
        staleTime: 30000,
    })

    const currentUserId = channelsData?.currentUserId || ""
    const channels = channelsData?.channels || []

    useEffect(() => {
        if (channels.length === 0) return

        setLastMessages(prev => {
            const next = new Map(prev)

            channels.forEach(channel => {
                const latest = channel.messages?.[0]
                if (!latest) return

                next.set(channel.id, {
                    text: latest.content,
                    clientId: latest.senderId ?? null,
                    timestamp: new Date(latest.createdAt),
                })
            })

            return next
        })
    }, [channels])

    useEffect(() => {
        if (!currentUserId) return

        unreadStorageKeyRef.current = `chat-unread-counts:${currentUserId}`

        try {
            const stored = sessionStorage.getItem(unreadStorageKeyRef.current)
            if (!stored) return

            const parsed = JSON.parse(stored) as Record<string, number>
            const next = new Map<string, number>()

            Object.entries(parsed).forEach(([channelId, count]) => {
                if (typeof count === "number" && count > 0) {
                    next.set(channelId, count)
                }
            })

            setUnreadCounts(next)
        } catch (error) {
            console.error("Erro ao restaurar badges do chat:", error)
        }
    }, [currentUserId])

    useEffect(() => {
        if (!unreadStorageKeyRef.current) return

        try {
            const serialized = Object.fromEntries(unreadCounts.entries())
            sessionStorage.setItem(unreadStorageKeyRef.current, JSON.stringify(serialized))
        } catch (error) {
            console.error("Erro ao persistir badges do chat:", error)
        }
    }, [unreadCounts])

    const setActiveChannelId = useCallback((channelId: string | null) => {
        activeChannelIdRef.current = channelId
    }, [])

    useEffect(() => {
        if (!isConnected || channels.length === 0 || !currentUserId) return

        let disposed = false
        const subscriptions: Array<{ unsubscribe: () => void }> = []

        const syncSidebarMessages = async () => {
            for (const channel of channels) {
                try {
                    const room = await getRoom(`chat-${channel.id}`)

                    const listener = (event: ChatMessageEvent) => {
                        if (event.type !== ChatMessageEventType.Created) return

                        const messageKey = [
                            channel.id,
                            event.message.clientId ?? "unknown",
                            event.message.timestamp,
                            event.message.text ?? "",
                        ].join("::")

                        if (processedMessageKeysRef.current.has(messageKey)) {
                            return
                        }

                        processedMessageKeysRef.current.add(messageKey)

                        setLastMessages(prev => {
                            const next = new Map(prev)
                            next.set(channel.id, {
                                text: event.message.text,
                                clientId: event.message.clientId ?? null,
                                timestamp: new Date(event.message.timestamp),
                            })
                            return next
                        })

                        if (event.message.clientId !== currentUserId && activeChannelIdRef.current !== channel.id) {
                            setUnreadCounts(prev => {
                                const next = new Map(prev)
                                next.set(channel.id, (next.get(channel.id) ?? 0) + 1)
                                return next
                            })
                        }
                    }

                    const { unsubscribe } = room.messages.subscribe(listener)
                    subscriptions.push({ unsubscribe })
                } catch (error) {
                    console.error(`Erro ao sincronizar canal ${channel.id}:`, error)
                }
            }
        }

        syncSidebarMessages()

        return () => {
            disposed = true
            subscriptions.forEach(({ unsubscribe }) => {
                try {
                    unsubscribe()
                } catch (error) {
                    console.error("Erro ao remover listener do chat state:", error)
                }
            })
        }
    }, [channels, currentUserId, getRoom, isConnected])

    const markChannelRead = useCallback(async (channelId: string) => {
        setUnreadCounts(prev => {
            const next = new Map(prev)
            next.set(channelId, 0)
            return next
        })

        await markChannelAsRead(channelId)
        queryClient.invalidateQueries({ queryKey: ["chat-channels"] })
    }, [queryClient])

    const totalUnreadCount = useMemo(() => {
        return Array.from(unreadCounts.values()).reduce((sum, value) => sum + value, 0)
    }, [unreadCounts])

    const value = useMemo(() => ({
        channels,
        currentUserId,
        channelsLoading,
        lastMessages,
        unreadCounts,
        totalUnreadCount,
        setActiveChannelId,
        markChannelRead,
    }), [channels, currentUserId, channelsLoading, lastMessages, unreadCounts, totalUnreadCount, setActiveChannelId, markChannelRead])

    return <ChatStateContext.Provider value={value}>{children}</ChatStateContext.Provider>
}
