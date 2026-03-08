"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getDashboardStats } from "@/app/actions/dashboard"
import { 
  Users, 
  Ticket, 
  Package, 
  Calculator, 
  ArrowRight, 
  Activity, 
  TrendingUp, 
  Calendar, 
  Building2, 
  User, 
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

function getInitials(name: string) { return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() }

type PeriodType = "day" | "week" | "month"
type ViewMode = "mine" | "company"

const PERIOD_OPTIONS = [
    { key: "day" as PeriodType, label: "Hoje" },
    { key: "week" as PeriodType, label: "Semana" },
    { key: "month" as PeriodType, label: "Mês" },
]

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = { 
  NOVO: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  PENDING_CLIENT: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  PENDING_EMPRESS: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  IN_PROGRESS: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  CLOSED: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" }
}
const statusLabel: Record<string, string> = { NOVO: "Novo", PENDING_CLIENT: "Pend. Cliente", PENDING_EMPRESS: "Pend. Empresa", IN_PROGRESS: "Em Progresso", CLOSED: "Fechado" }
const priorityConfig: Record<string, { color: string; label: string }> = { 
  LOW: { color: "text-emerald-500", label: "Baixa" },
  MEDIUM: { color: "text-amber-500", label: "Média" },
  HIGH: { color: "text-red-500", label: "Alta" }
}

const chartSeriesMeta = {
  abertos: {
    label: "Abertos",
    stroke: "#4f46e5",
    surface: "bg-indigo-50 text-indigo-700 border-indigo-100",
  },
  resolvidos: {
    label: "Resolvidos",
    stroke: "#10b981",
    surface: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
} as const

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload) return null
  return (
    <div className="min-w-45 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-sm">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-3 py-1.5 text-sm">
          <span className="h-2.5 w-2.5 rounded-full ring-4 ring-slate-50" style={{ backgroundColor: p.color }} />
          <span className="text-slate-600">{p.dataKey === "abertos" ? "Abertos" : "Resolvidos"}</span>
          <span className="ml-auto text-base font-bold tracking-tight text-slate-900">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function DashboardLoadingState() {
  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="mx-auto max-w-[1600px] p-8">
        <div className="mb-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="bg-linear-to-r from-indigo-50 via-white to-sky-50 px-8 py-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-3">
                <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
                <div className="h-10 w-72 animate-pulse rounded-2xl bg-slate-200" />
                <div className="h-4 w-96 max-w-full animate-pulse rounded-full bg-slate-100" />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="h-11 w-44 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />
                <div className="h-11 w-64 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-4 w-8 animate-pulse rounded-full bg-slate-100" />
              </div>
              <div className="space-y-3">
                <div className="h-8 w-20 animate-pulse rounded-xl bg-slate-200" />
                <div className="h-4 w-28 animate-pulse rounded-full bg-slate-100" />
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
              <div className="space-y-2">
                <div className="h-4 w-36 animate-pulse rounded-full bg-slate-200" />
                <div className="h-3 w-48 animate-pulse rounded-full bg-slate-100" />
              </div>
            </div>
            <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-3 w-24 animate-pulse rounded-full bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
            <div className="space-y-2">
              <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
              <div className="h-3 w-52 animate-pulse rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
            </div>
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-56 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-3 w-24 animate-pulse rounded-full bg-slate-100" />
                  </div>
                  <div className="h-6 w-24 animate-pulse rounded-lg bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
          <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="h-4 w-36 animate-pulse rounded-full bg-slate-200" />
            </div>
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex gap-3 px-5 py-4">
                  <div className="h-6 w-6 animate-pulse rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-full animate-pulse rounded-full bg-slate-200" />
                    <div className="h-3 w-28 animate-pulse rounded-full bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [period, setPeriod] = useState<PeriodType>("week")
  const [viewMode, setViewMode] = useState<ViewMode>("mine")

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", viewMode, period],
    queryFn: () => getDashboardStats(viewMode, period),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  })

  const isAdmin = true
  const userName = data?.userName || ""
  const stats = [
    { label: "Clientes", value: String(data?.stats.totalClients || 0), icon: Users, lightColor: "bg-sky-50", textColor: "text-sky-600", href: "/dashboard/clientes" },
    { label: "Tickets Abertos", value: String(data?.stats.openTickets || 0), icon: Ticket, lightColor: "bg-amber-50", textColor: "text-amber-600", href: "/dashboard/tickets" },
    { label: "Produtos", value: String(data?.stats.totalProducts || 0), icon: Package, lightColor: "bg-rose-50", textColor: "text-rose-600", href: "/dashboard/produtos" },
    { label: "Escritórios", value: String(data?.stats.totalContabilities || 0), icon: Calculator, lightColor: "bg-violet-50", textColor: "text-violet-600", href: "/dashboard/contabilidade" },
  ]
  const recentTickets = data?.recentTickets || []
  const weeklyData = data?.weeklyData || []
  const monthlyData = data?.monthlyData || []
  const activity = data?.activity || []
  const openedInPeriod = data?.ticketsOpenedInPeriod || 0
  const closedInPeriod = data?.ticketsClosedInPeriod || 0
  const resolutionRate = openedInPeriod > 0 ? Math.round((closedInPeriod / openedInPeriod) * 100) : 0
  const primaryChartTitle = period === "day" ? "Tickets de Hoje" : period === "week" ? "Tickets da Semana" : "Tickets do Mês"
  const secondaryChartTitle = period === "day" ? "Evolução do Dia" : period === "week" ? "Evolução da Semana" : "Evolução do Mês"
  const secondaryChartSubtitle = period === "day" ? "Faixas de 6 horas" : period === "week" ? "Blocos do período" : "Últimos 30 dias"
  const headerHighlights = [
    { label: "Abertos", value: String(openedInPeriod), icon: AlertCircle, tone: "bg-amber-50 text-amber-700" },
    { label: "Resolvidos", value: String(closedInPeriod), icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Resolução", value: `${resolutionRate}%`, icon: Activity, tone: "bg-indigo-50 text-indigo-700" },
  ]

  if (isLoading) return <div className="min-h-screen bg-slate-50" />

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="mx-auto max-w-[1600px] p-8">
        <div className="mb-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-stretch">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Activity size={12} />
                Dashboard operacional
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{viewMode === "mine" ? `Olá, ${userName || "equipe"}` : "Visão geral da empresa"}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                {period === "day" && "Recorte de hoje."}
                {period === "week" && "Recorte dos últimos 7 dias."}
                {period === "month" && "Recorte dos últimos 30 dias."}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {headerHighlights.map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{item.label}</p>
                        <p className="text-lg font-bold tracking-tight text-slate-900">{item.value}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 h-full">
              <div className="flex h-full flex-col justify-between gap-4">
                {isAdmin && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-slate-500">Escopo</p>
                    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
                      <button onClick={() => setViewMode("mine")} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all cursor-pointer ${viewMode === "mine" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
                        <User size={14} /> Meus dados
                      </button>
                      <button onClick={() => setViewMode("company")} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all cursor-pointer ${viewMode === "company" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
                        <Building2 size={14} /> Empresa
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs font-medium text-slate-500">Período</p>
                  <Select value={period} onValueChange={(value) => setPeriod(value as PeriodType)}>
                    <SelectTrigger className="h-11 w-full rounded-2xl border-slate-200 bg-white text-sm text-slate-700 shadow-sm">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {viewMode === "company" && (
          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <Link key={stat.label} href={stat.href} className="group rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                  <div className="mb-3 flex items-center justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${stat.lightColor} ring-1 ring-black/5`}>
                      <Icon size={18} className={stat.textColor} strokeWidth={1.7} />
                    </div>
                    <ArrowRight size={15} className="text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-indigo-500" />
                  </div>
                  <p className="text-2xl font-bold tracking-tight text-slate-900">{stat.value}</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-500">{stat.label}</p>
                </Link>
              )
            })}
          </div>
        )}

        <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100">
                  <TrendingUp size={18} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{primaryChartTitle}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Abertos vs resolvidos</p>
                </div>
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${chartSeriesMeta.abertos.surface}`}>
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  {chartSeriesMeta.abertos.label}
                </div>
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${chartSeriesMeta.resolvidos.surface}`}>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {chartSeriesMeta.resolvidos.label}
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-linear-to-b from-slate-50 to-white p-3">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradAbertos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradResolvidos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={8} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={0} content={() => null} />
                    <Area type="monotone" dataKey="abertos" stroke="#4f46e5" strokeWidth={2.5} fill="url(#gradAbertos)" dot={{ r: 4, fill: "#4f46e5", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#4f46e5", stroke: "#fff", strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="resolvidos" stroke="#10b981" strokeWidth={2.5} fill="url(#gradResolvidos)" dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-100">
                  <Calendar size={18} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{secondaryChartTitle}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{secondaryChartSubtitle}</p>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-linear-to-b from-slate-50 to-white p-3">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradAbertosM" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradResolvidosM" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={8} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="top" height={0} content={() => null} />
                      <Area type="monotone" dataKey="abertos" stroke="#f59e0b" strokeWidth={2.5} fill="url(#gradAbertosM)" dot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#f59e0b", stroke: "#fff", strokeWidth: 2 }} />
                      <Area type="monotone" dataKey="resolvidos" stroke="#10b981" strokeWidth={2.5} fill="url(#gradResolvidosM)" dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 ring-1 ring-blue-100">
                  <Ticket size={16} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Tickets Recentes</h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">Últimos tickets no período</p>
                </div>
              </div>
              <Link href="/dashboard/tickets" className="group flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                Ver todos <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {recentTickets.map((ticket: { id: number; title: string; client: string; status: string; priority: string; date: string }) => {
                const status = statusConfig[ticket.status] || { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" }
                const priority = priorityConfig[ticket.priority] || { color: "text-slate-400", label: "" }
                return (
                  <Link key={`${ticket.id}-${ticket.date}-${ticket.status}`} href={`/dashboard/tickets/${ticket.id}`} className="group flex min-h-[68px] items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/50">
                    <div className="shrink-0">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full ${status.bg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${priority.color.replace("text-", "bg-")}`} />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm leading-relaxed font-medium text-slate-900 transition-colors group-hover:text-indigo-600">{ticket.title}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <span>{ticket.client}</span>
                        <span>•</span>
                        <span>{new Date(ticket.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                      </div>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                      {statusLabel[ticket.status] || ticket.status}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 ring-1 ring-indigo-100">
                <Activity size={16} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Atividade Recente</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">Movimentos mais recentes</p>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {activity.map((item: { id: number; description: string; clientName: string; assignedTo: string | null; status: string | null; updatedAt: string }, i: number) => (
                <div key={`${item.id}-${item.updatedAt}-${i}`} className="flex min-h-[68px] items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/50">
                  <div className="shrink-0">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100">
                      <TrendingUp size={12} className="text-amber-600" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-700">
                      {item.assignedTo && <span className="font-semibold text-slate-900">{item.assignedTo} </span>}
                      <span>{item.description}</span>
                      <span className="text-slate-400"> — {item.clientName}</span>
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      <Clock size={10} />
                      {new Date(item.updatedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}