import Ably from "ably"

// Cliente Ably para o servidor
export const getAblyServer = () => {
    if (!process.env.ABLY_API_KEY) {
        throw new Error("ABLY_API_KEY não configurada")
    }
    return new Ably.Rest(process.env.ABLY_API_KEY)
}

// Cliente Ably Realtime para o servidor
export const getAblyRealtimeServer = () => {
    if (!process.env.ABLY_API_KEY) {
        throw new Error("ABLY_API_KEY não configurada")
    }
    return new Ably.Realtime(process.env.ABLY_API_KEY)
}

// Tipos de eventos do chat
export const CHAT_EVENTS = {
    MESSAGE_NEW: "message:new",
    MESSAGE_UPDATE: "message:update",
    MESSAGE_DELETE: "message:delete",
    TYPING_START: "typing:start",
    TYPING_STOP: "typing:stop",
    PRESENCE_ENTER: "presence:enter",
    PRESENCE_LEAVE: "presence:leave",
    MEDIA_UPLOAD: "media:upload",
} as const

// Tipos de canais
export const CHANNEL_PREFIXES = {
    CHAT: "chat:",
    PRESENCE: "presence:",
    TYPING: "typing:",
} as const

// Função para gerar nome do canal
export const getChannelName = (channelId: string) => `${CHANNEL_PREFIXES.CHAT}${channelId}`
export const getPresenceChannelName = (channelId: string) => `${CHANNEL_PREFIXES.PRESENCE}${channelId}`
export const getTypingChannelName = (channelId: string) => `${CHANNEL_PREFIXES.TYPING}${channelId}`
