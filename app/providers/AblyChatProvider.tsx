"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react"
import * as Ably from "ably"
import { ChatClient, LogLevel, Room } from "@ably/chat"
import { ChatClientProvider } from "@ably/chat/react"
import { AblyProvider } from "ably/react"
import { getAblyToken } from "@/app/actions/chat"

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface AblyChatContextValue {
    chatClient: ChatClient | null
    realtimeClient: Ably.Realtime | null
    isConnected: boolean
    currentClientId: string | null
    getRoom: (roomId: string) => Promise<Room>
}

interface AblyChatProviderProps {
    children: React.ReactNode
    clientId: string
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ══════════════════════════════════════════════════════════════════════════════

const AblyChatContext = createContext<AblyChatContextValue>({
    chatClient: null,
    realtimeClient: null,
    isConnected: false,
    currentClientId: null,
    getRoom: async () => { throw new Error("Provider not initialized") },
})

export const useAblyChat = () => useContext(AblyChatContext)

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

export function AblyChatProvider({ children, clientId }: AblyChatProviderProps) {
    const [realtimeClient, setRealtimeClient] = useState<Ably.Realtime | null>(null)
    const [chatClient, setChatClient] = useState<ChatClient | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [roomCache] = useState<Map<string, Room>>(new Map())

    // Initialize clients in background, don't block rendering
    useEffect(() => {
        if (!clientId) return

        const initializeClients = async () => {
            const realtime = new Ably.Realtime({
                authCallback: async (_tokenParams, callback) => {
                    try {
                        const tokenRequest = await getAblyToken()
                        callback(null, tokenRequest)
                    } catch (error) {
                        console.error("Ably auth error:", error)
                        callback("Auth error", null)
                    }
                },
                clientId,
                autoConnect: true,
                echoMessages: false,
            })

            const chat = new ChatClient(realtime, {
                logLevel: LogLevel.Error,
            })

            // Connection state handling
            realtime.connection.on("connected", () => {
                setIsConnected(true)
                console.log("Ably connected")
            })

            realtime.connection.on("disconnected", () => {
                setIsConnected(false)
                console.log("Ably disconnected")
            })

            realtime.connection.on("failed", () => {
                setIsConnected(false)
                console.error("Ably connection failed")
            })

            setRealtimeClient(realtime)
            setChatClient(chat)
        }

        initializeClients()

        return () => {
            if (realtimeClient) {
                realtimeClient.close()
            }
        }
    }, [clientId])

    // Get or create room
    const getRoom = useCallback(async (roomId: string): Promise<Room> => {
        if (!chatClient) {
            throw new Error("Chat client not initialized")
        }

        if (roomCache.has(roomId)) {
            return roomCache.get(roomId)!
        }

        const room = await chatClient.rooms.get(roomId)
        await room.attach()
        roomCache.set(roomId, room)
        return room
    }, [chatClient, roomCache])

    const contextValue = useMemo(() => ({
        chatClient,
        realtimeClient,
        isConnected,
        currentClientId: clientId,
        getRoom,
    }), [chatClient, realtimeClient, isConnected, clientId, getRoom])

    // Always render children, chat initializes in background
    return (
        <AblyChatContext.Provider value={contextValue}>
            {realtimeClient && (
                <AblyProvider client={realtimeClient}>
                    {chatClient && (
                        <ChatClientProvider client={chatClient}>
                            {children}
                        </ChatClientProvider>
                    )}
                </AblyProvider>
            )}
            {!realtimeClient && children}
        </AblyChatContext.Provider>
    )
}

// ══════════════════════════════════════════════════════════════════════════════
// RE-EXPORT ABLY CHAT HOOKS
// ══════════════════════════════════════════════════════════════════════════════

export {
    useMessages,
    useTyping,
    usePresence,
    usePresenceListener,
    useRoom,
    useRoomReactions,
    useChatClient,
    useOccupancy,
} from "@ably/chat/react"
