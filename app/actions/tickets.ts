"use server"

import { prisma } from "@/app/utils/prisma"
import { auth } from "@/app/utils/auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { createNotification } from "@/app/actions/notifications"
import { sendPushToUser } from "@/app/utils/push"

async function getSession() {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) throw new Error("Não autenticado")
    return session
}

export async function getTickets() {
    await getSession()
    const tickets = await prisma.tickets.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            client: { select: { name: true } },
            assignedTo: { select: { id: true, name: true } },
            requestedByContact: { select: { name: true } },
            requestedByContability: { select: { id: true } },
        },
    })
    return tickets.map(t => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        ticketDescription: t.ticketDescription,
        clientName: t.client.name,
        clientId: t.clientId,
        priority: (t.ticketPriority || "MEDIUM") as "LOW" | "MEDIUM" | "HIGH",
        status: (t.ticketStatus || "NOVO") as "NOVO" | "PENDING_CLIENT" | "PENDING_EMPRESS" | "IN_PROGRESS" | "CLOSED",
        assigneeName: t.assignedTo?.name || null,
        assigneeId: t.assignedTo?.id || null,
        requesterName: t.requestedByContact?.name || null,
        date: t.createdAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + t.createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        createdAt: t.createdAt.toISOString(),
    }))
}

export async function createTicket(data: {
    clientId: string
    ticketDescription: string
    ticketPriority: "LOW" | "MEDIUM" | "HIGH"
    ticketType?: "SUPPORT" | "SALES" | "FINANCE" | "MAINTENCE"
    requestedByContactId?: string
    requestedByContabilityId?: string
    assignedToId?: string
}) {
    const session = await getSession()
    const ticket = await prisma.tickets.create({
        data: {
            clientId: data.clientId,
            ticketDescription: data.ticketDescription,
            ticketPriority: data.ticketPriority,
            ticketType: data.ticketType || "SUPPORT",
            requestedByContactId: data.requestedByContactId || null,
            requestedByContabilityId: data.requestedByContabilityId || null,
            assignedToId: data.assignedToId || null,
            ticketStatus: data.assignedToId ? "IN_PROGRESS" : "NOVO",
        },
        select: { id: true, ticketNumber: true },
    })
    if (data.assignedToId && data.assignedToId !== session.user.id) {
        await createNotification({
            userId: data.assignedToId,
            title: `Ticket #${ticket.ticketNumber} atribuído a você`,
            message: data.ticketDescription.slice(0, 100),
            type: "TICKET_ASSIGNED",
            link: `/dashboard/tickets/${ticket.id}`,
        })
        await sendPushToUser(data.assignedToId, {
            title: `🎫 Ticket #${ticket.ticketNumber} atribuído a você`,
            body: data.ticketDescription.slice(0, 100),
            url: `/dashboard/tickets/${ticket.id}`,
            tag: `ticket-${ticket.id}`,
        })
    }
    revalidatePath("/dashboard/tickets")
    return { success: true, id: ticket.id }
}

export async function claimTicket(ticketId: string) {
    const session = await getSession()
    const ticket = await prisma.tickets.update({
        where: { id: ticketId },
        data: {
            assignedToId: session.user.id,
            ticketStatus: "IN_PROGRESS",
        },
        select: { ticketNumber: true },
    })
    revalidatePath("/dashboard/tickets")
    return { success: true }
}

export async function updateTicketStatus(ticketId: string, status: "NOVO" | "PENDING_CLIENT" | "PENDING_EMPRESS" | "IN_PROGRESS" | "CLOSED") {
    await getSession()
    const data: Record<string, unknown> = { ticketStatus: status }
    if (status === "CLOSED") {
        data.ticketResolutionDate = new Date()
    }
    await prisma.tickets.update({ where: { id: ticketId }, data })
    revalidatePath("/dashboard/tickets")
    return { success: true }
}

export async function assignTicket(ticketId: string, userId: string | null) {
    const session = await getSession()
    const ticket = await prisma.tickets.update({
        where: { id: ticketId },
        data: { assignedToId: userId },
        select: { ticketNumber: true, ticketDescription: true },
    })
    if (userId && userId !== session.user.id) {
        await createNotification({
            userId,
            title: `Ticket #${ticket.ticketNumber} atribuído a você`,
            message: ticket.ticketDescription.slice(0, 100),
            type: "TICKET_ASSIGNED",
            link: `/dashboard/tickets/${ticketId}`,
        })
        await sendPushToUser(userId, {
            title: `🎫 Ticket #${ticket.ticketNumber} atribuído a você`,
            body: ticket.ticketDescription.slice(0, 100),
            url: `/dashboard/tickets/${ticketId}`,
            tag: `ticket-${ticketId}`,
        })
    }
    revalidatePath("/dashboard/tickets")
    return { success: true }
}

export async function deleteTicket(ticketId: string) {
    await getSession()
    // Delete related apontamentos and comments first
    await prisma.apontamento.deleteMany({ where: { ticketId } })
    await prisma.ticketComment.deleteMany({ where: { ticketId } })
    await prisma.tickets.delete({ where: { id: ticketId } })
    revalidatePath("/dashboard/tickets")
    return { success: true }
}

export async function getTicketById(id: string) {
    const session = await getSession()
    const ticket = await prisma.tickets.findUnique({
        where: { id },
        include: {
            client: {
                select: {
                    id: true, name: true, cnpj: true, cpf: true, type: true,
                    city: true, ownerPhone: true, ownerEmail: true,
                },
            },
            assignedTo: { select: { id: true, name: true, email: true } },
            attachments: {
                select: { id: true, url: true, fileName: true, fileType: true, fileSize: true },
            },
            requestedByContact: { select: { id: true, name: true, phone: true, email: true } },
            requestedByContability: { select: { id: true, cnpj: true, cpf: true, email: true, phone: true } },
            apontamentos: {
                orderBy: { date: "desc" },
                include: {
                    user: { select: { id: true, name: true } },
                    attachments: { select: { id: true, url: true, fileName: true, fileType: true, fileSize: true } },
                },
            },
            comments: {
                where: { parentId: null },
                orderBy: { createdAt: "asc" },
                include: {
                    user: { select: { id: true, name: true } },
                    replies: {
                        orderBy: { createdAt: "asc" },
                        include: { user: { select: { id: true, name: true } } },
                    },
                },
            },
        },
    })
    if (!ticket) throw new Error("Ticket não encontrado")
    return {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        ticketDescription: ticket.ticketDescription,
        ticketStatus: ticket.ticketStatus || "NOVO",
        ticketPriority: ticket.ticketPriority || "MEDIUM",
        ticketType: ticket.ticketType || "SUPPORT",
        ticketResolutionDate: ticket.ticketResolutionDate?.toISOString() || null,
        reopenCount: ticket.reopenCount,
        reopenReason: ticket.reopenReason,
        reopenDate: ticket.reopenDate?.toISOString() || null,
        reopenById: ticket.reopenById,
        assignedToId: ticket.assignedToId,
        clientId: ticket.clientId,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        client: {
            id: ticket.client.id,
            name: ticket.client.name,
            cnpj: ticket.client.cnpj,
            cpf: ticket.client.cpf,
            type: ticket.client.type,
            city: ticket.client.city,
            ownerPhone: ticket.client.ownerPhone,
            ownerEmail: ticket.client.ownerEmail,
        },
        assignedTo: ticket.assignedTo ? {
            id: ticket.assignedTo.id,
            name: ticket.assignedTo.name,
            email: ticket.assignedTo.email,
        } : null,
        attachments: ticket.attachments,
        requestedByContact: ticket.requestedByContact,
        requestedByContability: ticket.requestedByContability,
        apontamentos: ticket.apontamentos.map(a => ({
            id: a.id,
            description: a.description,
            category: a.category,
            duration: a.duration,
            date: a.date.toISOString(),
            statusChange: a.statusChange,
            user: a.user,
            attachments: a.attachments,
        })),
        comments: ticket.comments.map(c => ({
            id: c.id,
            content: c.content,
            user: c.user,
            createdAt: c.createdAt.toISOString(),
            parentId: c.parentId,
            replies: c.replies.map(r => ({
                id: r.id,
                content: r.content,
                user: r.user,
                createdAt: r.createdAt.toISOString(),
                parentId: r.parentId,
                replies: [],
            })),
        })),
        currentUserId: session.user.id,
    }
}

export async function addApontamento(data: {
    ticketId: string
    description: string
    category: "PROBLEMA_RESOLVIDO" | "TREINAMENTO" | "REUNIAO" | "TIRA_DUVIDAS" | "DESENVOLVIMENTO"
    duration: number
    date: string
    statusChange?: string | null
    attachments?: { url: string; fileName: string; fileType: string; fileSize: number }[]
}) {
    const session = await getSession()
    await prisma.apontamento.create({
        data: {
            ticketId: data.ticketId,
            userId: session.user.id,
            description: data.description,
            category: data.category,
            duration: data.duration,
            date: new Date(data.date),
            statusChange: (data.statusChange && data.statusChange !== "none") ? data.statusChange as "NOVO" | "PENDING_CLIENT" | "PENDING_EMPRESS" | "IN_PROGRESS" | "CLOSED" : null,
            attachments: data.attachments && data.attachments.length > 0
                ? { create: data.attachments.map(a => ({ url: a.url, fileName: a.fileName, fileType: a.fileType, fileSize: a.fileSize })) }
                : undefined,
        },
    })
    // If statusChange, update ticket status too
    if (data.statusChange && data.statusChange !== "none") {
        const updateData: Record<string, unknown> = { ticketStatus: data.statusChange }
        if (data.statusChange === "CLOSED") updateData.ticketResolutionDate = new Date()
        await prisma.tickets.update({ where: { id: data.ticketId }, data: updateData })
    }
    revalidatePath("/dashboard/tickets")
    return { success: true }
}

export async function addComment(ticketId: string, content: string, parentId?: string | null) {
    const session = await getSession()
    if (!content.trim()) throw new Error("Conteúdo do comentário é obrigatório")
    const comment = await prisma.ticketComment.create({
        data: {
            ticketId,
            userId: session.user.id,
            content: content.trim(),
            parentId: parentId || null,
        },
    })
    revalidatePath("/dashboard/tickets")
    return { success: true, commentId: comment.id }
}

export async function reopenTicket(ticketId: string, reason: string) {
    const session = await getSession()
    if (!reason.trim()) throw new Error("Motivo da reabertura é obrigatório")
    const ticket = await prisma.tickets.findUnique({ where: { id: ticketId } })
    if (!ticket) throw new Error("Ticket não encontrado")
    await prisma.tickets.update({
        where: { id: ticketId },
        data: {
            ticketStatus: "IN_PROGRESS",
            ticketResolutionDate: null,
            reopenCount: ticket.reopenCount + 1,
            reopenReason: reason.trim(),
            reopenDate: new Date(),
            reopenById: session.user.id,
        },
    })
    revalidatePath("/dashboard/tickets")
    return { success: true }
}

export async function getAllUsers() {
    await getSession()
    return prisma.user.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    })
}

export async function updateTicketRequester(
    ticketId: string,
    contactId: string | null,
    contabilityId: string | null = null
) {
    await getSession()
    await prisma.tickets.update({
        where: { id: ticketId },
        data: {
            requestedByContactId: contactId,
            requestedByContabilityId: contabilityId,
        },
    })
    revalidatePath("/dashboard/tickets")
    return { success: true }
}

export async function updateTicketClient(ticketId: string, clientId: string) {
    await getSession()
    const ticket = await prisma.tickets.findUnique({
        where: { id: ticketId },
        select: { _count: { select: { apontamentos: true } } },
    })
    if (ticket && ticket._count.apontamentos > 0) {
        throw new Error("Não é possível mudar o cliente de um ticket que já possui apontamentos.")
    }
    await prisma.tickets.update({
        where: { id: ticketId },
        data: { clientId, requestedByContactId: null, requestedByContabilityId: null },
    })
    revalidatePath("/dashboard/tickets")
    return { success: true }
}

export async function addTicketAttachment(ticketId: string, data: { url: string; fileName: string; fileType: string; fileSize: number }) {
    await getSession()
    await prisma.attachment.create({
        data: {
            ticketId,
            url: data.url,
            fileName: data.fileName,
            fileType: data.fileType,
            fileSize: data.fileSize,
        },
    })
    revalidatePath("/dashboard/tickets")
    return { success: true }
}

export async function addCommentAttachment(commentId: string, data: { url: string; fileName: string; fileType: string; fileSize: number }) {
    await getSession()
    await prisma.attachment.create({
        data: {
            commentId,
            url: data.url,
            fileName: data.fileName,
            fileType: data.fileType,
            fileSize: data.fileSize,
        },
    })
    revalidatePath("/dashboard/tickets")
    return { success: true }
}
