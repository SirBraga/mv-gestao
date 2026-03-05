import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2, Building2 } from "lucide-react"

export interface AccountingData {
  id: string
  name?: string
  clientCount: number
  clientNames: string
  cnpj: string
  cpf: string
  phone: string
  email: string
  city: string
  state: string
  ticketCount: number
  type: "PF" | "PJ"
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
}

interface AccountingCardProps {
  data: AccountingData
  onEdit?: (data: AccountingData) => void
  onDelete?: (data: AccountingData) => void
}

export default function AccountingCard({ data, onEdit, onDelete }: AccountingCardProps) {
  return (
    <div className="group grid grid-cols-[1.5fr_100px_140px_120px_80px_50px] items-center border-b border-slate-100 hover:bg-slate-50/50 transition-all px-6 py-3.5 gap-3">
      {/* Escritório */}
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-9 w-9 shrink-0 ring-2 ring-white shadow-sm">
          <AvatarFallback className="text-[10px] font-bold text-white bg-linear-to-br from-indigo-500 to-purple-600">
            {getInitials(data.name || "Contabilidade")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{data.name || `Contabilidade ${data.id.slice(-6)}`}</p>
          <p className="text-xs text-slate-400 truncate">
            {data.type === "PJ" && data.cnpj && `${data.cnpj}`}
            {data.type === "PF" && data.cpf && `${data.cpf}`}
          </p>
        </div>
      </div>

      {/* Clientes */}
      <div className="text-center">
        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold ${
          data.clientCount > 0 
            ? "bg-indigo-100 text-indigo-700" 
            : "bg-slate-100 text-slate-500"
        }`}>
          {data.clientCount}
        </span>
      </div>

      {/* Telefone */}
      <span className="text-sm text-slate-600 truncate">{data.phone || <span className="text-slate-300">—</span>}</span>

      {/* Cidade */}
      <span className="text-sm text-slate-500 truncate">{data.city && data.state ? `${data.city}/${data.state}` : <span className="text-slate-300">—</span>}</span>

      {/* Tipo */}
      <span className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white ${
        data.type === "PJ" ? "bg-indigo-500" : "bg-slate-400"
      }`}>
        <Building2 size={10} />
        {data.type}
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
            <DropdownMenuItem onClick={() => onEdit?.(data)} className="cursor-pointer">
              <Pencil size={14} className="mr-2" /> Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete?.(data)} className="cursor-pointer text-red-600 focus:text-red-600">
              <Trash2 size={14} className="mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
