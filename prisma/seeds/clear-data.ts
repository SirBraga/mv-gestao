import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../app/generated/prisma/client"
import { Pool } from "pg"

const connectionString = process.env.DATABASE_URL!
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function clearData() {
    console.log("🧹 Limpando dados do banco e preservando usuários + autenticação...")

    await prisma.attachment.deleteMany({})
    console.log("✓ Anexos deletados")

    await prisma.ticketComment.deleteMany({})
    console.log("✓ Comentários de tickets deletados")

    await prisma.ticketSchedule.deleteMany({})
    console.log("✓ Agendamentos de tickets deletados")

    await prisma.apontamento.deleteMany({})
    console.log("✓ Apontamentos deletados")

    await prisma.tickets.deleteMany({})
    console.log("✓ Tickets deletados")

    await prisma.clientProductSerial.deleteMany({})
    console.log("✓ Seriais de produtos deletados")

    await prisma.clientContact.deleteMany({})
    console.log("✓ Contatos de clientes deletados")

    await prisma.clients.deleteMany({})
    console.log("✓ Clientes deletados")

    await prisma.contability.deleteMany({})
    console.log("✓ Contabilidades deletadas")

    await prisma.knowledgeBaseArticleProduct.deleteMany({})
    console.log("✓ Relações da base de conhecimento com produtos deletadas")

    await prisma.knowledgeBaseArticle.deleteMany({})
    console.log("✓ Artigos da base de conhecimento deletados")

    await prisma.products.deleteMany({})
    console.log("✓ Produtos deletados")

    await prisma.notification.deleteMany({})
    console.log("✓ Notificações deletadas")

    await prisma.channelMember.deleteMany({})
    console.log("✓ Membros de canais deletados")

    await prisma.chatMessage.deleteMany({})
    console.log("✓ Mensagens de chat deletadas")

    await prisma.chatChannel.deleteMany({})
    console.log("✓ Canais de chat deletados")

    await prisma.chatMediaFile.deleteMany({})
    console.log("✓ Arquivos de mídia do chat deletados")

    await prisma.userStatus.deleteMany({})
    console.log("✓ Status de usuários deletados")

    await prisma.verification.deleteMany({})
    console.log("✓ Tokens de verificação deletados")

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
