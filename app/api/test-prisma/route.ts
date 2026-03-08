import { NextResponse } from "next/server"
import { prisma } from "@/app/utils/prisma"

export async function GET() {
    try {
        // Testar conexão com prisma
        const userCount = await prisma.user.count()
        const channelCount = await prisma.chatChannel.count()
        
        return NextResponse.json({
            success: true,
            data: {
                userCount,
                channelCount,
                prismaConnected: true
            }
        })
    } catch (error) {
        console.error("Prisma test error:", error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            prismaConnected: false
        }, { status: 500 })
    }
}
