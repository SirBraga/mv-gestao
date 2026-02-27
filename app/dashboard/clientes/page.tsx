"use client"

import { useState, useMemo } from "react"
import ClientCard from "../_components/clientCard"
import type { ClientData } from "../_components/clientCard"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
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
} from "lucide-react"

const SAMPLE_CLIENTS: ClientData[] = [
    {
        id: "9462",
        name: "João Silva",
        document: "123.456.789-00",
        phone: "(11) 98765-4321",
        contract: "Mensal",
        supportReleased: true,
        type: "PF",
        date: "01/15",
    },
    {
        id: "9374",
        name: "Empresa ABC Ltda",
        document: "12.345.678/0001-99",
        phone: "(11) 3344-5566",
        contract: "Anual",
        supportReleased: true,
        type: "PJ",
        date: "01/28",
    },
    {
        id: "9359",
        name: "Maria Oliveira",
        document: "987.654.321-11",
        phone: "(21) 99887-7665",
        contract: "Avulso",
        supportReleased: false,
        type: "PF",
        date: "01/31",
    },
    {
        id: "9261",
        name: "Tech Solutions ME",
        document: "45.678.901/0001-23",
        phone: "(31) 3456-7890",
        contract: "Anual",
        supportReleased: true,
        type: "PJ",
        date: "10/28",
    },
    {
        id: "9151",
        name: "Carlos Mendes",
        document: "456.789.012-33",
        phone: "(41) 99876-5432",
        contract: "Mensal",
        supportReleased: true,
        type: "PF",
        date: "10/06",
    },
    {
        id: "8861",
        name: "Distribuidora Norte Ltda",
        document: "67.890.123/0001-45",
        phone: "(51) 3210-9876",
        contract: "Anual",
        supportReleased: true,
        type: "PJ",
        date: "11/07",
    },
    {
        id: "8829",
        name: "Ana Paula Costa",
        document: "789.012.345-66",
        phone: "(61) 98765-1234",
        contract: "Mensal",
        supportReleased: true,
        type: "PF",
        date: "12/10",
    },
    {
        id: "8811",
        name: "Logística Express SA",
        document: "89.012.345/0001-67",
        phone: "(71) 3456-0987",
        contract: "Anual",
        supportReleased: false,
        type: "PJ",
        date: "12/04",
    },
    {
        id: "8013",
        name: "Roberto Almeida",
        document: "012.345.678-99",
        phone: "(81) 99654-3210",
        contract: "Avulso",
        supportReleased: false,
        type: "PF",
        date: "02/11",
    },
    {
        id: "7791",
        name: "Padaria Central ME",
        document: "23.456.789/0001-01",
        phone: "(91) 3321-6540",
        contract: "Mensal",
        supportReleased: false,
        type: "PJ",
        date: "03/04",
    },
]

type FilterType = "all" | "active" | "blocked"
type SortKey = "id" | "name" | "phone" | "status" | "contract" | "date" | "type"
type SortDir = "asc" | "desc"

const FILTERS = [
    { key: "all" as FilterType, label: "Todos", icon: Users },
    { key: "active" as FilterType, label: "Liberados", icon: UserCheck },
    { key: "blocked" as FilterType, label: "Bloqueados", icon: UserX },
]

const COLUMNS: { key: SortKey; label: string }[] = [
    { key: "name", label: "Cliente" },
    { key: "phone", label: "Telefone" },
    { key: "status", label: "Status" },
    { key: "contract", label: "Contrato" },
    { key: "date", label: "Data" },
    { key: "type", label: "Tipo" },
]

function compareClients(a: ClientData, b: ClientData, key: SortKey, dir: SortDir): number {
    let valA: string | boolean = ""
    let valB: string | boolean = ""
    switch (key) {
        case "id": valA = a.id; valB = b.id; break
        case "name": valA = a.name; valB = b.name; break
        case "phone": valA = a.phone; valB = b.phone; break
        case "status": valA = a.supportReleased; valB = b.supportReleased; break
        case "contract": valA = a.contract; valB = b.contract; break
        case "date": valA = a.date; valB = b.date; break
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
    const [activeFilter, setActiveFilter] = useState<FilterType>("all")
    const [defaultOpen, setDefaultOpen] = useState(true)
    const [favoritesOpen, setFavoritesOpen] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [sortKey, setSortKey] = useState<SortKey>("id")
    const [sortDir, setSortDir] = useState<SortDir>("desc")
    const [drawerOpen, setDrawerOpen] = useState(false)

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === "asc" ? "desc" : "asc")
        } else {
            setSortKey(key)
            setSortDir("desc")
        }
    }

    const filteredClients = useMemo(() => {
        return SAMPLE_CLIENTS
            .filter((client) => {
                const matchesFilter =
                    activeFilter === "all" ||
                    (activeFilter === "active" && client.supportReleased) ||
                    (activeFilter === "blocked" && !client.supportReleased)

                const matchesSearch =
                    !searchQuery ||
                    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    client.id.includes(searchQuery)

                return matchesFilter && matchesSearch
            })
            .sort((a, b) => compareClients(a, b, sortKey, sortDir))
    }, [activeFilter, searchQuery, sortKey, sortDir])

    const counts = {
        all: SAMPLE_CLIENTS.length,
        active: SAMPLE_CLIENTS.filter((c) => c.supportReleased).length,
        blocked: SAMPLE_CLIENTS.filter((c) => !c.supportReleased).length,
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
                <div className="grid grid-cols-[1.5fr_1fr_120px_110px_70px_50px] gap-3 px-4 py-2.5 border-b border-gray-200 bg-gray-50/80">
                    {COLUMNS.map((col) => (
                        <button
                            key={col.key}
                            onClick={() => handleSort(col.key)}
                            className={`flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer select-none ${col.key === "date" ? "justify-end" : ""}`}
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
                    {filteredClients.map((client) => (
                        <ClientCard key={client.id} client={client} />
                    ))}

                    {filteredClients.length === 0 && (
                        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                            Nenhum cliente encontrado
                        </div>
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
                            <Input placeholder="Ex: Empresa ABC Ltda" className="h-10 rounded-lg text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tipo</label>
                                <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white">
                                    <option value="PJ">Pessoa Jurídica</option>
                                    <option value="PF">Pessoa Física</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">CPF / CNPJ</label>
                                <Input placeholder="00.000.000/0001-00" className="h-10 rounded-lg text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Telefone</label>
                                <Input placeholder="(00) 00000-0000" className="h-10 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
                                <Input placeholder="email@empresa.com" className="h-10 rounded-lg text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Contrato</label>
                            <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white">
                                <option value="Mensal">Mensal</option>
                                <option value="Anual">Anual</option>
                                <option value="Avulso">Avulso</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Endereço</label>
                            <Input placeholder="Rua, número, bairro" className="h-10 rounded-lg text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cidade</label>
                                <Input placeholder="São Paulo" className="h-10 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Estado</label>
                                <Input placeholder="SP" className="h-10 rounded-lg text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Observações</label>
                            <textarea placeholder="Informações adicionais..." className="w-full h-20 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white resize-none" />
                        </div>
                    </div>
                    <SheetFooter className="px-6 py-4 border-t border-gray-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
                            <Button className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm" onClick={() => { console.log("Creating client"); setDrawerOpen(false) }}>Salvar Cliente</Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    )
}