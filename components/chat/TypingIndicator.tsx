"use client"

import React from "react"

interface TypingUser {
    userId: string
    userName: string
}

interface TypingIndicatorProps {
    typingUsers: TypingUser[]
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
    if (typingUsers.length === 0) return null

    const getTypingText = () => {
        if (typingUsers.length === 1) {
            return `${typingUsers[0].userName} está digitando`
        }
        if (typingUsers.length === 2) {
            return `${typingUsers[0].userName} e ${typingUsers[1].userName} estão digitando`
        }
        return `${typingUsers[0].userName} e mais ${typingUsers.length - 1} estão digitando`
    }

    return (
        <div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500">
            <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span>{getTypingText()}</span>
        </div>
    )
}
