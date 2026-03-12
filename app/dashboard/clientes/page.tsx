"use client"

import { useEffect, useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getClients, createClient, addClientContact } from "@/app/actions/clients"
import { getProductOptions, createClientProductSerial } from "@/app/actions/products"
import { getContabilityOptions } from "@/app/actions/contability"
import { lookupCnpj } from "@/app/actions/cnpj"
import ClientCard from "../_components/clientCard"
import type { ClientData } from "../_components/clientCard"
import { GlobalScreenLoader } from "@/app/components/global-screen-loader"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { MultiSelect } from "@/components/ui/multi-select"
import { toast } from "react-toastify"
import { maskCPF, maskCNPJ, maskPhone, maskCEP, maskContactTime } from "@/app/utils/masks"
import { uploadFile } from "@/app/utils/upload"
import { CONTACT_ROLES, CERTIFICATE_TYPES } from "@/app/constants/options"
import { ImagePositioner } from "../_components/ImagePositioner"
import { getEntityDisplayName } from "@/app/utils/entity-names"
import {
    Search,
    ChevronUp,
    ChevronDown,
    Users,
    UserCheck,
    UserX,
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
    Trash2,
    Phone,
    Mail,
    Pencil,
    Save,
} from "lucide-react"

type FilterType = "all" | "active" | "blocked" | "cert_expired" | "cert_expiring" | "serial_expired" | "serial_expiring"
type StatusFilterType = "all" | "active" | "inactive"
type SortKey = "id" | "name" | "phone" | "email" | "status" | "contract" | "type"
type SortDir = "asc" | "desc"

function normalizeDigits(value: string) {
    return value.replace(/\D/g, "")
}

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
    name: "", razaoSocial: "", nomeFantasia: "", type: "PJ" as "PF" | "PJ", cnpj: "", cpf: "", ie: "", state: "",
    codigoCSC: "", tokenCSC: "",
    cnae: "", businessSector: "",
    phone: "", mobile: "", email: "", aditionalInfo: "",
    address: "", city: "", houseNumber: "", neighborhood: "", zipCode: "", complement: "",
    ownerName: "", ownerPhone: "", ownerEmail: "", ownerCpf: "",
    hasContract: true, contractType: "MENSAL" as "MENSAL" | "ANUAL" | "AVULSO",
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

const STATUS_FILTERS = [
    { key: "all" as StatusFilterType, label: "Todos", icon: Users },
    { key: "active" as StatusFilterType, label: "Ativos", icon: UserCheck },
    { key: "inactive" as StatusFilterType, label: "Inativos", icon: UserX },
]

const COLUMNS: { key: SortKey; label: string }[] = [
    { key: "name", label: "Cliente" },
    { key: "phone", label: "Telefone" },
    { key: "email", label: "Email" },
    { key: "status", label: "Suporte" },
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
        case "contract": valA = a.contractType || ""; valB = b.contractType || ""; break
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
    const [activeStatusFilter, setActiveStatusFilter] = useState<StatusFilterType>("all")
    const [activeProductId, setActiveProductId] = useState<string>("")
    const [defaultOpen, setDefaultOpen] = useState(true)
    const [statusOpen, setStatusOpen] = useState(true)
    const [productsOpen, setProductsOpen] = useState(true)
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
    const [cnpjLoading, setCnpjLoading] = useState(false)
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
    const [selectedContabilityIds, setSelectedContabilityIds] = useState<string[]>([])
    const [productSerials, setProductSerials] = useState<Record<string, { serial: string; expiresAt: string }>>({})
    const [extraContacts, setExtraContacts] = useState<Array<{ id: string; name: string; phone: string; email: string; role: string; bestContactTime: string }>>([])
    const [expandedContacts, setExpandedContacts] = useState<Record<string, boolean>>({})

    const { data: clients = [], isLoading } = useQuery({
        queryKey: ["clients"],
        queryFn: () => getClients(),
    })

    const { data: allProducts = [] } = useQuery({
        queryKey: ["products-list"],
        queryFn: () => getProductOptions(),
        enabled: drawerOpen,
        staleTime: 30 * 60 * 1000,
    })

    const { data: allContabilities = [] } = useQuery({
        queryKey: ["contabilities-list"],
        queryFn: () => getContabilityOptions(),
        enabled: drawerOpen,
        staleTime: 30 * 60 * 1000,
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
        onSuccess: (result, variables) => {
            queryClient.setQueryData(["clients"], (old: ClientData[] | undefined) => {
                if (!Array.isArray(old)) return old

                return [
                    {
                        id: result.id || "",
                        name: getEntityDisplayName({
                            type: variables.type,
                            name: variables.name,
                            razaoSocial: variables.razaoSocial,
                            nomeFantasia: variables.nomeFantasia,
                        }),
                        razaoSocial: variables.razaoSocial || null,
                        nomeFantasia: variables.nomeFantasia || null,
                        cnpj: variables.cnpj,
                        cpf: variables.cpf,
                        type: variables.type,
                        city: variables.city,
                        phone: variables.ownerPhone || null,
                        email: variables.ownerEmail || null,
                        hasContract: true,
                        isActive: true,
                        contractType: variables.contractType || undefined,
                        supportReleased: variables.supportReleased ?? false,
                        certificateExpiresDate: variables.certificateExpiresDate?.toISOString() || null,
                        certificateType: variables.certificateType || undefined,
                        ticketCount: 0,
                        contactCount: 0,
                        clientProductSerials: [],
                        createdAt: new Date().toISOString(),
                    },
                    ...old,
                ]
            })
            queryClient.invalidateQueries({ queryKey: ["clients"] })
            setDrawerOpen(false)
            setForm(INITIAL_FORM)
            setExtraContacts([])
            setExpandedContacts({})
            toast.success("Cliente criado com sucesso!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const applyCnpjDataToForm = async () => {
        if (form.type !== "PJ") return

        try {
            setCnpjLoading(true)
            const data = await lookupCnpj(form.cnpj)
            setForm((current) => ({
                ...current,
                cnpj: maskCNPJ(data.cnpj || current.cnpj),
                razaoSocial: data.razaoSocial || current.razaoSocial,
                nomeFantasia: data.nomeFantasia || current.nomeFantasia,
                name: data.nomeFantasia || data.razaoSocial || current.name,
                ie: data.ie || current.ie,
                cnae: data.cnae || current.cnae,
                businessSector: data.mainActivity || current.businessSector,
                phone: data.phone ? maskPhone(data.phone) : current.phone,
                email: data.email || current.email,
                address: data.address || current.address,
                houseNumber: data.houseNumber || current.houseNumber,
                neighborhood: data.neighborhood || current.neighborhood,
                zipCode: data.zipCode ? maskCEP(data.zipCode) : current.zipCode,
                city: data.city || current.city,
                state: data.state || current.state,
            }))
            toast.success("Dados do CNPJ carregados com sucesso!")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Não foi possível consultar o CNPJ")
        } finally {
            setCnpjLoading(false)
        }
    }

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === "asc" ? "desc" : "asc")
        } else {
            setSortKey(key)
            setSortDir("desc")
        }
    }

    // Funções para contatos extras
    const addExtraContact = () => {
        const newContact = {
            id: Date.now().toString(),
            name: "",
            phone: "",
            email: "",
            role: "",
            bestContactTime: ""
        }
        setExtraContacts(prev => [...prev, newContact])
        setExpandedContacts(prev => ({ ...prev, [newContact.id]: true }))
    }

    const updateExtraContact = (id: string, field: keyof typeof extraContacts[0], value: string) => {
        setExtraContacts(prev => prev.map(contact => 
            contact.id === id ? { ...contact, [field]: value } : contact
        ))
    }

    const removeExtraContact = (id: string) => {
        setExtraContacts(prev => prev.filter(contact => contact.id !== id))
        setExpandedContacts(prev => {
            const newExpanded = { ...prev }
            delete newExpanded[id]
            return newExpanded
        })
    }

    const toggleContactExpanded = (id: string) => {
        setExpandedContacts(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const handleSubmit = async () => {
        if (form.type === "PF" && !form.name.trim()) return toast.error("Nome é obrigatório")
        if (form.type === "PJ" && !form.razaoSocial.trim()) return toast.error("Razão social é obrigatória")
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
            const createdClient = await createMutation.mutateAsync({
                name: form.type === "PJ" ? (form.nomeFantasia || form.razaoSocial || form.name) : form.name,
                razaoSocial: form.type === "PJ" ? form.razaoSocial || undefined : undefined,
                nomeFantasia: form.type === "PJ" ? form.nomeFantasia || undefined : undefined,
                type: form.type,
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
                hasContract: true, supportReleased: form.supportReleased,
                contabilityId: selectedContabilityIds[0] || undefined,
            })

            await Promise.all([
                ...selectedProductIds.flatMap((productId) => {
                    const serialData = productSerials[productId]
                    if (!serialData?.serial.trim()) return []

                    return [
                        createClientProductSerial({
                            clientId: createdClient.id || "",
                            productId,
                            serial: serialData.serial,
                            expiresAt: serialData.expiresAt ? new Date(serialData.expiresAt) : undefined,
                        }),
                    ]
                }),
                ...extraContacts.flatMap((contact) => {
                    if (!contact.name.trim()) return []

                    return [
                        addClientContact(createdClient.id || "", {
                            name: contact.name,
                            phone: contact.phone || undefined,
                            email: contact.email || undefined,
                            role: contact.role || undefined,
                            bestContactTime: contact.bestContactTime || undefined,
                        }),
                    ]
                }),
            ])
            
            setPhotoFile(null)
            setPhotoSrc(null)
            setPhotoPos("50% 50%")
            setSelectedProductIds([])
            setSelectedContabilityIds([])
            setProductSerials({})
            setExtraContacts([])
        } catch {
            // error handled by mutation onError
        } finally {
            setUploading(false)
        }
    }

    const allClients = clients as (ClientData & {
        clientProductSerials?: Array<{ expiresAt: string | null; product: { id: string; name: string } | null }>
        clientProducts?: Array<{ product: { id: string; name: string } }>
    })[]

    const getClientLinkedProducts = (client: typeof allClients[number]) => {
        const productMap = new Map<string, { id: string; name: string }>()

        client.clientProducts?.forEach((clientProduct) => {
            productMap.set(clientProduct.product.id, clientProduct.product)
        })

        client.clientProductSerials?.forEach((serial) => {
            if (serial.product) {
                productMap.set(serial.product.id, serial.product)
            }
        })

        return Array.from(productMap.values())
    }

    const clientsForProductCounts = useMemo(() => {
        return allClients.filter((client) => {
            return (
                (
                    activeStatusFilter === "all" ||
                    (activeStatusFilter === "active" && client.isActive) ||
                    (activeStatusFilter === "inactive" && !client.isActive)
                ) && (
                    activeFilter === "all" ||
                    (activeFilter === "active" && client.supportReleased) ||
                    (activeFilter === "blocked" && !client.supportReleased) ||
                    (activeFilter === "cert_expired" && isCertExpired(client.certificateExpiresDate)) ||
                    (activeFilter === "cert_expiring" && isCertExpiring30d(client.certificateExpiresDate)) ||
                    (activeFilter === "serial_expired" && isSerialExpired(client)) ||
                    (activeFilter === "serial_expiring" && isSerialExpiring45d(client))
                )
            )
        })
    }, [allClients, activeFilter, activeStatusFilter])

    const clientsWithoutProductCount = useMemo(() => {
        return clientsForProductCounts.filter((client) => getClientLinkedProducts(client).length === 0).length
    }, [clientsForProductCounts])

    const totalProductsFilterCount = useMemo(() => {
        return clientsForProductCounts.length
    }, [clientsForProductCounts])

    const clientProducts = useMemo(() => {
        const productMap = new Map<string, { id: string; name: string; count: number }>()

        clientsForProductCounts.forEach((client) => {
            getClientLinkedProducts(client).forEach((product) => {
                const existing = productMap.get(product.id)
                if (existing) {
                    existing.count += 1
                } else {
                    productMap.set(product.id, { ...product, count: 1 })
                }
            })
        })

        return Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    }, [clientsForProductCounts])

    const filteredClients = useMemo(() => {
        return allClients
            .filter((client) => {
                const digitsQuery = normalizeDigits(searchQuery)
                const matchesFilter =
                    activeFilter === "all" ||
                    (activeFilter === "active" && client.supportReleased) ||
                    (activeFilter === "blocked" && !client.supportReleased) ||
                    (activeFilter === "cert_expired" && isCertExpired(client.certificateExpiresDate)) ||
                    (activeFilter === "cert_expiring" && isCertExpiring30d(client.certificateExpiresDate)) ||
                    (activeFilter === "serial_expired" && isSerialExpired(client)) ||
                    (activeFilter === "serial_expiring" && isSerialExpiring45d(client))

                const matchesStatus =
                    activeStatusFilter === "all" ||
                    (activeStatusFilter === "active" && client.isActive) ||
                    (activeStatusFilter === "inactive" && !client.isActive)

                const linkedProducts = getClientLinkedProducts(client)

                const matchesProduct = !activeProductId
                    || (activeProductId === "__NO_PRODUCT__"
                        ? linkedProducts.length === 0
                        : linkedProducts.some((product) => product.id === activeProductId))

                const matchesSearch =
                    !searchQuery ||
                    (client.razaoSocial || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (client.nomeFantasia || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (!!digitsQuery && (
                        normalizeDigits(client.cnpj || "").includes(digitsQuery) ||
                        normalizeDigits(client.cpf || "").includes(digitsQuery) ||
                        normalizeDigits(client.phone || "").includes(digitsQuery) ||
                        (((client as ClientData & { contactPhones?: string[] }).contactPhones) || []).some((phone: string) => normalizeDigits(phone).includes(digitsQuery))
                    ))

                return matchesFilter && matchesStatus && matchesProduct && matchesSearch
            })
            .sort((a, b) => compareClients(a, b, sortKey, sortDir))
    }, [allClients, activeFilter, activeStatusFilter, activeProductId, searchQuery, sortKey, sortDir])

    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(15)

    useEffect(() => {
        setCurrentPage(1)
    }, [activeFilter, activeStatusFilter, activeProductId, searchQuery, sortKey, sortDir, pageSize])

    const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize))
    const paginatedClients = useMemo(() => {
        const start = (currentPage - 1) * pageSize
        return filteredClients.slice(start, start + pageSize)
    }, [filteredClients, currentPage, pageSize])
    const pageStart = filteredClients.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
    const pageEnd = Math.min(currentPage * pageSize, filteredClients.length)

    const counts: Record<FilterType, number> = {
        all: allClients.length,
        active: allClients.filter((c) => c.supportReleased).length,
        blocked: allClients.filter((c) => !c.supportReleased).length,
        cert_expiring: allClients.filter((c) => isCertExpiring30d(c.certificateExpiresDate)).length,
        cert_expired: allClients.filter((c) => isCertExpired(c.certificateExpiresDate)).length,
        serial_expiring: allClients.filter((c) => isSerialExpiring45d(c)).length,
        serial_expired: allClients.filter((c) => isSerialExpired(c)).length,
    }
    const statusCounts: Record<StatusFilterType, number> = {
        all: allClients.length,
        active: allClients.filter((c) => c.isActive).length,
        inactive: allClients.filter((c) => !c.isActive).length,
    }

    if (isLoading) {
        return <GlobalScreenLoader />
    }

    return (
        <div className="flex h-full bg-slate-50 overflow-hidden">
            {/* Left Filter Panel */}
            <div className="w-60 min-w-60 bg-white h-full flex flex-col px-4 pt-6 border-r border-slate-200 overflow-y-auto">
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

                <div className="mb-6">
                    <button
                        onClick={() => setStatusOpen(!statusOpen)}
                        className="flex items-center justify-between w-full px-2 mb-2"
                    >
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
                        {statusOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </button>

                    {statusOpen && (
                        <div className="flex flex-col gap-0.5">
                            {STATUS_FILTERS.map((filter) => {
                                const Icon = filter.icon
                                const isActive = activeStatusFilter === filter.key
                                return (
                                    <button
                                        key={filter.key}
                                        onClick={() => setActiveStatusFilter(filter.key)}
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
                                        }`}>{statusCounts[filter.key]}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="mb-6">
                    <button
                        onClick={() => setProductsOpen(!productsOpen)}
                        className="flex items-center justify-between w-full px-2 mb-2"
                    >
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Produtos</span>
                        {productsOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </button>

                    {productsOpen && (
                        <div className="flex flex-col gap-0.5">
                            <button
                                onClick={() => setActiveProductId("")}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${!activeProductId ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                            >
                                <span>Todos</span>
                                <span className={`text-xs min-w-6 text-center rounded-full px-2 py-0.5 font-semibold ${!activeProductId ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{totalProductsFilterCount}</span>
                            </button>
                            {clientProducts.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => setActiveProductId((current) => current === product.id ? "" : product.id)}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${activeProductId === product.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                                >
                                    <span className="truncate pr-2">{product.name}</span>
                                    <span className={`text-xs min-w-6 text-center rounded-full px-2 py-0.5 font-semibold ${activeProductId === product.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{product.count}</span>
                                </button>
                            ))}
                            <button
                                onClick={() => setActiveProductId((current) => current === "__NO_PRODUCT__" ? "" : "__NO_PRODUCT__")}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${activeProductId === "__NO_PRODUCT__" ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                            >
                                <span>Sem produtos</span>
                                <span className={`text-xs min-w-6 text-center rounded-full px-2 py-0.5 font-semibold ${activeProductId === "__NO_PRODUCT__" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>{clientsWithoutProductCount}</span>
                            </button>
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

                <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
                    <p className="text-sm text-slate-500">
                        Mostrando <span className="font-medium text-slate-900">{pageStart}-{pageEnd}</span> de <span className="font-medium text-slate-900">{filteredClients.length}</span>
                    </p>
                    <div className="flex items-center gap-3">
                        <label className="text-sm text-slate-500">Por página</label>
                        <select
                            className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 bg-white"
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                        >
                            <option value={15}>15</option>
                            <option value={30}>30</option>
                            <option value={50}>50</option>
                        </select>
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
                    {filteredClients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Users size={40} className="text-slate-300 mb-3" />
                            <p className="text-sm font-medium text-slate-600">Nenhum cliente encontrado</p>
                            <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou busca</p>
                        </div>
                    ) : (
                        paginatedClients.map((client) => (
                            <ClientCard key={client.id} client={client} />
                        ))
                    )}
                </div>

                {filteredClients.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white">
                        <p className="text-sm text-slate-500">Página <span className="font-medium text-slate-900">{currentPage}</span> de <span className="font-medium text-slate-900">{totalPages}</span></p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" className="h-9 rounded-lg text-sm" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>Anterior</Button>
                            <Button variant="outline" className="h-9 rounded-lg text-sm" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>Próxima</Button>
                        </div>
                    </div>
                )}
            </div>
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent side="right" className="sm:max-w-md w-full p-0" onInteractOutside={(event) => event.preventDefault()}>
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
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tipo</label>
                                <select className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.type} onChange={e => setForm({...form, type: e.target.value as "PF"|"PJ", name: "", razaoSocial: "", nomeFantasia: "", cnpj: "", cpf: "", ie: ""})}>
                                    <option value="PJ">Pessoa Jurídica</option>
                                    <option value="PF">Pessoa Física</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{form.type === "PJ" ? "CNPJ" : "CPF"}</label>
                                <div className="flex gap-2">
                                    <Input placeholder={form.type === "PJ" ? "00.000.000/0001-00" : "000.000.000-00"} className="h-9 rounded-lg text-sm" value={form.type === "PJ" ? form.cnpj : form.cpf} onChange={e => setForm({...form, [form.type === "PJ" ? "cnpj" : "cpf"]: form.type === "PJ" ? maskCNPJ(e.target.value) : maskCPF(e.target.value)})} />
                                    {form.type === "PJ" && (
                                        <Button type="button" variant="outline" className="h-9 px-3" onClick={applyCnpjDataToForm} disabled={form.cnpj.replace(/\D/g, "").length !== 14 || cnpjLoading}>
                                            {cnpjLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                        {form.type === "PF" ? (
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nome *</label>
                                <Input placeholder="Ex: João da Silva" className="h-9 rounded-lg text-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Razão social *</label>
                                    <Input placeholder="Ex: Empresa ABC Ltda" className="h-9 rounded-lg text-sm" value={form.razaoSocial} onChange={e => setForm({...form, razaoSocial: e.target.value, name: form.nomeFantasia || e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nome fantasia</label>
                                    <Input placeholder="Ex: ABC Sistemas" className="h-9 rounded-lg text-sm" value={form.nomeFantasia} onChange={e => setForm({...form, nomeFantasia: e.target.value, name: e.target.value || form.razaoSocial})} />
                                </div>
                            </>
                        )}
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

                        {/* Contatos */}
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-2">Contatos</p>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
                            <Input placeholder="email@empresa.com" className="h-9 rounded-lg text-sm" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Telefone</label>
                                <Input placeholder="(00) 00000-0000" className="h-9 rounded-lg text-sm" value={form.phone} onChange={e => setForm({...form, phone: maskPhone(e.target.value)})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Celular</label>
                                <Input placeholder="(00) 00000-0000" className="h-9 rounded-lg text-sm" value={form.mobile} onChange={e => setForm({...form, mobile: maskPhone(e.target.value)})} />
                            </div>
                        </div>

                        {/* Contatos Extras */}
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-2">Contatos Extras</p>
                        <div className="space-y-2">
                            {extraContacts.length === 0 ? (
                                <button
                                    type="button"
                                    onClick={addExtraContact}
                                    className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors text-sm"
                                >
                                    <Plus size={14} className="inline mr-1" />
                                    Adicionar contato
                                </button>
                            ) : (
                                <>
                                    {extraContacts.map((contact) => (
                                        <div key={contact.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                            {/* Header do accordion */}
                                            <button
                                                type="button"
                                                onClick={() => toggleContactExpanded(contact.id)}
                                                className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Users size={14} className="text-gray-500" />
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {contact.name || "Novo contato"}
                                                    </span>
                                                    {contact.role && (
                                                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                                            {CONTACT_ROLES.find(r => r.value === contact.role)?.label || contact.role}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            removeExtraContact(contact.id)
                                                        }}
                                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                                        title="Remover contato"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                    <ChevronDown 
                                                        size={14} 
                                                        className={`text-gray-400 transition-transform ${expandedContacts[contact.id] ? 'rotate-180' : ''}`}
                                                    />
                                                </div>
                                            </button>
                                            
                                            {/* Conteúdo do accordion */}
                                            {expandedContacts[contact.id] && (
                                                <div className="px-3 py-3 space-y-2 bg-white">
                                                    <div className="grid grid-cols-1 gap-2">
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 mb-1 block">Nome *</label>
                                                            <Input
                                                                placeholder="Nome do contato"
                                                                className="h-8 rounded text-xs"
                                                                value={contact.name}
                                                                onChange={(e) => updateExtraContact(contact.id, 'name', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone</label>
                                                                <Input
                                                                    placeholder="(00) 00000-0000"
                                                                    className="h-8 rounded text-xs"
                                                                    value={contact.phone}
                                                                    onChange={(e) => updateExtraContact(contact.id, 'phone', maskPhone(e.target.value))}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
                                                                <Input
                                                                    placeholder="email@exemplo.com"
                                                                    className="h-8 rounded text-xs"
                                                                    value={contact.email}
                                                                    onChange={(e) => updateExtraContact(contact.id, 'email', e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-xs font-medium text-gray-500 mb-1 block">Cargo/Função</label>
                                                                <select 
                                                                    className="w-full h-8 rounded border border-gray-200 px-2 text-xs text-gray-700 bg-white" 
                                                                    value={contact.role}
                                                                    onChange={(e) => updateExtraContact(contact.id, 'role', e.target.value)}
                                                                >
                                                                    <option value="">Selecione</option>
                                                                    {CONTACT_ROLES.map(role => (
                                                                        <option key={role.value} value={role.value}>{role.label}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-medium text-gray-500 mb-1 block">Melhor horário</label>
                                                                <Input
                                                                    placeholder="09:00 - 18:00"
                                                                    className="h-8 rounded text-xs"
                                                                    value={contact.bestContactTime}
                                                                    onChange={(e) => updateExtraContact(contact.id, 'bestContactTime', maskContactTime(e.target.value))}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addExtraContact}
                                        className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors text-sm"
                                    >
                                        <Plus size={14} className="inline mr-1" />
                                        Adicionar outro contato
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Dados do Proprietário */}
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
                        <MultiSelect
                            options={(allProducts as {id: string; name: string; hasSerialControl: boolean}[]).map(p => ({
                                value: p.id,
                                label: p.name,
                                subtitle: p.hasSerialControl ? "• Exige serial" : undefined
                            }))}
                            value={selectedProductIds}
                            onChange={(newIds) => {
                                const added = newIds.find(id => !selectedProductIds.includes(id))
                                const removed = selectedProductIds.find(id => !newIds.includes(id))
                                
                                setSelectedProductIds(newIds)
                                
                                if (added) {
                                    const product = (allProducts as {id: string; hasSerialControl: boolean}[]).find(p => p.id === added)
                                    if (product?.hasSerialControl) {
                                        setProductSerials(prev => ({
                                            ...prev,
                                            [added]: { serial: "", expiresAt: "" }
                                        }))
                                    }
                                }
                                
                                if (removed) {
                                    setProductSerials(prev => {
                                        const newSerials = { ...prev }
                                        delete newSerials[removed]
                                        return newSerials
                                    })
                                }
                            }}
                            placeholder="Selecionar produtos..."
                            searchPlaceholder="Buscar produto..."
                            emptyMessage="Nenhum produto encontrado"
                        />
                        
                        {/* Serial inputs for selected products that need it */}
                        {selectedProductIds.map(productId => {
                            const product = (allProducts as {id: string; name: string; hasSerialControl: boolean}[]).find(p => p.id === productId)
                            
                            if (!product?.hasSerialControl) return null
                            
                            return (
                                <div key={productId} className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                                    <div className="text-sm font-medium text-amber-800">Serial obrigatório: {product?.name}</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 mb-1 block">Serial</label>
                                            <Input
                                                placeholder="Número do serial"
                                                className="h-8 rounded text-xs"
                                                value={productSerials[productId]?.serial || ""}
                                                onChange={e => setProductSerials(prev => ({
                                                    ...prev,
                                                    [productId]: { ...prev[productId], serial: e.target.value }
                                                }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 mb-1 block">Expiração</label>
                                            <Input
                                                type="date"
                                                className="h-8 rounded text-xs"
                                                value={productSerials[productId]?.expiresAt || ""}
                                                onChange={e => setProductSerials(prev => ({
                                                    ...prev,
                                                    [productId]: { ...prev[productId], expiresAt: e.target.value }
                                                }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        {/* Contrato */}
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-2">Contrato</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Contrato *</label>
                                <select 
                                    className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" 
                                    value={form.contractType} 
                                    onChange={e => setForm({...form, contractType: (e.target.value || "MENSAL") as "MENSAL" | "ANUAL" | "AVULSO"})}
                                    required
                                >
                                    <option value="">Selecione o tipo</option>
                                    <option value="MENSAL">Mensal</option>
                                    <option value="ANUAL">Anual</option>
                                    <option value="AVULSO">Avulso</option>
                                </select>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input type="checkbox" checked={form.supportReleased} onChange={e => setForm({...form, supportReleased: e.target.checked})} className="rounded" /> Suporte liberado
                            </label>
                        </div>
                        {form.type === "PJ" && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Código CSC</label>
                                    <Input placeholder="Código CSC" className="h-9 rounded-lg text-sm" value={form.codigoCSC} onChange={e => setForm({...form, codigoCSC: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Token</label>
                                    <Input placeholder="Token" className="h-9 rounded-lg text-sm" value={form.tokenCSC} onChange={e => setForm({...form, tokenCSC: e.target.value})} />
                                </div>
                            </div>
                        )}
                        
                        {/* Contabilidades (opcional) */}
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-2">Contabilidades <span className="normal-case font-normal">(opcional)</span></p>
                        <MultiSelect
                            options={(allContabilities as {id: string; name: string | null; cnpj: string | null; cpf: string | null}[]).map(c => ({
                                value: c.id,
                                label: c.name || c.cnpj || c.cpf || "Contabilidade",
                                subtitle: c.cnpj || c.cpf || undefined
                            }))}
                            value={selectedContabilityIds}
                            onChange={setSelectedContabilityIds}
                            placeholder="Selecionar contabilidades..."
                            searchPlaceholder="Buscar contabilidade..."
                            emptyMessage="Nenhuma contabilidade encontrada"
                        />

                        {/* Certificado Digital (Opcional) */}
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-2">Certificado Digital <span className="normal-case font-normal">(Opcional)</span></p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tipo</label>
                                <select className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.certificateType} onChange={e => setForm({...form, certificateType: e.target.value})}>
                                    <option value="">Selecione</option>
                                    {CERTIFICATE_TYPES.map(cert => (
                                        <option key={cert.value} value={cert.value}>{cert.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Data de Vencimento</label>
                                <Input type="date" className="h-9 rounded-lg text-sm" value={form.certificateExpiresDate} onChange={e => setForm({...form, certificateExpiresDate: e.target.value})} />
                            </div>
                        </div>

                        {/* Informações Adicionais */}
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-2">Informações Adicionais</p>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Observações</label>
                            <textarea 
                                placeholder="Informações adicionais..." 
                                className="w-full h-20 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white resize-none" 
                                value={form.aditionalInfo} 
                                onChange={e => setForm({...form, aditionalInfo: e.target.value})}
                            />
                        </div>
                    </div>
                    <SheetFooter className="px-6 py-4 border-t border-gray-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
                            <Button className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm" onClick={handleSubmit} disabled={createMutation.isPending || uploading}>
                                Cadastrar {(createMutation.isPending || uploading) ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    )
}