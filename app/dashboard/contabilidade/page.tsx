"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getContabilities, createContability, updateContability, deleteContability } from "@/app/actions/contability"
import { getClients } from "@/app/actions/clients"
import AccountingCard, { type AccountingData } from "../_components/accountingCard"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Search, Calculator, Plus, Loader2, ChevronUp, ChevronDown, Printer, FileDown, ArrowUp, ArrowDown, Building2, User, Star } from "lucide-react"
import { toast } from "react-toastify"

type FilterType = "all" | "pj" | "pf"
type SortKey = "clientName" | "clientCount" | "phone" | "city" | "type"
type SortDir = "asc" | "desc"

const FILTERS = [
    { key: "all" as FilterType, label: "Todos", icon: Calculator },
    { key: "pj" as FilterType, label: "Pessoa Jurídica", icon: Building2 },
    { key: "pf" as FilterType, label: "Pessoa Física", icon: User },
]

const COLUMNS: { key: SortKey; label: string }[] = [
    { key: "clientName", label: "Escritório" },
    { key: "clientCount", label: "Clientes" },
    { key: "phone", label: "Telefone" },
    { key: "city", label: "Cidade" },
    { key: "type", label: "Tipo" },
]

function compareContabilities(a: AccountingData, b: AccountingData, key: SortKey, dir: SortDir): number {
    let cmp = 0
    switch (key) {
        case "clientName": cmp = (a.clientNames || "").localeCompare(b.clientNames || "", "pt-BR"); break
        case "clientCount": cmp = a.clientCount - b.clientCount; break
        case "phone": cmp = (a.phone || "").localeCompare(b.phone || ""); break
        case "city": cmp = (a.city || "").localeCompare(b.city || "", "pt-BR"); break
        case "type": cmp = a.type.localeCompare(b.type); break
    }
    return dir === "asc" ? cmp : -cmp
}

const INITIAL_FORM = {
    name: "", type: "PJ" as "PF" | "PJ", cnpj: "", cpf: "",
    phone: "", email: "", city: "", state: "",
    address: "", houseNumber: "", neighborhood: "", zipCode: "", complement: "", ie: "",
}

export default function ContabilidadePage() {
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState("")
    const [activeFilter, setActiveFilter] = useState<FilterType>("all")
    const [sortKey, setSortKey] = useState<SortKey>("clientName")
    const [sortDir, setSortDir] = useState<SortDir>("asc")
    const [defaultOpen, setDefaultOpen] = useState(true)
    const [favoritesOpen, setFavoritesOpen] = useState(false)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [editDrawerOpen, setEditDrawerOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<AccountingData | null>(null)
    const [form, setForm] = useState(INITIAL_FORM)
    const [editForm, setEditForm] = useState(INITIAL_FORM)

    const { data: contabilities = [], isLoading } = useQuery({
        queryKey: ["contabilities"],
        queryFn: () => getContabilities(),
    })

    const { data: clientsList = [] } = useQuery({
        queryKey: ["clients-simple"],
        queryFn: () => getClients(),
    })

    const createMutation = useMutation({
        mutationFn: createContability,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contabilities"] })
            setDrawerOpen(false)
            setForm(INITIAL_FORM)
            toast.success("Escritório cadastrado com sucesso!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateContability>[1] }) => updateContability(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contabilities"] })
            setEditDrawerOpen(false)
            setSelectedItem(null)
            setEditForm(INITIAL_FORM)
            toast.success("Escritório atualizado com sucesso!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const deleteMutation = useMutation({
        mutationFn: deleteContability,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contabilities"] })
            toast.success("Escritório excluído com sucesso!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const handleSubmit = () => {
        if (!form.name?.trim()) return toast.error("Nome é obrigatório")
        createMutation.mutate(form)
    }

    const handleEditSubmit = () => {
        if (!selectedItem) return
        updateMutation.mutate({
            id: selectedItem.id,
            data: {
                phone: editForm.phone || undefined,
                email: editForm.email || undefined,
                city: editForm.city || undefined,
                state: editForm.state || undefined,
                address: editForm.address || undefined,
                houseNumber: editForm.houseNumber || undefined,
                neighborhood: editForm.neighborhood || undefined,
                zipCode: editForm.zipCode || undefined,
            },
        })
    }

    const openEditDrawer = (item: AccountingData) => {
        setSelectedItem(item)
        setEditForm({
            name: item.name || "",
            type: item.type,
            cnpj: item.cnpj || "",
            cpf: item.cpf || "",
            phone: item.phone || "",
            email: item.email || "",
            city: item.city || "",
            state: item.state || "",
            address: "",
            houseNumber: "",
            neighborhood: "",
            zipCode: "",
            complement: "",
            ie: "",
        })
        setEditDrawerOpen(true)
    }

    const handleDelete = (item: AccountingData) => {
        if (confirm(`Tem certeza que deseja excluir o escritório "${item.name || item.clientNames}"?`)) {
            deleteMutation.mutate(item.id)
        }
    }

    const allContabilities = contabilities as AccountingData[]

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === "asc" ? "desc" : "asc")
        } else {
            setSortKey(key)
            setSortDir("asc")
        }
    }

    const filteredContabilities = useMemo(() => {
        const filterTypeMap: Record<FilterType, string[]> = {
            all: ["PJ", "PF"],
            pj: ["PJ"],
            pf: ["PF"],
        }

        return allContabilities
            .filter((item) => {
                const matchesFilter = filterTypeMap[activeFilter].includes(item.type)
                const matchesSearch = searchQuery === "" ||
                    (item.clientNames || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (item.cnpj || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (item.city || "").toLowerCase().includes(searchQuery.toLowerCase())
                return matchesFilter && matchesSearch
            })
            .sort((a, b) => compareContabilities(a, b, sortKey, sortDir))
    }, [allContabilities, activeFilter, searchQuery, sortKey, sortDir])

    const counts: Record<FilterType, number> = {
        all: allContabilities.length,
        pj: allContabilities.filter((c) => c.type === "PJ").length,
        pf: allContabilities.filter((c) => c.type === "PF").length,
    }

    return (
        <div className="flex h-full bg-slate-50">
            {/* Left Filter Panel */}
            <div className="w-60 min-w-60 bg-white h-full flex flex-col px-4 pt-6 border-r border-slate-200">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-lg font-bold text-slate-900">Contabilidade</h1>
                    <p className="text-xs text-slate-500 mt-0.5">{counts.all} escritórios</p>
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
                                placeholder="Buscar escritórios..."
                                className="pl-10 pr-4 w-72 bg-slate-50 border-slate-200 h-10 text-sm rounded-xl focus-visible:ring-indigo-500 placeholder:text-slate-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:bg-slate-50 h-10 px-3 rounded-xl">
                            <Printer size={16} />
                        </Button>
                        <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:bg-slate-50 gap-2 h-10 px-4 rounded-xl">
                            <FileDown size={16} />
                            <span className="text-sm">Exportar</span>
                        </Button>
                        <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm shadow-indigo-600/25">
                            <Plus size={16} /> Novo Escritório
                        </button>
                    </div>
                </div>

                {/* Column Headers */}
                <div className="grid grid-cols-[1.5fr_100px_140px_120px_80px_50px] gap-3 px-6 py-3 border-b border-slate-200 bg-slate-50">
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
                            <p className="text-sm text-slate-500 mt-3">Carregando escritórios...</p>
                        </div>
                    ) : filteredContabilities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Calculator size={40} className="text-slate-300 mb-3" />
                            <p className="text-sm font-medium text-slate-600">Nenhum escritório encontrado</p>
                            <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou busca</p>
                        </div>
                    ) : (
                        filteredContabilities.map((item) => <AccountingCard key={item.id} data={item} onEdit={openEditDrawer} onDelete={handleDelete} />)
                    )}
                </div>
            </div>
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent side="right" className="sm:max-w-md w-full p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
                        <SheetTitle className="text-base">Novo Escritório</SheetTitle>
                        <SheetDescription className="text-xs">Preencha os dados para cadastrar um novo escritório contábil.</SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nome da Contabilidade</label>
                            <input 
                                type="text" 
                                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" 
                                value={form.name} 
                                onChange={e => setForm({...form, name: e.target.value})}
                                placeholder="Nome da contabilidade..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tipo</label>
                                <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.type} onChange={e => setForm({...form, type: e.target.value as "PF"|"PJ"})}>
                                    <option value="PJ">Pessoa Jurídica</option>
                                    <option value="PF">Pessoa Física</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{form.type === "PJ" ? "CNPJ" : "CPF"}</label>
                                <Input placeholder={form.type === "PJ" ? "00.000.000/0001-00" : "000.000.000-00"} className="h-10 rounded-lg text-sm" value={form.type === "PJ" ? form.cnpj : form.cpf} onChange={e => form.type === "PJ" ? setForm({...form, cnpj: e.target.value}) : setForm({...form, cpf: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Telefone</label>
                                <Input placeholder="(00) 0000-0000" className="h-10 rounded-lg text-sm" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
                                <Input placeholder="contato@escritorio.com" className="h-10 rounded-lg text-sm" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cidade</label>
                                <Input placeholder="São Paulo" className="h-10 rounded-lg text-sm" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Estado</label>
                                <Input placeholder="SP" className="h-10 rounded-lg text-sm" value={form.state} onChange={e => setForm({...form, state: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Endereço</label>
                                <Input placeholder="Rua..." className="h-10 rounded-lg text-sm" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Número</label>
                                <Input placeholder="123" className="h-10 rounded-lg text-sm" value={form.houseNumber} onChange={e => setForm({...form, houseNumber: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Bairro</label>
                                <Input placeholder="Centro" className="h-10 rounded-lg text-sm" value={form.neighborhood} onChange={e => setForm({...form, neighborhood: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">CEP</label>
                                <Input placeholder="00000-000" className="h-10 rounded-lg text-sm" value={form.zipCode} onChange={e => setForm({...form, zipCode: e.target.value})} />
                            </div>
                        </div>
                    </div>
                    <SheetFooter className="px-6 py-4 border-t border-gray-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
                            <Button className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm" onClick={handleSubmit} disabled={createMutation.isPending}>
                                {createMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                                Salvar Escritório
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Drawer de Edição */}
            <Sheet open={editDrawerOpen} onOpenChange={(open) => { setEditDrawerOpen(open); if (!open) { setSelectedItem(null); setEditForm(INITIAL_FORM) } }}>
                <SheetContent side="right" className="sm:max-w-md w-full p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
                        <SheetTitle className="text-base">Editar Escritório</SheetTitle>
                        <SheetDescription className="text-xs">Atualize os dados do escritório contábil.</SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-400 mb-1">Cliente</p>
                            <p className="text-sm font-medium text-gray-900">{selectedItem?.name || selectedItem?.clientNames}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Telefone</label>
                                <Input placeholder="(00) 0000-0000" className="h-10 rounded-lg text-sm" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
                                <Input placeholder="contato@escritorio.com" className="h-10 rounded-lg text-sm" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cidade</label>
                                <Input placeholder="São Paulo" className="h-10 rounded-lg text-sm" value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Estado</label>
                                <Input placeholder="SP" className="h-10 rounded-lg text-sm" value={editForm.state} onChange={e => setEditForm({...editForm, state: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Endereço</label>
                                <Input placeholder="Rua..." className="h-10 rounded-lg text-sm" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Número</label>
                                <Input placeholder="123" className="h-10 rounded-lg text-sm" value={editForm.houseNumber} onChange={e => setEditForm({...editForm, houseNumber: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Bairro</label>
                                <Input placeholder="Centro" className="h-10 rounded-lg text-sm" value={editForm.neighborhood} onChange={e => setEditForm({...editForm, neighborhood: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">CEP</label>
                                <Input placeholder="00000-000" className="h-10 rounded-lg text-sm" value={editForm.zipCode} onChange={e => setEditForm({...editForm, zipCode: e.target.value})} />
                            </div>
                        </div>
                    </div>
                    <SheetFooter className="px-6 py-4 border-t border-gray-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={() => { setEditDrawerOpen(false); setSelectedItem(null); setEditForm(INITIAL_FORM) }}>Cancelar</Button>
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
