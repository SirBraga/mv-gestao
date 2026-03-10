import "dotenv/config"
import { prisma } from "../app/utils/prisma"

const prismaAny = prisma as any
const LOG = "[reset-clients-products]"

async function main() {
  console.log(`${LOG} iniciando limpeza de clientes e produtos`)
  console.log(`${LOG} contabilidades serão preservadas`)

  const countsBefore = {
    clients: await prismaAny.clients.count(),
    clientContacts: await prismaAny.clientContact.count(),
    tickets: await prismaAny.tickets.count(),
    ticketSchedules: await prismaAny.ticketSchedule.count(),
    ticketComments: await prismaAny.ticketComment.count(),
    apontamentos: await prismaAny.apontamento.count(),
    attachments: await prismaAny.attachment.count(),
    clientProductSerials: await prismaAny.clientProductSerial.count(),
    clientProducts: await prismaAny.clientProduct.count(),
    clientProductPlugins: await prismaAny.clientProductPlugin.count(),
    productPlugins: await prismaAny.productPlugin.count(),
    products: await prismaAny.products.count(),
    knowledgeBaseArticleProducts: await prismaAny.knowledgeBaseArticleProduct.count(),
  }

  console.log(`${LOG} contagem antes:`)
  console.log(JSON.stringify(countsBefore, null, 2))

  await prisma.$transaction(async (tx) => {
    const t: any = tx

    console.log(`${LOG} removendo attachments ligados a clients/tickets/apontamentos/comments`)
    await t.attachment.deleteMany({
      where: {
        OR: [
          { clientId: { not: null } },
          { ticketId: { not: null } },
          { apontamentoId: { not: null } },
          { commentId: { not: null } },
        ],
      },
    })

    console.log(`${LOG} removendo comentários de tickets`)
    await t.ticketComment.deleteMany()

    console.log(`${LOG} removendo agendamentos de tickets`)
    await t.ticketSchedule.deleteMany()

    console.log(`${LOG} removendo apontamentos`)
    await t.apontamento.deleteMany()

    console.log(`${LOG} removendo tickets`)
    await t.tickets.deleteMany()

    console.log(`${LOG} removendo seriais de clientes`)
    await t.clientProductSerial.deleteMany()

    console.log(`${LOG} removendo plugins contratados`)
    await t.clientProductPlugin.deleteMany()

    console.log(`${LOG} removendo produtos contratados`)
    await t.clientProduct.deleteMany()

    console.log(`${LOG} removendo vínculos de artigos com produtos`)
    await t.knowledgeBaseArticleProduct.deleteMany()

    console.log(`${LOG} removendo plugins base`)
    await t.productPlugin.deleteMany()

    console.log(`${LOG} removendo produtos base`)
    await t.products.deleteMany()

    console.log(`${LOG} removendo contatos de clientes`)
    await t.clientContact.deleteMany()

    console.log(`${LOG} removendo clientes`)
    await t.clients.deleteMany()
  })

  const countsAfter = {
    clients: await prismaAny.clients.count(),
    clientContacts: await prismaAny.clientContact.count(),
    tickets: await prismaAny.tickets.count(),
    ticketSchedules: await prismaAny.ticketSchedule.count(),
    ticketComments: await prismaAny.ticketComment.count(),
    apontamentos: await prismaAny.apontamento.count(),
    attachments: await prismaAny.attachment.count(),
    clientProductSerials: await prismaAny.clientProductSerial.count(),
    clientProducts: await prismaAny.clientProduct.count(),
    clientProductPlugins: await prismaAny.clientProductPlugin.count(),
    productPlugins: await prismaAny.productPlugin.count(),
    products: await prismaAny.products.count(),
    knowledgeBaseArticleProducts: await prismaAny.knowledgeBaseArticleProduct.count(),
    contabilities: await prismaAny.contability.count(),
  }

  console.log(`${LOG} contagem depois:`)
  console.log(JSON.stringify(countsAfter, null, 2))
  console.log(`${LOG} limpeza concluída`)
}

main()
  .catch((error) => {
    console.error(`${LOG} erro durante limpeza`)
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
