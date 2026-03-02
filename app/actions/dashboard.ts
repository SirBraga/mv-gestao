"use server"

import { prisma } from "@/app/utils/prisma"
import { auth } from "@/app/utils/auth"
import { headers } from "next/headers"

async function getSession() {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) throw new Error("Não autenticado")
    return session
}

export async function getDashboardStats(viewMode: "mine" | "company", period: "day" | "week" | "month" | "custom", customStart?: string, customEnd?: string) {
    const session = await getSession()

    // Calculate date range
    const now = new Date()
    let startDate: Date
    let endDate = now

    switch (period) {
        case "day":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
        case "week":
            startDate = new Date(now)
            startDate.setDate(now.getDate() - 7)
            break
        case "month":
            startDate = new Date(now)
            startDate.setDate(now.getDate() - 30)
            break
        case "custom":
            startDate = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
            endDate = customEnd ? new Date(customEnd + "T23:59:59") : now
            break
        default:
            startDate = new Date(now)
            startDate.setDate(now.getDate() - 7)
    }

    const userFilter = viewMode === "mine" ? { assignedToId: session.user.id } : {}

    // Stats
    const [totalClients, totalProducts, totalContabilities] = await Promise.all([
        prisma.clients.count(),
        prisma.products.count(),
        prisma.contability.count(),
    ])

    const openTickets = await prisma.tickets.count({
        where: {
            ...userFilter,
            ticketStatus: { in: ["NOVO", "PENDING_CLIENT", "PENDING_EMPRESS", "IN_PROGRESS"] },
        },
    })

    // Tickets in period
    const ticketsInPeriod = await prisma.tickets.findMany({
        where: {
            ...userFilter,
            createdAt: { gte: startDate, lte: endDate },
        },
        select: { id: true, ticketStatus: true, createdAt: true },
    })

    const closedInPeriod = await prisma.tickets.count({
        where: {
            ...userFilter,
            ticketStatus: "CLOSED",
            ticketResolutionDate: { gte: startDate, lte: endDate },
        },
    })

    // Recent tickets
    const recentTickets = await prisma.tickets.findMany({
        where: userFilter,
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
            client: { select: { name: true } },
            assignedTo: { select: { name: true } },
        },
    })

    // Top clients (by ticket count)
    const topClientsRaw = await prisma.clients.findMany({
        take: 5,
        include: {
            _count: { select: { tickets: true, products: true } },
        },
        orderBy: { tickets: { _count: "desc" } },
    })

    // Weekly chart data (last 7 days)
    const weeklyData: { day: string; abertos: number; resolvidos: number }[] = []
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(now)
        dayStart.setDate(now.getDate() - i)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(dayStart)
        dayEnd.setHours(23, 59, 59, 999)

        const [opened, resolved] = await Promise.all([
            prisma.tickets.count({
                where: { ...userFilter, createdAt: { gte: dayStart, lte: dayEnd } },
            }),
            prisma.tickets.count({
                where: { ...userFilter, ticketStatus: "CLOSED", ticketResolutionDate: { gte: dayStart, lte: dayEnd } },
            }),
        ])

        weeklyData.push({
            day: dayNames[dayStart.getDay()],
            abertos: opened,
            resolvidos: resolved,
        })
    }

    // Monthly chart data (last 6 months)
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    const monthlyData: { month: string; abertos: number; resolvidos: number }[] = []
    for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)

        const [opened, resolved] = await Promise.all([
            prisma.tickets.count({
                where: { ...userFilter, createdAt: { gte: monthStart, lte: monthEnd } },
            }),
            prisma.tickets.count({
                where: { ...userFilter, ticketStatus: "CLOSED", ticketResolutionDate: { gte: monthStart, lte: monthEnd } },
            }),
        ])

        monthlyData.push({
            month: monthNames[monthStart.getMonth()],
            abertos: opened,
            resolvidos: resolved,
        })
    }

    // Activity feed (recent ticket changes)
    const recentActivity = await prisma.tickets.findMany({
        orderBy: { updatedAt: "desc" },
        take: 6,
        include: {
            client: { select: { name: true } },
            assignedTo: { select: { name: true } },
        },
    })

    return {
        stats: {
            totalClients,
            openTickets,
            totalProducts,
            totalContabilities,
        },
        ticketsOpenedInPeriod: ticketsInPeriod.length,
        ticketsClosedInPeriod: closedInPeriod,
        recentTickets: recentTickets.map(t => ({
            id: t.id,
            title: t.ticketDescription,
            client: t.client.name,
            status: t.ticketStatus || "NOVO",
            priority: t.ticketPriority || "MEDIUM",
            date: t.createdAt.toISOString(),
        })),
        topClients: topClientsRaw.map(c => ({
            name: c.name,
            tickets: c._count.tickets,
            products: c._count.products,
        })),
        weeklyData,
        monthlyData,
        activity: recentActivity.map(t => ({
            id: t.id,
            description: t.ticketDescription,
            clientName: t.client.name,
            assignedTo: t.assignedTo?.name || null,
            status: t.ticketStatus,
            updatedAt: t.updatedAt.toISOString(),
        })),
        currentUserId: session.user.id,
        userName: session.user.name,
    }
}
