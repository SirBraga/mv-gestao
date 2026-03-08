"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getClientById, updateClient, toggleClientSupport, addClientContact, deleteClientContact, addClientAttachment, deleteClientAttachment, cancelContract } from "@/app/actions/clients"
import { getContabilityOptions } from "@/app/actions/contability"
import { getProductOptions, createClientProductSerial, getClientProductSerials } from "@/app/actions/products"
import { maskCPF, maskCNPJ, maskPhone, maskCEP, maskContactTime } from "@/app/utils/masks"
import { CONTACT_ROLES } from "@/app/constants/options"
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
    Pencil,
    Save,
    Package,
    Search,
    Building2,
    Clock,
} from "lucide-react"
import { uploadFile } from "@/app/utils/upload"
import { toast } from "react-toastify"
import TicketCreateDrawer from "@/app/dashboard/_components/ticket-create-drawer"
import LocalFilePreviewList from "@/app/dashboard/_components/local-file-preview-list"

// Tipo explícito para contato com bestContactTime
interface ContactWithTime {
    id: string
    name: string
    phone: string | null
    email: string | null
    role: string | null
    bestContactTime: string | null
    isDefault: boolean
    createdAt: string
    updatedAt: string
}

// Tipo para o cliente
interface ClientData {
    id: string
    name: string
    cnpj?: string
    cpf?: string
    ie?: string
    state?: string
    codigoCSC?: string
    tokenCSC?: string
    cnae?: string
    businessSector?: string
    type: string
    city?: string
    address?: string
    houseNumber?: string
    neighborhood?: string
    zipCode?: string
    complement?: string
    phone?: string
    email?: string
    ownerName?: string
    ownerPhone?: string
    ownerEmail?: string
    hasContract: boolean
    contractType?: string
    supportReleased: boolean
    contability?: {
        id: string
        name: string | null
        cnpj: string | null
        cpf: string | null
    } | null
    contacts: ContactWithTime[]
    tickets: any[]
    createdAt: string
    updatedAt: string
}

interface TicketSummary {
    id: string | number
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
    CANCELLED: "bg-red-500",
}

const statusLabels: Record<string, string> = {
    NOVO: "Novo",
    PENDING_CLIENT: "Pend. Cliente",
    PENDING_EMPRESS: "Pend. Empresa",
    IN_PROGRESS: "Em Progresso",
    CLOSED: "Fechado",
    CANCELLED: "Cancelado",
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
    const [editing, setEditing] = useState(false)
    const [showTicketDrawer, setShowTicketDrawer] = useState(false)

    const { data: client, isLoading, isError } = useQuery({
        queryKey: ["client", id],
        queryFn: () => getClientById(id),
    })

    const { data: serials = [] } = useQuery({
        queryKey: ["client-serials", id],
        queryFn: () => getClientProductSerials(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    })

    const { data: allProducts = [] } = useQuery({
        queryKey: ["products"],
        queryFn: () => getProductOptions(),
        enabled: editing,
        staleTime: 30 * 60 * 1000,
    })

    const { data: allContabilities = [] } = useQuery({
        queryKey: ["contabilities-list"],
        queryFn: () => getContabilityOptions(),
        enabled: editing,
        staleTime: 30 * 60 * 1000,
    })

    const toggleSupportMutation = useMutation({
        mutationFn: ({ released, reason }: { released: boolean; reason?: string }) => toggleClientSupport(id, released, reason as any),
        onSuccess: (_result, variables) => {
            queryClient.setQueryData(["client", id], (old: any) => {
                if (!old) return old

                return {
                    ...old,
                    supportReleased: variables.released,
                }
            })
            queryClient.setQueryData(["clients"], (old: any) => {
                if (!Array.isArray(old)) return old

                return old.map((item: any) => item.id === id ? {
                    ...item,
                    supportReleased: variables.released,
                } : item)
            })
            toast.success(client?.supportReleased ? "Suporte bloqueado" : "Suporte liberado")
            setShowBlockModal(false)
            setBlockReason("")
            setContractCancelReason("")
            setContractCancelDate("")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const handleBlockWithContractCancel = async () => {
        if (!client) return
        
        if (client.supportReleased && !blockReason) {
            return toast.error("Selecione o motivo do bloqueio")
        }

        if (blockReason === "CONTRATO_CANCELADO") {
            if (!contractCancelReason) {
                return toast.error("Selecione o motivo do cancelamento")
            }
            if (!contractCancelDate) {
                return toast.error("Informe a data do cancelamento")
            }
            
            // Primeiro cancela o contrato
            await cancelContract(id, contractCancelReason, contractCancelDate)
            toast.success("Contrato cancelado e suporte bloqueado!")
        } else {
            // Apenas bloqueia/libera o suporte
            toggleSupportMutation.mutate({ released: !client.supportReleased, reason: blockReason || undefined })
            return
        }

        // Limpa os estados
        setShowBlockModal(false)
        setBlockReason("")
        setContractCancelReason("")
        setContractCancelDate("")
        
        // Invalida as queries
        queryClient.invalidateQueries({ queryKey: ["client", id] })
        queryClient.invalidateQueries({ queryKey: ["clients"] })
    }

    const addContactMut = useMutation({
        mutationFn: (data: { name: string; phone?: string; email?: string; role?: string; bestContactTime?: string }) => addClientContact(id, data),
        onSuccess: (result, variables) => {
            queryClient.setQueryData(["client", id], (old: any) => {
                if (!old) return old

                return {
                    ...old,
                    contacts: [
                        ...old.contacts,
                        {
                            id: result.id,
                            name: variables.name,
                            phone: variables.phone ?? null,
                            email: variables.email ?? null,
                            role: variables.role ?? null,
                            bestContactTime: variables.bestContactTime ?? null,
                            isDefault: false,
                        },
                    ],
                }
            })
            toast.success("Contato adicionado!")
            setShowContactModal(false)
            setContactForm({ name: "", phone: "", email: "", role: "", bestContactTime: "" })
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const deleteContactMut = useMutation({
        mutationFn: (contactId: string) => deleteClientContact(contactId),
        onSuccess: (_result, contactId) => {
            queryClient.setQueryData(["client", id], (old: any) => {
                if (!old) return old

                return {
                    ...old,
                    contacts: old.contacts.filter((contact: any) => contact.id !== contactId),
                }
            })
            toast.success("Contato removido!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const addAttachMut = useMutation({
        mutationFn: (data: { url: string; fileName: string; fileType: string; fileSize: number }) => addClientAttachment(id, data),
        onSuccess: (result, variables) => {
            queryClient.setQueryData(["client", id], (old: any) => {
                if (!old) return old

                return {
                    ...old,
                    attachments: [
                        {
                            id: result.id,
                            url: variables.url,
                            fileName: variables.fileName,
                            fileType: variables.fileType,
                            fileSize: variables.fileSize,
                        },
                        ...(old.attachments ?? []),
                    ],
                }
            })
            toast.success("Anexo adicionado!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const deleteAttachMut = useMutation({
        mutationFn: (attachmentId: string) => deleteClientAttachment(attachmentId),
        onSuccess: (_result, attachmentId) => {
            queryClient.setQueryData(["client", id], (old: any) => {
                if (!old) return old

                return {
                    ...old,
                    attachments: (old.attachments ?? []).filter((attachment: any) => attachment.id !== attachmentId),
                }
            })
            toast.success("Anexo removido!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const updateMutation = useMutation({
        mutationFn: (data: Record<string, unknown>) => updateClient(id, data),
        onSuccess: async () => {
            // Salvar seriais após atualizar o cliente
            await saveProductSerials()
            
            queryClient.invalidateQueries({ queryKey: ["client", id] })
            queryClient.invalidateQueries({ queryKey: ["client-serials", id] })
            queryClient.invalidateQueries({ queryKey: ["clients"] })
            toast.success("Cliente atualizado!")
            setEditing(false)
            // Limpa estados de produtos
            setSelectedProductIds([])
            setProductSerials({})
            setProductSearch("")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const cancelContractMutation = useMutation({
        mutationFn: (data: { reason: string; date?: string }) => cancelContract(id, data.reason, data.date),
        onSuccess: async () => {
            // Salvar seriais após cancelamento
            await saveProductSerials()
            
            queryClient.invalidateQueries({ queryKey: ["client", id] })
            queryClient.invalidateQueries({ queryKey: ["client-serials", id] })
            queryClient.invalidateQueries({ queryKey: ["clients"] })
            toast.success("Contrato cancelado e cliente atualizado!")
            setEditing(false)
            // Limpa estados de produtos
            setSelectedProductIds([])
            setProductSerials({})
            setProductSearch("")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const [copied, setCopied] = useState<string | null>(null)
    const [showBlockModal, setShowBlockModal] = useState(false)
    const [blockReason, setBlockReason] = useState<"" | "CONTRATO_CANCELADO" | "INADIMPLENCIA" | "SOLICITACAO_CLIENTE" | "OUTROS">("")
    const [contractCancelReason, setContractCancelReason] = useState("")
    const [contractCancelDate, setContractCancelDate] = useState("")
    const [editForm, setEditForm] = useState<Record<string, string>>({})
    const [showContactModal, setShowContactModal] = useState(false)
    const [contactForm, setContactForm] = useState({ name: "", phone: "", email: "", role: "", bestContactTime: "" })
    const [attachUploading, setAttachUploading] = useState(false)
    const [pendingAttachFiles, setPendingAttachFiles] = useState<File[]>([])

    // Estados para produtos na edição
    const [productSearch, setProductSearch] = useState("")
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
    const [productSerials, setProductSerials] = useState<Record<string, { serial: string; expiresAt: string }>>({})
    const [selectedContabilityId, setSelectedContabilityId] = useState("")

    const handleCopy = (text: string, label: string) => {
        copyToClipboard(text); setCopied(label); setTimeout(() => setCopied(null), 2000)
    }

    const handleAttachSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return
        setPendingAttachFiles(prev => [...prev, ...Array.from(files)])
        e.target.value = ""
    }

    const handleAttachUpload = async () => {
        if (pendingAttachFiles.length === 0) return
        setAttachUploading(true)
        try {
            await Promise.all(
                pendingAttachFiles.map(async (file) => {
                    const result = await uploadFile(file, "clientes")
                    await addAttachMut.mutateAsync(result)
                })
            )
            setPendingAttachFiles([])
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro no upload")
        } finally {
            setAttachUploading(false)
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes}B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
    }

    const isImageFile = (fileType: string) => fileType.startsWith("image/")

    const startEditing = () => {
        if (!client) return
        setEditForm({
            name: client.name || "",
            cnpj: client.cnpj || "",
            cpf: client.cpf || "",
            ie: client.ie || "",
            state: client.state || "",
            codigoCSC: client.codigoCSC || "",
            tokenCSC: client.tokenCSC || "",
            cnae: client.cnae || "",
            businessSector: client.businessSector || "",
            contractType: client.contractType || "",
            contractCancelReason: client.contractCancelReason || "",
            certificateType: client.certificateType || "",
            certificateExpiresDate: client.certificateExpiresDate ? client.certificateExpiresDate.split('T')[0] : "",
            contractCancelDate: client.contractCancelDate || "",
            address: client.address || "",
            houseNumber: client.houseNumber || "",
            neighborhood: client.neighborhood || "",
            city: client.city || "",
            zipCode: client.zipCode || "",
            complement: client.complement || "",
            aditionalInfo: client.aditionalInfo || "",
            ownerName: client.ownerName || "",
            ownerCpf: client.ownerCpf || "",
            ownerPhone: client.ownerPhone || "",
            ownerEmail: client.ownerEmail || "",
        })
        setSelectedContabilityId(client.contability?.id || "")
        // Carregar produtos e seriais existentes ao iniciar edição
        const existingProductIds: string[] = []
        const existingSerials: Record<string, { serial: string; expiresAt: string }> = {}

        if (serials.length > 0) {
            serials.forEach(serial => {
                existingProductIds.push(serial.productId)
                existingSerials[serial.productId] = {
                    serial: serial.serial,
                    expiresAt: serial.expiresAt ? new Date(serial.expiresAt).toISOString().split('T')[0] : ""
                }
            })
        }

        setSelectedProductIds(existingProductIds)
        setProductSerials(existingSerials)
        setProductSearch("")
        setEditing(true)
    }

    const handleSaveEdit = async () => {
        if (!editForm.name?.trim()) return toast.error("Nome é obrigatório")

        // Validar produtos que exigem serial
        for (const productId of selectedProductIds) {
            const product = (allProducts as { id: string; name: string; hasSerialControl: boolean }[]).find(p => p.id === productId)
            if (product?.hasSerialControl) {
                const serialData = productSerials[productId]
                if (!serialData?.serial?.trim()) {
                    return toast.error(`Serial é obrigatório para o produto: ${product.name}`)
                }
            }
        }

        // Se o contrato foi cancelado, usar função especial de cancelamento
        if (editForm.contractType === "CANCELADO") {
            if (!editForm.contractCancelReason) {
                return toast.error("Motivo do cancelamento é obrigatório")
            }
            cancelContractMutation.mutate({
                reason: editForm.contractCancelReason,
                date: editForm.contractCancelDate
            })
        } else {
            // Salvar dados do cliente normally
            const data: Record<string, unknown> = {}
            const fields = ["name", "cnpj", "cpf", "ie", "state", "codigoCSC", "tokenCSC", "cnae", "businessSector", "contractType", "contractCancelReason", "contractCancelDate", "certificateType", "address", "houseNumber", "neighborhood", "city", "zipCode", "complement", "aditionalInfo", "ownerName", "ownerCpf", "ownerPhone", "ownerEmail"]
            for (const f of fields) {
                data[f] = editForm[f] || null
            }
            data.name = editForm.name
            data.address = editForm.address || ""
            data.city = editForm.city || ""
            data.houseNumber = editForm.houseNumber || ""
            data.neighborhood = editForm.neighborhood || ""
            data.zipCode = editForm.zipCode || ""
            data.complement = editForm.complement || ""
            data.aditionalInfo = editForm.aditionalInfo || ""
            data.ownerName = editForm.ownerName || ""
            data.ownerPhone = editForm.ownerPhone || ""
            data.ownerEmail = editForm.ownerEmail || ""
            data.ownerCpf = editForm.ownerCpf || ""
            data.contabilityId = selectedContabilityId || null

            updateMutation.mutate(data)
        }
    }

    const saveProductSerials = async () => {
        await Promise.all(
            selectedProductIds.flatMap((productId) => {
                const serialData = productSerials[productId]
                if (!serialData?.serial?.trim()) return []

                return [
                    createClientProductSerial({
                        clientId: id,
                        productId,
                        serial: serialData.serial,
                        expiresAt: serialData.expiresAt ? new Date(serialData.expiresAt) : undefined,
                    }),
                ]
            })
        )
    }

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
    const contabilityLabel = client.contability?.name || client.contability?.cnpj || client.contability?.cpf || "Não vinculada"

    return (
        <div className="h-full overflow-y-auto bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="px-8 py-6">
                    {/* Back button */}
                    <button
                        onClick={() => router.push("/dashboard/clientes")}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-6"
                    >
                        <ArrowLeft size={16} />
                        <span className="text-sm font-medium">Voltar para clientes</span>
                    </button>

                    {/* Client identity */}
                    <div className="flex items-end justify-between h-full">
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-xl bg-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-sm">
                                {getInitials(client.name)}
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
                                   
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                                        {client.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                                    </span>
                                     <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${client.supportReleased ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                        {client.supportReleased ? "Ativo" : "Bloqueado"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 justify-end h-full">
                            {!editing && (
                                <button onClick={() => setShowTicketDrawer(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-50 text-sm font-medium transition-colors cursor-pointer">
                                    <Ticket size={16} /> Abrir Ticket
                                </button>
                            )}
                            {client.supportReleased
                                ? <button onClick={() => setShowBlockModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-50 text-sm font-medium transition-colors">
                                    <ShieldX size={16} /> Bloquear
                                </button>
                                : <button onClick={() => setShowBlockModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-50 text-sm font-medium transition-colors">
                                    <ShieldCheck size={16} /> Liberar
                                </button>
                            }
                            {editing ? (
                                <>
                                    <button onClick={() => setEditing(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-50 text-sm font-medium transition-colors">
                                        <X size={16} /> Cancelar
                                    </button>
                                    <button onClick={handleSaveEdit} disabled={updateMutation.isPending || cancelContractMutation.isPending} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm shadow-indigo-600/25 disabled:opacity-50">
                                        {(updateMutation.isPending || cancelContractMutation.isPending) ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar
                                    </button>
                                </>
                            ) : (
                                <button onClick={startEditing} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm shadow-indigo-600/25">
                                    <Pencil size={16} /> Editar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Two-column layout */}
            <div className="flex gap-6 p-8 w-full mx-auto">

                {/* ── Left: Main content ── */}
                <div className="flex-1 space-y-4">

                    {/* Informações do Cliente */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
                            <h2 className="text-sm font-semibold text-slate-900">Dados Cadastrais</h2>
                        </div>

                        {editing ? (
                            <div className="p-5 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">
                                            {client.type === "PF" ? "CPF" : "CNPJ"}
                                        </label>
                                        <Input
                                            className="h-9 text-sm"
                                            value={client.type === "PF" ? (editForm.cpf || "") : (editForm.cnpj || "")}
                                            onChange={e => setEditForm({ ...editForm, [client.type === "PF" ? "cpf" : "cnpj"]: e.target.value })}
                                            placeholder={client.type === "PF" ? "000.000.000-00" : "00.000.000/0000-00"}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">IE</label>
                                        <Input className="h-9 text-sm" value={editForm.ie || ""} onChange={e => setEditForm({ ...editForm, ie: e.target.value })} placeholder="Inscrição Estadual" />
                                    </div>
                                </div>

                                {/* CNAE e Ramo de Atividade (apenas PJ) */}
                                {client.type === "PJ" && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-600 mb-1.5 block font-medium">CNAE</label>
                                            <Input className="h-9 text-sm" value={editForm.cnae || ""} onChange={e => setEditForm({ ...editForm, cnae: e.target.value })} placeholder="0000-0/00" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-600 mb-1.5 block font-medium">Ramo de Atividade</label>
                                            <select className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 bg-white" value={editForm.businessSector || ""} onChange={e => setEditForm({ ...editForm, businessSector: e.target.value })}>
                                                <option value="">Selecione</option>
                                                <option value="Comércio">Comércio</option>
                                                <option value="Serviços">Serviços</option>
                                                <option value="Indústria">Indústria</option>
                                                <option value="Construção Civil">Construção Civil</option>
                                                <option value="Tecnologia da Informação">Tecnologia da Informação</option>
                                                <option value="Saúde">Saúde</option>
                                                <option value="Educação">Educação</option>
                                                <option value="Transporte">Transporte</option>
                                                <option value="Alimentação">Alimentação</option>
                                                <option value="Consultoria">Consultoria</option>
                                                <option value="Agricultura">Agricultura</option>
                                                <option value="Pecuária">Pecuária</option>
                                                <option value="Mineração">Mineração</option>
                                                <option value="Energia">Energia</option>
                                                <option value="Saneamento Básico">Saneamento Básico</option>
                                                <option value="Telecomunicações">Telecomunicações</option>
                                                <option value="Mídia e Comunicação">Mídia e Comunicação</option>
                                                <option value="Entretenimento">Entretenimento</option>
                                                <option value="Turismo">Turismo</option>
                                                <option value="Hotelaria">Hotelaria</option>
                                                <option value="Logística">Logística</option>
                                                <option value="Armazenagem">Armazenagem</option>
                                                <option value="Recursos Humanos">Recursos Humanos</option>
                                                <option value="Contabilidade">Contabilidade</option>
                                                <option value="Advocacia">Advocacia</option>
                                                <option value="Engenharia">Engenharia</option>
                                                <option value="Arquitetura">Arquitetura</option>
                                                <option value="Publicidade e Marketing">Publicidade e Marketing</option>
                                                <option value="Varejo">Varejo</option>
                                                <option value="Atacado">Atacado</option>
                                                <option value="Importação/Exportação">Importação/Exportação</option>
                                                <option value="Finanças e Bancos">Finanças e Bancos</option>
                                                <option value="Seguros">Seguros</option>
                                                <option value="Imobiliária">Imobiliária</option>
                                                <option value="Cosméticos e Beleza">Cosméticos e Beleza</option>
                                                <option value="Moda e Vestuário">Moda e Vestuário</option>
                                                <option value="Moveis e Decoração">Moveis e Decoração</option>
                                                <option value="Automotivo">Automotivo</option>
                                                <option value="Eletrônicos">Eletrônicos</option>
                                                <option value="Farmacêutico">Farmacêutico</option>
                                                <option value="Químico">Químico</option>
                                                <option value="Metalurgia">Metalurgia</option>
                                                <option value="Plásticos">Plásticos</option>
                                                <option value="Têxtil">Têxtil</option>
                                                <option value="Papel e Celulose">Papel e Celulose</option>
                                                <option value="Meio Ambiente">Meio Ambiente</option>
                                                <option value="Segurança">Segurança</option>
                                                <option value="Limpeza e Conservação">Limpeza e Conservação</option>
                                                <option value="Manutenção">Manutenção</option>
                                                <option value="Instalações">Instalações</option>
                                                <option value="Eventos">Eventos</option>
                                                <option value="Fotografia">Fotografia</option>
                                                <option value="Design">Design</option>
                                                <option value="Artes e Artesanato">Artes e Artesanato</option>
                                                <option value="Esportes e Lazer">Esportes e Lazer</option>
                                                <option value="Veterinária">Veterinária</option>
                                                <option value="Laboratórios">Laboratórios</option>
                                                <option value="Distribuição">Distribuição</option>
                                                <option value="Representação Comercial">Representação Comercial</option>
                                                <option value="Franquias">Franquias</option>
                                                <option value="E-commerce">E-commerce</option>
                                                <option value="Startups">Startups</option>
                                                <option value="Agroindústria">Agroindústria</option>
                                                <option value="Biotecnologia">Biotecnologia</option>
                                                <option value="Robótica">Robótica</option>
                                                <option value="Inteligência Artificial">Inteligência Artificial</option>
                                                <option value="Blockchain">Blockchain</option>
                                                <option value="Fintech">Fintech</option>
                                                <option value="Edtech">Edtech</option>
                                                <option value="Healthtech">Healthtech</option>
                                                <option value="Govtech">Govtech</option>
                                                <option value="Legaltech">Legaltech</option>
                                                <option value="Insurtech">Insurtech</option>
                                                <option value="Propriedade Intelectual">Propriedade Intelectual</option>
                                                <option value="Pesquisa e Desenvolvimento">Pesquisa e Desenvolvimento</option>
                                                <option value="Inovação">Inovação</option>
                                                <option value="Governo e Setor Público">Governo e Setor Público</option>
                                                <option value="Organizações sem Fins Lucrativos">Organizações sem Fins Lucrativos</option>
                                                <option value="Cooperativas">Cooperativas</option>
                                                <option value="Associações">Associações</option>
                                                <option value="Sindicatos">Sindicatos</option>
                                                <option value="Outros">Outros</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* CSC (apenas PJ) */}
                                {client.type === "PJ" && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-600 mb-1.5 block font-medium">Código CSC</label>
                                            <Input className="h-9 text-sm font-mono" value={editForm.codigoCSC || ""} onChange={e => setEditForm({ ...editForm, codigoCSC: e.target.value })} placeholder="Código CSC" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-600 mb-1.5 block font-medium">Token</label>
                                            <Input className="h-9 text-sm font-mono" value={editForm.tokenCSC || ""} onChange={e => setEditForm({ ...editForm, tokenCSC: e.target.value })} placeholder="Token" />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">Estado</label>
                                        <select className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 bg-white" value={editForm.state || ""} onChange={e => setEditForm({ ...editForm, state: e.target.value })}>
                                            <option value="">UF</option>
                                            {["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">Tipo de Contrato</label>
                                        <select className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 bg-white" value={editForm.contractType || ""} onChange={e => setEditForm({ ...editForm, contractType: e.target.value })}>
                                            <option value="">Selecione</option>
                                            <option value="MENSAL">Mensal</option>
                                            <option value="ANUAL">Anual</option>
                                            <option value="AVULSO">Avulso</option>
                                            <option value="CANCELADO">Cancelado</option>
                                        </select>
                                    </div>
                                    {editForm.contractType === "CANCELADO" && (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-slate-600 mb-1.5 block font-medium">Motivo do Cancelamento</label>
                                                <select className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 bg-white" value={editForm.contractCancelReason || ""} onChange={e => setEditForm({ ...editForm, contractCancelReason: e.target.value })}>
                                                    <option value="">Selecione o motivo</option>
                                                    <option value="INADIMPLENCIA">Inadimplência</option>
                                                    <option value="FIM_DE_CONTRATO">Fim de Contrato</option>
                                                    <option value="MUTUO_ACORDO">Mútuo Acordo</option>
                                                    <option value="DESCUMPRIMENTO">Descumprimento de Cláusulas</option>
                                                    <option value="INSATISFACAO_COM_SERVICO">Insatisfação com o Serviço</option>
                                                    <option value="MUDANCA_DE_FOCO">Mudança de Foco do Negócio</option>
                                                    <option value="FUSAO_AQUISICAO">Fusão ou Aquisição</option>
                                                    <option value="ENCERRAMENTO_ATIVIDADES">Encerramento de Atividades</option>
                                                    <option value="OUTRO">Outro</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-600 mb-1.5 block font-medium">Data do Cancelamento</label>
                                                <Input 
                                                    type="date" 
                                                    className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 bg-white" 
                                                    value={editForm.contractCancelDate || ""} 
                                                    onChange={e => setEditForm({ ...editForm, contractCancelDate: e.target.value })} 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">{client.type === "PF" ? "CPF" : "CNPJ"}</span>
                                    <span className="text-sm text-slate-900">{doc}</span>
                                </div>
                                {client.ie && (
                                    <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Inscrição Estadual</span>
                                        <span className="text-sm text-slate-900">{client.ie}</span>
                                    </div>
                                )}
                                {client.state && (
                                    <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Estado</span>
                                        <span className="text-sm text-slate-900">{client.state}</span>
                                    </div>
                                )}
                                {client.type === "PJ" && client.cnae && (
                                    <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">CNAE</span>
                                        <span className="text-sm text-slate-900">{client.cnae}</span>
                                    </div>
                                )}
                                {client.type === "PJ" && client.businessSector && (
                                    <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Ramo de Atividade</span>
                                        <span className="text-sm text-slate-900">{client.businessSector}</span>
                                    </div>
                                )}
                                {client.codigoCSC && (
                                    <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Código CSC</span>
                                        <span className="text-sm text-slate-900 font-mono">{client.codigoCSC}</span>
                                    </div>
                                )}
                                {client.tokenCSC && (
                                    <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Token</span>
                                        <span className="text-sm text-slate-900 font-mono">{client.tokenCSC}</span>
                                    </div>
                                )}
                                {client.hasContract !== null && (
                                    <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Possui Contrato</span>
                                        <span className="text-sm text-slate-900">{client.hasContract ? "Sim" : "Não"}</span>
                                    </div>
                                )}
                                {client.contractType && (
                                    <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Tipo de Contrato</span>
                                        <span className="text-sm text-slate-900">{client.contractType}</span>
                                    </div>
                                )}
                                {client.contractType === "CANCELADO" && client.contractCancelReason && (
                                    <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Motivo do Cancelamento</span>
                                        <span className="text-sm text-red-600">
                                            {client.contractCancelReason === "INADIMPLENCIA" && "Inadimplência"}
                                            {client.contractCancelReason === "FIM_DE_CONTRATO" && "Fim de Contrato"}
                                            {client.contractCancelReason === "MUTUO_ACORDO" && "Mútuo Acordo"}
                                            {client.contractCancelReason === "DESCUMPRIMENTO" && "Descumprimento de Cláusulas"}
                                            {client.contractCancelReason === "INSATISFACAO_COM_SERVICO" && "Insatisfação com o Serviço"}
                                            {client.contractCancelReason === "MUDANCA_DE_FOCO" && "Mudança de Foco do Negócio"}
                                            {client.contractCancelReason === "FUSAO_AQUISICAO" && "Fusão ou Aquisição"}
                                            {client.contractCancelReason === "ENCERRAMENTO_ATIVIDADES" && "Encerramento de Atividades"}
                                            {client.contractCancelReason === "OUTRO" && "Outro"}
                                        </span>
                                    </div>
                                )}
                                {client.contractType === "CANCELADO" && client.contractCancelDate && (
                                    <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Data do Cancelamento</span>
                                        <span className="text-sm text-red-600">
                                            {(() => {
                                                const date = new Date(client.contractCancelDate)
                                                // Ajustar para garantir o dia correto no timezone local
                                                const adjustedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000)
                                                return adjustedDate.toLocaleDateString('pt-BR')
                                            })()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Observações */}
                    {(client.aditionalInfo || editing) && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText size={16} className="text-amber-600" />
                                <p className="text-sm font-semibold text-amber-900">Observações</p>
                            </div>
                            {editing ? (
                                <textarea className="w-full min-h-20 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 bg-white resize-y focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" value={editForm.aditionalInfo || ""} onChange={e => setEditForm({ ...editForm, aditionalInfo: e.target.value })} placeholder="Adicione observações sobre o cliente..." />
                            ) : (
                                <p className="text-sm text-slate-700 leading-relaxed">{client.aditionalInfo}</p>
                            )}
                        </div>
                    )}

                    {/* Produtos Contratados - Apenas no modo de edição */}
                    {editing && (
                        <div className="bg-white border border-slate-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Package size={16} className="text-slate-600" />
                                <p className="text-sm font-semibold text-slate-900">Produtos Contratados</p>
                            </div>

                            {/* Busca de produtos */}
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <Input
                                    placeholder="Buscar produto..."
                                    className="pl-9 h-9 text-sm"
                                    value={productSearch}
                                    onChange={e => setProductSearch(e.target.value)}
                                />
                            </div>

                            {/* Lista de produtos */}
                            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg mb-3">
                                {(allProducts as { id: string; name: string; hasSerialControl: boolean }[])
                                    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                                    .map(p => {
                                        const selected = selectedProductIds.includes(p.id)
                                        return (
                                            <div key={p.id} className="border-b border-slate-100 last:border-b-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedProductIds(prev => selected ? prev.filter(x => x !== p.id) : [...prev, p.id])
                                                        if (!selected && p.hasSerialControl) {
                                                            setProductSerials(prev => ({
                                                                ...prev,
                                                                [p.id]: { serial: "", expiresAt: "" }
                                                            }))
                                                        } else if (selected) {
                                                            setProductSerials(prev => {
                                                                const newSerials = { ...prev }
                                                                delete newSerials[p.id]
                                                                return newSerials
                                                            })
                                                        }
                                                    }}
                                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors cursor-pointer ${selected ? "bg-emerald-50 text-emerald-700" : "text-slate-700"}`}
                                                >
                                                    <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${selected ? "bg-emerald-500 border-emerald-500" : "border-slate-300"}`}>
                                                        {selected && <Check size={10} className="text-white" />}
                                                    </span>
                                                    <div className="flex-1 text-left">
                                                        <div>{p.name}</div>
                                                        {p.hasSerialControl && (
                                                            <div className="text-xs text-amber-600 mt-0.5">• Exige serial</div>
                                                        )}
                                                    </div>
                                                </button>
                                                {selected && p.hasSerialControl && (
                                                    <div className="px-3 pb-2 space-y-2">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-xs font-medium text-slate-600 mb-1 block">Serial</label>
                                                                <Input
                                                                    placeholder="Número do serial"
                                                                    className="h-8 text-xs"
                                                                    value={productSerials[p.id]?.serial || ""}
                                                                    onChange={e => setProductSerials(prev => ({
                                                                        ...prev,
                                                                        [p.id]: { ...prev[p.id], serial: e.target.value }
                                                                    }))}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-medium text-slate-600 mb-1 block">Expiração</label>
                                                                <Input
                                                                    type="date"
                                                                    className="h-8 text-xs"
                                                                    value={productSerials[p.id]?.expiresAt || ""}
                                                                    onChange={e => setProductSerials(prev => ({
                                                                        ...prev,
                                                                        [p.id]: { ...prev[p.id], expiresAt: e.target.value }
                                                                    }))}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                            </div>

                            {/* Produtos selecionados */}
                            {selectedProductIds.length > 0 && (
                                <div className="border-t border-slate-100 pt-3">
                                    <p className="text-xs font-medium text-slate-600 mb-2">Produtos selecionados:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedProductIds.map(productId => {
                                            const product = (allProducts as { id: string; name: string }[]).find(p => p.id === productId)
                                            return product ? (
                                                <span key={productId} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium">
                                                    {product.name}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedProductIds(prev => prev.filter(x => x !== productId))
                                                            setProductSerials(prev => {
                                                                const newSerials = { ...prev }
                                                                delete newSerials[productId]
                                                                return newSerials
                                                            })
                                                        }}
                                                        className="cursor-pointer hover:text-red-500"
                                                    >
                                                        <X size={9} />
                                                    </button>
                                                </span>
                                            ) : null
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
                            <h2 className="text-sm font-semibold text-slate-900">Contabilidade</h2>
                        </div>
                        {editing ? (
                            <div className="p-5 space-y-3">
                                <div>
                                    <label className="text-xs text-slate-600 mb-1.5 block font-medium">Contabilidade vinculada</label>
                                    <select className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 bg-white" value={selectedContabilityId} onChange={e => setSelectedContabilityId(e.target.value)}>
                                        <option value="">Nenhuma contabilidade</option>
                                        {(allContabilities as { id: string; name: string | null; cnpj: string | null; cpf: string | null }[]).map((contability) => (
                                            <option key={contability.id} value={contability.id}>
                                                {contability.name || contability.cnpj || contability.cpf}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-xs text-slate-500">Essa contabilidade poderá ser usada como solicitante padrão nos tickets do cliente.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Contabilidade</span>
                                    <span className="text-sm text-slate-900">{contabilityLabel}</span>
                                </div>
                                {client.contability?.cnpj && (
                                    <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Documento</span>
                                        <span className="text-sm text-slate-900">{client.contability.cnpj}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Endereço do cliente */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
                            <h2 className="text-sm font-semibold text-slate-900">Endereço</h2>
                        </div>
                        {editing ? (
                            <div className="p-5 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-600 mb-1.5 block font-medium">Logradouro</label>
                                    <Input className="h-9 text-sm" value={editForm.address || ""} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-600 mb-1.5 block font-medium">Nº</label>
                                    <Input className="h-9 text-sm" value={editForm.houseNumber || ""} onChange={e => setEditForm({ ...editForm, houseNumber: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-600 mb-1.5 block font-medium">Bairro</label>
                                    <Input className="h-9 text-sm" value={editForm.neighborhood || ""} onChange={e => setEditForm({ ...editForm, neighborhood: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-600 mb-1.5 block font-medium">Cidade</label>
                                    <Input className="h-9 text-sm" value={editForm.city || ""} onChange={e => setEditForm({ ...editForm, city: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-600 mb-1.5 block font-medium">CEP</label>
                                    <Input className="h-9 text-sm" value={editForm.zipCode || ""} onChange={e => setEditForm({ ...editForm, zipCode: maskCEP(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-600 mb-1.5 block font-medium">Complemento</label>
                                    <Input className="h-9 text-sm" value={editForm.complement || ""} onChange={e => setEditForm({ ...editForm, complement: e.target.value })} />
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Logradouro</span>
                                    <span className="text-sm text-slate-900">{client.address}, {client.houseNumber}</span>
                                </div>
                                <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Bairro</span>
                                    <span className="text-sm text-slate-900">{client.neighborhood}</span>
                                </div>
                                <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Cidade</span>
                                    <span className="text-sm text-slate-900">{client.city}</span>
                                </div>
                                <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">CEP</span>
                                    <span className="text-sm text-slate-900">{client.zipCode}</span>
                                </div>
                                {client.complement && (
                                    <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Complemento</span>
                                        <span className="text-sm text-slate-900">{client.complement}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Certificado Digital - Modo de Edição */}
                    {editing && (
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
                                <h2 className="text-sm font-semibold text-slate-900">Certificado Digital</h2>
                            </div>
                            <div className="p-5 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-600 mb-1.5 block font-medium">Tipo de Certificado</label>
                                    <select className="w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 bg-white" value={editForm.certificateType || ""} onChange={e => setEditForm({ ...editForm, certificateType: e.target.value })}>
                                        <option value="">Nenhum</option>
                                        <option value="A1">A1</option>
                                        <option value="A3">A3</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-600 mb-1.5 block font-medium">Data de Expiração</label>
                                    <Input type="date" className="h-9 text-sm" value={editForm.certificateExpiresDate || ""} onChange={e => setEditForm({ ...editForm, certificateExpiresDate: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sócio / Responsável */}
                    {(hasOwner || editing) && (
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
                                <h2 className="text-sm font-semibold text-slate-900">{client.type === "PJ" ? "Sócio / Responsável" : "Responsável"}</h2>
                            </div>
                            {editing ? (
                                <div className="p-5 grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">Nome</label>
                                        <Input className="h-9 text-sm" value={editForm.ownerName || ""} onChange={e => setEditForm({ ...editForm, ownerName: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">CPF</label>
                                        <Input className="h-9 text-sm" placeholder="000.000.000-00" value={editForm.ownerCpf || ""} onChange={e => setEditForm({ ...editForm, ownerCpf: maskCPF(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">Telefone</label>
                                        <Input className="h-9 text-sm" value={editForm.ownerPhone || ""} onChange={e => setEditForm({ ...editForm, ownerPhone: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-600 mb-1.5 block font-medium">Email</label>
                                        <Input className="h-9 text-sm" type="email" value={editForm.ownerEmail || ""} onChange={e => setEditForm({ ...editForm, ownerEmail: e.target.value })} />
                                    </div>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {client.ownerName && (
                                        <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Nome</span>
                                            <span className="text-sm text-slate-900">{client.ownerName}</span>
                                        </div>
                                    )}
                                    {client.ownerCpf && (
                                        <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">CPF</span>
                                            <span className="text-sm text-slate-900">{client.ownerCpf}</span>
                                        </div>
                                    )}
                                    {client.ownerPhone && (
                                        <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Telefone</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-slate-900">{client.ownerPhone}</span>
                                                <button onClick={() => window.open(`https://wa.me/55${cleanPhone(client.ownerPhone!)}`, "_blank")} className="text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"><MessageCircle size={14} /></button>
                                                <button onClick={() => handleCopy(client.ownerPhone!, "ownerPhone")} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">{copied === "ownerPhone" ? <Check size={14} className="text-emerald-500" /> : <Copy size={12} />}</button>
                                            </div>
                                        </div>
                                    )}
                                    {client.ownerEmail && (
                                        <div className="flex items-center py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Email</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-slate-900">{client.ownerEmail}</span>
                                                <button onClick={() => handleCopy(client.ownerEmail!, "ownerEmail")} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">{copied === "ownerEmail" ? <Check size={14} className="text-emerald-500" /> : <Copy size={12} />}</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Certificado */}
                    {hasCert && (
                        <div className={`border rounded-xl overflow-hidden ${certExpired ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
                            <div className={`px-5 py-3.5 border-b ${certExpired ? "border-red-200 bg-red-100" : "border-emerald-200 bg-emerald-100"}`}>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={16} className={certExpired ? "text-red-700" : "text-emerald-700"} />
                                    <h2 className="text-sm font-semibold text-slate-900">Certificado Digital</h2>
                                    <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${certExpired ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
                                        {certExpired ? "Vencido" : "Válido"}
                                    </span>
                                </div>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {client.certificateType && (
                                    <div className="flex items-center py-3 px-5 hover:bg-white/50 transition-colors">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Tipo</span>
                                        <span className="text-sm text-slate-900 font-medium">{client.certificateType}</span>
                                    </div>
                                )}
                                {client.certificateExpiresDate && (
                                    <div className="flex items-center py-3 px-5 hover:bg-white/50 transition-colors">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide w-40 shrink-0">Validade</span>
                                        <span className="text-sm text-slate-900 font-semibold">{formatDateShort(client.certificateExpiresDate)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Seriais de Produtos */}
                    {serials.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-slate-900">Produtos Contratados</h2>
                                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">{serials.length}</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {serials.map((serial) => {
                                    const isExpired = serial.expiresAt && new Date(serial.expiresAt) < new Date()
                                    const isExpiring = serial.expiresAt && !isExpired && new Date(serial.expiresAt) < new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)

                                    return (
                                        <div key={serial.id} className="group/serial flex items-center justify-between py-3 px-5 hover:bg-slate-50/50 transition-colors">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-medium text-slate-900">{serial.productName}</span>
                                                    {isExpired && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">Expirado</span>
                                                    )}
                                                    {isExpiring && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">Expirando</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-600">
                                                    <span className="font-mono">{serial.serial}</span>
                                                    {serial.expiresAt && (
                                                        <span>• Expira em {new Date(serial.expiresAt).toLocaleDateString('pt-BR')}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Tem certeza que deseja excluir este serial?')) {
                                                        toast.info('Função de exclusão em desenvolvimento')
                                                    }
                                                }}
                                                className="opacity-0 group-hover/serial:opacity-100 p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Anexos */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Paperclip size={16} className="text-slate-600" />
                                <p className="text-sm font-semibold text-slate-900">Anexos</p>
                                {client.attachments && client.attachments.length > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">{client.attachments.length}</span>
                                )}
                            </div>
                            <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer text-xs font-medium">
                                {attachUploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                {attachUploading ? "Enviando..." : "Selecionar"}
                                <input type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" multiple className="hidden" onChange={handleAttachSelect} disabled={attachUploading} />
                            </label>
                        </div>
                        <div>
                            {pendingAttachFiles.length > 0 && (
                                <div className="p-5 border-b border-slate-100 bg-slate-50/70">
                                    <div className="flex items-center justify-between gap-3 mb-3">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-800">Arquivos prontos para envio</p>
                                            <p className="text-[11px] text-slate-500">Revise o preview antes de anexar ao cliente.</p>
                                        </div>
                                        <Button className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleAttachUpload} disabled={attachUploading}>
                                            {attachUploading ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                                            Enviar arquivos
                                        </Button>
                                    </div>
                                    <LocalFilePreviewList files={pendingAttachFiles} onRemove={(index) => setPendingAttachFiles(prev => prev.filter((_, fileIndex) => fileIndex !== index))} />
                                </div>
                            )}
                            {(!client.attachments || client.attachments.length === 0) ? (
                                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                    <Paperclip size={20} className="mb-2 text-slate-300" />
                                    <p className="text-sm text-slate-500">Nenhum anexo</p>
                                </div>
                            ) : (
                                <div className="p-5">
                                    <div className="flex flex-wrap gap-3">
                                        {client.attachments.map((att: { id: string; url: string; fileName: string; fileType: string; fileSize: number }) => (
                                            <div key={att.id} className="relative group/att">
                                                {isImageFile(att.fileType) ? (
                                                    <a href={att.url} target="_blank" rel="noreferrer" className="block">
                                                        <img src={att.url} alt={att.fileName} className="w-24 h-20 rounded-lg object-cover border border-slate-200 hover:border-slate-300 transition-colors" />
                                                    </a>
                                                ) : (
                                                    <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
                                                        <FileText size={14} className="text-slate-400 shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="text-xs text-slate-700 font-medium truncate max-w-32">{att.fileName}</p>
                                                            <p className="text-xs text-slate-500">{formatFileSize(att.fileSize)}</p>
                                                        </div>
                                                        <Download size={12} className="text-slate-400 shrink-0" />
                                                    </a>
                                                )}
                                                <button onClick={() => deleteAttachMut.mutate(att.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity cursor-pointer" title="Remover"><X size={10} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tickets */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Ticket size={16} className="text-slate-600" />
                                <p className="text-sm font-semibold text-slate-900">Tickets</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                {openTickets > 0 && (
                                    <>
                                        <span className="font-semibold text-orange-600">{openTickets} abertos</span>
                                        <span className="text-slate-300">•</span>
                                    </>
                                )}
                                <span>{client.tickets.length} total</span>
                            </div>
                        </div>
                        <div>
                            {client.tickets.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                    <Ticket size={20} className="mb-2 text-slate-300" />
                                    <p className="text-sm text-slate-500">Nenhum ticket</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {client.tickets.map((ticket: TicketSummary) => (
                                        <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                                            <span className="text-xs font-mono font-semibold text-slate-400 shrink-0 w-8">#{ticket.ticketNumber}</span>
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityDot[ticket.priority] || "bg-slate-400"}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-slate-900 truncate">{ticket.ticketDescription}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{formatDateShort(ticket.createdAt)}{ticket.assignedTo ? ` · ${ticket.assignedTo}` : ""}</p>
                                            </div>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white shrink-0 ${statusBadgeColors[ticket.status] || "bg-slate-400"}`}>{statusLabels[ticket.status] || ticket.status}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Right: Properties sidebar ── */}
                <div className="w-80 shrink-0 border-l border-slate-200 bg-slate-50 overflow-y-auto">
                    <div className="px-5 space-y-4">

                        {/* Quick Info Cards */}
                        <div className="space-y-3">
                            {/* Suporte Status */}
                            <div className={`rounded-lg p-3 border ${client.supportReleased ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                                <p className="text-xs font-medium text-slate-600 mb-1.5">Status do Suporte</p>
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${client.supportReleased ? "bg-emerald-500" : "bg-red-500"}`} />
                                    <span className={`text-sm font-semibold ${client.supportReleased ? "text-emerald-700" : "text-red-700"}`}>{client.supportReleased ? "Liberado" : "Bloqueado"}</span>
                                </div>
                            </div>
                            {/* Modalidade de Contrato */}
                            {client.contractType && (
                                <div className={`rounded-lg p-3 border ${client.contractType === "CANCELADO"
                                        ? "bg-red-50 border-red-200"
                                        : client.contractType === "AVULSO"
                                            ? "bg-blue-50 border-blue-200"
                                            : "bg-emerald-50 border-emerald-200"
                                    }`}>
                                    <p className="text-xs font-medium text-slate-600 mb-1.5">Modalidade de Contrato</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${client.contractType === "CANCELADO"
                                                ? "bg-red-500"
                                                : client.contractType === "AVULSO"
                                                    ? "bg-blue-500"
                                                    : "bg-emerald-500"
                                            }`} />
                                        <span className={`text-sm font-semibold ${client.contractType === "CANCELADO"
                                                ? "text-red-700"
                                                : client.contractType === "AVULSO"
                                                    ? "text-blue-700"
                                                    : "text-emerald-700"
                                            }`}>
                                            {client.contractType}
                                        </span>
                                    </div>
                                    {client.contractType === "AVULSO" && (
                                        <p className="text-[10px] text-black mt-2 leading-tight">
                                            Cobrança por serviço prestado
                                        </p>
                                    )}
                                </div>
                            )}

                        </div>

                        {/* Phone Highlight */}
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

                        {/* Email Highlight */}
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



                        {/* Contacts Section */}
                        <div className="bg-white rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Users size={12} className="text-slate-600" />
                                    <p className="text-xs font-medium text-slate-600">Contatos ({client.contacts.length})</p>
                                </div>
                                <button onClick={() => setShowContactModal(true)} className="text-slate-400 hover:text-indigo-600 cursor-pointer" title="Adicionar contato">
                                    <Plus size={12} />
                                </button>
                            </div>
                            <div>
                                {client.contacts.length === 0 ? (
                                    <div className="px-3 py-4 text-center">
                                        <p className="text-xs text-slate-400">Nenhum contato cadastrado</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {client.contacts.map((contact: any) => (
                                            <div key={contact.id} className="px-3 py-2.5">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-semibold text-slate-900">{contact.name}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        {contact.role && <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{contact.role}</span>}
                                                        <button onClick={() => deleteContactMut.mutate(contact.id)} className="text-slate-300 hover:text-red-500 cursor-pointer" title="Remover contato"><Trash2 size={10} /></button>
                                                    </div>
                                                </div>
                                                {contact.phone && (
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <Phone size={9} className="text-slate-300" />
                                                        <span className="text-xs text-slate-600">{contact.phone}</span>
                                                        <button onClick={() => window.open(`https://wa.me/55${cleanPhone(contact.phone!)}`, "_blank")} className="text-slate-300 hover:text-emerald-500 cursor-pointer"><MessageCircle size={9} /></button>
                                                        <button onClick={() => handleCopy(contact.phone!, `contact-${contact.id}`)} className="text-slate-300 hover:text-slate-500 cursor-pointer">{copied === `contact-${contact.id}` ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}</button>
                                                    </div>
                                                )}
                                                {contact.email && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Mail size={9} className="text-slate-300" />
                                                        <span className="text-xs text-slate-600 truncate">{contact.email}</span>
                                                        <button onClick={() => handleCopy(contact.email!, `cemail-${contact.id}`)} className="text-slate-300 hover:text-slate-500 cursor-pointer shrink-0">{copied === `cemail-${contact.id}` ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}</button>
                                                    </div>
                                                )}
                                                {contact.bestContactTime && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock size={9} className="text-slate-300" />
                                                        <span className="text-xs text-slate-600">{contact.bestContactTime}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Informações Resumidas */}
                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50">
                                <p className="text-xs font-semibold text-slate-900">Resumo</p>
                            </div>
                            <div className="divide-y divide-slate-50">
                                <div className="px-3 py-2">
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">{client.cnpj ? "CNPJ" : "CPF"}</p>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-slate-900 font-mono">{doc}</span>
                                        <button onClick={() => handleCopy(doc, "doc")} className="text-slate-300 hover:text-slate-500 cursor-pointer">{copied === "doc" ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}</button>
                                    </div>
                                </div>
                                {client.ie && (
                                    <div className="px-3 py-2">
                                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">IE</p>
                                        <span className="text-xs text-slate-900">{client.ie}</span>
                                    </div>
                                )}
                                {client.cnae && (
                                    <div className="px-3 py-2">
                                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">CNAE</p>
                                        <span className="text-xs text-slate-900">{client.cnae}</span>
                                    </div>
                                )}
                                <div className="px-3 py-2">
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Cidade</p>
                                    <span className="text-xs text-slate-900">{client.city}</span>
                                </div>
                                <div className="px-3 py-2">
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Cadastro</p>
                                    <span className="text-xs text-slate-900">{formatDateShort(client.createdAt)}</span>
                                </div>
                                <div className="px-3 py-2">
                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Tickets</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-900">{client.tickets.length} total</span>
                                        {openTickets > 0 && (
                                            <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">{openTickets} abertos</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Bloquear/Liberar */}
            <Dialog open={showBlockModal} onOpenChange={(open) => { setShowBlockModal(open); if (!open) { setBlockReason(""); setContractCancelReason(""); setContractCancelDate("") } }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{client.supportReleased ? "Bloquear Suporte" : "Liberar Suporte"}</DialogTitle>
                        <DialogDescription>{client.supportReleased ? `Deseja bloquear o suporte para ${client.name}?` : `Deseja liberar o suporte para ${client.name}?`}</DialogDescription>
                    </DialogHeader>
                    {client.supportReleased && (
                        <div className="py-2 space-y-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Motivo do bloqueio *</label>
                                <select className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={blockReason} onChange={e => setBlockReason(e.target.value as typeof blockReason)}>
                                    <option value="">Selecione o motivo</option>
                                    <option value="CONTRATO_CANCELADO">Contrato cancelado</option>
                                    <option value="INADIMPLENCIA">Inadimplência</option>
                                    <option value="SOLICITACAO_CLIENTE">Solicitação do cliente</option>
                                    <option value="OUTROS">Outros</option>
                                </select>
                            </div>
                            
                            {blockReason === "CONTRATO_CANCELADO" && (
                                <div className="space-y-3 border-t pt-3">
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Motivo do cancelamento *</label>
                                        <select className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={contractCancelReason} onChange={e => setContractCancelReason(e.target.value)}>
                                            <option value="">Selecione o motivo</option>
                                            <option value="INADIMPLENCIA">Inadimplência</option>
                                            <option value="FIM_DE_CONTRATO">Fim de Contrato</option>
                                            <option value="MUTUO_ACORDO">Mútuo Acordo</option>
                                            <option value="DESCUMPRIMENTO">Descumprimento de Cláusulas</option>
                                            <option value="INSATISFACAO_COM_SERVICO">Insatisfação com o Serviço</option>
                                            <option value="MUDANCA_DE_FOCO">Mudança de Foco do Negócio</option>
                                            <option value="FUSAO_AQUISICAO">Fusão ou Aquisição</option>
                                            <option value="ENCERRAMENTO_ATIVIDADES">Encerramento de Atividades</option>
                                            <option value="OUTRO">Outro</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Data do cancelamento *</label>
                                        <Input 
                                            type="date" 
                                            className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" 
                                            value={contractCancelDate} 
                                            onChange={e => setContractCancelDate(e.target.value)} 
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowBlockModal(false)}>Cancelar</Button>
                        <Button
                            className={client.supportReleased ? "bg-red-500 hover:bg-red-600 text-white" : "bg-emerald-500 hover:bg-emerald-600 text-white"}
                            disabled={toggleSupportMutation.isPending || (client.supportReleased && !blockReason)}
                            onClick={handleBlockWithContractCancel}
                        >
                            {toggleSupportMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : (client.supportReleased ? "Bloquear" : "Liberar")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Adicionar Contato */}
            <Dialog open={showContactModal} onOpenChange={(open) => { setShowContactModal(open); if (!open) setContactForm({ name: "", phone: "", email: "", role: "", bestContactTime: "" }) }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Adicionar Contato</DialogTitle>
                        <DialogDescription>Preencha os dados do novo contato.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input placeholder="Nome *" value={contactForm.name} onChange={(e) => setContactForm(p => ({ ...p, name: e.target.value }))} />
                        <div className="grid grid-cols-2 gap-2">
                            <Input placeholder="Telefone" value={contactForm.phone} onChange={(e) => setContactForm(p => ({ ...p, phone: maskPhone(e.target.value) }))} />
                            <Input placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm(p => ({ ...p, email: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <select 
                                className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" 
                                value={contactForm.role}
                                onChange={(e) => setContactForm(p => ({ ...p, role: e.target.value }))}
                            >
                                <option value="">Selecione</option>
                                {CONTACT_ROLES.map(role => (
                                    <option key={role.value} value={role.value}>{role.label}</option>
                                ))}
                            </select>
                            <Input 
                                placeholder="Melhor horário" 
                                value={contactForm.bestContactTime} 
                                onChange={(e) => setContactForm(p => ({ ...p, bestContactTime: maskContactTime(e.target.value) }))} 
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => { setShowContactModal(false); setContactForm({ name: "", phone: "", email: "", role: "", bestContactTime: "" }) }}>Cancelar</Button>
                        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={!contactForm.name.trim() || addContactMut.isPending} onClick={() => {
                            // DEBUG: Log antes de enviar
                            console.log("[DEBUG] Modal enviando contato:", {
                                name: contactForm.name,
                                phone: contactForm.phone,
                                email: contactForm.email,
                                role: contactForm.role,
                                bestContactTime: contactForm.bestContactTime,
                                hasBestContactTime: !!contactForm.bestContactTime
                            })
                            
                            addContactMut.mutate({ 
                                name: contactForm.name, 
                                phone: contactForm.phone || undefined, 
                                email: contactForm.email || undefined, 
                                role: contactForm.role || undefined, 
                                bestContactTime: contactForm.bestContactTime || undefined 
                            })
                        }}>{addContactMut.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <TicketCreateDrawer
                open={showTicketDrawer}
                onOpenChange={setShowTicketDrawer}
                lockedClient={{
                    id: client.id,
                    name: client.name,
                    cnpj: client.cnpj || null,
                    cpf: client.cpf || null,
                }}
                title="Novo Ticket para Cliente"
                description="Abra um ticket já vinculado a este cliente."
            />
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
