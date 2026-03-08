"use client"

import React, { useMemo, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChatRoomProvider } from "@ably/chat/react"
import { getOrCreateDirectChannel, getChatUsers } from "@/app/actions/chat"
import { useChatState } from "./ChatStateProvider"
import { ChatRoom } from "./ChatRoom"
import { Search, Plus, Users, MessageCircle, Loader2, X } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

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

interface ChatUser {
    id: string
    name: string
    email: string
    image: string | null
    isOnline: boolean
}

interface ChatAppProps {
    initialChannelId?: string
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getInitials(name: string): string {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

function formatLastMessageTime(date: Date): string {
    const now = new Date()
    const msgDate = new Date(date)
    const diffMs = now.getTime() - msgDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Agora"
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return format(msgDate, "dd/MM", { locale: ptBR })
}

function getChannelDisplayData(channel: Channel, currentUserId: string) {
    const otherMember = channel.members.find((member) => member.user.id !== currentUserId)

    return {
        otherMember,
        displayName: channel.type === "DIRECT" && otherMember ? otherMember.user.name : channel.name,
        displayImage: channel.type === "DIRECT" && otherMember ? otherMember.user.image : null,
        otherUserId: channel.type === "DIRECT" && otherMember ? otherMember.user.id : undefined,
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// CHANNEL LIST COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

function ChannelListPanel({
    channels,
    currentUserId,
    selectedChannelId,
    onSelectChannel,
    onNewChat,
    isLoading,
    lastMessages,
    unreadCounts,
}: {
    channels: Channel[]
    currentUserId: string
    selectedChannelId: string | null
    onSelectChannel: (id: string, name: string, image: string | null, otherUserId?: string) => void
    onNewChat: () => void
    isLoading: boolean
    lastMessages: Map<string, SidebarMessage>
    unreadCounts: Map<string, number>
}) {
    const [searchQuery, setSearchQuery] = useState("")

    const filteredChannels = channels.filter(channel => {
        const { displayName } = getChannelDisplayData(channel, currentUserId)
        return displayName.toLowerCase().includes(searchQuery.toLowerCase())
    })

    return (
        <div className="flex flex-col h-full bg-white border-r border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-800">Mensagens</h2>
                    <button
                        onClick={onNewChat}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
                        title="Nova conversa"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar conversas..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Channels */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 size={24} className="animate-spin text-slate-400" />
                    </div>
                ) : filteredChannels.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                        <MessageCircle size={32} className="mb-2" />
                        <p className="text-sm">Nenhuma conversa</p>
                        <button
                            onClick={onNewChat}
                            className="mt-2 text-indigo-600 text-sm hover:underline"
                        >
                            Iniciar nova conversa
                        </button>
                    </div>
                ) : (
                    filteredChannels.map(channel => {
                        const { displayName, displayImage, otherUserId } = getChannelDisplayData(channel, currentUserId)
                        const lastMessage = lastMessages.get(channel.id)
                        const unreadCount = unreadCounts.get(channel.id) ?? channel.unreadCount
                        const isSelected = selectedChannelId === channel.id

                        return (
                            <button
                                key={channel.id}
                                onClick={() => onSelectChannel(channel.id, displayName, displayImage, otherUserId)}
                                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left ${
                                    isSelected ? "bg-indigo-50 border-r-2 border-indigo-600" : ""
                                }`}
                            >
                                {/* Avatar */}
                                <div className="relative shrink-0">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium ${
                                        channel.type === "DIRECT" ? "bg-indigo-600" : "bg-emerald-600"
                                    }`}>
                                        {displayImage ? (
                                            <img src={displayImage} alt={displayName} className="w-full h-full rounded-full object-cover" />
                                        ) : channel.type === "DIRECT" ? (
                                            getInitials(displayName)
                                        ) : (
                                            <Users size={20} />
                                        )}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`font-medium truncate ${isSelected ? "text-indigo-700" : "text-slate-800"}`}>
                                            {displayName}
                                        </span>
                                        {lastMessage && (
                                            <span className="text-xs text-slate-400 shrink-0">
                                                {formatLastMessageTime(lastMessage.timestamp)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mt-0.5">
                                        <p className="text-sm text-slate-500 truncate">
                                            {lastMessage ? (
                                                <>
                                                    {lastMessage.clientId === currentUserId && (
                                                        <span className="text-slate-400">Você: </span>
                                                    )}
                                                    {lastMessage.text}
                                                </>
                                            ) : (
                                                <span className="text-slate-400 italic">Sem mensagens</span>
                                            )}
                                        </p>
                                        {unreadCount > 0 && (
                                            <span className="shrink-0 min-w-5 h-5 px-1.5 bg-indigo-600 text-white text-xs font-medium rounded-full flex items-center justify-center">
                                                {unreadCount > 99 ? "99+" : unreadCount}
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

// NEW CHAT MODAL
// ══════════════════════════════════════════════════════════════════════════════

function NewChatModal({
    isOpen,
    onClose,
    onSelectUser,
}: {
    isOpen: boolean
    onClose: () => void
    onSelectUser: (channelId: string, userName: string, userImage: string | null, otherUserId?: string) => void
}) {
    const [searchQuery, setSearchQuery] = useState("")
    const [creating, setCreating] = useState<string | null>(null)

    const { data: users = [], isLoading } = useQuery({
        queryKey: ["chat-users"],
        queryFn: getChatUsers,
        enabled: isOpen,
    })

    const filteredUsers = users.filter((user: ChatUser) =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleSelectUser = async (user: ChatUser) => {
        setCreating(user.id)
        try {
            const channel = await getOrCreateDirectChannel(user.id)
            onSelectUser(channel.id, user.name, user.image, user.id)
            onClose()
        } catch (error) {
            console.error("Error creating channel:", error)
        } finally {
            setCreating(null)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800">Nova Conversa</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-slate-200">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar usuários..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm"
                        />
                    </div>
                </div>

                {/* Users */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 size={24} className="animate-spin text-slate-400" />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center text-slate-400 py-8">
                            Nenhum usuário encontrado
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredUsers.map((user: ChatUser) => (
                                <button
                                    key={user.id}
                                    onClick={() => handleSelectUser(user)}
                                    disabled={creating === user.id}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                                >
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                                            {user.image ? (
                                                <img src={user.image} alt={user.name} className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                                getInitials(user.name)
                                            )}
                                        </div>
                                        {user.isOnline && (
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-medium text-slate-800">{user.name}</p>
                                        <p className="text-sm text-slate-500">{user.email}</p>
                                    </div>
                                    {creating === user.id && (
                                        <Loader2 size={20} className="animate-spin text-indigo-600" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

function ChatAppContent({
    initialChannelId,
    channels,
    currentUserId,
    channelsLoading,
}: ChatAppProps & {
    channels: Channel[]
    currentUserId: string
    channelsLoading: boolean
}) {
    const initialSelectedChannel = useMemo(() => {
        if (!initialChannelId) return null

        const channel = channels.find((c: Channel) => c.id === initialChannelId)
        if (!channel) return null

        const { displayName, displayImage, otherUserId } = getChannelDisplayData(channel, currentUserId)

        return {
            id: channel.id,
            name: displayName,
            image: displayImage,
            otherUserId,
        }
    }, [initialChannelId, channels, currentUserId])

    const [selectedChannelState, setSelectedChannelState] = useState<{
        id: string
        name: string
        image: string | null
        otherUserId?: string
    } | null>(null)
    const selectedChannel = selectedChannelState ?? initialSelectedChannel
    const [showNewChatModal, setShowNewChatModal] = useState(false)
    const [showMobileChat, setShowMobileChat] = useState(() => Boolean(initialChannelId))
    const { lastMessages, unreadCounts, markChannelRead, setActiveChannelId } = useChatState()

    useEffect(() => {
        if (selectedChannel?.id) {
            setActiveChannelId(selectedChannel.id)
        }
    }, [selectedChannel?.id, setActiveChannelId])

    const handleSelectChannel = async (id: string, name: string, image: string | null, otherUserId?: string) => {
        setSelectedChannelState({ id, name, image, otherUserId })
        setShowMobileChat(true)
        setActiveChannelId(id)
        window.history.replaceState(null, "", `/dashboard/chat/${id}`)

        await markChannelRead(id)
    }

    const handleBack = () => {
        setActiveChannelId(null)
        setShowMobileChat(false)
    }

    return (
        <div className="flex h-full bg-slate-50">
            {/* Channel list */}
            <div className={`w-80 shrink-0 ${showMobileChat ? "hidden md:block" : "block"}`}>
                <ChannelListPanel
                    channels={channels}
                    currentUserId={currentUserId}
                    selectedChannelId={selectedChannel?.id || null}
                    onSelectChannel={handleSelectChannel}
                    onNewChat={() => setShowNewChatModal(true)}
                    isLoading={channelsLoading}
                    lastMessages={lastMessages}
                    unreadCounts={unreadCounts}
                />
            </div>

            {/* Chat area */}
            <div className={`flex-1 ${!showMobileChat && !selectedChannel ? "hidden md:flex" : "flex"}`}>
                {selectedChannel ? (
                    <ChatRoomProvider name={`chat-${selectedChannel.id}`}>
                        <ChatRoom
                            roomName={`chat-${selectedChannel.id}`}
                            currentUserId={currentUserId}
                            currentUserName="Você"
                            otherUserId={selectedChannel.otherUserId}
                            otherUserName={selectedChannel.name}
                            otherUserImage={selectedChannel.image}
                            onBack={handleBack}
                        />
                    </ChatRoomProvider>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <MessageCircle size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-slate-600 mb-1">Selecione uma conversa</h3>
                        <p className="text-sm">Escolha uma conversa ou inicie uma nova</p>
                        <button
                            onClick={() => setShowNewChatModal(true)}
                            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Nova conversa
                        </button>
                    </div>
                )}
            </div>

            {/* New chat modal */}
            <NewChatModal
                isOpen={showNewChatModal}
                onClose={() => setShowNewChatModal(false)}
                onSelectUser={(channelId, userName, userImage, otherUserId) => {
                    handleSelectChannel(channelId, userName, userImage, otherUserId)
                }}
            />
        </div>
    )
}

export function ChatApp({ initialChannelId }: ChatAppProps) {
    const { channels, currentUserId, channelsLoading } = useChatState()

    if (channelsLoading) {
        return null
    }

    if (!currentUserId) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
            </div>
        )
    }

    return (
        <ChatAppContent
            initialChannelId={initialChannelId}
            channels={channels}
            currentUserId={currentUserId}
            channelsLoading={channelsLoading}
        />
    )
}
