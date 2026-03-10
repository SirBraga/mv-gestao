"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CalendarDays, Sparkles } from "lucide-react"

interface DashboardTopbarProps {
  avatar: string
  name: string
  role: string
}

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Central de Operações",
    subtitle: "Visual refinado para acompanhar tudo com mais clareza e velocidade.",
  },
  "/dashboard/clientes": {
    title: "Clientes",
    subtitle: "Gestão completa da sua base com foco em leitura rápida e organização.",
  },
  "/dashboard/contabilidade": {
    title: "Contabilidade",
    subtitle: "Acompanhe escritórios, vínculos e operações com mais contexto visual.",
  },
  "/dashboard/produtos": {
    title: "Produtos",
    subtitle: "Controle catálogo, licenças e status em uma área mais elegante e objetiva.",
  },
  "/dashboard/tickets": {
    title: "Tickets",
    subtitle: "Monitore atendimentos e prioridades com uma leitura mais executiva.",
  },
  "/dashboard/funcionarios": {
    title: "Funcionários",
    subtitle: "Tenha visibilidade da equipe e das operações em um topo mais premium.",
  },
  "/dashboard/chat": {
    title: "Chat",
    subtitle: "Comunicação centralizada com um header mais limpo e consistente.",
  },
  "/dashboard/base-conhecimento": {
    title: "Base de Conhecimento",
    subtitle: "Consulte conteúdos e materiais em uma navegação mais sofisticada.",
  },
}

function getMeta(pathname: string) {
  if (TITLES[pathname]) return TITLES[pathname]

  if (pathname.startsWith("/dashboard/clientes/")) {
    return { title: "Detalhes do Cliente", subtitle: "Visualize dados, histórico e ações do cliente com melhor hierarquia." }
  }

  if (pathname.startsWith("/dashboard/contabilidade/")) {
    return { title: "Detalhes da Contabilidade", subtitle: "Gerencie informações, vínculos e ações desta contabilidade com mais clareza." }
  }

  if (pathname.startsWith("/dashboard/produtos/")) {
    return { title: "Detalhes do Produto", subtitle: "Acompanhe status, dados e ações do produto em um layout mais refinado." }
  }

  if (pathname.startsWith("/dashboard/tickets/")) {
    return { title: "Detalhes do Ticket", subtitle: "Contexto rápido para atendimento, histórico e resolução." }
  }

  return { title: "MV Desk", subtitle: "Uma camada visual mais premium para o seu sistema." }
}

export default function DashboardTopbar({ avatar, name, role }: DashboardTopbarProps) {
  const pathname = usePathname()
  const meta = useMemo(() => getMeta(pathname), [pathname])
  const today = useMemo(
    () => new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date()),
    []
  )

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl supports-backdrop-filter:bg-white/70">
      <div className="px-6 py-4 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_10px_30px_rgba(15,23,42,0.06)]">
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-indigo-400/70 to-transparent" />
          <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
                <Sparkles size={12} />
                MV Desk
              </span>
              <h1 className="mt-3 truncate text-xl font-semibold tracking-tight text-slate-950 lg:text-2xl">{meta.title}</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">{meta.subtitle}</p>
            </div>

            <div className="flex flex-col gap-3 lg:w-85 lg:shrink-0">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 py-3 shadow-sm">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Hoje</p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                    <CalendarDays size={14} className="text-indigo-500" />
                    <span className="truncate capitalize">{today}</span>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  Online
                </span>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-slate-950 px-3.5 py-3 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
                <Avatar className="h-11 w-11 shrink-0 ring-2 ring-white/10">
                  <AvatarImage src={avatar} alt={name} />
                  <AvatarFallback className="bg-indigo-500 text-white font-semibold">
                    {name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{role}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-200">
                  Workspace ativo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
