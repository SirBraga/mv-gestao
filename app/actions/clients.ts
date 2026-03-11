"use server"

import { prisma } from "@/app/utils/prisma"
import { auth } from "@/app/utils/auth"
import { headers } from "next/headers"
import { cache } from "react"
import { revalidatePath } from "next/cache"
import { getEntityDisplayName } from "@/app/utils/entity-names"

const getSession = cache(async () => {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) throw new Error("Não autenticado")
    return session
})

function normalizeText(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
}

function normalizeDigits(value: string) {
    return value.replace(/\D/g, "")
}

async function getClientPrimaryCompanyContactId(clientId: string) {
    const client = await prisma.clients.findUnique({
        where: { id: clientId },
        select: {
            contacts: {
                orderBy: [
                    { isDefault: "desc" },
                    { createdAt: "asc" },
                ],
                select: {
                    id: true,
                    isDefault: true,
                },
            },
        },
    })

    if (!client) return null

    return client.contacts.find((contact) => contact.isDefault)?.id || client.contacts[0]?.id || null
}

export async function getClients() {
    await getSession()
    const clients = await prisma.clients.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            razaoSocial: true,
            nomeFantasia: true,
            cnpj: true,
            cpf: true,
            type: true,
            city: true,
            ownerPhone: true,
            ownerEmail: true,
            hasContract: true,
            contractType: true,
            supportReleased: true,
            certificateExpiresDate: true,
            certificateType: true,
            createdAt: true,
            contacts: {
                select: {
                    phone: true,
                    email: true,
                    isDefault: true,
                },
            },
            clientProductSerials: {
                select: {
                    expiresAt: true,
                    product: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            _count: { select: { tickets: true, contacts: true } },
        },
    })
    return clients.map(c => ({
        id: c.id,
        name: getEntityDisplayName({
            type: c.type === "PESSOA_FISICA" ? "PF" : "PJ",
            name: c.name,
            razaoSocial: c.razaoSocial,
            nomeFantasia: c.nomeFantasia,
        }),
        razaoSocial: c.razaoSocial,
        nomeFantasia: c.nomeFantasia,
        cnpj: c.cnpj,
        cpf: c.cpf,
        type: c.type === "PESSOA_FISICA" ? "PF" as const : "PJ" as const,
        city: c.city,
        contactPhones: c.contacts.map((ct) => ct.phone).filter((phone): phone is string => !!phone),
        phone: c.contacts.find(ct => ct.isDefault)?.phone || c.contacts[0]?.phone || null,
        email: c.contacts.find(ct => ct.isDefault)?.email || c.contacts[0]?.email || null,
        hasContract: c.hasContract ?? false,
        contractType: c.contractType,
        supportReleased: c.supportReleased ?? false,
        certificateExpiresDate: c.certificateExpiresDate?.toISOString() || null,
        certificateType: c.certificateType,
        ticketCount: c._count.tickets,
        contactCount: c._count.contacts,
        clientProductSerials: c.clientProductSerials.map((serial) => ({
            expiresAt: serial.expiresAt?.toISOString() || null,
            product: serial.product,
        })),
        createdAt: c.createdAt.toISOString(),
    }))
}

export async function getClientOptions() {
    await getSession()
    return prisma.clients.findMany({
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
        },
    })
}

export async function getClientSearchOptions(params?: {
    query?: string
    offset?: number
    limit?: number
}) {
    await getSession()

    const limit = Math.min(Math.max(params?.limit ?? 15, 1), 50)
    const offset = Math.max(params?.offset ?? 0, 0)
    const query = (params?.query || "").trim()

    if (!query) {
        const items = await prisma.clients.findMany({
            orderBy: [{ nomeFantasia: "asc" }, { razaoSocial: "asc" }, { name: "asc" }],
            skip: offset,
            take: limit,
            select: {
                id: true,
                name: true,
                razaoSocial: true,
                nomeFantasia: true,
                cnpj: true,
                cpf: true,
                type: true,
            },
        })

        return {
            items: items.map((item) => ({
                ...item,
                type: item.type === "PESSOA_FISICA" ? "PF" as const : "PJ" as const,
                name: getEntityDisplayName({
                    type: item.type === "PESSOA_FISICA" ? "PF" : "PJ",
                    name: item.name,
                    razaoSocial: item.razaoSocial,
                    nomeFantasia: item.nomeFantasia,
                }),
            })),
            nextOffset: items.length === limit ? offset + items.length : null,
            hasMore: items.length === limit,
        }
    }

    const normalizedQuery = normalizeText(query)
    const digitsQuery = normalizeDigits(query)

    const clients = await prisma.clients.findMany({
        orderBy: [{ nomeFantasia: "asc" }, { razaoSocial: "asc" }, { name: "asc" }],
        select: {
            id: true,
            name: true,
            razaoSocial: true,
            nomeFantasia: true,
            cnpj: true,
            cpf: true,
            type: true,
            contacts: {
                select: {
                    phone: true,
                    isDefault: true,
                },
            },
        },
    })

    const filtered = clients.filter((client) => {
        const type = client.type === "PESSOA_FISICA" ? "PF" : "PJ"
        const displayName = getEntityDisplayName({
            type,
            name: client.name,
            razaoSocial: client.razaoSocial,
            nomeFantasia: client.nomeFantasia,
        })
        const normalizedName = normalizeText(displayName)
        const normalizedLegalName = normalizeText(client.razaoSocial || "")
        const normalizedFantasyName = normalizeText(client.nomeFantasia || "")
        const normalizedCnpj = normalizeDigits(client.cnpj || "")
        const normalizedCpf = normalizeDigits(client.cpf || "")
        const normalizedPrimaryPhone = normalizeDigits(client.contacts.find((contact) => contact.isDefault)?.phone || client.contacts[0]?.phone || "")
        const normalizedContactPhones = client.contacts.map((contact) => normalizeDigits(contact.phone || ""))

        const matchesName =
            normalizedName.includes(normalizedQuery)
            || normalizedLegalName.includes(normalizedQuery)
            || normalizedFantasyName.includes(normalizedQuery)
        const matchesDocument = digitsQuery
            ? normalizedCnpj.includes(digitsQuery) || normalizedCpf.includes(digitsQuery)
            : false
        const matchesPhone = digitsQuery
            ? normalizedPrimaryPhone.includes(digitsQuery) || normalizedContactPhones.some((phone) => phone.includes(digitsQuery))
            : false

        return matchesName || matchesDocument || matchesPhone
    })

    const items = filtered.slice(offset, offset + limit)

    return {
        items: items.map((item) => ({
            ...item,
            type: item.type === "PESSOA_FISICA" ? "PF" as const : "PJ" as const,
            name: getEntityDisplayName({
                type: item.type === "PESSOA_FISICA" ? "PF" : "PJ",
                name: item.name,
                razaoSocial: item.razaoSocial,
                nomeFantasia: item.nomeFantasia,
            }),
        })),
        nextOffset: offset + limit < filtered.length ? offset + limit : null,
        hasMore: offset + limit < filtered.length,
    }
}

export async function getClientById(id: string) {
    await getSession()
    const client = await prisma.clients.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            razaoSocial: true,
            nomeFantasia: true,
            cnpj: true,
            cpf: true,
            ie: true,
            state: true,
            codigoCSC: true,
            tokenCSC: true,
            cnae: true,
            businessSector: true,
            aditionalInfo: true,
            contractType: true,
            contractCancelReason: true,
            contractCancelDate: true,
            blockReason: true,
            photoUrl: true,
            type: true,
            city: true,
            address: true,
            houseNumber: true,
            neighborhood: true,
            zipCode: true,
            complement: true,
            hasContract: true,
            supportReleased: true,
            ownerName: true,
            ownerPhone: true,
            ownerEmail: true,
            ownerCpf: true,
            certificateExpiresDate: true,
            certificateType: true,
            createdAt: true,
            contability: {
                select: {
                    id: true,
                    name: true,
                    razaoSocial: true,
                    nomeFantasia: true,
                    cnpj: true,
                    cpf: true,
                },
            },
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
            products: {
                select: {
                    id: true,
                    name: true,
                },
            },
            clientProducts: {
                orderBy: {
                    createdAt: "asc",
                },
                select: {
                    id: true,
                    installationType: true,
                    priceMonthly: true,
                    priceQuarterly: true,
                    priceYearly: true,
                    notes: true,
                    product: {
                        select: {
                            id: true,
                            name: true,
                            hasSerialControl: true,
                        },
                    },
                    serials: {
                        select: {
                            id: true,
                            serial: true,
                            expiresAt: true,
                        },
                        orderBy: {
                            createdAt: "asc",
                        },
                    },
                    plugins: {
                        select: {
                            id: true,
                            priceMonthly: true,
                            priceQuarterly: true,
                            priceYearly: true,
                            notes: true,
                            productPlugin: {
                                select: {
                                    id: true,
                                    name: true,
                                    status: true,
                                },
                            },
                        },
                        orderBy: {
                            createdAt: "asc",
                        },
                    },
                },
            },
            clientProductSerials: {
                select: {
                    id: true,
                    productId: true,
                    serial: true,
                    expiresAt: true,
                },
                orderBy: {
                    createdAt: "asc",
                },
            },
        },
    })
    if (!client) throw new Error("Cliente não encontrado")
    
    return {
        id: client.id,
        name: getEntityDisplayName({
            type: client.type === "PESSOA_FISICA" ? "PF" : "PJ",
            name: client.name,
            razaoSocial: client.razaoSocial,
            nomeFantasia: client.nomeFantasia,
        }),
        razaoSocial: client.razaoSocial,
        nomeFantasia: client.nomeFantasia,
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
        contractCancelDate: client.contractCancelDate ? new Date(client.contractCancelDate).toLocaleDateString('en-CA') : null,
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
        contability: client.contability ? {
            id: client.contability.id,
            name: getEntityDisplayName({
                type: client.contability.cnpj ? "PJ" : "PF",
                name: client.contability.name,
                razaoSocial: client.contability.razaoSocial,
                nomeFantasia: client.contability.nomeFantasia,
            }),
            cnpj: client.contability.cnpj,
            cpf: client.contability.cpf,
        } : null,
        contacts: client.contacts.map(ct => ({
            id: ct.id,
            name: ct.name,
            phone: ct.phone,
            email: ct.email,
            role: ct.role,
            bestContactTime: ct.bestContactTime,
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
        clientProducts: client.clientProducts.map((clientProduct) => {
            const directSerials = clientProduct.serials.map((serial) => ({
                id: serial.id,
                serial: serial.serial,
                expiresAt: serial.expiresAt?.toISOString() || null,
            }))
            const fallbackSerials = client.clientProductSerials
                .filter((serial) => serial.productId === clientProduct.product.id)
                .map((serial) => ({
                    id: serial.id,
                    serial: serial.serial,
                    expiresAt: serial.expiresAt?.toISOString() || null,
                }))
            const serials = directSerials.length > 0 ? directSerials : fallbackSerials

            return {
                id: clientProduct.id,
                installationType: clientProduct.installationType,
                priceMonthly: clientProduct.priceMonthly,
                priceQuarterly: clientProduct.priceQuarterly,
                priceYearly: clientProduct.priceYearly,
                notes: clientProduct.notes,
                product: clientProduct.product,
                serials,
                plugins: clientProduct.plugins.map((plugin) => ({
                    id: plugin.id,
                    priceMonthly: plugin.priceMonthly,
                    priceQuarterly: plugin.priceQuarterly,
                    priceYearly: plugin.priceYearly,
                    notes: plugin.notes,
                    productPlugin: plugin.productPlugin,
                })),
            }
        }),
        attachments: client.attachments,
    }
}

export async function createClient(data: {
    name: string
    razaoSocial?: string
    nomeFantasia?: string
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
    phone?: string
    email?: string
    ownerName?: string
    ownerPhone?: string
    ownerEmail?: string
    ownerCpf?: string
    hasContract?: boolean
    supportReleased?: boolean
    contabilityId?: string
}) {
    await getSession()
    const id = crypto.randomUUID()
    const isPJ = data.type === "PJ"
    const normalizedCnpj = isPJ ? (data.cnpj || "").replace(/\D/g, "") : ""
    const normalizedCpf = !isPJ ? (data.cpf || "").replace(/\D/g, "") : ""
    const normalizedName = isPJ
        ? (data.nomeFantasia?.trim() || data.razaoSocial?.trim() || data.name.trim())
        : data.name.trim()

    if (isPJ && normalizedCnpj) {
        const existingClient = await prisma.clients.findFirst({
            where: { cnpj: normalizedCnpj },
            select: { id: true, name: true },
        })

        if (existingClient) {
            throw new Error(`Já existe um cliente cadastrado com este CNPJ: ${existingClient.name}`)
        }
    }

    if (!isPJ && normalizedCpf) {
        const existingClient = await prisma.clients.findFirst({
            where: { cpf: normalizedCpf },
            select: { id: true, name: true },
        })

        if (existingClient) {
            throw new Error(`Já existe um cliente cadastrado com este CPF: ${existingClient.name}`)
        }
    }

    await prisma.clients.create({
        data: {
            id,
            name: normalizedName,
            razaoSocial: isPJ ? (data.razaoSocial?.trim() || null) : null,
            nomeFantasia: isPJ ? (data.nomeFantasia?.trim() || null) : null,
            cnpj: isPJ ? (normalizedCnpj || null) : null,
            cpf: isPJ ? null : (normalizedCpf || null),
            ie: isPJ ? (data.ie || null) : null,
            state: data.state || null,
            codigoCSC: isPJ ? (data.codigoCSC || null) : null,
            tokenCSC: isPJ ? (data.tokenCSC || null) : null,
            cnae: isPJ ? (data.cnae || null) : null,
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
            contacts: (data.phone || data.email) ? {
                create: {
                    name: normalizedName,
                    phone: data.phone || null,
                    email: data.email || null,
                    role: "Principal",
                    isDefault: true,
                },
            } : undefined,
            ownerName: data.ownerName || null,
            ownerPhone: data.ownerPhone || null,
            ownerEmail: data.ownerEmail || null,
            ownerCpf: data.ownerCpf || null,
            hasContract: data.hasContract ?? false,
            supportReleased: data.supportReleased ?? false,
            contabilityId: data.contabilityId || null,
        },
    })
    return { success: true, id }
}

export async function updateClient(id: string, data: Record<string, unknown>) {
    await getSession()

    if (data.type === "PF") data.type = "PESSOA_FISICA"
    if (data.type === "PJ") data.type = "PESSOA_JURIDICA"

    const isPJ = data.type === "PESSOA_JURIDICA"
    const isPF = data.type === "PESSOA_FISICA"

    if (isPJ) {
        const nomeFantasia = typeof data.nomeFantasia === "string" ? data.nomeFantasia.trim() : ""
        const razaoSocial = typeof data.razaoSocial === "string" ? data.razaoSocial.trim() : ""
        const currentName = typeof data.name === "string" ? data.name.trim() : ""

        data.name = nomeFantasia || razaoSocial || currentName
        data.razaoSocial = razaoSocial || null
        data.nomeFantasia = nomeFantasia || null
        data.cpf = null
    }

    if (isPF) {
        const currentName = typeof data.name === "string" ? data.name.trim() : ""
        data.name = currentName
        data.razaoSocial = null
        data.nomeFantasia = null
        data.cnpj = null
        data.ie = null
        data.codigoCSC = null
        data.tokenCSC = null
        data.cnae = null
    }

    if ("contabilityId" in data) {
        const contabilityId = typeof data.contabilityId === "string" ? data.contabilityId.trim() : ""
        data.contabilityId = contabilityId || null
    }

    await prisma.clients.update({ where: { id }, data })

    revalidatePath("/dashboard/clientes")
    revalidatePath(`/dashboard/clientes/${id}`)

    return { success: true }
}

export async function deleteClient(id: string) {
    await getSession()
    await prisma.clients.delete({ where: { id } })
    return { success: true }
}

export async function addClientContact(clientId: string, data: {
    name: string
    phone?: string
    email?: string
    role?: string
    bestContactTime?: string
    isDefault?: boolean
}) {
    await getSession()
    
    const result = await prisma.clientContact.create({
        data: {
            clientId,
            name: data.name,
            phone: data.phone || null,
            email: data.email || null,
            role: data.role || null,
            bestContactTime: data.bestContactTime || null,
            isDefault: data.isDefault ?? false,
        },
    })

    return { success: true, id: result.id }
}

export async function deleteClientContact(contactId: string) {
    await getSession()
    await prisma.clientContact.delete({ where: { id: contactId } })
    return { success: true }
}

export async function updateClientContact(contactId: string, data: {
    name: string
    phone?: string
    email?: string
    role?: string
    bestContactTime?: string
}) {
    await getSession()

    await prisma.clientContact.update({
        where: { id: contactId },
        data: {
            name: data.name,
            phone: data.phone || null,
            email: data.email || null,
            role: data.role || null,
            bestContactTime: data.bestContactTime || null,
        },
    })

    return { success: true }
}

export async function getClientContacts(clientId: string) {
    await getSession()
    const contacts = await prisma.clientContact.findMany({
        where: { clientId },
        orderBy: { isDefault: "desc" },
        select: { id: true, name: true, phone: true, email: true, role: true, bestContactTime: true, isDefault: true },
    })
    return contacts
}

export async function cancelContract(clientId: string, cancelReason: string, cancelDate?: string) {
    await getSession()
    
    // Tratar a data no timezone local (Brasil/São Paulo)
    let dateToSave: Date
    if (cancelDate) {
        // Criar a data exata no timezone local
        const [year, month, day] = cancelDate.split('-').map(Number)
        // Usar UTC para garantir que a data seja salva corretamente
        dateToSave = new Date(Date.UTC(year, month - 1, day, 15, 0, 0)) // 15h UTC = 12h no Brasil (considerando DST)
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
    const attachment = await prisma.attachment.create({
        data: {
            clientId,
            url: data.url,
            fileName: data.fileName,
            fileType: data.fileType,
            fileSize: data.fileSize,
        },
    })
    return { success: true, id: attachment.id }
}

export async function deleteClientAttachment(attachmentId: string) {
    await getSession()
    await prisma.attachment.delete({ where: { id: attachmentId } })
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
    return { success: true }
}
