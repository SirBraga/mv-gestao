"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
    Clock,
    Copy,
    MessageCircle,
    ShieldCheck,
    ShieldX,
    Ticket,
} from "lucide-react"

// ── Types ──
interface ClientDetail {
    id: string
    name: string
    cnpj: string | null
    cpf: string | null
    ie: string | null
    cnae: string | null
    aditionalInfo: string | null
    address: string
    houseNumber: string
    neighborhood: string
    city: string
    zipCode: string
    complement: string
    type: "PF" | "PJ"
    hasContract: boolean | null
    supportReleased: boolean | null
    // owner / socio
    ownerName: string | null
    ownerAddress: string | null
    ownerPhone: string | null
    ownerEmail: string | null
    ownerCpf: string | null
    ownerNeighborhood: string | null
    ownerCity: string | null
    ownerState: string | null
    ownerZipCode: string | null
    // certificate
    certificateExpiresDate: string | null
    certificateType: string | null
    createdAt: string
    tickets: TicketSummary[]
}

interface TicketSummary {
    id: string
    description: string
    status: "NOVO" | "PENDING_CLIENT" | "PENDING_EMPRESS" | "IN_PROGRESS" | "CLOSED"
    priority: "LOW" | "MEDIUM" | "HIGH"
    type: "SUPPORT" | "SALES" | "FINANCE" | "MAINTENCE"
    createdAt: string
    assignedTo: string | null
}

// ── Sample data ──
const SAMPLE_CLIENTS: Record<string, ClientDetail> = {
    "9462": {
        id: "9462", name: "João Silva", cnpj: null, cpf: "123.456.789-00", ie: null, cnae: null,
        aditionalInfo: "Cliente desde 2022. Prefere atendimento por WhatsApp.",
        address: "Rua das Flores", houseNumber: "123", neighborhood: "Centro", city: "São Paulo", zipCode: "01310-100", complement: "Apto 45",
        type: "PF", hasContract: true, supportReleased: true, createdAt: "2022-03-15T08:00:00Z",
        ownerName: null, ownerAddress: null, ownerPhone: "(11) 98765-4321", ownerEmail: "joao.silva@email.com", ownerCpf: null, ownerNeighborhood: null, ownerCity: null, ownerState: null, ownerZipCode: null,
        certificateExpiresDate: null, certificateType: null,
        tickets: [{ id: "t001", description: "Sistema apresentando lentidão ao gerar relatórios mensais", status: "NOVO", priority: "HIGH", type: "SUPPORT", createdAt: "2026-01-15T10:00:00Z", assignedTo: "Pedro Braga" }],
    },
    "9374": {
        id: "9374", name: "Empresa ABC Ltda", cnpj: "12.345.678/0001-99", cpf: null, ie: "123.456.789.000", cnae: "6201-5/01",
        aditionalInfo: "Empresa de desenvolvimento de software. Contrato anual renovado em jan/2026.",
        address: "Av. Paulista", houseNumber: "1000", neighborhood: "Bela Vista", city: "São Paulo", zipCode: "01310-200", complement: "Conj. 501",
        type: "PJ", hasContract: true, supportReleased: true, createdAt: "2021-06-10T08:00:00Z",
        ownerName: "Carlos Eduardo Souza", ownerAddress: "Rua Augusta, 500", ownerPhone: "(11) 3344-5566", ownerEmail: "carlos@empresaabc.com.br", ownerCpf: "321.654.987-00", ownerNeighborhood: "Consolação", ownerCity: "São Paulo", ownerState: "SP", ownerZipCode: "01305-000",
        certificateExpiresDate: "2027-06-10T00:00:00Z", certificateType: "A3",
        tickets: [{ id: "t002", description: "Erro ao importar notas fiscais no módulo contábil", status: "PENDING_CLIENT", priority: "MEDIUM", type: "SUPPORT", createdAt: "2026-01-28T14:30:00Z", assignedTo: null }],
    },
    "9359": {
        id: "9359", name: "Maria Oliveira", cnpj: null, cpf: "987.654.321-11", ie: null, cnae: null,
        aditionalInfo: null,
        address: "Rua Copacabana", houseNumber: "456", neighborhood: "Copacabana", city: "Rio de Janeiro", zipCode: "22020-001", complement: "",
        type: "PF", hasContract: false, supportReleased: false, createdAt: "2023-01-31T08:00:00Z",
        ownerName: null, ownerAddress: null, ownerPhone: "(21) 99887-7665", ownerEmail: "maria.oliveira@email.com", ownerCpf: null, ownerNeighborhood: null, ownerCity: null, ownerState: null, ownerZipCode: null,
        certificateExpiresDate: null, certificateType: null,
        tickets: [{ id: "t003", description: "Divergência nos valores de faturamento do mês de janeiro", status: "NOVO", priority: "HIGH", type: "FINANCE", createdAt: "2026-01-31T09:15:00Z", assignedTo: null }],
    },
    "9261": {
        id: "9261", name: "Tech Solutions ME", cnpj: "45.678.901/0001-23", cpf: null, ie: "456.789.012/0001", cnae: "6202-3/00",
        aditionalInfo: "Empresa de TI. Possui múltiplos módulos contratados.",
        address: "Rua da Bahia", houseNumber: "789", neighborhood: "Funcionários", city: "Belo Horizonte", zipCode: "30160-011", complement: "Sala 302",
        type: "PJ", hasContract: true, supportReleased: true, createdAt: "2020-10-28T08:00:00Z",
        ownerName: "Ricardo Ferreira Lima", ownerAddress: "Av. do Contorno, 1200", ownerPhone: "(31) 3456-7890", ownerEmail: "ricardo@techsolutions.com.br", ownerCpf: "654.321.098-77", ownerNeighborhood: "Savassi", ownerCity: "Belo Horizonte", ownerState: "MG", ownerZipCode: "30110-090",
        certificateExpiresDate: "2026-10-28T00:00:00Z", certificateType: "A1",
        tickets: [{ id: "t004", description: "Atualização do módulo de estoque para nova versão", status: "IN_PROGRESS", priority: "MEDIUM", type: "MAINTENCE", createdAt: "2026-02-01T08:00:00Z", assignedTo: "Pedro Braga" }],
    },
    "9151": {
        id: "9151", name: "Carlos Mendes", cnpj: null, cpf: "456.789.012-33", ie: null, cnae: null,
        aditionalInfo: null,
        address: "Rua XV de Novembro", houseNumber: "321", neighborhood: "Centro", city: "Curitiba", zipCode: "80020-310", complement: "",
        type: "PF", hasContract: true, supportReleased: true, createdAt: "2022-10-06T08:00:00Z",
        ownerName: null, ownerAddress: null, ownerPhone: "(41) 99876-5432", ownerEmail: "carlos.mendes@email.com", ownerCpf: null, ownerNeighborhood: null, ownerCity: null, ownerState: null, ownerZipCode: null,
        certificateExpiresDate: null, certificateType: null,
        tickets: [{ id: "t005", description: "Dúvida sobre como cadastrar novo produto no sistema", status: "CLOSED", priority: "LOW", type: "SUPPORT", createdAt: "2026-02-03T11:00:00Z", assignedTo: "Pedro Braga" }],
    },
    "8861": {
        id: "8861", name: "Distribuidora Norte Ltda", cnpj: "67.890.123/0001-45", cpf: null, ie: "789.012.345/0001", cnae: "4639-7/01",
        aditionalInfo: "Distribuidora com filiais em RS e SC.",
        address: "Av. Ipiranga", houseNumber: "567", neighborhood: "Azenha", city: "Porto Alegre", zipCode: "90160-093", complement: "",
        type: "PJ", hasContract: true, supportReleased: true, createdAt: "2021-11-07T08:00:00Z",
        ownerName: "Fernando Augusto Nunes", ownerAddress: "Rua Garibaldi, 300", ownerPhone: "(51) 3210-9876", ownerEmail: "fernando@distnorte.com.br", ownerCpf: "789.012.345-11", ownerNeighborhood: "Moinhos de Vento", ownerCity: "Porto Alegre", ownerState: "RS", ownerZipCode: "90035-000",
        certificateExpiresDate: "2025-11-07T00:00:00Z", certificateType: "A3",
        tickets: [{ id: "t006", description: "Solicitação de proposta para módulo de logística", status: "NOVO", priority: "HIGH", type: "SALES", createdAt: "2026-02-07T13:00:00Z", assignedTo: null }],
    },
    "8829": {
        id: "8829", name: "Ana Paula Costa", cnpj: null, cpf: "789.012.345-66", ie: null, cnae: null,
        aditionalInfo: null,
        address: "SQN 308 Bloco A", houseNumber: "Ap. 201", neighborhood: "Asa Norte", city: "Brasília", zipCode: "70756-080", complement: "",
        type: "PF", hasContract: true, supportReleased: true, createdAt: "2022-12-10T08:00:00Z",
        ownerName: null, ownerAddress: null, ownerPhone: "(61) 98765-1234", ownerEmail: "ana.costa@email.com", ownerCpf: null, ownerNeighborhood: null, ownerCity: null, ownerState: null, ownerZipCode: null,
        certificateExpiresDate: null, certificateType: null,
        tickets: [{ id: "t007", description: "Problema na emissão de boletos bancários", status: "PENDING_EMPRESS", priority: "MEDIUM", type: "SUPPORT", createdAt: "2026-02-10T10:30:00Z", assignedTo: "Pedro Braga" }],
    },
    "8811": {
        id: "8811", name: "Logística Express SA", cnpj: "89.012.345/0001-67", cpf: null, ie: "012.345.678/0001", cnae: "4930-2/02",
        aditionalInfo: "Empresa de logística e transporte. Contrato suspenso por inadimplência.",
        address: "Av. Tancredo Neves", houseNumber: "1234", neighborhood: "Caminho das Árvores", city: "Salvador", zipCode: "41820-021", complement: "Galpão 3",
        type: "PJ", hasContract: false, supportReleased: false, createdAt: "2021-12-04T08:00:00Z",
        ownerName: "Marcos Antônio Vieira", ownerAddress: "Rua Chile, 800", ownerPhone: "(71) 3456-0987", ownerEmail: "marcos@logexpress.com.br", ownerCpf: "012.345.678-22", ownerNeighborhood: "Centro Histórico", ownerCity: "Salvador", ownerState: "BA", ownerZipCode: "40020-000",
        certificateExpiresDate: "2024-12-04T00:00:00Z", certificateType: "A1",
        tickets: [{ id: "t008", description: "Migração de dados do sistema legado para o novo ERP", status: "IN_PROGRESS", priority: "HIGH", type: "MAINTENCE", createdAt: "2026-02-04T15:00:00Z", assignedTo: null }],
    },
    "8013": {
        id: "8013", name: "Roberto Almeida", cnpj: null, cpf: "012.345.678-99", ie: null, cnae: null,
        aditionalInfo: null,
        address: "Rua da Aurora", houseNumber: "890", neighborhood: "Boa Vista", city: "Recife", zipCode: "50050-000", complement: "",
        type: "PF", hasContract: false, supportReleased: false, createdAt: "2023-02-11T08:00:00Z",
        ownerName: null, ownerAddress: null, ownerPhone: "(81) 99654-3210", ownerEmail: "roberto.almeida@email.com", ownerCpf: null, ownerNeighborhood: null, ownerCity: null, ownerState: null, ownerZipCode: null,
        certificateExpiresDate: null, certificateType: null,
        tickets: [{ id: "t009", description: "Treinamento sobre funcionalidades do dashboard", status: "CLOSED", priority: "LOW", type: "SUPPORT", createdAt: "2026-02-11T08:00:00Z", assignedTo: "Pedro Braga" }],
    },
    "7791": {
        id: "7791", name: "Padaria Central ME", cnpj: "23.456.789/0001-01", cpf: null, ie: "234.567.890/0001", cnae: "1091-1/01",
        aditionalInfo: "Padaria e confeitaria. Contrato mensal.",
        address: "Av. Presidente Vargas", houseNumber: "456", neighborhood: "Campina", city: "Belém", zipCode: "66010-000", complement: "Loja 2",
        type: "PJ", hasContract: true, supportReleased: false, createdAt: "2023-03-04T08:00:00Z",
        ownerName: "Antônio Carlos Pinheiro", ownerAddress: "Tv. Padre Eutíquio, 200", ownerPhone: "(91) 3321-6540", ownerEmail: "antonio@padariacentral.com.br", ownerCpf: "234.567.890-33", ownerNeighborhood: "Batista Campos", ownerCity: "Belém", ownerState: "PA", ownerZipCode: "66025-000",
        certificateExpiresDate: null, certificateType: null,
        tickets: [{ id: "t010", description: "Configuração de integração com gateway de pagamento", status: "NOVO", priority: "MEDIUM", type: "FINANCE", createdAt: "2026-02-14T12:00:00Z", assignedTo: null }],
    },
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
    const client = SAMPLE_CLIENTS[id]

    const [copied, setCopied] = useState<string | null>(null)
    const [showBlockModal, setShowBlockModal] = useState(false)

    const handleCopy = (text: string, label: string) => {
        copyToClipboard(text); setCopied(label); setTimeout(() => setCopied(null), 2000)
    }

    if (!client) {
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

    const openTickets = client.tickets.filter((t) => t.status !== "CLOSED").length
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
                                {client.ownerEmail && <Prop label="Email" value={client.ownerEmail} />}
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
                            client.tickets.map((ticket) => (
                                <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot[ticket.priority]}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 truncate">{ticket.description}</p>
                                        <p className="text-[10px] text-gray-400">{ticket.id} · {formatDateShort(ticket.createdAt)}{ticket.assignedTo ? ` · ${ticket.assignedTo}` : ""}</p>
                                    </div>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0 ${statusBadgeColors[ticket.status]}`}>{statusLabels[ticket.status]}</span>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Right: Properties sidebar ── */}
                <div className="w-72 shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
                    <div className="p-4 space-y-4">

                        {/* Identity */}
                        <div className="text-center pb-4 border-b border-gray-100">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white mx-auto mb-2 bg-blue-600`}>{getInitials(client.name)}</div>
                            <p className="text-sm font-semibold text-gray-900">{client.name}</p>
                            <p className="text-xs text-gray-400">{client.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}</p>
                        </div>

                        {/* Properties */}
                        <div className="space-y-3">
                            <SidebarProp label="ID" value={<span className="font-mono text-xs">{client.id}</span>} />
                            <SidebarProp label={client.cnpj ? "CNPJ" : "CPF"} value={
                                <div className="flex items-center gap-1">
                                    <span className="text-xs">{doc}</span>
                                    <button onClick={() => handleCopy(doc, "doc")} className="text-gray-300 hover:text-gray-500 cursor-pointer">{copied === "doc" ? <span className="text-[10px] text-emerald-500">✓</span> : <Copy size={10} />}</button>
                                </div>
                            } />
                            {client.ie && <SidebarProp label="IE" value={<span className="text-xs">{client.ie}</span>} />}
                            {client.cnae && <SidebarProp label="CNAE" value={<span className="text-xs">{client.cnae}</span>} />}
                            <SidebarProp label="Telefone" value={phone !== "—" ? (
                                <div className="flex items-center gap-1">
                                    <span className="text-xs">{phone}</span>
                                    <button onClick={() => window.open(`https://wa.me/55${cleanPhone(phone)}`, "_blank")} className="text-gray-300 hover:text-emerald-500 cursor-pointer"><MessageCircle size={10} /></button>
                                    <button onClick={() => handleCopy(phone, "phone")} className="text-gray-300 hover:text-gray-500 cursor-pointer">{copied === "phone" ? <span className="text-[10px] text-emerald-500">✓</span> : <Copy size={10} />}</button>
                                </div>
                            ) : <span className="text-xs text-gray-300">—</span>} />
                            <SidebarProp label="Email" value={email !== "—" ? (
                                <div className="flex items-center gap-1">
                                    <span className="text-xs truncate max-w-35">{email}</span>
                                    <button onClick={() => handleCopy(email, "email")} className="text-gray-300 hover:text-gray-500 cursor-pointer shrink-0">{copied === "email" ? <span className="text-[10px] text-emerald-500">✓</span> : <Copy size={10} />}</button>
                                </div>
                            ) : <span className="text-xs text-gray-300">—</span>} />
                            <SidebarProp label="Cidade" value={<span className="text-xs">{client.city}</span>} />
                            <SidebarProp label="Suporte" value={
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${client.supportReleased ? "bg-emerald-500" : "bg-red-400"}`} />
                                    <span className="text-xs">{client.supportReleased ? "Liberado" : "Bloqueado"}</span>
                                </div>
                            } />
                            <SidebarProp label="Contrato" value={
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${client.hasContract ? "bg-emerald-500" : "bg-gray-300"}`} />
                                    <span className="text-xs">{client.hasContract ? "Ativo" : "Sem contrato"}</span>
                                </div>
                            } />
                            <SidebarProp label="Cadastro" value={<span className="text-xs">{formatDateShort(client.createdAt)}</span>} />
                            <SidebarProp label="Tickets" value={<span className="text-xs">{client.tickets.length} ({openTickets} abertos)</span>} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <Dialog open={showBlockModal} onOpenChange={setShowBlockModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{client.supportReleased ? "Bloquear Suporte" : "Liberar Suporte"}</DialogTitle>
                        <DialogDescription>{client.supportReleased ? `Deseja bloquear o suporte para ${client.name}?` : `Deseja liberar o suporte para ${client.name}?`}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowBlockModal(false)}>Cancelar</Button>
                        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => { console.log(client.supportReleased ? "Blocking" : "Unblocking", client.id); setShowBlockModal(false) }}>{client.supportReleased ? "Bloquear" : "Liberar"}</Button>
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
