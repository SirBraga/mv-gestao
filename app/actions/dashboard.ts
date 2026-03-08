"use server"

import { prisma } from "@/app/utils/prisma"
import { auth } from "@/app/utils/auth"
import { headers } from "next/headers"

type DashboardPeriod = "day" | "week" | "month"
type ChartBucket = {
    label: string
    start: Date
    end: Date
}

async function getSession() {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) throw new Error("Não autenticado")
    return session
}

function startOfDay(date: Date) {
    const next = new Date(date)
    next.setHours(0, 0, 0, 0)
    return next
}

function endOfDay(date: Date) {
    const next = new Date(date)
    next.setHours(23, 59, 59, 999)
    return next
}

function shiftDays(date: Date, amount: number) {
    const next = new Date(date)
    next.setDate(next.getDate() + amount)
    return next
}

function buildPrimaryBuckets(period: DashboardPeriod, now: Date): ChartBucket[] {
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

    if (period === "day") {
        const todayStart = startOfDay(now)
        return Array.from({ length: 6 }, (_, index) => {
            const start = new Date(todayStart)
            start.setHours(index * 4, 0, 0, 0)
            const end = new Date(todayStart)
            end.setHours(index * 4 + 3, 59, 59, 999)
            return {
                label: `${String(start.getHours()).padStart(2, "0")}h`,
                start,
                end,
            }
        })
    }

    if (period === "week") {
        return Array.from({ length: 7 }, (_, index) => {
            const target = shiftDays(now, -(6 - index))
            const start = startOfDay(target)
            const end = endOfDay(target)
            return {
                label: dayNames[start.getDay()],
                start,
                end,
            }
        })
    }

    return Array.from({ length: 6 }, (_, index) => {
        const start = startOfDay(shiftDays(now, -(29 - index * 5)))
        const end = endOfDay(shiftDays(now, -(25 - index * 5)))
        return {
            label: `${String(start.getDate()).padStart(2, "0")}/${String(start.getMonth() + 1).padStart(2, "0")}`,
            start,
            end,
        }
    })
}

function buildSecondaryBuckets(period: DashboardPeriod, now: Date): ChartBucket[] {
    if (period === "day") {
        const todayStart = startOfDay(now)
        return Array.from({ length: 4 }, (_, index) => {
            const start = new Date(todayStart)
            start.setHours(index * 6, 0, 0, 0)
            const end = new Date(todayStart)
            end.setHours(index * 6 + 5, 59, 59, 999)
            return {
                label: `${String(start.getHours()).padStart(2, "0")}h`,
                start,
                end,
            }
        })
    }

    if (period === "week") {
        const ranges = [
            { startOffset: 6, endOffset: 5 },
            { startOffset: 4, endOffset: 3 },
            { startOffset: 2, endOffset: 1 },
            { startOffset: 0, endOffset: 0 },
        ]

        return ranges.map(({ startOffset, endOffset }) => {
            const start = startOfDay(shiftDays(now, -startOffset))
            const end = endOfDay(shiftDays(now, -endOffset))
            return {
                label: `${String(start.getDate()).padStart(2, "0")}/${String(start.getMonth() + 1).padStart(2, "0")}`,
                start,
                end,
            }
        })
    }

    const ranges = [
        { startOffset: 27, endOffset: 21 },
        { startOffset: 20, endOffset: 14 },
        { startOffset: 13, endOffset: 7 },
        { startOffset: 6, endOffset: 0 },
    ]

    return ranges.map(({ startOffset, endOffset }) => {
        const start = startOfDay(shiftDays(now, -startOffset))
        const end = endOfDay(shiftDays(now, -endOffset))
        return {
            label: `${String(start.getDate()).padStart(2, "0")}/${String(start.getMonth() + 1).padStart(2, "0")}`,
            start,
            end,
        }
    })
}

export async function getDashboardStats(viewMode: "mine" | "company", period: DashboardPeriod) {
    const session = await getSession()

    const now = new Date()
    let startDate: Date
    let endDate = now

    switch (period) {
        case "day":
            startDate = startOfDay(now)
            break
        case "week":
            startDate = startOfDay(shiftDays(now, -6))
            break
        case "month":
            startDate = startOfDay(shiftDays(now, -29))
            break
        default:
            startDate = startOfDay(shiftDays(now, -6))
    }

    const userFilter = viewMode === "mine" ? { assignedToId: session.user.id } : {}

    const primaryBuckets = buildPrimaryBuckets(period, now)
    const secondaryBuckets = buildSecondaryBuckets(period, now)

    const [
        totalClients,
        totalProducts,
        totalContabilities,
        openTickets,
        ticketsOpenedInPeriod,
        closedInPeriod,
        recentTickets,
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
        prisma.tickets.count({
            where: { ...userFilter, createdAt: { gte: startDate, lte: endDate } },
        }),
        prisma.tickets.count({
            where: {
                ...userFilter,
                ticketStatus: "CLOSED",
                ticketResolutionDate: { gte: startDate, lte: endDate },
            },
        }),
        prisma.tickets.findMany({
            where: {
                ...userFilter,
            },
            orderBy: { createdAt: "desc" },
            take: 6,
            include: {
                client: { select: { name: true } },
                assignedTo: { select: { name: true } },
            },
        }),
        prisma.tickets.findMany({
            where: {
                ...userFilter,
                updatedAt: { gte: startDate, lte: endDate },
            },
            orderBy: { updatedAt: "desc" },
            take: 6,
            include: {
                client: { select: { name: true } },
                assignedTo: { select: { name: true } },
            },
        }),
        ...primaryBuckets.flatMap(({ start, end }) => [
            prisma.tickets.count({ where: { ...userFilter, createdAt: { gte: start, lte: end } } }),
            prisma.tickets.count({ where: { ...userFilter, ticketStatus: "CLOSED", ticketResolutionDate: { gte: start, lte: end } } }),
        ]),
        ...secondaryBuckets.flatMap(({ start, end }) => [
            prisma.tickets.count({ where: { ...userFilter, createdAt: { gte: start, lte: end } } }),
            prisma.tickets.count({ where: { ...userFilter, ticketStatus: "CLOSED", ticketResolutionDate: { gte: start, lte: end } } }),
        ]),
    ])

    const weeklyData = primaryBuckets.map(({ label }, index) => ({
        label,
        abertos: chartCounts[index * 2] as number,
        resolvidos: chartCounts[index * 2 + 1] as number,
    }))

    const primaryOffset = primaryBuckets.length * 2
    const monthlyData = secondaryBuckets.map(({ label }, index) => ({
        label,
        abertos: chartCounts[primaryOffset + index * 2] as number,
        resolvidos: chartCounts[primaryOffset + index * 2 + 1] as number,
    }))

    return {
        stats: {
            totalClients,
            openTickets,
            totalProducts,
            totalContabilities,
        },
        ticketsOpenedInPeriod,
        ticketsClosedInPeriod: closedInPeriod,
        recentTickets: recentTickets.map(t => ({
            id: t.id,
            title: t.ticketDescription,
            client: t.client.name,
            status: t.ticketStatus || "NOVO",
            priority: t.ticketPriority || "MEDIUM",
            date: t.createdAt.toISOString(),
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
