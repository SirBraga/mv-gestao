import "dotenv/config"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import * as path from "node:path"
import { prisma } from "../app/utils/prisma"

const prismaAny = prisma as any
const CSV_DIR = "/Users/sirbraga/Downloads/clientes_seed_csv"
const REPORTS_DIR = path.join(process.cwd(), "prisma", "reports")
const SEED_LOG_PREFIX = "[seed]"

type CsvRow = Record<string, string>

type ClientRow = {
  client_key: string
  type: string
  name: string
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  cpf: string
  ie: string
  cnae: string
  businessSector: string
  address: string
  houseNumber: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  complement: string
  codigoCSC: string
  ownerName: string
  ownerPhone: string
  ownerEmail: string
  ownerCpf: string
  phone: string
  email: string
  aditionalInfo: string
  hasContract: string
  statusOriginal: string
  contractTypeHint: string
  supportReleasedHint: string
  contabilityRaw: string
}

type ClientProductRow = {
  client_key: string
  client_product_key: string
  productName: string
  installationType: string
  priceMonthly: string
  priceQuarterly: string
  priceYearly: string
  notes: string
  hasSerialControl: string
}

type ClientProductPluginRow = {
  client_product_key: string
  productName: string
  pluginName: string
  priceMonthly: string
  priceQuarterly: string
  priceYearly: string
  notes: string
}

type ClientSerialRow = {
  client_product_key: string
  client_key: string
  productName: string
  serial: string
  expiresAt: string
}

function normalize(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function parseCsvLine(line: string) {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === "," && !inQuotes) {
      result.push(current)
      current = ""
      continue
    }
    current += char
  }

  result.push(current)
  return result.map((value) => value.replace(/^\uFEFF/, ""))
}

async function readCsv<T extends CsvRow>(fileName: string): Promise<T[]> {
  console.log(`${SEED_LOG_PREFIX} lendo arquivo CSV: ${fileName}`)
  const content = await readFile(path.join(CSV_DIR, fileName), "utf-8")
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return []
  const headers = parseCsvLine(lines[0])
  console.log(`${SEED_LOG_PREFIX} cabeçalhos ${fileName}: ${headers.join(" | ")}`)
  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line)
    const row: CsvRow = {}
    headers.forEach((header, index) => {
      row[header] = values[index] ?? ""
    })
    console.log(`${SEED_LOG_PREFIX} ${fileName} linha ${index + 2}: ${JSON.stringify(row)}`)
    return row as T
  })
}

function toNullable(value?: string) {
  const trimmed = (value || "").trim()
  return trimmed ? trimmed : null
}

function toBoolean(value?: string) {
  return (value || "").trim().toLowerCase() === "true"
}

function toNumber(value?: string) {
  const trimmed = (value || "").trim().replace(/\./g, "").replace(",", ".")
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function toDate(value?: string) {
  const trimmed = (value || "").trim()
  if (!trimmed) return null
  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date
}

function toCType(value?: string) {
  return value === "PF" ? "PESSOA_FISICA" : "PESSOA_JURIDICA"
}

function toContractType(value?: string) {
  const trimmed = (value || "").trim().toUpperCase()
  if (trimmed === "ANUAL" || trimmed === "AVULSO" || trimmed === "CANCELADO") return trimmed
  return "MENSAL"
}

function isCancelledStatus(value?: string) {
  return (value || "").trim().toLowerCase() === "cancelado"
}

function toInstallationType(value?: string) {
  const trimmed = (value || "").trim().toUpperCase()
  if (trimmed === "LOCAL" || trimmed === "SERVIDOR" || trimmed === "ONLINE") return trimmed
  return null
}

function fallbackSerial(clientKey: string, productName: string) {
  return `PENDENTE-${normalize(productName).replace(/\s+/g, "-").toUpperCase()}-${clientKey.slice(-6)}`
}

async function loadExistingContabilities() {
  const cache = new Map<string, string>()
  console.log(`${SEED_LOG_PREFIX} carregando contabilidades existentes do banco`)
  const dbContabilities = await prismaAny.contability.findMany({
    select: { id: true, name: true, razaoSocial: true, nomeFantasia: true, email: true },
  })
  console.log(`${SEED_LOG_PREFIX} contabilidades encontradas no banco: ${dbContabilities.length}`)

  for (const item of dbContabilities) {
    console.log(`${SEED_LOG_PREFIX} indexando contabilidade: ${item.id} | ${item.nomeFantasia || item.razaoSocial || item.name || item.email || "sem nome"}`)
    for (const key of [item.name, item.razaoSocial, item.nomeFantasia, item.email].map((value: string | null) => normalize(value))) {
      if (key) cache.set(key, item.id)
    }
  }

  return cache
}

async function seedProducts(clientProducts: ClientProductRow[], pluginRows: ClientProductPluginRow[]) {
  const productMap = new Map<string, any>()
  const pluginMap = new Map<string, any>()
  console.log(`${SEED_LOG_PREFIX} preparando produtos base a partir de ${clientProducts.length} linhas`)

  const groupedProducts = new Map<string, { hasSerialControl: boolean }>()
  for (const row of clientProducts) {
    console.log(`${SEED_LOG_PREFIX} agrupando produto base: ${row.productName} | client_product_key=${row.client_product_key} | serialControl=${row.hasSerialControl}`)
    const current = groupedProducts.get(row.productName)
    groupedProducts.set(row.productName, {
      hasSerialControl: current?.hasSerialControl || toBoolean(row.hasSerialControl),
    })
  }

  for (const [productName, info] of groupedProducts.entries()) {
    console.log(`${SEED_LOG_PREFIX} upsert produto: ${productName} | hasSerialControl=${info.hasSerialControl}`)
    const existing = await prismaAny.products.findFirst({ where: { name: productName } })
    const payload = {
      name: productName,
      hasSerialControl: info.hasSerialControl,
      status: "ATIVO",
    }
    const product = existing
      ? await prismaAny.products.update({ where: { id: existing.id }, data: payload })
      : await prismaAny.products.create({ data: payload })
    console.log(`${SEED_LOG_PREFIX} produto ${existing ? "atualizado" : "criado"}: ${product.id} | ${product.name}`)
    productMap.set(productName, product)
  }

  for (const row of pluginRows) {
    console.log(`${SEED_LOG_PREFIX} processando plugin base: produto=${row.productName} | plugin=${row.pluginName}`)
    const product = productMap.get(row.productName)
    if (!product) continue
    const key = `${row.productName}::${row.pluginName}`
    const existing = await prismaAny.productPlugin.findFirst({
      where: { productId: product.id, name: row.pluginName },
    })
    const payload = {
      productId: product.id,
      name: row.pluginName,
      priceMonthly: toNumber(row.priceMonthly),
      priceQuarterly: toNumber(row.priceQuarterly),
      priceYearly: toNumber(row.priceYearly),
    }
    const plugin = existing
      ? await prismaAny.productPlugin.update({ where: { id: existing.id }, data: payload })
      : await prismaAny.productPlugin.create({ data: payload })
    console.log(`${SEED_LOG_PREFIX} plugin ${existing ? "atualizado" : "criado"}: ${plugin.id} | ${row.productName} -> ${row.pluginName}`)
    pluginMap.set(key, plugin)
  }

  return { productMap, pluginMap }
}

async function seedClients(
  clientRows: ClientRow[],
  clientProductRows: ClientProductRow[],
  pluginRows: ClientProductPluginRow[],
  serialRows: ClientSerialRow[],
  contabilityMap: Map<string, string>,
  productMap: Map<string, any>,
  pluginMap: Map<string, any>,
) {
  const clientMap = new Map<string, any>()
  const clientProductMap = new Map<string, any>()
  const unmatchedContabilities = new Map<string, string[]>()
  console.log(`${SEED_LOG_PREFIX} processando ${clientRows.length} clientes`)

  for (const row of clientRows) {
    console.log(`${SEED_LOG_PREFIX} cliente linha: key=${row.client_key} | nome=${row.name} | contabilidade=${row.contabilityRaw || "sem contabilidade"}`)
    const contabilityKey = normalize(row.contabilityRaw)
    const contabilityId = contabilityKey ? contabilityMap.get(contabilityKey) || null : null
    console.log(`${SEED_LOG_PREFIX} resultado vínculo contabilidade: client=${row.client_key} | key=${contabilityKey || "vazio"} | contabilityId=${contabilityId || "não encontrada"}`)

    if (row.contabilityRaw && !contabilityId) {
      const current = unmatchedContabilities.get(row.contabilityRaw) || []
      current.push(row.client_key)
      unmatchedContabilities.set(row.contabilityRaw, current)
    }

    const isCancelled = isCancelledStatus(row.statusOriginal)
    const contractType = isCancelled
      ? "CANCELADO"
      : (row.contractTypeHint ? toContractType(row.contractTypeHint) : (toBoolean(row.hasContract) ? "MENSAL" : null))
    const supportReleased = isCancelled
      ? false
      : (row.supportReleasedHint ? toBoolean(row.supportReleasedHint) : true)

    const payload = {
      id: row.client_key,
      name: row.name,
      razaoSocial: toNullable(row.razaoSocial),
      nomeFantasia: toNullable(row.nomeFantasia),
      cnpj: toNullable(row.cnpj),
      cpf: toNullable(row.cpf),
      ie: toNullable(row.ie),
      state: toNullable(row.state),
      codigoCSC: toNullable(row.codigoCSC),
      tokenCSC: null,
      aditionalInfo: toNullable(row.aditionalInfo),
      address: row.address || "Não informado",
      city: row.city || "Não informado",
      houseNumber: row.houseNumber || "S/N",
      neighborhood: row.neighborhood || "Não informado",
      zipCode: row.zipCode || "00000000",
      complement: row.complement || "",
      cnae: toNullable(row.cnae),
      businessSector: toNullable(row.businessSector) || "Serviços",
      type: toCType(row.type),
      contabilityId,
      hasContract: toBoolean(row.hasContract),
      contractType,
      supportReleased,
      contractCancelReason: isCancelled ? "OUTROS" : null,
      contractCancelDate: isCancelled ? new Date() : null,
      blockReason: isCancelled ? "OUTROS" : null,
      ownerName: toNullable(row.ownerName),
      ownerPhone: toNullable(row.ownerPhone),
      ownerEmail: toNullable(row.ownerEmail),
      ownerCpf: toNullable(row.ownerCpf),
      certificateType: null,
      certificateExpiresDate: null,
    }

    const existing = await prismaAny.clients.findUnique({ where: { id: row.client_key } })
    const client = existing
      ? await prismaAny.clients.update({ where: { id: row.client_key }, data: payload })
      : await prismaAny.clients.create({ data: payload })
    console.log(`${SEED_LOG_PREFIX} cliente ${existing ? "atualizado" : "criado"}: ${client.id} | ${client.name}`)

    clientMap.set(row.client_key, client)

    const defaultContactName = row.ownerName || row.name
    if (defaultContactName) {
      const existingContact = await prismaAny.clientContact.findFirst({
        where: {
          clientId: client.id,
          name: defaultContactName,
          email: toNullable(row.email || row.ownerEmail),
          phone: toNullable(row.phone || row.ownerPhone),
        },
      })

      if (!existingContact) {
        console.log(`${SEED_LOG_PREFIX} criando contato padrão do cliente: client=${client.id} | contato=${defaultContactName}`)
        await prismaAny.clientContact.create({
          data: {
            clientId: client.id,
            name: defaultContactName,
            phone: toNullable(row.phone || row.ownerPhone),
            email: toNullable(row.email || row.ownerEmail),
            role: "Colaborador",
            isDefault: true,
          },
        })
      }
    }
  }

  for (const row of clientProductRows) {
    console.log(`${SEED_LOG_PREFIX} produto contratado linha: client=${row.client_key} | key=${row.client_product_key} | produto=${row.productName}`)
    const client = clientMap.get(row.client_key)
    const product = productMap.get(row.productName)
    if (!client || !product) continue

    const payload = {
      clientId: client.id,
      productId: product.id,
      installationType: toInstallationType(row.installationType),
      priceMonthly: toNumber(row.priceMonthly),
      priceQuarterly: toNumber(row.priceQuarterly),
      priceYearly: toNumber(row.priceYearly),
      notes: toNullable(row.notes),
    }

    const existing = await prismaAny.clientProduct.findFirst({
      where: { clientId: client.id, productId: product.id },
    })

    const clientProduct = existing
      ? await prismaAny.clientProduct.update({ where: { id: existing.id }, data: payload })
      : await prismaAny.clientProduct.create({ data: payload })
    console.log(`${SEED_LOG_PREFIX} clientProduct ${existing ? "atualizado" : "criado"}: ${clientProduct.id} | client=${client.id} | produto=${product.name}`)

    clientProductMap.set(row.client_product_key, clientProduct)
  }

  for (const row of pluginRows) {
    console.log(`${SEED_LOG_PREFIX} plugin contratado linha: key=${row.client_product_key} | produto=${row.productName} | plugin=${row.pluginName}`)
    const clientProduct = clientProductMap.get(row.client_product_key)
    const plugin = pluginMap.get(`${row.productName}::${row.pluginName}`)
    if (!clientProduct || !plugin) continue

    const payload = {
      clientProductId: clientProduct.id,
      productPluginId: plugin.id,
      priceMonthly: toNumber(row.priceMonthly),
      priceQuarterly: toNumber(row.priceQuarterly),
      priceYearly: toNumber(row.priceYearly),
      notes: toNullable(row.notes),
    }

    const existing = await prismaAny.clientProductPlugin.findFirst({
      where: { clientProductId: clientProduct.id, productPluginId: plugin.id },
    })

    if (existing) {
      await prismaAny.clientProductPlugin.update({ where: { id: existing.id }, data: payload })
      console.log(`${SEED_LOG_PREFIX} clientProductPlugin atualizado: ${existing.id}`)
    } else {
      const created = await prismaAny.clientProductPlugin.create({ data: payload })
      console.log(`${SEED_LOG_PREFIX} clientProductPlugin criado: ${created.id}`)
    }
  }

  for (const row of serialRows) {
    console.log(`${SEED_LOG_PREFIX} serial linha: client=${row.client_key} | produto=${row.productName} | serial=${row.serial || "pendente"}`)
    const client = clientMap.get(row.client_key)
    const product = productMap.get(row.productName)
    const clientProduct = clientProductMap.get(row.client_product_key)
    if (!client || !product) continue

    const serial = row.serial.trim() || fallbackSerial(row.client_key, row.productName)
    const existing = await prismaAny.clientProductSerial.findFirst({
      where: {
        clientId: client.id,
        productId: product.id,
      },
    })

    const payload = {
      clientId: client.id,
      productId: product.id,
      clientProductId: clientProduct?.id || null,
      serial,
      expiresAt: toDate(row.expiresAt),
    }

    if (existing) {
      await prismaAny.clientProductSerial.update({ where: { id: existing.id }, data: payload })
      console.log(`${SEED_LOG_PREFIX} serial atualizado: ${existing.id} | serial=${serial}`)
    } else {
      const created = await prismaAny.clientProductSerial.create({ data: payload })
      console.log(`${SEED_LOG_PREFIX} serial criado: ${created.id} | serial=${serial}`)
    }
  }

  return unmatchedContabilities
}

async function writeUnmatchedReport(unmatchedContabilities: Map<string, string[]>) {
  await mkdir(REPORTS_DIR, { recursive: true })
  const reportPath = path.join(REPORTS_DIR, "unmatched-contabilities.json")
  const report = Array.from(unmatchedContabilities.entries()).map(([contabilityName, clientKeys]) => ({
    contabilityName,
    clientKeys,
    totalClients: clientKeys.length,
  }))
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8")
  return reportPath
}

async function main() {
  console.log(`${SEED_LOG_PREFIX} início do seed`)
  const [clients, clientProducts, clientProductPlugins, clientSerials] = await Promise.all([
    readCsv<ClientRow>("clients.csv"),
    readCsv<ClientProductRow>("client_products.csv"),
    readCsv<ClientProductPluginRow>("client_product_plugins.csv"),
    readCsv<ClientSerialRow>("client_serials.csv"),
  ])

  const contabilityMap = await loadExistingContabilities()
  const { productMap, pluginMap } = await seedProducts(clientProducts, clientProductPlugins)
  const unmatchedContabilities = await seedClients(
    clients,
    clientProducts,
    clientProductPlugins,
    clientSerials,
    contabilityMap,
    productMap,
    pluginMap,
  )

  const reportPath = await writeUnmatchedReport(unmatchedContabilities)

  console.log(`${SEED_LOG_PREFIX} Clientes processados: ${clients.length}`)
  console.log(`${SEED_LOG_PREFIX} Produtos base processados: ${productMap.size}`)
  console.log(`${SEED_LOG_PREFIX} Plugins base processados: ${pluginMap.size}`)
  console.log(`${SEED_LOG_PREFIX} Produtos contratados processados: ${clientProducts.length}`)
  console.log(`${SEED_LOG_PREFIX} Plugins contratados processados: ${clientProductPlugins.length}`)
  console.log(`${SEED_LOG_PREFIX} Seriais processados: ${clientSerials.length}`)
  console.log(`${SEED_LOG_PREFIX} Contabilidades existentes mapeadas: ${contabilityMap.size}`)
  console.log(`${SEED_LOG_PREFIX} Contabilidades não encontradas: ${unmatchedContabilities.size}`)
  console.log(`${SEED_LOG_PREFIX} Relatório: ${reportPath}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
