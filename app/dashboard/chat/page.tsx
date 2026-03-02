"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getChatUsers, getMessages, sendMessage, markAsRead } from "@/app/actions/chat"
import { uploadFile } from "@/app/utils/upload"
import { toast } from "react-toastify"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
    Search,
    Send,
    Circle,
    Volume2,
    VolumeX,
    ChevronLeft,
    MessageCircle,
    Loader2,
    Reply,
    X,
    Paperclip,
    Image as ImageIcon,
    FileText,
    Download,
} from "lucide-react"

// ── Types ──
interface ChatUser {
    id: string
    name: string
    email: string
    image: string | null
    isOnline: boolean
    lastSeen: string | null
    unreadCount: number
}

interface ChatAttachment {
    id: string
    url: string
    fileName: string
    fileType: string
    fileSize: number
}

interface ChatMsg {
    id: string
    senderId: string
    receiverId: string
    content: string
    read: boolean
    createdAt: string | Date
    replyToId: string | null
    replyTo: { id: string; content: string; senderId: string } | null
    attachments: ChatAttachment[]
}

// ── Helpers ──
function getInitials(name: string) {
    return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
}

function formatTime(dateStr: string | Date) {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    if (diffDays === 1) return "Ontem"
    if (diffDays < 7) return d.toLocaleDateString("pt-BR", { weekday: "short" })
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function formatMessageTime(dateStr: string | Date) {
    return new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function isImage(fileType: string) {
    return fileType.startsWith("image/")
}

// ── Notification Sound ──
function playNotificationSound() {
    try {
        const ctx = new AudioContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 800
        osc.type = "sine"
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        osc.start()
        osc.stop(ctx.currentTime + 0.3)
    } catch {
        // Silently fail
    }
}

// ── Component ──
export default function ChatPage() {
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
    const [newMessage, setNewMessage] = useState("")
    const [soundEnabled, setSoundEnabled] = useState(true)
    const [replyTo, setReplyTo] = useState<ChatMsg | null>(null)
    const [uploading, setUploading] = useState(false)
    const [pendingFiles, setPendingFiles] = useState<{ url: string; fileName: string; fileType: string; fileSize: number }[]>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const prevMsgCountRef = useRef(0)

    const { data: chatUsers = [], isLoading: loadingUsers } = useQuery({
        queryKey: ["chat-users"],
        queryFn: () => getChatUsers(),
        refetchInterval: 5000,
        staleTime: 4000,
    })

    const { data: messagesData, isLoading: loadingMessages } = useQuery({
        queryKey: ["chat-messages", selectedUserId],
        queryFn: () => getMessages(selectedUserId!),
        enabled: !!selectedUserId,
        refetchInterval: 3000,
        staleTime: 2000,
    })

    const currentUserId = messagesData?.currentUserId || ""
    const conversationMessages: ChatMsg[] = (messagesData?.messages || []) as ChatMsg[]
    const selectedUser = chatUsers.find((u: ChatUser) => u.id === selectedUserId)

    useEffect(() => {
        if (conversationMessages.length > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
            const lastMsg = conversationMessages[conversationMessages.length - 1]
            if (lastMsg && lastMsg.senderId !== currentUserId && soundEnabled) {
                playNotificationSound()
            }
        }
        prevMsgCountRef.current = conversationMessages.length
    }, [conversationMessages.length, currentUserId, soundEnabled, conversationMessages])

    const sendMutation = useMutation({
        mutationFn: ({ receiverId, content, replyToId, attachments }: { receiverId: string; content: string; replyToId?: string | null; attachments?: { url: string; fileName: string; fileType: string; fileSize: number }[] }) =>
            sendMessage(receiverId, content, replyToId, attachments),
        onMutate: async ({ receiverId, content, replyToId, attachments }) => {
            await queryClient.cancelQueries({ queryKey: ["chat-messages", receiverId] })
            const previous = queryClient.getQueryData(["chat-messages", receiverId])
            const tempId = `temp-${Date.now()}`
            const optimisticMsg: ChatMsg = {
                id: tempId,
                senderId: currentUserId,
                receiverId,
                content,
                read: false,
                createdAt: new Date().toISOString(),
                replyToId: replyToId ?? null,
                replyTo: replyTo ? { id: replyTo.id, content: replyTo.content, senderId: replyTo.senderId } : null,
                attachments: attachments?.map((a, i) => ({ id: `tmp-att-${i}`, ...a })) ?? [],
            }
            queryClient.setQueryData(["chat-messages", receiverId], (old: { messages: ChatMsg[]; currentUserId: string } | undefined) => ({
                messages: [...(old?.messages ?? []), optimisticMsg],
                currentUserId: old?.currentUserId ?? currentUserId,
            }))
            return { previous, tempId }
        },
        onSuccess: (_data, { receiverId }) => {
            queryClient.invalidateQueries({ queryKey: ["chat-messages", receiverId] })
            queryClient.invalidateQueries({ queryKey: ["chat-users"] })
            queryClient.invalidateQueries({ queryKey: ["unreadCount"] })
            setReplyTo(null)
            setPendingFiles([])
        },
        onError: (_err, { receiverId }, context) => {
            if (context?.previous) queryClient.setQueryData(["chat-messages", receiverId], context.previous)
            toast.error("Erro ao enviar mensagem")
        },
    })

    const filteredUsers = useMemo(() => {
        return (chatUsers as ChatUser[]).filter(u =>
            !searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).sort((a, b) => {
            if (a.unreadCount > 0 && b.unreadCount === 0) return -1
            if (a.unreadCount === 0 && b.unreadCount > 0) return 1
            if (a.isOnline && !b.isOnline) return -1
            if (!a.isOnline && b.isOnline) return 1
            return a.name.localeCompare(b.name, "pt-BR")
        })
    }, [chatUsers, searchQuery])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [selectedUserId, conversationMessages.length])

    useEffect(() => {
        if (selectedUserId) setTimeout(() => inputRef.current?.focus(), 100)
    }, [selectedUserId])

    // Marcar como lidas e atualizar badges ao abrir conversa
    useEffect(() => {
        if (!selectedUserId) return
        markAsRead(selectedUserId).then(() => {
            queryClient.invalidateQueries({ queryKey: ["chat-users"] })
            queryClient.invalidateQueries({ queryKey: ["unreadCount"] })
        })
    }, [selectedUserId, queryClient])

    const handleSend = () => {
        if ((!newMessage.trim() && pendingFiles.length === 0) || !selectedUserId) return
        sendMutation.mutate({
            receiverId: selectedUserId,
            content: newMessage.trim(),
            replyToId: replyTo?.id || null,
            attachments: pendingFiles.length > 0 ? pendingFiles : undefined,
        })
        setNewMessage("")
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return
        setUploading(true)
        try {
            const uploaded = await Promise.all(
                Array.from(files).map(file => uploadFile(file, "chat"))
            )
            setPendingFiles(prev => [...prev, ...uploaded])
            toast.success(`${uploaded.length} arquivo(s) adicionado(s)`)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro no upload")
        } finally {
            setUploading(false)
            e.target.value = ""
        }
    }

    const removePendingFile = (idx: number) => {
        setPendingFiles(prev => prev.filter((_, i) => i !== idx))
    }

    const totalUnread = (chatUsers as ChatUser[]).reduce((acc, u) => acc + u.unreadCount, 0)

    const getReplyAuthorName = (senderId: string) => {
        if (senderId === currentUserId) return "Você"
        return selectedUser?.name?.split(" ")[0] || "Usuário"
    }

    return (
        <div className="flex h-full bg-gray-50/50">
            {/* ── Left: Contacts ── */}
            <div className={`w-80 min-w-80 bg-white border-r border-gray-200 flex flex-col ${selectedUserId ? "hidden md:flex" : "flex"}`}>
                <div className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <MessageCircle size={16} className="text-blue-600" />
                            <h1 className="text-sm font-bold text-gray-900">Chat</h1>
                            {totalUnread > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center animate-pulse">{totalUnread}</span>
                            )}
                        </div>
                        <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-gray-300 hover:text-gray-500 cursor-pointer transition-colors" title={soundEnabled ? "Desativar som" : "Ativar som"}>
                            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                        </button>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input placeholder="Buscar conversa..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pl-9 text-xs rounded-lg bg-gray-50 border-gray-200" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loadingUsers ? (
                        <div className="flex flex-col">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                                        <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredUsers.map((user) => {
                        const isSelected = selectedUserId === user.id
                        return (
                            <button
                                key={user.id}
                                onClick={() => { setSelectedUserId(user.id); setReplyTo(null); setPendingFiles([]) }}
                                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 transition-all duration-200 cursor-pointer text-left ${isSelected ? "bg-blue-50 border-l-2 border-l-blue-500" : "hover:bg-gray-50 border-l-2 border-l-transparent"}`}
                            >
                                <div className="relative shrink-0">
                                    <Avatar className="h-10 w-10">
                                        {user.image && <AvatarImage src={user.image} />}
                                        <AvatarFallback className="text-xs font-bold text-white bg-gradient-to-br from-blue-500 to-blue-700">{getInitials(user.name)}</AvatarFallback>
                                    </Avatar>
                                    <Circle size={10} className={`absolute -bottom-0.5 -right-0.5 ${user.isOnline ? "fill-emerald-500 text-emerald-500" : "fill-gray-300 text-gray-300"}`} strokeWidth={2} stroke="white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm truncate ${user.unreadCount > 0 ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>{user.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <p className={`text-xs truncate ${user.unreadCount > 0 ? "text-gray-600 font-medium" : "text-gray-400"}`}>
                                            {user.isOnline ? <span className="text-emerald-500">Online</span> : "Offline"}
                                        </p>
                                        {user.unreadCount > 0 && (
                                            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center shrink-0 ml-2 animate-pulse">{user.unreadCount}</span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* ── Right: Chat Area ── */}
            <div className={`flex-1 flex flex-col ${!selectedUserId ? "hidden md:flex" : "flex"}`}>
                {selectedUser ? (
                    <>
                        {/* Header */}
                        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
                            <button onClick={() => setSelectedUserId(null)} className="md:hidden text-gray-400 hover:text-gray-600 cursor-pointer"><ChevronLeft size={18} /></button>
                            <div className="relative">
                                <Avatar className="h-9 w-9">
                                    {selectedUser.image && <AvatarImage src={selectedUser.image} />}
                                    <AvatarFallback className="text-xs font-bold text-white bg-gradient-to-br from-blue-500 to-blue-700">{getInitials(selectedUser.name)}</AvatarFallback>
                                </Avatar>
                                <Circle size={8} className={`absolute bottom-0 right-0 ${selectedUser.isOnline ? "fill-emerald-500 text-emerald-500" : "fill-gray-300 text-gray-300"}`} strokeWidth={2} stroke="white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900">{selectedUser.name}</p>
                                <p className="text-[10px]">{selectedUser.isOnline ? <span className="text-emerald-500 font-medium">Online</span> : <span className="text-gray-400">Offline</span>}</p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5" style={{ background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)" }}>
                            {loadingMessages ? (
                                <div className="flex flex-col gap-3 pt-2">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                                            <div className={`h-8 rounded-2xl animate-pulse bg-gray-200 ${i % 2 === 0 ? "w-48" : "w-36"}`} />
                                        </div>
                                    ))}
                                </div>
                            ) : conversationMessages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                                        <MessageCircle size={28} className="text-blue-200" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-500">Nenhuma mensagem ainda</p>
                                    <p className="text-xs mt-1 text-gray-400">Envie a primeira mensagem para {selectedUser.name}</p>
                                </div>
                            ) : (
                                <>
                                    {conversationMessages.map((msg: ChatMsg, i: number) => {
                                        const isMine = msg.senderId === currentUserId
                                        const prevMsg = i > 0 ? conversationMessages[i - 1] : null
                                        const showTime = !prevMsg || msg.senderId !== prevMsg.senderId ||
                                            new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 300000

                                        return (
                                            <div key={msg.id} className="animate-[fadeIn_0.2s_ease-out]">
                                                {showTime && (
                                                    <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1 mt-4`}>
                                                        <span className="text-[10px] text-gray-400 bg-white/60 px-2 py-0.5 rounded-full">{formatMessageTime(msg.createdAt)}</span>
                                                    </div>
                                                )}
                                                <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-0.5`}>
                                                    <div className="group flex items-center gap-1.5 max-w-[75%]">
                                                        {isMine && (
                                                            <button onClick={() => { setReplyTo(msg); inputRef.current?.focus() }} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-blue-500 cursor-pointer transition-all duration-200 hover:scale-110" title="Responder"><Reply size={13} /></button>
                                                        )}
                                                        <div className={`px-3.5 py-2 text-[13px] leading-relaxed shadow-sm transition-all duration-200 ${
                                                            isMine
                                                                ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md"
                                                                : "bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-bl-md"
                                                        }`}>
                                                            {/* Reply quote */}
                                                            {msg.replyTo && (
                                                                <div className={`mb-1.5 px-2.5 py-1.5 rounded-lg border-l-2 text-[11px] ${
                                                                    isMine
                                                                        ? "bg-blue-400/30 border-blue-300/60 text-blue-100"
                                                                        : "bg-gray-50 border-blue-400 text-gray-500"
                                                                }`}>
                                                                    <p className={`font-semibold text-[10px] mb-0.5 ${isMine ? "text-blue-200" : "text-blue-500"}`}>{getReplyAuthorName(msg.replyTo.senderId)}</p>
                                                                    <p className="truncate">{msg.replyTo.content}</p>
                                                                </div>
                                                            )}
                                                            {/* Attachments */}
                                                            {msg.attachments && msg.attachments.length > 0 && (
                                                                <div className="mb-1.5 space-y-1">
                                                                    {msg.attachments.map((att) => (
                                                                        isImage(att.fileType) ? (
                                                                            <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className="block">
                                                                                <img src={att.url} alt={att.fileName} className="max-w-[240px] max-h-[200px] rounded-lg object-cover" />
                                                                            </a>
                                                                        ) : (
                                                                            <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${isMine ? "bg-blue-400/30 hover:bg-blue-400/40" : "bg-gray-50 hover:bg-gray-100"} transition-colors`}>
                                                                                <FileText size={14} className={isMine ? "text-blue-200" : "text-gray-400"} />
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className={`text-[11px] font-medium truncate ${isMine ? "text-blue-100" : "text-gray-700"}`}>{att.fileName}</p>
                                                                                    <p className={`text-[9px] ${isMine ? "text-blue-200/70" : "text-gray-400"}`}>{formatFileSize(att.fileSize)}</p>
                                                                                </div>
                                                                                <Download size={12} className={isMine ? "text-blue-200" : "text-gray-400"} />
                                                                            </a>
                                                                        )
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {msg.content && <span className="whitespace-pre-wrap break-words">{msg.content}</span>}
                                                        </div>
                                                        {!isMine && (
                                                            <button onClick={() => { setReplyTo(msg); inputRef.current?.focus() }} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-blue-500 cursor-pointer transition-all duration-200 hover:scale-110" title="Responder"><Reply size={13} /></button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="bg-white border-t border-gray-200 px-4 py-3">
                            <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" multiple className="hidden" onChange={handleFileUpload} />

                            {/* Reply preview */}
                            {replyTo && (
                                <div className="flex items-center gap-2 mb-2.5 px-3 py-2 bg-blue-50/80 rounded-xl border-l-3 border-blue-500 animate-[slideDown_0.2s_ease-out]">
                                    <Reply size={14} className="text-blue-500 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-semibold text-blue-600 mb-0.5">{getReplyAuthorName(replyTo.senderId)}</p>
                                        <p className="text-xs text-gray-600 truncate">{replyTo.content}</p>
                                    </div>
                                    <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer shrink-0 hover:bg-gray-200/50 rounded-full p-0.5 transition-colors"><X size={14} /></button>
                                </div>
                            )}

                            {/* Pending files preview */}
                            {pendingFiles.length > 0 && (
                                <div className="flex gap-2 mb-2.5 overflow-x-auto pb-1">
                                    {pendingFiles.map((f, idx) => (
                                        <div key={idx} className="relative shrink-0 group/file">
                                            {isImage(f.fileType) ? (
                                                <img src={f.url} alt={f.fileName} className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                                            ) : (
                                                <div className="w-16 h-16 rounded-lg bg-gray-50 border border-gray-200 flex flex-col items-center justify-center">
                                                    <FileText size={16} className="text-gray-400" />
                                                    <span className="text-[8px] text-gray-400 mt-1 truncate max-w-14 px-1">{f.fileName}</span>
                                                </div>
                                            )}
                                            <button onClick={() => removePendingFile(idx)} className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/file:opacity-100 transition-opacity cursor-pointer"><X size={8} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all cursor-pointer" title="Anexar arquivo">
                                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                                </button>
                                <Input
                                    ref={inputRef}
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Digite uma mensagem..."
                                    className="flex-1 h-10 rounded-full bg-gray-50 border-gray-200 px-4 text-sm focus:bg-white transition-colors"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!newMessage.trim() && pendingFiles.length === 0}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                                        (newMessage.trim() || pendingFiles.length > 0)
                                            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 scale-100 hover:scale-105"
                                            : "bg-gray-100 text-gray-300"
                                    }`}
                                >
                                    <Send size={16} className={newMessage.trim() || pendingFiles.length > 0 ? "translate-x-[1px]" : ""} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-4">
                            <MessageCircle size={32} className="text-blue-300" />
                        </div>
                        <h2 className="text-sm font-semibold text-gray-600 mb-1">Chat Interno</h2>
                        <p className="text-xs text-gray-400 text-center max-w-xs">Selecione uma conversa para começar a trocar mensagens com sua equipe</p>
                    </div>
                )}
            </div>

            {/* Animation keyframes */}
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}
