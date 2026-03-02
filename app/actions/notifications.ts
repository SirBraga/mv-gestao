"use server"

import { prisma } from "@/app/utils/prisma"
import { auth } from "@/app/utils/auth"
import { headers } from "next/headers"

async function getSession() {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) throw new Error("Não autenticado")
    return session
}

export async function getNotifications() {
    const session = await getSession()
    const notifications = await prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
    })
    return notifications.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        link: n.link,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
    }))
}

export async function getUnreadNotificationCount() {
    const session = await getSession()
    return prisma.notification.count({
        where: { userId: session.user.id, read: false },
    })
}

export async function markNotificationRead(notificationId: string) {
    await getSession()
    await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
    })
    return { success: true }
}

export async function markAllNotificationsRead() {
    const session = await getSession()
    await prisma.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true },
    })
    return { success: true }
}

export async function createNotification(data: {
    userId: string
    title: string
    message: string
    type?: string
    link?: string
}) {
    await prisma.notification.create({
        data: {
            userId: data.userId,
            title: data.title,
            message: data.message,
            type: data.type || "TICKET_ASSIGNED",
            link: data.link || null,
        },
    })
}
