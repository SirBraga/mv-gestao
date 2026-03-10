"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Search,
    Plus,
    MoreHorizontal,
    Shield,
    ShieldCheck,
    User,
    Trash2,
    Mail,
    Calendar,
    Crown,
    Eye,
    EyeOff,
    Loader2,
    ChevronUp,
    ChevronDown,
    Printer,
    FileDown,
    ArrowUp,
    ArrowDown,
    Users,
    Pencil,
} from "lucide-react"
import { toast } from "react-toastify"
import { getUsers, createUser, updateUserRole, deleteUser } from "@/app/actions/users"

type Role = "ADMIN" | "MODERATOR" | "USER"
type FilterType = "all" | "admin" | "moderator" | "user"
type SortKey = "name" | "email" | "role" | "createdAt"
type SortDir = "asc" | "desc"

interface UserData {
    id: string
    name: string
    email: string
    role: Role
    image: string | null
    emailVerified: boolean
    createdAt: Date
}

interface Props {
    isAdmin: boolean
    currentUserId: string
}

const roleLabels: Record<Role, string> = {
    ADMIN: "Administrador",
    MODERATOR: "Moderador",
    USER: "Usuário",
}

const roleBadgeColors: Record<Role, string> = {
    ADMIN: "bg-red-500",
    MODERATOR: "bg-amber-500",
    USER: "bg-slate-400",
}

const roleIcons: Record<Role, typeof Shield> = {
    ADMIN: Crown,
    MODERATOR: ShieldCheck,
    USER: User,
}

const FILTERS = [
    { key: "all" as FilterType, label: "Todos", icon: Users },
    { key: "admin" as FilterType, label: "Administradores", icon: Crown },
    { key: "moderator" as FilterType, label: "Moderadores", icon: ShieldCheck },
    { key: "user" as FilterType, label: "Usuários", icon: User },
]

const COLUMNS: { key: SortKey; label: string }[] = [
    { key: "name", label: "Funcionário" },
    { key: "email", label: "Email" },
    { key: "role", label: "Permissão" },
    { key: "createdAt", label: "Criado em" },
]

function compareUsers(a: UserData, b: UserData, key: SortKey, dir: SortDir): number {
    let cmp = 0
    switch (key) {
        case "name": cmp = a.name.localeCompare(b.name, "pt-BR"); break
        case "email": cmp = a.email.localeCompare(b.email); break
        case "role": cmp = a.role.localeCompare(b.role); break
        case "createdAt": cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break
    }
    return dir === "asc" ? cmp : -cmp
}

function getInitials(name: string) {
    return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
}

function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}

export default function FuncionariosClient({ isAdmin, currentUserId }: Props) {
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState("")
    const [activeFilter, setActiveFilter] = useState<FilterType>("all")
    const [sortKey, setSortKey] = useState<SortKey>("name")
    const [sortDir, setSortDir] = useState<SortDir>("asc")
    const [defaultOpen, setDefaultOpen] = useState(true)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [deleteModal, setDeleteModal] = useState<string | null>(null)
    const [roleModal, setRoleModal] = useState<{ userId: string; currentRole: Role } | null>(null)
    const [showPassword, setShowPassword] = useState(false)

    const { data: usersRaw = [], isLoading } = useQuery({
        queryKey: ["users"],
        queryFn: () => getUsers(),
    })

    const users = usersRaw as UserData[]

    // Form state
    const [formName, setFormName] = useState("")
    const [formEmail, setFormEmail] = useState("")
    const [formPassword, setFormPassword] = useState("")
    const [formRole, setFormRole] = useState<Role>("USER")

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === "asc" ? "desc" : "asc")
        } else {
            setSortKey(key)
            setSortDir("asc")
        }
    }

    const filteredUsers = useMemo(() => {
        const filterRoleMap: Record<FilterType, Role[]> = {
            all: ["ADMIN", "MODERATOR", "USER"],
            admin: ["ADMIN"],
            moderator: ["MODERATOR"],
            user: ["USER"],
        }

        return users
            .filter((u) => {
                const matchesFilter = filterRoleMap[activeFilter].includes(u.role)
                const matchesSearch = searchQuery === "" ||
                    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    u.email.toLowerCase().includes(searchQuery.toLowerCase())
                return matchesFilter && matchesSearch
            })
            .sort((a, b) => compareUsers(a, b, sortKey, sortDir))
    }, [users, activeFilter, searchQuery, sortKey, sortDir])

    const counts: Record<FilterType, number> = {
        all: users.length,
        admin: users.filter(u => u.role === "ADMIN").length,
        moderator: users.filter(u => u.role === "MODERATOR").length,
        user: users.filter(u => u.role === "USER").length,
    }

    function resetForm() {
        setFormName("")
        setFormEmail("")
        setFormPassword("")
        setFormRole("USER")
        setShowPassword(false)
    }

    const createMutation = useMutation({
        mutationFn: createUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] })
            toast.success("Funcionário criado com sucesso!")
            setDrawerOpen(false)
            resetForm()
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const roleMutation = useMutation({
        mutationFn: ({ userId, role }: { userId: string; role: Role }) => updateUserRole(userId, role),
        onSuccess: (_d, vars) => {
            queryClient.invalidateQueries({ queryKey: ["users"] })
            toast.success(`Permissão atualizada para ${roleLabels[vars.role]}`)
            setRoleModal(null)
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const deleteMutation = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] })
            toast.success("Funcionário removido com sucesso")
            setDeleteModal(null)
        },
        onError: (err: Error) => toast.error(err.message),
    })

    function handleCreate() {
        if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
            toast.error("Preencha todos os campos obrigatórios")
            return
        }
        createMutation.mutate({ name: formName.trim(), email: formEmail.trim(), password: formPassword, role: formRole })
    }

    function handleRoleChange(userId: string, newRole: Role) {
        roleMutation.mutate({ userId, role: newRole })
    }

    function handleDelete(userId: string) {
        deleteMutation.mutate(userId)
    }

    const isPending = createMutation.isPending || roleMutation.isPending || deleteMutation.isPending

    const userToDelete = users.find(u => u.id === deleteModal)

    return (
        <div className="flex h-full bg-slate-50">
            {/* Left Filter Panel */}
            <div className="w-60 min-w-60 bg-white h-full flex flex-col px-4 pt-6 border-r border-slate-200">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-lg font-bold text-slate-900">Funcionários</h1>
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

            </div>

            {/* Right Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Top Bar */}
                <div className="flex items-center justify-between px-6 h-16 bg-white border-b border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <Input
                                placeholder="Buscar funcionários..."
                                className="pl-10 pr-4 w-72 bg-slate-50 border-slate-200 h-10 text-sm rounded-xl focus-visible:ring-indigo-500 placeholder:text-slate-400"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:bg-slate-50 h-10 px-3 rounded-xl">
                            <Printer size={16} />
                        </Button>
                        <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:bg-slate-50 gap-2 h-10 px-4 rounded-xl">
                            <FileDown size={16} />
                            <span className="text-sm">Exportar</span>
                        </Button>
                        {isAdmin && (
                            <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm shadow-indigo-600/25">
                                <Plus size={16} /> Novo Funcionário
                            </button>
                        )}
                    </div>
                </div>

                {/* Column Headers */}
                <div className="grid grid-cols-[1.5fr_1.2fr_120px_120px_50px] gap-3 px-6 py-3 border-b border-slate-200 bg-slate-50">
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
                {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 size={28} className="animate-spin text-indigo-600" />
                            <p className="text-sm text-slate-500 mt-3">Carregando funcionários...</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Users size={40} className="text-slate-300 mb-3" />
                            <p className="text-sm font-medium text-slate-600">Nenhum funcionário encontrado</p>
                            <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou busca</p>
                        </div>
                    ) : (
                        filteredUsers.map((user) => {
                            const isMe = user.id === currentUserId
                            const RoleIcon = roleIcons[user.role]
                            return (
                                <div
                                    key={user.id}
                                    className="group grid grid-cols-[1.5fr_1.2fr_120px_120px_50px] items-center border-b border-slate-100 hover:bg-slate-50/50 transition-all px-6 py-3.5 gap-3"
                                >
                                    {/* Name + Avatar */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar className="h-9 w-9 shrink-0 ring-2 ring-white shadow-sm">
                                            <AvatarImage src={user.image || undefined} />
                                            <AvatarFallback className="text-[10px] font-bold text-white bg-indigo-600">
                                                {getInitials(user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                                                {isMe && (
                                                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">Você</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <Mail size={12} className="text-slate-300 shrink-0" />
                                        <span className="text-sm text-slate-600 truncate">{user.email}</span>
                                    </div>

                                    {/* Role Badge */}
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white w-fit ${roleBadgeColors[user.role]}`}>
                                        <RoleIcon size={10} />
                                        {roleLabels[user.role]}
                                    </span>

                                    {/* Created */}
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={11} className="text-slate-300" />
                                        <span className="text-xs text-slate-500">{formatDate(user.createdAt)}</span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end">
                                        {isAdmin && !isMe ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
                                                        <MoreHorizontal size={16} />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem
                                                        onClick={() => setRoleModal({ userId: user.id, currentRole: user.role })}
                                                        className="gap-2 text-sm cursor-pointer"
                                                    >
                                                        <Shield size={14} /> Alterar Permissão
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => setDeleteModal(user.id)}
                                                        className="gap-2 text-sm text-red-600 focus:text-red-600 cursor-pointer"
                                                    >
                                                        <Trash2 size={14} /> Remover
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        ) : (
                                            <span className="text-[10px] text-slate-300">—</span>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
            </div>

            </div>
            {/* ── Create Drawer ── */}
            <Sheet open={drawerOpen} onOpenChange={(open) => { if (!open) { setDrawerOpen(false); resetForm() } }}>
                <SheetContent side="right" className="sm:max-w-md w-full p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
                        <SheetTitle className="text-base">Novo Funcionário</SheetTitle>
                        <SheetDescription className="text-xs">Crie uma conta para um novo colaborador.</SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Nome completo *</label>
                            <Input
                                placeholder="Ex: João da Silva"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                className="h-10 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Email *</label>
                            <Input
                                type="email"
                                placeholder="joao@empresa.com.br"
                                value={formEmail}
                                onChange={(e) => setFormEmail(e.target.value)}
                                className="h-10 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Senha *</label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Mínimo 8 caracteres"
                                    value={formPassword}
                                    onChange={(e) => setFormPassword(e.target.value)}
                                    className="h-10 rounded-lg text-sm pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Permissão</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(["USER", "MODERATOR", "ADMIN"] as Role[]).map((r) => {
                                    const Icon = roleIcons[r]
                                    return (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setFormRole(r)}
                                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                                                formRole === r
                                                    ? "border-indigo-600 bg-indigo-50"
                                                    : "border-slate-200 bg-white hover:border-slate-300"
                                            }`}
                                        >
                                            <Icon size={16} className={formRole === r ? "text-indigo-600" : "text-slate-400"} />
                                            <span className={`text-[10px] font-bold ${formRole === r ? "text-indigo-600" : "text-slate-500"}`}>
                                                {roleLabels[r]}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                            <div className="mt-2 text-[10px] text-slate-400 space-y-0.5">
                                <p><strong>Usuário:</strong> Acesso básico ao sistema</p>
                                <p><strong>Moderador:</strong> Pode gerenciar tickets e clientes</p>
                                <p><strong>Admin:</strong> Acesso total, incluindo gerenciar funcionários</p>
                            </div>
                        </div>
                    </div>
                    <SheetFooter className="px-6 py-4 border-t border-slate-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={() => { setDrawerOpen(false); resetForm() }}>
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
                                disabled={isPending || !formName.trim() || !formEmail.trim() || !formPassword.trim()}
                                onClick={handleCreate}
                            >
                                {isPending ? "Criando..." : "Criar Funcionário"}
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* ── Role Change Dialog ── */}
            <Dialog open={!!roleModal} onOpenChange={(open) => !open && setRoleModal(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-base">Alterar Permissão</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Selecione a nova permissão para este funcionário.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-3 gap-2 py-2">
                        {(["USER", "MODERATOR", "ADMIN"] as Role[]).map((r) => {
                            const Icon = roleIcons[r]
                            const isCurrent = roleModal?.currentRole === r
                            return (
                                <button
                                    key={r}
                                    type="button"
                                    disabled={isCurrent || isPending}
                                    onClick={() => roleModal && handleRoleChange(roleModal.userId, r)}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                        isCurrent
                                            ? "border-indigo-600 bg-indigo-50"
                                            : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50"
                                    }`}
                                >
                                    <Icon size={16} className={isCurrent ? "text-indigo-600" : "text-slate-400"} />
                                    <span className={`text-[10px] font-bold ${isCurrent ? "text-indigo-600" : "text-slate-500"}`}>
                                        {roleLabels[r]}
                                    </span>
                                    {isCurrent && <span className="text-[8px] text-indigo-500 font-medium">Atual</span>}
                                </button>
                            )
                        })}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="w-full" onClick={() => setRoleModal(null)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation Dialog ── */}
            <Dialog open={!!deleteModal} onOpenChange={(open) => !open && setDeleteModal(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-base text-red-600">Remover Funcionário</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Tem certeza que deseja remover <strong>{userToDelete?.name}</strong> ({userToDelete?.email})?
                            Esta ação não pode ser desfeita. Todas as sessões e dados de acesso serão removidos.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteModal(null)}>Cancelar</Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isPending}
                            onClick={() => deleteModal && handleDelete(deleteModal)}
                        >
                            {isPending ? "Removendo..." : "Remover"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
