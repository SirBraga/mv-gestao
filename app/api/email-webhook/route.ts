import { NextRequest, NextResponse } from "next/server"

// Armazena os clientes SSE conectados
const clients = new Set<ReadableStreamDefaultController>()

export async function POST(request: NextRequest) {
  try {
    // Validar bearer token
    const authHeader = request.headers.get("authorization")
    const expectedToken = process.env.EMAIL_WEBHOOK_BEARER_TOKEN

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const token = authHeader.substring(7) // Remove "Bearer "
    
    if (token !== expectedToken) {
      return NextResponse.json({ error: "Invalid bearer token" }, { status: 401 })
    }

    const body = await request.json()

    // Validar payload do webhook
    if (body.event !== "email.received" || !body.email) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 })
    }

    const emailData = {
      id: body.email.messageId,
      subject: body.email.subject,
      from: body.email.from,
      receivedAt: body.email.metadata?.receivedAt,
      hasAttachments: body.email.hasAttachments,
    }

    // Notificar todos os clientes conectados via SSE
    const message = `data: ${JSON.stringify({ type: "new_email", email: emailData })}\n\n`
    
    for (const controller of clients) {
      try {
        controller.enqueue(new TextEncoder().encode(message))
      } catch (error) {
        // Cliente desconectado, remover da lista
        clients.delete(controller)
      }
    }

    return NextResponse.json({ success: true, notified: clients.size })
  } catch (error) {
    console.error("Erro ao processar webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Endpoint SSE para clientes se conectarem
export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      // Adicionar cliente à lista
      clients.add(controller)

      // Enviar heartbeat a cada 30 segundos
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"))
        } catch {
          clearInterval(heartbeat)
          clients.delete(controller)
        }
      }, 30000)

      // Cleanup quando cliente desconectar
      return () => {
        clearInterval(heartbeat)
        clients.delete(controller)
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}
