"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { Send, Paperclip, X, Image as ImageIcon, FileText, Smile } from "lucide-react"
import { uploadFile } from "@/app/utils/upload"
import { toast } from "react-toastify"

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface ReplyTo {
    id: string
    content: string
    sender: { id: string; name: string }
}

interface Attachment {
    url: string
    fileName: string
    fileType: string
    fileSize: number
}

interface MessageInputProps {
    onSend: (data: {
        content: string
        replyToId?: string
        attachments?: Attachment[]
        mediaUrl?: string
        mediaType?: string
        fileName?: string
        fileSize?: number
        type?: string
    }) => void
    onTyping?: (isTyping: boolean) => void
    replyTo?: ReplyTo | null
    onCancelReply?: () => void
    disabled?: boolean
    placeholder?: string
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function MessageInput({
    onSend,
    onTyping,
    replyTo,
    onCancelReply,
    disabled = false,
    placeholder = "Digite uma mensagem...",
}: MessageInputProps) {
    const [message, setMessage] = useState("")
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [uploading, setUploading] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
        }
    }, [message])

    // Focus on reply
    useEffect(() => {
        if (replyTo && textareaRef.current) {
            textareaRef.current.focus()
        }
    }, [replyTo])

    // Handle typing indicator
    const handleTyping = useCallback(() => {
        if (onTyping) {
            onTyping(true)

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }

            typingTimeoutRef.current = setTimeout(() => {
                onTyping(false)
            }, 2000)
        }
    }, [onTyping])

    // Handle message change
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(e.target.value)
        handleTyping()
    }

    // Handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setUploading(true)

        try {
            for (const file of Array.from(files)) {
                const result = await uploadFile(file)
                setAttachments((prev) => [
                    ...prev,
                    {
                        url: result.url,
                        fileName: result.fileName,
                        fileType: result.fileType,
                        fileSize: result.fileSize,
                    },
                ])
            }
        } catch (error) {
            console.error("Erro ao fazer upload:", error)
            toast.error("Erro ao fazer upload do arquivo")
        } finally {
            setUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    // Remove attachment
    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index))
    }

    // Handle send
    const handleSend = () => {
        if ((!message.trim() && attachments.length === 0) || disabled) return

        // Determine message type based on attachments
        let type = "TEXT"
        let mediaUrl: string | undefined
        let mediaType: string | undefined
        let fileName: string | undefined
        let fileSize: number | undefined

        if (attachments.length === 1 && !message.trim()) {
            const attachment = attachments[0]
            if (attachment.fileType.startsWith("image/")) {
                type = "IMAGE"
            } else if (attachment.fileType.startsWith("video/")) {
                type = "VIDEO"
            } else if (attachment.fileType.startsWith("audio/")) {
                type = "AUDIO"
            } else {
                type = "FILE"
            }
            mediaUrl = attachment.url
            mediaType = attachment.fileType
            fileName = attachment.fileName
            fileSize = attachment.fileSize
        }

        onSend({
            content: message.trim(),
            replyToId: replyTo?.id,
            attachments: attachments.length > 0 && type === "TEXT" ? attachments : undefined,
            mediaUrl,
            mediaType,
            fileName,
            fileSize,
            type,
        })

        setMessage("")
        setAttachments([])
        if (onCancelReply) onCancelReply()
        if (onTyping) onTyping(false)

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"
        }
    }

    // Handle key press
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="border-t border-slate-200 bg-white p-4">
            {/* Reply preview */}
            {replyTo && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-slate-100 rounded-lg">
                    <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-indigo-600">
                            Respondendo a {replyTo.sender.name}
                        </span>
                        <p className="text-xs text-slate-500 truncate">{replyTo.content}</p>
                    </div>
                    <button
                        onClick={onCancelReply}
                        className="p-1 rounded hover:bg-slate-200 text-slate-400"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Attachments preview */}
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {attachments.map((attachment, index) => (
                        <div
                            key={index}
                            className="relative group flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg"
                        >
                            {attachment.fileType.startsWith("image/") ? (
                                <ImageIcon size={16} className="text-slate-500" />
                            ) : (
                                <FileText size={16} className="text-slate-500" />
                            )}
                            <span className="text-xs text-slate-600 max-w-[100px] truncate">
                                {attachment.fileName}
                            </span>
                            <button
                                onClick={() => removeAttachment(index)}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input area */}
            <div className="flex items-center gap-2">
                {/* Attachment button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || disabled}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-500 disabled:opacity-50 transition-colors"
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

                {/* Text input */}
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        disabled={disabled || uploading}
                        rows={1}
                        className="w-full px-4 py-2.5 bg-slate-100 rounded-2xl resize-none text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    />
                </div>

                {/* Emoji button (placeholder) */}
                <button
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                    title="Emojis (em breve)"
                >
                    <Smile size={20} />
                </button>

                {/* Send button */}
                <button
                    onClick={handleSend}
                    disabled={(!message.trim() && attachments.length === 0) || disabled || uploading}
                    className="p-2.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send size={18} />
                </button>
            </div>

            {/* Uploading indicator */}
            {uploading && (
                <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    Enviando arquivo...
                </div>
            )}
        </div>
    )
}
