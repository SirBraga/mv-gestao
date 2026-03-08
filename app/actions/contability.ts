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
    return { success: true, id: contability.id }
}

export async function updateContability(id: string, data: Record<string, unknown>) {
    await getSession()
    if (data.type === "PF") data.type = "PESSOA_FISICA"
    if (data.type === "PJ") data.type = "PESSOA_JURIDICA"
    await prisma.contability.update({ where: { id }, data })
    revalidatePath("/dashboard/contabilidade")
    return { success: true }
}

export async function deleteContability(id: string) {
    await getSession()
    await prisma.contability.delete({ where: { id } })
    revalidatePath("/dashboard/contabilidade")
    return { success: true }
}
