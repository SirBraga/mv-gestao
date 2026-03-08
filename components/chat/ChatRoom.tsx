"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { useMessages, useTyping, usePresence, usePresenceListener } from "@ably/chat/react"
import { Message, ChatMessageEventType, ChatMessageEvent } from "@ably/chat"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Send, Paperclip, ArrowLeft, Phone, Video, MoreVertical, X, Reply } from "lucide-react"
import { uploadFile } from "@/app/utils/upload"
import { toast } from "react-toastify"

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface ChatRoomProps {
    roomName: string
    currentUserId: string
    currentUserName: string
    otherUserId?: string
    otherUserName?: string
    otherUserImage?: string | null
    onBack?: () => void
}

interface Attachment {
    url: string
    fileName: string
    fileType: string
    fileSize: number
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function getInitials(name: string): string {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

function formatMessageTime(date: Date): string {
    return format(date, "HH:mm", { locale: ptBR })
}

function formatDateSeparator(date: Date): string {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return "Hoje"
    if (date.toDateString() === yesterday.toDateString()) return "Ontem"
    return format(date, "dd 'de' MMMM", { locale: ptBR })
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function ChatRoom({
    roomName,
    currentUserId,
    currentUserName,
    otherUserId,
    otherUserName = "Chat",
    otherUserImage,
    onBack,
}: ChatRoomProps) {
    // Extrair channelId do roomName (formato: "chat-{channelId}")
    const channelId = roomName.replace("chat-", "")
    const [inputValue, setInputValue] = useState("")
    const [messages, setMessages] = useState<Message[]>([])
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [uploading, setUploading] = useState(false)
    const [sending, setSending] = useState(false)
    const [replyTo, setReplyTo] = useState<Message | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Ably Chat hooks
    const { sendMessage, historyBeforeSubscribe } = useMessages({
        listener: (event: ChatMessageEvent) => {
            if (event.type === ChatMessageEventType.Created) {
                setMessages(prev => [...prev, event.message])
            }
        },
    })

    const { currentlyTyping, keystroke, stop: stopTyping } = useTyping()

    // Presence
    usePresence()
    const { presenceData } = usePresenceListener()

    // Load previous messages on mount
    useEffect(() => {
        const loadMessages = async () => {
            if (!historyBeforeSubscribe) return
            try {
                const result = await historyBeforeSubscribe({ limit: 50 })
                setMessages(result.items.reverse())
            } catch (error) {
                console.error("Error loading messages:", error)
            }
        }
        loadMessages()
    }, [historyBeforeSubscribe])

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Handle typing indicator
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value
        setInputValue(value)

        if (value.trim().length > 0) {
            keystroke().catch(console.error)
        } else {
            stopTyping().catch(console.error)
        }
    }, [keystroke, stopTyping])

    // Send message
    const handleSend = useCallback(async () => {
        if (!inputValue.trim() && attachments.length === 0) return
        if (sending) return // Prevenir envio múltiplo

        const messageContent = inputValue.trim() || "📎 Arquivo"

        // Limpar input imediatamente
        setInputValue("")
        setSending(true)

        try {
            // Enviar via Ably Chat (instantâneo - Ably armazena o histórico)
            await sendMessage({
                text: messageContent,
            })

            setAttachments([])
            setReplyTo(null)
            stopTyping().catch(console.error)
        } catch (error) {
            console.error("Error sending message:", error)
            toast.error("Erro ao enviar mensagem")
            // Restaurar mensagem em caso de erro
            setInputValue(messageContent)
        } finally {
            setSending(false)
        }
    }, [inputValue, attachments.length, sending, sendMessage, stopTyping])

    // Handle key press
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // Handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setUploading(true)
        try {
            for (const file of Array.from(files)) {
                const result = await uploadFile(file)
                setAttachments(prev => [...prev, {
                    url: result.url,
                    fileName: result.fileName,
                    fileType: result.fileType,
                    fileSize: result.fileSize,
                }])
            }
        } catch (error) {
            toast.error("Erro ao fazer upload")
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    // Check if user is online
    const isOtherUserOnline = otherUserId 
        ? presenceData.some(p => p.clientId === otherUserId)
        : presenceData.some(p => p.clientId !== currentUserId) // Fallback para grupo

    // Group messages by date
    const groupedMessages = messages.reduce((groups, message) => {
        const date = new Date(message.timestamp).toDateString()
        if (!groups[date]) groups[date] = []
        groups[date].push(message)
        return groups
    }, {} as Record<string, Message[]>)

    // Typing indicator text
    const typingUsers = Array.from(currentlyTyping).filter(id => id !== currentUserId)

    return (
        <div className="flex flex-col h-full bg-white w-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-600 md:hidden"
                    >
                        <ArrowLeft size={20} />
                    </button>
                )}

                <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
                        {otherUserImage ? (
                            <img src={otherUserImage} alt={otherUserName} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            getInitials(otherUserName)
                        )}
                    </div>
                    {isOtherUserOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-slate-800 truncate">{otherUserName}</h2>
                    <p className="text-xs text-slate-500">
                        {typingUsers.length > 0 ? (
                            <span className="text-indigo-600">Digitando...</span>
                        ) : isOtherUserOnline ? (
                            <span className="text-emerald-600">Online</span>
                        ) : (
                            "Offline"
                        )}
                    </p>
                </div>

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
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {Object.entries(groupedMessages).map(([date, msgs]) => (
                    <div key={date}>
                        {/* Date separator */}
                        <div className="flex items-center justify-center my-4">
                            <span className="px-3 py-1 bg-white rounded-full text-xs text-slate-500 shadow-sm">
                                {formatDateSeparator(new Date(date))}
                            </span>
                        </div>

                        {/* Messages */}
                        {msgs.map((msg) => {
                            const isMine = msg.clientId === currentUserId
                            const metadata = msg.metadata as { attachments?: Attachment[]; replyTo?: { text: string; clientId: string } } | undefined
                            const msgAttachments = metadata?.attachments || []
                            const msgReplyTo = metadata?.replyTo

                            return (
                                <div
                                    key={msg.serial}
                                    className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2 group`}
                                >
                                    <div className={`max-w-[70%] ${isMine ? "order-2" : "order-1"}`}>
                                        {/* Reply preview */}
                                        {msgReplyTo && (
                                            <div className={`text-xs px-3 py-1 mb-1 rounded-t-lg border-l-2 ${
                                                isMine ? "bg-indigo-100 border-indigo-400" : "bg-slate-200 border-slate-400"
                                            }`}>
                                                <span className="font-medium">{msgReplyTo.clientId === currentUserId ? "Você" : otherUserName}</span>
                                                <p className="truncate opacity-75">{msgReplyTo.text}</p>
                                            </div>
                                        )}

                                        {/* Message bubble */}
                                        <div
                                            className={`px-4 py-2 rounded-2xl ${
                                                isMine
                                                    ? "bg-indigo-600 text-white rounded-br-md"
                                                    : "bg-white text-slate-800 rounded-bl-md shadow-sm"
                                            }`}
                                        >
                                            {/* Attachments */}
                                            {msgAttachments.length > 0 && (
                                                <div className="mb-2 space-y-2">
                                                    {msgAttachments.map((att, idx) => (
                                                        <div key={idx}>
                                                            {att.fileType.startsWith("image/") ? (
                                                                <img
                                                                    src={att.url}
                                                                    alt={att.fileName}
                                                                    className="max-w-full rounded-lg cursor-pointer"
                                                                    onClick={() => window.open(att.url, "_blank")}
                                                                />
                                                            ) : (
                                                                <a
                                                                    href={att.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={`flex items-center gap-2 p-2 rounded-lg ${
                                                                        isMine ? "bg-indigo-500" : "bg-slate-100"
                                                                    }`}
                                                                >
                                                                    <Paperclip size={16} />
                                                                    <span className="truncate text-sm">{att.fileName}</span>
                                                                </a>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Text */}
                                            {msg.text && msg.text !== "📎 Arquivo" && (
                                                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                            )}

                                            {/* Time */}
                                            <p className={`text-xs mt-1 ${isMine ? "text-indigo-200" : "text-slate-400"}`}>
                                                {formatMessageTime(new Date(msg.timestamp))}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Reply button */}
                                    <button
                                        onClick={() => setReplyTo(msg)}
                                        className={`opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-slate-200 text-slate-400 transition-opacity ${
                                            isMine ? "order-1 mr-2" : "order-2 ml-2"
                                        }`}
                                        title="Responder"
                                    >
                                        <Reply size={16} />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <div className="flex gap-1">
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span>{typingUsers.join(", ")} está digitando...</span>
                    </div>
                </div>
            )}

            {/* Reply preview */}
            {replyTo && (
                <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center gap-2">
                    <Reply size={16} className="text-slate-400" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-600">
                            Respondendo a {replyTo.clientId === currentUserId ? "você mesmo" : otherUserName}
                        </p>
                        <p className="text-sm text-slate-500 truncate">{replyTo.text}</p>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="p-1 rounded-full hover:bg-slate-200">
                        <X size={16} className="text-slate-400" />
                    </button>
                </div>
            )}

            {/* Attachments preview */}
            {attachments.length > 0 && (
                <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex gap-2 overflow-x-auto">
                    {attachments.map((att, idx) => (
                        <div key={idx} className="relative shrink-0">
                            {att.fileType.startsWith("image/") ? (
                                <img src={att.url} alt={att.fileName} className="w-16 h-16 object-cover rounded-lg" />
                            ) : (
                                <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center">
                                    <Paperclip size={20} className="text-slate-500" />
                                </div>
                            )}
                            <button
                                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-slate-200 bg-white">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-500 disabled:opacity-50"
                    >
                        <Paperclip size={20} />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    />

                    <div className="flex-1">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Digite uma mensagem..."
                            rows={1}
                            className="w-full px-4 py-2.5 bg-slate-100 rounded-2xl resize-none text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <button
                        onClick={handleSend}
                        disabled={(!inputValue.trim() && attachments.length === 0) || uploading}
                        className="p-2.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}
