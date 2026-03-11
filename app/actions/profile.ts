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
    const user = await prisma.user.update({
        where: { id: session.user.id },
        data: { image: imageUrl },
        select: { id: true, name: true, email: true, image: true, role: true },
    })
    revalidatePath("/dashboard", "layout")
    revalidatePath("/dashboard/perfil")
    return { success: true, user }
}

export async function updateProfile(data: { name: string; image?: string | null }) {
    const session = await getSession()
    const name = data.name.trim()

    if (!name) {
        throw new Error("Nome é obrigatório")
    }

    const user = await prisma.user.update({
        where: { id: session.user.id },
        data: {
            name,
            ...(data.image !== undefined ? { image: data.image } : {}),
        },
        select: { id: true, name: true, email: true, image: true, role: true },
    })

    revalidatePath("/dashboard", "layout")
    revalidatePath("/dashboard/perfil")
    return { success: true, user }
}

export async function getProfile() {
    const session = await getSession()
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true, image: true, role: true },
    })
    return user
}
