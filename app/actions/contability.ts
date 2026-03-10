"use server"

import { prisma } from "@/app/utils/prisma"
import { auth } from "@/app/utils/auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

const prismaAny = prisma as any

async function getSession() {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) throw new Error("Não autenticado")
    return session
}

export async function getContabilityById(id: string) {
    await getSession()

    const contability: any = await prismaAny.contability.findUnique({
        where: { id },
        include: {
            contacts: {
                orderBy: [
                    { isDefault: "desc" },
                    { createdAt: "asc" },
                ],
            },
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

    const defaultContact = contability.contacts.find((contact: any) => contact.isDefault) || contability.contacts[0] || null

    return {
        id: contability.id,
        name: contability.name,
        phone: defaultContact?.phone || contability.phone,
        email: defaultContact?.email || contability.email,
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
        contacts: contability.contacts.map((contact: any) => ({
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
            role: contact.role,
            bestContactTime: contact.bestContactTime,
            isDefault: contact.isDefault,
            createdAt: contact.createdAt.toISOString(),
            updatedAt: contact.updatedAt.toISOString(),
        })),
        clients: contability.clients.map((client: any) => ({
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
    const contabilities: any[] = await prismaAny.contability.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            contacts: {
                select: {
                    phone: true,
                    email: true,
                    isDefault: true,
                    createdAt: true,
                },
                orderBy: [
                    { isDefault: "desc" },
                    { createdAt: "asc" },
                ],
            },
            clients: {
                select: { id: true, name: true }
            },
            _count: { select: { ticketsRequested: true, contacts: true } },
        },
    })
    return contabilities.map((c: any) => {
        const defaultPhone = c.contacts.find((contact: any) => contact.isDefault)?.phone || c.contacts[0]?.phone || c.phone
        const defaultEmail = c.contacts.find((contact: any) => contact.isDefault)?.email || c.contacts[0]?.email || c.email

        return {
            id: c.id,
            name: c.name,
            clientCount: c.clients.length,
            clientNames: c.clients.map((cl: any) => cl.name).join(", "),
            phone: defaultPhone,
            email: defaultEmail,
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
            contactCount: c._count.contacts,
            createdAt: c.createdAt.toISOString(),
        }
    })
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
    phone?: string
    email?: string
    address?: string
    city?: string
    houseNumber?: string
    neighborhood?: string
    zipCode?: string
    complement?: string
    state?: string
    cnpj?: string
    cpf?: string
    ie?: string
    type?: "PF" | "PJ"
}) {
    await getSession()
    const contability = await prisma.contability.create({
        data: {
            name: data.name,
            phone: data.phone || null,
            email: data.email || null,
            address: data.address || null,
            city: data.city || null,
            houseNumber: data.houseNumber || null,
            neighborhood: data.neighborhood || null,
            zipCode: data.zipCode || null,
            complement: data.complement || null,
            state: data.state || null,
            cnpj: data.cnpj || null,
            cpf: data.cpf || null,
            ie: data.ie || null,
            type: data.type === "PF" ? "PESSOA_FISICA" : "PESSOA_JURIDICA",
            contacts: {
                create: data.phone || data.email ? {
                    name: data.name?.trim() || "Contato principal",
                    phone: data.phone || null,
                    email: data.email || null,
                    isDefault: true,
                } : undefined,
            },
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

export async function addContabilityContact(contabilityId: string, data: {
    name: string
    phone?: string
    email?: string
    role?: string
    bestContactTime?: string
    isDefault?: boolean
}) {
    await getSession()

    const result = await prisma.$transaction(async (tx) => {
        if (data.isDefault) {
            await (tx as any).contabilityContact.updateMany({
                where: { contabilityId, isDefault: true },
                data: { isDefault: false },
            })
        }

        return (tx as any).contabilityContact.create({
            data: {
                contabilityId,
                name: data.name,
                phone: data.phone || null,
                email: data.email || null,
                role: data.role || null,
                bestContactTime: data.bestContactTime || null,
                isDefault: data.isDefault ?? false,
            },
        })
    })

    revalidatePath("/dashboard/contabilidade")
    revalidatePath(`/dashboard/contabilidade/${contabilityId}`)
    return { success: true, id: result.id }
}

export async function deleteContabilityContact(contactId: string) {
    await getSession()

    const contact = await prismaAny.contabilityContact.findUnique({
        where: { id: contactId },
        select: { contabilityId: true },
    })

    if (!contact) throw new Error("Contato não encontrado")

    await prismaAny.contabilityContact.delete({ where: { id: contactId } })

    revalidatePath("/dashboard/contabilidade")
    revalidatePath(`/dashboard/contabilidade/${contact.contabilityId}`)
    return { success: true }
}

export async function getContabilityContacts(contabilityId: string) {
    await getSession()
    return prismaAny.contabilityContact.findMany({
        where: { contabilityId },
        orderBy: [
            { isDefault: "desc" },
            { createdAt: "asc" },
        ],
        select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
            bestContactTime: true,
            isDefault: true,
        },
    })
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
