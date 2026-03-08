import { NextRequest, NextResponse } from "next/server"

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ channelId: string }> }
) {
    try {
        const { channelId } = await context.params

        // Por enquanto, retornar null para evitar erros
        // TODO: Implementar busca real da última mensagem do Ably
        return NextResponse.json(null)
        
    } catch (error) {
        console.error("Error fetching last message:", error)
        return NextResponse.json({ error: "Failed to fetch last message" }, { status: 500 })
    }
}
