import fs from "node:fs"
import path from "node:path"
import XLSX from "xlsx"

const DEFAULT_FILES = [
  "/Users/sirbraga/Downloads/clientes_normalizados.xlsx",
  "/Users/sirbraga/Downloads/clientes.xlsx",
]

function stringifyCell(value: unknown) {
  if (value == null) return ""
  if (value instanceof Date) return value.toISOString()
  return String(value).trim()
}

function inspectWorkbook(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.log(`ARQUIVO_NAO_ENCONTRADO::${filePath}`)
    return
  }

  console.log(`ARQUIVO::${filePath}`)
  const workbook = XLSX.readFile(filePath, { cellDates: false })
  console.log(`ABAS::${workbook.SheetNames.join(" | ")}`)

  for (const sheetName of workbook.SheetNames.slice(0, 10)) {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<(string | number | boolean | Date)[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false,
    })

    console.log(`SHEET::${sheetName}`)

    if (rows.length === 0) {
      console.log(`SHEET_VAZIA::${sheetName}`)
      continue
    }

    const headers = (rows[0] || []).map((value) => stringifyCell(value))
    headers.forEach((header, index) => {
      console.log(`HEADER::${sheetName}::${index}::${header}`)
    })

    for (let i = 1; i < Math.min(rows.length, 6); i += 1) {
      const row = rows[i] || []
      const pairs = headers
        .map((header, index) => ({ header, value: stringifyCell(row[index]) }))
        .filter((item) => item.header && item.value)
        .map((item) => `${item.header}=${item.value}`)
      console.log(`ROW::${sheetName}::${i + 1}::${pairs.join(" | ").slice(0, 2000)}`)
    }
  }
}

function main() {
  const inputFiles = process.argv.slice(2)
  const files = inputFiles.length > 0 ? inputFiles.map((file) => path.resolve(file)) : DEFAULT_FILES
  files.forEach(inspectWorkbook)
}

main()
