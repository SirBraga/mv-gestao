"use server"

import { prisma } from "@/app/utils/prisma"
import { auth } from "@/app/utils/auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { cache } from "react"
import { sendPushToUser } from "@/app/utils/push"
import { getAblyServer, CHAT_EVENTS, getChannelName } from "@/app/utils/ably"
import { ChannelType, MessageType, MemberRole } from "@/app/generated/prisma/enums"

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface ChatUserResult {
    id: string
    name: string
    email: string
    image: string | null
    onlineStatus: { isOnline: boolean; lastSeen: Date } | null
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const getSession = cache(async () => {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) throw new Error("Não autenticado")
    return session
})

// Publicar evento no Ably
async function publishToChannel(channelId: string, event: string, data: unknown) {
    try {
        const ably = getAblyServer()
        const channel = ably.channels.get(getChannelName(channelId))
        await channel.publish(event, data)
    } catch (error) {
        console.error("Erro ao publicar no Ably:", error)
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// CHANNELS
// ══════════════════════════════════════════════════════════════════════════════

// Criar canal de chat
export async function createChannel(data: {
    name: string
    description?: string
    type: ChannelType
    memberIds: string[]
}) {
    const session = await getSession()
    
    const channel = await prisma.chatChannel.create({
        data: {
            name: data.name,
            description: data.description,
            type: data.type,
            createdById: session.user.id,
            members: {
                create: [
                    { userId: session.user.id, role: MemberRole.OWNER },
                    ...data.memberIds.map(id => ({ userId: id, role: MemberRole.MEMBER })),
                ],
            },
        },
        include: {
            members: {
                include: { user: { select: { id: true, name: true, image: true } } },
            },
        },
    })
    
    revalidatePath("/dashboard/chat")
    return channel
}

// Criar ou obter canal direto entre dois usuários
export async function getOrCreateDirectChannel(otherUserId: string) {
    const session = await getSession()
    
    // Buscar canal direto existente entre os dois usuários
    const existingChannel = await prisma.chatChannel.findFirst({
        where: {
            type: ChannelType.DIRECT,
            AND: [
                { members: { some: { userId: session.user.id } } },
                { members: { some: { userId: otherUserId } } },
            ],
        },
        include: {
            members: {
                include: { user: { select: { id: true, name: true, image: true, onlineStatus: true } } },
            },
        },
    })
    
    if (existingChannel) return existingChannel
    
    // Buscar nome do outro usuário
    const otherUser = await prisma.user.findUnique({
        where: { id: otherUserId },
        select: { name: true },
    })
    
    // Criar novo canal direto
    const channel = await prisma.chatChannel.create({
        data: {
            name: otherUser?.name || "Chat Direto",
            type: ChannelType.DIRECT,
            createdById: session.user.id,
            members: {
                create: [
                    { userId: session.user.id, role: MemberRole.MEMBER },
                    { userId: otherUserId, role: MemberRole.MEMBER },
                ],
            },
        },
        include: {
            members: {
                include: { user: { select: { id: true, name: true, image: true, onlineStatus: true } } },
            },
        },
    })
    
    return channel
}

// Listar canais do usuário
export async function getUserChannels() {
    const session = await getSession()

    const channels = await prisma.chatChannel.findMany({
        where: {
            members: { some: { userId: session.user.id } },
        },
        select: {
            id: true,
            name: true,
            type: true,
            updatedAt: true,
            members: {
                select: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                            onlineStatus: true,
                        },
                    },
                },
            },
            messages: {
                where: { isDeleted: false },
                orderBy: { createdAt: "desc" },
                take: 1,
                select: {
                    content: true,
                    type: true,
                    createdAt: true,
                    senderId: true,
                },
            },
        },
        orderBy: { updatedAt: "desc" },
    })

    const channelsWithMetadata = channels.map(channel => ({
        ...channel,
        members: channel.members.map((member) => ({
            id: `${channel.id}:${member.user.id}`,
            userId: member.user.id,
            user: member.user,
        })),
        unreadCount: 0,
    }))

    return { channels: channelsWithMetadata, currentUserId: session.user.id }
}

// Obter detalhes do canal
export async function getChannel(channelId: string) {
    const session = await getSession()
    
    const channel = await prisma.chatChannel.findFirst({
        where: {
            id: channelId,
            members: { some: { userId: session.user.id } },
        },
        include: {
            members: {
                include: { user: { select: { id: true, name: true, image: true, onlineStatus: true } } },
            },
        },
    })
    
    if (!channel) throw new Error("Canal não encontrado")
    
    return { channel, currentUserId: session.user.id }
}

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGES
// ══════════════════════════════════════════════════════════════════════════════

// Buscar mensagens de um canal
export async function getChannelMessages(channelId: string, cursor?: string, limit = 50) {
    const session = await getSession()
    
    // Verificar se usuário é membro do canal
    const member = await prisma.channelMember.findUnique({
        where: { channelId_userId: { channelId, userId: session.user.id } },
    })
    
    if (!member) throw new Error("Você não é membro deste canal")
    
    const messages = await prisma.chatMessage.findMany({
        where: { channelId, isDeleted: false },
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            content: true,
            type: true,
            mediaUrl: true,
            mediaType: true,
            fileName: true,
            fileSize: true,
            isEdited: true,
            createdAt: true,
            senderId: true,
            sender: { select: { id: true, name: true, image: true } },
            replyToId: true,
            replyTo: {
                select: {
                    id: true,
                    content: true,
                    senderId: true,
                    sender: { select: { id: true, name: true } },
                },
            },
            attachments: {
                select: { id: true, url: true, fileName: true, fileType: true, fileSize: true },
            },
        },
    })
    
    const hasMore = messages.length > limit
    const items = hasMore ? messages.slice(0, -1) : messages
    
    // Atualizar lastReadAt
    await prisma.channelMember.update({
        where: { channelId_userId: { channelId, userId: session.user.id } },
        data: { lastReadAt: new Date() },
    })
    
    return {
        messages: items.reverse(),
        nextCursor: hasMore ? items[0]?.id : null,
        currentUserId: session.user.id,
    }
}

// Enviar mensagem
export async function sendChannelMessage(data: {
    channelId: string
    content: string
    type?: MessageType
    mediaUrl?: string
    mediaType?: string
    fileName?: string
    fileSize?: number
    replyToId?: string
    attachments?: { url: string; fileName: string; fileType: string; fileSize: number }[]
}) {
    const session = await getSession()
    
    // Verificar se usuário é membro do canal
    const member = await prisma.channelMember.findUnique({
        where: { channelId_userId: { channelId: data.channelId, userId: session.user.id } },
    })
    
    if (!member) throw new Error("Você não é membro deste canal")
    
    if (!data.content.trim() && !data.mediaUrl && (!data.attachments || data.attachments.length === 0)) {
        throw new Error("Mensagem vazia")
    }
    
    const message = await prisma.chatMessage.create({
        data: {
            channelId: data.channelId,
            senderId: session.user.id,
            content: data.content.trim(),
            type: data.type || MessageType.TEXT,
            mediaUrl: data.mediaUrl,
            mediaType: data.mediaType,
            fileName: data.fileName,
            fileSize: data.fileSize,
            replyToId: data.replyToId,
            attachments: data.attachments && data.attachments.length > 0
                ? { create: data.attachments.map(a => ({ url: a.url, fileName: a.fileName, fileType: a.fileType, fileSize: a.fileSize })) }
                : undefined,
        },
        select: {
            id: true,
            content: true,
            type: true,
            mediaUrl: true,
            mediaType: true,
            fileName: true,
            fileSize: true,
            isEdited: true,
            createdAt: true,
            senderId: true,
            sender: { select: { id: true, name: true, image: true } },
            replyToId: true,
            replyTo: {
                select: {
                    id: true,
                    content: true,
                    senderId: true,
                    sender: { select: { id: true, name: true } },
                },
            },
            attachments: {
                select: { id: true, url: true, fileName: true, fileType: true, fileSize: true },
            },
        },
    })
    
    // Atualizar timestamp do canal
    await prisma.chatChannel.update({
        where: { id: data.channelId },
        data: { updatedAt: new Date() },
    })
    
    // Publicar no Ably
    await publishToChannel(data.channelId, CHAT_EVENTS.MESSAGE_NEW, message)
    
    // Enviar push para outros membros
    const otherMembers = await prisma.channelMember.findMany({
        where: { channelId: data.channelId, userId: { not: session.user.id } },
        select: { userId: true },
    })
    
    for (const m of otherMembers) {
        void sendPushToUser(m.userId, {
            title: `💬 ${session.user.name}`,
            body: data.content.trim() || "Enviou um arquivo",
            url: `/dashboard/chat/${data.channelId}`,
            tag: `chat-${data.channelId}`,
        })
    }
    
    return message
}

// Editar mensagem
export async function editMessage(messageId: string, content: string) {
    const session = await getSession()
    
    const message = await prisma.chatMessage.findUnique({
        where: { id: messageId },
        select: { senderId: true, channelId: true },
    })
    
    if (!message) throw new Error("Mensagem não encontrada")
    if (message.senderId !== session.user.id) throw new Error("Você não pode editar esta mensagem")
    
    const updated = await prisma.chatMessage.update({
        where: { id: messageId },
        data: { content: content.trim(), isEdited: true },
        select: {
            id: true,
            content: true,
            type: true,
            isEdited: true,
            createdAt: true,
            senderId: true,
            sender: { select: { id: true, name: true, image: true } },
        },
    })
    
    // Publicar no Ably
    await publishToChannel(message.channelId, CHAT_EVENTS.MESSAGE_UPDATE, updated)
    
    return updated
}

// Deletar mensagem
export async function deleteMessage(messageId: string) {
    const session = await getSession()
    
    const message = await prisma.chatMessage.findUnique({
        where: { id: messageId },
        select: { senderId: true, channelId: true },
    })
    
    if (!message) throw new Error("Mensagem não encontrada")
    if (message.senderId !== session.user.id) throw new Error("Você não pode deletar esta mensagem")
    
    await prisma.chatMessage.update({
        where: { id: messageId },
        data: { isDeleted: true, content: "" },
    })
    
    // Publicar no Ably
    await publishToChannel(message.channelId, CHAT_EVENTS.MESSAGE_DELETE, { id: messageId })
    
    return { success: true }
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPING INDICATORS
// ══════════════════════════════════════════════════════════════════════════════

// Enviar indicador de digitação
export async function sendTypingIndicator(channelId: string, isTyping: boolean) {
    const session = await getSession()
    
    const event = isTyping ? CHAT_EVENTS.TYPING_START : CHAT_EVENTS.TYPING_STOP
    await publishToChannel(channelId, event, {
        userId: session.user.id,
        userName: session.user.name,
    })
    
    return { success: true }
}

// ══════════════════════════════════════════════════════════════════════════════
// PRESENCE / ONLINE STATUS
// ══════════════════════════════════════════════════════════════════════════════

// Atualizar status online/offline
export async function updateOnlineStatus(isOnline: boolean) {
    const session = await getSession()
    await prisma.userStatus.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id, isOnline, lastSeen: new Date() },
        update: { isOnline, lastSeen: new Date() },
    })
}

// ══════════════════════════════════════════════════════════════════════════════
// USERS
// ══════════════════════════════════════════════════════════════════════════════

// Listar todos os usuários (para iniciar conversas)
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

    return (users as ChatUserResult[]).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        isOnline: u.onlineStatus?.isOnline ?? false,
        lastSeen: u.onlineStatus?.lastSeen?.toISOString() ?? null,
    }))
}

// ══════════════════════════════════════════════════════════════════════════════
// UNREAD COUNT
// ══════════════════════════════════════════════════════════════════════════════

// Contar mensagens não lidas
// Nota: Retorna 0 pois mensagens estão no Ably, não no banco
// Badges são gerenciados via lastReadAt quando o usuário abre o chat
export async function getUnreadCount() {
    // Simplificado - badges atualizam quando usuário abre o chat
    return 0
}

// ══════════════════════════════════════════════════════════════════════════════
// ABLY TOKEN
// ══════════════════════════════════════════════════════════════════════════════

// Marcar canal como lido
export async function markChannelAsRead(channelId: string) {
    const session = await getSession()
    
    await prisma.channelMember.update({
        where: { 
            channelId_userId: { 
                channelId, 
                userId: session.user.id 
            } 
        },
        data: { lastReadAt: new Date() },
    })
    
    // Invalidar cache
    revalidatePath("/dashboard/chat")
    revalidatePath(`/dashboard/chat/${channelId}`)
}

// Gerar token de autenticação para o Ably (client-side)
export async function getAblyToken() {
    const session = await getSession()
    
    const ably = getAblyServer()
    const tokenRequest = await ably.auth.createTokenRequest({
        clientId: session.user.id,
    })
    
    return tokenRequest
}
