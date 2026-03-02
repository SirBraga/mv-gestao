"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getClients, createClient } from "@/app/actions/clients"
import ClientCard from "../_components/clientCard"
import type { ClientData } from "../_components/clientCard"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { toast } from "react-toastify"
import {
    Search,
    Filter,
    Printer,
    FileDown,
    ChevronUp,
    ChevronDown,
    Users,
    UserCheck,
    UserX,
    Star,
    ArrowUp,
    ArrowDown,
    Plus,
    ShieldAlert,
    AlertTriangle,
    Loader2,
} from "lucide-react"

type FilterType = "all" | "active" | "blocked" | "cert_expired" | "cert_expiring"
type SortKey = "id" | "name" | "phone" | "email" | "status" | "contract" | "type"
type SortDir = "asc" | "desc"

function isCertExpired(dateStr: string | null) {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
}

function isCertExpiring30d(dateStr: string | null) {
    if (!dateStr) return false
    const exp = new Date(dateStr)
    const now = new Date()
    const in30 = new Date()
    in30.setDate(in30.getDate() + 30)
    return exp >= now && exp <= in30
}

const INITIAL_FORM = {
    name: "", type: "PJ" as "PF" | "PJ", cnpj: "", cpf: "", phone: "", email: "",
    address: "", city: "", houseNumber: "", neighborhood: "", zipCode: "", complement: "",
    ownerName: "", ownerPhone: "", ownerEmail: "",
    hasContract: false, supportReleased: false,
}

const FILTERS = [
    { key: "all" as FilterType, label: "Todos", icon: Users },
    { key: "active" as FilterType, label: "Liberados", icon: UserCheck },
    { key: "blocked" as FilterType, label: "Bloqueados", icon: UserX },
    { key: "cert_expired" as FilterType, label: "Cert. Vencido", icon: ShieldAlert },
    { key: "cert_expiring" as FilterType, label: "Cert. Vencendo", icon: AlertTriangle },
]

const COLUMNS: { key: SortKey; label: string }[] = [
    { key: "name", label: "Cliente" },
    { key: "phone", label: "Telefone" },
    { key: "email", label: "Email" },
    { key: "status", label: "Status" },
    { key: "contract", label: "Contrato" },
    { key: "type", label: "Tipo" },
]

function compareClients(a: ClientData, b: ClientData, key: SortKey, dir: SortDir): number {
    let valA: string | boolean = ""
    let valB: string | boolean = ""
    switch (key) {
        case "id": valA = a.id; valB = b.id; break
        case "name": valA = a.name; valB = b.name; break
        case "phone": valA = a.phone || ""; valB = b.phone || ""; break
        case "email": valA = a.email || ""; valB = b.email || ""; break
        case "status": valA = a.supportReleased; valB = b.supportReleased; break
        case "contract": valA = a.hasContract; valB = b.hasContract; break
        case "type": valA = a.type; valB = b.type; break
    }
    if (typeof valA === "boolean") {
        const cmp = (valA === valB) ? 0 : valA ? -1 : 1
        return dir === "asc" ? cmp : -cmp
    }
    const cmp = String(valA).localeCompare(String(valB), "pt-BR", { numeric: true })
    return dir === "asc" ? cmp : -cmp
}

export default function Clientes() {
    const queryClient = useQueryClient()
    const [activeFilter, setActiveFilter] = useState<FilterType>("all")
    const [defaultOpen, setDefaultOpen] = useState(true)
    const [favoritesOpen, setFavoritesOpen] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [sortKey, setSortKey] = useState<SortKey>("name")
    const [sortDir, setSortDir] = useState<SortDir>("asc")
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [form, setForm] = useState(INITIAL_FORM)

    const { data: clients = [], isLoading } = useQuery({
        queryKey: ["clients"],
        queryFn: () => getClients(),
    })

    const createMutation = useMutation({
        mutationFn: createClient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] })
            setDrawerOpen(false)
            setForm(INITIAL_FORM)
            toast.success("Cliente criado com sucesso!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === "asc" ? "desc" : "asc")
        } else {
            setSortKey(key)
            setSortDir("desc")
        }
    }

    const handleSubmit = () => {
        if (!form.name.trim()) return toast.error("Nome é obrigatório")
        if (!form.city.trim()) return toast.error("Cidade é obrigatória")
        createMutation.mutate({
            name: form.name, type: form.type,
            cnpj: form.type === "PJ" ? form.cnpj : undefined,
            cpf: form.type === "PF" ? form.cpf : undefined,
            address: form.address, city: form.city, houseNumber: form.houseNumber,
            neighborhood: form.neighborhood, zipCode: form.zipCode, complement: form.complement,
            ownerName: form.ownerName, ownerPhone: form.ownerPhone, ownerEmail: form.ownerEmail,
            hasContract: form.hasContract, supportReleased: form.supportReleased,
        })
    }

    const filteredClients = useMemo(() => {
        return (clients as ClientData[])
            .filter((client) => {
                const matchesFilter =
                    activeFilter === "all" ||
                    (activeFilter === "active" && client.supportReleased) ||
                    (activeFilter === "blocked" && !client.supportReleased) ||
                    (activeFilter === "cert_expired" && isCertExpired(client.certificateExpiresDate)) ||
                    (activeFilter === "cert_expiring" && isCertExpiring30d(client.certificateExpiresDate))

                const matchesSearch =
                    !searchQuery ||
                    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (client.cnpj || "").includes(searchQuery) ||
                    (client.cpf || "").includes(searchQuery)

                return matchesFilter && matchesSearch
            })
            .sort((a, b) => compareClients(a, b, sortKey, sortDir))
    }, [clients, activeFilter, searchQuery, sortKey, sortDir])

    const allClients = clients as ClientData[]
    const counts: Record<FilterType, number> = {
        all: allClients.length,
        active: allClients.filter((c) => c.supportReleased).length,
        blocked: allClients.filter((c) => !c.supportReleased).length,
        cert_expired: allClients.filter((c) => isCertExpired(c.certificateExpiresDate)).length,
        cert_expiring: allClients.filter((c) => isCertExpiring30d(c.certificateExpiresDate)).length,
    }

    return (
        <div className="flex h-full">
            {/* Left Filter Panel — like reference sidebar sections */}
            <div className="w-56 min-w-56 bg-white h-full flex flex-col px-3 pt-4 border-r border-gray-200">
                {/* Filtros section */}
                <div className="mb-4">
                    <button
                        onClick={() => setDefaultOpen(!defaultOpen)}
                        className="flex items-center justify-between w-full px-2 mb-1"
                    >
                        <span className="text-xs font-bold text-gray-900">Clientes</span>
                        {defaultOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </button>

                    {defaultOpen && (
                        <div className="flex flex-col">
                            {FILTERS.map((filter) => {
                                const Icon = filter.icon
                                const isActive = activeFilter === filter.key
                                return (
                                    <button
                                        key={filter.key}
                                        onClick={() => setActiveFilter(filter.key)}
                                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] transition-all ${
                                            isActive
                                                ? "bg-emerald-50 text-emerald-700 font-medium"
                                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <Icon size={14} strokeWidth={1.5} />
                                            <span>{filter.label}</span>
                                        </div>
                                        <span className={`text-xs min-w-5 text-center rounded-full px-1.5 py-0.5 font-medium ${
                                            isActive ? "bg-emerald-500 text-white" : "text-gray-400"
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
                        className="flex items-center justify-between w-full px-2 mb-1"
                    >
                        <span className="text-xs font-bold text-gray-900">Favoritos</span>
                        {favoritesOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronUp size={14} className="text-gray-400" />}
                    </button>

                    {favoritesOpen && (
                        <div className="flex items-center gap-2 px-2.5 py-1.5 text-gray-400 text-xs">
                            <Star size={13} />
                            <span>Nenhum favorito</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                {/* Top Bar */}
                <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <Input
                                placeholder="Buscar..."
                                className="pl-8 pr-3 w-56 bg-white border-0 shadow-none h-8 text-sm focus-visible:ring-0 placeholder:text-gray-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 h-8 w-8 p-0">
                            <Printer size={15} />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 gap-1 h-8 px-2">
                            <FileDown size={15} />
                            <span className="text-xs">CSV</span>
                        </Button>
                        <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors cursor-pointer">
                            <Plus size={13} /> Novo Cliente
                        </button>
                    </div>
                </div>

                {/* Column Headers */}
                <div className="grid grid-cols-[1.5fr_1fr_1fr_120px_110px_50px] gap-3 px-4 py-2.5 border-b border-gray-200 bg-gray-50/80">
                    {COLUMNS.map((col) => (
                        <button
                            key={col.key}
                            onClick={() => handleSort(col.key)}
                            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer select-none"
                        >
                            {col.label}
                            {sortKey === col.key && (
                                sortDir === "desc"
                                    ? <ArrowDown size={10} />
                                    : <ArrowUp size={10} />
                            )}
                        </button>
                    ))}
                </div>

                {/* Rows */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={20} className="animate-spin text-gray-400" />
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                            Nenhum cliente encontrado
                        </div>
                    ) : (
                        filteredClients.map((client) => (
                            <ClientCard key={client.id} client={client} />
                        ))
                    )}
                </div>
            </div>
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent side="right" className="sm:max-w-md w-full p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
                        <SheetTitle className="text-base">Novo Cliente</SheetTitle>
                        <SheetDescription className="text-xs">Preencha os dados para cadastrar um novo cliente.</SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nome completo / Razão social</label>
                            <Input placeholder="Ex: Empresa ABC Ltda" className="h-10 rounded-lg text-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
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
                                <Input placeholder={form.type === "PJ" ? "00.000.000/0001-00" : "000.000.000-00"} className="h-10 rounded-lg text-sm" value={form.type === "PJ" ? form.cnpj : form.cpf} onChange={e => setForm({...form, [form.type === "PJ" ? "cnpj" : "cpf"]: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Telefone</label>
                                <Input placeholder="(00) 00000-0000" className="h-10 rounded-lg text-sm" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
                                <Input placeholder="email@empresa.com" className="h-10 rounded-lg text-sm" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Endereço</label>
                            <Input placeholder="Rua, Avenida..." className="h-10 rounded-lg text-sm" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cidade</label>
                                <Input placeholder="São Paulo" className="h-10 rounded-lg text-sm" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Bairro</label>
                                <Input placeholder="Centro" className="h-10 rounded-lg text-sm" value={form.neighborhood} onChange={e => setForm({...form, neighborhood: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">CEP</label>
                                <Input placeholder="00000-000" className="h-10 rounded-lg text-sm" value={form.zipCode} onChange={e => setForm({...form, zipCode: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nº</label>
                                <Input placeholder="123" className="h-10 rounded-lg text-sm" value={form.houseNumber} onChange={e => setForm({...form, houseNumber: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Complemento</label>
                                <Input placeholder="Sala 1" className="h-10 rounded-lg text-sm" value={form.complement} onChange={e => setForm({...form, complement: e.target.value})} />
                            </div>
                        </div>
                        <div className="flex items-center gap-4 pt-2">
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input type="checkbox" checked={form.hasContract} onChange={e => setForm({...form, hasContract: e.target.checked})} className="rounded" /> Tem contrato
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input type="checkbox" checked={form.supportReleased} onChange={e => setForm({...form, supportReleased: e.target.checked})} className="rounded" /> Suporte liberado
                            </label>
                        </div>
                    </div>
                    <SheetFooter className="px-6 py-4 border-t border-gray-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
                            <Button className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm" onClick={handleSubmit} disabled={createMutation.isPending}>
                                {createMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                                Salvar Cliente
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    )
}