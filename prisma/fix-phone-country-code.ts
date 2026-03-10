import "dotenv/config"
import { prisma } from "../app/utils/prisma"

const LOG = "[fix-phone-country-code]"
const prismaAny = prisma as any

function normalizePhone(value: string | null | undefined) {
  const digits = String(value || "").replace(/\D/g, "")
  if (!digits.startsWith("55")) return digits
  if (digits.length !== 12 && digits.length !== 13) return digits

  const withoutCountryCode = digits.slice(2)
  if (withoutCountryCode.length !== 10 && withoutCountryCode.length !== 11) return digits
  return withoutCountryCode
}

async function main() {
  const clients = await prismaAny.clients.findMany({
    where: {
      ownerPhone: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      ownerPhone: true,
    },
  })

  const contacts = await prismaAny.clientContact.findMany({
    where: {
      phone: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      clientId: true,
      phone: true,
    },
  })

  const clientUpdates = clients
    .map((client: { id: string; name: string; ownerPhone: string | null }) => ({
      id: client.id,
      name: client.name,
      from: client.ownerPhone,
      to: normalizePhone(client.ownerPhone),
    }))
    .filter((item: { from: string | null; to: string }) => (item.from || "") !== item.to)

  const contactUpdates = contacts
    .map((contact: { id: string; name: string; clientId: string; phone: string | null }) => ({
      id: contact.id,
      name: contact.name,
      clientId: contact.clientId,
      from: contact.phone,
      to: normalizePhone(contact.phone),
    }))
    .filter((item: { from: string | null; to: string }) => (item.from || "") !== item.to)

  console.log(`${LOG} clientes com ajuste: ${clientUpdates.length}`)
  console.log(`${LOG} contatos extras com ajuste: ${contactUpdates.length}`)

  for (const item of clientUpdates.slice(0, 20)) {
    console.log(`${LOG} client ${item.id} | ${item.name} | ${item.from} -> ${item.to}`)
  }

  for (const item of contactUpdates.slice(0, 20)) {
    console.log(`${LOG} contact ${item.id} | ${item.name} | ${item.from} -> ${item.to}`)
  }

  for (const item of clientUpdates) {
    await prismaAny.clients.update({
      where: { id: item.id },
      data: { ownerPhone: item.to || null },
    })
  }

  for (const item of contactUpdates) {
    await prismaAny.clientContact.update({
      where: { id: item.id },
      data: { phone: item.to || null },
    })
  }

  console.log(`${LOG} ajustes concluídos`)
}

main()
  .catch((error) => {
    console.error(`${LOG} erro ao ajustar telefones`)
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
