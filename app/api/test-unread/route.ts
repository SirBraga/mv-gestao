import { getUnreadCount } from "@/app/actions/chat"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const count = await getUnreadCount()
        return NextResponse.json({ 
            success: true, 
            unreadCount: count,
            message: count > 0 ? `Você tem ${count} mensagens não lidas` : "Nenhuma mensagem não lida"
        })
    } catch (error) {
        console.error("Erro ao buscar unread count:", error)
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : "Erro desconhecido"
        }, { status: 500 })
    }
}
