import fs from "node:fs"
import path from "node:path"
import XLSX from "xlsx"

type NormalizedRow = {
  type: string
  name: string
  nomeFantasia: string
  razaoSocial: string
  cnpj: string
  cpf: string
  ie: string
  cnae: string
  businessSector: string
  ownerName: string
  ownerPhone: string
  ownerEmail: string
  address: string
  houseNumber: string
  complement: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  codigoCSC: string
  serial: string
  contabilityName: string
  services: string
  aditionalInfo: string
  hasContract: string
  statusOriginal: string
  documentoOriginal: string
  nomeFantasiaOriginal: string
  razaoSocialOriginal: string
}

type ClientCsvRow = {
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

type ClientProductCsvRow = {
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

type ClientProductPluginCsvRow = {
  client_product_key: string
  productName: string
  pluginName: string
  priceMonthly: string
  priceQuarterly: string
  priceYearly: string
  notes: string
}

type ClientSerialCsvRow = {
  client_product_key: string
  client_key: string
  productName: string
  serial: string
  expiresAt: string
}

const INPUT_FILE = "/Users/sirbraga/Downloads/clientes_normalizados.xlsx"
const OUTPUT_DIR = "/Users/sirbraga/Downloads/clientes_seed_csv"
const SHEET_NAME = "clientes_normalizados"
const SERIAL_EXPIRES = "2026-12-31"
const LOG = "[refine-clientes-seed]"

const KNOWN_SERIAL_PRODUCTS = new Set([
  "ZWEB Standard",
  "ZWEB Premium",
  "ZWEB Essential",
  "Clipp PRO",
  "Clipp 360",
  "Híper",
  "Comanda 10",
  "HOST",
  "Connect Plug",
  "Sistema MV",
])

const PRODUCT_RENAMES = new Map<string, string>([
  ["HOTLINE", "HOST"],
  ["HOST", "HOST"],
  ["CPLUG", "Connect Plug"],
  ["CONNECT PLUG", "Connect Plug"],
  ["CLIPP PRO", "Clipp PRO"],
  ["CLIPP 360", "Clipp 360"],
  ["CLIPP FACIL", "Clipp Fácil"],
  ["CLIPP FÁCIL", "Clipp Fácil"],
  ["GRFOOD", "GR Food"],
  ["GR FOOD", "GR Food"],
  ["COMANDA10", "Comanda 10"],
  ["COMANDA 10", "Comanda 10"],
  ["HIPER", "Híper"],
  ["HÍPER", "Híper"],
  ["BACKUP", "Backup"],
  ["MANUTENCAO", "Manutenção"],
  ["MANUNTENÇÃO", "Manutenção"],
  ["MANUTENÇÃO", "Manutenção"],
])

const ZWEB_PLUGIN_MAP = new Map<string, string>([
  ["SINTEGRA", "Plugin Sintegra"],
  ["VENDA GERENCIAL", "Plugin Venda Gerencial"],
  ["VENDAGERENCIAL", "Plugin Venda Gerencial"],
  ["INTEGRA", "Plugin Integra"],
  ["IFOOD", "Plugin iFood"],
  ["DELIVERY", "Plugin Delivery"],
  ["PIX", "Plugin Pix"],
  ["BALANCA", "Plugin Balança"],
  ["BALANÇA", "Plugin Balança"],
])

function normalizeText(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ")
}

function digits(value: unknown) {
  return normalizeText(value).replace(/\D+/g, "")
}

function plain(value: unknown) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
}

function cleanPhone(value: unknown) {
  const raw = digits(value)
  return raw === "0" ? "" : raw
}

function cleanObservation(value: unknown) {
  return normalizeText(value)
    .replace(/\s*[,;|]+\s*/g, " | ")
    .replace(/(\s*\|\s*){2,}/g, " | ")
    .trim()
}

function csvEscape(value: unknown) {
  const text = String(value ?? "")
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function writeCsv(filePath: string, rows: Record<string, unknown>[]) {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : []
  const lines = [headers.join(",")]
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header] ?? "")).join(","))
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf-8")
}

function splitServices(value: unknown) {
  return normalizeText(value)
    .split(/\s*\/\s*|\s*;\s*|\s*\|\s*/)
    .map((item) => normalizeText(item))
    .filter(Boolean)
}

function normalizeProductName(serviceName: string) {
  const upper = plain(serviceName)
  if (PRODUCT_RENAMES.has(upper)) return PRODUCT_RENAMES.get(upper)!
  if (upper.startsWith("ZWEB STANDARD")) return "ZWEB Standard"
  if (upper.startsWith("ZWEB PREMIUM")) return "ZWEB Premium"
  if (upper.startsWith("ZWEB ESSENTIAL")) return "ZWEB Essential"
  if (upper.startsWith("SISTEMA MV")) return "Sistema MV"
  return normalizeText(serviceName)
}

function extractServices(servicesValue: unknown) {
  const baseProducts: string[] = []
  const pluginsByProduct = new Map<string, string[]>()
  const installationByProduct = new Map<string, string>()

  for (const service of splitServices(servicesValue)) {
    const upper = plain(service)

    if (upper.startsWith("ZWEB PLUG")) {
      const suffix = upper.replace(/^ZWEB PLUG\s*/, "").trim()
      const pluginName = ZWEB_PLUGIN_MAP.get(suffix) || `Plugin ${normalizeText(suffix)}`
      const productName = "ZWEB Standard"
      if (!baseProducts.includes(productName)) baseProducts.push(productName)
      const plugins = pluginsByProduct.get(productName) || []
      if (!plugins.includes(pluginName)) plugins.push(pluginName)
      pluginsByProduct.set(productName, plugins)
      continue
    }

    const normalized = normalizeProductName(service)
    if (!baseProducts.includes(normalized)) baseProducts.push(normalized)

    if (normalized === "Sistema MV") {
      if (upper.includes("LOCAL")) installationByProduct.set(normalized, "LOCAL")
      else if (upper.includes("SERVIDOR")) installationByProduct.set(normalized, "SERVIDOR")
      else installationByProduct.set(normalized, "ONLINE")
    }
  }

  return { baseProducts, pluginsByProduct, installationByProduct }
}

function inferSerialProduct(baseProducts: string[], serial: string) {
  if (!serial) return null
  if (baseProducts.length === 0) return null
  const known = baseProducts.find((product) => KNOWN_SERIAL_PRODUCTS.has(product))
  return known || baseProducts[0]
}

function isCancelledStatus(statusOriginal: string) {
  const status = normalizeText(statusOriginal).toLowerCase()
  return status === "cancelado"
}

function hasMonthlyContract(hasContract: string, statusOriginal: string) {
  if (isCancelledStatus(statusOriginal)) return false
  return normalizeText(hasContract).toUpperCase() === "TRUE"
}

function readRows(): NormalizedRow[] {
  const workbook = XLSX.readFile(INPUT_FILE, { cellDates: false })
  const targetSheetName = workbook.SheetNames.includes(SHEET_NAME) ? SHEET_NAME : workbook.SheetNames[0]
  const sheet = workbook.Sheets[targetSheetName]
  return XLSX.utils.sheet_to_json<NormalizedRow>(sheet, { defval: "", raw: false })
}

function main() {
  console.log(`${LOG} lendo planilha normalizada ${INPUT_FILE}`)
  const rows = readRows()
  console.log(`${LOG} linhas encontradas: ${rows.length}`)

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const clients: ClientCsvRow[] = []
  const clientProducts: ClientProductCsvRow[] = []
  const clientProductPlugins: ClientProductPluginCsvRow[] = []
  const clientSerials: ClientSerialCsvRow[] = []
  const serialProductsSeen = new Set<string>()

  for (const row of rows) {
    const clientKey = digits(row.cnpj || row.cpf || row.documentoOriginal || row.name)
    if (!clientKey) continue

    const cancelled = isCancelledStatus(row.statusOriginal)
    const monthlyContract = hasMonthlyContract(row.hasContract, row.statusOriginal)
    const { baseProducts, pluginsByProduct, installationByProduct } = extractServices(row.services)
    const serial = normalizeText(row.serial)
    const serialProduct = inferSerialProduct(baseProducts, serial)
    if (serialProduct) serialProductsSeen.add(serialProduct)

    clients.push({
      client_key: clientKey,
      type: normalizeText(row.type) || (row.cnpj ? "PJ" : "PF"),
      name: normalizeText(row.name),
      razaoSocial: normalizeText(row.razaoSocial),
      nomeFantasia: normalizeText(row.nomeFantasia),
      cnpj: digits(row.cnpj),
      cpf: digits(row.cpf),
      ie: digits(row.ie),
      cnae: digits(row.cnae),
      businessSector: normalizeText(row.businessSector),
      address: normalizeText(row.address),
      houseNumber: normalizeText(row.houseNumber),
      neighborhood: normalizeText(row.neighborhood),
      city: normalizeText(row.city),
      state: normalizeText(row.state),
      zipCode: digits(row.zipCode),
      complement: normalizeText(row.complement),
      codigoCSC: normalizeText(row.codigoCSC),
      ownerName: normalizeText(row.ownerName),
      ownerPhone: cleanPhone(row.ownerPhone),
      ownerEmail: normalizeText(row.ownerEmail).toLowerCase(),
      ownerCpf: "",
      phone: cleanPhone(row.ownerPhone),
      email: normalizeText(row.ownerEmail).toLowerCase(),
      aditionalInfo: cleanObservation(row.aditionalInfo),
      hasContract: monthlyContract ? "true" : "false",
      statusOriginal: normalizeText(row.statusOriginal),
      contractTypeHint: cancelled ? "CANCELADO" : monthlyContract ? "MENSAL" : "",
      supportReleasedHint: cancelled ? "false" : "true",
      contabilityRaw: normalizeText(row.contabilityName),
    })

    for (const productName of baseProducts) {
      const hasSerialControl = serialProductsSeen.has(productName) || KNOWN_SERIAL_PRODUCTS.has(productName) || serialProduct === productName
      const clientProductKey = `${clientKey}::${productName}`
      clientProducts.push({
        client_key: clientKey,
        client_product_key: clientProductKey,
        productName,
        installationType: installationByProduct.get(productName) || "",
        priceMonthly: "",
        priceQuarterly: "",
        priceYearly: "",
        notes: cleanObservation(row.aditionalInfo),
        hasSerialControl: hasSerialControl ? "true" : "false",
      })

      for (const pluginName of pluginsByProduct.get(productName) || []) {
        clientProductPlugins.push({
          client_product_key: clientProductKey,
          productName,
          pluginName,
          priceMonthly: "",
          priceQuarterly: "",
          priceYearly: "",
          notes: "",
        })
      }
    }

    if (serialProduct) {
      clientSerials.push({
        client_product_key: `${clientKey}::${serialProduct}`,
        client_key: clientKey,
        productName: serialProduct,
        serial,
        expiresAt: SERIAL_EXPIRES,
      })
    }
  }

  const dedupeBy = <T extends Record<string, unknown>>(items: T[], keyFactory: (item: T) => string) => {
    const map = new Map<string, T>()
    for (const item of items) map.set(keyFactory(item), item)
    return Array.from(map.values())
  }

  const dedupedClients = dedupeBy(clients, (item) => String(item.client_key))
  const dedupedClientProducts = dedupeBy(clientProducts, (item) => String(item.client_product_key))
  const dedupedClientProductPlugins = dedupeBy(clientProductPlugins, (item) => `${item.client_product_key}::${item.pluginName}`)
  const dedupedClientSerials = dedupeBy(clientSerials, (item) => `${item.client_product_key}::${item.serial || "PENDENTE"}`)

  writeCsv(path.join(OUTPUT_DIR, "clients.csv"), dedupedClients)
  writeCsv(path.join(OUTPUT_DIR, "client_products.csv"), dedupedClientProducts)
  writeCsv(path.join(OUTPUT_DIR, "client_product_plugins.csv"), dedupedClientProductPlugins)
  writeCsv(path.join(OUTPUT_DIR, "client_serials.csv"), dedupedClientSerials)

  console.log(`${LOG} clientes: ${dedupedClients.length}`)
  console.log(`${LOG} produtos contratados: ${dedupedClientProducts.length}`)
  console.log(`${LOG} plugins contratados: ${dedupedClientProductPlugins.length}`)
  console.log(`${LOG} seriais: ${dedupedClientSerials.length}`)
  console.log(`${LOG} arquivos gerados em ${OUTPUT_DIR}`)
}

main()
