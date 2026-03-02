"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getClientById, toggleClientSupport, addClientContact, deleteClientContact, addClientAttachment, deleteClientAttachment } from "@/app/actions/clients"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    ArrowLeft,
    FileText,
    Copy,
    MessageCircle,
    ShieldCheck,
    ShieldX,
    Ticket,
    Phone,
    Mail,
    Users,
    Check,
    Plus,
    Loader2,
    Trash2,
    Paperclip,
    Download,
    X,
} from "lucide-react"
import { uploadFile } from "@/app/utils/upload"
import { toast } from "react-toastify"

// ── Types ──
interface ClientContact {
    id: string
    name: string
    phone: string | null
    email: string | null
    role: string | null
}

interface TicketSummary {
    id: string
    ticketNumber: number
    ticketDescription: string
    status: string
    priority: string
    assignedTo: string | null
    createdAt: string
}

// ── Label maps ──
const statusBadgeColors: Record<string, string> = {
    NOVO: "bg-sky-500",
    PENDING_CLIENT: "bg-amber-500",
    PENDING_EMPRESS: "bg-violet-500",
    IN_PROGRESS: "bg-orange-500",
    CLOSED: "bg-gray-400",
}

const statusLabels: Record<string, string> = {
    NOVO: "Novo",
    PENDING_CLIENT: "Pend. Cliente",
    PENDING_EMPRESS: "Pend. Empresa",
    IN_PROGRESS: "Em Progresso",
    CLOSED: "Fechado",
}

const priorityDot: Record<string, string> = { LOW: "bg-emerald-500", MEDIUM: "bg-amber-500", HIGH: "bg-red-500" }
const priorityLabels: Record<string, string> = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta" }

function formatDateShort(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}
function cleanPhone(phone: string) { return phone.replace(/\D/g, "") }
function copyToClipboard(text: string) { navigator.clipboard.writeText(text) }

function getInitials(name: string) { return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() }

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const queryClient = useQueryClient()

    const { data: client, isLoading, isError } = useQuery({
        queryKey: ["client", id],
        queryFn: () => getClientById(id),
    })

    const toggleSupportMutation = useMutation({
        mutationFn: (released: boolean) => toggleClientSupport(id, released),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client", id] })
            queryClient.invalidateQueries({ queryKey: ["clients"] })
            toast.success(client?.supportReleased ? "Suporte bloqueado" : "Suporte liberado")
            setShowBlockModal(false)
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const addContactMut = useMutation({
        mutationFn: (data: { name: string; phone?: string; email?: string; role?: string }) => addClientContact(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client", id] })
            toast.success("Contato adicionado!")
            setShowContactModal(false)
            setContactForm({ name: "", phone: "", email: "", role: "" })
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const deleteContactMut = useMutation({
        mutationFn: (contactId: string) => deleteClientContact(contactId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client", id] })
            toast.success("Contato removido!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const addAttachMut = useMutation({
        mutationFn: (data: { url: string; fileName: string; fileType: string; fileSize: number }) => addClientAttachment(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client", id] })
            toast.success("Anexo adicionado!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const deleteAttachMut = useMutation({
        mutationFn: (attachmentId: string) => deleteClientAttachment(attachmentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["client", id] })
            toast.success("Anexo removido!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const [copied, setCopied] = useState<string | null>(null)
    const [showBlockModal, setShowBlockModal] = useState(false)
    const [showContactModal, setShowContactModal] = useState(false)
    const [contactForm, setContactForm] = useState({ name: "", phone: "", email: "", role: "" })
    const [attachUploading, setAttachUploading] = useState(false)

    const handleCopy = (text: string, label: string) => {
        copyToClipboard(text); setCopied(label); setTimeout(() => setCopied(null), 2000)
    }

    const handleAttachUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return
        setAttachUploading(true)
        try {
            for (const file of Array.from(files)) {
                const result = await uploadFile(file, "clientes")
                await addAttachMut.mutateAsync(result)
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro no upload")
        } finally {
            setAttachUploading(false)
            e.target.value = ""
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes}B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
    }

    const isImageFile = (fileType: string) => fileType.startsWith("image/")

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
        )
    }

    if (isError || !client) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-gray-800 mb-2">Cliente não encontrado</h2>
                    <p className="text-sm text-gray-500 mb-4">O cliente com ID &quot;{id}&quot; não existe.</p>
                    <Button onClick={() => router.push("/dashboard/clientes")} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm">Voltar</Button>
                </div>
            </div>
        )
    }

    const openTickets = client.tickets.filter((t: TicketSummary) => t.status !== "CLOSED").length
    const doc = client.cnpj || client.cpf || "—"
    const phone = client.ownerPhone || "—"
    const email = client.ownerEmail || "—"
    const certExpired = client.certificateExpiresDate ? new Date(client.certificateExpiresDate) < new Date() : false
    const hasOwner = !!(client.ownerName || client.ownerCpf || client.ownerPhone || client.ownerEmail)
    const hasCert = !!(client.certificateType || client.certificateExpiresDate)

    return (
        <div className="h-full overflow-y-auto bg-gray-50/50">
            {/* Top bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => router.push("/dashboard/clientes")} className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"><ArrowLeft size={16} /></button>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-blue-600`}>{getInitials(client.name)}</div>
                    <h1 className="text-sm font-semibold text-gray-900 truncate">{client.name}</h1>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${client.supportReleased ? "bg-emerald-500" : "bg-red-500"}`}>{client.supportReleased ? "Ativo" : "Bloqueado"}</span>
                </div>
                <div className="flex items-center gap-2">
                    {client.supportReleased
                        ? <button onClick={() => setShowBlockModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-all cursor-pointer"><ShieldX size={12} /> Bloquear</button>
                        : <button onClick={() => setShowBlockModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-all cursor-pointer"><ShieldCheck size={12} /> Liberar</button>}
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-all cursor-pointer"><FileText size={12} /> Editar</button>
                </div>
            </div>

            {/* Two-column layout */}
            <div className="flex gap-0 h-[calc(100%-49px)]">

                {/* ── Left: Main content ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* Observações */}
                    {client.aditionalInfo && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Observações</p>
                            <p className="text-sm text-gray-600 leading-relaxed">{client.aditionalInfo}</p>
                        </div>
                    )}

                    {/* Endereço do cliente */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Endereço</p>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            <Prop label="Logradouro" value={`${client.address}, ${client.houseNumber}`} />
                            <Prop label="Bairro" value={client.neighborhood} />
                            <Prop label="Cidade" value={client.city} />
                            <Prop label="CEP" value={client.zipCode} />
                            {client.complement && <Prop label="Complemento" value={client.complement} />}
                        </div>
                    </div>

                    {/* Sócio / Responsável */}
                    {hasOwner && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">{client.type === "PJ" ? "Sócio / Responsável" : "Responsável"}</p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                {client.ownerName && <Prop label="Nome" value={client.ownerName} />}
                                {client.ownerCpf && <Prop label="CPF" value={client.ownerCpf} />}
                                {client.ownerPhone && (
                                    <div>
                                        <p className="text-[10px] text-gray-400 mb-0.5">Telefone</p>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm text-gray-900">{client.ownerPhone}</span>
                                            <button onClick={() => window.open(`https://wa.me/55${cleanPhone(client.ownerPhone!)}`, "_blank")} className="text-gray-300 hover:text-emerald-500 cursor-pointer"><MessageCircle size={11} /></button>
                                            <button onClick={() => handleCopy(client.ownerPhone!, "ownerPhone")} className="text-gray-300 hover:text-gray-500 cursor-pointer">{copied === "ownerPhone" ? <span className="text-[10px] text-emerald-500">✓</span> : <Copy size={10} />}</button>
                                        </div>
                                    </div>
                                )}
                                {client.ownerEmail && (
                                    <div>
                                        <p className="text-[10px] text-gray-400 mb-0.5">Email</p>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm text-gray-900">{client.ownerEmail}</span>
                                            <button onClick={() => handleCopy(client.ownerEmail!, "ownerEmail")} className="text-gray-300 hover:text-gray-500 cursor-pointer">{copied === "ownerEmail" ? <span className="text-[10px] text-emerald-500">✓</span> : <Copy size={10} />}</button>
                                        </div>
                                    </div>
                                )}
                                {client.ownerAddress && <Prop label="Endereço" value={client.ownerAddress} />}
                                {client.ownerNeighborhood && <Prop label="Bairro" value={client.ownerNeighborhood} />}
                                {client.ownerCity && <Prop label="Cidade" value={`${client.ownerCity}${client.ownerState ? ` — ${client.ownerState}` : ""}`} />}
                                {client.ownerZipCode && <Prop label="CEP" value={client.ownerZipCode} />}
                            </div>
                        </div>
                    )}

                    {/* Certificado */}
                    {hasCert && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Certificado Digital</p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                {client.certificateType && <Prop label="Tipo" value={client.certificateType} />}
                                {client.certificateExpiresDate && (
                                    <div>
                                        <p className="text-[10px] text-gray-400 mb-0.5">Validade</p>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm text-gray-900">{formatDateShort(client.certificateExpiresDate)}</span>
                                            <span className={`w-1.5 h-1.5 rounded-full ${certExpired ? "bg-red-400" : "bg-emerald-500"}`} />
                                            <span className={`text-[10px] font-medium ${certExpired ? "text-red-500" : "text-emerald-600"}`}>{certExpired ? "Vencido" : "Válido"}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Anexos */}
                    <div className="bg-white border border-gray-200 rounded-xl">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Paperclip size={13} className="text-gray-400" />
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Anexos</p>
                            </div>
                            <label className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all cursor-pointer text-[10px] font-medium">
                                {attachUploading ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                                {attachUploading ? "Enviando..." : "Adicionar"}
                                <input type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" multiple className="hidden" onChange={handleAttachUpload} disabled={attachUploading} />
                            </label>
                        </div>
                        {(!client.attachments || client.attachments.length === 0) ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                <Paperclip size={18} className="mb-1.5 text-gray-300" />
                                <p className="text-xs">Nenhum anexo</p>
                                <label className="mt-1.5 text-[10px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
                                    + Adicionar arquivo
                                    <input type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" multiple className="hidden" onChange={handleAttachUpload} disabled={attachUploading} />
                                </label>
                            </div>
                        ) : (
                            <div className="p-4">
                                <div className="flex flex-wrap gap-3">
                                    {client.attachments.map((att: { id: string; url: string; fileName: string; fileType: string; fileSize: number }) => (
                                        <div key={att.id} className="relative group/att">
                                            {isImageFile(att.fileType) ? (
                                                <a href={att.url} target="_blank" rel="noreferrer">
                                                    <img src={att.url} alt={att.fileName} className="w-24 h-20 rounded-lg object-cover border border-gray-200 hover:shadow-md transition-shadow" />
                                                </a>
                                            ) : (
                                                <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
                                                    <FileText size={14} className="text-gray-400 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] text-gray-700 font-medium truncate max-w-28">{att.fileName}</p>
                                                        <p className="text-[9px] text-gray-400">{formatFileSize(att.fileSize)}</p>
                                                    </div>
                                                    <Download size={10} className="text-gray-400 shrink-0" />
                                                </a>
                                            )}
                                            <button onClick={() => deleteAttachMut.mutate(att.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity cursor-pointer shadow-sm" title="Remover"><X size={10} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tickets */}
                    <div className="bg-white border border-gray-200 rounded-xl">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Ticket size={13} className="text-gray-400" />
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tickets</p>
                            </div>
                            <span className="text-[10px] text-gray-400">{openTickets} abertos · {client.tickets.length} total</span>
                        </div>
                        {client.tickets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                <Ticket size={20} className="mb-1.5 text-gray-300" />
                                <p className="text-xs">Nenhum ticket</p>
                            </div>
                        ) : (
                            client.tickets.map((ticket: TicketSummary) => (
                                <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors">
                                    <span className="text-xs font-mono font-semibold text-gray-400 shrink-0 w-8">#{ticket.ticketNumber}</span>
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot[ticket.priority] || "bg-gray-400"}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 truncate">{ticket.ticketDescription}</p>
                                        <p className="text-[10px] text-gray-400">{formatDateShort(ticket.createdAt)}{ticket.assignedTo ? ` · ${ticket.assignedTo}` : ""}</p>
                                    </div>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0 ${statusBadgeColors[ticket.status] || "bg-gray-400"}`}>{statusLabels[ticket.status] || ticket.status}</span>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Right: Properties sidebar ── */}
                <div className="w-80 shrink-0 border-l border-gray-200 bg-gray-50/50 overflow-y-auto">
                    <div className="p-4 space-y-4">

                        {/* Identity */}
                        <div className="text-center pb-4 border-b border-gray-100">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white mx-auto mb-2 bg-blue-600`}>{getInitials(client.name)}</div>
                            <p className="text-sm font-semibold text-gray-900">{client.name}</p>
                            <p className="text-xs text-gray-400">{client.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}</p>
                        </div>

                        {/* Highlighted Quick Info Cards */}
                        <div className="grid grid-cols-2 gap-2">
                            {/* Suporte Status */}
                            <div className={`rounded-lg p-3 border ${client.supportReleased ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Suporte</p>
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${client.supportReleased ? "bg-emerald-500" : "bg-red-500"}`} />
                                    <span className={`text-xs font-bold ${client.supportReleased ? "text-emerald-700" : "text-red-700"}`}>{client.supportReleased ? "Liberado" : "Bloqueado"}</span>
                                </div>
                            </div>
                            {/* Contrato */}
                            <div className={`rounded-lg p-3 border ${client.hasContract ? "bg-blue-50 border-blue-200" : "bg-gray-100 border-gray-200"}`}>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Contrato</p>
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${client.hasContract ? "bg-blue-500" : "bg-gray-400"}`} />
                                    <span className={`text-xs font-bold ${client.hasContract ? "text-blue-700" : "text-gray-500"}`}>{client.hasContract ? "Ativo" : "Sem contrato"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Phone Highlight */}
                        {phone !== "—" && (
                            <div className="bg-white rounded-lg border border-gray-200 p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Phone size={12} className="text-blue-500" />
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Telefone Principal</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-900">{phone}</span>
                                    <button onClick={() => window.open(`https://wa.me/55${cleanPhone(phone)}`, "_blank")} className="text-gray-300 hover:text-emerald-500 cursor-pointer" title="WhatsApp"><MessageCircle size={12} /></button>
                                    <button onClick={() => handleCopy(phone, "sidePhone")} className="text-gray-300 hover:text-gray-500 cursor-pointer" title="Copiar">{copied === "sidePhone" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}</button>
                                </div>
                            </div>
                        )}

                        {/* Email Highlight */}
                        {email !== "—" && (
                            <div className="bg-white rounded-lg border border-gray-200 p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Mail size={12} className="text-blue-500" />
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Email Principal</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-900 truncate">{email}</span>
                                    <button onClick={() => handleCopy(email, "sideEmail")} className="text-gray-300 hover:text-gray-500 cursor-pointer shrink-0" title="Copiar">{copied === "sideEmail" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}</button>
                                </div>
                            </div>
                        )}

                        {/* Certificate Highlight */}
                        {hasCert && (
                            <div className={`rounded-lg p-3 border ${certExpired ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Certificado {client.certificateType}</p>
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${certExpired ? "bg-red-500" : "bg-emerald-500"}`} />
                                    <span className={`text-xs font-bold ${certExpired ? "text-red-700" : "text-emerald-700"}`}>
                                        {certExpired ? "Vencido" : "Válido"} — {formatDateShort(client.certificateExpiresDate!)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Contacts Section */}
                        <div className="bg-white rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
                                <div className="flex items-center gap-1.5">
                                    <Users size={12} className="text-gray-400" />
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contatos ({client.contacts.length})</p>
                                </div>
                                <button onClick={() => setShowContactModal(true)} className="text-gray-300 hover:text-blue-500 cursor-pointer" title="Adicionar contato">
                                    <Plus size={12} />
                                </button>
                            </div>
                            {client.contacts.length === 0 ? (
                                <div className="px-3 py-4 text-center">
                                    <p className="text-xs text-gray-400">Nenhum contato cadastrado</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {client.contacts.map((contact) => (
                                        <div key={contact.id} className="px-3 py-2.5">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-semibold text-gray-900">{contact.name}</span>
                                                <div className="flex items-center gap-1.5">
                                                    {contact.role && <span className="text-[9px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">{contact.role}</span>}
                                                    <button onClick={() => deleteContactMut.mutate(contact.id)} className="text-gray-300 hover:text-red-500 cursor-pointer" title="Remover contato"><Trash2 size={10} /></button>
                                                </div>
                                            </div>
                                            {contact.phone && (
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <Phone size={9} className="text-gray-300" />
                                                    <span className="text-[11px] text-gray-600">{contact.phone}</span>
                                                    <button onClick={() => window.open(`https://wa.me/55${cleanPhone(contact.phone!)}`, "_blank")} className="text-gray-300 hover:text-emerald-500 cursor-pointer"><MessageCircle size={9} /></button>
                                                    <button onClick={() => handleCopy(contact.phone!, `contact-${contact.id}`)} className="text-gray-300 hover:text-gray-500 cursor-pointer">{copied === `contact-${contact.id}` ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}</button>
                                                </div>
                                            )}
                                            {contact.email && (
                                                <div className="flex items-center gap-1.5">
                                                    <Mail size={9} className="text-gray-300" />
                                                    <span className="text-[11px] text-gray-600 truncate">{contact.email}</span>
                                                    <button onClick={() => handleCopy(contact.email!, `cemail-${contact.id}`)} className="text-gray-300 hover:text-gray-500 cursor-pointer shrink-0">{copied === `cemail-${contact.id}` ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}</button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Other Properties */}
                        <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2.5">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">Detalhes</p>
                            <SidebarProp label="ID" value={<span className="font-mono text-xs">{client.id}</span>} />
                            <SidebarProp label={client.cnpj ? "CNPJ" : "CPF"} value={
                                <div className="flex items-center gap-1">
                                    <span className="text-xs">{doc}</span>
                                    <button onClick={() => handleCopy(doc, "doc")} className="text-gray-300 hover:text-gray-500 cursor-pointer">{copied === "doc" ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}</button>
                                </div>
                            } />
                            {client.ie && <SidebarProp label="IE" value={<span className="text-xs">{client.ie}</span>} />}
                            {client.cnae && <SidebarProp label="CNAE" value={<span className="text-xs">{client.cnae}</span>} />}
                            <SidebarProp label="Cidade" value={<span className="text-xs">{client.city}</span>} />
                            <SidebarProp label="Cadastro" value={<span className="text-xs">{formatDateShort(client.createdAt)}</span>} />
                            <SidebarProp label="Tickets" value={<span className="text-xs">{client.tickets.length} ({openTickets} abertos)</span>} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Bloquear/Liberar */}
            <Dialog open={showBlockModal} onOpenChange={setShowBlockModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{client.supportReleased ? "Bloquear Suporte" : "Liberar Suporte"}</DialogTitle>
                        <DialogDescription>{client.supportReleased ? `Deseja bloquear o suporte para ${client.name}?` : `Deseja liberar o suporte para ${client.name}?`}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowBlockModal(false)}>Cancelar</Button>
                        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={toggleSupportMutation.isPending} onClick={() => toggleSupportMutation.mutate(!client.supportReleased)}>{toggleSupportMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}{client.supportReleased ? "Bloquear" : "Liberar"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Adicionar Contato */}
            <Dialog open={showContactModal} onOpenChange={(open) => { setShowContactModal(open); if (!open) setContactForm({ name: "", phone: "", email: "", role: "" }) }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Adicionar Contato</DialogTitle>
                        <DialogDescription>Preencha os dados do novo contato.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input placeholder="Nome *" value={contactForm.name} onChange={(e) => setContactForm(p => ({ ...p, name: e.target.value }))} />
                        <Input placeholder="Telefone" value={contactForm.phone} onChange={(e) => setContactForm(p => ({ ...p, phone: e.target.value }))} />
                        <Input placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm(p => ({ ...p, email: e.target.value }))} />
                        <Input placeholder="Cargo/Função" value={contactForm.role} onChange={(e) => setContactForm(p => ({ ...p, role: e.target.value }))} />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => { setShowContactModal(false); setContactForm({ name: "", phone: "", email: "", role: "" }) }}>Cancelar</Button>
                        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={!contactForm.name.trim() || addContactMut.isPending} onClick={() => addContactMut.mutate({ name: contactForm.name, phone: contactForm.phone || undefined, email: contactForm.email || undefined, role: contactForm.role || undefined })}>{addContactMut.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function Prop({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
            <p className="text-sm text-gray-900">{value}</p>
        </div>
    )
}

function SidebarProp({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-400">{label}</span>
            <div className="text-gray-900">{value}</div>
        </div>
    )
}
