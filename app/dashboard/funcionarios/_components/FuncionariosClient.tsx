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
} from "lucide-react"
import { toast } from "react-toastify"
import { getUsers, createUser, updateUserRole, deleteUser } from "@/app/actions/users"

type Role = "ADMIN" | "MODERATOR" | "USER"

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
    ADMIN: "bg-red-50 text-red-700 border-red-200",
    MODERATOR: "bg-amber-50 text-amber-700 border-amber-200",
    USER: "bg-gray-50 text-gray-600 border-gray-200",
}

const roleIcons: Record<Role, typeof Shield> = {
    ADMIN: Crown,
    MODERATOR: ShieldCheck,
    USER: User,
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
    const [search, setSearch] = useState("")
    const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL")
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

    const filtered = useMemo(() => {
        return users.filter((u) => {
            const matchesSearch = !search ||
                u.name.toLowerCase().includes(search.toLowerCase()) ||
                u.email.toLowerCase().includes(search.toLowerCase())
            const matchesRole = roleFilter === "ALL" || u.role === roleFilter
            return matchesSearch && matchesRole
        })
    }, [users, search, roleFilter])

    const counts = {
        ALL: users.length,
        ADMIN: users.filter(u => u.role === "ADMIN").length,
        MODERATOR: users.filter(u => u.role === "MODERATOR").length,
        USER: users.filter(u => u.role === "USER").length,
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
        <div className="flex flex-col h-full overflow-hidden bg-white">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 h-14 border-b border-gray-200">
                <div className="flex items-center gap-4">
                    <h1 className="text-sm font-bold text-gray-900">Funcionários</h1>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <Input
                            placeholder="Buscar por nome ou email..."
                            className="pl-8 pr-3 w-64 bg-white border-0 shadow-none h-8 text-sm focus-visible:ring-0 placeholder:text-gray-400"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Role Filter */}
                    <div className="flex items-center gap-1">
                        {(["ALL", "ADMIN", "MODERATOR", "USER"] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setRoleFilter(r)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                    roleFilter === r
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                                }`}
                            >
                                {r === "ALL" ? "Todos" : roleLabels[r]}
                                <span className={`ml-1 text-[10px] ${roleFilter === r ? "text-blue-500" : "text-gray-300"}`}>
                                    {counts[r]}
                                </span>
                            </button>
                        ))}
                    </div>

                    {isAdmin && (
                        <button
                            onClick={() => setDrawerOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                            <Plus size={13} /> Novo Funcionário
                        </button>
                    )}
                </div>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-[1.5fr_1.2fr_120px_120px_80px] gap-3 px-6 py-2.5 border-b border-gray-200 bg-gray-50/80">
                <span className="text-xs font-medium text-gray-500">Funcionário</span>
                <span className="text-xs font-medium text-gray-500">Email</span>
                <span className="text-xs font-medium text-gray-500">Permissão</span>
                <span className="text-xs font-medium text-gray-500">Criado em</span>
                <span className="text-xs font-medium text-gray-500 text-right">Ações</span>
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex flex-col">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="grid grid-cols-[1.5fr_1.2fr_120px_120px_80px] items-center border-b border-gray-100 px-6 py-3 gap-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
                                    <div className="space-y-1.5 flex-1">
                                        <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                                        <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
                                    </div>
                                </div>
                                <div className="h-3 bg-gray-100 rounded animate-pulse w-4/5" />
                                <div className="h-5 bg-gray-100 rounded-full animate-pulse w-20" />
                                <div className="h-3 bg-gray-100 rounded animate-pulse w-16" />
                                <div className="h-7 bg-gray-100 rounded animate-pulse w-8 ml-auto" />
                            </div>
                        ))}
                    </div>
                ) : null}
                {!isLoading && filtered.map((user) => {
                    const isMe = user.id === currentUserId
                    const RoleIcon = roleIcons[user.role]
                    return (
                        <div
                            key={user.id}
                            className="grid grid-cols-[1.5fr_1.2fr_120px_120px_80px] items-center border-b border-gray-100 hover:bg-gray-50 transition-colors px-6 py-3 gap-3"
                        >
                            {/* Name + Avatar */}
                            <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarImage src={user.image || undefined} />
                                    <AvatarFallback className="text-[10px] font-bold text-white bg-blue-600">
                                        {getInitials(user.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                                        {isMe && (
                                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">Você</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 truncate lg:hidden">{user.email}</p>
                                </div>
                            </div>

                            {/* Email */}
                            <div className="flex items-center gap-1.5 min-w-0">
                                <Mail size={12} className="text-gray-300 shrink-0" />
                                <span className="text-sm text-gray-600 truncate">{user.email}</span>
                            </div>

                            {/* Role Badge */}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold w-fit ${roleBadgeColors[user.role]}`}>
                                <RoleIcon size={10} />
                                {roleLabels[user.role]}
                            </span>

                            {/* Created */}
                            <div className="flex items-center gap-1.5">
                                <Calendar size={11} className="text-gray-300" />
                                <span className="text-xs text-gray-500">{formatDate(user.createdAt)}</span>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end">
                                {isAdmin && !isMe ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer">
                                                <MoreHorizontal size={14} />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem
                                                onClick={() => setRoleModal({ userId: user.id, currentRole: user.role })}
                                                className="gap-2 text-sm"
                                            >
                                                <Shield size={14} /> Alterar Permissão
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => setDeleteModal(user.id)}
                                                className="gap-2 text-sm text-red-600 focus:text-red-600"
                                            >
                                                <Trash2 size={14} /> Remover
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    <span className="text-[10px] text-gray-300">—</span>
                                )}
                            </div>
                        </div>
                    )
                })}

                {filtered.length === 0 && (
                    <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                        Nenhum funcionário encontrado
                    </div>
                )}
            </div>

            {/* ── Create Drawer ── */}
            <Sheet open={drawerOpen} onOpenChange={(open) => { if (!open) { setDrawerOpen(false); resetForm() } }}>
                <SheetContent className="sm:max-w-md overflow-y-auto">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
                        <SheetTitle className="text-base font-bold">Novo Funcionário</SheetTitle>
                        <SheetDescription className="text-xs text-gray-400">Crie uma conta para um novo colaborador.</SheetDescription>
                    </SheetHeader>
                    <div className="px-6 py-5 space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nome completo *</label>
                            <Input
                                placeholder="Ex: João da Silva"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                className="h-10 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email *</label>
                            <Input
                                type="email"
                                placeholder="joao@empresa.com.br"
                                value={formEmail}
                                onChange={(e) => setFormEmail(e.target.value)}
                                className="h-10 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Senha *</label>
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
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Permissão</label>
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
                                                    ? "border-blue-600 bg-blue-50"
                                                    : "border-gray-200 bg-white hover:border-gray-300"
                                            }`}
                                        >
                                            <Icon size={16} className={formRole === r ? "text-blue-600" : "text-gray-400"} />
                                            <span className={`text-[10px] font-bold ${formRole === r ? "text-blue-600" : "text-gray-500"}`}>
                                                {roleLabels[r]}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                            <div className="mt-2 text-[10px] text-gray-400 space-y-0.5">
                                <p><strong>Usuário:</strong> Acesso básico ao sistema</p>
                                <p><strong>Moderador:</strong> Pode gerenciar tickets e clientes</p>
                                <p><strong>Admin:</strong> Acesso total, incluindo gerenciar funcionários</p>
                            </div>
                        </div>
                    </div>
                    <SheetFooter className="px-6 py-4 border-t border-gray-100">
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" className="flex-1 h-10 rounded-lg text-sm" onClick={() => { setDrawerOpen(false); resetForm() }}>
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
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
                        <DialogDescription className="text-xs text-gray-400">
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
                                            ? "border-blue-600 bg-blue-50"
                                            : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
                                    }`}
                                >
                                    <Icon size={16} className={isCurrent ? "text-blue-600" : "text-gray-400"} />
                                    <span className={`text-[10px] font-bold ${isCurrent ? "text-blue-600" : "text-gray-500"}`}>
                                        {roleLabels[r]}
                                    </span>
                                    {isCurrent && <span className="text-[8px] text-blue-500 font-medium">Atual</span>}
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
                        <DialogDescription className="text-xs text-gray-500">
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
