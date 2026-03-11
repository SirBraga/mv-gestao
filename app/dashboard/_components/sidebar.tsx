"use client"

import Image from "next/image"
import { useState, useEffect, useTransition, useRef, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { type PermissionKey, type UserPermissions } from "@/app/utils/permissions"
import { 
  LayoutDashboard, 
  Users, 
  Ticket, 
  Calculator, 
  Package, 
  BookOpen,
  LogOut, 
  UsersRound, 
  MessageCircle, 
  Wifi, 
  WifiOff, 
  Bell, 
  CheckCheck,
  Sparkles,
  UserCircle
} from "lucide-react"
import { HiArrowRightOnRectangle } from "react-icons/hi2";
import { updateOnlineStatus } from "@/app/actions/chat"
import { getProfile } from "@/app/actions/profile"
import { getNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead } from "@/app/actions/notifications"
import { useChatState } from "@/components/chat/ChatStateProvider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { authClient } from "@/app/utils/auth-client"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, permission: "dashboard" as PermissionKey },
  { label: "Clientes", path: "/dashboard/clientes", icon: Users, permission: "clientes" as PermissionKey },
  { label: "Tickets", path: "/dashboard/tickets", icon: Ticket, permission: "tickets" as PermissionKey },
  { label: "Contabilidade", path: "/dashboard/contabilidade", icon: Calculator, permission: "contabilidade" as PermissionKey },
  { label: "Produtos", path: "/dashboard/produtos", icon: Package, permission: "produtos" as PermissionKey },
  { label: "Base de Conhecimento", path: "/dashboard/base-conhecimento", icon: BookOpen, permission: "baseConhecimento" as PermissionKey },
  { label: "Funcionários", path: "/dashboard/funcionarios", icon: UsersRound, permission: "funcionarios" as PermissionKey },
  { label: "Chat", path: "/dashboard/chat", icon: MessageCircle, permission: "chat" as PermissionKey },
]

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer
}

interface SidebarProps {
    avatar: string;
    name: string
    role: string
    permissions: UserPermissions
}

export default function Sidebar({ avatar, name, role, permissions }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const { totalUnreadCount } = useChatState()
  const [isOnline, setIsOnline] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [notifOpen, setNotifOpen] = useState(false)
  const prevNotifCountRef = useRef(0)
  const prevChatCountRef = useRef(0)

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfile(),
    initialData: {
      id: "",
      name,
      email: "",
      image: avatar || null,
      role,
    },
    staleTime: 60 * 1000,
  })

  const displayName = profile?.name || name
  const displayAvatar = profile?.image || avatar || ""
  const displayRole = (profile?.role || role).toLowerCase()

  const playNotifSound = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = "sine"
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    } catch {
      // Silently fail
    }
  }, [])


  const { data: unreadNotifCount = 0 } = useQuery({
    queryKey: ["unreadNotifCount"],
    queryFn: () => getUnreadNotificationCount(),
    refetchInterval: 30000,
    staleTime: 15000,
    refetchOnWindowFocus: true,
  })

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(),
    enabled: notifOpen,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  const markReadMut = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      queryClient.invalidateQueries({ queryKey: ["unreadNotifCount"] })
    },
  })

  const markAllReadMut = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      queryClient.invalidateQueries({ queryKey: ["unreadNotifCount"] })
    },
  })

  // Sound + browser notification: ticket notifications
  useEffect(() => {
    if (unreadNotifCount > prevNotifCountRef.current && prevNotifCountRef.current > 0) {
      playNotifSound()
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const latestNotif = notifications[0] as { title: string; message: string } | undefined
        if (latestNotif) {
          new Notification(latestNotif.title, { body: latestNotif.message, icon: "/root/logo.png" })
        }
      }
    }
    prevNotifCountRef.current = unreadNotifCount
  }, [unreadNotifCount, playNotifSound, notifications])

  // Sound + browser notification: new chat messages (only when NOT on /dashboard/chat)
  useEffect(() => {
    const isOnChatPage = pathname.startsWith("/dashboard/chat")
    if (
      totalUnreadCount > prevChatCountRef.current &&
      prevChatCountRef.current > 0 &&
      !isOnChatPage
    ) {
      playNotifSound()
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("💬 Nova mensagem", {
          body: "Você tem novas mensagens no chat",
          icon: "/root/logo.png",
        })
      }
    }
    prevChatCountRef.current = totalUnreadCount
  }, [totalUnreadCount, pathname, playNotifSound])

  // Register Service Worker + subscribe to push notifications
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return

    async function registerPush() {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js")

        const permission = await Notification.requestPermission()
        if (permission !== "granted") return

        const existing = await reg.pushManager.getSubscription()
        if (existing) {
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(existing),
          })
          return
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
        })

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        })
      } catch {
        // Silently fail — push não essencial
      }
    }

    registerPush()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Set online on mount, offline on unmount
  useEffect(() => {
    updateOnlineStatus(true).then(() => setIsOnline(true))
    const handleBeforeUnload = () => { updateOnlineStatus(false) }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      updateOnlineStatus(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleOnline = () => {
    const newStatus = !isOnline
    setIsOnline(newStatus)
    startTransition(() => { updateOnlineStatus(newStatus) })
  }

  const handleLogout = async () => {
    await updateOnlineStatus(false)
    await authClient.signOut({})
    router.push("/")
  }

  const [expanded, setExpanded] = useState(false)

  return (
    <TooltipProvider delayDuration={0}>
      <aside 
        className={`h-full bg-linear-to-b from-slate-900 to-slate-800 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-700/50 ${
          expanded ? "w-56" : "w-15"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center h-16 px-4 border-b border-white/5 ${expanded ? "justify-between" : "justify-center"}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 relative shrink-0">
              <Image src="/root/logo.png" alt="MV Gestão" fill className="object-contain brightness-0 invert" />
            </div>
            {expanded && (
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">MV Desk</p>
                <p className="text-[10px] text-slate-400">Sistema de Gestão</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.filter((item) => permissions[item.permission]).map((item) => {
            const Icon = item.icon
            const isActive = item.path === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.path)
            const showBadge = item.label === "Chat" && totalUnreadCount > 0

            return (
              <Tooltip key={item.label} delayDuration={expanded ? 9999 : 0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.path}
                    className={`group relative flex items-center gap-3 px-3 h-11 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2 : 1.5} className="shrink-0" />
                    {expanded && (
                      <span className={`text-sm truncate ${isActive ? "font-medium" : ""}`}>
                        {item.label}
                      </span>
                    )}
                    {showBadge && (
                      <span className={`absolute flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold ${
                        expanded ? "right-3" : "-top-1 -right-1"
                      }`}>
                        {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                {!expanded && (
                  <TooltipContent side="right" sideOffset={12} className="bg-slate-800 text-white border-slate-700">
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-2 space-y-1 border-t border-white/5">
          {/* Notifications */}
          <div className="relative">
            <Tooltip delayDuration={expanded ? 9999 : 0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className={`w-full flex items-center gap-3 px-3 h-11 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all cursor-pointer ${
                    notifOpen ? "bg-white/5 text-white" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <Bell size={20} strokeWidth={1.5} />
                    {unreadNotifCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold animate-pulse">
                        {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                      </span>
                    )}
                  </div>
                  {expanded && <span className="text-sm">Notificações</span>}
                </button>
              </TooltipTrigger>
              {!expanded && (
                <TooltipContent side="right" sideOffset={12} className="bg-slate-800 text-white border-slate-700">
                  Notificações
                </TooltipContent>
              )}
            </Tooltip>

            {/* Notifications Dropdown */}
            {notifOpen && (
              <div className={`absolute bottom-full mb-2 ${expanded ? "left-0 w-full" : "left-full ml-2"} w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden`}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="text-sm font-semibold text-slate-900">Notificações</p>
                  {unreadNotifCount > 0 && (
                    <button onClick={() => markAllReadMut.mutate()} className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 cursor-pointer">
                      <CheckCheck size={10} /> Marcar lidas
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                      <Sparkles size={24} className="mb-2 text-slate-300" />
                      <p className="text-xs">Tudo em dia!</p>
                    </div>
                  ) : (
                    notifications.map((n: { id: string; title: string; message: string; link: string | null; read: boolean; createdAt: string }) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          if (!n.read) markReadMut.mutate(n.id)
                          if (n.link) { router.push(n.link); setNotifOpen(false) }
                        }}
                        className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${!n.read ? "bg-indigo-50/50" : ""}`}
                      >
                        <p className={`text-xs ${!n.read ? "font-semibold text-slate-900" : "text-slate-600"}`}>{n.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{n.message}</p>
                        <p className="text-[9px] text-slate-300 mt-1">{new Date(n.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Toggle Expand Button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-start gap-3 px-3 h-12 rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all cursor-pointer group"
          >
            <div className={`relative w-6 h-6 flex items-center justify-center transition-transform duration-300 ${
              expanded ? "rotate-180" : ""
            }`}>
              <div className="absolute inset-0 " />
              <HiArrowRightOnRectangle size={22} className="text-slate-400" />
            </div>
            {expanded && (
              <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
                Recolher
              </span>
            )}
          </button>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`w-full flex items-center gap-3 px-3 h-12 rounded-xl hover:bg-white/5 transition-all cursor-pointer ${expanded ? "" : "justify-center"}`}>
                <div className="relative shrink-0">
                  <Avatar className="size-8 ring-2 ring-white/10">
                    <AvatarImage src={displayAvatar} alt={displayName} />
                    <AvatarFallback className="bg-indigo-600 text-white text-xs font-semibold">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                    isOnline ? "bg-emerald-400" : "bg-slate-500"
                  }`} />
                </div>
                {expanded && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-white truncate">{displayName}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{displayRole}</p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-56 bg-white border-slate-200">
              <div className="px-3 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                <p className="text-xs text-slate-500 capitalize">{displayRole}</p>
              </div>
              <DropdownMenuItem onClick={toggleOnline} className="gap-3 py-2.5 cursor-pointer" disabled={isPending}>
                {isOnline ? <Wifi size={16} className="text-emerald-500" /> : <WifiOff size={16} className="text-slate-400" />}
                <span className="text-sm">{isOnline ? "Ficar offline" : "Ficar online"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/dashboard/perfil")} className="gap-3 py-2.5 cursor-pointer">
                <UserCircle size={16} className="text-slate-500" />
                <span className="text-sm">Meu perfil</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem onClick={handleLogout} className="gap-3 py-2.5 text-red-600 focus:text-red-600 cursor-pointer">
                <LogOut size={16} />
                <span className="text-sm">Sair da conta</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  )
}