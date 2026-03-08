"use client"

import React, { useState, useCallback, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { MessageList } from "./MessageList"
import { MessageInput } from "./MessageInput"
import { ChannelList } from "./ChannelList"
import { NewChatModal } from "./NewChatModal"
import { useAbly, useTypingIndicator, useChatMessages } from "@/app/providers/AblyProvider"
import {
    getUserChannels,
    getChannelMessages,
    sendChannelMessage,
    editMessage,
    deleteMessage,
    sendTypingIndicator,
    getChannel,
} from "@/app/actions/chat"
import { getChannelName } from "@/app/utils/ably"
import { ArrowLeft, Phone, Video, MoreVertical, Users, Loader2, MessageCircle } from "lucide-react"
import { toast } from "react-toastify"

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface Attachment {
    id: string
    url: string
    fileName: string
    fileType: string
    fileSize: number
}

interface ReplyTo {
    id: string
    content: string
    senderId: string
    sender: { id: string; name: string }
}

interface LastMessage {
    content: string
    type: string
    createdAt: Date | string
    senderId: string
}

interface Message {
    id: string
    content: string
    type: string
    mediaUrl?: string | null
    mediaType?: string | null
    fileName?: string | null
    fileSize?: number | null
    isEdited: boolean
    createdAt: Date | string
    senderId: string
    sender: { id: string; name: string; image?: string | null }
    replyToId?: string | null
    replyTo?: ReplyTo | null
    attachments: Attachment[]
}

interface ChatContainerProps {
    initialChannelId?: string
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

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function ChatContainer({ initialChannelId }: ChatContainerProps) {
    const queryClient = useQueryClient()
    const { isConnected } = useAbly()
    
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(initialChannelId || null)
    const [searchQuery, setSearchQuery] = useState("")
    const [replyTo, setReplyTo] = useState<Message | null>(null)
    const [editingMessage, setEditingMessage] = useState<Message | null>(null)
    const [showMobileChat, setShowMobileChat] = useState(false)
    const [showNewChatModal, setShowNewChatModal] = useState(false)

    // Fetch channels
    const { data: channelsData, isLoading: channelsLoading } = useQuery({
        queryKey: ["chat-channels"],
        queryFn: getUserChannels,
        refetchInterval: 30000,
    })

    // Fetch selected channel details
    const { data: channelData } = useQuery({
        queryKey: ["chat-channel", selectedChannelId],
        queryFn: () => getChannel(selectedChannelId!),
        enabled: !!selectedChannelId,
    })

    // Fetch messages
    const { data: messagesData, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
        queryKey: ["chat-messages", selectedChannelId],
        queryFn: async () => {
            const result = await getChannelMessages(selectedChannelId!)
            // Invalidar contagem de não lidas após carregar mensagens
            queryClient.invalidateQueries({ queryKey: ["unreadCount"] })
            queryClient.invalidateQueries({ queryKey: ["chat-channels"] })
            return result
        },
        enabled: !!selectedChannelId,
    })

    const currentUserId = channelsData?.currentUserId || channelData?.currentUserId || ""
    const messages = (messagesData?.messages || []) as Message[]

    // Typing indicator
    const { typingUsers } = useTypingIndicator(
        selectedChannelId ? getChannelName(selectedChannelId) : "",
        currentUserId
    )

    // Real-time messages
    useChatMessages(
        selectedChannelId ? getChannelName(selectedChannelId) : "",
        useCallback((newMessage: unknown) => {
            queryClient.setQueryData(
                ["chat-messages", selectedChannelId],
                (old: { messages: Message[]; currentUserId: string; nextCursor: string | null } | undefined) => {
                    if (!old) return old
                    const msg = newMessage as Message
                    if (old.messages.some((m) => m.id === msg.id)) return old
                    return { ...old, messages: [...old.messages, msg] }
                }
            )
            // Atualizar badges de mensagens não lidas
            queryClient.invalidateQueries({ queryKey: ["chat-channels"] })
            queryClient.invalidateQueries({ queryKey: ["unreadCount"] })
        }, [queryClient, selectedChannelId]),
        useCallback((updatedMessage: unknown) => {
            queryClient.setQueryData(
                ["chat-messages", selectedChannelId],
                (old: { messages: Message[]; currentUserId: string; nextCursor: string | null } | undefined) => {
                    if (!old) return old
                    const msg = updatedMessage as Message
                    return {
                        ...old,
                        messages: old.messages.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)),
                    }
                }
            )
        }, [queryClient, selectedChannelId]),
        useCallback((data: { id: string }) => {
            queryClient.setQueryData(
                ["chat-messages", selectedChannelId],
                (old: { messages: Message[]; currentUserId: string; nextCursor: string | null } | undefined) => {
                    if (!old) return old
                    return {
                        ...old,
                        messages: old.messages.filter((m) => m.id !== data.id),
                    }
                }
            )
        }, [queryClient, selectedChannelId])
    )

    // Send message mutation
    const sendMutation = useMutation({
        mutationFn: sendChannelMessage,
        onSuccess: () => {
            refetchMessages()
            queryClient.invalidateQueries({ queryKey: ["chat-channels"] })
        },
        onError: (error: Error) => {
            toast.error(error.message || "Erro ao enviar mensagem")
        },
    })

    // Edit message mutation
    const editMutation = useMutation({
        mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
            editMessage(messageId, content),
        onSuccess: () => {
            setEditingMessage(null)
            refetchMessages()
        },
        onError: (error: Error) => {
            toast.error(error.message || "Erro ao editar mensagem")
        },
    })

    // Delete message mutation
    const deleteMutation = useMutation({
        mutationFn: deleteMessage,
        onSuccess: () => {
            refetchMessages()
        },
        onError: (error: Error) => {
            toast.error(error.message || "Erro ao excluir mensagem")
        },
    })

    // Handle send message
    const handleSend = useCallback(
        (data: {
            content: string
            replyToId?: string
            attachments?: { url: string; fileName: string; fileType: string; fileSize: number }[]
            mediaUrl?: string
            mediaType?: string
            fileName?: string
            fileSize?: number
            type?: string
        }) => {
            if (!selectedChannelId) return

            if (editingMessage) {
                editMutation.mutate({ messageId: editingMessage.id, content: data.content })
            } else {
                sendMutation.mutate({
                    channelId: selectedChannelId,
                    content: data.content,
                    replyToId: data.replyToId,
                    attachments: data.attachments,
                    mediaUrl: data.mediaUrl,
                    mediaType: data.mediaType,
                    fileName: data.fileName,
                    fileSize: data.fileSize,
                    type: data.type as "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | "SYSTEM" | undefined,
                })
            }
        },
        [selectedChannelId, editingMessage, sendMutation, editMutation]
    )

    // Handle typing
    const handleTyping = useCallback(
        (isTyping: boolean) => {
            if (selectedChannelId) {
                sendTypingIndicator(selectedChannelId, isTyping)
            }
        },
        [selectedChannelId]
    )

    // Handle reply
    const handleReply = useCallback((message: Message) => {
        setReplyTo(message)
        setEditingMessage(null)
    }, [])

    // Handle edit
    const handleEdit = useCallback((message: Message) => {
        setEditingMessage(message)
        setReplyTo(null)
    }, [])

    // Handle delete
    const handleDelete = useCallback(
        (messageId: string) => {
            if (confirm("Tem certeza que deseja excluir esta mensagem?")) {
                deleteMutation.mutate(messageId)
            }
        },
        [deleteMutation]
    )

    // Handle channel select
    const handleSelectChannel = useCallback((channelId: string) => {
        setSelectedChannelId(channelId)
        setShowMobileChat(true)
        setReplyTo(null)
        setEditingMessage(null)
    }, [])

    // Get channel display info
    const getChannelInfo = () => {
        if (!channelData?.channel) return { name: "", avatar: null, online: false }
        
        const channel = channelData.channel
        if (channel.type === "DIRECT") {
            const otherMember = channel.members.find((m) => m.userId !== currentUserId)
            return {
                name: otherMember?.user.name || channel.name,
                avatar: otherMember?.user.image || null,
                online: otherMember?.user.onlineStatus?.isOnline || false,
            }
        }
        return { name: channel.name, avatar: null, online: false }
    }

    const channelInfo = getChannelInfo()

    // Update URL when channel changes
    useEffect(() => {
        if (selectedChannelId) {
            window.history.replaceState(null, "", `/dashboard/chat/${selectedChannelId}`)
        }
    }, [selectedChannelId])

    return (
        <>
            <div className="flex h-full bg-slate-50">
            {/* Channel list (sidebar) */}
            <div className={`w-80 shrink-0 ${showMobileChat ? "hidden md:block" : "block"}`}>
                {channelsLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 size={24} className="animate-spin text-slate-400" />
                    </div>
                ) : (
                    <ChannelList
                        channels={channelsData?.channels || []}
                        currentUserId={currentUserId}
                        selectedChannelId={selectedChannelId || undefined}
                        onSelectChannel={handleSelectChannel}
                        onNewChat={() => setShowNewChatModal(true)}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                    />
                )}
            </div>

            {/* Chat area */}
            <div className={`flex-1 flex flex-col bg-white ${!showMobileChat && !selectedChannelId ? "hidden md:flex" : "flex"}`}>
                {selectedChannelId ? (
                    <>
                        {/* Chat header */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
                            {/* Back button (mobile) */}
                            <button
                                onClick={() => setShowMobileChat(false)}
                                className="md:hidden p-2 rounded-full hover:bg-slate-100 text-slate-600"
                            >
                                <ArrowLeft size={20} />
                            </button>

                            {/* Avatar */}
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                                    {channelInfo.avatar ? (
                                        <img src={channelInfo.avatar} alt={channelInfo.name} className="w-full h-full rounded-full object-cover" />
                                    ) : channelData?.channel?.type === "GROUP" ? (
                                        <Users size={18} />
                                    ) : (
                                        getInitials(channelInfo.name)
                                    )}
                                </div>
                                {channelInfo.online && (
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-slate-800 truncate">{channelInfo.name}</h3>
                                <p className="text-xs text-slate-500">
                                    {channelInfo.online ? (
                                        <span className="text-emerald-600">Online</span>
                                    ) : typingUsers.length > 0 ? (
                                        <span className="text-indigo-600">Digitando...</span>
                                    ) : (
                                        "Offline"
                                    )}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                                <button className="p-2 rounded-full hover:bg-slate-100 text-slate-500" title="Chamada de voz">
                                    <Phone size={18} />
                                </button>
                                <button className="p-2 rounded-full hover:bg-slate-100 text-slate-500" title="Chamada de vídeo">
                                    <Video size={18} />
                                </button>
                                <button className="p-2 rounded-full hover:bg-slate-100 text-slate-500" title="Mais opções">
                                    <MoreVertical size={18} />
                                </button>
                            </div>

                            {/* Connection status */}
                            {!isConnected && (
                                <div className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                                    Reconectando...
                                </div>
                            )}
                        </div>

                        {/* Messages */}
                        <MessageList
                            messages={messages}
                            currentUserId={currentUserId}
                            typingUsers={typingUsers}
                            isLoading={messagesLoading}
                            onReply={handleReply}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />

                        {/* Input */}
                        <MessageInput
                            onSend={handleSend}
                            onTyping={handleTyping}
                            replyTo={replyTo ? { id: replyTo.id, content: replyTo.content, sender: replyTo.sender } : null}
                            onCancelReply={() => setReplyTo(null)}
                            disabled={sendMutation.isPending || editMutation.isPending}
                            placeholder={editingMessage ? "Editar mensagem..." : "Digite uma mensagem..."}
                        />
                    </>
                ) : (
                    /* Empty state */
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <MessageCircle size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-slate-600 mb-1">Selecione uma conversa</h3>
                        <p className="text-sm">Escolha uma conversa na lista para começar</p>
                    </div>
                )}
            </div>
        </div>

            {/* New Chat Modal */}
            <NewChatModal
                isOpen={showNewChatModal}
                onClose={() => setShowNewChatModal(false)}
                onChatCreated={(channelId) => setSelectedChannelId(channelId)}
            />
        </>
    )
}

