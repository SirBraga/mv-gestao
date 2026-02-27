"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Copy, MessageCircle, FileText, Package, Users, CheckCircle, PauseCircle, XCircle } from "lucide-react"

type ProductStatus = "ATIVO" | "INATIVO" | "SUSPENSO"

interface ClientSummary { id: string; name: string; type: "PF" | "PJ"; city: string; phone: string; email: string }

interface ProductDetail {
    id: string; name: string; description: string | null
    category: string | null; status: ProductStatus; price: number
    supportContact: string | null; createdAt: string
    clients: ClientSummary[]
}

const SAMPLE_PRODUCTS: Record<string, ProductDetail> = {
    p001: { id: "p001", name: "ERP Gestão Completa", description: "Sistema ERP completo para gestão empresarial, incluindo módulos de estoque, financeiro, contábil e RH.", category: "ERP", status: "ATIVO", price: 1200.00, supportContact: "suporte@mv.com.br", createdAt: "2025-01-15T08:00:00Z", clients: [{ id: "9374", name: "Empresa ABC Ltda", type: "PJ", city: "São Paulo", phone: "(11) 3344-5566", email: "carlos@empresaabc.com.br" }, { id: "9261", name: "Tech Solutions ME", type: "PJ", city: "Belo Horizonte", phone: "(31) 3456-7890", email: "ricardo@techsolutions.com.br" }, { id: "8861", name: "Distribuidora Norte Ltda", type: "PJ", city: "Porto Alegre", phone: "(51) 3210-9876", email: "fernando@distnorte.com.br" }, { id: "7791", name: "Padaria Central ME", type: "PJ", city: "Belém", phone: "(91) 3321-6540", email: "antonio@padariacentral.com.br" }, { id: "9462", name: "João Silva", type: "PF", city: "São Paulo", phone: "(11) 98765-4321", email: "joao.silva@email.com" }] },
    p002: { id: "p002", name: "Módulo Estoque", description: "Módulo de controle de estoque integrado ao ERP com rastreabilidade e alertas de reposição.", category: "Módulo", status: "ATIVO", price: 350.00, supportContact: "suporte@mv.com.br", createdAt: "2025-03-10T08:00:00Z", clients: [{ id: "9261", name: "Tech Solutions ME", type: "PJ", city: "Belo Horizonte", phone: "(31) 3456-7890", email: "ricardo@techsolutions.com.br" }, { id: "8861", name: "Distribuidora Norte Ltda", type: "PJ", city: "Porto Alegre", phone: "(51) 3210-9876", email: "fernando@distnorte.com.br" }, { id: "8811", name: "Logística Express SA", type: "PJ", city: "Salvador", phone: "(71) 3456-0987", email: "marcos@logexpress.com.br" }] },
    p003: { id: "p003", name: "Módulo Financeiro", description: "Gestão financeira completa: contas a pagar, receber, fluxo de caixa e conciliação bancária.", category: "Módulo", status: "ATIVO", price: 450.00, supportContact: "suporte@mv.com.br", createdAt: "2025-04-01T08:00:00Z", clients: [{ id: "9374", name: "Empresa ABC Ltda", type: "PJ", city: "São Paulo", phone: "(11) 3344-5566", email: "carlos@empresaabc.com.br" }, { id: "8861", name: "Distribuidora Norte Ltda", type: "PJ", city: "Porto Alegre", phone: "(51) 3210-9876", email: "fernando@distnorte.com.br" }, { id: "7791", name: "Padaria Central ME", type: "PJ", city: "Belém", phone: "(91) 3321-6540", email: "antonio@padariacentral.com.br" }, { id: "9151", name: "Carlos Mendes", type: "PF", city: "Curitiba", phone: "(41) 99876-5432", email: "carlos.mendes@email.com" }] },
    p004: { id: "p004", name: "Módulo Contábil", description: "Escrituração contábil e fiscal automatizada com geração de SPED e obrigações acessórias.", category: "Módulo", status: "ATIVO", price: 500.00, supportContact: "suporte@mv.com.br", createdAt: "2025-04-15T08:00:00Z", clients: [{ id: "9374", name: "Empresa ABC Ltda", type: "PJ", city: "São Paulo", phone: "(11) 3344-5566", email: "carlos@empresaabc.com.br" }, { id: "9261", name: "Tech Solutions ME", type: "PJ", city: "Belo Horizonte", phone: "(31) 3456-7890", email: "ricardo@techsolutions.com.br" }] },
    p005: { id: "p005", name: "Dashboard Analytics", description: "Painel de indicadores e relatórios gerenciais com gráficos interativos e exportação.", category: "Analytics", status: "INATIVO", price: 280.00, supportContact: null, createdAt: "2025-05-20T08:00:00Z", clients: [{ id: "8811", name: "Logística Express SA", type: "PJ", city: "Salvador", phone: "(71) 3456-0987", email: "marcos@logexpress.com.br" }] },
    p006: { id: "p006", name: "Gateway de Pagamento", description: "Integração com meios de pagamento: boleto, PIX, cartão de crédito e débito.", category: "Integração", status: "ATIVO", price: 200.00, supportContact: "suporte@mv.com.br", createdAt: "2025-06-01T08:00:00Z", clients: [{ id: "7791", name: "Padaria Central ME", type: "PJ", city: "Belém", phone: "(91) 3321-6540", email: "antonio@padariacentral.com.br" }, { id: "9374", name: "Empresa ABC Ltda", type: "PJ", city: "São Paulo", phone: "(11) 3344-5566", email: "carlos@empresaabc.com.br" }, { id: "8829", name: "Ana Paula Costa", type: "PF", city: "Brasília", phone: "(61) 98765-1234", email: "ana.costa@email.com" }, { id: "9462", name: "João Silva", type: "PF", city: "São Paulo", phone: "(11) 98765-4321", email: "joao.silva@email.com" }, { id: "9151", name: "Carlos Mendes", type: "PF", city: "Curitiba", phone: "(41) 99876-5432", email: "carlos.mendes@email.com" }, { id: "8013", name: "Roberto Almeida", type: "PF", city: "Recife", phone: "(81) 99654-3210", email: "roberto.almeida@email.com" }] },
    p007: { id: "p007", name: "Módulo Logística", description: "Controle de rotas, entregas e frota com rastreamento em tempo real.", category: "Módulo", status: "SUSPENSO", price: 600.00, supportContact: null, createdAt: "2025-07-10T08:00:00Z", clients: [] },
    p008: { id: "p008", name: "App Mobile", description: "Aplicativo mobile para gestão em campo com acesso offline e sincronização automática.", category: "Mobile", status: "ATIVO", price: 150.00, supportContact: "suporte@mv.com.br", createdAt: "2025-08-05T08:00:00Z", clients: [{ id: "9151", name: "Carlos Mendes", type: "PF", city: "Curitiba", phone: "(41) 99876-5432", email: "carlos.mendes@email.com" }, { id: "8829", name: "Ana Paula Costa", type: "PF", city: "Brasília", phone: "(61) 98765-1234", email: "ana.costa@email.com" }, { id: "9261", name: "Tech Solutions ME", type: "PJ", city: "Belo Horizonte", phone: "(31) 3456-7890", email: "ricardo@techsolutions.com.br" }] },
}

const statusBadge: Record<ProductStatus, string> = { ATIVO: "bg-emerald-500", INATIVO: "bg-gray-400", SUSPENSO: "bg-amber-500" }
const statusLabels: Record<ProductStatus, string> = { ATIVO: "Ativo", INATIVO: "Inativo", SUSPENSO: "Suspenso" }
const categoryBadge: Record<string, string> = { ERP: "bg-sky-500", "Módulo": "bg-violet-500", Analytics: "bg-cyan-500", "Integração": "bg-emerald-500", Mobile: "bg-rose-500" }

function getInitials(name: string) { return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() }
function formatPrice(price: number) { return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) }
function copyToClipboard(text: string) { navigator.clipboard.writeText(text) }
function cleanPhone(phone: string) { return phone.replace(/\D/g, "") }
function formatDate(d: string) { return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) }

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const product = SAMPLE_PRODUCTS[id]
    const [copied, setCopied] = useState<string | null>(null)
    const [showActivateModal, setShowActivateModal] = useState(false)
    const [showSuspendModal, setShowSuspendModal] = useState(false)

    const handleCopy = (text: string, label: string) => { copyToClipboard(text); setCopied(label); setTimeout(() => setCopied(null), 2000) }

    if (!product) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-gray-800 mb-2">Produto não encontrado</h2>
                    <p className="text-sm text-gray-500 mb-4">O produto com ID &quot;{id}&quot; não existe.</p>
                    <Button onClick={() => router.push("/dashboard/produtos")} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm">Voltar</Button>
                </div>
            </div>
        )
    }

    const status = product.status

    return (
        <div className="h-full overflow-hidden bg-gray-50/50">
            {/* Top bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => router.push("/dashboard/produtos")} className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"><ArrowLeft size={16} /></button>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Package size={14} className="text-gray-400 shrink-0" />
                    <h1 className="text-sm font-semibold text-gray-900 truncate">{product.name}</h1>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${statusBadge[status]}`}>{statusLabels[status]}</span>
                    {product.category && <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${categoryBadge[product.category] || "bg-gray-400"}`}>{product.category}</span>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {status !== "ATIVO" && <button onClick={() => setShowActivateModal(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-emerald-600 text-[11px] font-medium hover:bg-gray-50 transition-all cursor-pointer"><CheckCircle size={11} /> Ativar</button>}
                    {status === "ATIVO" && <button onClick={() => setShowSuspendModal(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-amber-600 text-[11px] font-medium hover:bg-gray-50 transition-all cursor-pointer"><PauseCircle size={11} /> Suspender</button>}
                    {status !== "INATIVO" && <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-red-500 text-[11px] font-medium hover:bg-gray-50 transition-all cursor-pointer"><XCircle size={11} /> Desativar</button>}
                    <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-[11px] font-medium hover:bg-gray-50 transition-all cursor-pointer"><FileText size={11} /> Editar</button>
                </div>
            </div>

            {/* Two-column layout */}
            <div className="flex h-[calc(100%-49px)]">

                {/* ── Left: Main content ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* Description */}
                    {product.description && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Descrição</p>
                            <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
                        </div>
                    )}

                    {/* Detalhes */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Detalhes</p>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            <Prop label="Preço mensal" value={formatPrice(product.price)} />
                            <Prop label="Categoria" value={product.category || "—"} />
                            <Prop label="Cadastro" value={formatDate(product.createdAt)} />
                            {product.supportContact && <Prop label="Suporte" value={product.supportContact} />}
                        </div>
                    </div>

                    {/* Clientes */}
                    <div className="bg-white border border-gray-200 rounded-xl">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users size={13} className="text-gray-400" />
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clientes que usam este produto</p>
                            </div>
                            <span className="text-[10px] text-gray-400">{product.clients.length}</span>
                        </div>
                        {product.clients.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                <Users size={20} className="mb-1.5 text-gray-300" />
                                <p className="text-xs">Nenhum cliente vinculado</p>
                            </div>
                        ) : (
                            product.clients.map((client) => (
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
                        <div className="text-center pb-4 border-b border-gray-100">
                            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-2"><Package size={22} className="text-gray-400" /></div>
                            <p className="text-sm font-semibold text-gray-900">{product.name}</p>
                            {product.category && <p className="text-xs text-gray-400">{product.category}</p>}
                        </div>
                        <div className="space-y-3">
                            <SidebarProp label="ID" value={<span className="font-mono text-xs">{product.id}</span>} />
                            <SidebarProp label="Status" value={<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${statusBadge[status]}`}>{statusLabels[status]}</span>} />
                            <SidebarProp label="Preço" value={<span className="text-xs font-semibold">{formatPrice(product.price)}</span>} />
                            {product.category && <SidebarProp label="Categoria" value={<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${categoryBadge[product.category] || "bg-gray-400"}`}>{product.category}</span>} />}
                            <SidebarProp label="Clientes" value={<span className="text-xs">{product.clients.length}</span>} />
                            <SidebarProp label="Cadastro" value={<span className="text-xs">{formatDate(product.createdAt)}</span>} />
                            {product.supportContact && <SidebarProp label="Suporte" value={
                                <div className="flex items-center gap-1">
                                    <span className="text-xs truncate max-w-35">{product.supportContact}</span>
                                    <button onClick={() => handleCopy(product.supportContact!, "support")} className="text-gray-300 hover:text-gray-500 cursor-pointer shrink-0">{copied === "support" ? <span className="text-[10px] text-emerald-500">✓</span> : <Copy size={10} />}</button>
                                </div>
                            } />}
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={showActivateModal} onOpenChange={setShowActivateModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Ativar Produto</DialogTitle><DialogDescription>Deseja ativar o produto &quot;{product.name}&quot;?</DialogDescription></DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowActivateModal(false)}>Cancelar</Button>
                        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => { console.log("Activating:", product.id); setShowActivateModal(false) }}>Ativar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showSuspendModal} onOpenChange={setShowSuspendModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Suspender Produto</DialogTitle><DialogDescription>Deseja suspender o produto &quot;{product.name}&quot;?</DialogDescription></DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowSuspendModal(false)}>Cancelar</Button>
                        <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => { console.log("Suspending:", product.id); setShowSuspendModal(false) }}>Suspender</Button>
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
