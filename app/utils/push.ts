import webpush from "web-push"
import { prisma } from "./prisma"

webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
)

export async function sendPushToUser(userId: string, payload: {
    title: string
    body: string
    url?: string
    tag?: string
}) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { pushSubscription: true },
    })
    if (!user?.pushSubscription) return

    let subscription: webpush.PushSubscription
    try {
        subscription = JSON.parse(user.pushSubscription) as webpush.PushSubscription
    } catch {
        return
    }

    try {
        await webpush.sendNotification(subscription, JSON.stringify(payload))
    } catch (err: unknown) {
        // Se subscription expirou/inválida, limpar do banco
        const status = (err as { statusCode?: number }).statusCode
        if (status === 410 || status === 404) {
            await prisma.user.update({
                where: { id: userId },
                data: { pushSubscription: null },
            })
        }
    }
}
