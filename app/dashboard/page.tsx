"use client"

import { Users, Ticket, Package, Calculator, TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, ArrowRight, Activity, Zap } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

function getInitials(name: string) { return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() }

const stats = [
  { label: "Clientes", value: "47", change: "+3", trend: "up" as const, icon: Users, lightColor: "bg-sky-50", textColor: "text-sky-600", href: "/dashboard/clientes" },
  { label: "Tickets Abertos", value: "12", change: "-2", trend: "down" as const, icon: Ticket, lightColor: "bg-amber-50", textColor: "text-amber-600", href: "/dashboard/tickets" },
  { label: "Produtos", value: "8", change: "+1", trend: "up" as const, icon: Package, lightColor: "bg-rose-50", textColor: "text-rose-600", href: "/dashboard/produtos" },
  { label: "Escritórios", value: "7", change: "0", trend: "up" as const, icon: Calculator, lightColor: "bg-violet-50", textColor: "text-violet-600", href: "/dashboard/contabilidade" },
]

const recentTickets = [
  { id: "t001", title: "Erro ao gerar relatório fiscal", client: "Empresa ABC Ltda", status: "NOVO", priority: "HIGH", date: "Hoje, 14:32" },
  { id: "t002", title: "Dúvida sobre módulo de estoque", client: "Tech Solutions ME", status: "IN_PROGRESS", priority: "MEDIUM", date: "Hoje, 11:15" },
  { id: "t003", title: "Solicitação de nova funcionalidade", client: "Distribuidora Norte Ltda", status: "PENDING_CLIENT", priority: "LOW", date: "Ontem, 18:40" },
  { id: "t004", title: "Problema na emissão de NF-e", client: "Logística Express SA", status: "NOVO", priority: "HIGH", date: "Ontem, 09:22" },
  { id: "t005", title: "Treinamento do módulo financeiro", client: "Carlos Mendes", status: "IN_PROGRESS", priority: "MEDIUM", date: "22/02" },
]

const statusTag: Record<string, string> = { NOVO: "bg-sky-500", PENDING_CLIENT: "bg-amber-500", IN_PROGRESS: "bg-orange-500", CLOSED: "bg-gray-400" }
const statusLabel: Record<string, string> = { NOVO: "Novo", PENDING_CLIENT: "Pend. Cliente", IN_PROGRESS: "Em Progresso", CLOSED: "Fechado" }
const priorityTag: Record<string, string> = { LOW: "bg-emerald-500", MEDIUM: "bg-amber-500", HIGH: "bg-red-500" }

const activityFeed = [
  { user: "Pedro Braga", action: "assumiu o ticket", target: "#t001 — Erro ao gerar relatório fiscal", time: "5 min atrás", icon: Zap, iconColor: "text-amber-500" },
  { user: "Ana Costa", action: "fechou o ticket", target: "#t009 — Configuração de backup automático", time: "23 min atrás", icon: CheckCircle, iconColor: "text-emerald-500" },
  { user: "Carlos Silva", action: "adicionou apontamento em", target: "#t002 — Dúvida sobre módulo de estoque", time: "1h atrás", icon: Clock, iconColor: "text-sky-500" },
  { user: "Pedro Braga", action: "criou novo cliente", target: "Logística Express SA", time: "2h atrás", icon: Users, iconColor: "text-violet-500" },
  { user: "Ana Costa", action: "reabriu o ticket", target: "#t005 — Treinamento do módulo financeiro", time: "3h atrás", icon: AlertTriangle, iconColor: "text-rose-500" },
  { user: "Sistema", action: "certificado expira em 7 dias para", target: "Empresa ABC Ltda", time: "5h atrás", icon: AlertTriangle, iconColor: "text-amber-500" },
]

const topClients = [
  { name: "Empresa ABC Ltda", tickets: 8, products: 3 },
  { name: "Tech Solutions ME", tickets: 5, products: 2 },
  { name: "Distribuidora Norte Ltda", tickets: 4, products: 2 },
  { name: "Logística Express SA", tickets: 3, products: 1 },
  { name: "Carlos Mendes", tickets: 2, products: 1 },
]

const weeklyData = [
  { day: "Seg", abertos: 3, resolvidos: 2 },
  { day: "Ter", abertos: 5, resolvidos: 4 },
  { day: "Qua", abertos: 2, resolvidos: 3 },
  { day: "Qui", abertos: 7, resolvidos: 5 },
  { day: "Sex", abertos: 4, resolvidos: 6 },
  { day: "Sáb", abertos: 1, resolvidos: 2 },
  { day: "Dom", abertos: 0, resolvidos: 1 },
]

const monthlyData = [
  { month: "Set", abertos: 18, resolvidos: 15 },
  { month: "Out", abertos: 24, resolvidos: 20 },
  { month: "Nov", abertos: 20, resolvidos: 22 },
  { month: "Dez", abertos: 28, resolvidos: 25 },
  { month: "Jan", abertos: 22, resolvidos: 24 },
  { month: "Fev", abertos: 19, resolvidos: 17 },
]

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
  return (
    <div className="h-full overflow-y-auto bg-gray-50/50">
      <div className="p-6 max-w-350">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">Visão geral do sistema</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Link key={stat.label} href={stat.href} className="group bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg ${stat.lightColor} flex items-center justify-center`}>
                    <Icon size={16} className={stat.textColor} strokeWidth={2} />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${stat.trend === "up" && stat.change !== "0" ? "text-emerald-600" : stat.change === "0" ? "text-gray-400" : "text-emerald-600"}`}>
                    {stat.change !== "0" && (stat.trend === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />)}
                    <span>{stat.change}</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
              </Link>
            )
          })}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">

          {/* Weekly Chart — Recharts Area */}
          <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Tickets da Semana</h2>
                <p className="text-[10px] text-gray-400 mt-0.5">Abertos vs Resolvidos</p>
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
              {topClients.map((client, i) => (
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
              <p className="text-[10px] text-gray-400 mt-0.5">Últimos 6 meses — tickets abertos vs resolvidos</p>
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
            {recentTickets.map((ticket) => (
              <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`} className="flex items-center gap-3 px-5 py-2.5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityTag[ticket.priority]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{ticket.title}</p>
                  <p className="text-[10px] text-gray-400">{ticket.client}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0 ${statusTag[ticket.status]}`}>
                  {statusLabel[ticket.status]}
                </span>
                <span className="text-[10px] text-gray-400 shrink-0 w-16 text-right">{ticket.date}</span>
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
              {activityFeed.map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={i} className="flex gap-3 px-5 py-2.5">
                    <div className="mt-0.5 shrink-0">
                      <Icon size={14} className={item.iconColor} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-600 leading-relaxed">
                        <span className="font-semibold text-gray-900">{item.user}</span>{" "}
                        {item.action}{" "}
                        <span className="font-medium text-gray-700">{item.target}</span>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.time}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}