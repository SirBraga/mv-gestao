"use server"

import { prisma } from "@/app/utils/prisma"
import { auth } from "@/app/utils/auth"
import { headers } from "next/headers"
import { cache } from "react"
import { createNotification } from "@/app/actions/notifications"
import { sendPushToUser } from "@/app/utils/push"

const prismaAny = prisma as any

const getSession = cache(async () => {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) throw new Error("Não autenticado")
    return session
})

function normalizeTicketId(ticketId: string | number) {
    const parsed = typeof ticketId === "number" ? ticketId : Number(ticketId)
    if (!Number.isInteger(parsed) || parsed <= 0) throw new Error("ID do ticket inválido")
    return parsed
}

export async function getTickets() {
    const session = await getSession()
    const tickets = await prismaAny.tickets.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            ticketNumber: true,
            ticketDescription: true,
            clientId: true,
            ticketPriority: true,
            ticketStatus: true,
            createdAt: true,
            client: {
                select: {
                    name: true,
                    clientProductSerials: {
                        select: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            },
            assignedTo: { select: { id: true, name: true } },
            requestedByContact: { select: { name: true } },
            knowledgeArticle: {
                select: {
                    id: true,
                    title: true,
                },
            },
        },
    })
    return (tickets as any[]).filter((t) => t.ticketStatus !== "CANCELLED").map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        ticketDescription: t.ticketDescription,
        clientName: t.client.name,
        clientId: t.clientId,
        priority: (t.ticketPriority || "MEDIUM") as "LOW" | "MEDIUM" | "HIGH",
        status: (t.ticketStatus || "NOVO") as "NOVO" | "PENDING_CLIENT" | "PENDING_EMPRESS" | "IN_PROGRESS" | "CLOSED" | "CANCELLED",
        assigneeName: t.assignedTo?.name || null,
        assigneeId: t.assignedTo?.id || null,
        requesterName: t.requestedByContact?.name || null,
        products: t.client.clientProductSerials.map((item: any) => item.product),
        knowledgeArticle: t.knowledgeArticle,
        isAssignedToCurrentUser: t.assignedTo?.id === session.user.id,
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
    knowledgeArticleId?: string
}) {
    const session = await getSession()
    const ticket = await prismaAny.tickets.create({
        data: {
            clientId: data.clientId,
            ticketDescription: data.ticketDescription,
            ticketPriority: data.ticketPriority,
            ticketType: data.ticketType || "SUPPORT",
            requestedByContactId: data.requestedByContactId || null,
            requestedByContabilityId: data.requestedByContabilityId || null,
            assignedToId: data.assignedToId || null,
            knowledgeArticleId: data.knowledgeArticleId || null,
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
    return { success: true, id: ticket.id }
}

export async function claimTicket(ticketId: string | number) {
    const session = await getSession()
    const ticket = await prismaAny.tickets.update({
        where: { id: normalizeTicketId(ticketId) },
        data: {
            assignedToId: session.user.id,
            ticketStatus: "IN_PROGRESS",
        },
        select: { ticketNumber: true },
    })
    return { success: true }
}

export async function getTicketSchedules(ticketId: string | number) {
    await getSession()
    const normalizedTicketId = normalizeTicketId(ticketId)

    const schedules = await prismaAny.ticketSchedule.findMany({
        where: { ticketId: normalizedTicketId },
        orderBy: { scheduledAt: "asc" },
    })

    return (schedules as any[]).map((schedule) => ({
        id: schedule.id,
        title: schedule.title,
        description: schedule.description,
        type: schedule.type,
        format: schedule.format,
        scheduledAt: schedule.scheduledAt.toISOString(),
        durationMinutes: schedule.durationMinutes,
        location: schedule.location,
        createdAt: schedule.createdAt.toISOString(),
    }))
}

export async function createTicketSchedule(data: {
    ticketId: string | number
    title?: string
    description?: string
    type: "TREINAMENTO" | "TIRA_DUVIDAS" | "CONSULTORIA" | "IMPLANTACAO" | "PARAMETRIZACAO" | "REUNIAO_ALINHAMENTO" | "VISITA_TECNICA"
    format: "PRESENCIAL" | "ONLINE"
    scheduledAt: string
    durationMinutes?: number | null
}) {
    await getSession()
    const normalizedTicketId = normalizeTicketId(data.ticketId)

    if (!data.scheduledAt) throw new Error("Data do agendamento é obrigatória")

    const scheduledAt = new Date(data.scheduledAt)
    if (Number.isNaN(scheduledAt.getTime())) throw new Error("Data do agendamento inválida")
    if (scheduledAt.getTime() < Date.now()) throw new Error("Não é possível criar agendamento com data/hora retroativa")

    const ticket = await prismaAny.tickets.findUnique({
        where: { id: normalizedTicketId },
        select: {
            client: {
                select: {
                    address: true,
                    houseNumber: true,
                    neighborhood: true,
                    city: true,
                    state: true,
                    zipCode: true,
                    complement: true,
                },
            },
        },
    })

    if (!ticket) throw new Error("Ticket não encontrado")

    const presencialLocation = [
        ticket.client.address,
        ticket.client.houseNumber,
        ticket.client.neighborhood,
        ticket.client.city,
        ticket.client.state,
        ticket.client.zipCode,
        ticket.client.complement,
    ].filter(Boolean).join(", ")

    const scheduleTypeLabelMap: Record<typeof data.type, string> = {
        TREINAMENTO: "Treinamento",
        TIRA_DUVIDAS: "Tira dúvidas",
        CONSULTORIA: "Consultoria",
        IMPLANTACAO: "Implantação",
        PARAMETRIZACAO: "Parametrização",
        REUNIAO_ALINHAMENTO: "Reunião de alinhamento",
        VISITA_TECNICA: "Visita técnica",
    }

    const title = data.title?.trim() || `${scheduleTypeLabelMap[data.type]} ${data.format === "PRESENCIAL" ? "presencial" : "online"}`

    const schedule = await prismaAny.ticketSchedule.create({
        data: {
            ticketId: normalizedTicketId,
            title,
            description: data.description?.trim() || null,
            type: data.type,
            format: data.format,
            scheduledAt,
            durationMinutes: data.durationMinutes && data.durationMinutes > 0 ? data.durationMinutes : null,
            location: data.format === "PRESENCIAL" ? presencialLocation || null : "Online",
        },
    })

    return {
        success: true,
        id: schedule.id,
    }
}

export async function deleteTicketSchedule(scheduleId: string) {
    await getSession()
    await prismaAny.ticketSchedule.delete({
        where: { id: scheduleId },
    })
    return { success: true }
}

export async function updateTicketStatus(ticketId: string | number, status: "NOVO" | "PENDING_CLIENT" | "PENDING_EMPRESS" | "IN_PROGRESS" | "CLOSED") {
    await getSession()
    const data: Record<string, unknown> = { ticketStatus: status, cancelReason: null }
    if (status === "CLOSED") {
        data.ticketResolutionDate = new Date()
    } else {
        data.ticketResolutionDate = null
    }
    await prismaAny.tickets.update({ where: { id: normalizeTicketId(ticketId) }, data })
    return { success: true }
}

export async function cancelTicket(ticketId: string | number, reason: string) {
    await getSession()
    if (!reason.trim()) throw new Error("Motivo do cancelamento é obrigatório")

    const normalizedTicketId = normalizeTicketId(ticketId)
    const ticket = await prismaAny.tickets.findUnique({
        where: { id: normalizedTicketId },
        select: {
            _count: {
                select: {
                    apontamentos: true,
                },
            },
        },
    }) as any

    if (!ticket) throw new Error("Ticket não encontrado")
    if (ticket._count.apontamentos > 0) throw new Error("Só é possível cancelar tickets sem apontamentos")

    await prismaAny.tickets.update({
        where: { id: normalizedTicketId },
        data: {
            ticketStatus: "CANCELLED",
            cancelReason: reason.trim(),
            ticketResolutionDate: null,
        },
    })

    return { success: true }
}

export async function assignTicket(ticketId: string | number, userId: string | null) {
    const session = await getSession()
    const normalizedTicketId = normalizeTicketId(ticketId)
    const ticket = await prismaAny.tickets.update({
        where: { id: normalizedTicketId },
        data: { assignedToId: userId },
        select: { ticketNumber: true, ticketDescription: true },
    })
    if (userId && userId !== session.user.id) {
        await createNotification({
            userId,
            title: `Ticket #${ticket.ticketNumber} atribuído a você`,
            message: ticket.ticketDescription.slice(0, 100),
            type: "TICKET_ASSIGNED",
            link: `/dashboard/tickets/${normalizedTicketId}`,
        })
        await sendPushToUser(userId, {
            title: `🎫 Ticket #${ticket.ticketNumber} atribuído a você`,
            body: ticket.ticketDescription.slice(0, 100),
            url: `/dashboard/tickets/${normalizedTicketId}`,
            tag: `ticket-${normalizedTicketId}`,
        })
    }
    return { success: true }
}

export async function deleteTicket(ticketId: string | number) {
    await getSession()
    const normalizedTicketId = normalizeTicketId(ticketId)
    // Delete related apontamentos and comments first
    await prismaAny.apontamento.deleteMany({ where: { ticketId: normalizedTicketId } })
    await prismaAny.ticketComment.deleteMany({ where: { ticketId: normalizedTicketId } })
    await prismaAny.tickets.delete({ where: { id: normalizedTicketId } })
    return { success: true }
}

export async function getTicketById(id: string | number) {
    const session = await getSession()
    const normalizedTicketId = normalizeTicketId(id)
    const [ticketResult, apontamentoMetrics, totalComments, schedules] = await Promise.all([
        prismaAny.tickets.findUnique({
            where: { id: normalizedTicketId },
            select: {
                id: true,
                ticketNumber: true,
                ticketDescription: true,
                ticketStatus: true,
                ticketPriority: true,
                ticketType: true,
                ticketResolutionDate: true,
                reopenCount: true,
                reopenReason: true,
                cancelReason: true,
                reopenDate: true,
                reopenById: true,
                assignedToId: true,
                clientId: true,
                createdAt: true,
                updatedAt: true,
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
                requestedByContability: { select: { id: true, name: true, cnpj: true, cpf: true, email: true, phone: true } },
                knowledgeArticle: {
                    select: {
                        id: true,
                        title: true,
                        summary: true,
                        category: true,
                        products: {
                            select: {
                                product: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
                _count: { select: { apontamentos: true } },
            },
        }),
        prismaAny.apontamento.aggregate({
            where: { ticketId: normalizedTicketId },
            _sum: { duration: true },
        }),
        prismaAny.ticketComment.count({
            where: { ticketId: normalizedTicketId },
        }),
        prismaAny.ticketSchedule.findMany({
            where: { ticketId: normalizedTicketId },
            orderBy: { scheduledAt: "asc" },
        }),
    ])
    const ticket = ticketResult as any
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
        cancelReason: ticket.cancelReason,
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
        knowledgeArticle: ticket.knowledgeArticle ? {
            id: ticket.knowledgeArticle.id,
            title: ticket.knowledgeArticle.title,
            summary: ticket.knowledgeArticle.summary,
            category: ticket.knowledgeArticle.category,
            products: ticket.knowledgeArticle.products.map((item: any) => item.product),
        } : null,
        totalApontamentos: ticket._count.apontamentos,
        totalMinutes: apontamentoMetrics._sum.duration || 0,
        totalComments,
        schedules: (schedules as any[]).map((schedule) => ({
            id: schedule.id,
            title: schedule.title,
            description: schedule.description,
            type: schedule.type,
            format: schedule.format,
            scheduledAt: schedule.scheduledAt.toISOString(),
            durationMinutes: schedule.durationMinutes,
            location: schedule.location,
            createdAt: schedule.createdAt.toISOString(),
        })),
        currentUserId: session.user.id,
    }
}

export async function getTicketApontamentos(ticketId: string | number) {
    await getSession()
    const normalizedTicketId = normalizeTicketId(ticketId)

    const apontamentos = await prismaAny.apontamento.findMany({
        where: { ticketId: normalizedTicketId },
        orderBy: { date: "desc" },
        include: {
            user: { select: { id: true, name: true } },
            attachments: { select: { id: true, url: true, fileName: true, fileType: true, fileSize: true } },
        },
    }) as any[]

    return apontamentos.map(a => ({
        id: a.id,
        description: a.description,
        category: a.category,
        duration: a.duration,
        date: a.date.toISOString(),
        statusChange: a.statusChange,
        user: a.user,
        attachments: a.attachments,
    }))
}

export async function getTicketComments(ticketId: string | number) {
    await getSession()
    const normalizedTicketId = normalizeTicketId(ticketId)

    const comments = await prismaAny.ticketComment.findMany({
        where: { ticketId: normalizedTicketId, parentId: null },
        orderBy: { createdAt: "asc" },
        include: {
            user: { select: { id: true, name: true } },
            replies: {
                orderBy: { createdAt: "asc" },
                include: { user: { select: { id: true, name: true } } },
            },
        },
    })

    return (comments as any[]).map((c) => ({
        id: c.id,
        content: c.content,
        user: c.user,
        createdAt: c.createdAt.toISOString(),
        parentId: c.parentId,
        replies: (c.replies || []).map((r: any) => ({
            id: r.id,
            content: r.content,
            user: r.user,
            createdAt: r.createdAt.toISOString(),
            parentId: r.parentId,
            replies: [],
        })),
    }))
}

export async function addApontamento(data: {
    ticketId: string | number
    description: string
    category: "PROBLEMA_RESOLVIDO" | "TREINAMENTO" | "REUNIAO" | "TIRA_DUVIDAS" | "DESENVOLVIMENTO"
    duration: number
    date: string
    statusChange?: string | null
    attachments?: { url: string; fileName: string; fileType: string; fileSize: number }[]
}) {
    const session = await getSession()
    const normalizedTicketId = normalizeTicketId(data.ticketId)
    await prismaAny.apontamento.create({
        data: {
            ticketId: normalizedTicketId,
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
        const updateData: Record<string, unknown> = { ticketStatus: data.statusChange, cancelReason: null }
        if (data.statusChange === "CLOSED") {
            updateData.ticketResolutionDate = new Date()
        } else {
            updateData.ticketResolutionDate = null
        }
        await prismaAny.tickets.update({ where: { id: normalizedTicketId }, data: updateData })
    }
    return { success: true }
}

export async function addComment(ticketId: string | number, content: string, parentId?: string | null) {
    const session = await getSession()
    if (!content.trim()) throw new Error("Conteúdo do comentário é obrigatório")
    const normalizedTicketId = normalizeTicketId(ticketId)
    const comment = await prismaAny.ticketComment.create({
        data: {
            ticketId: normalizedTicketId,
            userId: session.user.id,
            content: content.trim(),
            parentId: parentId || null,
        },
    })
    return { success: true, commentId: comment.id }
}

export async function reopenTicket(ticketId: string | number, reason: string) {
    const session = await getSession()
    if (!reason.trim()) throw new Error("Motivo da reabertura é obrigatório")
    const normalizedTicketId = normalizeTicketId(ticketId)
    const ticket = await prismaAny.tickets.findUnique({ where: { id: normalizedTicketId } })
    if (!ticket) throw new Error("Ticket não encontrado")
    await prismaAny.tickets.update({
        where: { id: normalizedTicketId },
        data: {
            ticketStatus: "IN_PROGRESS",
            ticketResolutionDate: null,
            reopenCount: ticket.reopenCount + 1,
            reopenReason: reason.trim(),
            cancelReason: null,
            reopenDate: new Date(),
            reopenById: session.user.id,
        },
    })
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
    ticketId: string | number,
    contactId: string | null,
    contabilityId: string | null = null
) {
    await getSession()
    await prismaAny.tickets.update({
        where: { id: normalizeTicketId(ticketId) },
        data: {
            requestedByContactId: contactId,
            requestedByContabilityId: contabilityId,
        },
    })
    return { success: true }
}

export async function updateTicketClient(ticketId: string | number, clientId: string) {
    await getSession()
    const normalizedTicketId = normalizeTicketId(ticketId)
    const ticket = await prismaAny.tickets.findUnique({
        where: { id: normalizedTicketId },
        select: { _count: { select: { apontamentos: true } } },
    }) as any
    if (ticket && ticket._count.apontamentos > 0) {
        throw new Error("Não é possível mudar o cliente de um ticket que já possui apontamentos.")
    }
    await prismaAny.tickets.update({
        where: { id: normalizedTicketId },
        data: { clientId, requestedByContactId: null, requestedByContabilityId: null },
    })
    return { success: true }
}

export async function addTicketAttachment(ticketId: string | number, data: { url: string; fileName: string; fileType: string; fileSize: number }) {
    await getSession()
    await prismaAny.attachment.create({
        data: {
            ticketId: normalizeTicketId(ticketId),
            url: data.url,
            fileName: data.fileName,
            fileType: data.fileType,
            fileSize: data.fileSize,
        },
    })
    return { success: true }
}

export async function addCommentAttachment(commentId: string, data: { url: string; fileName: string; fileType: string; fileSize: number }) {
    await getSession()
    await prismaAny.attachment.create({
        data: {
            commentId,
            url: data.url,
            fileName: data.fileName,
            fileType: data.fileType,
            fileSize: data.fileSize,
        },
    })
    return { success: true }
}
