"use client"

import { useEffect, useMemo, useState } from "react"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, ChevronDown, Loader2, Paperclip, Plus, Search } from "lucide-react"
import { toast } from "react-toastify"

import { createTicket, addTicketAttachment, getAllUsers } from "@/app/actions/tickets"
import { getClientContacts, getClientSearchOptions } from "@/app/actions/clients"
import { getKnowledgeBaseArticleOptions } from "@/app/actions/knowledge-base"
import { getClientProductSerials } from "@/app/actions/products"
import { uploadFile } from "@/app/utils/upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import LocalFilePreviewList from "@/app/dashboard/_components/local-file-preview-list"

const INITIAL_FORM = {
    clientId: "",
    requestedByContactId: "",
    ticketDescription: "",
    ticketPriority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
    ticketType: "SUPPORT" as "SUPPORT" | "SALES" | "FINANCE" | "MAINTENCE",
    assignedToId: "",
    knowledgeArticleId: "",
}

interface ClientOption {
    id: string
    name: string
    cnpj: string | null
    cpf: string | null
}

interface TicketCreateDrawerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    lockedClient?: ClientOption | null
    title?: string
    description?: string
}

function formatDocument(value?: string | null) {
    if (!value) return null
    return value
}

export default function TicketCreateDrawer({
    open,
    onOpenChange,
    lockedClient = null,
    title = "Novo Ticket",
    description = "Preencha os dados para abrir um novo ticket de suporte.",
}: TicketCreateDrawerProps) {
    const queryClient = useQueryClient()
    const [form, setForm] = useState({
        ...INITIAL_FORM,
        clientId: lockedClient?.id || "",
    })
    const [attachFiles, setAttachFiles] = useState<File[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [clientSearchOpen, setClientSearchOpen] = useState(false)
    const [clientSearchInput, setClientSearchInput] = useState("")
    const [debouncedClientSearch, setDebouncedClientSearch] = useState("")
    const [articleSearch, setArticleSearch] = useState("")
    const [pendingArticleId, setPendingArticleId] = useState("")
    const [showArticleMismatchDialog, setShowArticleMismatchDialog] = useState(false)

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedClientSearch(clientSearchInput), 250)
        return () => clearTimeout(timeout)
    }, [clientSearchInput])

    useEffect(() => {
        if (lockedClient?.id) {
            setForm((old) => ({ ...old, clientId: lockedClient.id, requestedByContactId: "" }))
        }
    }, [lockedClient])

    const { data: usersList = [] } = useQuery({
        queryKey: ["all-users"],
        queryFn: () => getAllUsers(),
        staleTime: 30 * 60 * 1000,
    })

    const clientOptionsQuery = useInfiniteQuery({
        queryKey: ["client-search-options", debouncedClientSearch],
        queryFn: ({ pageParam = 0 }) => getClientSearchOptions({
            query: debouncedClientSearch,
            offset: pageParam,
            limit: 15,
        }),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
        enabled: open && !lockedClient,
        staleTime: 60 * 1000,
    })

    const clientOptions = useMemo(() => {
        return clientOptionsQuery.data?.pages.flatMap((page) => page.items) ?? []
    }, [clientOptionsQuery.data])

    const selectedClient = useMemo(() => {
        if (lockedClient) return lockedClient
        return clientOptions.find((client) => client.id === form.clientId) || null
    }, [lockedClient, clientOptions, form.clientId])

    const { data: clientContacts = [] } = useQuery({
        queryKey: ["client-contacts", form.clientId],
        queryFn: () => getClientContacts(form.clientId),
        enabled: !!form.clientId,
        staleTime: 5 * 60 * 1000,
    })

    const { data: clientProductSerials = [] } = useQuery({
        queryKey: ["client-product-serials", form.clientId],
        queryFn: () => getClientProductSerials(form.clientId),
        enabled: !!form.clientId,
        staleTime: 5 * 60 * 1000,
    })

    const { data: knowledgeArticles = [] } = useQuery({
        queryKey: ["knowledge-base-options", "all", articleSearch],
        queryFn: () => getKnowledgeBaseArticleOptions({
            query: articleSearch || undefined,
        }),
        enabled: open,
        staleTime: 60 * 1000,
    })

    const selectedArticle = useMemo(() => {
        return knowledgeArticles.find((article: { id: string }) => article.id === form.knowledgeArticleId) || null
    }, [knowledgeArticles, form.knowledgeArticleId])

    const clientProducts = useMemo(() => {
        return clientProductSerials.map((item: { productId: string; productName: string }) => ({
            id: item.productId,
            name: item.productName,
        }))
    }, [clientProductSerials])

    const articleMismatchSummary = useMemo(() => {
        const article = knowledgeArticles.find((item: { id: string }) => item.id === pendingArticleId)
        if (!article) return null

        const articleProducts = article.products || []
        const clientProductIds = new Set(clientProducts.map((product) => product.id))
        const hasMatch = articleProducts.length === 0 || articleProducts.some((product: { id: string }) => clientProductIds.has(product.id))

        if (hasMatch) return null

        return {
            articleTitle: article.title,
            articleProducts,
            clientProducts,
        }
    }, [pendingArticleId, knowledgeArticles, clientProducts])

    const createMutation = useMutation({
        mutationFn: createTicket,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tickets"] })
            onOpenChange(false)
            setForm({ ...INITIAL_FORM, clientId: lockedClient?.id || "" })
            setAttachFiles([])
            setClientSearchInput("")
            setDebouncedClientSearch("")
            setArticleSearch("")
            toast.success("Ticket criado com sucesso!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const handleSubmit = async () => {
        if (!form.clientId) return toast.error("Selecione um cliente")
        if (!form.requestedByContactId) return toast.error("Selecione o solicitante")
        if (!form.ticketDescription.trim()) return toast.error("Descrição é obrigatória")
        setSubmitting(true)
        try {
            const result = await createMutation.mutateAsync({
                clientId: form.clientId,
                ticketDescription: form.ticketDescription,
                ticketPriority: form.ticketPriority,
                ticketType: form.ticketType,
                requestedByContactId: form.requestedByContactId,
                assignedToId: form.assignedToId || undefined,
                knowledgeArticleId: form.knowledgeArticleId || undefined,
            })
            if (attachFiles.length > 0 && result.id) {
                await Promise.all(
                    attachFiles.map(async (file) => {
                        const uploaded = await uploadFile(file, "tickets")
                        await addTicketAttachment(result.id, {
                            url: uploaded.url,
                            fileName: file.name,
                            fileType: file.type,
                            fileSize: file.size,
                        })
                    })
                )
            }
        } catch {
        } finally {
            setSubmitting(false)
        }
    }

    const handleArticleChange = (articleId: string) => {
        if (!articleId) {
            setPendingArticleId("")
            setShowArticleMismatchDialog(false)
            setForm((old) => ({ ...old, knowledgeArticleId: "" }))
            return
        }

        const article = knowledgeArticles.find((item: { id: string }) => item.id === articleId)
        if (!article) {
            setForm((old) => ({ ...old, knowledgeArticleId: articleId }))
            return
        }

        const articleProducts = article.products || []
        const clientProductIds = new Set(clientProducts.map((product) => product.id))
        const hasMatch = articleProducts.length === 0 || articleProducts.some((product: { id: string }) => clientProductIds.has(product.id))

        if (!hasMatch) {
            setPendingArticleId(articleId)
            setShowArticleMismatchDialog(true)
            return
        }

        setForm((old) => ({ ...old, knowledgeArticleId: articleId }))
    }

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                side="right"
                className="sm:max-w-md w-full p-0"
                onInteractOutside={(event) => event.preventDefault()}
                >
                    <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
                    <SheetTitle className="text-base">{title}</SheetTitle>
                    <SheetDescription className="text-xs">{description}</SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cliente <span className="text-red-400">*</span></label>
                        {lockedClient ? (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                                <p className="text-sm font-medium text-slate-900">{lockedClient.name}</p>
                                <p className="text-xs text-slate-500 mt-1">{formatDocument(lockedClient.cnpj) || formatDocument(lockedClient.cpf) || "Sem documento"}</p>
                            </div>
                        ) : (
                            <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                                    >
                                        <span className={selectedClient ? "text-gray-900" : "text-gray-400"}>
                                            {selectedClient ? selectedClient.name : "Selecione o cliente..."}
                                        </span>
                                        <ChevronDown size={16} className="text-gray-400" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                                    <div className="border-b border-slate-100 p-3">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                            <Input
                                                value={clientSearchInput}
                                                onChange={(e) => setClientSearchInput(e.target.value)}
                                                placeholder="Buscar por nome ou CNPJ..."
                                                className="pl-9 h-9"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-72 overflow-y-auto">
                                        {clientOptions.map((client) => {
                                            const selected = client.id === form.clientId
                                            return (
                                                <button
                                                    key={client.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setForm((old) => ({ ...old, clientId: client.id, requestedByContactId: "", knowledgeArticleId: "" }))
                                                        setArticleSearch("")
                                                        setPendingArticleId("")
                                                        setShowArticleMismatchDialog(false)
                                                        setClientSearchOpen(false)
                                                    }}
                                                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                                                >
                                                    <span className={`flex h-4 w-4 items-center justify-center rounded border ${selected ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300"}`}>
                                                        {selected ? <Check size={11} /> : null}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium text-slate-900">{client.name}</p>
                                                        <p className="truncate text-xs text-slate-500">{formatDocument(client.cnpj) || formatDocument(client.cpf) || "Sem documento"}</p>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                        {!clientOptionsQuery.isLoading && clientOptions.length === 0 && (
                                            <div className="px-3 py-6 text-center text-sm text-slate-400">Nenhum cliente encontrado</div>
                                        )}
                                        {clientOptionsQuery.isLoading && (
                                            <div className="px-3 py-6 flex items-center justify-center text-slate-400"><Loader2 size={16} className="animate-spin" /></div>
                                        )}
                                    </div>
                                    {clientOptionsQuery.hasNextPage && (
                                        <div className="border-t border-slate-100 p-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full h-9 text-sm"
                                                onClick={() => clientOptionsQuery.fetchNextPage()}
                                                disabled={clientOptionsQuery.isFetchingNextPage}
                                            >
                                                {clientOptionsQuery.isFetchingNextPage ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                                                Carregar mais
                                            </Button>
                                        </div>
                                    )}
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Solicitante <span className="text-red-400">*</span></label>
                        <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white disabled:bg-gray-50 disabled:text-gray-400" value={form.requestedByContactId} onChange={e => setForm({ ...form, requestedByContactId: e.target.value })} disabled={!form.clientId}>
                            <option value="">{form.clientId ? (clientContacts.length === 0 ? "Nenhum contato cadastrado" : "Selecione o solicitante...") : "Selecione um cliente primeiro"}</option>
                            {clientContacts.map((ct: { id: string; name: string; role: string | null }) => (
                                <option key={ct.id} value={ct.id}>{ct.name}{ct.role ? ` (${ct.role})` : ""}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Descrição do problema <span className="text-red-400">*</span></label>
                        <textarea placeholder="Descreva o problema ou solicitação..." className="w-full h-24 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white resize-none" value={form.ticketDescription} onChange={e => setForm({ ...form, ticketDescription: e.target.value })} />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Artigo relacionado <span className="text-gray-300">(opcional)</span></label>
                        <Input
                            value={articleSearch}
                            onChange={(e) => setArticleSearch(e.target.value)}
                            placeholder="Buscar artigo por título, resumo ou categoria..."
                            className="h-10 mb-2"
                        />
                        <select
                            className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                            value={form.knowledgeArticleId}
                            onChange={e => handleArticleChange(e.target.value)}
                        >
                            <option value="">{knowledgeArticles.length === 0 ? "Nenhum artigo encontrado" : "Selecione um artigo..."}</option>
                            {knowledgeArticles.map((article: { id: string; title: string; category: string | null; products: { id: string; name: string }[] }) => (
                                <option key={article.id} value={article.id}>
                                    {article.title}{article.category ? ` • ${article.category}` : ""}
                                </option>
                            ))}
                        </select>
                        {selectedArticle && selectedArticle.products.length > 0 && (
                            <p className="mt-2 text-[11px] text-slate-500">
                                Produtos do artigo: {selectedArticle.products.map((product: { id: string; name: string }) => product.name).join(", ")}
                            </p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Prioridade</label>
                            <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.ticketPriority} onChange={e => setForm({ ...form, ticketPriority: e.target.value as "LOW" | "MEDIUM" | "HIGH" })}>
                                <option value="LOW">Baixa</option>
                                <option value="MEDIUM">Média</option>
                                <option value="HIGH">Alta</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tipo</label>
                            <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.ticketType} onChange={e => setForm({ ...form, ticketType: e.target.value as "SUPPORT" | "SALES" | "FINANCE" | "MAINTENCE" })}>
                                <option value="SUPPORT">Suporte</option>
                                <option value="SALES">Vendas</option>
                                <option value="FINANCE">Financeiro</option>
                                <option value="MAINTENCE">Manutenção</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Responsável <span className="text-gray-300">(opcional)</span></label>
                        <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.assignedToId} onChange={e => setForm({ ...form, assignedToId: e.target.value })}>
                            <option value="">Nenhum (será atribuído depois)</option>
                            {usersList.map((u: { id: string; name: string }) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Anexos <span className="text-gray-300">(opcional)</span></label>
                        <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-500 cursor-pointer transition-colors">
                            <Paperclip size={13} /> Adicionar arquivos
                            <input type="file" multiple className="hidden" onChange={e => {
                                const files = e.target.files
                                if (!files) return
                                setAttachFiles(prev => [...prev, ...Array.from(files)])
                            }} />
                        </label>
                        <LocalFilePreviewList files={attachFiles} onRemove={(index) => setAttachFiles(prev => prev.filter((_, itemIndex) => itemIndex !== index))} />
                    </div>
                    </div>
                    <SheetFooter className="px-6 py-4 border-t border-gray-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm" onClick={handleSubmit} disabled={createMutation.isPending || submitting}>
                                {(createMutation.isPending || submitting) ? <Loader2 size={14} className="animate-spin mr-2" /> : <Plus size={14} className="mr-2" />}
                                Criar Ticket
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <Dialog open={showArticleMismatchDialog} onOpenChange={(open) => {
                setShowArticleMismatchDialog(open)
                if (!open) {
                    setPendingArticleId("")
                    setForm((old) => ({ ...old, knowledgeArticleId: "" }))
                }
            }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Confirmar vínculo do artigo</DialogTitle>
                        <DialogDescription>
                            O artigo selecionado pertence a produtos diferentes dos produtos vinculados ao cliente. Deseja continuar mesmo assim?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                        <div>
                            <p className="text-xs font-semibold text-slate-700">Produtos do cliente</p>
                            <p className="mt-1 text-sm text-slate-600">
                                {articleMismatchSummary?.clientProducts.length
                                    ? articleMismatchSummary.clientProducts.map((product) => product.name).join(", ")
                                    : "Cliente sem produtos vinculados"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-700">Produtos do artigo</p>
                            <p className="mt-1 text-sm text-slate-600">
                                {articleMismatchSummary?.articleProducts.length
                                    ? articleMismatchSummary.articleProducts.map((product) => product.name).join(", ")
                                    : "Artigo sem produto vinculado"}
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => {
                            setShowArticleMismatchDialog(false)
                            setPendingArticleId("")
                            setForm((old) => ({ ...old, knowledgeArticleId: "" }))
                        }}>
                            Cancelar e limpar vínculo
                        </Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
                            setForm((old) => ({ ...old, knowledgeArticleId: pendingArticleId }))
                            setShowArticleMismatchDialog(false)
                            setPendingArticleId("")
                        }}>
                            Confirmar vínculo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
