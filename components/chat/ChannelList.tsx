"use client"

import React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Users, MessageCircle, Search, Plus } from "lucide-react"

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface ChannelMember {
    id: string
    userId: string
    user: {
        id: string
        name: string
        image?: string | null
        onlineStatus?: { isOnline: boolean; lastSeen: Date } | null
    }
}

interface LastMessage {
    content: string
    type: string
    createdAt: Date | string
    senderId: string
}

interface Channel {
    id: string
    name: string
    type: string
    members: ChannelMember[]
    messages: LastMessage[]
    unreadCount: number
    updatedAt: Date | string
}

interface ChannelListProps {
    channels: Channel[]
    currentUserId: string
    selectedChannelId?: string
    onSelectChannel: (channelId: string) => void
    onNewChat?: () => void
    searchQuery?: string
    onSearchChange?: (query: string) => void
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
}

function getChannelDisplayName(channel: Channel, currentUserId: string): string {
    if (channel.type === "DIRECT") {
        const otherMember = channel.members.find((m) => m.userId !== currentUserId)
        return otherMember?.user.name || channel.name
    }
    return channel.name
}

function getChannelAvatar(channel: Channel, currentUserId: string): string | null {
    if (channel.type === "DIRECT") {
        const otherMember = channel.members.find((m) => m.userId !== currentUserId)
        return otherMember?.user.image || null
    }
    return null
}

function isOnline(channel: Channel, currentUserId: string): boolean {
    if (channel.type === "DIRECT") {
        const otherMember = channel.members.find((m) => m.userId !== currentUserId)
        return otherMember?.user.onlineStatus?.isOnline || false
    }
    return false
}

function formatLastMessageTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
        return format(d, "HH:mm", { locale: ptBR })
    }
    if (days === 1) {
        return "Ontem"
    }
    if (days < 7) {
        return format(d, "EEEE", { locale: ptBR })
    }
    return format(d, "dd/MM/yy", { locale: ptBR })
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function ChannelList({
    channels,
    currentUserId,
    selectedChannelId,
    onSelectChannel,
    onNewChat,
    searchQuery = "",
    onSearchChange,
}: ChannelListProps) {
    const filteredChannels = channels.filter((channel) => {
        const displayName = getChannelDisplayName(channel, currentUserId)
        return displayName.toLowerCase().includes(searchQuery.toLowerCase())
    })

    return (
        <div className="flex flex-col h-full bg-white border-r border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-800">Mensagens</h2>
                    {onNewChat && (
                        <button
                            onClick={onNewChat}
                            className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Nova conversa"
                        >
                            <Plus size={20} />
                        </button>
                    )}
                </div>

                {/* Search */}
                {onSearchChange && (
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Buscar conversas..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                )}
            </div>

            {/* Channel list */}
            <div className="flex-1 overflow-y-auto">
                {filteredChannels.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4">
                        <MessageCircle size={32} className="mb-2" />
                        <p className="text-sm text-center">
                            {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
                        </p>
                    </div>
                ) : (
                    filteredChannels.map((channel) => {
                        const displayName = getChannelDisplayName(channel, currentUserId)
                        const avatar = getChannelAvatar(channel, currentUserId)
                        const online = isOnline(channel, currentUserId)
                        const lastMessage = channel.messages[0]
                        const isSelected = channel.id === selectedChannelId

                        return (
                            <button
                                key={channel.id}
                                onClick={() => onSelectChannel(channel.id)}
                                className={`w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors ${
                                    isSelected ? "bg-indigo-50 border-r-2 border-indigo-600" : ""
                                }`}
                            >
                                {/* Avatar */}
                                <div className="relative shrink-0">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium ${
                                        channel.type === "DIRECT" ? "bg-indigo-600" : "bg-emerald-600"
                                    }`}>
                                        {avatar ? (
                                            <img src={avatar} alt={displayName} className="w-full h-full rounded-full object-cover" />
                                        ) : channel.type === "DIRECT" ? (
                                            getInitials(displayName)
                                        ) : (
                                            <Users size={20} />
                                        )}
                                    </div>
                                    {online && (
                                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`font-medium truncate ${isSelected ? "text-indigo-700" : "text-slate-800"}`}>
                                            {displayName}
                                        </span>
                                        {lastMessage && (
                                            <span className="text-xs text-slate-400 shrink-0">
                                                {formatLastMessageTime(lastMessage.createdAt)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mt-0.5">
                                        <p className="text-sm text-slate-500 truncate">
                                            {lastMessage ? (
                                                <>
                                                    {lastMessage.senderId === currentUserId && (
                                                        <span className="text-slate-400">Você: </span>
                                                    )}
                                                    {lastMessage.type === "TEXT" ? lastMessage.content : "📎 Arquivo"}
                                                </>
                                            ) : (
                                                <span className="text-slate-400 italic">Sem mensagens</span>
                                            )}
                                        </p>
                                        {channel.unreadCount > 0 && (
                                            <span className="shrink-0 min-w-[20px] h-5 px-1.5 bg-indigo-600 text-white text-xs font-medium rounded-full flex items-center justify-center">
                                                {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )
}
