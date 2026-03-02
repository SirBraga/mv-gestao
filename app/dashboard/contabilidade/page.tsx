"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getContabilities, createContability } from "@/app/actions/contability"
import { getClients } from "@/app/actions/clients"
import AccountingCard, { type AccountingData } from "../_components/accountingCard"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Search, Calculator, Plus, Loader2 } from "lucide-react"
import { toast } from "react-toastify"

const INITIAL_FORM = {
    clientId: "", type: "PJ" as "PF" | "PJ", cnpj: "", cpf: "",
    phone: "", email: "", city: "", state: "",
    address: "", houseNumber: "", neighborhood: "", zipCode: "", complement: "", ie: "",
}

export default function ContabilidadePage() {
    const queryClient = useQueryClient()
    const [search, setSearch] = useState("")
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [form, setForm] = useState(INITIAL_FORM)

    const { data: contabilities = [], isLoading } = useQuery({
        queryKey: ["contabilities"],
        queryFn: () => getContabilities(),
    })

    const { data: clientsList = [] } = useQuery({
        queryKey: ["clients-simple"],
        queryFn: () => getClients(),
    })

    const createMutation = useMutation({
        mutationFn: createContability,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["contabilities"] })
            setDrawerOpen(false)
            setForm(INITIAL_FORM)
            toast.success("Escritório cadastrado com sucesso!")
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const handleSubmit = () => {
        if (!form.clientId) return toast.error("Selecione um cliente")
        createMutation.mutate(form)
    }

    const allContabilities = contabilities as AccountingData[]

    const filtered = useMemo(() => {
        return allContabilities.filter((item) => {
            return item.clientName.toLowerCase().includes(search.toLowerCase()) ||
                (item.cnpj || "").toLowerCase().includes(search.toLowerCase()) ||
                (item.city || "").toLowerCase().includes(search.toLowerCase())
        })
    }, [allContabilities, search])

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Buscar escritório, CNPJ ou cliente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 pr-3 w-72 bg-white border-0 shadow-none h-8 text-sm focus-visible:ring-0 placeholder:text-gray-400"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{allContabilities.length} escritórios</span>
                    <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors cursor-pointer">
                        <Plus size={13} /> Novo Escritório
                    </button>
                </div>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-[1.2fr_140px_100px_120px_100px_50px] gap-3 px-4 py-2.5 border-b border-gray-200 bg-gray-50/80">
                <span className="text-xs font-medium text-gray-500">Escritório</span>
                <span className="text-xs font-medium text-gray-500">Telefone</span>
                <span className="text-xs font-medium text-gray-500">Clientes</span>
                <span className="text-xs font-medium text-gray-500">Cidade</span>
                <span className="text-xs font-medium text-gray-500">Email</span>
                <span className="text-xs font-medium text-gray-500">Tipo</span>
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={20} className="animate-spin text-gray-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <Calculator size={24} className="mb-2 text-gray-300" />
                        <p className="text-sm">Nenhum escritório encontrado</p>
                    </div>
                ) : (
                    filtered.map((item) => <AccountingCard key={item.id} data={item} />)
                )}
            </div>
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent side="right" className="sm:max-w-md w-full p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
                        <SheetTitle className="text-base">Novo Escritório</SheetTitle>
                        <SheetDescription className="text-xs">Preencha os dados para cadastrar um novo escritório contábil.</SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cliente</label>
                            <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})}>
                                <option value="">Selecione o cliente...</option>
                                {clientsList.map((c: { id: string; name: string }) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tipo</label>
                                <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white" value={form.type} onChange={e => setForm({...form, type: e.target.value as "PF"|"PJ"})}>
                                    <option value="PJ">Pessoa Jurídica</option>
                                    <option value="PF">Pessoa Física</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{form.type === "PJ" ? "CNPJ" : "CPF"}</label>
                                <Input placeholder={form.type === "PJ" ? "00.000.000/0001-00" : "000.000.000-00"} className="h-10 rounded-lg text-sm" value={form.type === "PJ" ? form.cnpj : form.cpf} onChange={e => form.type === "PJ" ? setForm({...form, cnpj: e.target.value}) : setForm({...form, cpf: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Telefone</label>
                                <Input placeholder="(00) 0000-0000" className="h-10 rounded-lg text-sm" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
                                <Input placeholder="contato@escritorio.com" className="h-10 rounded-lg text-sm" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cidade</label>
                                <Input placeholder="São Paulo" className="h-10 rounded-lg text-sm" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Estado</label>
                                <Input placeholder="SP" className="h-10 rounded-lg text-sm" value={form.state} onChange={e => setForm({...form, state: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Endereço</label>
                                <Input placeholder="Rua..." className="h-10 rounded-lg text-sm" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Número</label>
                                <Input placeholder="123" className="h-10 rounded-lg text-sm" value={form.houseNumber} onChange={e => setForm({...form, houseNumber: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Bairro</label>
                                <Input placeholder="Centro" className="h-10 rounded-lg text-sm" value={form.neighborhood} onChange={e => setForm({...form, neighborhood: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">CEP</label>
                                <Input placeholder="00000-000" className="h-10 rounded-lg text-sm" value={form.zipCode} onChange={e => setForm({...form, zipCode: e.target.value})} />
                            </div>
                        </div>
                    </div>
                    <SheetFooter className="px-6 py-4 border-t border-gray-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
                            <Button className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm" onClick={handleSubmit} disabled={createMutation.isPending}>
                                {createMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                                Salvar Escritório
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    )
}
