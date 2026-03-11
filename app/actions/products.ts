"use server"

import { prisma } from "@/app/utils/prisma"
import type { InstallationType } from "@/app/generated/prisma/enums"
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
        hasPluginControl: p.hasPluginControl,
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
        include: {
            clientProducts: {
                select: {
                    installationType: true,
                },
            },
            productPlugins: {
                orderBy: { name: "asc" },
                select: {
                    id: true,
                    name: true,
                    status: true,
                },
            },
        },
    })

    return products.map(p => ({
        id: p.id,
        name: p.name,
        hasSerialControl: p.hasSerialControl,
        hasPluginControl: p.hasPluginControl,
        installationTypesInUse: [...new Set(p.clientProducts.map(cp => cp.installationType).filter(Boolean))],
        plugins: p.productPlugins.filter(plugin => plugin.status === "ATIVO"),
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
    hasSerialControl?: boolean
    hasPluginControl?: boolean
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
            hasPluginControl: data.hasPluginControl || false,
            productPlugins: data.hasPluginControl && data.plugins?.length ? {
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
    hasPluginControl?: boolean
    plugins?: Array<{
        name: string
        status?: string
        priceMonthly?: number | null
        priceQuarterly?: number | null
        priceYearly?: number | null
    }>
}) {
    await getSession()

    const currentProduct = await prisma.products.findUnique({
        where: { id },
        select: { hasSerialControl: true, hasPluginControl: true },
    })

    const linkedClientCount = await prisma.clientProduct.count({
        where: { productId: id },
    })

    if (data.hasSerialControl === false) {
        const isDisablingSerialControl = currentProduct?.hasSerialControl === true

        if (isDisablingSerialControl && linkedClientCount > 0) {
            throw new Error("Não é permitido desativar o controle de serial de um produto que já possui clientes vinculados")
        }
    }

    if (data.hasPluginControl === false && currentProduct?.hasPluginControl && linkedClientCount > 0) {
        throw new Error("Não é permitido desativar o controle de plugins de um produto que já possui clientes vinculados")
    }

    if (linkedClientCount > 0 && currentProduct?.hasPluginControl && data.plugins) {
        const existingPlugins = await prisma.productPlugin.findMany({
            where: { productId: id },
            select: {
                name: true,
                status: true,
                priceMonthly: true,
                priceQuarterly: true,
                priceYearly: true,
            },
            orderBy: { name: "asc" },
        })

        const normalizedExisting = existingPlugins.map((plugin) => ({
            name: plugin.name.trim(),
            status: plugin.status || "ATIVO",
            priceMonthly: plugin.priceMonthly ?? null,
            priceQuarterly: plugin.priceQuarterly ?? null,
            priceYearly: plugin.priceYearly ?? null,
        }))

        const normalizedIncoming = data.plugins
            .map((plugin) => ({
                name: plugin.name.trim(),
                status: plugin.status || "ATIVO",
                priceMonthly: plugin.priceMonthly ?? null,
                priceQuarterly: plugin.priceQuarterly ?? null,
                priceYearly: plugin.priceYearly ?? null,
            }))
            .filter((plugin) => plugin.name)
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))

        const sortedExisting = [...normalizedExisting].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))

        if (JSON.stringify(sortedExisting) !== JSON.stringify(normalizedIncoming)) {
            throw new Error("Não é permitido alterar os plugins de um produto que já possui clientes vinculados")
        }
    }

    const plugins = data.plugins
    const productData = { ...data }
    delete (productData as typeof productData & { plugins?: unknown }).plugins

    await prisma.$transaction(async (tx) => {
        await tx.products.update({ where: { id }, data: productData })

        if (productData.hasPluginControl && plugins) {
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
        } else if (productData.hasPluginControl === false && !linkedClientCount) {
            await tx.productPlugin.deleteMany({ where: { productId: id } })
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
    const clientProduct = await prisma.clientProduct.findFirst({
        where: {
            clientId: data.clientId,
            productId: data.productId,
        },
        select: { id: true },
    })
    
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
                clientProductId: clientProduct?.id || null,
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
                clientProductId: clientProduct?.id || null,
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

// Actions para ClientProduct
export async function createOrUpdateClientProduct(data: {
    clientId: string
    productId: string
    installationType?: InstallationType
    notes?: string
}) {
    await getSession()
    
    // Buscar se já existe um ClientProduct para este cliente/produto
    const existingClientProduct = await prisma.clientProduct.findFirst({
        where: {
            clientId: data.clientId,
            productId: data.productId,
        },
    })

    let clientProduct
    if (existingClientProduct) {
        // Atualizar o existente
        clientProduct = await prisma.clientProduct.update({
            where: { id: existingClientProduct.id },
            data: {
                installationType: data.installationType,
                notes: data.notes,
            },
        })
    } else {
        // Criar novo
        clientProduct = await prisma.clientProduct.create({
            data: {
                clientId: data.clientId,
                productId: data.productId,
                installationType: data.installationType,
                notes: data.notes,
            },
        })
    }

    await prisma.clientProductSerial.updateMany({
        where: {
            clientId: data.clientId,
            productId: data.productId,
            OR: [
                { clientProductId: null },
                { clientProductId: { not: clientProduct.id } },
            ],
        },
        data: {
            clientProductId: clientProduct.id,
        },
    })

    return { success: true, id: clientProduct.id }
}

export async function createClientProductPlugin(data: {
    clientProductId: string
    productPluginId: string
    priceMonthly?: number
    priceQuarterly?: number
    priceYearly?: number
}) {
    await getSession()
    
    const clientProductPlugin = await prisma.clientProductPlugin.create({
        data: {
            clientProductId: data.clientProductId,
            productPluginId: data.productPluginId,
            priceMonthly: data.priceMonthly,
            priceQuarterly: data.priceQuarterly,
            priceYearly: data.priceYearly,
        },
    })

    return { success: true, id: clientProductPlugin.id }
}

export async function deleteClientProductPlugin(clientProductId: string, productPluginId: string) {
    await getSession()
    
    await prisma.clientProductPlugin.deleteMany({
        where: {
            clientProductId,
            productPluginId,
        },
    })

    return { success: true }
}
