"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getContabilityById, updateContability, attachClientToContability, deleteContability } from "@/app/actions/contability"
import { getClientSearchOptions } from "@/app/actions/clients"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { maskCPF, maskCNPJ, maskPhone, maskCEP } from "@/app/utils/masks"
import { toast } from "react-toastify"
import { ArrowLeft, Mail, MessageCircle, Users, Check, Copy, Pencil, Save, X, Loader2, Phone, Plus, Search, Trash2, AlertTriangle } from "lucide-react"

const STATES = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]

const INITIAL_FORM = {
    name: "",
    type: "PJ" as "PF" | "PJ",
    cnpj: "",
    cpf: "",
    ie: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    neighborhood: "",
    houseNumber: "",
    complement: "",
}

function formatDateShort(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function cleanPhone(phone: string) { return phone.replace(/\D/g, "") }
function copyToClipboard(text: string) { navigator.clipboard.writeText(text) }
function getInitials(name: string) { return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() }

export default function AccountingDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const queryClient = useQueryClient()
    const [editing, setEditing] = useState(false)
    const [copied, setCopied] = useState<string | null>(null)
    const [cepLoading, setCepLoading] = useState(false)
    const [showLinkClientModal, setShowLinkClientModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [clientSearchQuery, setClientSearchQuery] = useState("")
    const [selectedClientId, setSelectedClientId] = useState("")
    const [editForm, setEditForm] = useState(INITIAL_FORM)

    const { data: firm, isLoading, isError } = useQuery({
        queryKey: ["contability", id],
        queryFn: () => getContabilityById(id),
    })

    const updateMutation = useMutation({
        mutationFn: (data: Parameters<typeof updateContability>[1]) => updateContability(id, data),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["contability", id] })
            await queryClient.invalidateQueries({ queryKey: ["contabilities"] })
            setEditing(false)
            toast.success("Contabilidade atualizada com sucesso!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const deleteMutation = useMutation({
        mutationFn: () => deleteContability(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["contabilities"] })
            toast.success("Contabilidade excluída com sucesso!")
            router.push("/dashboard/contabilidade")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const { data: clientSearchResults, isLoading: isLoadingClientSearch } = useQuery({
        queryKey: ["client-search-options", clientSearchQuery],
        queryFn: () => getClientSearchOptions({ query: clientSearchQuery, limit: 20 }),
        enabled: showLinkClientModal,
        staleTime: 30 * 1000,
    })

    const attachClientMutation = useMutation({
        mutationFn: (clientId: string) => attachClientToContability(id, clientId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["contability", id] })
            await queryClient.invalidateQueries({ queryKey: ["contabilities"] })
            setShowLinkClientModal(false)
            setClientSearchQuery("")
            setSelectedClientId("")
            toast.success("Cliente vinculado com sucesso!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    useEffect(() => {
        if (!firm) return
        setEditForm({
            name: firm.name || "",
            type: firm.type,
            cnpj: firm.cnpj || "",
            cpf: firm.cpf || "",
            ie: firm.ie || "",
            phone: firm.phone || "",
            email: firm.email || "",
            address: firm.address || "",
            city: firm.city || "",
            state: firm.state || "",
            zipCode: firm.zipCode || "",
            neighborhood: firm.neighborhood || "",
            houseNumber: firm.houseNumber || "",
            complement: firm.complement || "",
        })
    }, [firm])

    const fetchViaCEP = async (cep: string) => {
        if (cep.replace(/\D/g, "").length !== 8) return
        setCepLoading(true)
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, "")}/json/`)
            const data = await res.json()
            if (!data.erro) {
                setEditForm((current) => ({
                    ...current,
                    address: data.logradouro || current.address,
                    neighborhood: data.bairro || current.neighborhood,
                    city: data.localidade || current.city,
                    state: data.uf || current.state,
                }))
                return
            }
            toast.error("CEP não encontrado")
        } catch {
            toast.error("Não foi possível buscar o CEP informado")
        } finally {
            setCepLoading(false)
        }
    }

    const handleCopy = (text: string, label: string) => {
        copyToClipboard(text)
        setCopied(label)
        setTimeout(() => setCopied(null), 2000)
    }

    const handleSaveEdit = () => {
        updateMutation.mutate({
            name: editForm.name || undefined,
            type: editForm.type || undefined,
            cnpj: editForm.cnpj || undefined,
            cpf: editForm.cpf || undefined,
            ie: editForm.ie || undefined,
            phone: editForm.phone || undefined,
            email: editForm.email || undefined,
            address: editForm.address || undefined,
            city: editForm.city || undefined,
            state: editForm.state || undefined,
            zipCode: editForm.zipCode || undefined,
            neighborhood: editForm.neighborhood || undefined,
            houseNumber: editForm.houseNumber || undefined,
            complement: editForm.complement || undefined,
        })
    }

    const availableClients = (clientSearchResults?.items || []).filter((client) => !firm?.clients.some((linkedClient) => linkedClient.id === client.id))

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-50">
                <Loader2 size={28} className="animate-spin text-indigo-600" />
            </div>
        )
    }

    if (isError || !firm) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-gray-800 mb-2">Contabilidade não encontrada</h2>
                    <p className="text-sm text-gray-500 mb-4">A contabilidade com ID &quot;{id}&quot; não existe.</p>
                    <Button onClick={() => router.push("/dashboard/contabilidade")} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm">Voltar</Button>
                </div>
            </div>
        )
    }

    const firmName = firm.name || "Contabilidade"
    const doc = firm.type === "PF" ? (firm.cpf || "—") : (firm.cnpj || "—")
    const phone = firm.phone || "—"
    const email = firm.email || "—"

    return (
        <div className="h-full overflow-y-auto bg-slate-50">
            <div className="bg-white border-b border-slate-200">
                <div className="px-8 py-6">
                    <button
                        onClick={() => router.push("/dashboard/contabilidade")}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-6"
                    >
                        <ArrowLeft size={16} />
                        <span className="text-sm font-medium">Voltar para contabilidades</span>
                    </button>

                    <div className="flex items-end justify-between h-full">
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-xl bg-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-sm">
                                {getInitials(firmName)}
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <h1 className="text-2xl font-bold text-slate-900">{firmName}</h1>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                                        {firm.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                                    </span>
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                                        {firm.clients.length} clientes vinculados
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 justify-end h-full">
                            {editing ? (
                                <>
                                    <button onClick={() => setEditing(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-50 text-sm font-medium transition-colors">
                                        <X size={16} /> Cancelar
                                    </button>
                                    <button onClick={handleSaveEdit} disabled={updateMutation.isPending} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm shadow-indigo-600/25 disabled:opacity-50">
                                        {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setShowDeleteModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-red-600 border border-red-200 hover:bg-red-50 text-sm font-medium transition-colors cursor-pointer">
                                        <Trash2 size={16} /> Excluir
                                    </button>
                                    <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm shadow-indigo-600/25">
                                        <Pencil size={16} /> Editar
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-6 p-8 w-full mx-auto">
                <div className="flex-1 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
                            <h2 className="text-sm font-semibold text-slate-900">Dados Cadastrais</h2>
                        </div>

                        {editing ? (
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-xs text-slate-600 mb-1.5 block font-medium">Nome</label>
                                    <Input className="h-9 text-sm" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nome da contabilidade" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">Tipo</label>
                                        <select className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 bg-white" value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value as "PF" | "PJ", cnpj: "", cpf: "", ie: e.target.value === "PF" ? "" : editForm.ie })}>
                                            <option value="PJ">Pessoa Jurídica</option>
                                            <option value="PF">Pessoa Física</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">{editForm.type === "PF" ? "CPF" : "CNPJ"}</label>
                                        <Input className="h-9 text-sm" value={editForm.type === "PF" ? editForm.cpf : editForm.cnpj} onChange={e => editForm.type === "PF" ? setEditForm({ ...editForm, cpf: maskCPF(e.target.value) }) : setEditForm({ ...editForm, cnpj: maskCNPJ(e.target.value) })} placeholder={editForm.type === "PF" ? "000.000.000-00" : "00.000.000/0000-00"} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">IE</label>
                                        <Input className="h-9 text-sm" value={editForm.ie} onChange={e => setEditForm({ ...editForm, ie: e.target.value })} placeholder="Inscrição Estadual" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">Telefone</label>
                                        <Input className="h-9 text-sm" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-600 mb-1.5 block font-medium">Email</label>
                                    <Input className="h-9 text-sm" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="contato@contabilidade.com" />
                                </div>
                            </div>
                        ) : (
                            <div className="p-5 grid grid-cols-2 gap-6">
                                <Prop label="Nome" value={firmName} />
                                <Prop label={firm.type === "PF" ? "CPF" : "CNPJ"} value={doc} />
                                <Prop label="IE" value={firm.ie || "—"} />
                                <Prop label="Telefone" value={phone} />
                                <Prop label="Email" value={email} />
                                <Prop label="Cadastro" value={formatDateShort(firm.createdAt)} />
                            </div>
                        )}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
                            <h2 className="text-sm font-semibold text-slate-900">Endereço</h2>
                        </div>

                        {editing ? (
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-xs text-slate-600 mb-1.5 block font-medium">Logradouro</label>
                                    <Input className="h-9 text-sm" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} placeholder="Rua, avenida..." />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">CEP</label>
                                        <div className="relative flex items-center">
                                            <Input className="h-9 text-sm pr-8" value={editForm.zipCode} onChange={e => setEditForm({ ...editForm, zipCode: maskCEP(e.target.value) })} placeholder="00000-000" />
                                            <button type="button" onClick={() => fetchViaCEP(editForm.zipCode)} disabled={editForm.zipCode.replace(/\D/g, "").length !== 8 || cepLoading} className="absolute right-2 text-slate-400 hover:text-indigo-600 disabled:opacity-30 cursor-pointer">
                                                {cepLoading ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} className="opacity-0" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">Estado</label>
                                        <select className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 bg-white" value={editForm.state} onChange={e => setEditForm({ ...editForm, state: e.target.value })}>
                                            <option value="">UF</option>
                                            {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">Número</label>
                                        <Input className="h-9 text-sm" value={editForm.houseNumber} onChange={e => setEditForm({ ...editForm, houseNumber: e.target.value })} placeholder="123" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">Cidade</label>
                                        <Input className="h-9 text-sm" value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} placeholder="Cidade" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">Bairro</label>
                                        <Input className="h-9 text-sm" value={editForm.neighborhood} onChange={e => setEditForm({ ...editForm, neighborhood: e.target.value })} placeholder="Bairro" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-600 mb-1.5 block font-medium">Complemento</label>
                                    <Input className="h-9 text-sm" value={editForm.complement} onChange={e => setEditForm({ ...editForm, complement: e.target.value })} placeholder="Sala, bloco, conjunto..." />
                                </div>
                            </div>
                        ) : (
                            <div className="p-5 grid grid-cols-2 gap-6">
                                <Prop label="Logradouro" value={firm.address || "—"} />
                                <Prop label="Número" value={firm.houseNumber || "—"} />
                                <Prop label="Bairro" value={firm.neighborhood || "—"} />
                                <Prop label="Cidade" value={firm.city || "—"} />
                                <Prop label="Estado" value={firm.state || "—"} />
                                <Prop label="CEP" value={firm.zipCode || "—"} />
                                <Prop label="Complemento" value={firm.complement || "—"} />
                            </div>
                        )}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-900">Clientes Atendidos</h2>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-500 font-medium">{firm.clients.length}</span>
                                <button onClick={() => setShowLinkClientModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer">
                                    <Plus size={12} /> Vincular cliente
                                </button>
                            </div>
                        </div>
                        {firm.clients.length === 0 ? (
                            <div className="p-5 text-center text-slate-400">
                                <p className="text-sm">Nenhum cliente vinculado</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {firm.clients.map((client) => (
                                    <Link key={client.id} href={`/dashboard/clientes/${client.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                                        <Avatar className="h-9 w-9 shrink-0">
                                            <AvatarFallback className="text-[10px] font-bold text-white bg-indigo-600">
                                                {getInitials(client.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">{client.name}</p>
                                            <p className="text-xs text-slate-500">{client.city || "Sem cidade"} · {client.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${client.supportReleased ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                            {client.supportReleased ? "Ativo" : "Bloqueado"}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-80 shrink-0 border-l border-slate-200 bg-slate-50 overflow-y-auto">
                    <div className="px-5 space-y-4">
                        <div className="space-y-3">
                            <div className="rounded-lg p-3 border bg-indigo-50 border-indigo-200">
                                <p className="text-xs font-medium text-slate-600 mb-1.5">Tipo de Cadastro</p>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                    <span className="text-sm font-semibold text-indigo-700">{firm.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}</span>
                                </div>
                            </div>
                            <div className="rounded-lg p-3 border bg-blue-50 border-blue-200">
                                <p className="text-xs font-medium text-slate-600 mb-1.5">Clientes Vinculados</p>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span className="text-sm font-semibold text-blue-700">{firm.clients.length} vinculados</span>
                                </div>
                            </div>
                        </div>

                        {phone !== "—" && (
                            <div className="bg-white rounded-lg border border-slate-200 p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Phone size={12} className="text-emerald-600" />
                                    <p className="text-xs font-medium text-slate-600">Telefone Principal</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-900">{phone}</span>
                                    <button onClick={() => window.open(`https://wa.me/55${cleanPhone(phone)}`, "_blank")} className="text-slate-400 hover:text-emerald-600 cursor-pointer" title="WhatsApp"><MessageCircle size={12} /></button>
                                    <button onClick={() => handleCopy(phone, "sidePhone")} className="text-slate-400 hover:text-slate-600 cursor-pointer" title="Copiar">{copied === "sidePhone" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}</button>
                                </div>
                            </div>
                        )}

                        {email !== "—" && (
                            <div className="bg-white rounded-lg border border-slate-200 p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Mail size={12} className="text-blue-600" />
                                    <p className="text-xs font-medium text-slate-600">Email Principal</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-900 truncate flex-1">{email}</span>
                                    <button onClick={() => handleCopy(email, "sideEmail")} className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0" title="Copiar">{copied === "sideEmail" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}</button>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Users size={12} className="text-slate-600" />
                                    <p className="text-xs font-medium text-slate-600">Clientes ({firm.clients.length})</p>
                                </div>
                            </div>
                            <div>
                                {firm.clients.length === 0 ? (
                                    <div className="px-3 py-4 text-center">
                                        <p className="text-xs text-slate-400">Nenhum cliente cadastrado</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {firm.clients.map((client) => (
                                            <div key={client.id} className="px-3 py-2.5">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-semibold text-slate-900 truncate">{client.name}</span>
                                                    <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{client.type}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs text-slate-600">{client.city || "Sem cidade"}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50">
                                <p className="text-xs font-semibold text-slate-900">Resumo</p>
                            </div>
                            <div className="divide-y divide-slate-50">
                                <div className="px-3 py-2">
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">{firm.type === "PF" ? "CPF" : "CNPJ"}</p>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-slate-900 font-mono">{doc}</span>
                                        {doc !== "—" && <button onClick={() => handleCopy(doc, "doc")} className="text-slate-300 hover:text-slate-500 cursor-pointer">{copied === "doc" ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}</button>}
                                    </div>
                                </div>
                                {firm.ie && (
                                    <div className="px-3 py-2">
                                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">IE</p>
                                        <span className="text-xs text-slate-900">{firm.ie}</span>
                                    </div>
                                )}
                                <div className="px-3 py-2">
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Cidade</p>
                                    <span className="text-xs text-slate-900">{firm.city || "—"}</span>
                                </div>
                                <div className="px-3 py-2">
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Cadastro</p>
                                    <span className="text-xs text-slate-900">{formatDateShort(firm.createdAt)}</span>
                                </div>
                                <div className="px-3 py-2">
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Clientes</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-900">{firm.clients.length} total</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={showLinkClientModal} onOpenChange={setShowLinkClientModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Vincular cliente</DialogTitle>
                        <DialogDescription>Busque um cliente existente para vinculá-lo a esta contabilidade.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <Input
                                className="pl-9 h-10 text-sm"
                                placeholder="Buscar por nome, CNPJ ou CPF"
                                value={clientSearchQuery}
                                onChange={(e) => setClientSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                            {isLoadingClientSearch ? (
                                <div className="px-4 py-6 flex items-center justify-center text-slate-500 text-sm gap-2">
                                    <Loader2 size={16} className="animate-spin" /> Carregando clientes...
                                </div>
                            ) : availableClients.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-slate-500">
                                    Nenhum cliente disponível para vínculo.
                                </div>
                            ) : (
                                availableClients.map((client) => {
                                    const clientDoc = client.cnpj || client.cpf || "Sem documento"
                                    return (
                                        <button
                                            key={client.id}
                                            type="button"
                                            onClick={() => setSelectedClientId(client.id)}
                                            className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${selectedClientId === client.id ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-900 truncate">{client.name}</p>
                                                    <p className="text-xs text-slate-500 truncate">{clientDoc}</p>
                                                </div>
                                                {selectedClientId === client.id && <Check size={14} className="text-indigo-600 shrink-0" />}
                                            </div>
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowLinkClientModal(false); setClientSearchQuery(""); setSelectedClientId("") }}>Cancelar</Button>
                        <Button onClick={() => attachClientMutation.mutate(selectedClientId)} disabled={!selectedClientId || attachClientMutation.isPending}>
                            {attachClientMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                            Vincular cliente
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle size={18} /> Excluir contabilidade
                        </DialogTitle>
                        <DialogDescription>
                            Esta ação removerá a contabilidade <span className="font-medium text-slate-900">{firmName}</span> permanentemente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                        <p className="text-sm font-medium text-red-700 mb-1">Aviso importante</p>
                        <p className="text-sm text-red-700 leading-relaxed">
                            Todos os clientes que estão vinculados a esta contabilidade perderão o vínculo automaticamente.
                        </p>
                        {firm.clients.length > 0 && (
                            <p className="text-xs text-red-600 mt-2">
                                Clientes atualmente vinculados: <span className="font-semibold">{firm.clients.length}</span>
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleteMutation.isPending}>Cancelar</Button>
                        <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : <Trash2 size={14} className="mr-2" />}
                            Excluir contabilidade
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function Prop({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs text-gray-500 mb-1 font-medium">{label}</p>
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
