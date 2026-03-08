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

export async function getProducts() {
    await getSession()
    const products = await prisma.products.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            client: { select: { id: true, name: true } },
        },
    })
    return products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        status: p.status || "ATIVO",
        priceMonthly: p.priceMonthly,
        priceQuarterly: p.priceQuarterly,
        priceYearly: p.priceYearly,
        hasSerialControl: p.hasSerialControl,
        clientId: p.clientId,
        createdAt: p.createdAt.toISOString(),
    }))
}

export async function getProductOptions() {
    await getSession()
    const products = await prisma.products.findMany({
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            hasSerialControl: true,
        },
    })

    return products
}

export async function createProduct(data: {
    name: string
    description?: string
    category?: string
    status?: string
    priceMonthly?: number
    priceQuarterly?: number
    priceYearly?: number
    hasSerialControl?: boolean
}) {
    await getSession()
    const product = await prisma.products.create({
        data: {
            name: data.name,
            description: data.description || null,
            category: data.category || null,
            status: data.status || "ATIVO",
            priceMonthly: data.priceMonthly || null,
            priceQuarterly: data.priceQuarterly || null,
            priceYearly: data.priceYearly || null,
            hasSerialControl: data.hasSerialControl || false,
        },
    })
    revalidatePath("/dashboard/produtos")
    return { success: true, id: product.id }
}

export async function updateProduct(id: string, data: {
    name?: string
    description?: string
    category?: string
    status?: string
    priceMonthly?: number | null
    priceQuarterly?: number | null
    priceYearly?: number | null
    hasSerialControl?: boolean
}) {
    await getSession()
    await prisma.products.update({ where: { id }, data })
    revalidatePath("/dashboard/produtos")
    return { success: true }
}

export async function deleteProduct(id: string) {
    await getSession()
    await prisma.products.delete({ where: { id } })
    revalidatePath("/dashboard/produtos")
    return { success: true }
}

// Actions para ClientProductSerial
export async function getClientProductSerials(clientId: string) {
    await getSession()
    const serials = await prisma.clientProductSerial.findMany({
        where: { clientId },
        include: {
            product: { select: { id: true, name: true, hasSerialControl: true } },
        },
        orderBy: { createdAt: "desc" },
    })
    return serials.map(s => ({
        id: s.id,
        productId: s.productId,
        productName: s.product.name,
        productHasSerialControl: s.product.hasSerialControl,
        serial: s.serial,
        expiresAt: s.expiresAt?.toISOString(),
        createdAt: s.createdAt.toISOString(),
    }))
}

export async function createClientProductSerial(data: {
    clientId: string
    productId: string
    serial: string
    expiresAt?: Date
}) {
    await getSession()
    
    // Primeiro, buscar se já existe um serial para este cliente/produto
    const existingSerial = await prisma.clientProductSerial.findFirst({
        where: {
            clientId: data.clientId,
            productId: data.productId,
        },
    })
    
    let serial
    if (existingSerial) {
        // Atualizar o serial existente
        serial = await prisma.clientProductSerial.update({
            where: { id: existingSerial.id },
            data: {
                serial: data.serial,
                expiresAt: data.expiresAt || null,
            },
        })
    } else {
        // Criar novo serial
        serial = await prisma.clientProductSerial.create({
            data: {
                clientId: data.clientId,
                productId: data.productId,
                serial: data.serial,
                expiresAt: data.expiresAt || null,
            },
        })
    }

    return { success: true, id: serial.id }
}

export async function updateClientProductSerial(id: string, data: {
    serial?: string
    expiresAt?: Date | null
}) {
    await getSession()
    await prisma.clientProductSerial.update({ where: { id }, data })
    return { success: true }
}

export async function deleteClientProductSerial(id: string) {
    await getSession()
    await prisma.clientProductSerial.delete({ where: { id } })
    return { success: true }
}
