import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export interface AccountingData {
  id: string
  name: string
  cnpj: string
  phone: string
  email: string
  city: string
  state: string
  clients: number
  type: "PF" | "PJ"
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
}

export default function AccountingCard({ data }: { data: AccountingData }) {
  return (
    <Link href={`/dashboard/contabilidade/${data.id}`} className="grid grid-cols-[1.2fr_140px_100px_120px_100px_50px] items-center border-b border-gray-100 hover:bg-gray-50 transition-colors px-4 py-3 gap-3 cursor-pointer">
      {/* Escritório */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className={`text-[10px] font-bold text-white bg-blue-600`}>
            {getInitials(data.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{data.name}</p>
          <p className="text-xs text-gray-400 truncate">{data.cnpj}</p>
        </div>
      </div>

      {/* Telefone */}
      <span className="text-sm text-gray-500 truncate">{data.phone}</span>

      {/* Clientes */}
      <span className="text-sm text-gray-600">{data.clients > 0 ? `${data.clients} clientes` : <span className="text-gray-300">Nenhum</span>}</span>

      {/* Cidade */}
      <span className="text-xs text-gray-500 truncate">{data.city}/{data.state}</span>

      {/* Email */}
      <span className="text-xs text-gray-400 truncate">{data.email}</span>

      {/* Tipo */}
      <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white ${
        data.type === "PJ" ? "bg-blue-600" : "bg-gray-400"
      }`}>{data.type}</span>
    </Link>
  )
}
