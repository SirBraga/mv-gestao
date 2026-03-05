"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getClients, createClient } from "@/app/actions/clients"
import { getProducts, createClientProductSerial } from "@/app/actions/products"
import { getContabilities } from "@/app/actions/contability"
import ClientCard from "../_components/clientCard"
import type { ClientData } from "../_components/clientCard"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { toast } from "react-toastify"
import { maskCPF, maskCNPJ, maskPhone, maskCEP } from "@/app/utils/masks"
import { uploadFile } from "@/app/utils/upload"
import { ImagePositioner } from "../_components/ImagePositioner"
import {
    Search,
    Filter,
    ChevronUp,
    ChevronDown,
    Users,
    UserCheck,
    UserX,
    Star,
    ArrowUp,
    ArrowDown,
    Plus,
    ShieldAlert,
    AlertTriangle,
    Loader2,
    X,
    Check,
    Clock,
    AlertCircle,
} from "lucide-react"

type FilterType = "all" | "active" | "blocked" | "cert_expired" | "cert_expiring" | "serial_expired" | "serial_expiring"
type SortKey = "id" | "name" | "phone" | "email" | "status" | "contract" | "type"
type SortDir = "asc" | "desc"

function isCertExpired(dateStr: string | null) {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
}

function isCertExpiring30d(dateStr: string | null) {
    if (!dateStr) return false
    const exp = new Date(dateStr)
    const now = new Date()
    const in30 = new Date()
    in30.setDate(in30.getDate() + 30)
    return exp >= now && exp <= in30
}

function isSerialExpired(client: any) {
    // Verifica se o cliente tem algum serial expirado
    if (!client.clientProductSerials || client.clientProductSerials.length === 0) return false
    return client.clientProductSerials.some((serial: any) => {
        if (!serial.expiresAt) return false
        return new Date(serial.expiresAt) < new Date()
    })
}

function isSerialExpiring45d(client: any) {
    // Verifica se o cliente tem algum serial expirando nos próximos 45 dias
    if (!client.clientProductSerials || client.clientProductSerials.length === 0) return false
    const now = new Date()
    const in45 = new Date()
    in45.setDate(in45.getDate() + 45)
    
    return client.clientProductSerials.some((serial: any) => {
        if (!serial.expiresAt) return false
        const exp = new Date(serial.expiresAt)
        return exp >= now && exp <= in45
    })
}

const INITIAL_FORM = {
    name: "", type: "PJ" as "PF" | "PJ", cnpj: "", cpf: "", ie: "", state: "",
    codigoCSC: "", tokenCSC: "",
    cnae: "", businessSector: "",
    phone: "", email: "", aditionalInfo: "",
    address: "", city: "", houseNumber: "", neighborhood: "", zipCode: "", complement: "",
    ownerName: "", ownerPhone: "", ownerEmail: "", ownerCpf: "",
    hasContract: false, contractType: "" as "" | "MENSAL" | "ANUAL" | "AVULSO" | "CANCELADO",
    supportReleased: false,
    certificateType: "", certificateExpiresDate: "",
    photoUrl: "",
}

const STATES = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]

const FILTERS = [
    { key: "all" as FilterType, label: "Todos", icon: Users },
    { key: "active" as FilterType, label: "Liberados", icon: UserCheck },
    { key: "blocked" as FilterType, label: "Bloqueados", icon: UserX },
    { key: "cert_expiring" as FilterType, label: "Cert. Vencendo", icon: AlertTriangle },
    { key: "cert_expired" as FilterType, label: "Cert. Vencido", icon: ShieldAlert },
    { key: "serial_expiring" as FilterType, label: "Serial Vencendo", icon: AlertCircle },
    { key: "serial_expired" as FilterType, label: "Serial Vencido", icon: Clock },
]

const COLUMNS: { key: SortKey; label: string }[] = [
    { key: "name", label: "Cliente" },
    { key: "phone", label: "Telefone" },
    { key: "email", label: "Email" },
    { key: "status", label: "Status" },
    { key: "contract", label: "Contrato" },
    { key: "type", label: "Tipo" },
]

function compareClients(a: ClientData, b: ClientData, key: SortKey, dir: SortDir): number {
    let valA: string | boolean = ""
    let valB: string | boolean = ""
    switch (key) {
        case "id": valA = a.id; valB = b.id; break
        case "name": valA = a.name; valB = b.name; break
        case "phone": valA = a.phone || ""; valB = b.phone || ""; break
        case "email": valA = a.email || ""; valB = b.email || ""; break
        case "status": valA = a.supportReleased; valB = b.supportReleased; break
        case "contract": valA = a.hasContract; valB = b.hasContract; break
        case "type": valA = a.type; valB = b.type; break
    }
    if (typeof valA === "boolean") {
        const cmp = (valA === valB) ? 0 : valA ? -1 : 1
        return dir === "asc" ? cmp : -cmp
    }
    const cmp = String(valA).localeCompare(String(valB), "pt-BR", { numeric: true })
    return dir === "asc" ? cmp : -cmp
}

export default function Clientes() {
    const queryClient = useQueryClient()
    const [activeFilter, setActiveFilter] = useState<FilterType>("all")
    const [defaultOpen, setDefaultOpen] = useState(true)
    const [favoritesOpen, setFavoritesOpen] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [sortKey, setSortKey] = useState<SortKey>("name")
    const [sortDir, setSortDir] = useState<SortDir>("asc")
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [form, setForm] = useState(INITIAL_FORM)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [photoSrc, setPhotoSrc] = useState<string | null>(null)
    const [photoPos, setPhotoPos] = useState("50% 50%")
    const [uploading, setUploading] = useState(false)
    const [cepLoading, setCepLoading] = useState(false)
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
    const [selectedContabilityIds, setSelectedContabilityIds] = useState<string[]>([])
    const [productSearch, setProductSearch] = useState("")
    const [contabilitySearch, setContabilitySearch] = useState("")
    const [productSerials, setProductSerials] = useState<Record<string, { serial: string; expiresAt: string }>>({})

    const { data: clients = [], isLoading } = useQuery({
        queryKey: ["clients"],
        queryFn: () => getClients(),
    })

    const { data: allProducts = [] } = useQuery({
        queryKey: ["products-list"],
        queryFn: () => getProducts(),
        enabled: drawerOpen,
    })

    const { data: allContabilities = [] } = useQuery({
        queryKey: ["contabilities-list"],
        queryFn: () => getContabilities(),
        enabled: drawerOpen,
    })

    const fetchViaCEP = async (cep: string) => {
        if (cep.replace(/\D/g, "").length !== 8) return
        setCepLoading(true)
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, "")}/json/`)
            const data = await res.json()
            if (!data.erro) {
                setForm(f => ({
                    ...f,
                    address: data.logradouro || f.address,
                    neighborhood: data.bairro || f.neighborhood,
                    city: data.localidade || f.city,
                    state: data.uf || f.state,
                }))
            }
        } catch {
            // Silently fail
        } finally {
            setCepLoading(false)
        }
    }

    const createMutation = useMutation({
        mutationFn: createClient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] })
            setDrawerOpen(false)
            setForm(INITIAL_FORM)
            toast.success("Cliente criado com sucesso!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === "asc" ? "desc" : "asc")
        } else {
            setSortKey(key)
            setSortDir("desc")
        }
    }

    const handleSubmit = async () => {
        if (!form.name.trim()) return toast.error("Nome é obrigatório")
        if (!form.city.trim()) return toast.error("Cidade é obrigatória")
        
        // Validar seriais para produtos que exigem
        const productsNeedingSerial = selectedProductIds.filter(productId => {
            const product = (allProducts as {id: string; name: string; hasSerialControl: boolean}[]).find(p => p.id === productId)
            return product?.hasSerialControl
        })
        
        for (const productId of productsNeedingSerial) {
            const serialData = productSerials[productId]
            if (!serialData?.serial.trim()) {
                const product = (allProducts as {id: string; name: string}[]).find(p => p.id === productId)
                return toast.error(`Serial é obrigatório para o produto: ${product?.name}`)
            }
        }
        
        setUploading(true)
        try {
            let photoUrl = form.photoUrl
            if (photoFile) {
                const res = await uploadFile(photoFile, "clientes")
                photoUrl = res.url
            }
            await createMutation.mutateAsync({
                name: form.name, type: form.type,
                cnpj: form.type === "PJ" ? form.cnpj : undefined,
                cpf: form.type === "PF" ? form.cpf : undefined,
                ie: form.ie || undefined,
                state: form.state || undefined,
                codigoCSC: form.type === "PJ" ? form.codigoCSC || undefined : undefined,
                tokenCSC: form.type === "PJ" ? form.tokenCSC || undefined : undefined,
                cnae: form.type === "PJ" ? form.cnae || undefined : undefined,
                businessSector: form.type === "PJ" ? form.businessSector || undefined : undefined,
                address: form.address, city: form.city, houseNumber: form.houseNumber,
                neighborhood: form.neighborhood, zipCode: form.zipCode, complement: form.complement,
                aditionalInfo: form.aditionalInfo || undefined,
                contractType: form.contractType || undefined,
                certificateType: form.certificateType || undefined,
                certificateExpiresDate: form.certificateExpiresDate ? new Date(form.certificateExpiresDate) : undefined,
                photoUrl: photoUrl || undefined,
                ownerName: form.ownerName || undefined, ownerPhone: form.ownerPhone || undefined,
                ownerEmail: form.ownerEmail || undefined, ownerCpf: form.ownerCpf || undefined,
                hasContract: form.hasContract, supportReleased: form.supportReleased,
            })
            
            // Salvar seriais dos produtos
            for (const productId of selectedProductIds) {
                const serialData = productSerials[productId]
                if (serialData?.serial.trim()) {
                    await createClientProductSerial({
                        clientId: createMutation.data?.id || "",
                        productId,
                        serial: serialData.serial,
                        expiresAt: serialData.expiresAt ? new Date(serialData.expiresAt) : undefined,
                    })
                }
            }
            
            setPhotoFile(null)
            setPhotoSrc(null)
            setPhotoPos("50% 50%")
            setSelectedProductIds([])
            setProductSerials({})
        } catch {
            // error handled by mutation onError
        } finally {
            setUploading(false)
        }
    }

    const filteredClients = useMemo(() => {
        return (clients as ClientData[])
            .filter((client) => {
                const matchesFilter =
                    activeFilter === "all" ||
                    (activeFilter === "active" && client.supportReleased) ||
                    (activeFilter === "blocked" && !client.supportReleased) ||
                    (activeFilter === "cert_expired" && isCertExpired(client.certificateExpiresDate)) ||
                    (activeFilter === "cert_expiring" && isCertExpiring30d(client.certificateExpiresDate)) ||
                    (activeFilter === "serial_expired" && isSerialExpired(client)) ||
                    (activeFilter === "serial_expiring" && isSerialExpiring45d(client))

                const matchesSearch =
                    !searchQuery ||
                    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (client.cnpj || "").includes(searchQuery) ||
                    (client.cpf || "").includes(searchQuery)

                return matchesFilter && matchesSearch
            })
            .sort((a, b) => compareClients(a, b, sortKey, sortDir))
    }, [clients, activeFilter, searchQuery, sortKey, sortDir])

    const allClients = clients as ClientData[]
    const counts: Record<FilterType, number> = {
        all: allClients.length,
        active: allClients.filter((c) => c.supportReleased).length,
        blocked: allClients.filter((c) => !c.supportReleased).length,
        cert_expiring: allClients.filter((c) => isCertExpiring30d(c.certificateExpiresDate)).length,
        cert_expired: allClients.filter((c) => isCertExpired(c.certificateExpiresDate)).length,
        serial_expiring: allClients.filter((c) => isSerialExpiring45d(c)).length,
        serial_expired: allClients.filter((c) => isSerialExpired(c)).length,
    }

    return (
        <div className="flex h-full bg-slate-50">
            {/* Left Filter Panel */}
            <div className="w-60 min-w-60 bg-white h-full flex flex-col px-4 pt-6 border-r border-slate-200">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-lg font-bold text-slate-900">Clientes</h1>
                    <p className="text-xs text-slate-500 mt-0.5">{counts.all} cadastrados</p>
                </div>

                {/* Filtros section */}
                <div className="mb-6">
                    <button
                        onClick={() => setDefaultOpen(!defaultOpen)}
                        className="flex items-center justify-between w-full px-2 mb-2"
                    >
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtros</span>
                        {defaultOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </button>

                    {defaultOpen && (
                        <div className="flex flex-col gap-0.5">
                            {FILTERS.map((filter) => {
                                const Icon = filter.icon
                                const isActive = activeFilter === filter.key
                                return (
                                    <button
                                        key={filter.key}
                                        onClick={() => setActiveFilter(filter.key)}
                                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                                            isActive
                                                ? "bg-indigo-50 text-indigo-700 font-medium"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon size={16} strokeWidth={1.5} />
                                            <span>{filter.label}</span>
                                        </div>
                                        <span className={`text-xs min-w-6 text-center rounded-full px-2 py-0.5 font-semibold ${
                                            isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                                        }`}>{counts[filter.key]}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Favourites Section */}
                <div>
                    <button
                        onClick={() => setFavoritesOpen(!favoritesOpen)}
                        className="flex items-center justify-between w-full px-2 mb-2"
                    >
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Favoritos</span>
                        {favoritesOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
                    </button>

                    {favoritesOpen && (
                        <div className="flex items-center gap-2.5 px-3 py-3 text-slate-400 text-sm bg-slate-50 rounded-xl">
                            <Star size={16} />
                            <span>Nenhum favorito</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Top Bar */}
                <div className="flex items-center justify-between px-6 h-16 bg-white border-b border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <Input
                                placeholder="Buscar clientes..."
                                className="pl-10 pr-4 w-72 bg-slate-50 border-slate-200 h-10 text-sm rounded-xl focus-visible:ring-indigo-500 placeholder:text-slate-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm shadow-indigo-600/25">
                            <Plus size={16} /> Novo Cliente
                        </button>
                    </div>
                </div>

                {/* Column Headers */}
                <div className="grid grid-cols-[1.5fr_1fr_1fr_120px_110px_50px] gap-3 px-6 py-3 border-b border-slate-200 bg-slate-50">
                    {COLUMNS.map((col) => (
                        <button
                            key={col.key}
                            onClick={() => handleSort(col.key)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer select-none uppercase tracking-wider"
                        >
                            {col.label}
                            {sortKey === col.key && (
                                sortDir === "desc"
                                    ? <ArrowDown size={12} />
                                    : <ArrowUp size={12} />
                            )}
                        </button>
                    ))}
                </div>

                {/* Rows */}
                <div className="flex-1 overflow-y-auto bg-white">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 size={28} className="animate-spin text-indigo-600" />
                            <p className="text-sm text-slate-500 mt-3">Carregando clientes...</p>
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Users size={40} className="text-slate-300 mb-3" />
                            <p className="text-sm font-medium text-slate-600">Nenhum cliente encontrado</p>
                            <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou busca</p>
                        </div>
                    ) : (
                        filteredClients.map((client) => (
                            <ClientCard key={client.id} client={client} />
                        ))
                    )}
                </div>
            </div>
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent side="right" className="sm:max-w-md w-full p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
                        <SheetTitle className="text-base">Novo Cliente</SheetTitle>
                        <SheetDescription className="text-xs">Preencha os dados para cadastrar um novo cliente.</SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                        {/* Foto */}
                        <div className="mx-auto w-28">
                            <ImagePositioner src={photoSrc} position={photoPos} onPositionChange={setPhotoPos} onFileSelect={(f: File) => { setPhotoFile(f); setPhotoSrc(URL.createObjectURL(f)) }} onRemove={() => { setPhotoFile(null); setPhotoSrc(null); setPhotoPos("50% 50%") }} aspectClass="aspect-square" label="Foto" rounded />
                        </div>

                        {/* Dados básicos */}
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dados do Cliente</p>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nome / Razão social *</label>
                            <Input placeholder="Ex: Empresa ABC Ltda" className="h-9 rounded-lg text-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tipo</label>
                                <select className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.type} onChange={e => setForm({...form, type: e.target.value as "PF"|"PJ"})}>
                                    <option value="PJ">Pessoa Jurídica</option>
                                    <option value="PF">Pessoa Física</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{form.type === "PJ" ? "CNPJ" : "CPF"}</label>
                                <Input placeholder={form.type === "PJ" ? "00.000.000/0001-00" : "000.000.000-00"} className="h-9 rounded-lg text-sm" value={form.type === "PJ" ? form.cnpj : form.cpf} onChange={e => setForm({...form, [form.type === "PJ" ? "cnpj" : "cpf"]: form.type === "PJ" ? maskCNPJ(e.target.value) : maskCPF(e.target.value)})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">IE</label>
                                <Input placeholder="Inscrição Estadual" className="h-9 rounded-lg text-sm" value={form.ie} onChange={e => setForm({...form, ie: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Telefone</label>
                                <Input placeholder="(00) 00000-0000" className="h-9 rounded-lg text-sm" value={form.phone} onChange={e => setForm({...form, phone: maskPhone(e.target.value)})} />
                            </div>
                        </div>
                        
                        {/* CNAE e Ramo de Atividade (apenas PJ) */}
                        {form.type === "PJ" && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">CNAE</label>
                                    <Input placeholder="0000-0/00" className="h-9 rounded-lg text-sm" value={form.cnae} onChange={e => setForm({...form, cnae: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Ramo de Atividade</label>
                                    <select className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.businessSector} onChange={e => setForm({...form, businessSector: e.target.value})}>
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
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
                            <Input placeholder="email@empresa.com" className="h-9 rounded-lg text-sm" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                        </div>

                        {/* CSC / Token (only PJ) */}
                        {form.type === "PJ" && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Código CSC</label>
                                    <Input placeholder="Código CSC" className="h-9 rounded-lg text-sm" value={form.codigoCSC} onChange={e => setForm({...form, codigoCSC: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Token CSC</label>
                                    <Input placeholder="Token" className="h-9 rounded-lg text-sm" value={form.tokenCSC} onChange={e => setForm({...form, tokenCSC: e.target.value})} />
                                </div>
                            </div>
                        )}

                        {/* Endereço */}
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-2">Endereço</p>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Logradouro</label>
                            <Input placeholder="Rua, Avenida..." className="h-9 rounded-lg text-sm" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cidade *</label>
                                <Input placeholder="São Paulo" className="h-9 rounded-lg text-sm" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Bairro</label>
                                <Input placeholder="Centro" className="h-9 rounded-lg text-sm" value={form.neighborhood} onChange={e => setForm({...form, neighborhood: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">CEP</label>
                                <div className="relative flex items-center">
                                    <Input placeholder="00000-000" className="h-9 rounded-lg text-sm pr-8" value={form.zipCode} onChange={e => setForm({...form, zipCode: maskCEP(e.target.value)})} />
                                    <button
                                        type="button"
                                        title="Buscar endereço pelo CEP"
                                        disabled={form.zipCode.replace(/\D/g, "").length !== 8 || cepLoading}
                                        onClick={() => fetchViaCEP(form.zipCode)}
                                        className="absolute right-2 text-gray-400 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                    >
                                        {cepLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Estado</label>
                                <select className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.state} onChange={e => setForm({...form, state: e.target.value})}>
                                    <option value="">UF</option>
                                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nº</label>
                                <Input placeholder="123" className="h-9 rounded-lg text-sm" value={form.houseNumber} onChange={e => setForm({...form, houseNumber: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Complemento</label>
                            <Input placeholder="Sala 1" className="h-9 rounded-lg text-sm" value={form.complement} onChange={e => setForm({...form, complement: e.target.value})} />
                        </div>

                        {/* Contrato */}
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-2">Contrato</p>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input type="checkbox" checked={form.hasContract} onChange={e => setForm({...form, hasContract: e.target.checked})} className="rounded" /> Tem contrato
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input type="checkbox" checked={form.supportReleased} onChange={e => setForm({...form, supportReleased: e.target.checked})} className="rounded" /> Suporte liberado
                            </label>
                        </div>
                        {form.hasContract && (
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tipo de Contrato</label>
                                <select className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.contractType} onChange={e => setForm({...form, contractType: e.target.value as "" | "MENSAL" | "ANUAL" | "AVULSO" | "CANCELADO"})}>
                                    <option value="">Selecione</option>
                                    <option value="MENSAL">Mensal</option>
                                    <option value="ANUAL">Anual</option>
                                    <option value="AVULSO">Avulso</option>
                                    <option value="CANCELADO">Cancelado</option>
                                </select>
                            </div>
                        )}

                        {/* Proprietário */}
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-2">Dados do Proprietário</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nome</label>
                                <Input placeholder="Nome do proprietário" className="h-9 rounded-lg text-sm" value={form.ownerName} onChange={e => setForm({...form, ownerName: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">CPF</label>
                                <Input placeholder="000.000.000-00" className="h-9 rounded-lg text-sm" value={form.ownerCpf} onChange={e => setForm({...form, ownerCpf: maskCPF(e.target.value)})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Telefone</label>
                                <Input placeholder="(00) 00000-0000" className="h-9 rounded-lg text-sm" value={form.ownerPhone} onChange={e => setForm({...form, ownerPhone: maskPhone(e.target.value)})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
                                <Input placeholder="email@proprietario.com" className="h-9 rounded-lg text-sm" value={form.ownerEmail} onChange={e => setForm({...form, ownerEmail: e.target.value})} />
                            </div>
                        </div>
                        
                        {/* Produtos contratados (opcional) */}
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-2">Produtos Contratados <span className="normal-case font-normal">(opcional)</span></p>
                        <div>
                            <div className="relative mb-1.5">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                                <Input placeholder="Buscar produto..." className="pl-8 h-9 rounded-lg text-sm" value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                            </div>
                            <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg">
                                {(allProducts as {id: string; name: string; hasSerialControl: boolean}[])
                                    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                                    .map(p => {
                                        const selected = selectedProductIds.includes(p.id)
                                        return (
                                            <div key={p.id} className="border-b border-gray-100 last:border-b-0">
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
                                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors cursor-pointer ${selected ? "bg-emerald-50 text-emerald-700" : "text-gray-700"}`}
                                                >
                                                    <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${selected ? "bg-emerald-500 border-emerald-500" : "border-gray-300"}`}>
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
                                                                <label className="text-xs font-medium text-gray-500 mb-1 block">Serial</label>
                                                                <Input
                                                                    placeholder="Número do serial"
                                                                    className="h-8 rounded text-xs"
                                                                    value={productSerials[p.id]?.serial || ""}
                                                                    onChange={e => setProductSerials(prev => ({
                                                                        ...prev,
                                                                        [p.id]: { ...prev[p.id], serial: e.target.value }
                                                                    }))}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-medium text-gray-500 mb-1 block">Expiração</label>
                                                                <Input
                                                                    type="date"
                                                                    className="h-8 rounded text-xs"
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
                                {(allProducts as {id: string; name: string}[]).filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                                    <p className="text-xs text-gray-400 px-3 py-2">Nenhum produto encontrado</p>
                                )}
                            </div>
                            {selectedProductIds.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                    {selectedProductIds.map(id => {
                                        const p = (allProducts as {id: string; name: string}[]).find(x => x.id === id)
                                        return p ? (
                                            <span key={id} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium">
                                                {p.name}
                                                <button type="button" onClick={() => setSelectedProductIds(prev => prev.filter(x => x !== id))} className="cursor-pointer hover:text-red-500"><X size={9} /></button>
                                            </span>
                                        ) : null
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Contabilidades (opcional) */}
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-2">Contabilidades <span className="normal-case font-normal">(opcional)</span></p>
                        <div>
                            <div className="relative mb-1.5">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                                <Input placeholder="Buscar contabilidade..." className="pl-8 h-9 rounded-lg text-sm" value={contabilitySearch} onChange={e => setContabilitySearch(e.target.value)} />
                            </div>
                            <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg">
                                {(allContabilities as {id: string; name: string | null; cnpj: string | null; cpf: string | null; clientNames: string}[])
                                    .filter(c => (c.name || c.clientNames || "").toLowerCase().includes(contabilitySearch.toLowerCase()) || (c.cnpj || "").includes(contabilitySearch) || (c.cpf || "").includes(contabilitySearch))
                                    .map(c => {
                                        const selected = selectedContabilityIds.includes(c.id)
                                        return (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => setSelectedContabilityIds(prev => selected ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors cursor-pointer ${selected ? "bg-blue-50 text-blue-700" : "text-gray-700"}`}
                                            >
                                                <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${selected ? "bg-blue-500 border-blue-500" : "border-gray-300"}`}>
                                                    {selected && <Check size={10} className="text-white" />}
                                                </span>
                                                <span className="flex-1 min-w-0">
                                                    <span className="block truncate">{c.name || c.clientNames}</span>
                                                    <span className="text-[10px] text-gray-400">{c.cnpj || c.cpf || ""}</span>
                                                </span>
                                            </button>
                                        )
                                    })}
                                {(allContabilities as {id: string; name: string | null; cnpj: string | null; cpf: string | null; clientNames: string}[]).filter(c => (c.name || c.clientNames || "").toLowerCase().includes(contabilitySearch.toLowerCase()) || (c.cnpj || "").includes(contabilitySearch) || (c.cpf || "").includes(contabilitySearch)).length === 0 && (
                                    <p className="text-xs text-gray-400 px-3 py-2">Nenhuma contabilidade encontrada</p>
                                )}
                            </div>
                            {selectedContabilityIds.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                    {selectedContabilityIds.map(id => {
                                        const c = (allContabilities as {id: string; name: string | null; clientNames: string}[]).find(x => x.id === id)
                                        return c ? (
                                            <span key={id} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium">
                                                {c.name || c.clientNames}
                                                <button type="button" onClick={() => setSelectedContabilityIds(prev => prev.filter(x => x !== id))} className="cursor-pointer hover:text-red-500"><X size={9} /></button>
                                            </span>
                                        ) : null
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Certificado Digital */}
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-2">Certificado Digital (Opcional)</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tipo de Certificado</label>
                                <select className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.certificateType || ""} onChange={e => setForm({...form, certificateType: e.target.value})}>
                                    <option value="">Selecione</option>
                                    <option value="A1">A1</option>
                                    <option value="A3">A3</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Data de Expiração</label>
                                <Input 
                                    type="date" 
                                    className="h-9 rounded-lg text-sm" 
                                    value={form.certificateExpiresDate || ""} 
                                    onChange={e => setForm({...form, certificateExpiresDate: e.target.value})} 
                                />
                            </div>
                        </div>

                        {/* Descrição */}
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-2">Informações Adicionais</p>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Descrição / Observações</label>
                            <textarea placeholder="Observações sobre o cliente..." className="w-full min-h-20 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white resize-y" value={form.aditionalInfo} onChange={e => setForm({...form, aditionalInfo: e.target.value})} />
                        </div>
                    </div>
                    <SheetFooter className="px-6 py-4 border-t border-gray-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
                            <Button className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm" onClick={handleSubmit} disabled={createMutation.isPending || uploading}>
                                {(createMutation.isPending || uploading) ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                                Salvar Cliente
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    )
}