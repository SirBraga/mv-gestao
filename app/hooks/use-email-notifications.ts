"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

export function useEmailNotifications(userId?: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    // Criar elemento de áudio para notificação sonora
    if (typeof window !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio("/sounds/notification.mp3")
      audioRef.current.volume = 0.5
    }

    // Solicitar permissão para notificações
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission()
      }
    }

    // Conectar ao SSE para receber notificações de novos emails
    if (typeof window !== "undefined") {
      const eventSource = new EventSource("/api/email-webhook")
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === "new_email" && data.email) {
            const { subject, from, id, mailboxType } = data.email
            if (mailboxType && mailboxType !== "inbox") {
              return
            }
            const fromName = from?.[0] || "Desconhecido"
            
            // Mostrar notificação
            showNotification(
              "Novo Email Recebido",
              `De: ${fromName}\n${subject || "(Sem assunto)"}`,
              id
            )

            // Invalidar queries para atualizar a lista
            queryClient.invalidateQueries({ queryKey: ["emails"] })
            queryClient.invalidateQueries({ queryKey: ["email-stats"] })
          }
        } catch (error) {
          console.error("Erro ao processar notificação:", error)
        }
      }

      eventSource.onerror = () => {
        console.error("Erro na conexão SSE, reconectando...")
        eventSource.close()
        // Reconectar após 5 segundos
        setTimeout(() => {
          if (eventSourceRef.current === eventSource) {
            const newEventSource = new EventSource("/api/email-webhook")
            eventSourceRef.current = newEventSource
          }
        }, 5000)
      }
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [queryClient])

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch((err) => {
        console.error("Erro ao tocar som de notificação:", err)
      })
    }
  }

  const showNotification = (title: string, body: string, emailId?: string) => {
    // Toast notification
    toast.info(title, {
      description: body,
      duration: 5000,
      action: emailId ? {
        label: "Ver",
        onClick: () => {
          window.location.href = `/dashboard/inbox?email=${emailId}`
        }
      } : undefined,
    })

    // Browser notification
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const notification = new Notification(title, {
        body,
        icon: "/root/logo.png",
        badge: "/root/logo.png",
        tag: "email-notification",
        requireInteraction: false,
      })

      notification.onclick = () => {
        window.focus()
        if (emailId) {
          window.location.href = `/dashboard/inbox?email=${emailId}`
        }
        notification.close()
      }
    }

    // Tocar som
    playNotificationSound()

    // Atualizar badge do navegador
    if (typeof navigator !== "undefined" && "setAppBadge" in navigator) {
      ;(navigator as any).setAppBadge(1).catch(() => {})
    }
  }

  const clearBadge = () => {
    if (typeof navigator !== "undefined" && "clearAppBadge" in navigator) {
      ;(navigator as any).clearAppBadge().catch(() => {})
    }
  }

  return {
    showNotification,
    clearBadge,
    playNotificationSound,
  }
}
