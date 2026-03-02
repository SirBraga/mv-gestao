import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { UserPlus } from "lucide-react"

export interface TicketData {
  id: string
  ticketNumber: number
  ticketDescription: string
  clientName: string
  clientId: string
  priority: "LOW" | "MEDIUM" | "HIGH"
  status: "NOVO" | "PENDING_CLIENT" | "PENDING_EMPRESS" | "IN_PROGRESS" | "CLOSED"
  assigneeName: string | null
  assigneeId: string | null
  requesterName: string | null
  date: string
  createdAt: string
}

const priorityTag: Record<TicketData["priority"], string> = {
  LOW: "bg-emerald-500",
  MEDIUM: "bg-amber-500",
  HIGH: "bg-red-500",
}

const priorityLabels: Record<TicketData["priority"], string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
}

const statusTag: Record<TicketData["status"], string> = {
  NOVO: "bg-sky-500",
  PENDING_CLIENT: "bg-amber-500",
  PENDING_EMPRESS: "bg-violet-500",
  IN_PROGRESS: "bg-orange-500",
  CLOSED: "bg-gray-400",
}

const statusLabels: Record<TicketData["status"], string> = {
  NOVO: "Novo",
  PENDING_CLIENT: "Pend. Cliente",
  PENDING_EMPRESS: "Pend. Empresa",
  IN_PROGRESS: "Em Progresso",
  CLOSED: "Fechado",
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
}

interface TicketCardProps {
  ticket: TicketData
  onClaim?: (ticketId: string) => void
  onNavigate?: (ticketId: string) => void
}

export default function TicketCard({ ticket, onClaim, onNavigate }: TicketCardProps) {
  return (
    <div
      onClick={() => onNavigate?.(ticket.id)}
      className="grid grid-cols-[70px_80px_1fr_110px_120px_120px_110px] items-center border-b border-gray-100 hover:bg-gray-50 transition-colors px-4 py-3 gap-3 cursor-pointer"
    >
      {/* ID */}
      <span className="text-xs text-gray-500 font-mono font-semibold">#{ticket.ticketNumber}</span>

      {/* Prioridade */}
      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white w-fit ${priorityTag[ticket.priority]}`}>
        {priorityLabels[ticket.priority]}
      </span>

      {/* Cliente + Título */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className={`text-[10px] font-bold text-white bg-blue-600`}>
            {getInitials(ticket.clientName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{ticket.ticketDescription}</p>
          <p className="text-xs text-gray-400 truncate">{ticket.clientName}</p>
        </div>
      </div>

      {/* Status */}
      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white w-fit ${statusTag[ticket.status]}`}>
        {statusLabels[ticket.status]}
      </span>

      {/* Responsável */}
      <div className="min-w-0">
        {ticket.assigneeName ? (
          <span className="text-sm text-gray-600 truncate block">{ticket.assigneeName}</span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onClaim?.(ticket.id) }}
            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors cursor-pointer"
          >
            <UserPlus size={12} />
            <span>Assumir</span>
          </button>
        )}
      </div>

      {/* Solicitante */}
      <div className="min-w-0">
        {ticket.requesterName ? (
          <span className="text-xs text-gray-500 truncate block">{ticket.requesterName}</span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </div>

      {/* Data */}
      <span className="text-xs text-gray-400 text-right">{ticket.date}</span>
    </div>
  )
}
