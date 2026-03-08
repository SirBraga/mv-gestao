"use client"

import Link from "next/link"
import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, BookOpen, Loader2, Pencil, Save, Sparkles, Ticket, X } from "lucide-react"
import { toast } from "react-toastify"

import { getProductOptions } from "@/app/actions/products"
import { getKnowledgeBaseArticleById, incrementKnowledgeArticleView, updateKnowledgeBaseArticle } from "@/app/actions/knowledge-base"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MultiSelect } from "@/components/ui/multi-select"

interface KnowledgeBaseArticleDetail {
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
    products: { id: string; name: string }[]
    tickets: {
        id: string
        ticketNumber: number
        ticketDescription: string
        status: string
        createdAt: string
        client: { id: string; name: string }
    }[]
}

export default function KnowledgeBaseArticleDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const queryClient = useQueryClient()
    const [editing, setEditing] = useState(false)
    const [form, setForm] = useState({
        title: "",
        summary: "",
        content: "",
        category: "",
        status: "PUBLICADO",
        difficulty: "INTERMEDIARIO",
        isFeatured: false,
    })
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

    const { data: article, isLoading, isError } = useQuery({
        queryKey: ["knowledge-article", id],
        queryFn: () => getKnowledgeBaseArticleById(id),
        staleTime: 30 * 1000,
    })

    const { data: products = [] } = useQuery({
        queryKey: ["product-options"],
        queryFn: () => getProductOptions(),
        staleTime: 30 * 60 * 1000,
    })

    const typedArticle = article as KnowledgeBaseArticleDetail | undefined

    useEffect(() => {
        if (!typedArticle) return

        setForm({
            title: typedArticle.title || "",
            summary: typedArticle.summary || "",
            content: typedArticle.content || "",
            category: typedArticle.category || "",
            status: typedArticle.status || "PUBLICADO",
            difficulty: typedArticle.difficulty || "INTERMEDIARIO",
            isFeatured: typedArticle.isFeatured,
        })
        setSelectedProductIds(typedArticle.products.map((product: { id: string }) => product.id))
    }, [typedArticle])

    useEffect(() => {
        if (!typedArticle) return
        incrementKnowledgeArticleView(typedArticle.id).catch(() => undefined)
    }, [typedArticle])

    const updateMutation = useMutation({
        mutationFn: (payload: { title: string; summary?: string; content: string; category?: string; status?: string; difficulty?: string; isFeatured?: boolean; productIds?: string[] }) => updateKnowledgeBaseArticle(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["knowledge-base"] })
            queryClient.invalidateQueries({ queryKey: ["knowledge-article", id] })
            queryClient.invalidateQueries({ queryKey: ["knowledge-base-options"] })
            toast.success("Artigo atualizado com sucesso!")
            setEditing(false)
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const handleSave = async () => {
        if (!form.title.trim()) return toast.error("Título é obrigatório")
        if (!form.content.trim()) return toast.error("Conteúdo é obrigatório")

        await updateMutation.mutateAsync({
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
        )
    }

    if (isError || !typedArticle) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-slate-800 mb-2">Artigo não encontrado</h2>
                    <p className="text-sm text-slate-500 mb-4">O artigo solicitado não existe ou não está disponível.</p>
                    <Button onClick={() => router.push("/dashboard/base-conhecimento")} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm">Voltar</Button>
                </div>
            </div>
        )
    }

    const ticketStatusClasses: Record<string, string> = {
        NOVO: "bg-sky-100 text-sky-700",
        PENDING_CLIENT: "bg-amber-100 text-amber-700",
        PENDING_EMPRESS: "bg-violet-100 text-violet-700",
        IN_PROGRESS: "bg-orange-100 text-orange-700",
        CLOSED: "bg-slate-100 text-slate-600",
    }

    return (
        <div className="h-full overflow-y-auto bg-slate-50">
            <div className="bg-white border-b border-slate-200">
                <div className="px-8 py-6">
                    <button onClick={() => router.push("/dashboard/base-conhecimento")} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-6 cursor-pointer">
                        <ArrowLeft size={16} />
                        <span className="text-sm font-medium">Voltar para base de conhecimento</span>
                    </button>

                    <div className="flex items-end justify-between gap-6">
                        <div className="flex items-start gap-4 min-w-0">
                            <div className="w-16 h-16 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
                                <BookOpen size={28} />
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${typedArticle.status === "PUBLICADO" ? "bg-emerald-100 text-emerald-700" : typedArticle.status === "RASCUNHO" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{typedArticle.status}</span>
                                    {typedArticle.isFeatured && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-indigo-700 bg-indigo-50">Destaque</span>}
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900 wrap-break-word">{typedArticle.title}</h1>
                                {typedArticle.summary && <p className="text-sm text-slate-500 mt-1 max-w-3xl">{typedArticle.summary}</p>}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 justify-end flex-wrap shrink-0">
                            {editing ? (
                                <>
                                    <button onClick={() => setEditing(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-50 text-sm font-medium transition-colors cursor-pointer">
                                        <X size={16} /> Cancelar
                                    </button>
                                    <button onClick={handleSave} disabled={updateMutation.isPending} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm shadow-indigo-600/25 disabled:opacity-50">
                                        {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm shadow-indigo-600/25">
                                    <Pencil size={16} /> Editar artigo
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-6 p-8 w-full mx-auto">
                <div className="flex-1 space-y-4 min-w-0">
                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Resumo executivo</p>
                        {editing ? (
                            <textarea value={form.summary} onChange={(e) => setForm((old) => ({ ...old, summary: e.target.value }))} className="w-full min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-white resize-y" placeholder="Explique rapidamente quando usar este artigo e qual problema ele resolve..." />
                        ) : (
                            <p className="text-sm text-slate-600 leading-relaxed">{typedArticle.summary || "Sem resumo cadastrado."}</p>
                        )}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Conteúdo</p>
                        {editing ? (
                            <textarea value={form.content} onChange={(e) => setForm((old) => ({ ...old, content: e.target.value }))} className="w-full min-h-96 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-white resize-y" placeholder="Descreva o procedimento completo, checklist, exceções e observações..." />
                        ) : (
                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                                <pre className="whitespace-pre-wrap wrap-break-word text-sm text-slate-700 font-sans leading-6">{typedArticle.content}</pre>
                            </div>
                        )}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Ticket size={16} className="text-slate-600" />
                                <p className="text-sm font-semibold text-slate-900">Tickets vinculados</p>
                            </div>
                            <span className="text-xs text-slate-500">Últimos 10 tickets</span>
                        </div>
                        {typedArticle.tickets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                <Ticket size={20} className="mb-2 text-slate-300" />
                                <p className="text-sm text-slate-500">Nenhum ticket vinculado</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {typedArticle.tickets.map((ticket: KnowledgeBaseArticleDetail["tickets"][number]) => (
                                    <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                                        <span className="text-xs font-mono font-semibold text-slate-400 shrink-0 w-10">#{ticket.ticketNumber}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-900 truncate">{ticket.ticketDescription}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{ticket.client.name} · {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}</p>
                                        </div>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${ticketStatusClasses[ticket.status] || "bg-slate-100 text-slate-600"}`}>{ticket.status}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-80 shrink-0">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 sticky top-8">
                        <div className="rounded-lg border border-slate-100 p-3 space-y-2">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Metadados</p>
                            {editing ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">Título</label>
                                        <Input value={form.title} onChange={(e) => setForm((old) => ({ ...old, title: e.target.value }))} className="h-9 text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">Categoria</label>
                                        <Input value={form.category} onChange={(e) => setForm((old) => ({ ...old, category: e.target.value }))} className="h-9 text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">Status</label>
                                        <select className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 bg-white" value={form.status} onChange={(e) => setForm((old) => ({ ...old, status: e.target.value }))}>
                                            <option value="PUBLICADO">Publicado</option>
                                            <option value="RASCUNHO">Rascunho</option>
                                            <option value="ARQUIVADO">Arquivado</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">Dificuldade</label>
                                        <select className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 bg-white" value={form.difficulty} onChange={(e) => setForm((old) => ({ ...old, difficulty: e.target.value }))}>
                                            <option value="BASICO">Básico</option>
                                            <option value="INTERMEDIARIO">Intermediário</option>
                                            <option value="AVANCADO">Avançado</option>
                                        </select>
                                    </div>
                                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                        <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((old) => ({ ...old, isFeatured: e.target.checked }))} className="rounded" />
                                        Destacar artigo
                                    </label>
                                </div>
                            ) : (
                                <div className="space-y-2 text-sm text-slate-700">
                                    <MetaRow label="Slug" value={typedArticle.slug} />
                                    <MetaRow label="Categoria" value={typedArticle.category || "Sem categoria"} />
                                    <MetaRow label="Dificuldade" value={typedArticle.difficulty || "Não definida"} />
                                    <MetaRow label="Visualizações" value={String(typedArticle.viewCount)} />
                                    <MetaRow label="Criado por" value={typedArticle.createdBy?.name || "—"} />
                                    <MetaRow label="Atualizado por" value={typedArticle.updatedBy?.name || "—"} />
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg border border-slate-100 p-3 space-y-2">
                            <div className="flex items-center gap-2">
                                <Sparkles size={14} className="text-indigo-500" />
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Produtos relacionados</p>
                            </div>
                            {editing ? (
                                <MultiSelect
                                    options={products.map((product: { id: string; name: string }) => ({ value: product.id, label: product.name }))}
                                    value={selectedProductIds}
                                    onChange={setSelectedProductIds}
                                    placeholder="Selecionar produtos..."
                                    searchPlaceholder="Buscar produto..."
                                    emptyMessage="Nenhum produto encontrado"
                                />
                            ) : typedArticle.products.length === 0 ? (
                                <p className="text-xs text-slate-400">Nenhum produto vinculado.</p>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {typedArticle.products.map((product: { id: string; name: string }) => (
                                        <span key={product.id} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium">{product.name}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function MetaRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400">{label}</span>
            <span className="text-xs text-slate-900 text-right break-all">{value}</span>
        </div>
    )
}
