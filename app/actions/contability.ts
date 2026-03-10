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

export async function getContabilityById(id: string) {
    await getSession()

    const contability = await prisma.contability.findUnique({
        where: { id },
        include: {
            clients: {
                select: {
                    id: true,
                    name: true,
                    city: true,
                    type: true,
                    ownerPhone: true,
                    ownerEmail: true,
                    supportReleased: true,
                    createdAt: true,
                },
                orderBy: { name: "asc" },
            },
            _count: { select: { ticketsRequested: true } },
        },
    })

    if (!contability) {
        return null
    }

    return {
        id: contability.id,
        name: contability.name,
        phone: contability.phone,
        email: contability.email,
        address: contability.address,
        city: contability.city,
        houseNumber: contability.houseNumber,
        neighborhood: contability.neighborhood,
        zipCode: contability.zipCode,
        complement: contability.complement,
        state: contability.state,
        cnpj: contability.cnpj,
        cpf: contability.cpf,
        ie: contability.ie,
        type: contability.type === "PESSOA_FISICA" ? "PF" as const : "PJ" as const,
        ticketCount: contability._count.ticketsRequested,
        createdAt: contability.createdAt.toISOString(),
        updatedAt: contability.updatedAt.toISOString(),
        clients: contability.clients.map((client) => ({
            id: client.id,
            name: client.name,
            city: client.city,
            type: client.type === "PESSOA_FISICA" ? "PF" as const : "PJ" as const,
            phone: client.ownerPhone,
            email: client.ownerEmail,
            supportReleased: client.supportReleased ?? false,
            createdAt: client.createdAt.toISOString(),
        })),
    }
}

export async function getContabilities() {
    await getSession()
    const contabilities = await prisma.contability.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            clients: {
                select: { id: true, name: true }
            },
            _count: { select: { ticketsRequested: true } },
        },
    })
    return contabilities.map(c => ({
        id: c.id,
        name: c.name,
        clientCount: c.clients.length,
        clientNames: c.clients.map(cl => cl.name).join(", "),
        phone: c.phone,
        email: c.email,
        address: c.address,
        city: c.city,
        houseNumber: c.houseNumber,
        neighborhood: c.neighborhood,
        zipCode: c.zipCode,
        complement: c.complement,
        state: c.state,
        cnpj: c.cnpj,
        cpf: c.cpf,
        ie: c.ie,
        type: c.type === "PESSOA_FISICA" ? "PF" as const : "PJ" as const,
        ticketCount: c._count.ticketsRequested,
        createdAt: c.createdAt.toISOString(),
    }))
}

export async function getContabilityOptions() {
    await getSession()
    const contabilities = await prisma.contability.findMany({
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            cnpj: true,
            cpf: true,
        },
    })

    return contabilities
}

export async function createContability(data: {
    name?: string
    phone: string
    email: string
    address: string
    city: string
    houseNumber: string
    neighborhood: string
    zipCode: string
    complement: string
    state: string
    cnpj: string
    cpf: string
    ie: string
    type?: "PF" | "PJ"
}) {
    await getSession()
    const contability = await prisma.contability.create({
        data: {
            name: data.name,
            phone: data.phone,
            email: data.email,
            address: data.address,
            city: data.city,
            houseNumber: data.houseNumber,
            neighborhood: data.neighborhood,
            zipCode: data.zipCode,
            complement: data.complement,
            state: data.state,
            cnpj: data.cnpj,
            cpf: data.cpf,
            ie: data.ie,
            type: data.type === "PF" ? "PESSOA_FISICA" : "PESSOA_JURIDICA",
        },
    })
    revalidatePath("/dashboard/contabilidade")
    revalidatePath(`/dashboard/contabilidade/${contability.id}`)
    return { success: true, id: contability.id }
}

export async function updateContability(id: string, data: Record<string, unknown>) {
    await getSession()
    if (data.type === "PF") data.type = "PESSOA_FISICA"
    if (data.type === "PJ") data.type = "PESSOA_JURIDICA"
    await prisma.contability.update({ where: { id }, data })
    revalidatePath("/dashboard/contabilidade")
    revalidatePath(`/dashboard/contabilidade/${id}`)
    return { success: true }
}

export async function attachClientToContability(contabilityId: string, clientId: string) {
    await getSession()

    const client = await prisma.clients.findUnique({
        where: { id: clientId },
        select: { id: true, contabilityId: true },
    })

    if (!client) {
        throw new Error("Cliente não encontrado")
    }

    await prisma.clients.update({
        where: { id: clientId },
        data: { contabilityId },
    })

    revalidatePath("/dashboard/clientes")
    revalidatePath(`/dashboard/clientes/${clientId}`)
    revalidatePath("/dashboard/contabilidade")
    revalidatePath(`/dashboard/contabilidade/${contabilityId}`)

    if (client.contabilityId && client.contabilityId !== contabilityId) {
        revalidatePath(`/dashboard/contabilidade/${client.contabilityId}`)
    }

    return { success: true }
}

export async function deleteContability(id: string) {
    await getSession()

    const linkedClients = await prisma.clients.findMany({
        where: { contabilityId: id },
        select: { id: true },
    })

    await prisma.$transaction(async (tx) => {
        await tx.clients.updateMany({
            where: { contabilityId: id },
            data: { contabilityId: null },
        })

        await tx.contability.delete({ where: { id } })
    })

    revalidatePath("/dashboard/contabilidade")

    for (const client of linkedClients) {
        revalidatePath(`/dashboard/clientes/${client.id}`)
    }

    return { success: true }
}
