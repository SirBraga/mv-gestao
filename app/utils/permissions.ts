export type Role = "ADMIN" | "MODERATOR" | "USER"

export const PERMISSION_KEYS = [
    "dashboard",
    "clientes",
    "tickets",
    "contabilidade",
    "produtos",
    "baseConhecimento",
    "funcionarios",
    "chat",
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number]
export type UserPermissions = Record<PermissionKey, boolean>

export const PERMISSION_MODULES: Array<{ key: PermissionKey; label: string; path: string }> = [
    { key: "dashboard", label: "Dashboard", path: "/dashboard" },
    { key: "clientes", label: "Clientes", path: "/dashboard/clientes" },
    { key: "tickets", label: "Tickets", path: "/dashboard/tickets" },
    { key: "contabilidade", label: "Contabilidade", path: "/dashboard/contabilidade" },
    { key: "produtos", label: "Produtos", path: "/dashboard/produtos" },
    { key: "baseConhecimento", label: "Base de Conhecimento", path: "/dashboard/base-conhecimento" },
    { key: "funcionarios", label: "Funcionários", path: "/dashboard/funcionarios" },
    { key: "chat", label: "Chat", path: "/dashboard/chat" },
]

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<Role, UserPermissions> = {
    ADMIN: {
        dashboard: true,
        clientes: true,
        tickets: true,
        contabilidade: true,
        produtos: true,
        baseConhecimento: true,
        funcionarios: true,
        chat: true,
    },
    MODERATOR: {
        dashboard: true,
        clientes: true,
        tickets: true,
        contabilidade: true,
        produtos: true,
        baseConhecimento: true,
        funcionarios: false,
        chat: true,
    },
    USER: {
        dashboard: true,
        clientes: false,
        tickets: true,
        contabilidade: false,
        produtos: false,
        baseConhecimento: true,
        funcionarios: false,
        chat: true,
    },
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function getDefaultPermissions(role: Role): UserPermissions {
    return { ...DEFAULT_PERMISSIONS_BY_ROLE[role] }
}

export function sanitizePermissions(value: unknown, role: Role): UserPermissions {
    const base = getDefaultPermissions(role)

    if (!isRecord(value)) {
        return base
    }

    const merged = { ...base }

    for (const key of PERMISSION_KEYS) {
        if (typeof value[key] === "boolean") {
            merged[key] = value[key] as boolean
        }
    }

    return merged
}

export function hasPermission(value: unknown, role: Role, permission: PermissionKey) {
    return sanitizePermissions(value, role)[permission] === true
}

export function getPermissionByPath(pathname: string): PermissionKey | null {
    const exactMatch = PERMISSION_MODULES.find((module) => module.path === pathname)
    if (exactMatch) return exactMatch.key

    const nestedMatch = PERMISSION_MODULES.find((module) => module.path !== "/dashboard" && pathname.startsWith(module.path))
    if (nestedMatch) return nestedMatch.key

    if (pathname.startsWith("/dashboard")) {
        return "dashboard"
    }

    return null
}
