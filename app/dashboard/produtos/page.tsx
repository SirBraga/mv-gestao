"use client"

import { useEffect, useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/app/actions/products"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Search, Package, Plus, Loader2, Pencil, Trash2, MoreHorizontal, Key, ChevronUp, ChevronDown, ArrowUp, ArrowDown, CheckCircle, XCircle, PauseCircle, Star } from "lucide-react"
import { toast } from "react-toastify"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"

type FilterType = "all" | "active" | "inactive" | "suspended"
type SortKey = "name" | "category" | "priceMonthly" | "status"
type SortDir = "asc" | "desc"

const FILTERS = [
    { key: "all" as FilterType, label: "Todos", icon: Package },
    { key: "active" as FilterType, label: "Ativos", icon: CheckCircle },
    { key: "inactive" as FilterType, label: "Inativos", icon: XCircle },
    { key: "suspended" as FilterType, label: "Suspensos", icon: PauseCircle },
]

const COLUMNS: { key: SortKey; label: string }[] = [
    { key: "name", label: "Produto" },
    { key: "category", label: "Categoria" },
    { key: "priceMonthly", label: "Preço" },
    { key: "status", label: "Status" },
]

interface ProductData {
    id: string
    name: string
    description: string | null
    category: string | null
    status: string
    priceMonthly: number | null
    priceQuarterly: number | null
    priceYearly: number | null
    hasSerialControl: boolean
    clientId: string | null
    createdAt: string
}

const INITIAL_FORM = {
    name: "", description: "", category: "ERP",
    status: "ATIVO", priceMonthly: "", priceQuarterly: "", priceYearly: "",
    hasSerialControl: false,
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

function compareProducts(a: ProductData, b: ProductData, key: SortKey, dir: SortDir): number {
    let cmp = 0
    switch (key) {
        case "name": cmp = a.name.localeCompare(b.name, "pt-BR"); break
        case "category": cmp = (a.category || "").localeCompare(b.category || "", "pt-BR"); break
        case "priceMonthly": cmp = (a.priceMonthly || 0) - (b.priceMonthly || 0); break
        case "status": cmp = a.status.localeCompare(b.status); break
    }
    return dir === "asc" ? cmp : -cmp
}

export default function ProdutosPage() {
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState("")
    const [activeFilter, setActiveFilter] = useState<FilterType>("all")
    const [sortKey, setSortKey] = useState<SortKey>("name")
    const [sortDir, setSortDir] = useState<SortDir>("asc")
    const [defaultOpen, setDefaultOpen] = useState(true)
    const [favoritesOpen, setFavoritesOpen] = useState(false)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [editDrawerOpen, setEditDrawerOpen] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null)
    const [form, setForm] = useState(INITIAL_FORM)
    const [editForm, setEditForm] = useState(INITIAL_FORM)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(15)

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

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateProduct>[1] }) => updateProduct(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] })
            setEditDrawerOpen(false)
            setSelectedProduct(null)
            setEditForm(INITIAL_FORM)
            toast.success("Produto atualizado com sucesso!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const deleteMutation = useMutation({
        mutationFn: deleteProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] })
            toast.success("Produto excluído com sucesso!")
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
            hasSerialControl: form.hasSerialControl,
        })
    }

    const handleEditSubmit = () => {
        if (!selectedProduct) return
        if (!editForm.name.trim()) return toast.error("Nome é obrigatório")
        updateMutation.mutate({
            id: selectedProduct.id,
            data: {
                name: editForm.name,
                description: editForm.description || undefined,
                category: editForm.category || undefined,
                status: editForm.status,
                priceMonthly: editForm.priceMonthly ? parseFloat(editForm.priceMonthly) : null,
                priceQuarterly: editForm.priceQuarterly ? parseFloat(editForm.priceQuarterly) : null,
                priceYearly: editForm.priceYearly ? parseFloat(editForm.priceYearly) : null,
                hasSerialControl: editForm.hasSerialControl,
            },
        })
    }

    const openEditDrawer = (product: ProductData) => {
        setSelectedProduct(product)
        setEditForm({
            name: product.name,
            description: product.description || "",
            category: product.category || "ERP",
            status: product.status,
            priceMonthly: product.priceMonthly?.toString() || "",
            priceQuarterly: product.priceQuarterly?.toString() || "",
            priceYearly: product.priceYearly?.toString() || "",
            hasSerialControl: product.hasSerialControl,
        })
        setEditDrawerOpen(true)
    }

    const handleDelete = (product: ProductData) => {
        if (confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`)) {
            deleteMutation.mutate(product.id)
        }
    }

    const allProducts = products as ProductData[]

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === "asc" ? "desc" : "asc")
        } else {
            setSortKey(key)
            setSortDir("asc")
        }
    }

    const filteredProducts = useMemo(() => {
        const filterStatusMap: Record<FilterType, string[]> = {
            all: ["ATIVO", "INATIVO", "SUSPENSO"],
            active: ["ATIVO"],
            inactive: ["INATIVO"],
            suspended: ["SUSPENSO"],
        }

        return allProducts
            .filter((p) => {
                const matchesFilter = filterStatusMap[activeFilter].includes(p.status)
                const matchesSearch = searchQuery === "" ||
                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (p.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (p.category || "").toLowerCase().includes(searchQuery.toLowerCase())
                return matchesFilter && matchesSearch
            })
            .sort((a, b) => compareProducts(a, b, sortKey, sortDir))
    }, [allProducts, activeFilter, searchQuery, sortKey, sortDir])

    const counts: Record<FilterType, number> = {
        all: allProducts.length,
        active: allProducts.filter((p) => p.status === "ATIVO").length,
        inactive: allProducts.filter((p) => p.status === "INATIVO").length,
        suspended: allProducts.filter((p) => p.status === "SUSPENSO").length,
    }

    useEffect(() => {
        setCurrentPage(1)
    }, [activeFilter, searchQuery, sortKey, sortDir, pageSize])

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * pageSize
        return filteredProducts.slice(start, start + pageSize)
    }, [filteredProducts, currentPage, pageSize])
    const pageStart = filteredProducts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
    const pageEnd = Math.min(currentPage * pageSize, filteredProducts.length)

    return (
        <div className="flex h-full bg-slate-50">
            {/* Left Filter Panel */}
            <div className="w-60 min-w-60 bg-white h-full flex flex-col px-4 pt-6 border-r border-slate-200">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-lg font-bold text-slate-900">Produtos</h1>
                    <p className="text-xs text-slate-500 mt-0.5">{counts.all} cadastrados</p>
                </div>

                {/* Filtros section */}
                <div className="mb-6">
                    <button
                        onClick={() => setDefaultOpen(!defaultOpen)}
                        className="flex items-center justify-between w-full px-2 mb-2"
                    >
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtros</span>
                        {defaultOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </button>

                    {defaultOpen && (
                        <div className="flex flex-col gap-0.5">
                            {FILTERS.map((filter) => {
                                const Icon = filter.icon
                                const isActive = activeFilter === filter.key
                                return (
                                    <button
                                        key={filter.key}
                                        onClick={() => setActiveFilter(filter.key)}
                                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                                            isActive
                                                ? "bg-indigo-50 text-indigo-700 font-medium"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon size={16} strokeWidth={1.5} />
                                            <span>{filter.label}</span>
                                        </div>
                                        <span className={`text-xs min-w-6 text-center rounded-full px-2 py-0.5 font-semibold ${
                                            isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                                        }`}>{counts[filter.key]}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Favourites Section */}
                <div>
                    <button
                        onClick={() => setFavoritesOpen(!favoritesOpen)}
                        className="flex items-center justify-between w-full px-2 mb-2"
                    >
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Favoritos</span>
                        {favoritesOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
                    </button>

                    {favoritesOpen && (
                        <div className="flex items-center gap-2.5 px-3 py-3 text-slate-400 text-sm bg-slate-50 rounded-xl">
                            <Star size={16} />
                            <span>Nenhum favorito</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Top Bar */}
                <div className="flex items-center justify-between px-6 h-16 bg-white border-b border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <Input
                                placeholder="Buscar produtos..."
                                className="pl-10 pr-4 w-72 bg-slate-50 border-slate-200 h-10 text-sm rounded-xl focus-visible:ring-indigo-500 placeholder:text-slate-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm shadow-indigo-600/25">
                            <Plus size={16} /> Novo Produto
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
                    <p className="text-sm text-slate-500">
                        Mostrando <span className="font-medium text-slate-900">{pageStart}-{pageEnd}</span> de <span className="font-medium text-slate-900">{filteredProducts.length}</span>
                    </p>
                    <div className="flex items-center gap-3">
                        <label className="text-sm text-slate-500">Por página</label>
                        <select
                            className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 bg-white"
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                        >
                            <option value={15}>15</option>
                            <option value={30}>30</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                </div>

                {/* Column Headers */}
                <div className="grid grid-cols-[1.5fr_120px_140px_100px_50px] gap-3 px-6 py-3 border-b border-slate-200 bg-slate-50">
                    {COLUMNS.map((col) => (
                        <button
                            key={col.key}
                            onClick={() => handleSort(col.key)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer select-none uppercase tracking-wider"
                        >
                            {col.label}
                            {sortKey === col.key && (
                                sortDir === "desc"
                                    ? <ArrowDown size={12} />
                                    : <ArrowUp size={12} />
                            )}
                        </button>
                    ))}
                    <span></span>
                </div>

                {/* Rows */}
                <div className="flex-1 overflow-y-auto bg-white">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 size={28} className="animate-spin text-indigo-600" />
                            <p className="text-sm text-slate-500 mt-3">Carregando produtos...</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Package size={40} className="text-slate-300 mb-3" />
                            <p className="text-sm font-medium text-slate-600">Nenhum produto encontrado</p>
                            <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou busca</p>
                        </div>
                    ) : (
                        paginatedProducts.map((product) => (
                            <div key={product.id} className="group grid grid-cols-[1.5fr_120px_140px_100px_50px] items-center border-b border-slate-100 hover:bg-slate-50/50 transition-all px-6 py-3.5 gap-3">
                                {/* Produto */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                                        <Package size={16} className="text-indigo-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                                            {product.hasSerialControl && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                                                    <Key size={10} /> Serial
                                                </span>
                                            )}
                                        </div>
                                        {product.description && <p className="text-xs text-slate-400 truncate mt-0.5">{product.description}</p>}
                                    </div>
                                </div>

                                {/* Categoria */}
                                {product.category ? (
                                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white w-fit ${categoryTag[product.category] || "bg-slate-400"}`}>
                                        {product.category}
                                    </span>
                                ) : <span className="text-xs text-slate-300">—</span>}

                                {/* Preço */}
                                <div className="min-w-0">
                                    <span className="text-sm font-semibold text-slate-900">{product.priceMonthly ? formatPrice(product.priceMonthly) : <span className="text-slate-300 font-normal">—</span>}</span>
                                    {(product.priceQuarterly || product.priceYearly) && (
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            {product.priceQuarterly && `Trim: ${formatPrice(product.priceQuarterly)}`}
                                            {product.priceQuarterly && product.priceYearly && " · "}
                                            {product.priceYearly && `Anual: ${formatPrice(product.priceYearly)}`}
                                        </p>
                                    )}
                                </div>

                                {/* Status */}
                                <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white w-fit ${statusTag[product.status] || "bg-slate-400"}`}>
                                    {product.status === "ATIVO" ? "Ativo" : product.status === "INATIVO" ? "Inativo" : "Suspenso"}
                                </span>

                                {/* Ações */}
                                <div className="flex items-center justify-end">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            <DropdownMenuItem onClick={() => openEditDrawer(product)} className="cursor-pointer">
                                                <Pencil size={14} className="mr-2" /> Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handleDelete(product)} className="cursor-pointer text-red-600 focus:text-red-600">
                                                <Trash2 size={14} className="mr-2" /> Excluir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {!isLoading && filteredProducts.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white">
                        <p className="text-sm text-slate-500">Página <span className="font-medium text-slate-900">{currentPage}</span> de <span className="font-medium text-slate-900">{totalPages}</span></p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" className="h-9 rounded-lg text-sm" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>Anterior</Button>
                            <Button variant="outline" className="h-9 rounded-lg text-sm" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>Próxima</Button>
                        </div>
                    </div>
                )}
            </div>
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent side="right" className="sm:max-w-md w-full p-0" onInteractOutside={(event) => event.preventDefault()}>
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
                        <div className="flex items-center gap-3 py-2">
                            <input
                                type="checkbox"
                                id="hasSerialControl"
                                checked={form.hasSerialControl}
                                onChange={e => setForm({...form, hasSerialControl: e.target.checked})}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="hasSerialControl" className="text-sm font-medium text-gray-700">
                                Exige controle de seriais
                            </label>
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

            {/* Drawer de Edição */}
            <Sheet open={editDrawerOpen} onOpenChange={(open) => { setEditDrawerOpen(open); if (!open) { setSelectedProduct(null); setEditForm(INITIAL_FORM) } }}>
                <SheetContent side="right" className="sm:max-w-md w-full p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
                        <SheetTitle className="text-base">Editar Produto</SheetTitle>
                        <SheetDescription className="text-xs">Atualize os dados do produto.</SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nome do produto</label>
                            <Input placeholder="Ex: Módulo Financeiro" className="h-10 rounded-lg text-sm" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Descrição</label>
                            <textarea placeholder="Descreva o produto..." className="w-full h-20 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white resize-none" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Categoria</label>
                            <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}>
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
                                <Input placeholder="0,00" type="number" className="h-10 rounded-lg text-sm" value={editForm.priceMonthly} onChange={e => setEditForm({...editForm, priceMonthly: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Trimestral (R$)</label>
                                <Input placeholder="0,00" type="number" className="h-10 rounded-lg text-sm" value={editForm.priceQuarterly} onChange={e => setEditForm({...editForm, priceQuarterly: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Anual (R$)</label>
                                <Input placeholder="0,00" type="number" className="h-10 rounded-lg text-sm" value={editForm.priceYearly} onChange={e => setEditForm({...editForm, priceYearly: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Status</label>
                            <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                                <option value="ATIVO">Ativo</option>
                                <option value="INATIVO">Inativo</option>
                                <option value="SUSPENSO">Suspenso</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-3 py-2">
                            <input
                                type="checkbox"
                                id="editHasSerialControl"
                                checked={editForm.hasSerialControl}
                                onChange={e => setEditForm({...editForm, hasSerialControl: e.target.checked})}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="editHasSerialControl" className="text-sm font-medium text-gray-700">
                                Exige controle de seriais
                            </label>
                        </div>
                    </div>
                    <SheetFooter className="px-6 py-4 border-t border-gray-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={() => { setEditDrawerOpen(false); setSelectedProduct(null); setEditForm(INITIAL_FORM) }}>Cancelar</Button>
                            <Button className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm" onClick={handleEditSubmit} disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                                Salvar Alterações
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    )
}
