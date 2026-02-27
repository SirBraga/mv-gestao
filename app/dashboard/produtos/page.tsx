"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Search, Package, Plus } from "lucide-react"
import Link from "next/link"

interface ProductData {
    id: string
    name: string
    description: string | null
    clients: number
    category: string | null
    status: "ATIVO" | "INATIVO" | "SUSPENSO"
    price: number
}

const SAMPLE_PRODUCTS: ProductData[] = [
    { id: "p001", name: "ERP Gestão Completa", description: "Sistema ERP completo para gestão empresarial", clients: 5, category: "ERP", status: "ATIVO", price: 1200.00 },
    { id: "p002", name: "Módulo Estoque", description: "Módulo de controle de estoque integrado ao ERP", clients: 3, category: "Módulo", status: "ATIVO", price: 350.00 },
    { id: "p003", name: "Módulo Financeiro", description: "Gestão financeira, contas a pagar e receber", clients: 4, category: "Módulo", status: "ATIVO", price: 450.00 },
    { id: "p004", name: "Módulo Contábil", description: "Escrituração contábil e fiscal automatizada", clients: 2, category: "Módulo", status: "ATIVO", price: 500.00 },
    { id: "p005", name: "Dashboard Analytics", description: "Painel de indicadores e relatórios gerenciais", clients: 1, category: "Analytics", status: "INATIVO", price: 280.00 },
    { id: "p006", name: "Gateway de Pagamento", description: "Integração com meios de pagamento e boletos", clients: 6, category: "Integração", status: "ATIVO", price: 200.00 },
    { id: "p007", name: "Módulo Logística", description: "Controle de rotas, entregas e frota", clients: 0, category: "Módulo", status: "SUSPENSO", price: 600.00 },
    { id: "p008", name: "App Mobile", description: "Aplicativo mobile para gestão em campo", clients: 3, category: "Mobile", status: "ATIVO", price: 150.00 },
]

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
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<"ALL" | "ATIVO" | "INATIVO" | "SUSPENSO">("ALL")
    const [drawerOpen, setDrawerOpen] = useState(false)

    const filtered = useMemo(() => {
        return SAMPLE_PRODUCTS.filter((p) => {
            const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                (p.description || "").toLowerCase().includes(search.toLowerCase()) ||
                (p.category || "").toLowerCase().includes(search.toLowerCase())
            const matchStatus = statusFilter === "ALL" || p.status === statusFilter
            return matchSearch && matchStatus
        })
    }, [search, statusFilter])

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
                    <span className="text-xs text-gray-400 ml-2">{SAMPLE_PRODUCTS.length} produtos</span>
                    <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors cursor-pointer ml-2">
                        <Plus size={13} /> Novo Produto
                    </button>
                </div>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-[1.2fr_1fr_100px_100px_90px] gap-3 px-4 py-2.5 border-b border-gray-200 bg-gray-50/80">
                <span className="text-xs font-medium text-gray-500">Produto</span>
                <span className="text-xs font-medium text-gray-500">Clientes</span>
                <span className="text-xs font-medium text-gray-500">Categoria</span>
                <span className="text-xs font-medium text-gray-500">Preço</span>
                <span className="text-xs font-medium text-gray-500">Status</span>
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <Package size={24} className="mb-2 text-gray-300" />
                        <p className="text-sm">Nenhum produto encontrado</p>
                    </div>
                ) : (
                    filtered.map((product) => (
                        <Link key={product.id} href={`/dashboard/produtos/${product.id}`} className="grid grid-cols-[1.2fr_1fr_100px_100px_90px] items-center border-b border-gray-100 hover:bg-gray-50 transition-colors px-4 py-3 gap-3 cursor-pointer">
                            {/* Produto */}
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                                {product.description && <p className="text-xs text-gray-400 truncate">{product.description}</p>}
                            </div>

                            {/* Clientes */}
                            <span className="text-sm text-gray-600">{product.clients > 0 ? `${product.clients} clientes` : <span className="text-gray-300">Nenhum</span>}</span>

                            {/* Categoria */}
                            {product.category ? (
                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white w-fit ${categoryTag[product.category] || "bg-gray-400"}`}>
                                    {product.category}
                                </span>
                            ) : <span className="text-xs text-gray-300">—</span>}

                            {/* Preço */}
                            <span className="text-sm font-semibold text-gray-900">{formatPrice(product.price)}</span>

                            {/* Status */}
                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white w-fit ${statusTag[product.status]}`}>
                                {product.status}
                            </span>
                        </Link>
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
                            <Input placeholder="Ex: Módulo Financeiro" className="h-10 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Descrição</label>
                            <textarea placeholder="Descreva o produto..." className="w-full h-20 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white resize-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Categoria</label>
                                <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white">
                                    <option value="ERP">ERP</option>
                                    <option value="Módulo">Módulo</option>
                                    <option value="Analytics">Analytics</option>
                                    <option value="Integração">Integração</option>
                                    <option value="Mobile">Mobile</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Preço mensal (R$)</label>
                                <Input placeholder="0,00" type="number" className="h-10 rounded-lg text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Status</label>
                            <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white">
                                <option value="ATIVO">Ativo</option>
                                <option value="INATIVO">Inativo</option>
                                <option value="SUSPENSO">Suspenso</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Contato de suporte</label>
                            <Input placeholder="suporte@empresa.com.br" className="h-10 rounded-lg text-sm" />
                        </div>
                    </div>
                    <SheetFooter className="px-6 py-4 border-t border-gray-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
                            <Button className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm" onClick={() => { console.log("Creating product"); setDrawerOpen(false) }}>Salvar Produto</Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    )
}
