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
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
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

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3">
      <p className="text-xs font-semibold text-slate-900 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2.5 text-sm py-0.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-600">{p.dataKey === "abertos" ? "Abertos" : "Resolvidos"}</span>
          <span className="font-bold text-slate-900 ml-auto">{p.value}</span>
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
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-8 max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              {viewMode === "mine" ? `Olá, ${userName}` : "Visão geral da empresa"}
              {period === "day" && " • Dados de hoje"}
              {period === "week" && " • Últimos 7 dias"}
              {period === "month" && " • Últimos 30 dias"}
              {period === "custom" && customStart && customEnd && ` • ${customStart} a ${customEnd}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle (admin only) */}
            {isAdmin && (
              <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <button onClick={() => setViewMode("mine")} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${viewMode === "mine" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                  <User size={14} /> Meus dados
                </button>
                <button onClick={() => setViewMode("company")} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${viewMode === "company" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                  <Building2 size={14} /> Empresa
                </button>
              </div>
            )}

            {/* Period Filter */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              {PERIOD_OPTIONS.map((opt) => (
                <button key={opt.key} onClick={() => setPeriod(opt.key)} className={`px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${period === opt.key ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range */}
            {period === "custom" && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                  <Calendar size={14} className="text-slate-400" />
                  <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="border-0 h-6 text-sm p-0 w-32 shadow-none focus-visible:ring-0" />
                </div>
                <span className="text-sm text-slate-400 font-medium">até</span>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                  <Calendar size={14} className="text-slate-400" />
                  <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="border-0 h-6 text-sm p-0 w-32 shadow-none focus-visible:ring-0" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stat Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 mb-8">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="animate-spin text-indigo-600" />
              <p className="text-sm text-slate-500">Carregando dados...</p>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-4 gap-5 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Link key={stat.label} href={stat.href} className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-slate-200 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden">
                {/* Decorative gradient */}
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2 ${stat.lightColor}`} />
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl ${stat.lightColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon size={22} className={stat.textColor} strokeWidth={1.5} />
                    </div>
                    <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
                  <p className="text-sm text-slate-500 mt-1 font-medium">{stat.label}</p>
                </div>
              </Link>
            )
          })}
        </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-3 gap-6 mb-8">

          {/* Weekly Chart — Recharts Area */}
          <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <TrendingUp size={18} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {period === "day" ? "Tickets de Hoje" : period === "week" ? "Tickets da Semana" : period === "month" ? "Tickets do Mês" : "Tickets do Período"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">{viewMode === "mine" ? "Seus tickets" : "Todos os tickets"} • Abertos vs Resolvidos</p>
                </div>
              </div>
            </div>
            <div className="h-64">
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 16 }} formatter={(v: string) => v === "abertos" ? "Abertos" : "Resolvidos"} />
                  <Area type="monotone" dataKey="abertos" stroke="#4f46e5" strokeWidth={2.5} fill="url(#gradAbertos)" dot={{ r: 4, fill: "#4f46e5", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#4f46e5", stroke: "#fff", strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="resolvidos" stroke="#10b981" strokeWidth={2.5} fill="url(#gradResolvidos)" dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Clients */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Users size={18} className="text-emerald-600" />
                </div>
                <h2 className="text-base font-semibold text-slate-900">Top Clientes</h2>
              </div>
              <Link href="/dashboard/clientes" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 group">
                Ver todos <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <div className="space-y-3">
              {topClients.map((client: { name: string; tickets: number; products: number }, i: number) => (
                <div key={client.name} className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
                  }`}>{i + 1}</span>
                  <Avatar className="h-9 w-9 shrink-0 ring-2 ring-white shadow-sm">
                    <AvatarFallback className="text-xs font-semibold text-white bg-gradient-to-br from-indigo-500 to-purple-600">
                      {getInitials(client.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{client.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{client.tickets} tickets • {client.products} produtos</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Calendar size={18} className="text-amber-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Evolução Mensal</h2>
                <p className="text-xs text-slate-500 mt-0.5">{viewMode === "mine" ? "Seus dados" : "Dados da empresa"} • Últimos 6 meses</p>
              </div>
            </div>
          </div>
          <div className="h-56">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 16 }} formatter={(v: string) => v === "abertos" ? "Abertos" : "Resolvidos"} />
                <Area type="monotone" dataKey="abertos" stroke="#f59e0b" strokeWidth={2.5} fill="url(#gradAbertosM)" dot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#f59e0b", stroke: "#fff", strokeWidth: 2 }} />
                <Area type="monotone" dataKey="resolvidos" stroke="#10b981" strokeWidth={2.5} fill="url(#gradResolvidosM)" dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-5 gap-6">

          {/* Recent Tickets */}
          <div className="col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Ticket size={16} className="text-blue-600" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">Tickets Recentes</h2>
              </div>
              <Link href="/dashboard/tickets" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 group">
                Ver todos <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            {recentTickets.map((ticket: { id: string; title: string; client: string; status: string; priority: string; date: string }) => {
              const status = statusConfig[ticket.status] || { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" }
              const priority = priorityConfig[ticket.priority] || { color: "text-slate-400", label: "" }
              return (
                <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} className="flex items-center gap-4 px-5 py-3 border-b border-slate-50 last:border-b-0 hover:bg-slate-50/50 transition-colors group">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${priority.color.replace('text-', 'bg-')}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{ticket.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{ticket.client}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 ${status.bg} ${status.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {statusLabel[ticket.status] || ticket.status}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0 w-20 text-right font-medium">{new Date(ticket.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                </Link>
              )
            })}
          </div>

          {/* Activity Feed */}
          <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Activity size={16} className="text-indigo-600" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">Atividade Recente</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {activity.map((item: { id: string; description: string; clientName: string; assignedTo: string | null; status: string | null; updatedAt: string }, i: number) => (
                  <div key={item.id + i} className="flex gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors">
                    <div className="mt-0.5 shrink-0">
                      <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                        <TrendingUp size={12} className="text-amber-600" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {item.assignedTo && <span className="font-semibold text-slate-900">{item.assignedTo} </span>}
                        <span>{item.description}</span>
                        <span className="text-slate-400"> — {item.clientName}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
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