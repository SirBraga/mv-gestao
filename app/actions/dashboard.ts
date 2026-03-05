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

    // Build day ranges for weekly chart (last 7 days)
    const dayRanges = Array.from({ length: 7 }, (_, i) => {
        const dayStart = new Date(now)
        dayStart.setDate(now.getDate() - (6 - i))
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(dayStart)
        dayEnd.setHours(23, 59, 59, 999)
        return { dayStart, dayEnd }
    })

    // Build month ranges for monthly chart (last 6 months)
    const monthRanges = Array.from({ length: 6 }, (_, i) => {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 0, 23, 59, 59, 999)
        return { monthStart, monthEnd }
    })

    // Fire ALL queries in parallel — single round-trip batch
    const [
        totalClients,
        totalProducts,
        totalContabilities,
        openTickets,
        ticketsInPeriod,
        closedInPeriod,
        recentTickets,
        topClientsRaw,
        recentActivity,
        ...chartCounts
    ] = await Promise.all([
        prisma.clients.count(),
        prisma.products.count(),
        prisma.contability.count(),
        prisma.tickets.count({
            where: {
                ...userFilter,
                ticketStatus: { in: ["NOVO", "PENDING_CLIENT", "PENDING_EMPRESS", "IN_PROGRESS"] },
            },
        }),
        prisma.tickets.findMany({
            where: { ...userFilter, createdAt: { gte: startDate, lte: endDate } },
            select: { id: true, ticketStatus: true, createdAt: true },
        }),
        prisma.tickets.count({
            where: {
                ...userFilter,
                ticketStatus: "CLOSED",
                ticketResolutionDate: { gte: startDate, lte: endDate },
            },
        }),
        prisma.tickets.findMany({
            where: userFilter,
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
                client: { select: { name: true } },
                assignedTo: { select: { name: true } },
            },
        }),
        prisma.clients.findMany({
            take: 5,
            include: { _count: { select: { tickets: true, products: true } } },
            orderBy: { tickets: { _count: "desc" } },
        }),
        prisma.tickets.findMany({
            orderBy: { updatedAt: "desc" },
            take: 6,
            include: {
                client: { select: { name: true } },
                assignedTo: { select: { name: true } },
            },
        }),
        // Weekly: 7 days × 2 counts = 14 queries in parallel
        ...dayRanges.flatMap(({ dayStart, dayEnd }) => [
            prisma.tickets.count({ where: { ...userFilter, createdAt: { gte: dayStart, lte: dayEnd } } }),
            prisma.tickets.count({ where: { ...userFilter, ticketStatus: "CLOSED", ticketResolutionDate: { gte: dayStart, lte: dayEnd } } }),
        ]),
        // Monthly: 6 months × 2 counts = 12 queries in parallel
        ...monthRanges.flatMap(({ monthStart, monthEnd }) => [
            prisma.tickets.count({ where: { ...userFilter, createdAt: { gte: monthStart, lte: monthEnd } } }),
            prisma.tickets.count({ where: { ...userFilter, ticketStatus: "CLOSED", ticketResolutionDate: { gte: monthStart, lte: monthEnd } } }),
        ]),
    ])

    // Reconstruct weekly chart data
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    const weeklyData = dayRanges.map(({ dayStart }, i) => ({
        day: dayNames[dayStart.getDay()],
        abertos: chartCounts[i * 2] as number,
        resolvidos: chartCounts[i * 2 + 1] as number,
    }))

    // Reconstruct monthly chart data (offset by 14 = 7 days * 2)
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    const monthlyData = monthRanges.map(({ monthStart }, i) => ({
        month: monthNames[monthStart.getMonth()],
        abertos: chartCounts[14 + i * 2] as number,
        resolvidos: chartCounts[14 + i * 2 + 1] as number,
    }))

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
