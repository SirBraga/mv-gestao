"use client"

import { useState, useMemo } from "react"
import AccountingCard, { type AccountingData } from "../_components/accountingCard"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Search, Calculator, Plus } from "lucide-react"

const SAMPLE_ACCOUNTING: AccountingData[] = [
    { id: "c001", name: "Contábil Souza & Associados", cnpj: "12.345.678/0001-90", phone: "(11) 3456-7890", email: "contato@souzacontabil.com.br", city: "São Paulo", state: "SP", clients: 5, type: "PJ" },
    { id: "c002", name: "Escritório Oliveira Contabilidade", cnpj: "23.456.789/0001-01", phone: "(21) 2345-6789", email: "oliveira@contabil.com.br", city: "Rio de Janeiro", state: "RJ", clients: 3, type: "PJ" },
    { id: "c003", name: "Contabilidade Moderna Ltda", cnpj: "34.567.890/0001-12", phone: "(31) 3456-7890", email: "moderna@contabil.com.br", city: "Belo Horizonte", state: "MG", clients: 2, type: "PJ" },
    { id: "c004", name: "Ana Costa Contabilidade", cnpj: "45.678.901/0001-23", phone: "(41) 4567-8901", email: "ana@costacontabil.com.br", city: "Curitiba", state: "PR", clients: 4, type: "PJ" },
    { id: "c005", name: "Carlos Mendes Contador", cnpj: "123.456.789-00", phone: "(51) 5678-9012", email: "carlos@mendescontador.com.br", city: "Porto Alegre", state: "RS", clients: 1, type: "PF" },
    { id: "c006", name: "Contábil Express", cnpj: "56.789.012/0001-34", phone: "(11) 9876-5432", email: "express@contabil.com.br", city: "São Paulo", state: "SP", clients: 3, type: "PJ" },
    { id: "c007", name: "Escritório Fiscal Norte", cnpj: "67.890.123/0001-45", phone: "(92) 3456-7890", email: "norte@fiscal.com.br", city: "Manaus", state: "AM", clients: 2, type: "PJ" },
]

export default function ContabilidadePage() {
    const [search, setSearch] = useState("")
    const [drawerOpen, setDrawerOpen] = useState(false)

    const filtered = useMemo(() => {
        return SAMPLE_ACCOUNTING.filter((item) => {
            return item.name.toLowerCase().includes(search.toLowerCase()) ||
                item.cnpj.toLowerCase().includes(search.toLowerCase()) ||
                item.city.toLowerCase().includes(search.toLowerCase())
        })
    }, [search])

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
                    <span className="text-xs text-gray-400">{SAMPLE_ACCOUNTING.length} escritórios</span>
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
                {filtered.length === 0 ? (
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
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nome / Razão social</label>
                            <Input placeholder="Ex: Contábil Souza & Associados" className="h-10 rounded-lg text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tipo</label>
                                <select className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 bg-white">
                                    <option value="PJ">Pessoa Jurídica</option>
                                    <option value="PF">Pessoa Física</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">CNPJ / CPF</label>
                                <Input placeholder="00.000.000/0001-00" className="h-10 rounded-lg text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Telefone</label>
                                <Input placeholder="(00) 0000-0000" className="h-10 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
                                <Input placeholder="contato@escritorio.com" className="h-10 rounded-lg text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cidade</label>
                                <Input placeholder="São Paulo" className="h-10 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Estado</label>
                                <Input placeholder="SP" className="h-10 rounded-lg text-sm" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Endereço</label>
                            <Input placeholder="Rua, número, bairro" className="h-10 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Observações</label>
                            <textarea placeholder="Informações adicionais..." className="w-full h-20 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white resize-none" />
                        </div>
                    </div>
                    <SheetFooter className="px-6 py-4 border-t border-gray-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
                            <Button className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm" onClick={() => { console.log("Creating accounting"); setDrawerOpen(false) }}>Salvar Escritório</Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    )
}
