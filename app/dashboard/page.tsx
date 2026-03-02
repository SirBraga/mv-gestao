"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getDashboardStats } from "@/app/actions/dashboard"
import { Users, Ticket, Package, Calculator, ArrowRight, Activity, Zap, Calendar, Building2, User, Loader2 } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

function getInitials(name: string) { return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() }

type PeriodType = "day" | "week" | "month" | "custom"
type ViewMode = "mine" | "company"

const PERIOD_OPTIONS = [
    { key: "day" as PeriodType, label: "Hoje" },
    { key: "week" as PeriodType, label: "Semana" },
    { key: "month" as PeriodType, label: "Mês" },
    { key: "custom" as PeriodType, label: "Personalizado" },
]

const statusTag: Record<string, string> = { NOVO: "bg-sky-500", PENDING_CLIENT: "bg-amber-500", PENDING_EMPRESS: "bg-violet-500", IN_PROGRESS: "bg-orange-500", CLOSED: "bg-gray-400" }
const statusLabel: Record<string, string> = { NOVO: "Novo", PENDING_CLIENT: "Pend. Cliente", PENDING_EMPRESS: "Pend. Empresa", IN_PROGRESS: "Em Progresso", CLOSED: "Fechado" }
const priorityTag: Record<string, string> = { LOW: "bg-emerald-500", MEDIUM: "bg-amber-500", HIGH: "bg-red-500" }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2">
      <p className="text-[10px] font-bold text-gray-500 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-600">{p.dataKey === "abertos" ? "Abertos" : "Resolvidos"}</span>
          <span className="font-bold text-gray-900 ml-auto">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [period, setPeriod] = useState<PeriodType>("week")
  const [viewMode, setViewMode] = useState<ViewMode>("mine")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", viewMode, period, customStart, customEnd],
    queryFn: () => getDashboardStats(viewMode, period, customStart || undefined, customEnd || undefined),
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
  const topClients = data?.topClients || []
  const weeklyData = data?.weeklyData || []
  const monthlyData = data?.monthlyData || []
  const activity = data?.activity || []

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50">
      <div className="p-6 max-w-350">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {viewMode === "mine" ? `Relatórios de ${userName}` : "Visão geral da empresa"}
              {period === "day" && " — Hoje"}
              {period === "week" && " — Últimos 7 dias"}
              {period === "month" && " — Últimos 30 dias"}
              {period === "custom" && customStart && customEnd && ` — ${customStart} a ${customEnd}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle (admin only) */}
            {isAdmin && (
              <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => setViewMode("mine")} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${viewMode === "mine" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                  <User size={12} /> Meus
                </button>
                <button onClick={() => setViewMode("company")} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${viewMode === "company" ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                  <Building2 size={12} /> Empresa
                </button>
              </div>
            )}

            {/* Period Filter */}
            <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
              {PERIOD_OPTIONS.map((opt) => (
                <button key={opt.key} onClick={() => setPeriod(opt.key)} className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${period === opt.key ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range */}
            {period === "custom" && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1">
                  <Calendar size={12} className="text-gray-400" />
                  <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="border-0 h-6 text-xs p-0 w-28 shadow-none focus-visible:ring-0" />
                </div>
                <span className="text-xs text-gray-400">até</span>
                <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1">
                  <Calendar size={12} className="text-gray-400" />
                  <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="border-0 h-6 text-xs p-0 w-28 shadow-none focus-visible:ring-0" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stat Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 mb-6">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Link key={stat.label} href={stat.href} className="group bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg ${stat.lightColor} flex items-center justify-center`}>
                    <Icon size={16} className={stat.textColor} strokeWidth={2} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
              </Link>
            )
          })}
        </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">

          {/* Weekly Chart — Recharts Area */}
          <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  {period === "day" ? "Tickets de Hoje" : period === "week" ? "Tickets da Semana" : period === "month" ? "Tickets do Mês" : "Tickets do Período"}
                </h2>
                <p className="text-[10px] text-gray-400 mt-0.5">{viewMode === "mine" ? `Seus tickets — ` : "Todos os tickets — "}Abertos vs Resolvidos</p>
              </div>
            </div>
            <div className="h-52 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradAbertos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradResolvidos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={(v: string) => v === "abertos" ? "Abertos" : "Resolvidos"} />
                  <Area type="monotone" dataKey="abertos" stroke="#0ea5e9" strokeWidth={2} fill="url(#gradAbertos)" dot={{ r: 3, fill: "#0ea5e9", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#0ea5e9" }} />
                  <Area type="monotone" dataKey="resolvidos" stroke="#10b981" strokeWidth={2} fill="url(#gradResolvidos)" dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#10b981" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Clients */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">Top Clientes</h2>
              <Link href="/dashboard/clientes" className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                Ver todos <ArrowRight size={10} />
              </Link>
            </div>
            <div className="space-y-2.5">
              {topClients.map((client: { name: string; tickets: number; products: number }, i: number) => (
                <div key={client.name} className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-300 w-4 text-right font-mono">{i + 1}</span>
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className={`text-[10px] font-bold text-white bg-blue-600`}>
                      {getInitials(client.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
                    <p className="text-[10px] text-gray-400">{client.tickets} tickets · {client.products} produtos</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Evolução Mensal</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">{viewMode === "mine" ? "Seus dados" : "Dados da empresa"} — Últimos 6 meses</p>
            </div>
          </div>
          <div className="h-48 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradAbertosM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradResolvidosM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} formatter={(v: string) => v === "abertos" ? "Abertos" : "Resolvidos"} />
                <Area type="monotone" dataKey="abertos" stroke="#f59e0b" strokeWidth={2} fill="url(#gradAbertosM)" dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#f59e0b" }} />
                <Area type="monotone" dataKey="resolvidos" stroke="#10b981" strokeWidth={2} fill="url(#gradResolvidosM)" dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#10b981" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-5 gap-4">

          {/* Recent Tickets */}
          <div className="col-span-3 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Tickets Recentes</h2>
              <Link href="/dashboard/tickets" className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                Ver todos <ArrowRight size={10} />
              </Link>
            </div>
            {recentTickets.map((ticket: { id: string; title: string; client: string; status: string; priority: string; date: string }) => (
              <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityTag[ticket.priority] || "bg-gray-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{ticket.title}</p>
                  <p className="text-[10px] text-gray-400">{ticket.client}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0 ${statusTag[ticket.status] || "bg-gray-400"}`}>
                  {statusLabel[ticket.status] || ticket.status}
                </span>
                <span className="text-[10px] text-gray-400 shrink-0 w-20 text-right">{new Date(ticket.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
              </Link>
            ))}
          </div>

          {/* Activity Feed */}
          <div className="col-span-2 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
              <Activity size={14} className="text-gray-400" />
              <h2 className="text-sm font-bold text-gray-900">Atividade Recente</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {activity.map((item: { id: string; description: string; clientName: string; assignedTo: string | null; status: string | null; updatedAt: string }, i: number) => (
                  <div key={item.id + i} className="flex gap-3 px-5 py-2.5">
                    <div className="mt-0.5 shrink-0">
                      <Zap size={14} className="text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {item.assignedTo && <span className="font-semibold text-gray-900">{item.assignedTo} </span>}
                        <span className="font-medium text-gray-700">{item.description}</span>
                        <span className="text-gray-400"> — {item.clientName}</span>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(item.updatedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
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