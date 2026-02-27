import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export interface ClientData {
  id: string
  name: string
  document: string
  phone: string
  contract: string
  supportReleased: boolean
  type: "PF" | "PJ"
  date: string
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
}

export default function ClientCard({ client }: { client: ClientData }) {
  return (
    <Link href={`/dashboard/clientes/${client.id}`} className="grid grid-cols-[1.5fr_1fr_120px_110px_70px_50px] items-center border-b border-gray-100 hover:bg-gray-50 transition-colors px-4 py-3 gap-3">
      {/* Contact */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className={`text-[10px] font-bold text-white bg-blue-600`}>
            {getInitials(client.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
          <p className="text-xs text-gray-400 truncate">{client.document}</p>
        </div>
      </div>

      {/* Phone */}
      <span className="text-sm text-gray-500 truncate">{client.phone}</span>

      {/* Status */}
      <div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
          client.supportReleased ? "bg-emerald-500" : "bg-red-500"
        }`}>
          {client.supportReleased ? "Liberado" : "Bloqueado"}
        </span>
      </div>

      {/* Contract */}
      <span className="text-sm text-gray-500">{client.contract}</span>

      {/* Date */}
      <span className="text-xs text-gray-400 text-right">{client.date}</span>

      {/* Type */}
      <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white ${
        client.type === "PJ" ? "bg-blue-600" : "bg-gray-400"
      }`}>{client.type}</span>
    </Link>
  )
}