"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import TicketCard from "../_components/ticketCard"
import type { TicketData } from "../_components/ticketCard"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import {
    Search,
    Filter,
    Printer,
    FileDown,
    ChevronUp,
    ChevronDown,
    Inbox,
    Clock,
    CheckCircle,
    XCircle,
    User,
    ArrowUp,
    ArrowDown,
    AlertTriangle,
    Plus,
} from "lucide-react"

const SAMPLE_TICKETS: TicketData[] = [
    {
        id: "t001",
        ticketDescription: "Sistema apresentando lentidão ao gerar relatórios mensais",
        clientName: "João Silva",
        priority: "HIGH",
        status: "NOVO",
        assigneeName: "Pedro Braga",
        date: "01/15",
    },
    {
        id: "t002",
        ticketDescription: "Erro ao importar notas fiscais no módulo contábil",
        clientName: "Empresa ABC Ltda",
        priority: "MEDIUM",
        status: "PENDING_CLIENT",
        assigneeName: null,
        date: "01/28",
    },
    {
        id: "t003",
        ticketDescription: "Divergência nos valores de faturamento do mês de janeiro",
        clientName: "Maria Oliveira",
        priority: "HIGH",
        status: "NOVO",
        assigneeName: null,
        date: "01/31",
    },
    {
        id: "t004",
        ticketDescription: "Atualização do módulo de estoque para nova versão",
        clientName: "Tech Solutions ME",
        priority: "MEDIUM",
        status: "IN_PROGRESS",
        assigneeName: "Pedro Braga",
        date: "10/28",
    },
    {
        id: "t005",
        ticketDescription: "Dúvida sobre como cadastrar novo produto no sistema",
        clientName: "Carlos Mendes",
        priority: "LOW",
        status: "CLOSED",
        assigneeName: "Pedro Braga",
        date: "10/06",
    },
    {
        id: "t006",
        ticketDescription: "Solicitação de proposta para módulo de logística",
        clientName: "Distribuidora Norte Ltda",
        priority: "HIGH",
        status: "NOVO",
        assigneeName: null,
        date: "11/07",
    },
    {
        id: "t007",
        ticketDescription: "Problema na emissão de boletos bancários",
        clientName: "Ana Paula Costa",
        priority: "MEDIUM",
        status: "PENDING_EMPRESS",
        assigneeName: "Pedro Braga",
        date: "12/10",
    },
    {
        id: "t008",
        ticketDescription: "Migração de dados do sistema legado para o novo ERP",
        clientName: "Logística Express SA",
        priority: "HIGH",
        status: "IN_PROGRESS",
        assigneeName: null,
        date: "12/04",
    },
    {
        id: "t009",
        ticketDescription: "Treinamento sobre funcionalidades do dashboard",
        clientName: "Roberto Almeida",
        priority: "LOW",
        status: "CLOSED",
        assigneeName: "Pedro Braga",
        date: "02/11",
    },
    {
        id: "t010",
        ticketDescription: "Configuração de integração com gateway de pagamento",
        clientName: "Padaria Central ME",
        priority: "MEDIUM",
        status: "NOVO",
        assigneeName: null,
        date: "03/04",
    },
]

type FilterType = "all" | "open" | "pending_client" | "pending_empress" | "in_progress" | "closed" | "mine"
type SortKey = "id" | "priority" | "ticketDescription" | "status" | "assignee" | "date"
type SortDir = "asc" | "desc"

const FILTERS = [
    { key: "all" as FilterType, label: "Todos", icon: Inbox },
    { key: "open" as FilterType, label: "Novos", icon: AlertTriangle },
    { key: "pending_client" as FilterType, label: "Pend. Cliente", icon: Clock },
    { key: "pending_empress" as FilterType, label: "Pend. Empresa", icon: Clock },
    { key: "in_progress" as FilterType, label: "Em Progresso", icon: CheckCircle },
    { key: "closed" as FilterType, label: "Fechados", icon: XCircle },
]

const CURRENT_USER = "Pedro Braga"

const filterStatusMap: Record<FilterType, TicketData["status"][]> = {
    all: ["NOVO", "PENDING_CLIENT", "PENDING_EMPRESS", "IN_PROGRESS", "CLOSED"],
    open: ["NOVO"],
    pending_client: ["PENDING_CLIENT"],
    pending_empress: ["PENDING_EMPRESS"],
    in_progress: ["IN_PROGRESS"],
    closed: ["CLOSED"],
    mine: ["NOVO", "PENDING_CLIENT", "PENDING_EMPRESS", "IN_PROGRESS", "CLOSED"],
}

const COLUMNS: { key: SortKey; label: string }[] = [
    { key: "id", label: "ID" },
    { key: "priority", label: "Prioridade" },
    { key: "ticketDescription", label: "Ticket" },
    { key: "status", label: "Status" },
    { key: "assignee", label: "Responsável" },
    { key: "date", label: "Data" },
]

const priorityOrder: Record<TicketData["priority"], number> = {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
}

function compareTickets(a: TicketData, b: TicketData, key: SortKey, dir: SortDir): number {
    let cmp = 0
    switch (key) {
        case "id": cmp = a.id.localeCompare(b.id, "pt-BR", { numeric: true }); break
        case "priority": cmp = priorityOrder[a.priority] - priorityOrder[b.priority]; break
        case "ticketDescription": cmp = a.clientName.localeCompare(b.clientName, "pt-BR"); break
        case "status": cmp = a.status.localeCompare(b.status, "pt-BR"); break
        case "assignee": cmp = (a.assigneeName || "").localeCompare(b.assigneeName || "", "pt-BR"); break
        case "date": cmp = a.date.localeCompare(b.date, "pt-BR"); break
    }
    return dir === "asc" ? cmp : -cmp
}

export default function TicketsPage() {
    const router = useRouter()
    const [activeFilter, setActiveFilter] = useState<FilterType>("all")
    const [defaultOpen, setDefaultOpen] = useState(true)
    const [myTicketsOpen, setMyTicketsOpen] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [sortKey, setSortKey] = useState<SortKey>("id")
    const [sortDir, setSortDir] = useState<SortDir>("desc")
    const [claimTicketId, setClaimTicketId] = useState<string | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)

    const handleNavigate = (ticketId: string) => {
        router.push(`/dashboard/tickets/${ticketId}`)
    }

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === "asc" ? "desc" : "asc")
        } else {
            setSortKey(key)
            setSortDir("desc")
        }
    }

    const handleClaimRequest = (ticketId: string) => {
        setClaimTicketId(ticketId)
    }

    const handleClaimConfirm = () => {
        // TODO: call claimTicket server action with real userId
        console.log("Claiming ticket:", claimTicketId)
        setClaimTicketId(null)
    }

    const myTickets = useMemo(() => {
        return SAMPLE_TICKETS.filter((t) => t.assigneeName === CURRENT_USER)
    }, [])

    const filteredTickets = useMemo(() => {
        return SAMPLE_TICKETS
            .filter((ticket) => {
                const matchesFilter = filterStatusMap[activeFilter].includes(ticket.status)
                const matchesMine = activeFilter === "mine" ? ticket.assigneeName === CURRENT_USER : true

                const matchesSearch =
                    !searchQuery ||
                    ticket.ticketDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    ticket.id.includes(searchQuery) ||
                    ticket.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (ticket.assigneeName || "").toLowerCase().includes(searchQuery.toLowerCase())

                return matchesFilter && matchesMine && matchesSearch
            })
            .sort((a, b) => compareTickets(a, b, sortKey, sortDir))
    }, [activeFilter, searchQuery, sortKey, sortDir])

    const counts: Record<FilterType, number> = {
        all: SAMPLE_TICKETS.length,
        open: SAMPLE_TICKETS.filter((t) => t.status === "NOVO").length,
        pending_client: SAMPLE_TICKETS.filter((t) => t.status === "PENDING_CLIENT").length,
        pending_empress: SAMPLE_TICKETS.filter((t) => t.status === "PENDING_EMPRESS").length,
        in_progress: SAMPLE_TICKETS.filter((t) => t.status === "IN_PROGRESS").length,
        closed: SAMPLE_TICKETS.filter((t) => t.status === "CLOSED").length,
        mine: myTickets.length,
    }

    const filterBadgeColors: Record<FilterType, string> = {
        all: "bg-gray-100 text-gray-500",
        open: "bg-blue-100 text-blue-600",
        pending_client: "bg-yellow-100 text-yellow-600",
        pending_empress: "bg-purple-100 text-purple-600",
        in_progress: "bg-orange-100 text-orange-600",
        closed: "bg-red-100 text-red-600",
        mine: "bg-cyan-100 text-cyan-600",
    }

    const claimingTicket = SAMPLE_TICKETS.find((t) => t.id === claimTicketId)

    return (
        <div className="flex h-full">
            {/* Left Filter Panel — like reference sidebar sections */}
            <div className="w-56 min-w-56 bg-white h-full flex flex-col px-3 pt-4 border-r border-gray-200">
                {/* Support section */}
                <div className="mb-4">
                    <button
                        onClick={() => setDefaultOpen(!defaultOpen)}
                        className="flex items-center justify-between w-full px-2 mb-1"
                    >
                        <span className="text-xs font-bold text-gray-900">Suporte</span>
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

                {/* Meus Tickets Section */}
                <div>
                    <button
                        onClick={() => setMyTicketsOpen(!myTicketsOpen)}
                        className="flex items-center justify-between w-full px-2 mb-1"
                    >
                        <span className="text-xs font-bold text-gray-900">Meus Tickets</span>
                        {myTicketsOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                    </button>

                    {myTicketsOpen && (
                        <div className="flex flex-col">
                            {myTickets.length === 0 ? (
                                <div className="flex items-center gap-2 px-2.5 py-1.5 text-gray-400 text-xs">
                                    <User size={13} />
                                    <span>Nenhum ticket atribuído</span>
                                </div>
                            ) : (
                                myTickets.map((ticket) => (
                                    <Link
                                        key={ticket.id}
                                        href={`/dashboard/tickets/${ticket.id}`}
                                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors text-left"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                        <span className="truncate">{ticket.ticketDescription}</span>
                                    </Link>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                {/* Top Bar — like reference: search left, sort right */}
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
                            <Plus size={13} /> Novo Ticket
                        </button>
                    </div>
                </div>

                {/* Column Headers */}
                <div className="grid grid-cols-[70px_80px_1fr_110px_140px_80px] gap-3 px-4 py-2.5 border-b border-gray-200 bg-gray-50/80">
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
                    {filteredTickets.map((ticket) => (
                        <TicketCard key={ticket.id} ticket={ticket} onClaim={handleClaimRequest} onNavigate={handleNavigate} />
                    ))}

                    {filteredTickets.length === 0 && (
                        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                            Nenhum ticket encontrado
                        </div>
                    )}
                </div>
            </div>

            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent side="right" className="sm:max-w-md w-full p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
                        <SheetTitle className="text-base">Novo Ticket</SheetTitle>
                        <SheetDescription className="text-xs">Preencha os dados para abrir um novo ticket de suporte.</SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cliente</label>
                            <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white">
                                <option value="">Selecione o cliente...</option>
                                <option value="9462">João Silva</option>
                                <option value="9374">Empresa ABC Ltda</option>
                                <option value="9359">Maria Oliveira</option>
                                <option value="9261">Tech Solutions ME</option>
                                <option value="9151">Carlos Mendes</option>
                                <option value="8861">Distribuidora Norte Ltda</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Descrição do problema</label>
                            <textarea placeholder="Descreva o problema ou solicitação..." className="w-full h-24 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white resize-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Prioridade</label>
                                <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white">
                                    <option value="LOW">Baixa</option>
                                    <option value="MEDIUM">Média</option>
                                    <option value="HIGH">Alta</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tipo</label>
                                <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white">
                                    <option value="SUPPORT">Suporte</option>
                                    <option value="SALES">Vendas</option>
                                    <option value="FINANCE">Financeiro</option>
                                    <option value="MAINTENCE">Manutenção</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Responsável</label>
                            <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white">
                                <option value="">Não atribuído</option>
                                <option value="pedro">Pedro Braga</option>
                                <option value="ana">Ana Costa</option>
                                <option value="carlos">Carlos Silva</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Observações internas</label>
                            <textarea placeholder="Notas internas sobre o ticket..." className="w-full h-16 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white resize-none" />
                        </div>
                    </div>
                    <SheetFooter className="px-6 py-4 border-t border-gray-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
                            <Button className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm" onClick={() => { console.log("Creating ticket"); setDrawerOpen(false) }}>Criar Ticket</Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Claim Confirmation Modal */}
            <Dialog open={!!claimTicketId} onOpenChange={(open) => !open && setClaimTicketId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assumir Ticket</DialogTitle>
                        <DialogDescription>
                            Deseja assumir a responsabilidade pelo ticket{" "}
                            <strong>{claimingTicket?.ticketDescription}</strong> do cliente{" "}
                            <strong>{claimingTicket?.clientName}</strong>?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setClaimTicketId(null)}>Cancelar</Button>
                        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={handleClaimConfirm}>Confirmar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
