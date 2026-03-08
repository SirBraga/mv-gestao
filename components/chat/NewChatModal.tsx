"use client"

import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getChatUsers, getOrCreateDirectChannel } from "@/app/actions/chat"
import { X, Search, MessageCircle } from "lucide-react"
import { toast } from "react-toastify"

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface ChatUser {
    id: string
    name: string
    email: string
    image: string | null
    isOnline: boolean
    lastSeen: string | null
}

interface NewChatModalProps {
    isOpen: boolean
    onClose: () => void
    onChatCreated: (channelId: string) => void
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function NewChatModal({ isOpen, onClose, onChatCreated }: NewChatModalProps) {
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

    // Fetch users
    const { data: users = [], isLoading } = useQuery({
        queryKey: ["chat-users"],
        queryFn: getChatUsers,
        enabled: isOpen,
    })

    // Create channel mutation
    const createChannelMutation = useMutation({
        mutationFn: (userId: string) => getOrCreateDirectChannel(userId),
        onSuccess: (channel) => {
            toast.success("Conversa iniciada!")
            queryClient.invalidateQueries({ queryKey: ["chat-channels"] })
            onChatCreated(channel.id)
            onClose()
            setSelectedUserId(null)
        },
        onError: (error: Error) => {
            toast.error(error.message || "Erro ao iniciar conversa")
        },
    })

    // Filter users
    const filteredUsers = users.filter((user: ChatUser) =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleStartChat = (userId: string) => {
        setSelectedUserId(userId)
        createChannelMutation.mutate(userId)
    }

    const getInitials = (name: string): string => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
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
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
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
                            className="w-full pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Users list */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex flex-col gap-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
                                        <div className="h-3 bg-slate-200 rounded animate-pulse w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-slate-400 py-8">
                            <MessageCircle size={32} className="mb-2" />
                            <p className="text-sm text-center">
                                {searchQuery ? "Nenhum usuário encontrado" : "Nenhum usuário disponível"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredUsers.map((user: ChatUser) => (
                                <button
                                    key={user.id}
                                    onClick={() => handleStartChat(user.id)}
                                    disabled={createChannelMutation.isPending && selectedUserId === user.id}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {/* Avatar */}
                                    <div className="relative shrink-0">
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

                                    {/* User info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-800 truncate">{user.name}</p>
                                        <p className="text-sm text-slate-500 truncate">{user.email}</p>
                                    </div>

                                    {/* Status */}
                                    <div className="text-right">
                                        {user.isOnline ? (
                                            <span className="text-xs text-emerald-600 font-medium">Online</span>
                                        ) : (
                                            <span className="text-xs text-slate-400">Offline</span>
                                        )}
                                    </div>

                                    {/* Loading */}
                                    {createChannelMutation.isPending && selectedUserId === user.id && (
                                        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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
