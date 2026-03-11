"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
    ArrowDown,
    ArrowUp,
    Calendar,
    Crown,
    Eye,
    EyeOff,
    FileDown,
    Loader2,
    Mail,
    MoreHorizontal,
    Pencil,
    Plus,
    Printer,
    Search,
    ShieldCheck,
    Trash2,
    User,
    Users,
} from "lucide-react"
import { toast } from "react-toastify"

import { createUser, deleteUser, getUsers, updateUser, updateUserPassword, updateUserPermissions } from "@/app/actions/users"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    DEFAULT_PERMISSIONS_BY_ROLE,
    PERMISSION_MODULES,
    type Role,
    type UserPermissions,
} from "@/app/utils/permissions"

type FilterType = "all" | "admin" | "moderator" | "user"
type SortKey = "name" | "email" | "role" | "createdAt"
type SortDir = "asc" | "desc"
type DrawerMode = "create" | "edit"

type UserData = {
    id: string
    name: string
    email: string
    role: Role
    image: string | null
    emailVerified: boolean
    permissions: UserPermissions
    createdAt: Date
    updatedAt: Date
}

type Props = {
    isAdmin: boolean
    currentUserId: string
    currentUserRole: Role
}

type FormState = {
    name: string
    email: string
    password: string
    role: Role
    permissions: UserPermissions
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

const roleIcons = {
    ADMIN: Crown,
    MODERATOR: ShieldCheck,
    USER: User,
} satisfies Record<Role, typeof User>

const FILTERS = [
    { key: "all" as FilterType, label: "Todos", icon: Users },
    { key: "admin" as FilterType, label: "Administradores", icon: Crown },
    { key: "moderator" as FilterType, label: "Moderadores", icon: ShieldCheck },
    { key: "user" as FilterType, label: "Usuários", icon: User },
]

const COLUMNS: { key: SortKey; label: string }[] = [
    { key: "name", label: "Funcionário" },
    { key: "email", label: "Email" },
    { key: "role", label: "Cargo" },
    { key: "createdAt", label: "Criado em" },
]

function getInitials(name: string) {
    return name.split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase()
}

function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}

function compareUsers(a: UserData, b: UserData, key: SortKey, dir: SortDir): number {
    let cmp = 0

    switch (key) {
        case "name":
            cmp = a.name.localeCompare(b.name, "pt-BR")
            break
        case "email":
            cmp = a.email.localeCompare(b.email, "pt-BR")
            break
        case "role":
            cmp = a.role.localeCompare(b.role, "pt-BR")
            break
        case "createdAt":
            cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            break
    }

    return dir === "asc" ? cmp : -cmp
}

function getRoleOptions(isAdmin: boolean): Role[] {
    return isAdmin ? ["USER", "MODERATOR", "ADMIN"] : ["USER", "MODERATOR"]
}

function createEmptyForm(isAdmin: boolean): FormState {
    const role: Role = isAdmin ? "USER" : "MODERATOR"

    return {
        name: "",
        email: "",
        password: "",
        role,
        permissions: { ...DEFAULT_PERMISSIONS_BY_ROLE[role] },
    }
}

export default function FuncionariosManagerClient({ isAdmin, currentUserId, currentUserRole }: Props) {
    const queryClient = useQueryClient()
    const [searchQuery, setSearchQuery] = useState("")
    const [activeFilter, setActiveFilter] = useState<FilterType>("all")
    const [sortKey, setSortKey] = useState<SortKey>("name")
    const [sortDir, setSortDir] = useState<SortDir>("asc")
    const [sheetOpen, setSheetOpen] = useState(false)
    const [sheetTab, setSheetTab] = useState("dados")
    const [sheetMode, setSheetMode] = useState<DrawerMode>("create")
    const [editingUserId, setEditingUserId] = useState<string | null>(null)
    const [deleteModal, setDeleteModal] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [form, setForm] = useState<FormState>(() => createEmptyForm(isAdmin))

    const { data: usersRaw = [], isLoading } = useQuery({
        queryKey: ["users"],
        queryFn: () => getUsers(),
    })

    const users = usersRaw as UserData[]

    const filteredUsers = useMemo(() => {
        const filterRoleMap: Record<FilterType, Role[]> = {
            all: ["ADMIN", "MODERATOR", "USER"],
            admin: ["ADMIN"],
            moderator: ["MODERATOR"],
            user: ["USER"],
        }

        return users
            .filter((user) => {
                const matchesFilter = filterRoleMap[activeFilter].includes(user.role)
                const normalizedSearch = searchQuery.trim().toLowerCase()
                const matchesSearch =
                    normalizedSearch.length === 0 ||
                    user.name.toLowerCase().includes(normalizedSearch) ||
                    user.email.toLowerCase().includes(normalizedSearch)

                return matchesFilter && matchesSearch
            })
            .sort((a, b) => compareUsers(a, b, sortKey, sortDir))
    }, [activeFilter, searchQuery, sortDir, sortKey, users])

    const counts: Record<FilterType, number> = {
        all: users.length,
        admin: users.filter((user) => user.role === "ADMIN").length,
        moderator: users.filter((user) => user.role === "MODERATOR").length,
        user: users.filter((user) => user.role === "USER").length,
    }

    const deleteTarget = users.find((user) => user.id === deleteModal) || null
    const editingUser = users.find((user) => user.id === editingUserId) || null

    const createMutation = useMutation({
        mutationFn: createUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] })
            toast.success("Funcionário criado com sucesso")
            closeSheet()
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const updateMutation = useMutation({
        mutationFn: async (payload: { userId: string; data: FormState }) => {
            await updateUser(payload.userId, {
                name: payload.data.name,
                email: payload.data.email,
                role: payload.data.role,
            })

            await updateUserPermissions(payload.userId, payload.data.permissions)

            if (payload.data.password.trim()) {
                await updateUserPassword(payload.userId, payload.data.password)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] })
            toast.success("Funcionário atualizado com sucesso")
            closeSheet()
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const deleteMutation = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] })
            toast.success("Funcionário removido com sucesso")
            setDeleteModal(null)
        },
        onError: (error: Error) => toast.error(error.message),
    })

    const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

    function closeSheet() {
        setSheetOpen(false)
        setSheetMode("create")
        setEditingUserId(null)
        setSheetTab("dados")
        setShowPassword(false)
        setForm(createEmptyForm(isAdmin))
    }

    function handleSort(nextKey: SortKey) {
        if (sortKey === nextKey) {
            setSortDir((current) => (current === "asc" ? "desc" : "asc"))
            return
        }

        setSortKey(nextKey)
        setSortDir("asc")
    }

    function openCreateSheet() {
        setSheetMode("create")
        setEditingUserId(null)
        setSheetTab("dados")
        setShowPassword(false)
        setForm(createEmptyForm(isAdmin))
        setSheetOpen(true)
    }

    function openEditSheet(user: UserData) {
        setSheetMode("edit")
        setEditingUserId(user.id)
        setSheetTab("dados")
        setShowPassword(false)
        setForm({
            name: user.name,
            email: user.email,
            password: "",
            role: user.role,
            permissions: { ...user.permissions },
        })
        setSheetOpen(true)
    }

    function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((current) => ({ ...current, [key]: value }))
    }

    function handleRoleSelect(role: Role) {
        setForm((current) => ({
            ...current,
            role,
            permissions: { ...DEFAULT_PERMISSIONS_BY_ROLE[role] },
        }))
    }

    function togglePermission(key: keyof UserPermissions) {
        setForm((current) => ({
            ...current,
            permissions: {
                ...current.permissions,
                [key]: !current.permissions[key],
            },
        }))
    }

    function handleSubmit() {
        if (!form.name.trim() || !form.email.trim()) {
            toast.error("Nome e email são obrigatórios")
            setSheetTab("dados")
            return
        }

        if (sheetMode === "create" && !form.password.trim()) {
            toast.error("Senha é obrigatória")
            setSheetTab("dados")
            return
        }

        if (form.password.trim() && form.password.trim().length < 8) {
            toast.error("A senha deve ter pelo menos 8 caracteres")
            setSheetTab("dados")
            return
        }

        if (sheetMode === "create") {
            createMutation.mutate({
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password,
                role: form.role,
                permissions: form.permissions,
            })
            return
        }

        if (!editingUserId) {
            toast.error("Usuário inválido")
            return
        }

        updateMutation.mutate({ userId: editingUserId, data: form })
    }

    function canManageUser(user: UserData) {
        if (user.id === currentUserId) return false
        if (user.role === "ADMIN" && currentUserRole !== "ADMIN") return false
        return true
    }

    return (
        <div className="flex h-full bg-slate-50">
            <div className="w-60 min-w-60 bg-white h-full flex flex-col px-4 pt-6 border-r border-slate-200">
                <div className="mb-6">
                    <h1 className="text-lg font-bold text-slate-900">Funcionários</h1>
                    <p className="text-xs text-slate-500 mt-0.5">{counts.all} cadastrados</p>
                </div>

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
            </div>

            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between px-6 h-16 bg-white border-b border-slate-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <Input
                            placeholder="Buscar funcionários..."
                            className="pl-10 pr-4 w-72 bg-slate-50 border-slate-200 h-10 text-sm rounded-xl focus-visible:ring-indigo-500 placeholder:text-slate-400"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:bg-slate-50 h-10 px-3 rounded-xl">
                            <Printer size={16} />
                        </Button>
                        <Button variant="outline" size="sm" className="text-slate-600 border-slate-200 hover:bg-slate-50 gap-2 h-10 px-4 rounded-xl">
                            <FileDown size={16} />
                            <span className="text-sm">Exportar</span>
                        </Button>
                        <button onClick={openCreateSheet} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm shadow-indigo-600/25">
                            <Plus size={16} /> Novo Funcionário
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-[1.5fr_1.2fr_120px_120px_100px_50px] gap-3 px-6 py-3 border-b border-slate-200 bg-slate-50">
                    {COLUMNS.map((column) => (
                        <button
                            key={column.key}
                            onClick={() => handleSort(column.key)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer select-none uppercase tracking-wider"
                        >
                            {column.label}
                            {sortKey === column.key ? (sortDir === "desc" ? <ArrowDown size={12} /> : <ArrowUp size={12} />) : null}
                        </button>
                    ))}
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Acessos</span>
                    <span></span>
                </div>

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
                            const enabledModules = Object.values(user.permissions).filter(Boolean).length
                            const canManage = canManageUser(user)

                            return (
                                <div key={user.id} className="group grid grid-cols-[1.5fr_1.2fr_120px_120px_100px_50px] items-center border-b border-slate-100 hover:bg-slate-50/50 transition-all px-6 py-3.5 gap-3">
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
                                                {isMe ? <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">Você</span> : null}
                                            </div>
                                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <Mail size={12} className="text-slate-300 shrink-0" />
                                        <span className="text-sm text-slate-600 truncate">{user.email}</span>
                                    </div>

                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white w-fit ${roleBadgeColors[user.role]}`}>
                                        <RoleIcon size={10} />
                                        {roleLabels[user.role]}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={11} className="text-slate-300" />
                                        <span className="text-xs text-slate-500">{formatDate(user.createdAt)}</span>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-semibold text-slate-700">{enabledModules}</span>
                                        <span className="text-[10px] text-slate-400">módulos ativos</span>
                                    </div>

                                    <div className="flex justify-end">
                                        {canManage ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
                                                        <MoreHorizontal size={16} />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-52">
                                                    <DropdownMenuItem onClick={() => openEditSheet(user)} className="gap-2 text-sm cursor-pointer">
                                                        <Pencil size={14} /> Editar usuário
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => setDeleteModal(user.id)} className="gap-2 text-sm text-red-600 focus:text-red-600 cursor-pointer">
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

            <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) closeSheet() }}>
                <SheetContent side="right" className="sm:max-w-xl w-full p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
                        <SheetTitle className="text-base">{sheetMode === "create" ? "Novo Funcionário" : "Editar Funcionário"}</SheetTitle>
                        <SheetDescription className="text-xs">
                            {sheetMode === "create" ? "Crie uma conta e defina os acessos personalizados." : `Ajuste os dados e as permissões de ${editingUser?.name || ""}.`}
                        </SheetDescription>
                    </SheetHeader>

                    <Tabs value={sheetTab} onValueChange={setSheetTab} className="flex h-full flex-col">
                        <div className="px-6 pt-4">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="dados">Dados</TabsTrigger>
                                <TabsTrigger value="permissoes">Permissões</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <TabsContent value="dados" className="mt-0 space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Nome completo *</label>
                                    <Input value={form.name} onChange={(event) => updateForm("name", event.target.value)} className="h-10 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Email *</label>
                                    <Input type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} className="h-10 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Senha {sheetMode === "create" ? "*" : "(opcional)"}</label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            value={form.password}
                                            onChange={(event) => updateForm("password", event.target.value)}
                                            placeholder={sheetMode === "create" ? "Mínimo 8 caracteres" : "Preencha apenas se quiser alterar"}
                                            className="h-10 rounded-lg text-sm pr-10"
                                        />
                                        <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Cargo</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {getRoleOptions(isAdmin).map((role) => {
                                            const Icon = roleIcons[role]
                                            const selected = form.role === role

                                            return (
                                                <button
                                                    key={role}
                                                    type="button"
                                                    onClick={() => handleRoleSelect(role)}
                                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                                                        selected ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
                                                    }`}
                                                >
                                                    <Icon size={16} className={selected ? "text-indigo-600" : "text-slate-400"} />
                                                    <span className={`text-[10px] font-bold ${selected ? "text-indigo-600" : "text-slate-500"}`}>{roleLabels[role]}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="permissoes" className="mt-0 flex flex-col h-full">
                                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mb-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Padrão do cargo</p>
                                        <p className="text-xs text-slate-500">Restaura os acessos recomendados para {roleLabels[form.role].toLowerCase()}.</p>
                                    </div>
                                    <Button variant="outline" className="rounded-lg" onClick={() => updateForm("permissions", { ...DEFAULT_PERMISSIONS_BY_ROLE[form.role] })}>
                                        Restaurar
                                    </Button>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-2">
                                    {PERMISSION_MODULES.map((module) => (
                                        <div key={module.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{module.label}</p>
                                                <p className="text-xs text-slate-500">{module.path}</p>
                                            </div>
                                            <Switch checked={form.permissions[module.key]} onCheckedChange={() => togglePermission(module.key)} />
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>

                    <SheetFooter className="px-6 py-4 border-t border-slate-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={closeSheet}>Cancelar</Button>
                            <Button className="flex-1 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm" disabled={isPending} onClick={handleSubmit}>
                                {isPending ? <Loader2 size={14} className="animate-spin" /> : sheetMode === "create" ? "Criar funcionário" : "Salvar alterações"}
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <Dialog open={!!deleteModal} onOpenChange={(open) => !open && setDeleteModal(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-base text-red-600">Remover Funcionário</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Tem certeza que deseja remover <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})?
                            Esta ação não pode ser desfeita. Todas as sessões e dados de acesso serão removidos.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteModal(null)}>Cancelar</Button>
                        <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={isPending} onClick={() => deleteModal && deleteMutation.mutate(deleteModal)}>
                            {isPending ? "Removendo..." : "Remover"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
