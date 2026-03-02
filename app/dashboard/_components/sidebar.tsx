"use client"

import Image from "next/image"
import { useState, useEffect, useTransition, useRef, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Home, Users, Ticket, Calculator, Package, LogOut, Settings, UsersRound, MessageCircle, Circle, Wifi, WifiOff, Camera, Loader2, Bell, CheckCheck } from "lucide-react"
import { updateOnlineStatus, getUnreadCount, getLatestUnreadMessage } from "@/app/actions/chat"
import { updateProfileImage } from "@/app/actions/profile"
import { getNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead } from "@/app/actions/notifications"
import { uploadFile } from "@/app/utils/upload"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ImagePositioner } from "./ImagePositioner"
import { toast } from "react-toastify"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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
  { label: "Início", path: "/dashboard", icon: Home, color: "bg-emerald-500" },
  { label: "Clientes", path: "/dashboard/clientes", icon: Users, color: "bg-sky-500" },
  { label: "Tickets", path: "/dashboard/tickets", icon: Ticket, color: "bg-amber-500" },
  { label: "Contabilidade", path: "/dashboard/contabilidade", icon: Calculator, color: "bg-violet-500" },
  { label: "Produtos", path: "/dashboard/produtos", icon: Package, color: "bg-rose-500" },
  { label: "Funcionários", path: "/dashboard/funcionarios", icon: UsersRound, color: "bg-blue-500" },
  { label: "Chat", path: "/dashboard/chat", icon: MessageCircle, color: "bg-teal-500" },
]

interface SidebarProps {
    avatar: string;
    name: string
    userId: string
    role: string
}

export default function Sidebar({ avatar, name, userId, role }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const [isOnline, setIsOnline] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [photoSrc, setPhotoSrc] = useState<string | null>(avatar || null)
  const [photoPosition, setPhotoPosition] = useState("50% 50%")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const prevNotifCountRef = useRef(0)
  const prevChatCountRef = useRef(0)
  const lastSeenChatMsgIdRef = useRef<string | null>(null)

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

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unreadCount"],
    queryFn: () => getUnreadCount(),
    refetchInterval: 3000,
  })

  const { data: latestUnread } = useQuery({
    queryKey: ["latestUnreadMsg"],
    queryFn: () => getLatestUnreadMessage(),
    refetchInterval: 3000,
    enabled: unreadCount > 0,
  })

  const { data: unreadNotifCount = 0 } = useQuery({
    queryKey: ["unreadNotifCount"],
    queryFn: () => getUnreadNotificationCount(),
    refetchInterval: 5000,
  })

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(),
    refetchInterval: 10000,
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

  const profileMutation = useMutation({
    mutationFn: (imageUrl: string) => updateProfileImage(imageUrl),
    onSuccess: () => {
      toast.success("Foto de perfil atualizada!")
      queryClient.invalidateQueries({ queryKey: ["chat-users"] })
      setProfileOpen(false)
    },
    onError: () => toast.error("Erro ao atualizar foto"),
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
      unreadCount > prevChatCountRef.current &&
      prevChatCountRef.current > 0 &&
      !isOnChatPage &&
      latestUnread &&
      latestUnread.id !== lastSeenChatMsgIdRef.current
    ) {
      playNotifSound()
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(`💬 ${latestUnread.senderName}`, {
          body: latestUnread.content.slice(0, 100) || "Enviou um arquivo",
          icon: "/root/logo.png",
        })
      }
      lastSeenChatMsgIdRef.current = latestUnread.id
    }
    prevChatCountRef.current = unreadCount
  }, [unreadCount, latestUnread, pathname, playNotifSound])

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])

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

  const handlePhotoFileSelect = (file: File) => {
    setPhotoFile(file)
    const url = URL.createObjectURL(file)
    setPhotoSrc(url)
  }

  const handlePhotoRemove = () => {
    setPhotoFile(null)
    setPhotoSrc(null)
    setPhotoPosition("50% 50%")
  }

  const handleSavePhoto = async () => {
    if (!photoFile) {
      if (!photoSrc) {
        profileMutation.mutate("")
      }
      return
    }
    setUploadingPhoto(true)
    try {
      const result = await uploadFile(photoFile, "avatars")
      profileMutation.mutate(result.url)
    } catch {
      toast.error("Erro ao fazer upload da foto")
    } finally {
      setUploadingPhoto(false)
    }
  }

  const openProfileModal = () => {
    setPhotoSrc(avatar || null)
    setPhotoFile(null)
    setPhotoPosition("50% 50%")
    setProfileOpen(true)
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="w-16 h-full bg-blue-800 flex flex-col items-center justify-between py-4">
        {/* Top */}
        <div className="flex flex-col items-center gap-1">
          {/* Logo */}
          <div className="w-9 h-9 relative mb-4">
            <Image src="/root/logo.png" alt="Logo" fill className="object-contain brightness-0 invert" />
          </div>

          {/* Nav */}
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.path === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.path)
            const showBadge = item.label === "Chat" && unreadCount > 0
            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.path}
                    className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      isActive
                        ? "bg-white/20 shadow-sm"
                        : "bg-transparent hover:bg-white/10"
                    }`}
                  >
                    <Icon size={18} className={isActive ? "text-white" : "text-white/50"} strokeWidth={isActive ? 2 : 1.5} />
                    {showBadge && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {/* Bottom */}
        <div className="flex flex-col items-center gap-1">
          {/* Notifications Bell */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer relative"
                >
                  <Bell size={18} className="text-white/50" strokeWidth={1.5} />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none animate-pulse">
                      {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>Notificações</TooltipContent>
            </Tooltip>
            {notifOpen && (
              <div className="absolute left-14 bottom-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">Notificações</p>
                  {unreadNotifCount > 0 && (
                    <button onClick={() => markAllReadMut.mutate()} className="text-[10px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer">
                      <CheckCheck size={10} /> Marcar todas como lidas
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                      <Bell size={20} className="mb-1.5 text-gray-300" />
                      <p className="text-xs">Nenhuma notificação</p>
                    </div>
                  ) : (
                    notifications.map((n: { id: string; title: string; message: string; link: string | null; read: boolean; createdAt: string }) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          if (!n.read) markReadMut.mutate(n.id)
                          if (n.link) { router.push(n.link); setNotifOpen(false) }
                        }}
                        className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!n.read ? "bg-blue-50/50" : ""}`}
                      >
                        <p className={`text-xs ${!n.read ? "font-semibold text-gray-900" : "text-gray-600"}`}>{n.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{n.message}</p>
                        <p className="text-[9px] text-gray-300 mt-1">{new Date(n.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer relative">
                <Avatar className="size-8 ring-2 ring-white/20">
                  <AvatarImage src={avatar} alt={name} />
                  <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
                    {name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Circle
                  size={10}
                  className={`absolute bottom-1 right-1 ${isOnline ? "fill-emerald-400 text-emerald-400" : "fill-gray-400 text-gray-400"}`}
                  strokeWidth={2}
                  stroke="#1e3a5f"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-52">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                <p className="text-[10px] text-gray-400 capitalize">{role.toLowerCase()}</p>
              </div>
              <DropdownMenuItem onClick={toggleOnline} className="gap-2 text-sm cursor-pointer" disabled={isPending}>
                {isOnline ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-gray-400" />}
                {isOnline ? "Ficar offline" : "Ficar online"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openProfileModal} className="gap-2 text-sm cursor-pointer">
                <Camera size={14} />
                Foto de perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-sm cursor-pointer">
                <Settings size={14} />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="gap-2 text-sm text-red-500 focus:text-red-500 cursor-pointer">
                <LogOut size={14} />
                Deslogar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {/* Profile Photo Modal */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Foto de Perfil</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <div className="mx-auto w-48">
              <ImagePositioner
                src={photoSrc}
                position={photoPosition}
                onPositionChange={setPhotoPosition}
                onFileSelect={handlePhotoFileSelect}
                onRemove={handlePhotoRemove}
                aspectClass="aspect-square"
                label="Foto"
                rounded
              />
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <p className="text-[11px] text-gray-400">Arraste para reposicionar</p>
              <Button
                onClick={handleSavePhoto}
                disabled={uploadingPhoto || profileMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-9 px-4 rounded-lg"
              >
                {(uploadingPhoto || profileMutation.isPending) ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}