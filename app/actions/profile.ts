"use server"

import { prisma } from "@/app/utils/prisma"
import { auth } from "@/app/utils/auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

async function getSession() {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) throw new Error("Não autenticado")
    return session
}

export async function updateProfileImage(imageUrl: string) {
    const session = await getSession()
    await prisma.user.update({
        where: { id: session.user.id },
        data: { image: imageUrl },
    })
    revalidatePath("/dashboard")
    return { success: true }
}

export async function getProfile() {
    const session = await getSession()
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true, image: true, role: true },
    })
    return user
}
