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
        clientId: p.clientId,
        createdAt: p.createdAt.toISOString(),
    }))
}

export async function createProduct(data: {
    name: string
    description?: string
    category?: string
    status?: string
    priceMonthly?: number
    priceQuarterly?: number
    priceYearly?: number
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
