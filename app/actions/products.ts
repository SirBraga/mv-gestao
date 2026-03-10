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
            productPlugins: {
                orderBy: { name: "asc" },
                select: {
                    id: true,
                    name: true,
                    status: true,
                    priceMonthly: true,
                    priceQuarterly: true,
                    priceYearly: true,
                },
            },
            clientProducts: {
                select: {
                    id: true,
                    installationType: true,
                },
            },
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
        clientUsageCount: p.clientProducts.length,
        installationTypesInUse: [...new Set(p.clientProducts.map(cp => cp.installationType).filter(Boolean))],
        plugins: p.productPlugins.map(plugin => ({
            id: plugin.id,
            name: plugin.name,
            status: plugin.status || "ATIVO",
            priceMonthly: plugin.priceMonthly,
            priceQuarterly: plugin.priceQuarterly,
            priceYearly: plugin.priceYearly,
        })),
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
    plugins?: Array<{
        name: string
        status?: string
        priceMonthly?: number
        priceQuarterly?: number
        priceYearly?: number
    }>
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
            productPlugins: data.plugins?.length ? {
                create: data.plugins
                    .map((plugin) => ({
                        name: plugin.name.trim(),
                        status: plugin.status || "ATIVO",
                        priceMonthly: plugin.priceMonthly || null,
                        priceQuarterly: plugin.priceQuarterly || null,
                        priceYearly: plugin.priceYearly || null,
                    }))
                    .filter((plugin) => plugin.name),
            } : undefined,
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
    plugins?: Array<{
        name: string
        status?: string
        priceMonthly?: number | null
        priceQuarterly?: number | null
        priceYearly?: number | null
    }>
}) {
    await getSession()

    if (data.hasSerialControl === false) {
        const currentProduct = await prisma.products.findUnique({
            where: { id },
            select: { hasSerialControl: true },
        })

        const isDisablingSerialControl = currentProduct?.hasSerialControl === true

        if (!isDisablingSerialControl) {
            const plugins = data.plugins
            const productData = { ...data }
            delete (productData as typeof productData & { plugins?: unknown }).plugins

            await prisma.$transaction(async (tx) => {
                await tx.products.update({ where: { id }, data: productData })

                if (plugins) {
                    await tx.productPlugin.deleteMany({ where: { productId: id } })

                    const sanitizedPlugins = plugins
                        .map((plugin) => ({
                            name: plugin.name.trim(),
                            status: plugin.status || "ATIVO",
                            priceMonthly: plugin.priceMonthly || null,
                            priceQuarterly: plugin.priceQuarterly || null,
                            priceYearly: plugin.priceYearly || null,
                        }))
                        .filter((plugin) => plugin.name)

                    if (sanitizedPlugins.length > 0) {
                        await tx.productPlugin.createMany({
                            data: sanitizedPlugins.map((plugin) => ({
                                productId: id,
                                ...plugin,
                            })),
                        })
                    }
                }
            })

            revalidatePath("/dashboard/produtos")
            return { success: true }
        }

        const linkedClientCount = await prisma.clientProduct.count({
            where: { productId: id },
        })

        if (linkedClientCount > 0) {
            throw new Error("Não é permitido desativar o controle de serial de um produto que já possui clientes vinculados")
        }
    }

    const plugins = data.plugins
    const productData = { ...data }
    delete (productData as typeof productData & { plugins?: unknown }).plugins

    await prisma.$transaction(async (tx) => {
        await tx.products.update({ where: { id }, data: productData })

        if (plugins) {
            await tx.productPlugin.deleteMany({ where: { productId: id } })

            const sanitizedPlugins = plugins
                .map((plugin) => ({
                    name: plugin.name.trim(),
                    status: plugin.status || "ATIVO",
                    priceMonthly: plugin.priceMonthly || null,
                    priceQuarterly: plugin.priceQuarterly || null,
                    priceYearly: plugin.priceYearly || null,
                }))
                .filter((plugin) => plugin.name)

            if (sanitizedPlugins.length > 0) {
                await tx.productPlugin.createMany({
                    data: sanitizedPlugins.map((plugin) => ({
                        productId: id,
                        ...plugin,
                    })),
                })
            }
        }
    })

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
