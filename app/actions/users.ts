"use server"

import { prisma } from "@/app/utils/prisma"
import { auth } from "@/app/utils/auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

type Role = "ADMIN" | "MODERATOR" | "USER"

async function requireAdmin() {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) throw new Error("Não autorizado")

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    })

    if (user?.role !== "ADMIN") throw new Error("Apenas administradores podem gerenciar funcionários")
    return session
}

export async function getUsers() {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) throw new Error("Não autorizado")

    return prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
        },
    })
}

export async function createUser(data: {
    name: string
    email: string
    password: string
    role: Role
}) {
    await requireAdmin()

    if (!data.name || !data.email || !data.password) {
        throw new Error("Nome, email e senha são obrigatórios")
    }

    // Use better-auth signUp to hash password correctly
    const result = await auth.api.signUpEmail({
        body: {
            name: data.name,
            email: data.email,
            password: data.password,
        },
    })

    if (!result) throw new Error("Erro ao criar usuário")

    // Update role if not default
    if (data.role && data.role !== "USER") {
        await prisma.user.update({
            where: { email: data.email },
            data: { role: data.role },
        })
    }

    revalidatePath("/dashboard/funcionarios")
    return { success: true }
}

export async function updateUserRole(userId: string, role: Role) {
    const session = await requireAdmin()

    // Prevent self-demotion
    if (session.user.id === userId) {
        throw new Error("Você não pode alterar sua própria permissão")
    }

    await prisma.user.update({
        where: { id: userId },
        data: { role },
    })

    revalidatePath("/dashboard/funcionarios")
    return { success: true }
}

export async function deleteUser(userId: string) {
    const session = await requireAdmin()

    if (session.user.id === userId) {
        throw new Error("Você não pode remover sua própria conta")
    }

    // Delete sessions and accounts first, then user
    await prisma.session.deleteMany({ where: { userId } })
    await prisma.account.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })

    revalidatePath("/dashboard/funcionarios")
    return { success: true }
}

export async function updateUserName(userId: string, name: string) {
    await requireAdmin()

    if (!name.trim()) throw new Error("Nome é obrigatório")

    await prisma.user.update({
        where: { id: userId },
        data: { name: name.trim() },
    })

    revalidatePath("/dashboard/funcionarios")
    return { success: true }
}
