"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getTicketById, claimTicket, updateTicketStatus, assignTicket, addApontamento, addComment, reopenTicket, getAllUsers, updateTicketRequester, updateTicketClient, addCommentAttachment } from "@/app/actions/tickets"
import { getClients, getClientContacts } from "@/app/actions/clients"
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
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ArrowLeft,
    UserPlus,
    Clock,
    XCircle,
    RotateCcw,
    Plus,
    Copy,
    MessageCircle,
    ClipboardList,
    ArrowRightLeft,
    UserCheck,
    Users,
    Send,
    Reply,
    Loader2,
    Paperclip,
    FileText,
    Download,
    X,
    Image as ImageIcon,
} from "lucide-react"
import { uploadFile } from "@/app/utils/upload"
import { toast } from "react-toastify"

// ── Types matching the DB schema ──
type TicketStatus = "NOVO" | "PENDING_CLIENT" | "PENDING_EMPRESS" | "IN_PROGRESS" | "CLOSED"
type TicketPriority = "LOW" | "MEDIUM" | "HIGH"
type TicketType = "SUPPORT" | "SALES" | "FINANCE" | "MAINTENCE"
type ApontamentoCategory = "PROBLEMA_RESOLVIDO" | "TREINAMENTO" | "REUNIAO" | "TIRA_DUVIDAS" | "DESENVOLVIMENTO"

interface AttachmentData {
    id: string
    url: string
    fileName: string
    fileType: string
    fileSize: number
}

interface ApontamentoData {
    id: string
    description: string
    category: ApontamentoCategory
    duration: number
    date: string
    statusChange: TicketStatus | null
    user: { id: string; name: string }
    attachments: AttachmentData[]
}

interface CommentData {
    id: string
    content: string
    user: { id: string; name: string }
    createdAt: string
    parentId: string | null
    replies: CommentData[]
}

interface TicketDetail {
    id: string
    ticketDescription: string
    ticketStatus: TicketStatus | null
    ticketPriority: TicketPriority | null
    ticketType: TicketType | null
    ticketResolutionDate: string | null
    reopenCount: number
    reopenReason: string | null
    reopenDate: string | null
    reopenById: string | null
    assignedToId: string | null
    clientId: string
    createdAt: string
    updatedAt: string
    client: {
        id: string
        name: string
        cnpj: string | null
        cpf: string | null
        type: string | null
        city: string
        ownerPhone: string | null
        ownerEmail: string | null
    }
    assignedTo: {
        id: string
        name: string
        email: string
    } | null
    apontamentos: ApontamentoData[]
    comments: CommentData[]
}


// ── Label maps ──
const statusColors: Record<TicketStatus, string> = {
    NOVO: "bg-blue-500 text-white",
    PENDING_CLIENT: "bg-yellow-500 text-white",
    PENDING_EMPRESS: "bg-purple-500 text-white",
    IN_PROGRESS: "bg-orange-500 text-white",
    CLOSED: "bg-gray-400 text-white",
}

const statusDotColors: Record<TicketStatus, string> = {
    NOVO: "bg-blue-500",
    PENDING_CLIENT: "bg-amber-400",
    PENDING_EMPRESS: "bg-violet-400",
    IN_PROGRESS: "bg-orange-400",
    CLOSED: "bg-gray-300",
}

const statusBadgeColors: Record<TicketStatus, string> = {
    NOVO: "bg-sky-500 text-white",
    PENDING_CLIENT: "bg-amber-500 text-white",
    PENDING_EMPRESS: "bg-violet-500 text-white",
    IN_PROGRESS: "bg-orange-500 text-white",
    CLOSED: "bg-gray-400 text-white",
}

const priorityDotColors: Record<TicketPriority, string> = {
    LOW: "bg-emerald-500",
    MEDIUM: "bg-amber-400",
    HIGH: "bg-red-400",
}

const priorityBadgeColors: Record<TicketPriority, string> = {
    LOW: "bg-emerald-50 text-emerald-700",
    MEDIUM: "bg-amber-50 text-amber-700",
    HIGH: "bg-red-50 text-red-600",
}

const statusLabels: Record<TicketStatus, string> = {
    NOVO: "Novo",
    PENDING_CLIENT: "Pend. Cliente",
    PENDING_EMPRESS: "Pend. Empresa",
    IN_PROGRESS: "Em Progresso",
    CLOSED: "Fechado",
}

const priorityColors: Record<TicketPriority, string> = {
    LOW: "text-green-600 bg-green-50 border-green-200",
    MEDIUM: "text-orange-600 bg-orange-50 border-orange-200",
    HIGH: "text-red-600 bg-red-50 border-red-200",
}

const priorityLabels: Record<TicketPriority, string> = {
    LOW: "Baixa",
    MEDIUM: "Média",
    HIGH: "Alta",
}

const typeLabels: Record<TicketType, string> = {
    SUPPORT: "Suporte",
    SALES: "Vendas",
    FINANCE: "Financeiro",
    MAINTENCE: "Manutenção",
}

const typeColors: Record<TicketType, string> = {
    SUPPORT: "bg-blue-50 text-blue-700 border-blue-200",
    SALES: "bg-green-50 text-green-700 border-green-200",
    FINANCE: "bg-purple-50 text-purple-700 border-purple-200",
    MAINTENCE: "bg-orange-50 text-orange-700 border-orange-200",
}

const categoryLabels: Record<ApontamentoCategory, string> = {
    PROBLEMA_RESOLVIDO: "Problema Resolvido",
    TREINAMENTO: "Treinamento",
    REUNIAO: "Reunião",
    TIRA_DUVIDAS: "Tira Dúvidas",
    DESENVOLVIMENTO: "Desenvolvimento",
}

const categoryColors: Record<ApontamentoCategory, string> = {
    PROBLEMA_RESOLVIDO: "bg-green-50 text-green-700 border-green-200",
    TREINAMENTO: "bg-blue-50 text-blue-700 border-blue-200",
    REUNIAO: "bg-purple-50 text-purple-700 border-purple-200",
    TIRA_DUVIDAS: "bg-cyan-50 text-cyan-700 border-cyan-200",
    DESENVOLVIMENTO: "bg-orange-50 text-orange-700 border-orange-200",
}


function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    })
}

function formatDateShort(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
    })
}

function formatDuration(minutes: number) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m}min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}min`
}

function cleanPhone(phone: string) {
    return phone.replace(/\D/g, "")
}

function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
}

// ── Status transitions: cannot go back to NOVO ──
const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
    NOVO: ["IN_PROGRESS", "PENDING_CLIENT", "PENDING_EMPRESS", "CLOSED"],
    PENDING_CLIENT: ["IN_PROGRESS", "PENDING_EMPRESS", "CLOSED"],
    PENDING_EMPRESS: ["IN_PROGRESS", "PENDING_CLIENT", "CLOSED"],
    IN_PROGRESS: ["PENDING_CLIENT", "PENDING_EMPRESS", "CLOSED"],
    CLOSED: [],
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const queryClient = useQueryClient()

    const { data: ticket, isLoading, isError } = useQuery({
        queryKey: ["ticket", id],
        queryFn: () => getTicketById(id),
    })

    const { data: usersList = [] } = useQuery({
        queryKey: ["allUsers"],
        queryFn: () => getAllUsers(),
    })

    const { data: clientsList = [] } = useQuery({
        queryKey: ["clients-simple"],
        queryFn: () => getClients(),
    })

    const [changeClientId, setChangeClientId] = useState("")
    const [changeContactId, setChangeContactId] = useState("")
    const [showChangeRequesterModal, setShowChangeRequesterModal] = useState(false)

    const { data: changeContacts = [] } = useQuery({
        queryKey: ["client-contacts-change", changeClientId || ticket?.clientId],
        queryFn: () => getClientContacts(changeClientId || ticket?.clientId || ""),
        enabled: !!(changeClientId || ticket?.clientId),
    })

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["ticket", id] })
        queryClient.invalidateQueries({ queryKey: ["tickets"] })
    }

    const claimMut = useMutation({
        mutationFn: () => claimTicket(id),
        onSuccess: () => { invalidate(); toast.success("Ticket assumido!"); setShowClaimModal(false) },
        onError: (e: Error) => toast.error(e.message),
    })

    const statusMut = useMutation({
        mutationFn: (s: TicketStatus) => updateTicketStatus(id, s),
        onSuccess: () => { invalidate(); toast.success("Status atualizado!"); setShowCloseModal(false) },
        onError: (e: Error) => toast.error(e.message),
    })

    const assignMut = useMutation({
        mutationFn: (userId: string | null) => assignTicket(id, userId),
        onSuccess: () => { invalidate(); toast.success("Ticket atribuído!"); setShowAssignModal(false); setShowTransferModal(false); setSelectedUserId("") },
        onError: (e: Error) => toast.error(e.message),
    })

    const apontMut = useMutation({
        mutationFn: addApontamento,
        onSuccess: () => { invalidate(); toast.success("Apontamento salvo!"); setShowApontamentoModal(false); setApontDesc(""); setApontDuration(""); setApontStatusChange(""); setApontFiles([]) },
        onError: (e: Error) => toast.error(e.message),
    })

    const commentMut = useMutation({
        mutationFn: async ({ content, parentId, files }: { content: string; parentId?: string | null; files?: File[] }) => {
            const result = await addComment(id, content, parentId)
            if (files && files.length > 0 && result.commentId) {
                for (const file of files) {
                    const uploaded = await uploadFile(file, "comentarios")
                    await addCommentAttachment(result.commentId, {
                        url: uploaded.url,
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size,
                    })
                }
            }
            return result
        },
        onSuccess: () => { invalidate(); toast.success("Comentário adicionado!"); setNewComment(""); setReplyContent(""); setReplyingTo(null); setCommentFiles([]) },
        onError: (e: Error) => toast.error(e.message),
    })

    const reopenMut = useMutation({
        mutationFn: (reason: string) => reopenTicket(id, reason),
        onSuccess: () => { invalidate(); toast.success("Ticket reaberto!"); setShowReopenModal(false); setReopenReason("") },
        onError: (e: Error) => toast.error(e.message),
    })

    const requesterMut = useMutation({
        mutationFn: (contactId: string | null) => updateTicketRequester(id, contactId),
        onSuccess: () => { invalidate(); toast.success("Solicitante atualizado!"); setShowChangeRequesterModal(false); setChangeContactId("") },
        onError: (e: Error) => toast.error(e.message),
    })

    const clientMut = useMutation({
        mutationFn: (clientId: string) => updateTicketClient(id, clientId),
        onSuccess: () => { invalidate(); toast.success("Cliente alterado!"); setShowChangeClientModal(false); setChangeClientId("") },
        onError: (e: Error) => toast.error(e.message),
    })

    const [showClaimModal, setShowClaimModal] = useState(false)
    const [showReopenModal, setShowReopenModal] = useState(false)
    const [reopenReason, setReopenReason] = useState("")
    const [showCloseModal, setShowCloseModal] = useState(false)
    const [showApontamentoModal, setShowApontamentoModal] = useState(false)
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [showTransferModal, setShowTransferModal] = useState(false)
    const [showChangeClientModal, setShowChangeClientModal] = useState(false)
    const [selectedUserId, setSelectedUserId] = useState("")
    const [apontDesc, setApontDesc] = useState("")
    const [apontCategory, setApontCategory] = useState<ApontamentoCategory>("PROBLEMA_RESOLVIDO")
    const [apontDuration, setApontDuration] = useState("")
    const [apontDate, setApontDate] = useState(new Date().toISOString().slice(0, 16))
    const [apontStatusChange, setApontStatusChange] = useState<TicketStatus | "">("")
    const [copied, setCopied] = useState<string | null>(null)
    const [newComment, setNewComment] = useState("")
    const [replyingTo, setReplyingTo] = useState<string | null>(null)
    const [replyContent, setReplyContent] = useState("")
    const [activeTab, setActiveTab] = useState<"descricao" | "apontamentos" | "comentarios">("descricao")
    const [apontFiles, setApontFiles] = useState<{ url: string; fileName: string; fileType: string; fileSize: number }[]>([])
    const [apontUploading, setApontUploading] = useState(false)
    const [commentFiles, setCommentFiles] = useState<File[]>([])
    const [commentUploading, setCommentUploading] = useState(false)

    const handleCopy = (text: string, label: string) => {
        copyToClipboard(text)
        setCopied(label)
        setTimeout(() => setCopied(null), 2000)
    }

    const handleApontFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return
        setApontUploading(true)
        try {
            const uploaded = await Promise.all(Array.from(files).map(f => uploadFile(f, "apontamentos")))
            setApontFiles(prev => [...prev, ...uploaded])
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro no upload")
        } finally {
            setApontUploading(false)
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

    if (isError || !ticket) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Ticket não encontrado</h2>
                    <p className="text-gray-500 mb-4">O ticket com ID &quot;{id}&quot; não existe.</p>
                    <Button onClick={() => router.push("/dashboard/tickets")} className="bg-blue-600 hover:bg-blue-700 text-white">
                        Voltar aos Tickets
                    </Button>
                </div>
            </div>
        )
    }

    const status = (ticket.ticketStatus || "NOVO") as TicketStatus
    const priority = (ticket.ticketPriority || "MEDIUM") as TicketPriority
    const type = (ticket.ticketType || "SUPPORT") as TicketType
    const transitions = STATUS_TRANSITIONS[status]
    const totalMinutes = ticket.apontamentos.reduce((sum: number, a: ApontamentoData) => sum + a.duration, 0)
    const isAssignedToMe = ticket.assignedToId === ticket.currentUserId
    const clientDoc = ticket.client.cnpj || ticket.client.cpf || "—"
    const totalComments = ticket.comments.reduce((s: number, c: CommentData) => s + 1 + c.replies.length, 0)

    return (
        <div className="h-full overflow-hidden bg-gray-50/50">
            {/* Top bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => router.push("/dashboard/tickets")} className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"><ArrowLeft size={16} /></button>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm font-mono font-semibold text-gray-500 shrink-0">#{ticket.ticketNumber}</span>
                    <h1 className="text-sm font-semibold text-gray-900 truncate">{ticket.ticketDescription}</h1>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${statusBadgeColors[status]}`}>{statusLabels[status]}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    {status !== "CLOSED" && <button onClick={() => setShowApontamentoModal(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-[11px] font-medium hover:bg-gray-50 transition-all cursor-pointer"><Plus size={11} /> Apontamento</button>}
                    {!ticket.assignedTo && <button onClick={() => setShowClaimModal(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-[11px] font-medium hover:bg-gray-50 transition-all cursor-pointer"><UserPlus size={11} /> Assumir</button>}
                    <button onClick={() => setShowAssignModal(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-[11px] font-medium hover:bg-gray-50 transition-all cursor-pointer"><UserCheck size={11} /> Atribuir</button>
                    {status !== "CLOSED" && ticket.apontamentos.length > 0 && <button onClick={() => setShowCloseModal(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-red-500 text-[11px] font-medium hover:bg-gray-50 transition-all cursor-pointer"><XCircle size={11} /> Fechar</button>}
                    {status === "CLOSED" && <button onClick={() => setShowReopenModal(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-[11px] font-medium hover:bg-gray-50 transition-all cursor-pointer"><RotateCcw size={11} /> Reabrir</button>}
                </div>
            </div>

            {/* Two-column layout */}
            <div className="flex h-[calc(100%-49px)]">

                {/* ── Left: Main content ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* Description card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Descrição</p>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-sm font-medium text-gray-900">{ticket.client.name}</span>
                            <button onClick={() => setShowChangeClientModal(true)} className="text-[9px] text-blue-500 hover:text-blue-600 cursor-pointer font-medium">(alterar)</button>
                            {ticket.requestedByContact && (
                                <span className="text-[10px] text-gray-400">• Solicitante: <span className="font-medium text-gray-600">{ticket.requestedByContact.name}</span></span>
                            )}
                            <button onClick={() => setShowChangeRequesterModal(true)} className="text-[9px] text-blue-500 hover:text-blue-600 cursor-pointer font-medium">{ticket.requestedByContact ? "(alterar)" : "(definir solicitante)"}</button>
                            <span className="text-[10px] text-gray-400">{formatDate(ticket.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{ticket.ticketDescription}</p>
                        {/* Ticket attachments */}
                        {ticket.attachments && ticket.attachments.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Anexos</p>
                                <div className="flex flex-wrap gap-2">
                                    {ticket.attachments.map((att: AttachmentData) => (
                                        isImageFile(att.fileType) ? (
                                            <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className="block">
                                                <img src={att.url} alt={att.fileName} className="max-w-35 max-h-25 rounded-lg object-cover border border-gray-200 hover:shadow-md transition-shadow" />
                                            </a>
                                        ) : (
                                            <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
                                                <FileText size={12} className="text-gray-400" />
                                                <span className="text-[11px] text-gray-600 max-w-30 truncate">{att.fileName}</span>
                                                <span className="text-[9px] text-gray-400">{formatFileSize(att.fileSize)}</span>
                                                <Download size={10} className="text-gray-400" />
                                            </a>
                                        )
                                    ))}
                                </div>
                            </div>
                        )}
                        {ticket.reopenCount > 0 && ticket.reopenDate && (
                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-start gap-2">
                                <RotateCcw size={12} className="text-amber-500 shrink-0 mt-0.5" />
                                <div><p className="text-xs font-medium text-gray-700">Reaberto ({ticket.reopenCount}x)</p>{ticket.reopenReason && <p className="text-[10px] text-gray-500 mt-0.5">{ticket.reopenReason}</p>}<p className="text-[10px] text-gray-400">{formatDate(ticket.reopenDate)}</p></div>
                            </div>
                        )}
                        {ticket.ticketResolutionDate && (
                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                <span className="text-xs font-medium text-gray-700">Resolvido em {formatDate(ticket.ticketResolutionDate)}</span>
                            </div>
                        )}
                    </div>

                    {/* Client info card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Cliente</p>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            <div>
                                <p className="text-[10px] text-gray-400 mb-0.5">Nome</p>
                                <Link href={`/dashboard/clientes/${ticket.client.id}`} className="text-sm text-gray-900 hover:text-emerald-600 transition-colors">{ticket.client.name}</Link>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 mb-0.5">{ticket.client.cnpj ? "CNPJ" : "CPF"}</p>
                                <p className="text-sm text-gray-900">{clientDoc}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 mb-0.5">Cidade</p>
                                <p className="text-sm text-gray-900">{ticket.client.city}</p>
                            </div>
                            {ticket.client.ownerPhone && (
                                <div>
                                    <p className="text-[10px] text-gray-400 mb-0.5">Telefone</p>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm text-gray-900">{ticket.client.ownerPhone}</span>
                                        <button onClick={() => window.open(`https://wa.me/55${cleanPhone(ticket.client.ownerPhone!)}`, "_blank")} className="text-gray-300 hover:text-emerald-500 cursor-pointer"><MessageCircle size={11} /></button>
                                        <button onClick={() => handleCopy(ticket.client.ownerPhone!, "phone")} className="text-gray-300 hover:text-gray-500 cursor-pointer">{copied === "phone" ? <span className="text-[10px] text-emerald-500">✓</span> : <Copy size={10} />}</button>
                                    </div>
                                </div>
                            )}
                            {ticket.client.ownerEmail && (
                                <div>
                                    <p className="text-[10px] text-gray-400 mb-0.5">Email</p>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm text-gray-900">{ticket.client.ownerEmail}</span>
                                        <button onClick={() => handleCopy(ticket.client.ownerEmail!, "email")} className="text-gray-300 hover:text-gray-500 cursor-pointer shrink-0">{copied === "email" ? <span className="text-[10px] text-emerald-500">✓</span> : <Copy size={10} />}</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Apontamentos */}
                    <div className="bg-white border border-gray-200 rounded-xl">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ClipboardList size={13} className="text-gray-400" />
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Apontamentos</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {totalMinutes > 0 && <span className="text-[10px] text-gray-400">Total: <span className="font-medium text-gray-600">{formatDuration(totalMinutes)}</span></span>}
                                <span className="text-[10px] text-gray-400">{ticket.apontamentos.length}</span>
                            </div>
                        </div>
                        {ticket.apontamentos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                <ClipboardList size={18} className="mb-1 text-gray-300" />
                                <p className="text-xs">Nenhum apontamento</p>
                                {status !== "CLOSED" && <button onClick={() => setShowApontamentoModal(true)} className="mt-1.5 text-[10px] text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer">+ Adicionar</button>}
                            </div>
                        ) : (
                            ticket.apontamentos.map((a: ApontamentoData, i: number) => (
                                <div key={a.id} className={`px-4 py-3 ${i < ticket.apontamentos.length - 1 ? "border-b border-gray-50" : ""}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium text-gray-900">{a.user.name}</span>
                                        <span className="text-[10px] text-gray-400">{formatDate(a.date)}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{a.description}</p>
                                    {/* Attachments */}
                                    {a.attachments && a.attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {a.attachments.map((att: AttachmentData) => (
                                                isImageFile(att.fileType) ? (
                                                    <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className="block">
                                                        <img src={att.url} alt={att.fileName} className="max-w-[120px] max-h-[80px] rounded-lg object-cover border border-gray-200 hover:shadow-md transition-shadow" />
                                                    </a>
                                                ) : (
                                                    <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
                                                        <FileText size={12} className="text-gray-400" />
                                                        <span className="text-[10px] text-gray-600 max-w-[100px] truncate">{att.fileName}</span>
                                                        <span className="text-[9px] text-gray-400">{formatFileSize(att.fileSize)}</span>
                                                    </a>
                                                )
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${categoryColors[a.category]}`}>{categoryLabels[a.category]}</span>
                                        <span className="flex items-center gap-0.5"><Clock size={10} /> {formatDuration(a.duration)}</span>
                                        {a.statusChange && <span className="flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${statusDotColors[a.statusChange]}`} />→ {statusLabels[a.statusChange]}</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Comentários */}
                    <div className="bg-white border border-gray-200 rounded-xl">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MessageCircle size={13} className="text-gray-400" />
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Comentários</p>
                            </div>
                            <span className="text-[10px] text-gray-400">{totalComments}</span>
                        </div>
                        <div className="px-4 py-3 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <Input placeholder="Escreva um comentário..." value={newComment} onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && newComment.trim()) { commentMut.mutate({ content: newComment, files: commentFiles }) } }}
                                    className="flex-1 h-8 text-xs" />
                                <label className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-300 cursor-pointer transition-colors shrink-0">
                                    <Paperclip size={12} />
                                    <input type="file" multiple className="hidden" onChange={e => { if (e.target.files) setCommentFiles(prev => [...prev, ...Array.from(e.target.files!)]); e.target.value = "" }} />
                                </label>
                                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 px-2.5" disabled={!newComment.trim() || commentMut.isPending}
                                    onClick={() => commentMut.mutate({ content: newComment, files: commentFiles })}><Send size={12} /></Button>
                            </div>
                            {commentFiles.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {commentFiles.map((f, i) => (
                                        <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-50 text-[10px] text-gray-600">
                                            <Paperclip size={9} className="text-gray-400" />
                                            <span className="truncate max-w-24">{f.name}</span>
                                            <button onClick={() => setCommentFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 cursor-pointer"><X size={10} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {ticket.comments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                <MessageCircle size={18} className="mb-1 text-gray-300" />
                                <p className="text-xs">Nenhum comentário</p>
                            </div>
                        ) : (
                            ticket.comments.map((comment) => (
                                <div key={comment.id} className="border-b border-gray-50 last:border-b-0">
                                    <div className="px-4 py-3">
                                        <div className="flex items-center gap-2 mb-1"><span className="text-xs font-medium text-gray-900">{comment.user.name}</span><span className="text-[10px] text-gray-400">{formatDate(comment.createdAt)}</span></div>
                                        <p className="text-sm text-gray-600 leading-relaxed">{comment.content}</p>
                                        <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                            className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"><Reply size={10} /> Responder</button>
                                    </div>
                                    {comment.replies.length > 0 && (
                                        <div className="ml-8 pb-2 space-y-1">
                                            {comment.replies.map((reply) => (
                                                <div key={reply.id} className="px-3 py-2 bg-gray-50 rounded-lg mx-4">
                                                    <div className="flex items-center gap-2 mb-0.5"><span className="text-[10px] font-medium text-gray-900">{reply.user.name}</span><span className="text-[10px] text-gray-400">{formatDate(reply.createdAt)}</span></div>
                                                    <p className="text-xs text-gray-600 leading-relaxed">{reply.content}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {replyingTo === comment.id && (
                                        <div className="ml-8 pb-3 px-4 flex gap-2">
                                            <Input placeholder="Escreva uma resposta..." value={replyContent} onChange={(e) => setReplyContent(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === "Enter" && replyContent.trim()) { commentMut.mutate({ content: replyContent, parentId: comment.id }) } }}
                                                className="flex-1 h-7 text-[10px]" autoFocus />
                                            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white h-7 px-2" disabled={!replyContent.trim() || commentMut.isPending}
                                                onClick={() => commentMut.mutate({ content: replyContent, parentId: comment.id })}><Send size={10} /></Button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Right: Properties sidebar ── */}
                <div className="w-72 shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
                    <div className="p-4 space-y-3">
                        <SidebarProp label="Status" value={<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${statusBadgeColors[status]}`}>{statusLabels[status]}</span>} />
                        <SidebarProp label="Prioridade" value={<div className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${priorityDotColors[priority]}`} /><span className="text-xs">{priorityLabels[priority]}</span></div>} />
                        <SidebarProp label="Tipo" value={<span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${typeColors[type]}`}>{typeLabels[type]}</span>} />
                        <div className="border-t border-gray-100 pt-3" />
                        <SidebarProp label="Cliente" value={<Link href={`/dashboard/clientes/${ticket.client.id}`} className="text-xs text-gray-900 hover:text-emerald-600 transition-colors">{ticket.client.name}</Link>} />
                        <SidebarProp label="Responsável" value={ticket.assignedTo ? <span className="text-xs">{ticket.assignedTo.name}</span> : <span className="text-xs text-gray-300">Não atribuído</span>} />
                        <div className="border-t border-gray-100 pt-3" />
                        <SidebarProp label="Criado" value={<span className="text-xs">{formatDateShort(ticket.createdAt)}</span>} />
                        <SidebarProp label="Atualizado" value={<span className="text-xs">{formatDateShort(ticket.updatedAt)}</span>} />
                        <SidebarProp label="Tempo total" value={<span className="text-xs font-medium">{formatDuration(totalMinutes)}</span>} />
                        <SidebarProp label="Apontamentos" value={<span className="text-xs">{ticket.apontamentos.length}</span>} />
                        <SidebarProp label="Reaberturas" value={<span className="text-xs">{ticket.reopenCount}</span>} />
                        {ticket.ticketResolutionDate && <SidebarProp label="Resolvido" value={<span className="text-xs">{formatDateShort(ticket.ticketResolutionDate)}</span>} />}
                        {isAssignedToMe && (
                            <>
                                <div className="border-t border-gray-100 pt-3" />
                                <button onClick={() => setShowTransferModal(true)} className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-[11px] font-medium hover:bg-gray-50 transition-all cursor-pointer justify-center"><ArrowRightLeft size={11} /> Transferir</button>
                            </>
                        )}
                        <button onClick={() => setShowChangeClientModal(true)} className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-[11px] font-medium hover:bg-gray-50 transition-all cursor-pointer justify-center"><Users size={11} /> Mudar Cliente</button>
                    </div>
                </div>
            </div>

            {/* ── Modals ── */}
            <Dialog open={showClaimModal} onOpenChange={setShowClaimModal}>
                <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Assumir Ticket</DialogTitle><DialogDescription>Deseja assumir a responsabilidade por este ticket?</DialogDescription></DialogHeader>
                    <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setShowClaimModal(false)}>Cancelar</Button><Button className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={claimMut.isPending} onClick={() => claimMut.mutate()}>{claimMut.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}Confirmar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={showReopenModal} onOpenChange={setShowReopenModal}>
                <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Reabrir Ticket</DialogTitle><DialogDescription>Informe o motivo para reabrir este ticket.</DialogDescription></DialogHeader>
                    <Textarea placeholder="Motivo da reabertura..." value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} className="min-h-25" />
                    <DialogFooter className="gap-2"><Button variant="outline" onClick={() => { setShowReopenModal(false); setReopenReason("") }}>Cancelar</Button><Button className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={!reopenReason.trim() || reopenMut.isPending} onClick={() => reopenMut.mutate(reopenReason)}>{reopenMut.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}Reabrir</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
                <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Fechar Ticket</DialogTitle><DialogDescription>Tem certeza que deseja fechar este ticket?</DialogDescription></DialogHeader>
                    <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setShowCloseModal(false)}>Cancelar</Button><Button className="bg-red-600 hover:bg-red-700 text-white" disabled={statusMut.isPending} onClick={() => statusMut.mutate("CLOSED")}>{statusMut.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}Fechar Ticket</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={showAssignModal} onOpenChange={(open) => { setShowAssignModal(open); if (!open) setSelectedUserId("") }}>
                <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Atribuir Ticket</DialogTitle><DialogDescription>Selecione o responsável.</DialogDescription></DialogHeader>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}><SelectTrigger className="w-full"><SelectValue placeholder="Selecione um usuário" /></SelectTrigger><SelectContent>{usersList.map((u: {id: string; name: string}) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}</SelectContent></Select>
                    <DialogFooter className="gap-2"><Button variant="outline" onClick={() => { setShowAssignModal(false); setSelectedUserId("") }}>Cancelar</Button><Button className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={!selectedUserId || assignMut.isPending} onClick={() => assignMut.mutate(selectedUserId)}>{assignMut.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}Atribuir</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={showTransferModal} onOpenChange={(open) => { setShowTransferModal(open); if (!open) setSelectedUserId("") }}>
                <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Transferir Ticket</DialogTitle><DialogDescription>Selecione para quem transferir.</DialogDescription></DialogHeader>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}><SelectTrigger className="w-full"><SelectValue placeholder="Selecione um usuário" /></SelectTrigger><SelectContent>{usersList.filter((u: {id: string; name: string}) => u.id !== ticket.assignedToId).map((u: {id: string; name: string}) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}</SelectContent></Select>
                    <DialogFooter className="gap-2"><Button variant="outline" onClick={() => { setShowTransferModal(false); setSelectedUserId("") }}>Cancelar</Button><Button className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={!selectedUserId || assignMut.isPending} onClick={() => assignMut.mutate(selectedUserId)}>{assignMut.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}Transferir</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={showChangeClientModal} onOpenChange={(open) => { setShowChangeClientModal(open); if (!open) setChangeClientId("") }}>
                <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Mudar Cliente</DialogTitle><DialogDescription>Ao mudar o cliente, o solicitante será resetado.</DialogDescription></DialogHeader>
                    <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={changeClientId} onChange={e => setChangeClientId(e.target.value)}>
                        <option value="">Selecione o novo cliente...</option>
                        {clientsList.filter((c: { id: string }) => c.id !== ticket.clientId).map((c: { id: string; name: string }) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <DialogFooter className="gap-2"><Button variant="outline" onClick={() => { setShowChangeClientModal(false); setChangeClientId("") }}>Cancelar</Button><Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!changeClientId || clientMut.isPending} onClick={() => clientMut.mutate(changeClientId)}>{clientMut.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}Confirmar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={showChangeRequesterModal} onOpenChange={(open) => { setShowChangeRequesterModal(open); if (!open) setChangeContactId("") }}>
                <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Mudar Solicitante</DialogTitle><DialogDescription>Selecione o novo solicitante do ticket.</DialogDescription></DialogHeader>
                    <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={changeContactId} onChange={e => setChangeContactId(e.target.value)}>
                        <option value="">Selecione o solicitante...</option>
                        <option value="__contabilidade__">Contabilidade</option>
                        {changeContacts.map((ct: { id: string; name: string; role: string | null }) => (
                            <option key={ct.id} value={ct.id}>{ct.name}{ct.role ? ` (${ct.role})` : ""}</option>
                        ))}
                    </select>
                    <DialogFooter className="gap-2"><Button variant="outline" onClick={() => { setShowChangeRequesterModal(false); setChangeContactId("") }}>Cancelar</Button><Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!changeContactId || requesterMut.isPending} onClick={() => requesterMut.mutate(changeContactId === "__contabilidade__" ? null : changeContactId)}>{requesterMut.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}Confirmar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={showApontamentoModal} onOpenChange={(open) => { if (!open) { setShowApontamentoModal(false); setApontDesc(""); setApontDuration(""); setApontStatusChange(""); setApontFiles([]) } }}>
                <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Novo Apontamento</DialogTitle><DialogDescription>Registre o trabalho realizado.</DialogDescription></DialogHeader>
                    <div className="space-y-3">
                        <Textarea placeholder="Descreva o trabalho realizado..." value={apontDesc} onChange={(e) => setApontDesc(e.target.value)} className="min-h-25" />
                        <Select value={apontCategory} onValueChange={(v) => setApontCategory(v as ApontamentoCategory)}><SelectTrigger className="w-full"><SelectValue placeholder="Categoria" /></SelectTrigger><SelectContent>{(Object.keys(categoryLabels) as ApontamentoCategory[]).map((cat) => (<SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>))}</SelectContent></Select>
                        <div className="grid grid-cols-2 gap-3"><Input type="number" placeholder="Duração (min)" value={apontDuration} onChange={(e) => setApontDuration(e.target.value)} min={1} /><Input type="datetime-local" value={apontDate} onChange={(e) => setApontDate(e.target.value)} /></div>
                        <Select value={apontStatusChange} onValueChange={(v) => setApontStatusChange(v as TicketStatus | "")}><SelectTrigger className="w-full"><SelectValue placeholder="Alterar status (opcional)" /></SelectTrigger><SelectContent><SelectItem value="none">Manter status atual</SelectItem>{transitions.map((s) => (<SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>))}</SelectContent></Select>
                        {/* File attachments */}
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Anexos</label>
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 text-[11px] font-medium hover:bg-gray-50 transition-all cursor-pointer">
                                    {apontUploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
                                    {apontUploading ? "Enviando..." : "Anexar arquivo"}
                                    <input type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" multiple className="hidden" onChange={handleApontFileUpload} disabled={apontUploading} />
                                </label>
                            </div>
                            {apontFiles.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {apontFiles.map((f, idx) => (
                                        <div key={idx} className="relative group/file shrink-0">
                                            {isImageFile(f.fileType) ? (
                                                <img src={f.url} alt={f.fileName} className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                                            ) : (
                                                <div className="w-14 h-14 rounded-lg bg-gray-50 border border-gray-200 flex flex-col items-center justify-center p-1">
                                                    <FileText size={14} className="text-gray-400" />
                                                    <span className="text-[7px] text-gray-400 mt-0.5 truncate max-w-12">{f.fileName}</span>
                                                </div>
                                            )}
                                            <button onClick={() => setApontFiles(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/file:opacity-100 transition-opacity cursor-pointer"><X size={8} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="gap-2"><Button variant="outline" onClick={() => { setShowApontamentoModal(false); setApontDesc(""); setApontDuration(""); setApontStatusChange(""); setApontFiles([]) }}>Cancelar</Button>
                        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={!apontDesc.trim() || !apontDuration || apontMut.isPending} onClick={() => apontMut.mutate({ ticketId: id, description: apontDesc, category: apontCategory, duration: parseInt(apontDuration), date: apontDate, statusChange: apontStatusChange || null, attachments: apontFiles.length > 0 ? apontFiles : undefined })}>{apontMut.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
