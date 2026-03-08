"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getTickets, claimTicket } from "@/app/actions/tickets"
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
import TicketCreateDrawer from "@/app/dashboard/_components/ticket-create-drawer"
import {
    Search,
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

type FilterType = "all" | "open" | "pending_client" | "pending_empress" | "in_progress" | "closed"
type SortKey = "id" | "priority" | "ticketDescription" | "status" | "assignee" | "date"
type SortDir = "asc" | "desc"

const FILTERS = [
    { key: "all" as FilterType, label: "Todos", icon: Inbox },
    { key: "mine" as const, label: "Meus Tickets", icon: User },
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
        case "id": cmp = a.id - b.id; break
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
    const [activeProductId, setActiveProductId] = useState<string>("")
    const [defaultOpen, setDefaultOpen] = useState(true)
    const [productsOpen, setProductsOpen] = useState(true)
    const [mineOnly, setMineOnly] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [sortKey, setSortKey] = useState<SortKey>("date")
    const [sortDir, setSortDir] = useState<SortDir>("desc")
    const [claimTicketId, setClaimTicketId] = useState<number | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(15)

    const { data: tickets = [], isLoading } = useQuery({
        queryKey: ["tickets"],
        queryFn: () => getTickets(),
        staleTime: 1000 * 30,
        refetchOnWindowFocus: false,
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

    const handleNavigate = (ticketId: number) => {
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

    const handleClaimRequest = (ticketId: number) => {
        setClaimTicketId(ticketId)
    }

    const handleClaimConfirm = () => {
        if (claimTicketId) claimMutation.mutate(claimTicketId)
    }

    const allTickets = tickets as TicketData[]

    const myTickets = useMemo(() => {
        return allTickets.filter((t) => t.isAssignedToCurrentUser)
    }, [allTickets])

    const ticketsForProductCounts = useMemo(() => {
        return allTickets.filter((ticket) => {
            const matchesStatus = filterStatusMap[activeFilter].includes(ticket.status)
            const matchesMine = !mineOnly || !!ticket.isAssignedToCurrentUser
            return matchesStatus && matchesMine
        })
    }, [allTickets, activeFilter, mineOnly])

    const ticketsWithoutProductCount = useMemo(() => {
        return ticketsForProductCounts.filter((ticket) => ticket.status !== "CLOSED" && (!ticket.products || ticket.products.length === 0)).length
    }, [ticketsForProductCounts])

    const totalProductsFilterCount = useMemo(() => {
        return ticketsForProductCounts.filter((ticket) => ticket.status !== "CLOSED").length
    }, [ticketsForProductCounts])

    const openTicketProducts = useMemo(() => {
        const productMap = new Map<string, { id: string; name: string; count: number }>()

        ticketsForProductCounts
            .filter((ticket) => ticket.status !== "CLOSED")
            .forEach((ticket) => {
                ticket.products?.forEach((product) => {
                    const existing = productMap.get(product.id)
                    if (existing) {
                        existing.count += 1
                    } else {
                        productMap.set(product.id, { ...product, count: 1 })
                    }
                })
            })

        return Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    }, [ticketsForProductCounts])

    const filteredTickets = useMemo(() => {
        return allTickets
            .filter((ticket) => {
                const matchesFilter = filterStatusMap[activeFilter].includes(ticket.status)
                const matchesProduct = !activeProductId
                    || (activeProductId === "__NO_PRODUCT__"
                        ? !ticket.products || ticket.products.length === 0
                        : (ticket.products || []).some((product) => product.id === activeProductId))
                const matchesMine = !mineOnly || !!ticket.isAssignedToCurrentUser

                const matchesSearch =
                    !searchQuery ||
                    ticket.ticketDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    String(ticket.id).includes(searchQuery) ||
                    String(ticket.ticketNumber).includes(searchQuery) ||
                    ticket.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (ticket.assigneeName || "").toLowerCase().includes(searchQuery.toLowerCase())

                return matchesFilter && matchesProduct && matchesMine && matchesSearch
            })
            .sort((a, b) => compareTickets(a, b, sortKey, sortDir))
    }, [allTickets, activeFilter, activeProductId, mineOnly, searchQuery, sortKey, sortDir])

    useEffect(() => {
        setCurrentPage(1)
    }, [activeFilter, activeProductId, mineOnly, searchQuery, sortKey, sortDir, pageSize])

    const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize))
    const paginatedTickets = useMemo(() => {
        const start = (currentPage - 1) * pageSize
        return filteredTickets.slice(start, start + pageSize)
    }, [filteredTickets, currentPage, pageSize])
    const pageStart = filteredTickets.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
    const pageEnd = Math.min(currentPage * pageSize, filteredTickets.length)

    const counts: Record<FilterType, number> = {
        all: allTickets.filter((t) => t.status !== "CLOSED").length,
        open: allTickets.filter((t) => t.status === "NOVO").length,
        pending_client: allTickets.filter((t) => t.status === "PENDING_CLIENT").length,
        pending_empress: allTickets.filter((t) => t.status === "PENDING_EMPRESS").length,
        in_progress: allTickets.filter((t) => t.status === "IN_PROGRESS").length,
        closed: allTickets.filter((t) => t.status === "CLOSED").length,
    }

    const filterBadgeColors: Record<FilterType, string> = {
        all: "bg-gray-100 text-gray-500",
        open: "bg-blue-100 text-blue-600",
        pending_client: "bg-yellow-100 text-yellow-600",
        pending_empress: "bg-purple-100 text-purple-600",
        in_progress: "bg-orange-100 text-orange-600",
        closed: "bg-red-100 text-red-600",
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
                                const isMineFilter = filter.key === "mine"
                                const isActive = isMineFilter ? mineOnly : activeFilter === filter.key && !mineOnly
                                const badgeCount = isMineFilter ? myTickets.length : counts[filter.key as FilterType]
                                return (
                                    <button
                                        key={filter.key}
                                        onClick={() => {
                                            if (isMineFilter) {
                                                setMineOnly((current) => {
                                                    const next = !current
                                                    if (next) {
                                                        setActiveFilter("all")
                                                    }
                                                    return next
                                                })
                                                return
                                            }
                                            setMineOnly(false)
                                            setActiveFilter(filter.key as FilterType)
                                        }}
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
                                        }`}>{badgeCount}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="mb-6">
                    <button
                        onClick={() => setProductsOpen(!productsOpen)}
                        className="flex items-center justify-between w-full px-2 mb-2"
                    >
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Produtos</span>
                        {productsOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </button>

                    {productsOpen && (
                        <div className="flex flex-col gap-0.5">
                            <button
                                onClick={() => setActiveProductId("")}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${!activeProductId ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                            >
                                <span>Todos</span>
                                <span className={`text-xs min-w-6 text-center rounded-full px-2 py-0.5 font-semibold ${!activeProductId ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{totalProductsFilterCount}</span>
                            </button>
                            {openTicketProducts.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => setActiveProductId((current) => current === product.id ? "" : product.id)}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${activeProductId === product.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                                >
                                    <span className="truncate pr-2">{product.name}</span>
                                    <span className={`text-xs min-w-6 text-center rounded-full px-2 py-0.5 font-semibold ${activeProductId === product.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{product.count}</span>
                                </button>
                            ))}
                            <button
                                onClick={() => setActiveProductId((current) => current === "__NO_PRODUCT__" ? "" : "__NO_PRODUCT__")}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${activeProductId === "__NO_PRODUCT__" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                            >
                                <span>Sem produtos</span>
                                <span className={`text-xs min-w-6 text-center rounded-full px-2 py-0.5 font-semibold ${activeProductId === "__NO_PRODUCT__" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{ticketsWithoutProductCount}</span>
                            </button>
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
                        <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm shadow-indigo-600/25">
                            <Plus size={16} /> Novo Ticket
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
                    <p className="text-sm text-slate-500">
                        Mostrando <span className="font-medium text-slate-900">{pageStart}-{pageEnd}</span> de <span className="font-medium text-slate-900">{filteredTickets.length}</span>
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
                        paginatedTickets.map((ticket) => (
                            <TicketCard key={ticket.id} ticket={ticket} onClaim={handleClaimRequest} onNavigate={handleNavigate} />
                        ))
                    )}
                </div>

                {!isLoading && filteredTickets.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white">
                        <p className="text-sm text-slate-500">Página <span className="font-medium text-slate-900">{currentPage}</span> de <span className="font-medium text-slate-900">{totalPages}</span></p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" className="h-9 rounded-lg text-sm" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>Anterior</Button>
                            <Button variant="outline" className="h-9 rounded-lg text-sm" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>Próxima</Button>
                        </div>
                    </div>
                )}
            </div>

            <TicketCreateDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />

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
