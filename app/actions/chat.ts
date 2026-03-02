"use server"

import { prisma } from "@/app/utils/prisma"
import { auth } from "@/app/utils/auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

interface ChatUserResult {
    id: string
    name: string
    email: string
    image: string | null
    onlineStatus: { isOnline: boolean; lastSeen: Date } | null
}

async function getSession() {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) throw new Error("Não autenticado")
    return session
}

// Listar todos os usuários (para lista de conversas)
export async function getChatUsers() {
    const session = await getSession()
    const users = await prisma.user.findMany({
        where: { id: { not: session.user.id } },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            onlineStatus: { select: { isOnline: true, lastSeen: true } },
        },
        orderBy: { name: "asc" },
    })

    // Contar mensagens não lidas por remetente
    const unreadCounts = await prisma.chatMessage.groupBy({
        by: ["senderId"],
        where: { receiverId: session.user.id, read: false },
        _count: { id: true },
    })

    const unreadMap = new Map(unreadCounts.map((u: { senderId: string; _count: { id: number } }) => [u.senderId, u._count.id]))

    return (users as ChatUserResult[]).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        isOnline: u.onlineStatus?.isOnline ?? false,
        lastSeen: u.onlineStatus?.lastSeen?.toISOString() ?? null,
        unreadCount: unreadMap.get(u.id) ?? 0,
    }))
}

// Buscar mensagens de uma conversa
export async function getMessages(otherUserId: string) {
    const session = await getSession()
    const messages = await prisma.chatMessage.findMany({
        where: {
            OR: [
                { senderId: session.user.id, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: session.user.id },
            ],
        },
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            senderId: true,
            receiverId: true,
            content: true,
            read: true,
            createdAt: true,
            replyToId: true,
            replyTo: {
                select: {
                    id: true,
                    content: true,
                    senderId: true,
                },
            },
            attachments: {
                select: {
                    id: true,
                    url: true,
                    fileName: true,
                    fileType: true,
                    fileSize: true,
                },
            },
        },
    })

    // Marcar como lidas as mensagens recebidas
    await prisma.chatMessage.updateMany({
        where: {
            senderId: otherUserId,
            receiverId: session.user.id,
            read: false,
        },
        data: { read: true },
    })

    return { messages, currentUserId: session.user.id }
}

// Enviar mensagem
export async function sendMessage(receiverId: string, content: string, replyToId?: string | null, attachments?: { url: string; fileName: string; fileType: string; fileSize: number }[]) {
    const session = await getSession()
    if (!content.trim() && (!attachments || attachments.length === 0)) return null

    const message = await prisma.chatMessage.create({
        data: {
            senderId: session.user.id,
            receiverId,
            content: content.trim(),
            replyToId: replyToId || null,
            attachments: attachments && attachments.length > 0
                ? { create: attachments.map(a => ({ url: a.url, fileName: a.fileName, fileType: a.fileType, fileSize: a.fileSize })) }
                : undefined,
        },
        select: {
            id: true,
            senderId: true,
            receiverId: true,
            content: true,
            read: true,
            createdAt: true,
            replyToId: true,
            replyTo: { select: { id: true, content: true, senderId: true } },
            attachments: { select: { id: true, url: true, fileName: true, fileType: true, fileSize: true } },
        },
    })

    revalidatePath("/dashboard/chat")
    return message
}

// Marcar mensagens como lidas
export async function markAsRead(senderId: string) {
    const session = await getSession()
    await prisma.chatMessage.updateMany({
        where: {
            senderId,
            receiverId: session.user.id,
            read: false,
        },
        data: { read: true },
    })
    revalidatePath("/dashboard/chat")
}

// Atualizar status online/offline
export async function updateOnlineStatus(isOnline: boolean) {
    const session = await getSession()
    await prisma.userStatus.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id, isOnline, lastSeen: new Date() },
        update: { isOnline, lastSeen: new Date() },
    })
}

// Buscar remetente + conteúdo da mensagem não lida mais recente
export async function getLatestUnreadMessage() {
    const session = await getSession()
    const msg = await prisma.chatMessage.findFirst({
        where: { receiverId: session.user.id, read: false },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            content: true,
            sender: { select: { id: true, name: true } },
        },
    })
    if (!msg) return null
    return {
        id: msg.id,
        content: msg.content,
        senderName: msg.sender.name,
    }
}

// Contar total de mensagens não lidas
export async function getUnreadCount() {
    const session = await getSession()
    const count = await prisma.chatMessage.count({
        where: { receiverId: session.user.id, read: false },
    })
    return count
}

// Buscar novas mensagens (polling)
export async function pollNewMessages(otherUserId: string, afterId?: string) {
    const session = await getSession()
    const where: Record<string, unknown> = {
        OR: [
            { senderId: session.user.id, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: session.user.id },
        ],
    }

    if (afterId) {
        const lastMsg = await prisma.chatMessage.findUnique({ where: { id: afterId } })
        if (lastMsg) {
            where.createdAt = { gt: lastMsg.createdAt }
        }
    }

    const messages = await prisma.chatMessage.findMany({
        where,
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            senderId: true,
            receiverId: true,
            content: true,
            read: true,
            createdAt: true,
        },
    })

    // Marcar como lidas
    await prisma.chatMessage.updateMany({
        where: {
            senderId: otherUserId,
            receiverId: session.user.id,
            read: false,
        },
        data: { read: true },
    })

    return { messages, currentUserId: session.user.id }
}
