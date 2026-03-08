import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { UserPlus, AlertCircle } from "lucide-react"

export interface TicketData {
  id: number
  ticketNumber: number
  ticketDescription: string
  clientName: string
  clientId: string
  products?: { id: string; name: string }[]
  knowledgeArticle?: { id: string; title: string } | null
  priority: "LOW" | "MEDIUM" | "HIGH"
  status: "NOVO" | "PENDING_CLIENT" | "PENDING_EMPRESS" | "IN_PROGRESS" | "CLOSED" | "CANCELLED"
  assigneeName: string | null
  assigneeId: string | null
  requesterName: string | null
  isAssignedToCurrentUser?: boolean
  date: string
  createdAt: string
}

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = { 
  LOW: { color: "text-emerald-600", bg: "bg-emerald-50", label: "Baixa" },
  MEDIUM: { color: "text-amber-600", bg: "bg-amber-50", label: "Média" },
  HIGH: { color: "text-red-600", bg: "bg-red-50", label: "Alta" }
}
const statusConfig: Record<string, { bg: string; text: string; dot: string }> = { 
  NOVO: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  PENDING_CLIENT: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  PENDING_EMPRESS: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  IN_PROGRESS: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  CLOSED: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  CANCELLED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" }
}
const statusLabel: Record<string, string> = { NOVO: "Novo", PENDING_CLIENT: "P. Cliente", PENDING_EMPRESS: "P. Empresa", IN_PROGRESS: "Em Progresso", CLOSED: "Fechado", CANCELLED: "Cancelado" }

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
}

interface TicketCardProps {
  ticket: TicketData
  onClaim?: (ticketId: number) => void
  onNavigate?: (ticketId: number) => void
}

export default function TicketCard({ ticket, onClaim, onNavigate }: TicketCardProps) {
  const priority = priorityConfig[ticket.priority] || priorityConfig.LOW
  const status = statusConfig[ticket.status] || statusConfig.NOVO

  return (
    <div
      onClick={() => onNavigate?.(ticket.id)}
      className="group grid grid-cols-[70px_120px_2fr_110px_160px_100px] items-center border-b border-slate-100 hover:bg-slate-50/50 transition-all px-6 py-3.5 gap-3 cursor-pointer"
    >
      {/* ID */}
      <span className="text-sm text-slate-600 font-mono font-semibold">#{ticket.id}</span>

      {/* Prioridade */}
      <div className="flex items-center justify-start">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${priority.bg} ${priority.color}`}>
          <AlertCircle size={12} />
          {priority.label}
        </span>
      </div>

      {/* Cliente + Título */}
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-white shadow-sm">
          <AvatarFallback className="text-xs font-semibold text-white bg-linear-to-br from-indigo-500 to-purple-600">
            {getInitials(ticket.clientName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{ticket.ticketDescription}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{ticket.clientName}</p>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-start">
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${status.bg} ${status.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {statusLabel[ticket.status]}
        </span>
      </div>

      {/* Responsável */}
      <div className="flex items-center justify-start min-w-0">
        {ticket.assigneeName ? (
          <span className="text-sm text-slate-700 truncate font-medium">{ticket.assigneeName}</span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onClaim?.(ticket.id) }}
            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors cursor-pointer bg-indigo-50 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100"
          >
            <UserPlus size={14} />
            <span>Assumir</span>
          </button>
        )}
      </div>

      {/* Data */}
      <div className="flex items-center justify-end">
        <span className="text-xs text-slate-500 font-medium">{ticket.date}</span>
      </div>
    </div>
  )
}
