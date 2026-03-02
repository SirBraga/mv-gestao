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

export async function getClients() {
    await getSession()
    const clients = await prisma.clients.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            contacts: true,
            _count: { select: { tickets: true } },
        },
    })
    return clients.map(c => ({
        id: c.id,
        name: c.name,
        cnpj: c.cnpj,
        cpf: c.cpf,
        ie: c.ie,
        cnae: c.cnae,
        type: c.type === "PESSOA_FISICA" ? "PF" as const : "PJ" as const,
        city: c.city,
        address: c.address,
        houseNumber: c.houseNumber,
        neighborhood: c.neighborhood,
        zipCode: c.zipCode,
        complement: c.complement,
        phone: c.contacts.find(ct => ct.isDefault)?.phone || c.ownerPhone || null,
        email: c.contacts.find(ct => ct.isDefault)?.email || c.ownerEmail || null,
        hasContract: c.hasContract ?? false,
        supportReleased: c.supportReleased ?? false,
        ownerName: c.ownerName,
        ownerPhone: c.ownerPhone,
        ownerEmail: c.ownerEmail,
        certificateExpiresDate: c.certificateExpiresDate?.toISOString() || null,
        certificateType: c.certificateType,
        ticketCount: c._count.tickets,
        contactCount: c.contacts.length,
        createdAt: c.createdAt.toISOString(),
    }))
}

export async function getClientById(id: string) {
    await getSession()
    const client = await prisma.clients.findUnique({
        where: { id },
        include: {
            contacts: { orderBy: { isDefault: "desc" } },
            attachments: {
                select: { id: true, url: true, fileName: true, fileType: true, fileSize: true },
                orderBy: { createdAt: "desc" },
            },
            tickets: {
                orderBy: { createdAt: "desc" },
                take: 20,
                include: {
                    assignedTo: { select: { name: true } },
                    requestedByContact: { select: { name: true } },
                    requestedByContability: { select: { id: true } },
                },
            },
            products: true,
            contability: true,
        },
    })
    if (!client) throw new Error("Cliente não encontrado")
    return {
        id: client.id,
        name: client.name,
        cnpj: client.cnpj,
        cpf: client.cpf,
        ie: client.ie,
        cnae: client.cnae,
        aditionalInfo: client.aditionalInfo,
        type: client.type === "PESSOA_FISICA" ? "PF" as const : "PJ" as const,
        city: client.city,
        address: client.address,
        houseNumber: client.houseNumber,
        neighborhood: client.neighborhood,
        zipCode: client.zipCode,
        complement: client.complement,
        hasContract: client.hasContract ?? false,
        supportReleased: client.supportReleased ?? false,
        ownerName: client.ownerName,
        ownerAddress: client.ownerAddress,
        ownerPhone: client.ownerPhone,
        ownerEmail: client.ownerEmail,
        ownerCpf: client.ownerCpf,
        ownerNeighborhood: client.ownerNeighborhood,
        ownerCity: client.ownerCity,
        ownerState: client.ownerState,
        ownerZipCode: client.ownerZipCode,
        certificateExpiresDate: client.certificateExpiresDate?.toISOString() || null,
        certificateType: client.certificateType,
        createdAt: client.createdAt.toISOString(),
        contacts: client.contacts.map(ct => ({
            id: ct.id,
            name: ct.name,
            phone: ct.phone,
            email: ct.email,
            role: ct.role,
            isDefault: ct.isDefault,
        })),
        tickets: client.tickets.map(t => ({
            id: t.id,
            ticketNumber: t.ticketNumber,
            ticketDescription: t.ticketDescription,
            status: t.ticketStatus || "NOVO",
            priority: t.ticketPriority || "MEDIUM",
            assignedTo: t.assignedTo?.name || null,
            requesterName: t.requestedByContact?.name || null,
            createdAt: t.createdAt.toISOString(),
        })),
        products: client.products.map(p => ({
            id: p.id,
            name: p.name,
        })),
        attachments: client.attachments,
    }
}

export async function createClient(data: {
    name: string
    cnpj?: string
    cpf?: string
    ie?: string
    cnae?: string
    type: "PF" | "PJ"
    address: string
    city: string
    houseNumber: string
    neighborhood: string
    zipCode: string
    complement: string
    ownerName?: string
    ownerPhone?: string
    ownerEmail?: string
    hasContract?: boolean
    supportReleased?: boolean
}) {
    await getSession()
    const id = crypto.randomUUID()
    await prisma.clients.create({
        data: {
            id,
            name: data.name,
            cnpj: data.cnpj || null,
            cpf: data.cpf || null,
            ie: data.ie || null,
            cnae: data.cnae || null,
            type: data.type === "PF" ? "PESSOA_FISICA" : "PESSOA_JURIDICA",
            address: data.address,
            city: data.city,
            houseNumber: data.houseNumber,
            neighborhood: data.neighborhood,
            zipCode: data.zipCode,
            complement: data.complement || "",
            ownerName: data.ownerName || null,
            ownerPhone: data.ownerPhone || null,
            ownerEmail: data.ownerEmail || null,
            hasContract: data.hasContract ?? false,
            supportReleased: data.supportReleased ?? false,
        },
    })
    revalidatePath("/dashboard/clientes")
    return { success: true, id }
}

export async function updateClient(id: string, data: Record<string, unknown>) {
    await getSession()
    // Map PF/PJ to enum
    if (data.type === "PF") data.type = "PESSOA_FISICA"
    if (data.type === "PJ") data.type = "PESSOA_JURIDICA"

    await prisma.clients.update({ where: { id }, data })
    revalidatePath("/dashboard/clientes")
    return { success: true }
}

export async function deleteClient(id: string) {
    await getSession()
    await prisma.clients.delete({ where: { id } })
    revalidatePath("/dashboard/clientes")
    return { success: true }
}

export async function addClientContact(clientId: string, data: {
    name: string
    phone?: string
    email?: string
    role?: string
    isDefault?: boolean
}) {
    await getSession()
    await prisma.clientContact.create({
        data: {
            clientId,
            name: data.name,
            phone: data.phone || null,
            email: data.email || null,
            role: data.role || null,
            isDefault: data.isDefault ?? false,
        },
    })
    revalidatePath("/dashboard/clientes")
    return { success: true }
}

export async function deleteClientContact(contactId: string) {
    await getSession()
    await prisma.clientContact.delete({ where: { id: contactId } })
    revalidatePath("/dashboard/clientes")
    return { success: true }
}

export async function getClientContacts(clientId: string) {
    await getSession()
    const contacts = await prisma.clientContact.findMany({
        where: { clientId },
        orderBy: { isDefault: "desc" },
        select: { id: true, name: true, phone: true, email: true, role: true, isDefault: true },
    })
    return contacts
}

export async function addClientAttachment(clientId: string, data: { url: string; fileName: string; fileType: string; fileSize: number }) {
    await getSession()
    await prisma.attachment.create({
        data: {
            clientId,
            url: data.url,
            fileName: data.fileName,
            fileType: data.fileType,
            fileSize: data.fileSize,
        },
    })
    revalidatePath("/dashboard/clientes")
    return { success: true }
}

export async function deleteClientAttachment(attachmentId: string) {
    await getSession()
    await prisma.attachment.delete({ where: { id: attachmentId } })
    revalidatePath("/dashboard/clientes")
    return { success: true }
}

export async function toggleClientSupport(id: string, released: boolean) {
    await getSession()
    await prisma.clients.update({
        where: { id },
        data: { supportReleased: released },
    })
    revalidatePath("/dashboard/clientes")
    return { success: true }
}
