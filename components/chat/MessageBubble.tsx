"use client"

import React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Reply, MoreVertical, Pencil, Trash2, Download, FileText, Image as ImageIcon, Video, Music } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

interface MessageBubbleProps {
    message: Message
    isOwn: boolean
    onReply?: (message: Message) => void
    onEdit?: (message: Message) => void
    onDelete?: (messageId: string) => void
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileType: string) {
    if (fileType.startsWith("image/")) return <ImageIcon size={20} />
    if (fileType.startsWith("video/")) return <Video size={20} />
    if (fileType.startsWith("audio/")) return <Music size={20} />
    return <FileText size={20} />
}

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

export function MessageBubble({ message, isOwn, onReply, onEdit, onDelete }: MessageBubbleProps) {
    const createdAt = typeof message.createdAt === "string" ? new Date(message.createdAt) : message.createdAt

    return (
        <div className={`flex gap-2 group ${isOwn ? "flex-row-reverse" : ""}`}>
            {/* Avatar */}
            {!isOwn && (
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-medium shrink-0">
                    {message.sender.image ? (
                        <img src={message.sender.image} alt={message.sender.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        getInitials(message.sender.name)
                    )}
                </div>
            )}

            {/* Message Content */}
            <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
                {/* Sender name (only for others) */}
                {!isOwn && (
                    <span className="text-xs text-slate-500 mb-1 block">{message.sender.name}</span>
                )}

                {/* Reply preview */}
                {message.replyTo && (
                    <div className={`text-xs px-3 py-1.5 rounded-t-lg border-l-2 mb-0.5 ${isOwn ? "bg-indigo-100 border-indigo-400 text-indigo-700" : "bg-slate-100 border-slate-400 text-slate-600"}`}>
                        <span className="font-medium">{message.replyTo.sender.name}</span>
                        <p className="truncate opacity-80">{message.replyTo.content}</p>
                    </div>
                )}

                {/* Bubble */}
                <div className={`relative rounded-2xl px-4 py-2 ${isOwn ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-slate-100 text-slate-800 rounded-tl-sm"}`}>
                    {/* Media content */}
                    {message.type === "IMAGE" && message.mediaUrl && (
                        <div className="mb-2">
                            <img
                                src={message.mediaUrl}
                                alt={message.fileName || "Imagem"}
                                className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(message.mediaUrl!, "_blank")}
                            />
                        </div>
                    )}

                    {message.type === "VIDEO" && message.mediaUrl && (
                        <div className="mb-2">
                            <video
                                src={message.mediaUrl}
                                controls
                                className="max-w-full rounded-lg"
                            />
                        </div>
                    )}

                    {message.type === "AUDIO" && message.mediaUrl && (
                        <div className="mb-2">
                            <audio src={message.mediaUrl} controls className="w-full" />
                        </div>
                    )}

                    {message.type === "FILE" && message.mediaUrl && (
                        <a
                            href={message.mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 p-2 rounded-lg mb-2 ${isOwn ? "bg-indigo-500 hover:bg-indigo-400" : "bg-slate-200 hover:bg-slate-300"} transition-colors`}
                        >
                            {getFileIcon(message.mediaType || "")}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{message.fileName}</p>
                                {message.fileSize && (
                                    <p className={`text-xs ${isOwn ? "text-indigo-200" : "text-slate-500"}`}>
                                        {formatFileSize(message.fileSize)}
                                    </p>
                                )}
                            </div>
                            <Download size={16} />
                        </a>
                    )}

                    {/* Attachments */}
                    {message.attachments.length > 0 && (
                        <div className="space-y-1 mb-2">
                            {message.attachments.map((attachment) => (
                                <a
                                    key={attachment.id}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 p-2 rounded-lg ${isOwn ? "bg-indigo-500 hover:bg-indigo-400" : "bg-slate-200 hover:bg-slate-300"} transition-colors`}
                                >
                                    {getFileIcon(attachment.fileType)}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                                        <p className={`text-xs ${isOwn ? "text-indigo-200" : "text-slate-500"}`}>
                                            {formatFileSize(attachment.fileSize)}
                                        </p>
                                    </div>
                                    <Download size={16} />
                                </a>
                            ))}
                        </div>
                    )}

                    {/* Text content */}
                    {message.content && (
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    )}

                    {/* Actions menu */}
                    <div className={`absolute top-1 ${isOwn ? "left-0 -translate-x-full" : "right-0 translate-x-full"} opacity-0 group-hover:opacity-100 transition-opacity`}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded hover:bg-slate-200 text-slate-500">
                                    <MoreVertical size={14} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isOwn ? "start" : "end"}>
                                {onReply && (
                                    <DropdownMenuItem onClick={() => onReply(message)}>
                                        <Reply size={14} className="mr-2" /> Responder
                                    </DropdownMenuItem>
                                )}
                                {isOwn && onEdit && (
                                    <DropdownMenuItem onClick={() => onEdit(message)}>
                                        <Pencil size={14} className="mr-2" /> Editar
                                    </DropdownMenuItem>
                                )}
                                {isOwn && onDelete && (
                                    <DropdownMenuItem onClick={() => onDelete(message.id)} className="text-red-600">
                                        <Trash2 size={14} className="mr-2" /> Excluir
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Timestamp and edited indicator */}
                <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? "justify-end" : "justify-start"}`}>
                    <span className="text-[10px] text-slate-400">
                        {format(createdAt, "HH:mm", { locale: ptBR })}
                    </span>
                    {message.isEdited && (
                        <span className="text-[10px] text-slate-400">(editado)</span>
                    )}
                </div>
            </div>
        </div>
    )
}
