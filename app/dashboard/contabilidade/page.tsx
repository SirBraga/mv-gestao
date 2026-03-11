"use client"

import { useEffect, useState, useMemo, type Dispatch, type SetStateAction } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getContabilities, createContability, updateContability, deleteContability, addContabilityContact } from "@/app/actions/contability"
import { lookupCnpj } from "@/app/actions/cnpj"
import AccountingCard, { type AccountingData } from "../_components/accountingCard"
import { GlobalScreenLoader } from "@/app/components/global-screen-loader"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Search, Calculator, Plus, Loader2, ChevronUp, ChevronDown, ArrowUp, ArrowDown, Building2, User, Users, Trash2 } from "lucide-react"
import { toast } from "react-toastify"
import { maskCPF, maskCNPJ, maskPhone, maskCEP, maskContactTime } from "@/app/utils/masks"

type FilterType = "all" | "pj" | "pf"
type SortKey = "clientName" | "clientCount" | "phone" | "city" | "type"
type SortDir = "asc" | "desc"

function normalizeDigits(value: string) {
    return value.replace(/\D/g, "")
}

const STATES = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]

const FILTERS = [
    { key: "all" as FilterType, label: "Todos", icon: Calculator },
    { key: "pj" as FilterType, label: "Pessoa Jurídica", icon: Building2 },
    { key: "pf" as FilterType, label: "Pessoa Física", icon: User },
]

const COLUMNS: { key: SortKey; label: string }[] = [
    { key: "clientName", label: "Escritório" },
    { key: "clientCount", label: "Clientes" },
    { key: "phone", label: "Telefone" },
    { key: "city", label: "Cidade" },
    { key: "type", label: "Tipo" },
]

function getNormalizedContabilityType(item: Pick<AccountingData, "type" | "cnpj" | "cpf">): "PF" | "PJ" {
    if (item.type === "PF" || item.type === "PJ") return item.type
    if (item.cnpj) return "PJ"
    if (item.cpf) return "PF"
    return "PJ"
}

function compareContabilities(a: AccountingData, b: AccountingData, key: SortKey, dir: SortDir): number {
    let cmp = 0
    switch (key) {
        case "clientName": cmp = (a.clientNames || "").localeCompare(b.clientNames || "", "pt-BR"); break
        case "clientCount": cmp = a.clientCount - b.clientCount; break
        case "phone": cmp = (a.phone || "").localeCompare(b.phone || ""); break
        case "city": cmp = (a.city || "").localeCompare(b.city || "", "pt-BR"); break
        case "type": cmp = getNormalizedContabilityType(a).localeCompare(getNormalizedContabilityType(b)); break
    }
    return dir === "asc" ? cmp : -cmp
}

const INITIAL_FORM = {
    name: "", razaoSocial: "", nomeFantasia: "", type: "PJ" as "PF" | "PJ", cnpj: "", cpf: "",
    phone: "", email: "", city: "", state: "",
    address: "", houseNumber: "", neighborhood: "", zipCode: "", complement: "", ie: "",
}

const CONTACT_ROLES = ["Suporte", "Financeiro", "Comercial", "Proprietário", "Fiscal", "RH"]

export default function ContabilidadePage() {
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState("")
    const [activeFilter, setActiveFilter] = useState<FilterType>("all")
    const [sortKey, setSortKey] = useState<SortKey>("clientName")
    const [sortDir, setSortDir] = useState<SortDir>("asc")
    const [defaultOpen, setDefaultOpen] = useState(true)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [editDrawerOpen, setEditDrawerOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<AccountingData | null>(null)
    const [form, setForm] = useState(INITIAL_FORM)
    const [editForm, setEditForm] = useState(INITIAL_FORM)
    const [extraContacts, setExtraContacts] = useState<Array<{ id: string; name: string; phone: string; email: string; role: string; bestContactTime: string }>>([])
    const [expandedContacts, setExpandedContacts] = useState<Record<string, boolean>>({})
    const [cepLoading, setCepLoading] = useState(false)
    const [editCepLoading, setEditCepLoading] = useState(false)
    const [cnpjLoading, setCnpjLoading] = useState(false)
    const [editCnpjLoading, setEditCnpjLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(15)

    const { data: contabilities = [], isLoading } = useQuery({
        queryKey: ["contabilities"],
        queryFn: () => getContabilities(),
    })

    const fetchViaCEP = async (
        cep: string,
        setTarget: Dispatch<SetStateAction<typeof INITIAL_FORM>>,
        setLoading: Dispatch<SetStateAction<boolean>>
    ) => {
        if (cep.replace(/\D/g, "").length !== 8) return
        setLoading(true)
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, "")}/json/`)
            const data = await res.json()
            if (!data.erro) {
                setTarget((current) => ({
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
            setLoading(false)
        }
    }

    const createMutation = useMutation({
        mutationFn: createContability,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contabilities"] })
            setDrawerOpen(false)
            setForm(INITIAL_FORM)
            setExtraContacts([])
            setExpandedContacts({})
            toast.success("Escritório cadastrado com sucesso!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateContability>[1] }) => updateContability(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contabilities"] })
            setEditDrawerOpen(false)
            setSelectedItem(null)
            setEditForm(INITIAL_FORM)
            toast.success("Escritório atualizado com sucesso!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const deleteMutation = useMutation({
        mutationFn: deleteContability,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contabilities"] })
            toast.success("Escritório excluído com sucesso!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const addExtraContact = () => {
        const newContact = {
            id: Date.now().toString(),
            name: "",
            phone: "",
            email: "",
            role: "",
            bestContactTime: "",
        }
        setExtraContacts((prev) => [...prev, newContact])
        setExpandedContacts((prev) => ({ ...prev, [newContact.id]: true }))
    }

    const updateExtraContact = (id: string, field: keyof typeof extraContacts[0], value: string) => {
        setExtraContacts((prev) => prev.map((contact) =>
            contact.id === id ? { ...contact, [field]: value } : contact
        ))
    }

    const removeExtraContact = (id: string) => {
        setExtraContacts((prev) => prev.filter((contact) => contact.id !== id))
        setExpandedContacts((prev) => {
            const newExpanded = { ...prev }
            delete newExpanded[id]
            return newExpanded
        })
    }

    const toggleContactExpanded = (id: string) => {
        setExpandedContacts((prev) => ({ ...prev, [id]: !prev[id] }))
    }

    const handleSubmit = async () => {
        if (form.type === "PF" && !form.name?.trim()) return toast.error("Nome é obrigatório")
        if (form.type === "PJ" && !form.razaoSocial?.trim()) return toast.error("Razão social é obrigatória")

        const contactsToCreate = [...extraContacts]
        const created = await createMutation.mutateAsync({
            ...form,
            name: form.type === "PJ" ? (form.nomeFantasia || form.razaoSocial || form.name) : form.name,
            razaoSocial: form.type === "PJ" ? form.razaoSocial || undefined : undefined,
            nomeFantasia: form.type === "PJ" ? form.nomeFantasia || undefined : undefined,
            cnpj: form.type === "PJ" ? form.cnpj || undefined : undefined,
            cpf: form.type === "PF" ? form.cpf || undefined : undefined,
            ie: form.type === "PJ" ? form.ie || undefined : undefined,
        })

        if (contactsToCreate.length > 0) {
            await Promise.all(
                contactsToCreate.flatMap((contact) => {
                    if (!contact.name.trim()) return []

                    return [
                        addContabilityContact(created.id, {
                            name: contact.name,
                            phone: contact.phone || undefined,
                            email: contact.email || undefined,
                            role: contact.role || undefined,
                            bestContactTime: contact.bestContactTime || undefined,
                        }),
                    ]
                })
            )
            queryClient.invalidateQueries({ queryKey: ["contabilities"] })
        }
    }

    const handleEditSubmit = () => {
        if (!selectedItem) return
        updateMutation.mutate({
            id: selectedItem.id,
            data: {
                name: editForm.type === "PJ" ? (editForm.nomeFantasia || editForm.razaoSocial || editForm.name) : editForm.name || undefined,
                razaoSocial: editForm.type === "PJ" ? editForm.razaoSocial || undefined : null,
                nomeFantasia: editForm.type === "PJ" ? editForm.nomeFantasia || undefined : null,
                type: editForm.type || undefined,
                cnpj: editForm.cnpj || undefined,
                cpf: editForm.cpf || undefined,
                ie: editForm.ie || undefined,
                phone: editForm.phone || undefined,
                email: editForm.email || undefined,
                city: editForm.city || undefined,
                state: editForm.state || undefined,
                address: editForm.address || undefined,
                houseNumber: editForm.houseNumber || undefined,
                neighborhood: editForm.neighborhood || undefined,
                zipCode: editForm.zipCode || undefined,
                complement: editForm.complement || undefined,
            },
        })
    }

    const openEditDrawer = (item: AccountingData) => {
        setSelectedItem(item)
        setEditForm({
            name: item.name || "",
            razaoSocial: item.razaoSocial || "",
            nomeFantasia: item.nomeFantasia || item.name || "",
            type: item.type,
            cnpj: item.cnpj || "",
            cpf: item.cpf || "",
            phone: item.phone || "",
            email: item.email || "",
            city: item.city || "",
            state: item.state || "",
            address: item.address || "",
            houseNumber: item.houseNumber || "",
            neighborhood: item.neighborhood || "",
            zipCode: item.zipCode || "",
            complement: item.complement || "",
            ie: item.ie || "",
        })
        setEditDrawerOpen(true)
    }

    const applyCnpjDataToCreateForm = async () => {
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

    const applyCnpjDataToEditForm = async () => {
        if (editForm.type !== "PJ") return

        try {
            setEditCnpjLoading(true)
            const data = await lookupCnpj(editForm.cnpj)
            setEditForm((current) => ({
                ...current,
                cnpj: maskCNPJ(data.cnpj || current.cnpj),
                razaoSocial: data.razaoSocial || current.razaoSocial,
                nomeFantasia: data.nomeFantasia || current.nomeFantasia,
                name: data.nomeFantasia || data.razaoSocial || current.name,
                ie: data.ie || current.ie,
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
            setEditCnpjLoading(false)
        }
    }

    const handleDelete = (item: AccountingData) => {
        if (confirm(`Tem certeza que deseja excluir o escritório "${item.name || item.clientNames}"?`)) {
            deleteMutation.mutate(item.id)
        }
    }

    const allContabilities = contabilities as AccountingData[]

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === "asc" ? "desc" : "asc")
        } else {
            setSortKey(key)
            setSortDir("asc")
        }
    }

    const filteredContabilities = useMemo(() => {
        const filterTypeMap: Record<FilterType, string[]> = {
            all: ["PJ", "PF"],
            pj: ["PJ"],
            pf: ["PF"],
        }

        return allContabilities
            .filter((item) => {
                const normalizedSearch = searchQuery.toLowerCase()
                const digitsQuery = normalizeDigits(searchQuery)
                const normalizedType = getNormalizedContabilityType(item)
                const matchesFilter = filterTypeMap[activeFilter].includes(normalizedType)
                const matchesSearch = searchQuery === "" ||
                    (item.nomeFantasia || "").toLowerCase().includes(normalizedSearch) ||
                    (item.razaoSocial || "").toLowerCase().includes(normalizedSearch) ||
                    (!!digitsQuery && (
                        normalizeDigits(item.cnpj || "").includes(digitsQuery) ||
                        normalizeDigits(item.cpf || "").includes(digitsQuery) ||
                        normalizeDigits(item.phone || "").includes(digitsQuery) ||
                        (((item as AccountingData & { contactPhones?: string[] }).contactPhones) || []).some((phone: string) => normalizeDigits(phone).includes(digitsQuery))
                    ))
                return matchesFilter && matchesSearch
            })
            .sort((a, b) => compareContabilities(a, b, sortKey, sortDir))
    }, [allContabilities, activeFilter, searchQuery, sortKey, sortDir])

    const counts: Record<FilterType, number> = {
        all: allContabilities.length,
        pj: allContabilities.filter((c) => getNormalizedContabilityType(c) === "PJ").length,
        pf: allContabilities.filter((c) => getNormalizedContabilityType(c) === "PF").length,
    }

    useEffect(() => {
        setCurrentPage(1)
    }, [activeFilter, searchQuery, sortKey, sortDir, pageSize])

    const totalPages = Math.max(1, Math.ceil(filteredContabilities.length / pageSize))
    const paginatedContabilities = useMemo(() => {
        const start = (currentPage - 1) * pageSize
        return filteredContabilities.slice(start, start + pageSize)
    }, [filteredContabilities, currentPage, pageSize])
    const pageStart = filteredContabilities.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
    const pageEnd = Math.min(currentPage * pageSize, filteredContabilities.length)

    if (isLoading) {
        return <GlobalScreenLoader />
    }

    return (
        <div className="flex h-full bg-slate-50">
            {/* Left Filter Panel */}
            <div className="w-60 min-w-60 bg-white h-full flex flex-col px-4 pt-6 border-r border-slate-200">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-lg font-bold text-slate-900">Contabilidade</h1>
                    <p className="text-xs text-slate-500 mt-0.5">{counts.all} escritórios</p>
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

            </div>

            {/* Right Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Top Bar */}
                <div className="flex items-center justify-between px-6 h-16 bg-white border-b border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <Input
                                placeholder="Buscar escritórios..."
                                className="pl-10 pr-4 w-72 bg-slate-50 border-slate-200 h-10 text-sm rounded-xl focus-visible:ring-indigo-500 placeholder:text-slate-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm shadow-indigo-600/25">
                            <Plus size={16} /> Novo Escritório
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
                    <p className="text-sm text-slate-500">
                        Mostrando <span className="font-medium text-slate-900">{pageStart}-{pageEnd}</span> de <span className="font-medium text-slate-900">{filteredContabilities.length}</span>
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
                <div className="grid grid-cols-[1.5fr_100px_140px_120px_80px_50px] gap-3 px-6 py-3 border-b border-slate-200 bg-slate-50">
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
                    <span></span>
                </div>

                {/* Rows */}
                <div className="flex-1 overflow-y-auto bg-white">
                    {filteredContabilities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Calculator size={40} className="text-slate-300 mb-3" />
                            <p className="text-sm font-medium text-slate-600">Nenhum escritório encontrado</p>
                            <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou busca</p>
                        </div>
                    ) : (
                        paginatedContabilities.map((item) => <AccountingCard key={item.id} data={item} onEdit={openEditDrawer} onDelete={handleDelete} />)
                    )}
                </div>

                {!isLoading && filteredContabilities.length > 0 && (
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
                        <SheetTitle className="text-base">Novo Escritório</SheetTitle>
                        <SheetDescription className="text-xs">Preencha os dados para cadastrar um novo escritório contábil.</SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tipo</label>
                                <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.type} onChange={e => setForm({...form, type: e.target.value as "PF"|"PJ", name: "", razaoSocial: "", nomeFantasia: "", cnpj: "", cpf: "", ie: ""})}>
                                    <option value="PJ">Pessoa Jurídica</option>
                                    <option value="PF">Pessoa Física</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{form.type === "PJ" ? "CNPJ" : "CPF"}</label>
                                {form.type === "PF" ? (
                                    <Input placeholder="000.000.000-00" className="h-10 rounded-lg text-sm" value={form.cpf} onChange={e => setForm({...form, cpf: maskCPF(e.target.value)})} />
                                ) : (
                                    <div className="flex gap-2">
                                        <Input placeholder="00.000.000/0001-00" className="h-10 rounded-lg text-sm" value={form.cnpj} onChange={e => setForm({...form, cnpj: maskCNPJ(e.target.value)})} />
                                        <Button type="button" variant="outline" className="h-10 px-3" onClick={applyCnpjDataToCreateForm} disabled={form.cnpj.replace(/\D/g, "").length !== 14 || cnpjLoading}>
                                            {cnpjLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                        {form.type === "PF" ? (
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nome</label>
                                <Input placeholder="Nome completo" className="h-10 rounded-lg text-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Razão social</label>
                                    <Input placeholder="Razão social do escritório" className="h-10 rounded-lg text-sm" value={form.razaoSocial} onChange={e => setForm({...form, razaoSocial: e.target.value, name: form.nomeFantasia || e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nome fantasia</label>
                                    <Input placeholder="Nome fantasia" className="h-10 rounded-lg text-sm" value={form.nomeFantasia} onChange={e => setForm({...form, nomeFantasia: e.target.value, name: e.target.value || form.razaoSocial})} />
                                </div>
                            </>
                        )}
                        {form.type === "PJ" && (
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Inscrição Estadual</label>
                                <Input placeholder="Inscrição estadual" className="h-10 rounded-lg text-sm" value={form.ie} onChange={e => setForm({...form, ie: e.target.value})} />
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Telefone</label>
                                <Input placeholder="(00) 00000-0000" className="h-10 rounded-lg text-sm" value={form.phone} onChange={e => setForm({...form, phone: maskPhone(e.target.value)})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
                                <Input placeholder="contato@escritorio.com" className="h-10 rounded-lg text-sm" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Endereço</label>
                            <Input placeholder="Rua..." className="h-10 rounded-lg text-sm" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">CEP</label>
                                <div className="relative flex items-center">
                                    <Input placeholder="00000-000" className="h-10 rounded-lg text-sm pr-8" value={form.zipCode} onChange={e => setForm({...form, zipCode: maskCEP(e.target.value)})} />
                                    <button
                                        type="button"
                                        title="Buscar endereço pelo CEP"
                                        disabled={form.zipCode.replace(/\D/g, "").length !== 8 || cepLoading}
                                        onClick={() => fetchViaCEP(form.zipCode, setForm, setCepLoading)}
                                        className="absolute right-2 text-gray-400 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                    >
                                        {cepLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Estado</label>
                                <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.state} onChange={e => setForm({...form, state: e.target.value})}>
                                    <option value="">UF</option>
                                    {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Número</label>
                                <Input placeholder="123" className="h-10 rounded-lg text-sm" value={form.houseNumber} onChange={e => setForm({...form, houseNumber: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cidade</label>
                                <Input placeholder="São Paulo" className="h-10 rounded-lg text-sm" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Bairro</label>
                                <Input placeholder="Centro" className="h-10 rounded-lg text-sm" value={form.neighborhood} onChange={e => setForm({...form, neighborhood: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Complemento</label>
                            <Input placeholder="Sala, conjunto, bloco..." className="h-10 rounded-lg text-sm" value={form.complement} onChange={e => setForm({...form, complement: e.target.value})} />
                        </div>

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
                                                            {contact.role}
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
                                                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${expandedContacts[contact.id] ? "rotate-180" : ""}`} />
                                                </div>
                                            </button>

                                            {expandedContacts[contact.id] && (
                                                <div className="px-3 py-3 space-y-2 bg-white">
                                                    <div>
                                                        <label className="text-xs font-medium text-gray-500 mb-1 block">Nome *</label>
                                                        <Input
                                                            placeholder="Nome do contato"
                                                            className="h-8 rounded text-xs"
                                                            value={contact.name}
                                                            onChange={(e) => updateExtraContact(contact.id, "name", e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 mb-1 block">Telefone</label>
                                                            <Input
                                                                placeholder="(00) 00000-0000"
                                                                className="h-8 rounded text-xs"
                                                                value={contact.phone}
                                                                onChange={(e) => updateExtraContact(contact.id, "phone", maskPhone(e.target.value))}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
                                                            <Input
                                                                placeholder="email@exemplo.com"
                                                                className="h-8 rounded text-xs"
                                                                value={contact.email}
                                                                onChange={(e) => updateExtraContact(contact.id, "email", e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 mb-1 block">Cargo/Função</label>
                                                            <select
                                                                className="w-full h-8 rounded border border-gray-200 px-2 text-xs text-gray-700 bg-white"
                                                                value={contact.role}
                                                                onChange={(e) => updateExtraContact(contact.id, "role", e.target.value)}
                                                            >
                                                                <option value="">Selecione</option>
                                                                {CONTACT_ROLES.map((role) => (
                                                                    <option key={role} value={role}>{role}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 mb-1 block">Melhor horário</label>
                                                            <Input
                                                                placeholder="09:00 - 18:00"
                                                                className="h-8 rounded text-xs"
                                                                value={contact.bestContactTime}
                                                                onChange={(e) => updateExtraContact(contact.id, "bestContactTime", maskContactTime(e.target.value))}
                                                            />
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
                    </div>
                    <SheetFooter className="px-6 py-4 border-t border-gray-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={() => { setDrawerOpen(false); setForm(INITIAL_FORM); setExtraContacts([]); setExpandedContacts({}) }}>Cancelar</Button>
                            <Button className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm" onClick={handleSubmit} disabled={createMutation.isPending}>
                                {createMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                                Salvar Escritório
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Drawer de Edição */}
            <Sheet open={editDrawerOpen} onOpenChange={(open) => { setEditDrawerOpen(open); if (!open) { setSelectedItem(null); setEditForm(INITIAL_FORM) } }}>
                <SheetContent side="right" className="sm:max-w-md w-full p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
                        <SheetTitle className="text-base">Editar Escritório</SheetTitle>
                        <SheetDescription className="text-xs">Atualize os dados do escritório contábil.</SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-400 mb-1">Cliente</p>
                            <p className="text-sm font-medium text-gray-900">{selectedItem?.name || selectedItem?.clientNames}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tipo</label>
                                <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value as "PF"|"PJ", name: "", razaoSocial: "", nomeFantasia: "", cnpj: "", cpf: "", ie: ""})}>
                                    <option value="PJ">Pessoa Jurídica</option>
                                    <option value="PF">Pessoa Física</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{editForm.type === "PJ" ? "CNPJ" : "CPF"}</label>
                                {editForm.type === "PF" ? (
                                    <Input placeholder="000.000.000-00" className="h-10 rounded-lg text-sm" value={editForm.cpf} onChange={e => setEditForm({...editForm, cpf: maskCPF(e.target.value)})} />
                                ) : (
                                    <div className="flex gap-2">
                                        <Input placeholder="00.000.000/0001-00" className="h-10 rounded-lg text-sm" value={editForm.cnpj} onChange={e => setEditForm({...editForm, cnpj: maskCNPJ(e.target.value)})} />
                                        <Button type="button" variant="outline" className="h-10 px-3" onClick={applyCnpjDataToEditForm} disabled={editForm.cnpj.replace(/\D/g, "").length !== 14 || editCnpjLoading}>
                                            {editCnpjLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                        {editForm.type === "PF" ? (
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nome</label>
                                <Input placeholder="Nome completo" className="h-10 rounded-lg text-sm" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Razão social</label>
                                    <Input placeholder="Razão social do escritório" className="h-10 rounded-lg text-sm" value={editForm.razaoSocial} onChange={e => setEditForm({...editForm, razaoSocial: e.target.value, name: editForm.nomeFantasia || e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nome fantasia</label>
                                    <Input placeholder="Nome fantasia" className="h-10 rounded-lg text-sm" value={editForm.nomeFantasia} onChange={e => setEditForm({...editForm, nomeFantasia: e.target.value, name: e.target.value || editForm.razaoSocial})} />
                                </div>
                            </>
                        )}
                        {editForm.type === "PJ" && (
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Inscrição Estadual</label>
                                <Input placeholder="Inscrição estadual" className="h-10 rounded-lg text-sm" value={editForm.ie} onChange={e => setEditForm({...editForm, ie: e.target.value})} />
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Telefone</label>
                                <Input placeholder="(00) 00000-0000" className="h-10 rounded-lg text-sm" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: maskPhone(e.target.value)})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
                                <Input placeholder="contato@escritorio.com" className="h-10 rounded-lg text-sm" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Endereço</label>
                            <Input placeholder="Rua..." className="h-10 rounded-lg text-sm" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">CEP</label>
                                <div className="relative flex items-center">
                                    <Input placeholder="00000-000" className="h-10 rounded-lg text-sm pr-8" value={editForm.zipCode} onChange={e => setEditForm({...editForm, zipCode: maskCEP(e.target.value)})} />
                                    <button
                                        type="button"
                                        title="Buscar endereço pelo CEP"
                                        disabled={editForm.zipCode.replace(/\D/g, "").length !== 8 || editCepLoading}
                                        onClick={() => fetchViaCEP(editForm.zipCode, setEditForm, setEditCepLoading)}
                                        className="absolute right-2 text-gray-400 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                    >
                                        {editCepLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Estado</label>
                                <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={editForm.state} onChange={e => setEditForm({...editForm, state: e.target.value})}>
                                    <option value="">UF</option>
                                    {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Número</label>
                                <Input placeholder="123" className="h-10 rounded-lg text-sm" value={editForm.houseNumber} onChange={e => setEditForm({...editForm, houseNumber: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cidade</label>
                                <Input placeholder="São Paulo" className="h-10 rounded-lg text-sm" value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Bairro</label>
                                <Input placeholder="Centro" className="h-10 rounded-lg text-sm" value={editForm.neighborhood} onChange={e => setEditForm({...editForm, neighborhood: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Complemento</label>
                            <Input placeholder="Sala, conjunto, bloco..." className="h-10 rounded-lg text-sm" value={editForm.complement} onChange={e => setEditForm({...editForm, complement: e.target.value})} />
                        </div>
                    </div>
                    <SheetFooter className="px-6 py-4 border-t border-gray-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={() => { setEditDrawerOpen(false); setSelectedItem(null); setEditForm(INITIAL_FORM) }}>Cancelar</Button>
                            <Button className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm" onClick={handleEditSubmit} disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                                Salvar Alterações
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    )
}
