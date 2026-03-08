import { NextResponse } from "next/server"
import { getUnreadCount, getUserChannels } from "@/app/actions/chat"

export async function GET() {
    try {
        // Testar as funções de chat
        const unreadCount = await getUnreadCount()
        const channels = await getUserChannels()
        
        return NextResponse.json({
            success: true,
            data: {
                unreadCount,
                channels: channels.channels.length,
                currentUserId: channels.currentUserId,
                functionsWorking: true
            }
        })
    } catch (error) {
        console.error("Chat test error:", error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 })
    }
}
