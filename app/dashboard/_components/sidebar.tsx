"use client"

import Image from "next/image"
import { Home, Users, Ticket, Calculator, Package, LogOut, Settings } from "lucide-react"
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
  { label: "Início", path: "/dashboard", icon: Home, color: "bg-emerald-500" },
  { label: "Clientes", path: "/dashboard/clientes", icon: Users, color: "bg-sky-500" },
  { label: "Tickets", path: "/dashboard/tickets", icon: Ticket, color: "bg-amber-500" },
  { label: "Contabilidade", path: "/dashboard/contabilidade", icon: Calculator, color: "bg-violet-500" },
  { label: "Produtos", path: "/dashboard/produtos", icon: Package, color: "bg-rose-500" },
]

interface SidebarProps {
    avatar: string;
    name: string
}

export default function Sidebar({ avatar, name }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await authClient.signOut({})
    router.push("/")
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="w-16 h-full bg-blue-600 flex flex-col items-center justify-between py-4">
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
            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.path}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      isActive
                        ? "bg-white/20 shadow-sm"
                        : "bg-transparent hover:bg-white/10"
                    }`}
                  >
                    <Icon size={18} className={isActive ? "text-white" : "text-white/50"} strokeWidth={isActive ? 2 : 1.5} />
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
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer"
              >
                <LogOut size={18} className="text-white/50" strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Sair
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer">
                <Avatar className="size-8 ring-2 ring-white/20">
                  <AvatarImage src={avatar} alt={name} />
                  <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
                    {name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-48">
              <DropdownMenuItem className="gap-2 text-sm">
                <Settings size={14} />
                Ver perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="gap-2 text-sm text-red-500 focus:text-red-500">
                <LogOut size={14} />
                Deslogar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  )
}