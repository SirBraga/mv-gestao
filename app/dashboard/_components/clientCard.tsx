"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Copy, Check, MessageCircle, Building2, User } from "lucide-react"
import { getEntitySecondaryName } from "@/app/utils/entity-names"
import { maskCNPJ, maskCPF, maskPhone } from "@/app/utils/masks"

export interface ClientData {
  id: string
  name: string
  razaoSocial?: string | null
  nomeFantasia?: string | null
  cnpj: string | null
  cpf: string | null
  phone: string | null
  email: string | null
  hasContract: boolean
  contractType: string | null
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
  const secondaryName = getEntitySecondaryName({
    type: client.type,
    name: client.name,
    razaoSocial: client.razaoSocial,
    nomeFantasia: client.nomeFantasia,
  })
  const maskedDocument = client.cnpj ? maskCNPJ(client.cnpj) : client.cpf ? maskCPF(client.cpf) : "—"
  const maskedPhone = client.phone ? maskPhone(client.phone) : null

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
    <Link href={`/dashboard/clientes/${client.id}`} className="group grid grid-cols-[1.5fr_1fr_1fr_120px_110px_50px] items-center border-b border-slate-100 hover:bg-slate-50/50 transition-all px-6 py-3.5 gap-3">
      {/* Contact */}
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-white shadow-sm">
          <AvatarFallback className="text-xs font-semibold text-white bg-gradient-to-br from-indigo-500 to-purple-600">
            {getInitials(client.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{client.name}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {secondaryName || maskedDocument}
          </p>
        </div>
      </div>

      {/* Phone + copy */}
      <div className="flex items-center gap-2 min-w-0">
        {maskedPhone ? (
          <>
            <span className="text-sm text-slate-600 truncate">{maskedPhone}</span>
            <button onClick={handleWhatsApp} className="text-slate-300 hover:text-emerald-500 cursor-pointer shrink-0 transition-colors" title="WhatsApp">
              <MessageCircle size={14} />
            </button>
            <button onClick={(e) => handleCopy(e, maskedPhone, "phone")} className="text-slate-300 hover:text-slate-600 cursor-pointer shrink-0 transition-colors" title="Copiar telefone">
              {copied === "phone" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
          </>
        ) : <span className="text-sm text-slate-300">—</span>}
      </div>

      {/* Email + copy */}
      <div className="flex items-center gap-2 min-w-0">
        {client.email ? (
          <>
            <span className="text-sm text-slate-600 truncate">{client.email}</span>
            <button onClick={(e) => handleCopy(e, client.email!, "email")} className="text-slate-300 hover:text-slate-600 cursor-pointer shrink-0 transition-colors" title="Copiar email">
              {copied === "email" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
          </>
        ) : <span className="text-sm text-slate-300">—</span>}
      </div>

      {/* Status */}
      <div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
          client.supportReleased 
            ? "bg-emerald-50 text-emerald-700" 
            : "bg-red-50 text-red-700"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${client.supportReleased ? "bg-emerald-500" : "bg-red-500"}`} />
          {client.supportReleased ? "Liberado" : "Bloqueado"}
        </span>
      </div>

      {/* Contract */}
      <span className={`text-sm font-medium ${
        !client.contractType 
          ? "text-slate-400" 
          : client.contractType === "CANCELADO"
            ? "text-red-600"
            : client.contractType === "AVULSO"
              ? "text-blue-600"
              : "text-emerald-600"
      }`}>
        {!client.contractType 
          ? "Sem contrato" 
          : client.contractType
        }
      </span>

      {/* Type */}
      <span className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
        client.type === "PJ" 
          ? "bg-indigo-50 text-indigo-700" 
          : "bg-slate-100 text-slate-600"
      }`}>
        {client.type === "PJ" ? <Building2 size={12} /> : <User size={12} />}
        {client.type}
      </span>
    </Link>
  )
}