"use server"

import { prisma } from "@/app/utils/prisma"
import { auth } from "@/app/utils/auth"
import { hasPermission, sanitizePermissions, type Role, type UserPermissions } from "@/app/utils/permissions"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { randomBytes, scryptSync } from "node:crypto"

type SessionUserContext = {
    id: string
    role: Role
    permissions: UserPermissions
}

function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex")
    const key = scryptSync(password.normalize("NFKC"), salt, 64, {
        N: 16384,
        r: 16,
        p: 1,
        maxmem: 128 * 16384 * 16 * 2,
    }).toString("hex")

    return `${salt}:${key}`
}

async function getSessionUserContext(): Promise<SessionUserContext> {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) throw new Error("Não autorizado")

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, permissions: true },
    })

    if (!user) throw new Error("Usuário não encontrado")

    return {
        id: session.user.id,
        role: user.role as Role,
        permissions: sanitizePermissions(user.permissions, user.role as Role),
    }
}

async function requireUserManager() {
    const currentUser = await getSessionUserContext()

    if (currentUser.role !== "ADMIN" && !hasPermission(currentUser.permissions, currentUser.role, "funcionarios")) {
        throw new Error("Sem permissão para gerenciar funcionários")
    }

    return currentUser
}

async function getTargetUser(userId: string) {
    const target = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            role: true,
            permissions: true,
        },
    })

    if (!target) throw new Error("Usuário não encontrado")

    return {
        ...target,
        role: target.role as Role,
        permissions: sanitizePermissions(target.permissions, target.role as Role),
    }
}

function assertCanManageTarget(currentUser: SessionUserContext, targetRole: Role) {
    if (targetRole === "ADMIN" && currentUser.role !== "ADMIN") {
        throw new Error("Você não pode gerenciar uma conta administradora")
    }
}

function sanitizeManagedPermissions(currentUser: SessionUserContext, role: Role, permissions: unknown) {
    const nextPermissions = sanitizePermissions(permissions, role)

    if (currentUser.role !== "ADMIN") {
        nextPermissions.funcionarios = false
    }

    return nextPermissions
}

export async function getUsers() {
    await requireUserManager()

    return prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            emailVerified: true,
            permissions: true,
            createdAt: true,
            updatedAt: true,
        },
    }).then((users) =>
        users.map((user) => ({
            ...user,
            role: user.role as Role,
            permissions: sanitizePermissions(user.permissions, user.role as Role),
        }))
    )
}

export async function createUser(data: {
    name: string
    email: string
    password: string
    role: Role
    permissions?: Partial<UserPermissions>
}) {
    const currentUser = await requireUserManager()

    if (!data.name || !data.email || !data.password) {
        throw new Error("Nome, email e senha são obrigatórios")
    }

    if (data.password.length < 8) {
        throw new Error("A senha deve ter pelo menos 8 caracteres")
    }

    if (currentUser.role !== "ADMIN" && data.role === "ADMIN") {
        throw new Error("Você não pode criar um administrador")
    }

    const result = await auth.api.signUpEmail({
        body: {
            name: data.name,
            email: data.email,
            password: data.password,
        },
    })

    if (!result) throw new Error("Erro ao criar usuário")

    const permissions = sanitizeManagedPermissions(currentUser, data.role, data.permissions)

    await prisma.user.update({
        where: { email: data.email },
        data: {
            role: data.role,
            permissions,
        },
    })

    revalidatePath("/dashboard/funcionarios")
    revalidatePath("/dashboard")
    return { success: true }
}

export async function updateUserRole(userId: string, role: Role) {
    const currentUser = await requireUserManager()
    const target = await getTargetUser(userId)

    if (currentUser.id === userId) {
        throw new Error("Você não pode alterar sua própria permissão")
    }

    assertCanManageTarget(currentUser, target.role)

    if (currentUser.role !== "ADMIN" && role === "ADMIN") {
        throw new Error("Você não pode promover um usuário para administrador")
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            role,
            permissions: sanitizeManagedPermissions(currentUser, role, target.permissions),
        },
    })

    revalidatePath("/dashboard/funcionarios")
    revalidatePath("/dashboard")
    return { success: true }
}

export async function deleteUser(userId: string) {
    const currentUser = await requireUserManager()
    const target = await getTargetUser(userId)

    if (currentUser.id === userId) {
        throw new Error("Você não pode remover sua própria conta")
    }

    assertCanManageTarget(currentUser, target.role)

    await prisma.session.deleteMany({ where: { userId } })
    await prisma.account.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })

    revalidatePath("/dashboard/funcionarios")
    revalidatePath("/dashboard")
    return { success: true }
}

export async function updateUser(userId: string, data: {
    name: string
    email: string
    role: Role
}) {
    const currentUser = await requireUserManager()
    const target = await getTargetUser(userId)

    if (currentUser.id === userId && data.role !== target.role) {
        throw new Error("Você não pode alterar sua própria permissão")
    }

    assertCanManageTarget(currentUser, target.role)

    if (!data.name.trim()) throw new Error("Nome é obrigatório")
    if (!data.email.trim()) throw new Error("Email é obrigatório")

    if (currentUser.role !== "ADMIN" && data.role === "ADMIN") {
        throw new Error("Você não pode promover um usuário para administrador")
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            name: data.name.trim(),
            email: data.email.trim(),
            role: data.role,
            permissions: sanitizeManagedPermissions(currentUser, data.role, target.permissions),
        },
    })

    revalidatePath("/dashboard/funcionarios")
    revalidatePath("/dashboard")
    return { success: true }
}

export async function updateUserPermissions(userId: string, permissions: Partial<UserPermissions>) {
    const currentUser = await requireUserManager()
    const target = await getTargetUser(userId)

    if (currentUser.id === userId && currentUser.role !== "ADMIN") {
        throw new Error("Você não pode alterar suas próprias permissões")
    }

    assertCanManageTarget(currentUser, target.role)

    await prisma.user.update({
        where: { id: userId },
        data: {
            permissions: sanitizeManagedPermissions(currentUser, target.role, permissions),
        },
    })

    revalidatePath("/dashboard/funcionarios")
    revalidatePath("/dashboard")
    return { success: true }
}

export async function updateUserPassword(userId: string, password: string) {
    const currentUser = await requireUserManager()
    const target = await getTargetUser(userId)

    if (password.length < 8) {
        throw new Error("A senha deve ter pelo menos 8 caracteres")
    }

    assertCanManageTarget(currentUser, target.role)

    const hashedPassword = hashPassword(password)

    await prisma.account.updateMany({
        where: {
            userId,
            providerId: "credential",
        },
        data: {
            password: hashedPassword,
        },
    })

    revalidatePath("/dashboard/funcionarios")
    return { success: true }
}
