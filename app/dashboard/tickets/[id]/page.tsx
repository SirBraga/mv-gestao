"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import Link from "next/link"
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
} from "lucide-react"

// ── Types matching the DB schema ──
type TicketStatus = "NOVO" | "PENDING_CLIENT" | "PENDING_EMPRESS" | "IN_PROGRESS" | "CLOSED"
type TicketPriority = "LOW" | "MEDIUM" | "HIGH"
type TicketType = "SUPPORT" | "SALES" | "FINANCE" | "MAINTENCE"
type ApontamentoCategory = "PROBLEMA_RESOLVIDO" | "TREINAMENTO" | "REUNIAO" | "TIRA_DUVIDAS" | "DESENVOLVIMENTO"

interface ApontamentoData {
    id: string
    description: string
    category: ApontamentoCategory
    duration: number
    date: string
    statusChange: TicketStatus | null
    user: { id: string; name: string }
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

// ── Sample data matching seed ──
const SAMPLE_APONTAMENTOS: Record<string, ApontamentoData[]> = {
    t001: [
        { id: "a1", description: "Análise preliminar de performance nos relatórios mensais", category: "TIRA_DUVIDAS", duration: 45, date: "2026-01-16T09:00:00Z", statusChange: null, user: { id: "user-1", name: "Pedro Braga" } },
    ],
    t004: [
        { id: "a2", description: "Análise inicial do módulo de estoque, identificação de dependências para atualização", category: "DESENVOLVIMENTO", duration: 120, date: "2026-02-01T10:00:00Z", statusChange: null, user: { id: "user-1", name: "Pedro Braga" } },
        { id: "a3", description: "Backup do banco de dados e preparação do ambiente de testes", category: "DESENVOLVIMENTO", duration: 60, date: "2026-02-02T14:00:00Z", statusChange: null, user: { id: "user-1", name: "Pedro Braga" } },
    ],
    t005: [
        { id: "a4", description: "Treinamento remoto sobre cadastro de produtos no sistema", category: "TREINAMENTO", duration: 45, date: "2026-02-08T09:00:00Z", statusChange: "CLOSED", user: { id: "user-1", name: "Pedro Braga" } },
    ],
    t007: [
        { id: "a5", description: "Investigação do erro na geração de boletos, problema identificado no módulo bancário", category: "PROBLEMA_RESOLVIDO", duration: 90, date: "2026-02-11T11:00:00Z", statusChange: null, user: { id: "user-1", name: "Pedro Braga" } },
        { id: "a6", description: "Reunião com equipe financeira para alinhar correção do módulo de boletos", category: "REUNIAO", duration: 30, date: "2026-02-12T15:00:00Z", statusChange: "PENDING_EMPRESS", user: { id: "user-1", name: "Pedro Braga" } },
    ],
    t009: [
        { id: "a7", description: "Sessão de treinamento sobre funcionalidades do dashboard com o cliente", category: "TREINAMENTO", duration: 60, date: "2026-02-13T10:00:00Z", statusChange: null, user: { id: "user-1", name: "Pedro Braga" } },
        { id: "a8", description: "Tira-dúvidas final e validação com o cliente", category: "TIRA_DUVIDAS", duration: 30, date: "2026-02-15T16:00:00Z", statusChange: "CLOSED", user: { id: "user-1", name: "Pedro Braga" } },
    ],
}

const SAMPLE_COMMENTS: Record<string, CommentData[]> = {
    t004: [
        {
            id: "c1", content: "Já iniciei a análise das dependências. Vou precisar de acesso ao ambiente de staging.", user: { id: "user-1", name: "Pedro Braga" },
            createdAt: "2026-02-01T11:00:00Z", parentId: null,
            replies: [
                { id: "c2", content: "Acesso liberado. Pode seguir com a atualização.", user: { id: "user-2", name: "Ana Costa" }, createdAt: "2026-02-01T12:30:00Z", parentId: "c1", replies: [] },
            ],
        },
        { id: "c3", content: "Backup realizado com sucesso. Ambiente de testes pronto.", user: { id: "user-1", name: "Pedro Braga" }, createdAt: "2026-02-02T15:00:00Z", parentId: null, replies: [] },
    ],
    t007: [
        { id: "c4", content: "Cliente reportou que o problema ocorre apenas com boletos do Banco do Brasil.", user: { id: "user-1", name: "Pedro Braga" }, createdAt: "2026-02-10T11:00:00Z", parentId: null, replies: [] },
    ],
}

const SAMPLE_USERS = [
    { id: "user-1", name: "Pedro Braga" },
    { id: "user-2", name: "Ana Costa" },
    { id: "user-3", name: "Carlos Silva" },
    { id: "user-4", name: "Maria Santos" },
]

const SAMPLE_TICKETS: Record<string, TicketDetail> = {
    t001: {
        id: "t001", ticketDescription: "Sistema apresentando lentidão ao gerar relatórios mensais",
        ticketStatus: "NOVO", ticketPriority: "HIGH", ticketType: "SUPPORT",
        ticketResolutionDate: null, reopenCount: 0, reopenReason: null, reopenDate: null, reopenById: null,
        assignedToId: "user-1", clientId: "9462", createdAt: "2026-01-15T10:00:00Z", updatedAt: "2026-01-15T10:00:00Z",
        client: { id: "9462", name: "João Silva", cnpj: null, cpf: "123.456.789-00", type: "PESSOA_FISICA", city: "São Paulo", ownerPhone: "(11) 98765-4321", ownerEmail: "joao.silva@email.com" },
        assignedTo: { id: "user-1", name: "Pedro Braga", email: "pedrobraga2016@gmail.com" },
        apontamentos: SAMPLE_APONTAMENTOS.t001 || [], comments: [],
    },
    t002: {
        id: "t002", ticketDescription: "Erro ao importar notas fiscais no módulo contábil",
        ticketStatus: "PENDING_CLIENT", ticketPriority: "MEDIUM", ticketType: "SUPPORT",
        ticketResolutionDate: null, reopenCount: 0, reopenReason: null, reopenDate: null, reopenById: null,
        assignedToId: null, clientId: "9374", createdAt: "2026-01-28T14:30:00Z", updatedAt: "2026-01-28T14:30:00Z",
        client: { id: "9374", name: "Empresa ABC Ltda", cnpj: "12.345.678/0001-99", cpf: null, type: "PESSOA_JURIDICA", city: "São Paulo", ownerPhone: "(11) 3344-5566", ownerEmail: "carlos@empresaabc.com.br" },
        assignedTo: null, apontamentos: [], comments: [],
    },
    t003: {
        id: "t003", ticketDescription: "Divergência nos valores de faturamento do mês de janeiro",
        ticketStatus: "NOVO", ticketPriority: "HIGH", ticketType: "FINANCE",
        ticketResolutionDate: null, reopenCount: 0, reopenReason: null, reopenDate: null, reopenById: null,
        assignedToId: null, clientId: "9359", createdAt: "2026-01-31T09:15:00Z", updatedAt: "2026-01-31T09:15:00Z",
        client: { id: "9359", name: "Maria Oliveira", cnpj: null, cpf: "987.654.321-11", type: "PESSOA_FISICA", city: "Rio de Janeiro", ownerPhone: "(21) 99887-7665", ownerEmail: "maria.oliveira@email.com" },
        assignedTo: null, apontamentos: [], comments: [],
    },
    t004: {
        id: "t004", ticketDescription: "Atualização do módulo de estoque para nova versão",
        ticketStatus: "IN_PROGRESS", ticketPriority: "MEDIUM", ticketType: "MAINTENCE",
        ticketResolutionDate: null, reopenCount: 0, reopenReason: null, reopenDate: null, reopenById: null,
        assignedToId: "user-1", clientId: "9261", createdAt: "2026-02-01T08:00:00Z", updatedAt: "2026-02-05T16:00:00Z",
        client: { id: "9261", name: "Tech Solutions ME", cnpj: "45.678.901/0001-23", cpf: null, type: "PESSOA_JURIDICA", city: "Belo Horizonte", ownerPhone: "(31) 3456-7890", ownerEmail: "ricardo@techsolutions.com.br" },
        assignedTo: { id: "user-1", name: "Pedro Braga", email: "pedrobraga2016@gmail.com" },
        apontamentos: SAMPLE_APONTAMENTOS.t004 || [], comments: SAMPLE_COMMENTS.t004 || [],
    },
    t005: {
        id: "t005", ticketDescription: "Dúvida sobre como cadastrar novo produto no sistema",
        ticketStatus: "CLOSED", ticketPriority: "LOW", ticketType: "SUPPORT",
        ticketResolutionDate: "2026-02-10T17:00:00Z", reopenCount: 0, reopenReason: null, reopenDate: null, reopenById: null,
        assignedToId: "user-1", clientId: "9151", createdAt: "2026-02-03T11:00:00Z", updatedAt: "2026-02-10T17:00:00Z",
        client: { id: "9151", name: "Carlos Mendes", cnpj: null, cpf: "456.789.012-33", type: "PESSOA_FISICA", city: "Curitiba", ownerPhone: "(41) 99876-5432", ownerEmail: "carlos.mendes@email.com" },
        assignedTo: { id: "user-1", name: "Pedro Braga", email: "pedrobraga2016@gmail.com" },
        apontamentos: SAMPLE_APONTAMENTOS.t005 || [], comments: [],
    },
    t006: {
        id: "t006", ticketDescription: "Solicitação de proposta para módulo de logística",
        ticketStatus: "NOVO", ticketPriority: "HIGH", ticketType: "SALES",
        ticketResolutionDate: null, reopenCount: 0, reopenReason: null, reopenDate: null, reopenById: null,
        assignedToId: null, clientId: "8861", createdAt: "2026-02-07T13:00:00Z", updatedAt: "2026-02-07T13:00:00Z",
        client: { id: "8861", name: "Distribuidora Norte Ltda", cnpj: "67.890.123/0001-45", cpf: null, type: "PESSOA_JURIDICA", city: "Porto Alegre", ownerPhone: "(51) 3210-9876", ownerEmail: "fernando@distnorte.com.br" },
        assignedTo: null, apontamentos: [], comments: [],
    },
    t007: {
        id: "t007", ticketDescription: "Problema na emissão de boletos bancários",
        ticketStatus: "PENDING_EMPRESS", ticketPriority: "MEDIUM", ticketType: "SUPPORT",
        ticketResolutionDate: null, reopenCount: 0, reopenReason: null, reopenDate: null, reopenById: null,
        assignedToId: "user-1", clientId: "8829", createdAt: "2026-02-10T10:30:00Z", updatedAt: "2026-02-12T09:00:00Z",
        client: { id: "8829", name: "Ana Paula Costa", cnpj: null, cpf: "789.012.345-66", type: "PESSOA_FISICA", city: "Brasília", ownerPhone: "(61) 98765-1234", ownerEmail: "ana.costa@email.com" },
        assignedTo: { id: "user-1", name: "Pedro Braga", email: "pedrobraga2016@gmail.com" },
        apontamentos: SAMPLE_APONTAMENTOS.t007 || [], comments: SAMPLE_COMMENTS.t007 || [],
    },
    t008: {
        id: "t008", ticketDescription: "Migração de dados do sistema legado para o novo ERP",
        ticketStatus: "IN_PROGRESS", ticketPriority: "HIGH", ticketType: "MAINTENCE",
        ticketResolutionDate: null, reopenCount: 0, reopenReason: null, reopenDate: null, reopenById: null,
        assignedToId: null, clientId: "8811", createdAt: "2026-02-04T15:00:00Z", updatedAt: "2026-02-15T10:00:00Z",
        client: { id: "8811", name: "Logística Express SA", cnpj: "89.012.345/0001-67", cpf: null, type: "PESSOA_JURIDICA", city: "Salvador", ownerPhone: "(71) 3456-0987", ownerEmail: "marcos@logexpress.com.br" },
        assignedTo: null, apontamentos: [], comments: [],
    },
    t009: {
        id: "t009", ticketDescription: "Treinamento sobre funcionalidades do dashboard",
        ticketStatus: "CLOSED", ticketPriority: "LOW", ticketType: "SUPPORT",
        ticketResolutionDate: "2026-02-15T18:00:00Z", reopenCount: 0, reopenReason: null, reopenDate: null, reopenById: null,
        assignedToId: "user-1", clientId: "8013", createdAt: "2026-02-11T08:00:00Z", updatedAt: "2026-02-15T18:00:00Z",
        client: { id: "8013", name: "Roberto Almeida", cnpj: null, cpf: "012.345.678-99", type: "PESSOA_FISICA", city: "Recife", ownerPhone: "(81) 99654-3210", ownerEmail: "roberto.almeida@email.com" },
        assignedTo: { id: "user-1", name: "Pedro Braga", email: "pedrobraga2016@gmail.com" },
        apontamentos: SAMPLE_APONTAMENTOS.t009 || [], comments: [],
    },
    t010: {
        id: "t010", ticketDescription: "Configuração de integração com gateway de pagamento",
        ticketStatus: "NOVO", ticketPriority: "MEDIUM", ticketType: "FINANCE",
        ticketResolutionDate: null, reopenCount: 0, reopenReason: null, reopenDate: null, reopenById: null,
        assignedToId: null, clientId: "7791", createdAt: "2026-02-14T12:00:00Z", updatedAt: "2026-02-14T12:00:00Z",
        client: { id: "7791", name: "Padaria Central ME", cnpj: "23.456.789/0001-01", cpf: null, type: "PESSOA_JURIDICA", city: "Belém", ownerPhone: "(91) 3321-6540", ownerEmail: "antonio@padariacentral.com.br" },
        assignedTo: null, apontamentos: [], comments: [],
    },
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
    const ticket = SAMPLE_TICKETS[id]

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

    const handleCopy = (text: string, label: string) => {
        copyToClipboard(text)
        setCopied(label)
        setTimeout(() => setCopied(null), 2000)
    }

    if (!ticket) {
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

    const status = ticket.ticketStatus || "NOVO"
    const priority = ticket.ticketPriority || "MEDIUM"
    const type = ticket.ticketType || "SUPPORT"
    const transitions = STATUS_TRANSITIONS[status]
    const totalMinutes = ticket.apontamentos.reduce((sum, a) => sum + a.duration, 0)
    const isAssignedToMe = ticket.assignedToId === "user-1"
    const clientDoc = ticket.client.cnpj || ticket.client.cpf || "—"
    const totalComments = ticket.comments.reduce((s, c) => s + 1 + c.replies.length, 0)

    return (
        <div className="h-full overflow-hidden bg-gray-50/50">
            {/* Top bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => router.push("/dashboard/tickets")} className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"><ArrowLeft size={16} /></button>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs font-mono text-gray-400 shrink-0">{ticket.id.toUpperCase()}</span>
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
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-sm font-medium text-gray-900">{ticket.client.name}</span>
                            <span className="text-[10px] text-gray-400">{formatDate(ticket.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{ticket.ticketDescription}</p>
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
                            ticket.apontamentos.map((a, i) => (
                                <div key={a.id} className={`px-4 py-3 ${i < ticket.apontamentos.length - 1 ? "border-b border-gray-50" : ""}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium text-gray-900">{a.user.name}</span>
                                        <span className="text-[10px] text-gray-400">{formatDate(a.date)}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">{a.description}</p>
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
                                    onKeyDown={(e) => { if (e.key === "Enter" && newComment.trim()) { console.log("New comment:", newComment); setNewComment("") } }}
                                    className="flex-1 h-8 text-xs" />
                                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 px-2.5" disabled={!newComment.trim()}
                                    onClick={() => { console.log("New comment:", newComment); setNewComment("") }}><Send size={12} /></Button>
                            </div>
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
                                                onKeyDown={(e) => { if (e.key === "Enter" && replyContent.trim()) { console.log("Reply:", comment.id, replyContent); setReplyContent(""); setReplyingTo(null) } }}
                                                className="flex-1 h-7 text-[10px]" autoFocus />
                                            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white h-7 px-2" disabled={!replyContent.trim()}
                                                onClick={() => { console.log("Reply:", comment.id, replyContent); setReplyContent(""); setReplyingTo(null) }}><Send size={10} /></Button>
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
                    <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setShowClaimModal(false)}>Cancelar</Button><Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => { console.log("Claiming:", ticket.id); setShowClaimModal(false) }}>Confirmar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={showReopenModal} onOpenChange={setShowReopenModal}>
                <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Reabrir Ticket</DialogTitle><DialogDescription>Informe o motivo para reabrir este ticket.</DialogDescription></DialogHeader>
                    <Textarea placeholder="Motivo da reabertura..." value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} className="min-h-25" />
                    <DialogFooter className="gap-2"><Button variant="outline" onClick={() => { setShowReopenModal(false); setReopenReason("") }}>Cancelar</Button><Button className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={!reopenReason.trim()} onClick={() => { console.log("Reopening:", ticket.id, reopenReason); setShowReopenModal(false); setReopenReason("") }}>Reabrir</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
                <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Fechar Ticket</DialogTitle><DialogDescription>Tem certeza que deseja fechar este ticket?</DialogDescription></DialogHeader>
                    <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setShowCloseModal(false)}>Cancelar</Button><Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { console.log("Closing:", ticket.id); setShowCloseModal(false) }}>Fechar Ticket</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={showAssignModal} onOpenChange={(open) => { setShowAssignModal(open); if (!open) setSelectedUserId("") }}>
                <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Atribuir Ticket</DialogTitle><DialogDescription>Selecione o responsável.</DialogDescription></DialogHeader>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}><SelectTrigger className="w-full"><SelectValue placeholder="Selecione um usuário" /></SelectTrigger><SelectContent>{SAMPLE_USERS.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}</SelectContent></Select>
                    <DialogFooter className="gap-2"><Button variant="outline" onClick={() => { setShowAssignModal(false); setSelectedUserId("") }}>Cancelar</Button><Button className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={!selectedUserId} onClick={() => { console.log("Assigning:", selectedUserId); setShowAssignModal(false); setSelectedUserId("") }}>Atribuir</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={showTransferModal} onOpenChange={(open) => { setShowTransferModal(open); if (!open) setSelectedUserId("") }}>
                <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Transferir Ticket</DialogTitle><DialogDescription>Selecione para quem transferir.</DialogDescription></DialogHeader>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}><SelectTrigger className="w-full"><SelectValue placeholder="Selecione um usuário" /></SelectTrigger><SelectContent>{SAMPLE_USERS.filter((u) => u.id !== ticket.assignedToId).map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}</SelectContent></Select>
                    <DialogFooter className="gap-2"><Button variant="outline" onClick={() => { setShowTransferModal(false); setSelectedUserId("") }}>Cancelar</Button><Button className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={!selectedUserId} onClick={() => { console.log("Transferring:", selectedUserId); setShowTransferModal(false); setSelectedUserId("") }}>Transferir</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={showChangeClientModal} onOpenChange={setShowChangeClientModal}>
                <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Mudar Cliente</DialogTitle><DialogDescription>Esta funcionalidade será implementada em breve.</DialogDescription></DialogHeader>
                    <DialogFooter><Button variant="outline" onClick={() => setShowChangeClientModal(false)}>Fechar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={showApontamentoModal} onOpenChange={(open) => { if (!open) { setShowApontamentoModal(false); setApontDesc(""); setApontDuration(""); setApontStatusChange("") } }}>
                <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Novo Apontamento</DialogTitle><DialogDescription>Registre o trabalho realizado.</DialogDescription></DialogHeader>
                    <div className="space-y-3">
                        <Textarea placeholder="Descreva o trabalho realizado..." value={apontDesc} onChange={(e) => setApontDesc(e.target.value)} className="min-h-25" />
                        <Select value={apontCategory} onValueChange={(v) => setApontCategory(v as ApontamentoCategory)}><SelectTrigger className="w-full"><SelectValue placeholder="Categoria" /></SelectTrigger><SelectContent>{(Object.keys(categoryLabels) as ApontamentoCategory[]).map((cat) => (<SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>))}</SelectContent></Select>
                        <div className="grid grid-cols-2 gap-3"><Input type="number" placeholder="Duração (min)" value={apontDuration} onChange={(e) => setApontDuration(e.target.value)} min={1} /><Input type="datetime-local" value={apontDate} onChange={(e) => setApontDate(e.target.value)} /></div>
                        <Select value={apontStatusChange} onValueChange={(v) => setApontStatusChange(v as TicketStatus | "")}><SelectTrigger className="w-full"><SelectValue placeholder="Alterar status (opcional)" /></SelectTrigger><SelectContent><SelectItem value="none">Manter status atual</SelectItem>{transitions.map((s) => (<SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>))}</SelectContent></Select>
                    </div>
                    <DialogFooter className="gap-2"><Button variant="outline" onClick={() => { setShowApontamentoModal(false); setApontDesc(""); setApontDuration(""); setApontStatusChange("") }}>Cancelar</Button>
                        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={!apontDesc.trim() || !apontDuration} onClick={() => { console.log("Creating apontamento:", { description: apontDesc, category: apontCategory, duration: parseInt(apontDuration), date: apontDate, statusChange: apontStatusChange || null }); setShowApontamentoModal(false); setApontDesc(""); setApontDuration(""); setApontStatusChange("") }}>Salvar</Button>
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
