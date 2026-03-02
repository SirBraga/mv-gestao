import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/utils/auth"
import { prisma } from "@/app/utils/prisma"
import { headers } from "next/headers"

export async function POST(req: NextRequest) {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const subscription = await req.json()
    if (!subscription?.endpoint) {
        return NextResponse.json({ error: "Subscription inválida" }, { status: 400 })
    }

    await prisma.user.update({
        where: { id: session.user.id },
        data: { pushSubscription: JSON.stringify(subscription) },
    })

    return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    await prisma.user.update({
        where: { id: session.user.id },
        data: { pushSubscription: null },
    })

    return NextResponse.json({ success: true })
}
