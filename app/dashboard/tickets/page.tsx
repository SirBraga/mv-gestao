"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getTickets, createTicket, claimTicket, getAllUsers } from "@/app/actions/tickets"
import { getClients, getClientContacts } from "@/app/actions/clients"
import { uploadFile } from "@/app/utils/upload"
import { addTicketAttachment } from "@/app/actions/tickets"
import TicketCard from "../_components/ticketCard"
import type { TicketData } from "../_components/ticketCard"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "react-toastify"
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
    Loader2,
    Paperclip,
    X,
    Ticket,
} from "lucide-react"

const INITIAL_FORM = {
    clientId: "",
    requestedByContactId: "",
    ticketDescription: "",
    ticketPriority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
    ticketType: "SUPPORT" as "SUPPORT" | "SALES" | "FINANCE" | "MAINTENCE",
    assignedToId: "",
}

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


const filterStatusMap: Record<FilterType, TicketData["status"][]> = {
    all: ["NOVO", "PENDING_CLIENT", "PENDING_EMPRESS", "IN_PROGRESS"],
    open: ["NOVO"],
    pending_client: ["PENDING_CLIENT"],
    pending_empress: ["PENDING_EMPRESS"],
    in_progress: ["IN_PROGRESS"],
    closed: ["CLOSED"],
    mine: ["NOVO", "PENDING_CLIENT", "PENDING_EMPRESS", "IN_PROGRESS"],
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
        case "id": cmp = a.ticketNumber - b.ticketNumber; break
        case "priority": cmp = priorityOrder[a.priority] - priorityOrder[b.priority]; break
        case "ticketDescription": cmp = a.clientName.localeCompare(b.clientName, "pt-BR"); break
        case "status": cmp = a.status.localeCompare(b.status, "pt-BR"); break
        case "assignee": cmp = (a.assigneeName || "").localeCompare(b.assigneeName || "", "pt-BR"); break
        case "date": cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break
    }
    return dir === "asc" ? cmp : -cmp
}

export default function TicketsPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [activeFilter, setActiveFilter] = useState<FilterType>("all")
    const [defaultOpen, setDefaultOpen] = useState(true)
    const [myTicketsOpen, setMyTicketsOpen] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [sortKey, setSortKey] = useState<SortKey>("date")
    const [sortDir, setSortDir] = useState<SortDir>("desc")
    const [claimTicketId, setClaimTicketId] = useState<string | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [form, setForm] = useState(INITIAL_FORM)
    const [attachFiles, setAttachFiles] = useState<File[]>([])
    const [submitting, setSubmitting] = useState(false)

    const { data: tickets = [], isLoading } = useQuery({
        queryKey: ["tickets"],
        queryFn: () => getTickets(),
        staleTime: 1000 * 30,
        refetchOnWindowFocus: false,
    })

    const { data: clientsList = [] } = useQuery({
        queryKey: ["clients-simple"],
        queryFn: () => getClients(),
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    })

    const { data: clientContacts = [] } = useQuery({
        queryKey: ["client-contacts", form.clientId],
        queryFn: () => getClientContacts(form.clientId),
        enabled: !!form.clientId,
    })

    const { data: usersList = [] } = useQuery({
        queryKey: ["all-users"],
        queryFn: () => getAllUsers(),
    })

    const createMutation = useMutation({
        mutationFn: createTicket,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tickets"] })
            setDrawerOpen(false)
            setForm(INITIAL_FORM)
            toast.success("Ticket criado com sucesso!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const claimMutation = useMutation({
        mutationFn: claimTicket,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tickets"] })
            setClaimTicketId(null)
            toast.success("Ticket assumido!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

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
        if (claimTicketId) claimMutation.mutate(claimTicketId)
    }

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
            })
            if (attachFiles.length > 0 && result.id) {
                for (const file of attachFiles) {
                    const uploaded = await uploadFile(file, "tickets")
                    await addTicketAttachment(result.id, {
                        url: uploaded.url,
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size,
                    })
                }
            }
            setAttachFiles([])
        } catch {
            // handled by mutation onError
        } finally {
            setSubmitting(false)
        }
    }

    const allTickets = tickets as TicketData[]

    const myTickets = useMemo(() => {
        return allTickets.filter((t) => t.assigneeId != null)
    }, [allTickets])

    const filteredTickets = useMemo(() => {
        return allTickets
            .filter((ticket) => {
                const matchesFilter = filterStatusMap[activeFilter].includes(ticket.status)

                const matchesSearch =
                    !searchQuery ||
                    ticket.ticketDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    String(ticket.ticketNumber).includes(searchQuery) ||
                    ticket.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (ticket.assigneeName || "").toLowerCase().includes(searchQuery.toLowerCase())

                return matchesFilter && matchesSearch
            })
            .sort((a, b) => compareTickets(a, b, sortKey, sortDir))
    }, [allTickets, activeFilter, searchQuery, sortKey, sortDir])

    const counts: Record<FilterType, number> = {
        all: allTickets.filter((t) => t.status !== "CLOSED").length,
        open: allTickets.filter((t) => t.status === "NOVO").length,
        pending_client: allTickets.filter((t) => t.status === "PENDING_CLIENT").length,
        pending_empress: allTickets.filter((t) => t.status === "PENDING_EMPRESS").length,
        in_progress: allTickets.filter((t) => t.status === "IN_PROGRESS").length,
        closed: allTickets.filter((t) => t.status === "CLOSED").length,
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

    const claimingTicket = allTickets.find((t) => t.id === claimTicketId)

    return (
        <div className="flex h-full bg-slate-50">
            {/* Left Filter Panel */}
            <div className="w-60 min-w-60 bg-white h-full flex flex-col px-4 pt-6 border-r border-slate-200">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-lg font-bold text-slate-900">Tickets</h1>
                    <p className="text-xs text-slate-500 mt-0.5">{counts.all} no total</p>
                </div>

                {/* Support section */}
                <div className="mb-6">
                    <button
                        onClick={() => setDefaultOpen(!defaultOpen)}
                        className="flex items-center justify-between w-full px-2 mb-2"
                    >
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
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

                {/* My Tickets Section */}
                <div>
                    <button
                        onClick={() => setMyTicketsOpen(!myTicketsOpen)}
                        className="flex items-center justify-between w-full px-2 mb-2"
                    >
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meus Tickets</span>
                        {myTicketsOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
                    </button>

                    {myTicketsOpen && (
                        <div className="space-y-1">
                            {myTickets.length === 0 ? (
                                <div className="flex items-center gap-2.5 px-3 py-3 text-slate-400 text-sm bg-slate-50 rounded-xl">
                                    <Ticket size={16} />
                                    <span>Nenhum ticket atribuído</span>
                                </div>
                            ) : (
                                myTickets.slice(0, 5).map((ticket) => (
                                    <Link
                                        key={ticket.id}
                                        href={`/dashboard/tickets/${ticket.id}`}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        <span className="text-xs text-slate-400 font-mono">#{ticket.ticketNumber}</span>
                                        <span className="truncate flex-1">{ticket.ticketDescription}</span>
                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                                            ticket.priority === "HIGH" ? "bg-red-50 text-red-600" :
                                            ticket.priority === "MEDIUM" ? "bg-amber-50 text-amber-600" :
                                            "bg-emerald-50 text-emerald-600"
                                        }`}>
                                            {ticket.priority === "HIGH" ? "Alta" : ticket.priority === "MEDIUM" ? "Média" : "Baixa"}
                                        </span>
                                    </Link>
                                ))
                            )}
                            {myTickets.length > 5 && (
                                <div className="px-3 py-1 text-xs text-slate-400 text-center">
                                    +{myTickets.length - 5} mais...
                                </div>
                            )}
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
                                placeholder="Buscar tickets..."
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
                            <Plus size={16} /> Novo Ticket
                        </button>
                    </div>
                </div>

                {/* Column Headers */}
                <div className="grid grid-cols-[70px_120px_2fr_110px_160px_100px] gap-3 px-6 py-3 border-b border-slate-200 bg-slate-50">
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
                </div>

                {/* Rows */}
                <div className="flex-1 overflow-y-auto bg-white">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 size={28} className="animate-spin text-indigo-600" />
                            <p className="text-sm text-slate-500 mt-3">Carregando tickets...</p>
                        </div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Ticket size={40} className="text-slate-300 mb-3" />
                            <p className="text-sm font-medium text-slate-600">Nenhum ticket encontrado</p>
                            <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou busca</p>
                        </div>
                    ) : (
                        filteredTickets.map((ticket) => (
                            <TicketCard key={ticket.id} ticket={ticket} onClaim={handleClaimRequest} onNavigate={handleNavigate} />
                        ))
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
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cliente <span className="text-red-400">*</span></label>
                            <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value, requestedByContactId: ""})}>
                                <option value="">Selecione o cliente...</option>
                                {clientsList.map((c: { id: string; name: string }) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Solicitante <span className="text-red-400">*</span></label>
                            <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white disabled:bg-gray-50 disabled:text-gray-400" value={form.requestedByContactId} onChange={e => setForm({...form, requestedByContactId: e.target.value})} disabled={!form.clientId}>
                                <option value="">{form.clientId ? (clientContacts.length === 0 ? "Nenhum contato cadastrado" : "Selecione o solicitante...") : "Selecione um cliente primeiro"}</option>
                                {clientContacts.map((ct: { id: string; name: string; role: string | null }) => (
                                    <option key={ct.id} value={ct.id}>{ct.name}{ct.role ? ` (${ct.role})` : ""}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Descrição do problema <span className="text-red-400">*</span></label>
                            <textarea placeholder="Descreva o problema ou solicitação..." className="w-full h-24 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white resize-none" value={form.ticketDescription} onChange={e => setForm({...form, ticketDescription: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Prioridade</label>
                                <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.ticketPriority} onChange={e => setForm({...form, ticketPriority: e.target.value as "LOW"|"MEDIUM"|"HIGH"})}>
                                    <option value="LOW">Baixa</option>
                                    <option value="MEDIUM">Média</option>
                                    <option value="HIGH">Alta</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tipo</label>
                                <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.ticketType} onChange={e => setForm({...form, ticketType: e.target.value as "SUPPORT"|"SALES"|"FINANCE"|"MAINTENCE"})}>
                                    <option value="SUPPORT">Suporte</option>
                                    <option value="SALES">Vendas</option>
                                    <option value="FINANCE">Financeiro</option>
                                    <option value="MAINTENCE">Manutenção</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Responsável <span className="text-gray-300">(opcional)</span></label>
                            <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.assignedToId} onChange={e => setForm({...form, assignedToId: e.target.value})}>
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
                                <input type="file" multiple className="hidden" onChange={e => { if (e.target.files) setAttachFiles(prev => [...prev, ...Array.from(e.target.files!)]) }} />
                            </label>
                            {attachFiles.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {attachFiles.map((f, i) => (
                                        <div key={i} className="flex items-center justify-between px-2 py-1 rounded bg-gray-50 text-xs text-gray-600">
                                            <span className="truncate flex-1">{f.name}</span>
                                            <button onClick={() => setAttachFiles(prev => prev.filter((_, idx) => idx !== i))} className="ml-2 text-gray-400 hover:text-red-500 cursor-pointer"><X size={12} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <SheetFooter className="px-6 py-4 border-t border-gray-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
                            <Button className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm" onClick={handleSubmit} disabled={createMutation.isPending || submitting}>
                                {(createMutation.isPending || submitting) ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                                Criar Ticket
                            </Button>
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
                        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={handleClaimConfirm} disabled={claimMutation.isPending}>
                            {claimMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
