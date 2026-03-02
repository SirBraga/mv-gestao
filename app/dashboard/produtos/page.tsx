"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getProducts, createProduct } from "@/app/actions/products"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Search, Package, Plus, Loader2 } from "lucide-react"
import { toast } from "react-toastify"
import Link from "next/link"

interface ProductData {
    id: string
    name: string
    description: string | null
    category: string | null
    status: string
    priceMonthly: number | null
    priceQuarterly: number | null
    priceYearly: number | null
    clientId: string | null
    createdAt: string
}

const INITIAL_FORM = {
    name: "", description: "", category: "ERP",
    status: "ATIVO", priceMonthly: "", priceQuarterly: "", priceYearly: "",
}

const statusTag: Record<string, string> = {
    ATIVO: "bg-emerald-500",
    INATIVO: "bg-gray-400",
    SUSPENSO: "bg-amber-500",
}

const categoryTag: Record<string, string> = {
    ERP: "bg-sky-500",
    "Módulo": "bg-violet-500",
    Analytics: "bg-cyan-500",
    "Integração": "bg-emerald-500",
    Mobile: "bg-rose-500",
}

function formatPrice(price: number) {
    return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export default function ProdutosPage() {
    const queryClient = useQueryClient()
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<"ALL" | "ATIVO" | "INATIVO" | "SUSPENSO">("ALL")
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [form, setForm] = useState(INITIAL_FORM)

    const { data: products = [], isLoading } = useQuery({
        queryKey: ["products"],
        queryFn: () => getProducts(),
    })

    const createMutation = useMutation({
        mutationFn: createProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] })
            setDrawerOpen(false)
            setForm(INITIAL_FORM)
            toast.success("Produto criado com sucesso!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const handleSubmit = () => {
        if (!form.name.trim()) return toast.error("Nome é obrigatório")
        createMutation.mutate({
            name: form.name,
            description: form.description || undefined,
            category: form.category || undefined,
            status: form.status,
            priceMonthly: form.priceMonthly ? parseFloat(form.priceMonthly) : undefined,
            priceQuarterly: form.priceQuarterly ? parseFloat(form.priceQuarterly) : undefined,
            priceYearly: form.priceYearly ? parseFloat(form.priceYearly) : undefined,
        })
    }

    const allProducts = products as ProductData[]

    const filtered = useMemo(() => {
        return allProducts.filter((p) => {
            const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                (p.description || "").toLowerCase().includes(search.toLowerCase()) ||
                (p.category || "").toLowerCase().includes(search.toLowerCase())
            const matchStatus = statusFilter === "ALL" || p.status === statusFilter
            return matchSearch && matchStatus
        })
    }, [allProducts, search, statusFilter])

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Buscar produto, categoria ou cliente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 pr-3 w-72 bg-white border-0 shadow-none h-8 text-sm focus-visible:ring-0 placeholder:text-gray-400"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {(["ALL", "ATIVO", "INATIVO", "SUSPENSO"] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                statusFilter === s
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                            {s === "ALL" ? "Todos" : s === "ATIVO" ? "Ativos" : s === "INATIVO" ? "Inativos" : "Suspensos"}
                        </button>
                    ))}
                    <span className="text-xs text-gray-400 ml-2">{allProducts.length} produtos</span>
                    <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors cursor-pointer ml-2">
                        <Plus size={13} /> Novo Produto
                    </button>
                </div>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-[1.2fr_100px_110px_110px_110px_90px] gap-3 px-4 py-2.5 border-b border-gray-200 bg-gray-50/80">
                <span className="text-xs font-medium text-gray-500">Produto</span>
                <span className="text-xs font-medium text-gray-500">Categoria</span>
                <span className="text-xs font-medium text-gray-500">Mensal</span>
                <span className="text-xs font-medium text-gray-500">Trimestral</span>
                <span className="text-xs font-medium text-gray-500">Anual</span>
                <span className="text-xs font-medium text-gray-500">Status</span>
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={20} className="animate-spin text-gray-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <Package size={24} className="mb-2 text-gray-300" />
                        <p className="text-sm">Nenhum produto encontrado</p>
                    </div>
                ) : (
                    filtered.map((product) => (
                        <div key={product.id} className="grid grid-cols-[1.2fr_100px_110px_110px_110px_90px] items-center border-b border-gray-100 hover:bg-gray-50 transition-colors px-4 py-3 gap-3">
                            {/* Produto */}
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                                {product.description && <p className="text-xs text-gray-400 truncate">{product.description}</p>}
                            </div>

                            {/* Categoria */}
                            {product.category ? (
                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white w-fit ${categoryTag[product.category] || "bg-gray-400"}`}>
                                    {product.category}
                                </span>
                            ) : <span className="text-xs text-gray-300">—</span>}

                            {/* Preço Mensal */}
                            <span className="text-sm font-semibold text-gray-900">{product.priceMonthly ? formatPrice(product.priceMonthly) : <span className="text-gray-300 font-normal">—</span>}</span>

                            {/* Preço Trimestral */}
                            <span className="text-sm text-gray-600">{product.priceQuarterly ? formatPrice(product.priceQuarterly) : <span className="text-gray-300">—</span>}</span>

                            {/* Preço Anual */}
                            <span className="text-sm text-gray-600">{product.priceYearly ? formatPrice(product.priceYearly) : <span className="text-gray-300">—</span>}</span>

                            {/* Status */}
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white w-fit ${statusTag[product.status] || "bg-gray-400"}`}>
                                {product.status}
                            </span>
                        </div>
                    ))
                )}
            </div>
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent side="right" className="sm:max-w-md w-full p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
                        <SheetTitle className="text-base">Novo Produto</SheetTitle>
                        <SheetDescription className="text-xs">Preencha os dados para cadastrar um novo produto.</SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nome do produto</label>
                            <Input placeholder="Ex: Módulo Financeiro" className="h-10 rounded-lg text-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Descrição</label>
                            <textarea placeholder="Descreva o produto..." className="w-full h-20 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Categoria</label>
                            <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                                <option value="ERP">ERP</option>
                                <option value="Módulo">Módulo</option>
                                <option value="Analytics">Analytics</option>
                                <option value="Integração">Integração</option>
                                <option value="Mobile">Mobile</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Mensal (R$)</label>
                                <Input placeholder="0,00" type="number" className="h-10 rounded-lg text-sm" value={form.priceMonthly} onChange={e => setForm({...form, priceMonthly: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Trimestral (R$)</label>
                                <Input placeholder="0,00" type="number" className="h-10 rounded-lg text-sm" value={form.priceQuarterly} onChange={e => setForm({...form, priceQuarterly: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Anual (R$)</label>
                                <Input placeholder="0,00" type="number" className="h-10 rounded-lg text-sm" value={form.priceYearly} onChange={e => setForm({...form, priceYearly: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Status</label>
                            <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                                <option value="ATIVO">Ativo</option>
                                <option value="INATIVO">Inativo</option>
                                <option value="SUSPENSO">Suspenso</option>
                            </select>
                        </div>
                    </div>
                    <SheetFooter className="px-6 py-4 border-t border-gray-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
                            <Button className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm" onClick={handleSubmit} disabled={createMutation.isPending}>
                                {createMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                                Salvar Produto
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    )
}
