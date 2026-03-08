"use server"

import { prisma } from "../utils/prisma"

function normalizeTicketId(ticketId: string | number) {
    const parsed = typeof ticketId === "number" ? ticketId : Number(ticketId)
    if (!Number.isInteger(parsed) || parsed <= 0) throw new Error("ID do ticket inválido")
    return parsed
}

export const getTickets = async () => {
    const tickets = await prisma.tickets.findMany({
        include: {
            client: true,
            assignedTo: true,
        },
        orderBy: { createdAt: "desc" },
    })
    return tickets
}

export const getTicketById = async (id: string | number) => {
    const ticket = await prisma.tickets.findUnique({
        where: { id: normalizeTicketId(id) },
        include: {
            client: true,
            assignedTo: true,
            apontamentos: {
                include: { user: true },
                orderBy: { date: "desc" },
            },
        },
    })
    return ticket
}

export const updateTicketStatus = async (ticketId: string | number, status: "NOVO" | "PENDING_CLIENT" | "PENDING_EMPRESS" | "IN_PROGRESS" | "CLOSED") => {
    const ticket = await prisma.tickets.update({
        where: { id: normalizeTicketId(ticketId) },
        data: {
            ticketStatus: status,
            ...(status === "CLOSED" ? { ticketResolutionDate: new Date() } : {}),
        },
    })
    return ticket
}

export const reopenTicket = async (ticketId: string | number, reason: string, userId: string) => {
    const ticket = await prisma.tickets.update({
        where: { id: normalizeTicketId(ticketId) },
        data: {
            ticketStatus: "NOVO",
            reopenCount: { increment: 1 },
            reopenReason: reason,
            reopenDate: new Date(),
            reopenById: userId,
            ticketResolutionDate: null,
        },
    })
    return ticket
}

export const getMyTickets = async (userId: string) => {
    const tickets = await prisma.tickets.findMany({ where: { assignedToId: userId } })
    return tickets
}

export const getTicketsByClient = async (clientId: string) => {
    const tickets = await prisma.tickets.findMany({ where: { clientId } })
    return tickets
}

export const claimTicket = async (ticketId: string | number, userId: string) => {
    const ticket = await prisma.tickets.update({
        where: { id: normalizeTicketId(ticketId) },
        data: { assignedToId: userId },
        include: {
            client: true,
            assignedTo: true,
        },
    })
    return ticket
}

export const createApontamento = async (data: {
    ticketId: string | number
    userId: string
    description: string
    category: "PROBLEMA_RESOLVIDO" | "TREINAMENTO" | "REUNIAO" | "TIRA_DUVIDAS" | "DESENVOLVIMENTO"
    duration: number
    date: Date
    statusChange?: "NOVO" | "PENDING_CLIENT" | "PENDING_EMPRESS" | "IN_PROGRESS" | "CLOSED" | null
}) => {
    const normalizedTicketId = normalizeTicketId(data.ticketId)
    const apontamento = await prisma.apontamento.create({
        data: {
            ticketId: normalizedTicketId,
            userId: data.userId,
            description: data.description,
            category: data.category,
            duration: data.duration,
            date: data.date,
            statusChange: data.statusChange || null,
        },
        include: { user: true },
    })

    if (data.statusChange) {
        await prisma.tickets.update({
            where: { id: normalizedTicketId },
            data: {
                ticketStatus: data.statusChange,
                ...(data.statusChange === "CLOSED" ? { ticketResolutionDate: new Date() } : {}),
            },
        })
    }

    return apontamento
}

export const getApontamentosByTicket = async (ticketId: string | number) => {
    const apontamentos = await prisma.apontamento.findMany({
        where: { ticketId: normalizeTicketId(ticketId) },
        include: { user: true },
        orderBy: { date: "desc" },
    })
    return apontamentos
}

