import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../app/generated/prisma/client"
import { Pool } from "pg"

const connectionString = process.env.DATABASE_URL!
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function clearData() {
    console.log("🧹 Limpando dados do banco (exceto users e products)...")

    // Deletar na ordem correta devido às relações
    await prisma.ticketComment.deleteMany({})
    console.log("✓ Comentários de tickets deletados")

    await prisma.apontamento.deleteMany({})
    console.log("✓ Apontamentos deletados")

    await prisma.attachment.deleteMany({})
    console.log("✓ Anexos deletados")

    await prisma.tickets.deleteMany({})
    console.log("✓ Tickets deletados")

    await prisma.clientProductSerial.deleteMany({})
    console.log("✓ Seriais de produtos deletados")

    await prisma.clientContact.deleteMany({})
    console.log("✓ Contatos de clientes deletados")

    await prisma.contability.deleteMany({})
    console.log("✓ Contabilidades deletadas")

    await prisma.clients.deleteMany({})
    console.log("✓ Clientes deletados")

    await prisma.notification.deleteMany({})
    console.log("✓ Notificações deletadas")

    await prisma.chatMessage.deleteMany({})
    console.log("✓ Mensagens de chat deletadas")

    await prisma.userStatus.deleteMany({})
    console.log("✓ Status de usuários deletados")

    console.log("✅ Limpeza concluída!")
}

clearData()
    .catch((e) => {
        console.error("❌ Erro ao limpar dados:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
