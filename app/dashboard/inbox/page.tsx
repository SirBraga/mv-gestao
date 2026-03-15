"use client"

import { useState, useMemo, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Mail,
  Search,
  RefreshCw,
  Paperclip,
  Send,
  Clock,
  User,
  FileText,
  Download,
  Loader2,
  Plus,
  Inbox as InboxIcon,
  Trash2,
  Upload,
  Eye,
  EyeOff,
  Sparkles,
  AtSign,
  Reply,
  Forward,
  ChevronUp,
  ChevronDown,
  MailOpen,
  X,
  MoreVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getProfile } from "@/app/actions/profile"
import { GlobalScreenLoader } from "@/app/components/global-screen-loader"
import { useEmailNotifications } from "@/app/hooks/use-email-notifications"

const EMAIL_SERVICE_URL = process.env.NEXT_PUBLIC_EMAIL_SERVICE_URL || "http://localhost:3010"

interface EmailAttachment {
  id: string
  filename: string
  contentType: string
  size: number
  storageUrl: string | null
}

interface ComposeAttachment {
  id: string
  filename: string
  contentType: string
  size: number
  contentBase64: string
}

interface EmailPreview {
  id: string
  messageId: string
  uid: number
  mailbox: string
  mailboxType?: "inbox" | "sent" | "spam"
  subject: string
  from: string[]
  to: string[]
  cc: string[]
  date: string | null
  receivedAt: string
  hasAttachments: boolean
  isRead: boolean
  readAt: string | null
  readByUserName: string | null
  attachmentCount: number
  preview: string | null
}

interface EmailViewEvent {
  id: string
  viewerId: string | null
  viewerName: string | null
  viewerEmail: string | null
  viewedAt: string
}

interface EmailFull extends EmailPreview {
  bcc: string[]
  replyTo: string[]
  textBody: string | null
  htmlBody: string | null
  attachments: EmailAttachment[]
  metadata: Record<string, unknown>
  readByUserId?: string | null
  readByUserEmail?: string | null
  viewEvents: EmailViewEvent[]
}

interface EmailsResponse {
  emails: EmailPreview[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface BlockedSender {
  id: string
  email: string
  normalizedEmail: string
  reason: string | null
  blockedByUserId: string | null
  blockedByUserName: string | null
  blockedByUserEmail: string | null
  blockedAt: string | null
}

interface DeletedEmail {
  id: string
  mailbox: string
  uid: number
  messageId: string | null
  subject: string | null
  fromAddress: string | null
  deletedByUserId: string | null
  deletedByUserName: string | null
  deletedByUserEmail: string | null
  deletedAt: string | null
}

type InboxView = "inbox" | "sent" | "spam" | "unread" | "read" | "attachments" | "blocked" | "deleted"

type ComposeMode = "new" | "reply" | "forward"

const FILTERS = [
  { key: "inbox" as InboxView, label: "Entrada", icon: InboxIcon },
  { key: "sent" as InboxView, label: "Enviados", icon: Send },
  { key: "spam" as InboxView, label: "Spam", icon: Mail },
  { key: "unread" as InboxView, label: "Não lidos", icon: MailOpen },
  { key: "read" as InboxView, label: "Lidos", icon: Mail },
  { key: "attachments" as InboxView, label: "Com anexos", icon: Paperclip },
  { key: "blocked" as InboxView, label: "Bloqueados", icon: X },
  { key: "deleted" as InboxView, label: "Excluídos", icon: Trash2 },
]

async function fetchEmails(page: number, search: string, activeView: InboxView): Promise<EmailsResponse> {
  const params = new URLSearchParams({ page: String(page), limit: "20" })
  if (search) params.set("search", search)
  if (activeView === "inbox" || activeView === "sent" || activeView === "spam") {
    params.set("mailboxType", activeView)
  }
  
  const res = await fetch(`${EMAIL_SERVICE_URL}/api/emails?${params}`)
  if (!res.ok) throw new Error("Falha ao carregar emails")
  return res.json()
}

async function fetchEmail(id: string): Promise<EmailFull> {
  const res = await fetch(`${EMAIL_SERVICE_URL}/api/emails/${id}`)
  if (!res.ok) throw new Error("Falha ao carregar email")
  return res.json()
}

async function sendEmail(data: {
  to: string[]
  subject: string
  text: string
  html?: string
  cc?: string[]
  bcc?: string[]
  attachments?: ComposeAttachment[]
}): Promise<{ success: boolean; messageId: string }> {
  const res = await fetch(`${EMAIL_SERVICE_URL}/api/emails/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Falha ao enviar email")
  }
  return res.json()
}

async function markEmailRead(id: string, viewer: {
  viewerId?: string
  viewerName?: string
  viewerEmail?: string
}) {
  const res = await fetch(`${EMAIL_SERVICE_URL}/api/emails/${id}/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(viewer),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => null)
    throw new Error(error?.error || "Falha ao marcar email como lido")
  }

  return res.json()
}

async function markEmailUnread(id: string) {
  const res = await fetch(`${EMAIL_SERVICE_URL}/api/emails/${id}/unread`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => null)
    throw new Error(error?.error || "Falha ao marcar email como não lido")
  }

  return res.json()
}

async function deleteEmail(id: string, viewer?: {
  viewerId?: string
  viewerName?: string
  viewerEmail?: string
}) {
  const res = await fetch(`${EMAIL_SERVICE_URL}/api/emails/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(viewer || {}),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => null)
    throw new Error(error?.error || "Falha ao apagar email")
  }

  return res.json() as Promise<{ success: boolean }>
}

async function fetchBlockedSenders(): Promise<{ blockedSenders: BlockedSender[] }> {
  const res = await fetch(`${EMAIL_SERVICE_URL}/api/blocked-senders`)
  if (!res.ok) throw new Error("Falha ao carregar remetentes bloqueados")
  return res.json()
}

async function blockEmailSender(data: {
  email: string
  reason?: string
  viewerId?: string
  viewerName?: string
  viewerEmail?: string
}) {
  const res = await fetch(`${EMAIL_SERVICE_URL}/api/blocked-senders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => null)
    throw new Error(error?.error || "Falha ao bloquear remetente")
  }

  return res.json() as Promise<{ success: boolean; blockedSender: BlockedSender }>
}

async function unblockEmailSender(id: string) {
  const res = await fetch(`${EMAIL_SERVICE_URL}/api/blocked-senders/${id}`, {
    method: "DELETE",
  })

  if (!res.ok) {
    const error = await res.json().catch(() => null)
    throw new Error(error?.error || "Falha ao desbloquear remetente")
  }

  return res.json() as Promise<{ success: boolean }>
}

async function fetchDeletedEmails(): Promise<{ deletedEmails: DeletedEmail[] }> {
  const res = await fetch(`${EMAIL_SERVICE_URL}/api/deleted-emails`)
  if (!res.ok) throw new Error("Falha ao carregar emails excluídos")
  return res.json()
}

async function restoreDeletedEmailRequest(id: string) {
  const res = await fetch(`${EMAIL_SERVICE_URL}/api/deleted-emails/${id}/restore`, {
    method: "POST",
  })

  if (!res.ok) {
    const error = await res.json().catch(() => null)
    throw new Error(error?.error || "Falha ao restaurar email")
  }

  return res.json() as Promise<{ success: boolean }>
}

async function fetchEmailStats(): Promise<{
  unreadEmails: number
  inboxEmails: number
  sentEmails: number
  spamEmails: number
}> {
  const res = await fetch(`${EMAIL_SERVICE_URL}/api/stats`)
  if (!res.ok) throw new Error("Falha ao carregar estatísticas do inbox")
  return res.json()
}

function getAttachmentDownloadUrl(attachmentId: string) {
  return `${EMAIL_SERVICE_URL}/api/attachments/${attachmentId}/download`
}

async function downloadAttachment(attachment: EmailAttachment) {
  const response = await fetch(getAttachmentDownloadUrl(attachment.id))

  if (!response.ok) {
    let message = "Falha ao baixar anexo"

    try {
      const error = await response.json()
      message = error?.error || message
    } catch {}

    throw new Error(message)
  }

  const blob = await response.blob()
  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = objectUrl
  link.download = attachment.filename || "anexo"
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(objectUrl)
}

function formatDate(dateString: string | null) {
  if (!dateString) return "—"
  const date = new Date(dateString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  
  if (isToday) {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  }
  
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function extractName(address: string) {
  const match = address.match(/^(.+?)\s*<.+>$/)
  return match ? match[1].trim() : address.split("@")[0]
}

export default function InboxPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [activeView, setActiveView] = useState<InboxView>("inbox")
  const [composeMode, setComposeMode] = useState<ComposeMode>("new")
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [emailPendingDelete, setEmailPendingDelete] = useState<EmailFull | null>(null)
  const [blockReason, setBlockReason] = useState("")

  // Ativar notificações de novos emails
  useEmailNotifications()
  
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfile(),
    staleTime: 60000,
  })

  const isAdmin = profile?.role === "ADMIN"

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["emails", page, search, activeView],
    queryFn: () => fetchEmails(page, search, activeView),
    staleTime: 30000,
  })

  const { data: emailStats } = useQuery({
    queryKey: ["email-stats"],
    queryFn: () => fetchEmailStats(),
    staleTime: 15000,
    refetchInterval: 30000,
  })

  const { data: selectedEmail, isLoading: isLoadingEmail } = useQuery({
    queryKey: ["email", selectedEmailId],
    queryFn: () => fetchEmail(selectedEmailId!),
    enabled: !!selectedEmailId && activeView !== "blocked",
  })

  const { data: blockedSendersData } = useQuery({
    queryKey: ["blocked-senders"],
    queryFn: () => fetchBlockedSenders(),
    enabled: isAdmin,
    staleTime: 30000,
    refetchInterval: 30000,
  })

  const { data: deletedEmailsData } = useQuery({
    queryKey: ["deleted-emails"],
    queryFn: () => fetchDeletedEmails(),
    enabled: isAdmin,
    staleTime: 30000,
    refetchInterval: 30000,
  })

  const markReadMutation = useMutation({
    mutationFn: ({ id, viewer }: { id: string; viewer: { viewerId?: string; viewerName?: string; viewerEmail?: string } }) =>
      markEmailRead(id, viewer),
    onSuccess: (_, variables) => {
      queryClient.setQueryData<EmailsResponse | undefined>(["emails", page, search, activeView], (current) => {
        if (!current) return current
        return {
          ...current,
          emails: current.emails.map((email) =>
            email.id === variables.id
              ? {
                  ...email,
                  isRead: true,
                  readAt: new Date().toISOString(),
                  readByUserName: profile?.name || null,
                }
              : email,
          ),
        }
      })

      queryClient.invalidateQueries({ queryKey: ["email", variables.id] })
      queryClient.invalidateQueries({ queryKey: ["email-stats"] })
    },
  })

  const markUnreadMutation = useMutation({
    mutationFn: (id: string) => markEmailUnread(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<EmailsResponse | undefined>(["emails", page, search, activeView], (current) => {
        if (!current) return current
        return {
          ...current,
          emails: current.emails.map((email) =>
            email.id === id
              ? {
                  ...email,
                  isRead: false,
                  readAt: null,
                  readByUserName: null,
                }
              : email,
          ),
        }
      })

      queryClient.invalidateQueries({ queryKey: ["email", id] })
      queryClient.invalidateQueries({ queryKey: ["email-stats"] })
      toast.success("Email marcado como não lido")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteEmailMutation = useMutation({
    mutationFn: (id: string) =>
      deleteEmail(id, {
        viewerId: profile?.id,
        viewerName: profile?.name,
        viewerEmail: profile?.email,
      }),
    onSuccess: async (_, id) => {
      if (selectedEmailId === id) {
        setSelectedEmailId(null)
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["emails"] }),
        queryClient.invalidateQueries({ queryKey: ["email-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["email", id] }),
      ])
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const blockSenderMutation = useMutation({
    mutationFn: (email: string) =>
      blockEmailSender({
        email,
        reason: blockReason.trim() || undefined,
        viewerId: profile?.id,
        viewerName: profile?.name,
        viewerEmail: profile?.email,
      }),
    onSuccess: async () => {
      setBlockReason("")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["blocked-senders"] }),
        queryClient.invalidateQueries({ queryKey: ["email-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["emails"] }),
      ])
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const unblockSenderMutation = useMutation({
    mutationFn: (id: string) => unblockEmailSender(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["blocked-senders"] }),
        queryClient.invalidateQueries({ queryKey: ["email-stats"] }),
      ])
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const restoreDeletedEmailMutation = useMutation({
    mutationFn: (id: string) => restoreDeletedEmailRequest(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["deleted-emails"] }),
        queryClient.invalidateQueries({ queryKey: ["emails"] }),
        queryClient.invalidateQueries({ queryKey: ["email-stats"] }),
      ])
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  useEffect(() => {
    if (!selectedEmailId || !profile?.id || !selectedEmail || selectedEmail.isRead) {
      return
    }

    markReadMutation.mutate({
      id: selectedEmailId,
      viewer: {
        viewerId: profile.id,
        viewerName: profile.name,
        viewerEmail: profile.email,
      },
    })
  }, [selectedEmailId, selectedEmail, profile])

  const blockedSenders = blockedSendersData?.blockedSenders ?? []
  const deletedEmails = deletedEmailsData?.deletedEmails ?? []
  const selectedEmailReceivedLabel = useMemo(() => {
    if (!selectedEmail?.receivedAt) return "—"
    return new Date(selectedEmail.receivedAt).toLocaleString("pt-BR")
  }, [selectedEmail?.receivedAt])

  const filteredEmails = useMemo(() => {
    const emails = data?.emails ?? []

    if (activeView === "unread") {
      return emails.filter((email) => !email.isRead)
    }

    if (activeView === "read") {
      return emails.filter((email) => email.isRead)
    }

    if (activeView === "attachments") {
      return emails.filter((email) => email.hasAttachments)
    }

    if (activeView === "blocked" || activeView === "deleted") {
      return []
    }

    return emails
  }, [data?.emails, activeView])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleRefresh = () => {
    refetch()
    toast.success("Inbox atualizado")
  }

  const handleConfirmDeleteEmail = () => {
    if (!emailPendingDelete) return

    const promise = deleteEmailMutation.mutateAsync(emailPendingDelete.id)
    toast.promise(promise, {
      loading: "Apagando email...",
      success: "Email apagado com sucesso!",
      error: (err) => err?.message || "Falha ao apagar email",
    })
    setEmailPendingDelete(null)
  }

  const handleBlockSender = () => {
    const sender = selectedEmail?.from[0]
    if (!sender) {
      toast.error("Remetente inválido")
      return
    }

    const promise = blockSenderMutation.mutateAsync(sender)
    toast.promise(promise, {
      loading: "Bloqueando remetente...",
      success: "Remetente bloqueado com sucesso!",
      error: (err) => err?.message || "Falha ao bloquear remetente",
    })
  }

  const handleRestoreDeletedEmail = (id: string) => {
    const promise = restoreDeletedEmailMutation.mutateAsync(id)
    toast.promise(promise, {
      loading: "Restaurando email...",
      success: "Email restaurado com sucesso!",
      error: (err) => err?.message || "Falha ao restaurar email",
    })
  }

  const handleDownloadAttachment = (attachment: EmailAttachment) => {
    const promise = downloadAttachment(attachment)

    toast.promise(promise, {
      loading: `Baixando ${attachment.filename}...`,
      success: `${attachment.filename} baixado com sucesso!`,
      error: (err) => err?.message || "Falha ao baixar anexo",
    })
  }

  const openCompose = (mode: ComposeMode) => {
    setComposeMode(mode)
    setComposeOpen(true)
  }

  const counts: Record<InboxView, number> = {
    inbox: emailStats?.inboxEmails || 0,
    sent: emailStats?.sentEmails || 0,
    spam: emailStats?.spamEmails || 0,
    unread: emailStats?.unreadEmails || 0,
    read: (data?.emails || []).filter((email) => email.isRead).length,
    attachments: (data?.emails || []).filter((email) => email.hasAttachments).length,
    blocked: blockedSenders.length,
    deleted: deletedEmails.length,
  }

  if (isLoading) {
    return <GlobalScreenLoader />
  }

  return (
    <AlertDialog open={!!emailPendingDelete} onOpenChange={(open) => !open && setEmailPendingDelete(null)}>
      <div className="flex h-full bg-slate-50">
        <div className="w-60 min-w-60 bg-white h-full flex flex-col px-4 pt-6 border-r border-slate-200 overflow-y-auto">
          <div className="mb-6">
            <h1 className="text-lg font-bold text-slate-900">Inbox</h1>
            <p className="text-xs text-slate-500 mt-0.5">{counts.inbox} emails na caixa de entrada</p>
          </div>

          <div className="mb-6">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center justify-between w-full px-2 mb-2"
            >
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtros</span>
              {filtersOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </button>

            {filtersOpen && (
              <div className="flex flex-col gap-0.5">
                {FILTERS.map((filter) => {
                  if ((filter.key === "blocked" || filter.key === "deleted") && !isAdmin) return null
                  const Icon = filter.icon
                  const isActive = activeView === filter.key

                  return (
                    <button
                      key={filter.key}
                      onClick={() => {
                        setActiveView(filter.key)
                        setPage(1)
                        if (filter.key === "blocked" || filter.key === "deleted") {
                          setSelectedEmailId(null)
                        }
                      }}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                        isActive
                          ? "bg-indigo-50 text-indigo-700 font-medium"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={16} strokeWidth={1.5} />
                        <span>{filter.label}</span>
                      </div>
                      <span
                        className={`text-xs min-w-6 text-center rounded-full px-2 py-0.5 font-semibold ${
                          isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {counts[filter.key]}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-auto pb-6">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Resumo</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Entrada</span>
                  <span className="text-sm font-semibold text-slate-900">{counts.inbox}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Não lidos</span>
                  <span className="text-sm font-semibold text-indigo-600">{counts.unread}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between px-6 h-16 bg-white border-b border-slate-200">
            <div className="flex items-center gap-4">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input
                  placeholder="Buscar emails..."
                  className="pl-10 pr-4 w-72 bg-slate-50 border-slate-200 h-10 text-sm rounded-xl focus-visible:ring-indigo-500 placeholder:text-slate-400"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </form>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isFetching}
                className="h-10 w-10 rounded-xl"
              >
                <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
              </Button>
              <button
                onClick={() => openCompose("new")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm shadow-indigo-600/25"
              >
                <Plus size={16} /> Novo Email
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
            <p className="text-sm text-slate-500">
              Mostrando <span className="font-medium text-slate-900">{filteredEmails.length}</span> de{" "}
              <span className="font-medium text-slate-900">{data?.pagination.total || 0}</span>
            </p>
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-500">Página</label>
              <select
                className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 bg-white outline-none transition-colors hover:border-slate-300 focus:border-indigo-400"
                value={page}
                onChange={(e) => setPage(Number(e.target.value))}
              >
                {Array.from({ length: data?.pagination.totalPages || 1 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="w-[380px] min-w-[380px] border-r border-slate-200 bg-white flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                {activeView === "blocked" ? (
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {blockedSenders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Mail size={40} className="text-slate-300 mb-3" />
                        <p className="text-sm font-medium text-slate-600">Nenhum remetente bloqueado</p>
                        <p className="text-xs text-slate-400 mt-1">Quando um admin bloquear alguém, ele aparece aqui</p>
                      </div>
                    ) : (
                      blockedSenders.map((blocked) => (
                        <div
                          key={blocked.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                        >
                          <p className="text-sm font-medium text-slate-900 truncate">{blocked.email}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {blocked.blockedByUserName || "Admin não identificado"}
                            {blocked.blockedAt ? ` em ${new Date(blocked.blockedAt).toLocaleString("pt-BR")}` : ""}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                ) : activeView === "deleted" ? (
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {deletedEmails.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Trash2 size={40} className="text-slate-300 mb-3" />
                        <p className="text-sm font-medium text-slate-600">Nenhum email excluído</p>
                        <p className="text-xs text-slate-400 mt-1">Os emails removidos aparecerão aqui</p>
                      </div>
                    ) : (
                      deletedEmails.map((email) => (
                        <div
                          key={email.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                        >
                          <p className="text-sm font-medium text-slate-900 truncate">{email.subject || "(Sem assunto)"}</p>
                          <p className="text-xs text-slate-500 mt-1 truncate">{email.fromAddress || "Remetente não informado"}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {email.deletedByUserName || email.deletedByUserEmail || "Usuário não identificado"}
                            {email.deletedAt ? ` em ${new Date(email.deletedAt).toLocaleString("pt-BR")}` : ""}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <InboxIcon size={40} className="text-slate-300 mb-3" />
                    <p className="text-sm font-medium text-slate-600">Nenhum email encontrado</p>
                    <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros ou busca</p>
                  </div>
                ) : (
                  filteredEmails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => setSelectedEmailId(email.id)}
                      className={cn(
                        "w-full text-left px-4 py-4 border-b border-slate-100 transition-all cursor-pointer",
                        !email.isRead && "bg-indigo-50/50",
                        selectedEmailId === email.id && "bg-indigo-100 border-l-4 border-l-indigo-600",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p
                          className={cn(
                            "text-sm truncate",
                            !email.isRead ? "font-semibold text-slate-900" : "font-medium text-slate-700",
                          )}
                        >
                          {email.from[0] ? extractName(email.from[0]) : "Desconhecido"}
                        </p>
                        <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(email.receivedAt)}</span>
                      </div>
                      <p
                        className={cn(
                          "text-sm truncate mb-1",
                          !email.isRead ? "font-medium text-slate-800" : "text-slate-600",
                        )}
                      >
                        {email.subject || "(Sem assunto)"}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-400 truncate flex-1">{email.preview || "Sem conteúdo"}</p>
                        {!email.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
                        {email.hasAttachments && <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {(data?.pagination.totalPages ?? 0) > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white">
                  <p className="text-sm text-slate-500">
                    Página <span className="font-medium text-slate-900">{page}</span> de{" "}
                    <span className="font-medium text-slate-900">{data?.pagination.totalPages || 1}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="h-9 rounded-lg text-sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9 rounded-lg text-sm"
                      onClick={() => setPage((p) => Math.min(data?.pagination.totalPages || 1, p + 1))}
                      disabled={page >= (data?.pagination.totalPages || 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 bg-slate-50 overflow-y-auto">
              {activeView === "blocked" ? (
                <div className="p-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">Remetentes bloqueados</h2>
                        <p className="text-sm text-slate-500">Controle administrativo de bloqueios e auditoria</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {blockedSenders.length === 0 ? (
                        <p className="text-sm text-slate-500">Nenhum remetente bloqueado até o momento.</p>
                      ) : (
                        blockedSenders.map((blocked) => (
                          <div
                            key={blocked.id}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-4"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{blocked.email}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                Bloqueado por {blocked.blockedByUserName || blocked.blockedByUserEmail || "Admin não identificado"}
                                {blocked.blockedAt ? ` em ${new Date(blocked.blockedAt).toLocaleString("pt-BR")}` : ""}
                              </p>
                              {blocked.reason ? (
                                <p className="text-xs text-slate-500 mt-1">Motivo: {blocked.reason}</p>
                              ) : null}
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => unblockSenderMutation.mutate(blocked.id)}
                              disabled={unblockSenderMutation.isPending}
                            >
                              Desbloquear
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : activeView === "deleted" ? (
                <div className="p-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">Emails excluídos</h2>
                        <p className="text-sm text-slate-500">Controle administrativo de exclusões e restauração</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {deletedEmails.length === 0 ? (
                        <p className="text-sm text-slate-500">Nenhum email excluído até o momento.</p>
                      ) : (
                        deletedEmails.map((email) => (
                          <div
                            key={email.id}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-4"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{email.subject || "(Sem assunto)"}</p>
                              <p className="text-xs text-slate-500 mt-1">{email.fromAddress || "Remetente não informado"}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                Excluído por {email.deletedByUserName || email.deletedByUserEmail || "Usuário não identificado"}
                                {email.deletedAt ? ` em ${new Date(email.deletedAt).toLocaleString("pt-BR")}` : ""}
                              </p>
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => handleRestoreDeletedEmail(email.id)}
                              disabled={restoreDeletedEmailMutation.isPending}
                            >
                              Restaurar
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : !selectedEmailId ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Mail size={48} className="text-slate-300 mb-4" />
                  <p className="text-lg font-medium text-slate-600">Selecione um email</p>
                  <p className="text-sm text-slate-400">Clique em um email para visualizar</p>
                </div>
              ) : isLoadingEmail ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : selectedEmail ? (
                <div className="p-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h2 className="text-lg font-semibold text-slate-900">{selectedEmail.subject || "(Sem assunto)"}</h2>
                          <Badge variant={selectedEmail.isRead ? "secondary" : "default"} className="rounded-full">
                            {selectedEmail.isRead ? "Lido" : "Não lido"}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500">Recebido em {selectedEmailReceivedLabel}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 rounded-lg p-0 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => openCompose("reply")}>
                              <Reply className="w-4 h-4 mr-2" />
                              Responder
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openCompose("forward")}>
                              <Forward className="w-4 h-4 mr-2" />
                              Encaminhar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => markUnreadMutation.mutate(selectedEmail.id)}
                              disabled={markUnreadMutation.isPending}
                            >
                              <EyeOff className="w-4 h-4 mr-2" />
                              Marcar como não lido
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuItem
                                  onClick={handleBlockSender}
                                  disabled={blockSenderMutation.isPending}
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Bloquear remetente
                                </DropdownMenuItem>
                                <div className="px-2 pb-2">
                                  <Input
                                    value={blockReason}
                                    onChange={(e) => setBlockReason(e.target.value)}
                                    placeholder="Motivo do bloqueio"
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={deleteEmailMutation.isPending}
                              onClick={() => setEmailPendingDelete(selectedEmail)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Apagar email
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-indigo-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-slate-900">
                            {selectedEmail.from[0] ? extractName(selectedEmail.from[0]) : "Desconhecido"}
                          </p>
                          <span className="text-xs text-slate-400">{selectedEmail.from[0] || ""}</span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {selectedEmail.date ? new Date(selectedEmail.date).toLocaleString("pt-BR") : "—"}
                          </span>
                          <span>Para: {selectedEmail.to.join(", ") || "—"}</span>
                        </div>

                        {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                          <p className="text-xs text-slate-500 mt-1">Cc: {selectedEmail.cc.join(", ")}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedEmail.isRead && (
                    <div className="bg-white rounded-xl border border-emerald-200 p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                          <Eye className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-emerald-900">Última leitura</p>
                          <p className="text-sm text-emerald-800">
                            {selectedEmail.readByUserName || "Usuário não identificado"}
                            {selectedEmail.readAt ? ` em ${new Date(selectedEmail.readAt).toLocaleString("pt-BR")}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isAdmin && selectedEmail.viewEvents.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <p className="text-sm font-semibold text-slate-800">Histórico de visualização</p>
                      </div>

                      <div className="space-y-2">
                        {selectedEmail.viewEvents.map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">
                                {event.viewerName || "Usuário não identificado"}
                              </p>
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <AtSign className="w-3 h-3" />
                                {event.viewerEmail || "Sem email"}
                              </p>
                            </div>
                            <p className="text-xs text-slate-500 whitespace-nowrap">
                              {new Date(event.viewedAt).toLocaleString("pt-BR")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
                      <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                        <Paperclip className="w-4 h-4" />
                        {selectedEmail.attachments.length} anexo(s)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmail.attachments.map((att) => (
                          <button
                            key={att.id}
                            type="button"
                            onClick={() => handleDownloadAttachment(att)}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left cursor-pointer"
                          >
                            <FileText className="w-4 h-4 text-slate-500" />
                            <div className="min-w-0">
                              <p className="text-sm text-slate-700 truncate max-w-[150px]">{att.filename}</p>
                              <p className="text-xs text-slate-400">{formatFileSize(att.size)}</p>
                            </div>
                            <Download className="w-4 h-4 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="prose prose-slate max-w-none">
                      {selectedEmail.htmlBody ? (
                        <div dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }} className="email-content" />
                      ) : (
                        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">
                          {selectedEmail.textBody || "Sem conteúdo"}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <ComposeModal
          open={composeOpen}
          onOpenChange={setComposeOpen}
          onSuccess={() => refetch()}
          mode={composeMode}
          replyTo={selectedEmail || undefined}
        />

        <AlertDialogContent className="max-w-md rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl">
          <AlertDialogHeader className="px-6 pt-6 pb-4 text-left">
            <AlertDialogTitle className="text-left text-lg text-slate-900">Apagar email?</AlertDialogTitle>
            <AlertDialogDescription className="text-left text-sm text-slate-500">
              Esta ação remove o email selecionado e tenta excluir também os anexos vinculados. Essa ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t border-slate-100 px-6 py-4">
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" className="rounded-xl" onClick={handleConfirmDeleteEmail}>
              Apagar email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </div>
    </AlertDialog>
  )
}

interface ComposeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  mode?: ComposeMode
  replyTo?: EmailFull
}

function ComposeModal({ open, onOpenChange, onSuccess, replyTo, mode = "new" }: ComposeModalProps) {
  const [to, setTo] = useState<string[]>([])
  const [toInput, setToInput] = useState("")
  const [cc, setCC] = useState<string[]>([])
  const [ccInput, setCCInput] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [showCc, setShowCc] = useState(false)
  const [attachments, setAttachments] = useState<ComposeAttachment[]>([])

  useEffect(() => {
    if (!open) return

    if (mode === "reply" && replyTo) {
      setTo(replyTo.from[0] ? [replyTo.from[0]] : [])
      setToInput("")
      setSubject(replyTo.subject ? `Re: ${replyTo.subject}` : "Re:")
      setBody("")
      return
    }

    if (mode === "forward" && replyTo) {
      setTo([])
      setToInput("")
      setSubject(replyTo.subject ? `Enc: ${replyTo.subject}` : "Encaminhar")
      setBody(
        `\n\n---------- Mensagem encaminhada ----------\nDe: ${replyTo.from.join(", ")}\nPara: ${replyTo.to.join(", ")}\nData: ${replyTo.date ? new Date(replyTo.date).toLocaleString("pt-BR") : "—"}\nAssunto: ${replyTo.subject || "(Sem assunto)"}\n\n${replyTo.textBody || ""}`,
      )
      return
    }

    setTo([])
    setToInput("")
    setCC([])
    setCCInput("")
    setSubject("")
    setBody("")
    setAttachments([])
    setShowCc(false)
  }, [open, mode, replyTo])

  async function fileToBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result !== "string") {
          reject(new Error("Falha ao ler arquivo"))
          return
        }
        const [, base64] = result.split(",")
        resolve(base64 || "")
      }
      reader.onerror = () => reject(new Error("Falha ao ler arquivo"))
      reader.readAsDataURL(file)
    })
  }

  async function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    try {
      const mapped = await Promise.all(
        files.map(async (file) => ({
          id: `${file.name}-${file.size}-${file.lastModified}`,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          contentBase64: await fileToBase64(file),
        })),
      )

      setAttachments((current) => [...current, ...mapped])
      event.target.value = ""
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao anexar arquivo")
    }
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((item) => item.id !== id))
  }

  const sendMutation = useMutation({
    mutationFn: sendEmail,
    onSuccess: () => {
      onOpenChange(false)
      setTo([])
      setToInput("")
      setCC([])
      setCCInput("")
      setSubject("")
      setBody("")
      setAttachments([])
      onSuccess?.()
    },
  })

  const addToRecipient = () => {
    const email = toInput.trim()
    if (email && !to.includes(email)) {
      setTo([...to, email])
      setToInput("")
    }
  }

  const addCCRecipient = () => {
    const email = ccInput.trim()
    if (email && !cc.includes(email)) {
      setCC([...cc, email])
      setCCInput("")
    }
  }

  const removeToRecipient = (email: string) => {
    setTo(to.filter(e => e !== email))
  }

  const removeCCRecipient = (email: string) => {
    setCC(cc.filter(e => e !== email))
  }

  const handleToKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addToRecipient()
    }
  }

  const handleCCKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addCCRecipient()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (to.length === 0) {
      toast.error("Informe ao menos um destinatário")
      return
    }
    
    if (!subject.trim()) {
      toast.error("Informe o assunto")
      return
    }

    const promise = sendMutation.mutateAsync({
      to,
      cc: cc.length > 0 ? cc : undefined,
      subject: subject.trim(),
      text: body,
      html: `<div style="font-family: sans-serif; white-space: pre-wrap;">${body.replace(/\n/g, "<br>")}</div>`,
      attachments,
    })

    toast.promise(promise, {
      loading: "Enviando email...",
      success: "Email enviado com sucesso!",
      error: (err) => err?.message || "Falha ao enviar email",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] min-w-[95vw] h-[95vh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-6">
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xl font-semibold">
                {mode === "reply" ? "Responder email" : mode === "forward" ? "Encaminhar email" : "Nova mensagem"}
              </p>
              <p className="text-sm font-normal text-indigo-100 mt-1">
                Compose profissional com anexos, múltiplos destinatários e pré-visualização
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 grid grid-cols-12 gap-0">
          {/* Main Content Area */}
          <div className="col-span-8 flex flex-col min-h-0 bg-white">
            <div className="px-8 py-6 space-y-5 border-b border-slate-200">
              {/* Para */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Para</label>
                <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 min-h-[52px]">
                  {to.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 text-sm font-medium"
                    >
                      <AtSign className="w-3.5 h-3.5" />
                      {email}
                      <button
                        type="button"
                        onClick={() => removeToRecipient(email)}
                        className="hover:text-indigo-900"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="email"
                    placeholder={to.length === 0 ? "Digite o email e pressione Enter ou vírgula" : "Adicionar mais..."}
                    value={toInput}
                    onChange={(e) => setToInput(e.target.value)}
                    onKeyDown={handleToKeyDown}
                    onBlur={addToRecipient}
                    className="flex-1 min-w-[200px] bg-transparent border-0 outline-none text-sm placeholder:text-slate-400"
                  />
                </div>
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-2"
                  >
                    + Adicionar Cc
                  </button>
                )}
              </div>

              {/* Cc */}
              {showCc && (
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Cc (Cópia)</label>
                  <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 min-h-[52px]">
                    {cc.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-sm font-medium"
                      >
                        <AtSign className="w-3.5 h-3.5" />
                        {email}
                        <button
                          type="button"
                          onClick={() => removeCCRecipient(email)}
                          className="hover:text-slate-900"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="email"
                      placeholder={cc.length === 0 ? "Digite o email e pressione Enter ou vírgula" : "Adicionar mais..."}
                      value={ccInput}
                      onChange={(e) => setCCInput(e.target.value)}
                      onKeyDown={handleCCKeyDown}
                      onBlur={addCCRecipient}
                      className="flex-1 min-w-[200px] bg-transparent border-0 outline-none text-sm placeholder:text-slate-400"
                    />
                  </div>
                </div>
              )}

              {/* Assunto */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Assunto</label>
                <Input
                  type="text"
                  placeholder="Assunto do email"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-12 rounded-xl text-base border-slate-200 bg-slate-50"
                />
              </div>
            </div>

            {/* Mensagem */}
            <div className="flex-1 min-h-0 px-8 py-6 flex flex-col">
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Mensagem</label>
              <Textarea
                placeholder="Escreva sua mensagem com conforto e espaço..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="flex-1 resize-none rounded-xl border-slate-200 bg-slate-50 text-[15px] leading-relaxed focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-4 flex flex-col min-h-0 bg-slate-50 border-l border-slate-200">
            {/* Anexos */}
            <div className="px-6 py-6 border-b border-slate-200">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Anexos</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {attachments.length} arquivo(s) anexado(s)
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 cursor-pointer shadow-sm">
                  <Upload className="w-4 h-4" />
                  Adicionar
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFilesChange}
                  />
                </label>
              </div>
            </div>

            {/* Lista de Anexos */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {attachments.length === 0 ? (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white text-slate-400 p-6">
                  <Paperclip className="w-12 h-12 mb-3" />
                  <p className="text-sm font-medium text-slate-600">Nenhum anexo</p>
                  <p className="text-xs text-slate-400 mt-1 text-center">Clique em "Adicionar" para anexar arquivos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {attachment.filename}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {formatFileSize(attachment.size)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(attachment.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumo e Ações */}
            <div className="border-t border-slate-200 px-6 py-6 bg-white">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-5">
                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
                  Resumo do Email
                </p>
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600">Destinatários</span>
                    <span className="font-semibold text-slate-900">{to.length}</span>
                  </div>
                  {cc.length > 0 && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-600">Cópias (Cc)</span>
                      <span className="font-semibold text-slate-900">{cc.length}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600">Anexos</span>
                    <span className="font-semibold text-slate-900">{attachments.length}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={sendMutation.isPending}
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-base font-semibold shadow-sm"
                >
                  {sendMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Enviar Email
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="w-full h-11"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
