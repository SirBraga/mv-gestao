"use client"

import React, { useRef, useEffect, useCallback } from "react"
import { MessageBubble } from "./MessageBubble"
import { TypingIndicator } from "./TypingIndicator"
import { Loader2 } from "lucide-react"

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

interface TypingUser {
    userId: string
    userName: string
}

interface MessageListProps {
    messages: Message[]
    currentUserId: string
    typingUsers?: TypingUser[]
    isLoading?: boolean
    hasMore?: boolean
    onLoadMore?: () => void
    onReply?: (message: Message) => void
    onEdit?: (message: Message) => void
    onDelete?: (messageId: string) => void
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function MessageList({
    messages,
    currentUserId,
    typingUsers = [],
    isLoading = false,
    hasMore = false,
    onLoadMore,
    onReply,
    onEdit,
    onDelete,
}: MessageListProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const isAtBottomRef = useRef(true)

    // Check if user is at bottom
    const checkIfAtBottom = useCallback(() => {
        if (!containerRef.current) return true
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current
        return scrollHeight - scrollTop - clientHeight < 100
    }, [])

    // Scroll to bottom
    const scrollToBottom = useCallback((smooth = true) => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({
                behavior: smooth ? "smooth" : "auto",
                block: "end",
            })
        }
    }, [])

    // Handle scroll
    const handleScroll = useCallback(() => {
        if (!containerRef.current) return
        
        isAtBottomRef.current = checkIfAtBottom()

        // Load more when scrolling to top
        if (containerRef.current.scrollTop < 100 && hasMore && onLoadMore && !isLoading) {
            onLoadMore()
        }
    }, [checkIfAtBottom, hasMore, onLoadMore, isLoading])

    // Scroll to bottom on new messages (if user was at bottom)
    useEffect(() => {
        if (isAtBottomRef.current) {
            scrollToBottom()
        }
    }, [messages, scrollToBottom])

    // Initial scroll to bottom
    useEffect(() => {
        scrollToBottom(false)
    }, [scrollToBottom])

    // Group messages by date
    const groupedMessages = messages.reduce((groups, message) => {
        const date = new Date(message.createdAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
        })
        if (!groups[date]) {
            groups[date] = []
        }
        groups[date].push(message)
        return groups
    }, {} as Record<string, Message[]>)

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        >
            {/* Loading indicator for older messages */}
            {isLoading && (
                <div className="flex justify-center py-4">
                    <Loader2 size={24} className="animate-spin text-slate-400" />
                </div>
            )}

            {/* Load more button */}
            {hasMore && !isLoading && (
                <div className="flex justify-center py-2">
                    <button
                        onClick={onLoadMore}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        Carregar mensagens anteriores
                    </button>
                </div>
            )}

            {/* Empty state */}
            {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <p className="text-sm">Nenhuma mensagem ainda</p>
                    <p className="text-xs mt-1">Envie uma mensagem para iniciar a conversa</p>
                </div>
            )}

            {/* Messages grouped by date */}
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date} className="space-y-3">
                    {/* Date separator */}
                    <div className="flex items-center gap-4 py-2">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-xs text-slate-400 font-medium">{date}</span>
                        <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    {/* Messages */}
                    {dateMessages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            isOwn={message.senderId === currentUserId}
                            onReply={onReply}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            ))}

            {/* Typing indicator */}
            <TypingIndicator typingUsers={typingUsers} />

            {/* Scroll anchor */}
            <div ref={bottomRef} />
        </div>
    )
}
