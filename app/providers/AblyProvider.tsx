"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import Ably from "ably"
import { getAblyToken } from "@/app/actions/chat"

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface AblyContextType {
    client: Ably.Realtime | null
    isConnected: boolean
    connectionState: string
}

interface TypingUser {
    userId: string
    userName: string
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ══════════════════════════════════════════════════════════════════════════════

const AblyContext = createContext<AblyContextType>({
    client: null,
    isConnected: false,
    connectionState: "disconnected",
})

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ══════════════════════════════════════════════════════════════════════════════

export function AblyProvider({ children }: { children: React.ReactNode }) {
    const [client, setClient] = useState<Ably.Realtime | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [connectionState, setConnectionState] = useState("disconnected")

    useEffect(() => {
        let ablyClient: Ably.Realtime | null = null

        const initAbly = async () => {
            try {
                ablyClient = new Ably.Realtime({
                    authCallback: async (_tokenParams, callback) => {
                        try {
                            const tokenRequest = await getAblyToken()
                            callback(null, tokenRequest)
                        } catch (error) {
                            console.error("Erro na autenticação Ably:", error)
                            callback("Erro de autenticação", null)
                        }
                    },
                    autoConnect: true,
                    echoMessages: false,
                })

                ablyClient.connection.on("connected", () => {
                    setIsConnected(true)
                    setConnectionState("connected")
                })

                ablyClient.connection.on("disconnected", () => {
                    setIsConnected(false)
                    setConnectionState("disconnected")
                })

                ablyClient.connection.on("suspended", () => {
                    setIsConnected(false)
                    setConnectionState("suspended")
                })

                ablyClient.connection.on("failed", () => {
                    setIsConnected(false)
                    setConnectionState("failed")
                })

                ablyClient.connection.on("connecting", () => {
                    setConnectionState("connecting")
                })

                setClient(ablyClient)
            } catch (error) {
                console.error("Erro ao inicializar Ably:", error)
            }
        }

        initAbly()

        return () => {
            if (ablyClient) {
                ablyClient.close()
            }
        }
    }, [])

    return (
        <AblyContext.Provider value={{ client, isConnected, connectionState }}>
            {children}
        </AblyContext.Provider>
    )
}

// ══════════════════════════════════════════════════════════════════════════════
// HOOKS
// ══════════════════════════════════════════════════════════════════════════════

// Hook para acessar o contexto do Ably
export function useAbly() {
    const context = useContext(AblyContext)
    if (!context) {
        throw new Error("useAbly deve ser usado dentro de um AblyProvider")
    }
    return context
}

// Hook para se inscrever em um canal
export function useChannel(channelName: string, onMessage?: (message: Ably.Message) => void) {
    const { client, isConnected } = useAbly()
    const [channel, setChannel] = useState<Ably.RealtimeChannel | null>(null)

    useEffect(() => {
        if (!client || !isConnected || !channelName) return

        const ch = client.channels.get(channelName)
        setChannel(ch)

        if (onMessage) {
            ch.subscribe(onMessage)
        }

        return () => {
            if (onMessage) {
                ch.unsubscribe(onMessage)
            }
        }
    }, [client, isConnected, channelName, onMessage])

    const publish = useCallback(
        async (event: string, data: unknown) => {
            if (channel) {
                await channel.publish(event, data)
            }
        },
        [channel]
    )

    return { channel, publish }
}

// Hook para typing indicators
export function useTypingIndicator(channelName: string, currentUserId: string) {
    const { client, isConnected } = useAbly()
    const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
    const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

    useEffect(() => {
        if (!client || !isConnected || !channelName) return

        const channel = client.channels.get(channelName)

        const handleTypingStart = (message: Ably.Message) => {
            const { userId, userName } = message.data as TypingUser
            if (userId === currentUserId) return

            // Limpar timeout anterior se existir
            const existingTimeout = typingTimeoutRef.current.get(userId)
            if (existingTimeout) {
                clearTimeout(existingTimeout)
            }

            // Adicionar usuário à lista de digitando
            setTypingUsers((prev) => {
                if (prev.some((u) => u.userId === userId)) return prev
                return [...prev, { userId, userName }]
            })

            // Remover após 3 segundos sem atividade
            const timeout = setTimeout(() => {
                setTypingUsers((prev) => prev.filter((u) => u.userId !== userId))
                typingTimeoutRef.current.delete(userId)
            }, 3000)

            typingTimeoutRef.current.set(userId, timeout)
        }

        const handleTypingStop = (message: Ably.Message) => {
            const { userId } = message.data as TypingUser
            if (userId === currentUserId) return

            // Limpar timeout
            const existingTimeout = typingTimeoutRef.current.get(userId)
            if (existingTimeout) {
                clearTimeout(existingTimeout)
                typingTimeoutRef.current.delete(userId)
            }

            // Remover usuário da lista
            setTypingUsers((prev) => prev.filter((u) => u.userId !== userId))
        }

        channel.subscribe("typing:start", handleTypingStart)
        channel.subscribe("typing:stop", handleTypingStop)

        return () => {
            channel.unsubscribe("typing:start", handleTypingStart)
            channel.unsubscribe("typing:stop", handleTypingStop)

            // Limpar todos os timeouts
            typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout))
            typingTimeoutRef.current.clear()
        }
    }, [client, isConnected, channelName, currentUserId])

    return { typingUsers }
}

// Hook para presence (usuários online)
export function usePresence(channelName: string) {
    const { client, isConnected } = useAbly()
    const [presentMembers, setPresentMembers] = useState<Ably.PresenceMessage[]>([])

    useEffect(() => {
        if (!client || !isConnected || !channelName) return

        const channel = client.channels.get(channelName)

        const syncPresence = async () => {
            try {
                const members = await channel.presence.get()
                setPresentMembers(members)
            } catch (error) {
                console.error("Erro ao obter presence:", error)
            }
        }

        const handlePresenceEnter = (member: Ably.PresenceMessage) => {
            setPresentMembers((prev) => {
                if (prev.some((m) => m.clientId === member.clientId)) return prev
                return [...prev, member]
            })
        }

        const handlePresenceLeave = (member: Ably.PresenceMessage) => {
            setPresentMembers((prev) => prev.filter((m) => m.clientId !== member.clientId))
        }

        channel.presence.subscribe("enter", handlePresenceEnter)
        channel.presence.subscribe("leave", handlePresenceLeave)
        syncPresence()

        // Entrar no canal
        channel.presence.enter()

        return () => {
            channel.presence.unsubscribe("enter", handlePresenceEnter)
            channel.presence.unsubscribe("leave", handlePresenceLeave)
            channel.presence.leave()
        }
    }, [client, isConnected, channelName])

    return { presentMembers }
}

// Hook para mensagens em tempo real
export function useChatMessages(
    channelName: string,
    onNewMessage?: (message: unknown) => void,
    onMessageUpdate?: (message: unknown) => void,
    onMessageDelete?: (data: { id: string }) => void
) {
    const { client, isConnected } = useAbly()

    useEffect(() => {
        if (!client || !isConnected || !channelName) return

        const channel = client.channels.get(channelName)

        const handleNewMessage = (message: Ably.Message) => {
            if (onNewMessage) {
                onNewMessage(message.data)
            }
        }

        const handleMessageUpdate = (message: Ably.Message) => {
            if (onMessageUpdate) {
                onMessageUpdate(message.data)
            }
        }

        const handleMessageDelete = (message: Ably.Message) => {
            if (onMessageDelete) {
                onMessageDelete(message.data as { id: string })
            }
        }

        channel.subscribe("message:new", handleNewMessage)
        channel.subscribe("message:update", handleMessageUpdate)
        channel.subscribe("message:delete", handleMessageDelete)

        return () => {
            channel.unsubscribe("message:new", handleNewMessage)
            channel.unsubscribe("message:update", handleMessageUpdate)
            channel.unsubscribe("message:delete", handleMessageDelete)
        }
    }, [client, isConnected, channelName, onNewMessage, onMessageUpdate, onMessageDelete])
}
