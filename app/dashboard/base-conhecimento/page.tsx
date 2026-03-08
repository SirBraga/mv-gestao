"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BookOpen, Plus, Search, Sparkles, Loader2 } from "lucide-react"
import { toast } from "react-toastify"

import { createKnowledgeBaseArticle, getKnowledgeBaseArticles } from "@/app/actions/knowledge-base"
import { getProductOptions } from "@/app/actions/products"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { MultiSelect } from "@/components/ui/multi-select"

const INITIAL_FORM = {
    title: "",
    summary: "",
    content: "",
    category: "",
    status: "PUBLICADO",
    difficulty: "INTERMEDIARIO",
    isFeatured: false,
}

interface KnowledgeBaseListArticle {
    id: string
    title: string
    slug: string
    summary: string | null
    content: string
    category: string | null
    status: string
    difficulty: string | null
    isFeatured: boolean
    viewCount: number
    helpfulCount: number
    createdAt: string
    updatedAt: string
    createdBy: { id: string; name: string } | null
    updatedBy: { id: string; name: string } | null
    ticketCount: number
    products: { id: string; name: string }[]
}

export default function KnowledgeBasePage() {
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [productFilter, setProductFilter] = useState("")
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [form, setForm] = useState(INITIAL_FORM)
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

    const { data: articles = [], isLoading } = useQuery({
        queryKey: ["knowledge-base", searchQuery, statusFilter, productFilter],
        queryFn: () => getKnowledgeBaseArticles({
            query: searchQuery,
            status: statusFilter || undefined,
            productId: productFilter || undefined,
        }),
        staleTime: 30 * 1000,
    })

    const { data: products = [] } = useQuery({
        queryKey: ["product-options"],
        queryFn: () => getProductOptions(),
        staleTime: 30 * 60 * 1000,
    })

    const typedArticles = articles as KnowledgeBaseListArticle[]

    const featuredArticles = useMemo(() => typedArticles.filter((article: KnowledgeBaseListArticle) => article.isFeatured), [typedArticles])

    const createMutation = useMutation({
        mutationFn: createKnowledgeBaseArticle,
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["knowledge-base"] })
            toast.success("Artigo criado com sucesso!")
            setDrawerOpen(false)
            setForm(INITIAL_FORM)
            setSelectedProductIds([])
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const handleCreate = async () => {
        if (!form.title.trim()) return toast.error("Título é obrigatório")
        if (!form.content.trim()) return toast.error("Conteúdo é obrigatório")

        await createMutation.mutateAsync({
            title: form.title,
            summary: form.summary || undefined,
            content: form.content,
            category: form.category || undefined,
            status: form.status,
            difficulty: form.difficulty,
            isFeatured: form.isFeatured,
            productIds: selectedProductIds,
        })
    }

    return (
        <div className="h-full overflow-y-auto bg-slate-50">
            <div className="bg-white border-b border-slate-200">
                <div className="px-8 py-6 flex items-end justify-between gap-6">
                    <div className="flex items-start gap-4 min-w-0">
                        <div className="w-16 h-16 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
                            <BookOpen size={28} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-indigo-700 bg-indigo-50">Base de Conhecimento</span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-slate-600 bg-slate-100">{articles.length} artigos</span>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900">Central de artigos e soluções</h1>
                            <p className="text-sm text-slate-500 mt-1">Documente soluções, vincule produtos e reutilize conhecimento nos tickets.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end flex-wrap shrink-0">
                        <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm shadow-indigo-600/25">
                            <Plus size={16} /> Novo Artigo
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Search size={16} className="text-slate-500" />
                            <p className="text-sm font-semibold text-slate-900">Buscar e filtrar</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar por título, categoria ou conteúdo..." className="h-10" />
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 bg-white">
                                <option value="">Todos os status</option>
                                <option value="PUBLICADO">Publicados</option>
                                <option value="RASCUNHO">Rascunhos</option>
                                <option value="ARQUIVADO">Arquivados</option>
                            </select>
                            <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 bg-white">
                                <option value="">Todos os produtos</option>
                                {products.map((product: { id: string; name: string }) => (
                                    <option key={product.id} value={product.id}>{product.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-linear-to-br from-indigo-600 to-violet-600 rounded-xl p-5 text-white">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={16} />
                            <p className="text-sm font-semibold">Destaques</p>
                        </div>
                        <p className="text-sm text-indigo-100">Use artigos publicados para acelerar a abertura de tickets, reduzir retrabalho e padronizar respostas.</p>
                        <div className="grid grid-cols-3 gap-3 mt-4">
                            <div className="rounded-lg bg-white/10 px-3 py-3">
                                <p className="text-[11px] text-indigo-100">Publicados</p>
                                <p className="text-xl font-bold mt-1">{typedArticles.filter((article: KnowledgeBaseListArticle) => article.status === "PUBLICADO").length}</p>
                            </div>
                            <div className="rounded-lg bg-white/10 px-3 py-3">
                                <p className="text-[11px] text-indigo-100">Destaque</p>
                                <p className="text-xl font-bold mt-1">{featuredArticles.length}</p>
                            </div>
                            <div className="rounded-lg bg-white/10 px-3 py-3">
                                <p className="text-[11px] text-indigo-100">Visualizações</p>
                                <p className="text-xl font-bold mt-1">{typedArticles.reduce((sum: number, article: KnowledgeBaseListArticle) => sum + article.viewCount, 0)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-900">Artigos</h2>
                        <span className="text-xs text-slate-500">Ordenado por destaque e atualização</span>
                    </div>
                    {isLoading ? (
                        <div className="py-12 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
                    ) : typedArticles.length === 0 ? (
                        <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                            <BookOpen size={32} className="mb-3 text-slate-300" />
                            <p className="text-sm font-medium text-slate-600">Nenhum artigo encontrado</p>
                            <p className="text-xs text-slate-400 mt-1">Ajuste os filtros ou crie um novo artigo.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {typedArticles.map((article: KnowledgeBaseListArticle) => (
                                <Link key={article.id} href={`/dashboard/base-conhecimento/${article.id}`} className="block px-5 py-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                                <span className="text-sm font-semibold text-slate-900">{article.title}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${article.status === "PUBLICADO" ? "bg-emerald-100 text-emerald-700" : article.status === "RASCUNHO" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{article.status}</span>
                                                {article.isFeatured && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">Destaque</span>}
                                            </div>
                                            {article.summary && <p className="text-sm text-slate-600 line-clamp-2">{article.summary}</p>}
                                            <div className="flex items-center gap-2 flex-wrap mt-2">
                                                {article.category && <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">{article.category}</span>}
                                                {article.products.map((product: { id: string; name: string }) => (
                                                    <span key={product.id} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium">{product.name}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs text-slate-500">{article.ticketCount} tickets vinculados</p>
                                            <p className="text-xs text-slate-400 mt-1">Atualizado em {new Date(article.updatedAt).toLocaleDateString("pt-BR")}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent side="right" className="sm:max-w-xl w-full p-0" onInteractOutside={(event) => event.preventDefault()}>
                    <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
                        <SheetTitle className="text-base">Novo Artigo</SheetTitle>
                        <SheetDescription className="text-xs">Crie um artigo completo para reutilizar conhecimento nos tickets.</SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Título</label>
                            <Input value={form.title} onChange={(e) => setForm((old) => ({ ...old, title: e.target.value }))} placeholder="Ex: Configuração de certificado A1 no módulo fiscal" className="h-10" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Resumo</label>
                            <textarea value={form.summary} onChange={(e) => setForm((old) => ({ ...old, summary: e.target.value }))} placeholder="Resumo curto para exibir na listagem..." className="w-full h-20 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white resize-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Categoria</label>
                                <Input value={form.category} onChange={(e) => setForm((old) => ({ ...old, category: e.target.value }))} placeholder="Fiscal, financeiro, suporte..." className="h-10" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Dificuldade</label>
                                <select value={form.difficulty} onChange={(e) => setForm((old) => ({ ...old, difficulty: e.target.value }))} className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white">
                                    <option value="BASICO">Básico</option>
                                    <option value="INTERMEDIARIO">Intermediário</option>
                                    <option value="AVANCADO">Avançado</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Status</label>
                                <select value={form.status} onChange={(e) => setForm((old) => ({ ...old, status: e.target.value }))} className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white">
                                    <option value="PUBLICADO">Publicado</option>
                                    <option value="RASCUNHO">Rascunho</option>
                                    <option value="ARQUIVADO">Arquivado</option>
                                </select>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mt-7">
                                <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((old) => ({ ...old, isFeatured: e.target.checked }))} className="rounded" />
                                Destacar artigo
                            </label>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Produtos relacionados</label>
                            <MultiSelect
                                options={products.map((product: { id: string; name: string }) => ({ value: product.id, label: product.name }))}
                                value={selectedProductIds}
                                onChange={setSelectedProductIds}
                                placeholder="Selecionar produtos..."
                                searchPlaceholder="Buscar produto..."
                                emptyMessage="Nenhum produto encontrado"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Conteúdo</label>
                            <textarea value={form.content} onChange={(e) => setForm((old) => ({ ...old, content: e.target.value }))} placeholder="Descreva o passo a passo completo, causas comuns, validações, checklist final e observações importantes..." className="w-full min-h-70 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white resize-y" />
                        </div>
                    </div>
                    <SheetFooter className="px-6 py-4 border-t border-gray-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
                            <Button className="flex-1 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm" onClick={handleCreate} disabled={createMutation.isPending}>
                                {createMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : <Plus size={14} className="mr-2" />}
                                Criar artigo
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    )
}
