"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Copy, MessageCircle, FileText, Users } from "lucide-react"

interface ClientSummary {
    id: string
    name: string
    type: "PF" | "PJ"
    city: string
}

interface FirmDetail {
    id: string
    name: string
    cnpj: string
    phone: string
    email: string
    address: string
    city: string
    state: string
    zipCode: string
    neighborhood: string
    complement: string
    ie: string | null
    type: "PF" | "PJ"
    createdAt: string
    clients: ClientSummary[]
}

const SAMPLE: Record<string, FirmDetail> = {
    c001: { id: "c001", name: "Contábil Souza & Associados", cnpj: "12.345.678/0001-90", phone: "(11) 3456-7890", email: "contato@souzacontabil.com.br", address: "Av. Paulista, 1000", city: "São Paulo", state: "SP", zipCode: "01310-200", neighborhood: "Bela Vista", complement: "Conj. 501", ie: "123.456.789.000", type: "PJ", createdAt: "2021-06-10T08:00:00Z", clients: [{ id: "9374", name: "Empresa ABC Ltda", type: "PJ", city: "São Paulo" }, { id: "9261", name: "Tech Solutions ME", type: "PJ", city: "Belo Horizonte" }, { id: "8861", name: "Distribuidora Norte Ltda", type: "PJ", city: "Porto Alegre" }, { id: "7791", name: "Padaria Central ME", type: "PJ", city: "Belém" }, { id: "9462", name: "João Silva", type: "PF", city: "São Paulo" }] },
    c002: { id: "c002", name: "Escritório Oliveira Contabilidade", cnpj: "23.456.789/0001-01", phone: "(21) 2345-6789", email: "oliveira@contabil.com.br", address: "Rua Copacabana, 456", city: "Rio de Janeiro", state: "RJ", zipCode: "22020-001", neighborhood: "Copacabana", complement: "", ie: null, type: "PJ", createdAt: "2022-03-15T08:00:00Z", clients: [{ id: "9462", name: "João Silva", type: "PF", city: "São Paulo" }, { id: "9359", name: "Maria Oliveira", type: "PF", city: "Rio de Janeiro" }, { id: "8829", name: "Ana Paula Costa", type: "PF", city: "Brasília" }] },
    c003: { id: "c003", name: "Contabilidade Moderna Ltda", cnpj: "34.567.890/0001-12", phone: "(31) 3456-7890", email: "moderna@contabil.com.br", address: "Rua da Bahia, 789", city: "Belo Horizonte", state: "MG", zipCode: "30160-011", neighborhood: "Funcionários", complement: "Sala 302", ie: "456.789.012/0001", type: "PJ", createdAt: "2020-10-28T08:00:00Z", clients: [{ id: "9261", name: "Tech Solutions ME", type: "PJ", city: "Belo Horizonte" }, { id: "8811", name: "Logística Express SA", type: "PJ", city: "Salvador" }] },
    c004: { id: "c004", name: "Ana Costa Contabilidade", cnpj: "45.678.901/0001-23", phone: "(41) 4567-8901", email: "ana@costacontabil.com.br", address: "Rua XV de Novembro, 321", city: "Curitiba", state: "PR", zipCode: "80020-310", neighborhood: "Centro", complement: "", ie: null, type: "PJ", createdAt: "2022-10-06T08:00:00Z", clients: [{ id: "8861", name: "Distribuidora Norte Ltda", type: "PJ", city: "Porto Alegre" }, { id: "9151", name: "Carlos Mendes", type: "PF", city: "Curitiba" }, { id: "8013", name: "Roberto Almeida", type: "PF", city: "Recife" }, { id: "7791", name: "Padaria Central ME", type: "PJ", city: "Belém" }] },
    c005: { id: "c005", name: "Carlos Mendes Contador", cnpj: "123.456.789-00", phone: "(51) 5678-9012", email: "carlos@mendescontador.com.br", address: "Av. Ipiranga, 567", city: "Porto Alegre", state: "RS", zipCode: "90160-093", neighborhood: "Azenha", complement: "", ie: null, type: "PF", createdAt: "2023-01-31T08:00:00Z", clients: [{ id: "9151", name: "Carlos Mendes", type: "PF", city: "Curitiba" }] },
    c006: { id: "c006", name: "Contábil Express", cnpj: "56.789.012/0001-34", phone: "(11) 9876-5432", email: "express@contabil.com.br", address: "Rua Augusta, 500", city: "São Paulo", state: "SP", zipCode: "01305-000", neighborhood: "Consolação", complement: "", ie: "789.012.345/0001", type: "PJ", createdAt: "2021-11-07T08:00:00Z", clients: [{ id: "8811", name: "Logística Express SA", type: "PJ", city: "Salvador" }, { id: "9374", name: "Empresa ABC Ltda", type: "PJ", city: "São Paulo" }, { id: "8829", name: "Ana Paula Costa", type: "PF", city: "Brasília" }] },
    c007: { id: "c007", name: "Escritório Fiscal Norte", cnpj: "67.890.123/0001-45", phone: "(92) 3456-7890", email: "norte@fiscal.com.br", address: "Av. Eduardo Ribeiro, 100", city: "Manaus", state: "AM", zipCode: "69010-001", neighborhood: "Centro", complement: "Sala 12", ie: null, type: "PJ", createdAt: "2023-02-11T08:00:00Z", clients: [{ id: "8829", name: "Ana Paula Costa", type: "PF", city: "Brasília" }, { id: "8013", name: "Roberto Almeida", type: "PF", city: "Recife" }] },
}

function getInitials(name: string) { return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() }
function copyToClipboard(text: string) { navigator.clipboard.writeText(text) }
function cleanPhone(phone: string) { return phone.replace(/\D/g, "") }
function formatDateShort(dateStr: string) { return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) }

export default function AccountingDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const firm = SAMPLE[id]
    const [copied, setCopied] = useState<string | null>(null)

    const handleCopy = (text: string, label: string) => { copyToClipboard(text); setCopied(label); setTimeout(() => setCopied(null), 2000) }

    if (!firm) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-gray-800 mb-2">Escritório não encontrado</h2>
                    <p className="text-sm text-gray-500 mb-4">O escritório com ID &quot;{id}&quot; não existe.</p>
                    <Button onClick={() => router.push("/dashboard/contabilidade")} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm">Voltar</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full overflow-hidden bg-gray-50/50">
            {/* Top bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => router.push("/dashboard/contabilidade")} className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"><ArrowLeft size={16} /></button>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-blue-600`}>{getInitials(firm.name)}</div>
                    <h1 className="text-sm font-semibold text-gray-900 truncate">{firm.name}</h1>
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-blue-600">{firm.clients.length} clientes</span>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-all cursor-pointer"><FileText size={12} /> Editar</button>
            </div>

            {/* Two-column layout */}
            <div className="flex h-[calc(100%-49px)]">

                {/* ── Left: Main content ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* Endereço */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Endereço</p>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            <Prop label="Logradouro" value={firm.address} />
                            <Prop label="Bairro" value={firm.neighborhood} />
                            <Prop label="Cidade" value={`${firm.city} — ${firm.state}`} />
                            <Prop label="CEP" value={firm.zipCode} />
                            {firm.complement && <Prop label="Complemento" value={firm.complement} />}
                        </div>
                    </div>

                    {/* Clientes Atendidos */}
                    <div className="bg-white border border-gray-200 rounded-xl">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users size={13} className="text-gray-400" />
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clientes Atendidos</p>
                            </div>
                            <span className="text-[10px] text-gray-400">{firm.clients.length}</span>
                        </div>
                        {firm.clients.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                <Users size={20} className="mb-1.5 text-gray-300" />
                                <p className="text-xs">Nenhum cliente vinculado</p>
                            </div>
                        ) : (
                            firm.clients.map((client) => (
                                <Link key={client.id} href={`/dashboard/clientes/${client.id}`} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors">
                                    <Avatar className="h-7 w-7 shrink-0">
                                        <AvatarFallback className={`text-[10px] font-bold text-white bg-blue-600`}>
                                            {getInitials(client.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900">{client.name}</p>
                                        <p className="text-[10px] text-gray-400">{client.city} · {client.type === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"}</p>
                                    </div>
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white ${client.type === "PJ" ? "bg-blue-600" : "bg-gray-400"}`}>{client.type}</span>
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
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white mx-auto mb-2 bg-blue-600`}>{getInitials(firm.name)}</div>
                            <p className="text-sm font-semibold text-gray-900">{firm.name}</p>
                            <p className="text-xs text-gray-400">{firm.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}</p>
                        </div>

                        {/* Properties */}
                        <div className="space-y-3">
                            <SidebarProp label="ID" value={<span className="font-mono text-xs">{firm.id}</span>} />
                            <SidebarProp label={firm.type === "PF" ? "CPF" : "CNPJ"} value={
                                <div className="flex items-center gap-1">
                                    <span className="text-xs">{firm.cnpj}</span>
                                    <button onClick={() => handleCopy(firm.cnpj, "cnpj")} className="text-gray-300 hover:text-gray-500 cursor-pointer">{copied === "cnpj" ? <span className="text-[10px] text-emerald-500">✓</span> : <Copy size={10} />}</button>
                                </div>
                            } />
                            {firm.ie && <SidebarProp label="IE" value={<span className="text-xs">{firm.ie}</span>} />}
                            <SidebarProp label="Telefone" value={
                                <div className="flex items-center gap-1">
                                    <span className="text-xs">{firm.phone}</span>
                                    <button onClick={() => window.open(`https://wa.me/55${cleanPhone(firm.phone)}`, "_blank")} className="text-gray-300 hover:text-emerald-500 cursor-pointer"><MessageCircle size={10} /></button>
                                    <button onClick={() => handleCopy(firm.phone, "phone")} className="text-gray-300 hover:text-gray-500 cursor-pointer">{copied === "phone" ? <span className="text-[10px] text-emerald-500">✓</span> : <Copy size={10} />}</button>
                                </div>
                            } />
                            <SidebarProp label="Email" value={
                                <div className="flex items-center gap-1">
                                    <span className="text-xs truncate max-w-35">{firm.email}</span>
                                    <button onClick={() => handleCopy(firm.email, "email")} className="text-gray-300 hover:text-gray-500 cursor-pointer shrink-0">{copied === "email" ? <span className="text-[10px] text-emerald-500">✓</span> : <Copy size={10} />}</button>
                                </div>
                            } />
                            <SidebarProp label="Cidade" value={<span className="text-xs">{firm.city}/{firm.state}</span>} />
                            <SidebarProp label="Clientes" value={<span className="text-xs">{firm.clients.length}</span>} />
                            <SidebarProp label="Cadastro" value={<span className="text-xs">{formatDateShort(firm.createdAt)}</span>} />
                        </div>
                    </div>
                </div>
            </div>
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
