"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Copy, Check, MessageCircle } from "lucide-react"

export interface ClientData {
  id: string
  name: string
  cnpj: string | null
  cpf: string | null
  phone: string | null
  email: string | null
  hasContract: boolean
  supportReleased: boolean
  type: "PF" | "PJ"
  city: string
  certificateExpiresDate: string | null
  certificateType: string | null
  ticketCount: number
  contactCount: number
  createdAt: string
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
}

function cleanPhone(phone: string) { return phone.replace(/\D/g, "") }

export default function ClientCard({ client }: { client: ClientData }) {
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = (e: React.MouseEvent, text: string, label: string) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (client.phone) { const p = client.phone; window.open(`https://wa.me/55${cleanPhone(p)}`, "_blank") }
  }

  return (
    <Link href={`/dashboard/clientes/${client.id}`} className="grid grid-cols-[1.5fr_1fr_1fr_120px_110px_50px] items-center border-b border-gray-100 hover:bg-gray-50 transition-colors px-4 py-3 gap-3">
      {/* Contact */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className={`text-[10px] font-bold text-white bg-blue-600`}>
            {getInitials(client.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
          <p className="text-xs text-gray-400 truncate">{client.cnpj || client.cpf || "—"}</p>
        </div>
      </div>

      {/* Phone + copy */}
      <div className="flex items-center gap-1.5 min-w-0">
        {client.phone ? (
          <>
            <span className="text-sm text-gray-500 truncate">{client.phone}</span>
            <button onClick={handleWhatsApp} className="text-gray-300 hover:text-emerald-500 cursor-pointer shrink-0" title="WhatsApp">
              <MessageCircle size={11} />
            </button>
            <button onClick={(e) => handleCopy(e, client.phone!, "phone")} className="text-gray-300 hover:text-gray-500 cursor-pointer shrink-0" title="Copiar telefone">
              {copied === "phone" ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
            </button>
          </>
        ) : <span className="text-sm text-gray-300">—</span>}
      </div>

      {/* Email + copy */}
      <div className="flex items-center gap-1.5 min-w-0">
        {client.email ? (
          <>
            <span className="text-sm text-gray-500 truncate">{client.email}</span>
            <button onClick={(e) => handleCopy(e, client.email!, "email")} className="text-gray-300 hover:text-gray-500 cursor-pointer shrink-0" title="Copiar email">
              {copied === "email" ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
            </button>
          </>
        ) : <span className="text-sm text-gray-300">—</span>}
      </div>

      {/* Status */}
      <div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
          client.supportReleased ? "bg-emerald-500" : "bg-red-500"
        }`}>
          {client.supportReleased ? "Liberado" : "Bloqueado"}
        </span>
      </div>

      {/* Contract */}
      <span className="text-sm text-gray-500">{client.hasContract ? "Ativo" : "Sem contrato"}</span>

      {/* Type */}
      <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white ${
        client.type === "PJ" ? "bg-blue-600" : "bg-gray-400"
      }`}>{client.type}</span>
    </Link>
  )
}