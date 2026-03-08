"use server"

import { cache } from "react"
import { headers } from "next/headers"

import { prisma } from "@/app/utils/prisma"
import { auth } from "@/app/utils/auth"

const getSession = cache(async () => {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) throw new Error("Não autenticado")
    return session
})

function slugify(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
}

async function ensureUniqueSlug(baseTitle: string, articleId?: string) {
    const baseSlug = slugify(baseTitle) || "artigo"
    let slug = baseSlug
    let suffix = 1

    while (true) {
        const existing = await prisma.knowledgeBaseArticle.findFirst({
            where: {
                slug,
                ...(articleId ? { id: { not: articleId } } : {}),
            },
            select: { id: true },
        })

        if (!existing) return slug
        suffix += 1
        slug = `${baseSlug}-${suffix}`
    }
}

export async function getKnowledgeBaseArticles(params?: {
    query?: string
    productId?: string
    status?: string
}) {
    await getSession()

    const query = (params?.query || "").trim()
    const status = params?.status || ""
    const productId = params?.productId || ""

    const articles = await prisma.knowledgeBaseArticle.findMany({
        where: {
            ...(status ? { status } : {}),
            ...(query ? {
                OR: [
                    { title: { contains: query, mode: "insensitive" } },
                    { summary: { contains: query, mode: "insensitive" } },
                    { content: { contains: query, mode: "insensitive" } },
                    { category: { contains: query, mode: "insensitive" } },
                ],
            } : {}),
            ...(productId ? { products: { some: { productId } } } : {}),
        },
        orderBy: [
            { isFeatured: "desc" },
            { updatedAt: "desc" },
        ],
        select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            content: true,
            category: true,
            status: true,
            difficulty: true,
            isFeatured: true,
            viewCount: true,
            helpfulCount: true,
            createdAt: true,
            updatedAt: true,
            createdBy: { select: { id: true, name: true } },
            updatedBy: { select: { id: true, name: true } },
            products: {
                select: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            _count: {
                select: {
                    tickets: true,
                },
            },
        },
    })

    return articles.map((article) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        content: article.content,
        category: article.category,
        status: article.status,
        difficulty: article.difficulty,
        isFeatured: article.isFeatured,
        viewCount: article.viewCount,
        helpfulCount: article.helpfulCount,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
        createdBy: article.createdBy,
        updatedBy: article.updatedBy,
        ticketCount: article._count.tickets,
        products: article.products.map((item) => item.product),
    }))
}

export async function getKnowledgeBaseArticleById(id: string) {
    await getSession()

    const article = await prisma.knowledgeBaseArticle.findUnique({
        where: { id },
        select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            content: true,
            category: true,
            status: true,
            difficulty: true,
            isFeatured: true,
            viewCount: true,
            helpfulCount: true,
            createdAt: true,
            updatedAt: true,
            createdBy: { select: { id: true, name: true } },
            updatedBy: { select: { id: true, name: true } },
            products: {
                select: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            tickets: {
                orderBy: { createdAt: "desc" },
                take: 10,
                select: {
                    id: true,
                    ticketNumber: true,
                    ticketDescription: true,
                    ticketStatus: true,
                    createdAt: true,
                    client: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
    })

    if (!article) throw new Error("Artigo não encontrado")

    return {
        id: article.id,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        content: article.content,
        category: article.category,
        status: article.status,
        difficulty: article.difficulty,
        isFeatured: article.isFeatured,
        viewCount: article.viewCount,
        helpfulCount: article.helpfulCount,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
        createdBy: article.createdBy,
        updatedBy: article.updatedBy,
        products: article.products.map((item) => item.product),
        tickets: article.tickets.map((ticket) => ({
            id: ticket.id,
            ticketNumber: ticket.ticketNumber,
            ticketDescription: ticket.ticketDescription,
            status: ticket.ticketStatus || "NOVO",
            createdAt: ticket.createdAt.toISOString(),
            client: ticket.client,
        })),
    }
}

export async function getKnowledgeBaseArticleOptions(params?: {
    query?: string
    clientId?: string
    productIds?: string[]
    status?: string
}) {
    await getSession()

    let productIds = params?.productIds || []

    if (!productIds.length && params?.clientId) {
        const serials = await prisma.clientProductSerial.findMany({
            where: { clientId: params.clientId },
            select: { productId: true },
        })
        productIds = [...new Set(serials.map((item) => item.productId))]
    }

    const query = (params?.query || "").trim()
    const status = params?.status || "PUBLICADO"

    const articles = await prisma.knowledgeBaseArticle.findMany({
        where: {
            ...(status ? { status } : {}),
            ...(productIds.length ? { products: { some: { productId: { in: productIds } } } } : {}),
            ...(query ? {
                OR: [
                    { title: { contains: query, mode: "insensitive" } },
                    { summary: { contains: query, mode: "insensitive" } },
                    { category: { contains: query, mode: "insensitive" } },
                ],
            } : {}),
        },
        orderBy: [
            { isFeatured: "desc" },
            { title: "asc" },
        ],
        select: {
            id: true,
            title: true,
            summary: true,
            category: true,
            products: {
                select: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
    })

    return articles.map((article) => ({
        id: article.id,
        title: article.title,
        summary: article.summary,
        category: article.category,
        products: article.products.map((item) => item.product),
    }))
}

export async function createKnowledgeBaseArticle(data: {
    title: string
    summary?: string
    content: string
    category?: string
    status?: string
    difficulty?: string
    isFeatured?: boolean
    productIds?: string[]
}) {
    const session = await getSession()
    const slug = await ensureUniqueSlug(data.title)

    const article = await prisma.knowledgeBaseArticle.create({
        data: {
            title: data.title,
            slug,
            summary: data.summary || null,
            content: data.content,
            category: data.category || null,
            status: data.status || "RASCUNHO",
            difficulty: data.difficulty || null,
            isFeatured: data.isFeatured ?? false,
            createdById: session.user.id,
            updatedById: session.user.id,
            products: data.productIds?.length
                ? {
                    create: data.productIds.map((productId) => ({ productId })),
                }
                : undefined,
        },
        select: { id: true },
    })

    return { success: true, id: article.id }
}

export async function updateKnowledgeBaseArticle(id: string, data: {
    title: string
    summary?: string
    content: string
    category?: string
    status?: string
    difficulty?: string
    isFeatured?: boolean
    productIds?: string[]
}) {
    const session = await getSession()
    const slug = await ensureUniqueSlug(data.title, id)

    await prisma.knowledgeBaseArticle.update({
        where: { id },
        data: {
            title: data.title,
            slug,
            summary: data.summary || null,
            content: data.content,
            category: data.category || null,
            status: data.status || "RASCUNHO",
            difficulty: data.difficulty || null,
            isFeatured: data.isFeatured ?? false,
            updatedById: session.user.id,
            products: {
                deleteMany: {},
                ...(data.productIds?.length ? {
                    create: data.productIds.map((productId) => ({ productId })),
                } : {}),
            },
        },
    })

    return { success: true }
}

export async function incrementKnowledgeArticleView(articleId: string) {
    await getSession()
    await prisma.knowledgeBaseArticle.update({
        where: { id: articleId },
        data: {
            viewCount: {
                increment: 1,
            },
        },
    })
    return { success: true }
}
