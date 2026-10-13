/**
 * Minimal RFC4180-ish CSV parser for the Waitrose Quick Shop catalogue files.
 * Handles quoted fields, escaped quotes, and commas inside quotes.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text)
  if (rows.length === 0) return []
  const headers = rows[0].map((h) => h.trim())
  const out: Record<string, string>[] = []
  for (let i = 1; i < rows.length; i += 1) {
    const cells = rows[i]
    if (cells.every((c) => !c.trim())) continue
    const row: Record<string, string> = {}
    for (let c = 0; c < headers.length; c += 1) {
      const key = headers[c]
      if (!key) continue
      row[key] = (cells[c] ?? '').trim()
    }
    out.push(row)
  }
  return out
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const src = text.replace(/^\uFEFF/, '')

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]
    const next = src[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"'
        i += 1
        continue
      }
      if (ch === '"') {
        inQuotes = false
        continue
      }
      field += ch
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      row.push(field)
      field = ''
      continue
    }
    if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      continue
    }
    if (ch === '\r') {
      continue
    }
    field += ch
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}
