import { parseCsv } from './parseCsv'
import qs222 from '../data/catalog/QS_POP222.csv?raw'
import qs230 from '../data/catalog/QS_POP230.csv?raw'
import qs256 from '../data/catalog/QS_POP256.csv?raw'
import qs351 from '../data/catalog/QS_POP351.csv?raw'
import qs400 from '../data/catalog/QS_POP400.csv?raw'
import qs529 from '../data/catalog/QS_POP529.csv?raw'
import pop038 from '../data/catalog/Table_POP038.csv?raw'
import pop072 from '../data/catalog/Table_POP072.csv?raw'
import pop074 from '../data/catalog/Table_POP074.csv?raw'

/** Normalised product row from the combined Quick Shop CSV catalogue. */
export type CatalogueProduct = {
  id: string
  itemId?: string
  name: string
  imageUrl?: string
  size?: string
  price: number
  formattedPrice: string
  pricePerUnit?: string
  score?: number
  recommendedQuantity?: number
  category?: string
  category2?: string
  category3?: string
  productType?: string
  productTypeRecCount?: number
  offers?: string
  grouping?: string
  type?: string
  model?: string
  sourceFile: string
}

export type CatalogueStats = {
  rawRows: number
  uniqueProducts: number
  sourceFiles: string[]
}

const CATALOGUE_SOURCES: Array<{ file: string; raw: string }> = [
  { file: 'QS_POP222.csv', raw: qs222 },
  { file: 'QS_POP230.csv', raw: qs230 },
  { file: 'QS_POP256.csv', raw: qs256 },
  { file: 'QS_POP351.csv', raw: qs351 },
  { file: 'QS_POP400.csv', raw: qs400 },
  { file: 'QS_POP529.csv', raw: qs529 },
  { file: 'Table_POP038.csv', raw: pop038 },
  { file: 'Table_POP072.csv', raw: pop072 },
  { file: 'Table_POP074.csv', raw: pop074 },
]

let cachedProducts: CatalogueProduct[] | null = null
let cachedStats: CatalogueStats | null = null

function cell(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (value != null && String(value).trim() !== '') return String(value).trim()
  }
  const lowerMap = new Map(Object.keys(row).map((k) => [k.toLowerCase(), k]))
  for (const key of keys) {
    const actual = lowerMap.get(key.toLowerCase())
    if (actual != null && row[actual]?.trim()) return row[actual].trim()
  }
  return ''
}

export function parsePriceText(raw: string | null | undefined): number {
  if (raw == null || raw === '') return 0
  const s = String(raw).replace(/,/g, '').replace(/\s/g, '').trim()
  if (!s) return 0
  if (s.startsWith('£')) {
    const n = Number.parseFloat(s.slice(1))
    return Number.isFinite(n) ? n : 0
  }
  if (s.endsWith('p')) {
    const n = Number.parseFloat(s.slice(0, -1))
    return Number.isFinite(n) ? n / 100 : 0
  }
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function parseOptionalNumber(raw: string | null | undefined): number | undefined {
  if (raw == null || String(raw).trim() === '') return undefined
  const n = Number.parseFloat(String(raw).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : undefined
}

/** Deterministic non-cryptographic hash for stable IDs without item_id. */
function stableHash(input: string): string {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

function makeProductId(sourceFile: string, itemId: string, name: string, size: string, imageUrl: string): string {
  if (itemId) return `item-${itemId}`
  const key = [sourceFile, name, size, imageUrl].join('|').toLowerCase()
  return `csv-${stableHash(key)}`
}

function normaliseDedupKey(name: string, size: string, imageUrl: string): string {
  return [name, size, imageUrl]
    .map((v) =>
      v
        .toLowerCase()
        .normalize('NFKC')
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9\s./-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .join('|')
}

function rowToProduct(row: Record<string, string>, sourceFile: string): CatalogueProduct | null {
  const name = cell(row, 'Name')
  if (!name) return null

  const itemId = cell(row, 'item_id')
  const size = cell(row, 'Size')
  const imageUrl = cell(row, 'imageUrl')
  const priceRaw = cell(row, 'Price')
  const price = parsePriceText(priceRaw)

  return {
    id: makeProductId(sourceFile, itemId, name, size, imageUrl),
    itemId: itemId || undefined,
    name,
    imageUrl: imageUrl || undefined,
    size: size || undefined,
    price,
    formattedPrice: priceRaw || (price > 0 ? `£${price.toFixed(2)}` : ''),
    pricePerUnit: cell(row, 'Formatted PPU') || undefined,
    score: parseOptionalNumber(cell(row, 'score')),
    recommendedQuantity: parseOptionalNumber(cell(row, 'Recommended Quantity')),
    category: cell(row, 'Category') || undefined,
    category2: cell(row, 'Other Category 1') || undefined,
    category3: cell(row, 'Other Category 2') || undefined,
    productType: cell(row, 'Product Type') || undefined,
    productTypeRecCount: parseOptionalNumber(cell(row, 'Product Type Rec Count')),
    offers: cell(row, 'Offers') || undefined,
    grouping: cell(row, 'Grouping') || undefined,
    type: cell(row, 'Type') || undefined,
    model: cell(row, 'Model') || undefined,
    sourceFile,
  }
}

function mergeDuplicate(existing: CatalogueProduct, incoming: CatalogueProduct): CatalogueProduct {
  const existingScore = existing.score ?? -1
  const incomingScore = incoming.score ?? -1
  const preferred = incomingScore > existingScore ? incoming : existing
  const other = preferred === incoming ? existing : incoming
  return {
    ...other,
    ...preferred,
    id: preferred.itemId ? preferred.id : other.itemId ? other.id : preferred.id,
    score: Math.max(existingScore, incomingScore) >= 0 ? Math.max(existingScore, incomingScore) : undefined,
    itemId: preferred.itemId ?? other.itemId,
    imageUrl: preferred.imageUrl || other.imageUrl,
    pricePerUnit: preferred.pricePerUnit || other.pricePerUnit,
    offers: preferred.offers || other.offers,
    productType: preferred.productType || other.productType,
    category: preferred.category || other.category,
    category2: preferred.category2 || other.category2,
    category3: preferred.category3 || other.category3,
    grouping: preferred.grouping || other.grouping,
    type: preferred.type || other.type,
  }
}

function buildCatalogue(): { products: CatalogueProduct[]; stats: CatalogueStats } {
  const byItemId = new Map<string, CatalogueProduct>()
  const byFingerprint = new Map<string, CatalogueProduct>()
  let rawRows = 0

  for (const source of CATALOGUE_SOURCES) {
    const rows = parseCsv(source.raw)
    rawRows += rows.length
    for (const row of rows) {
      const product = rowToProduct(row, source.file)
      if (!product) continue

      const fp = normaliseDedupKey(product.name, product.size ?? '', product.imageUrl ?? '')

      if (product.itemId) {
        const prevById = byItemId.get(product.itemId)
        const merged = prevById ? mergeDuplicate(prevById, product) : product
        byItemId.set(product.itemId, merged)
        // Keep fingerprint aligned so later non-id rows can merge into the same product.
        const prevFp = byFingerprint.get(fp)
        byFingerprint.set(fp, prevFp ? mergeDuplicate(prevFp, merged) : merged)
        continue
      }

      const prevFp = byFingerprint.get(fp)
      byFingerprint.set(fp, prevFp ? mergeDuplicate(prevFp, product) : product)
    }
  }

  // Prefer item_id identity; add fingerprint-only products that never had an item_id.
  const claimedFingerprints = new Set<string>()
  const unique: CatalogueProduct[] = []

  for (const product of byItemId.values()) {
    unique.push(product)
    claimedFingerprints.add(normaliseDedupKey(product.name, product.size ?? '', product.imageUrl ?? ''))
  }
  for (const [fp, product] of byFingerprint) {
    if (claimedFingerprints.has(fp)) continue
    if (product.itemId && byItemId.has(product.itemId)) continue
    unique.push(product)
    claimedFingerprints.add(fp)
  }

  unique.sort((a, b) => a.name.localeCompare(b.name, 'en-GB') || (b.score ?? 0) - (a.score ?? 0))

  return {
    products: unique,
    stats: {
      rawRows,
      uniqueProducts: unique.length,
      sourceFiles: CATALOGUE_SOURCES.map((s) => s.file),
    },
  }
}

/** Load (once) the combined, deduplicated CSV product catalogue. */
export function getCsvCatalogue(): CatalogueProduct[] {
  if (!cachedProducts) {
    const built = buildCatalogue()
    cachedProducts = built.products
    cachedStats = built.stats
  }
  return cachedProducts
}

export function getCsvCatalogueStats(): CatalogueStats {
  if (!cachedStats) getCsvCatalogue()
  return cachedStats!
}

/** Search haystack across the strongest catalogue fields. */
export function catalogueSearchText(product: CatalogueProduct): string {
  return [
    product.name,
    product.productType,
    product.category3,
    product.category2,
    product.category,
    product.grouping,
    product.type,
  ]
    .filter(Boolean)
    .join(' ')
}
