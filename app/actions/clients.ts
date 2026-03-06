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
            clientProductSerials: true,
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
        businessSector: c.businessSector,
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
        contractType: c.contractType,
        supportReleased: c.supportReleased ?? false,
        ownerName: c.ownerName,
        ownerPhone: c.ownerPhone,
        ownerEmail: c.ownerEmail,
        certificateExpiresDate: c.certificateExpiresDate?.toISOString() || null,
        certificateType: c.certificateType,
        ticketCount: c._count.tickets,
        contactCount: c.contacts.length,
        clientProductSerials: c.clientProductSerials,
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
        state: client.state,
        codigoCSC: client.codigoCSC,
        tokenCSC: client.tokenCSC,
        cnae: client.cnae,
        businessSector: client.businessSector,
        aditionalInfo: client.aditionalInfo,
        contractType: client.contractType,
        contractCancelReason: client.contractCancelReason,
        contractCancelDate: client.contractCancelDate?.toISOString(),
        blockReason: client.blockReason,
        photoUrl: client.photoUrl,
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
        ownerPhone: client.ownerPhone,
        ownerEmail: client.ownerEmail,
        ownerCpf: client.ownerCpf,
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
    state?: string
    codigoCSC?: string
    tokenCSC?: string
    cnae?: string
    businessSector?: string
    type: "PF" | "PJ"
    address: string
    city: string
    houseNumber: string
    neighborhood: string
    zipCode: string
    complement: string
    aditionalInfo?: string
    contractType?: "MENSAL" | "ANUAL" | "AVULSO" | "CANCELADO"
    certificateType?: string
    certificateExpiresDate?: Date
    photoUrl?: string
    ownerName?: string
    ownerPhone?: string
    ownerEmail?: string
    ownerCpf?: string
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
            state: data.state || null,
            codigoCSC: data.codigoCSC || null,
            tokenCSC: data.tokenCSC || null,
            cnae: data.cnae || null,
            type: data.type === "PF" ? "PESSOA_FISICA" : "PESSOA_JURIDICA",
            address: data.address,
            city: data.city,
            houseNumber: data.houseNumber,
            neighborhood: data.neighborhood,
            zipCode: data.zipCode,
            complement: data.complement || "",
            aditionalInfo: data.aditionalInfo || null,
            contractType: data.contractType || null,
            photoUrl: data.photoUrl || null,
            ownerName: data.ownerName || null,
            ownerPhone: data.ownerPhone || null,
            ownerEmail: data.ownerEmail || null,
            ownerCpf: data.ownerCpf || null,
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

export async function cancelContract(clientId: string, cancelReason: string, cancelDate?: string) {
    await getSession()
    
    // Tratar a data no timezone local (Brasil/São Paulo)
    let dateToSave: Date
    if (cancelDate) {
        // Criar a data no timezone local para evitar conversão UTC
        const [year, month, day] = cancelDate.split('-').map(Number)
        dateToSave = new Date(year, month - 1, day, 12, 0, 0) // Meio-dia para evitar problemas com DST
    } else {
        dateToSave = new Date()
    }
    
    await prisma.clients.update({
        where: { id: clientId },
        data: {
            contractType: "CANCELADO",
            contractCancelReason: cancelReason,
            contractCancelDate: dateToSave,
            supportReleased: false,
        },
    })
    revalidatePath("/dashboard/clientes")
    revalidatePath(`/dashboard/clientes/${clientId}`)
    return { success: true }
}

export async function getClientContability(clientId: string) {
    await getSession()
    const client = await prisma.clients.findUnique({
        where: { id: clientId },
        select: { contability: true }
    })
    if (!client?.contability) return null
    
    return prisma.contability.findUnique({
        where: { id: client.contability.id },
        select: { id: true, name: true, cnpj: true, cpf: true, email: true, phone: true },
    })
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

export async function toggleClientSupport(id: string, released: boolean, blockReason?: "CONTRATO_CANCELADO" | "INADIMPLENCIA" | "SOLICITACAO_CLIENTE" | "OUTROS") {
    await getSession()
    await prisma.clients.update({
        where: { id },
        data: {
            supportReleased: released,
            blockReason: released ? null : (blockReason || null),
        },
    })
    revalidatePath("/dashboard/clientes")
    return { success: true }
}
