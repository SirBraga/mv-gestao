import { getUserChannels } from "@/app/actions/chat"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const result = await getUserChannels()
        return NextResponse.json({ 
            success: true, 
            channels: result.channels,
            currentUserId: result.currentUserId,
            summary: {
                totalChannels: result.channels.length,
                channelsWithMessages: result.channels.filter(c => c.messages && c.messages.length > 0).length,
                channelsWithUnread: result.channels.filter(c => c.unreadCount > 0).length,
                totalUnread: result.channels.reduce((sum, c) => sum + c.unreadCount, 0)
            }
        })
    } catch (error) {
        console.error("Erro ao buscar canais:", error)
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : "Erro desconhecido"
        }, { status: 500 })
    }
}
