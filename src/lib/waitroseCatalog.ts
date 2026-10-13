import {
  catalogueSearchText,
  getCsvCatalogue,
  getCsvCatalogueStats,
  type CatalogueProduct,
} from './csvCatalogue'

export type WaitroseCatalogItem = {
  id: string
  name: string
  price: number
  unitPrice: string
  imageUrl: string
  productUrl: string
  productType?: string
  /** Range / model metadata when present in the CSV. */
  range?: string
  grouping?: string
  /** CSV `Type` column (legacy field name: catalogType). */
  catalogType?: string
  /** @deprecated Use catalogType — kept for older call sites during transition. */
  popmasType?: string
  organic?: boolean
  offers?: string
  category?: string
  category2?: string
  category3?: string
  /** Recommendation score from the Quick Shop CSV (tie-breaker only). */
  score?: number
}

export type WaitroseCatalogPayload = {
  source: string
  fetchedAt: string
  count: number
  products: WaitroseCatalogItem[]
}

export type BuildShopCatalogPayload = {
  primary: WaitroseCatalogPayload
  fallback: WaitroseCatalogPayload | null
}

export type EssentialFromCatalog = {
  id: string
  name: string
  price: number
  unitPrice: string
  qty: number
  selected: boolean
  image: string
}

/** Resolve a catalogue imageUrl into a displayable thumbnail value. */
export function catalogProductImage(imageUrl: string | null | undefined): string {
  const url = imageUrl?.trim() ?? ''
  return url.startsWith('http') ? url : '🛒'
}

function toWaitroseItem(product: CatalogueProduct): WaitroseCatalogItem {
  const size = product.size?.trim() ?? ''
  const displayName = size ? `${product.name} (${size})` : product.name
  const catalogType = product.type?.trim() || undefined
  return {
    id: product.id,
    name: displayName,
    price: product.price,
    unitPrice: product.pricePerUnit?.trim() || size || '—',
    imageUrl: product.imageUrl?.trim() || '',
    productUrl: '',
    productType: product.productType,
    range: product.model?.trim() || undefined,
    grouping: product.grouping,
    catalogType,
    popmasType: catalogType,
    offers: product.offers,
    category: product.category,
    category2: product.category2,
    category3: product.category3,
    score: product.score,
  }
}

function buildPayload(): WaitroseCatalogPayload {
  const products = getCsvCatalogue().map(toWaitroseItem)
  const stats = getCsvCatalogueStats()
  return {
    source: `local-csv:${stats.sourceFiles.length} files (${stats.uniqueProducts} products)`,
    fetchedAt: new Date().toISOString(),
    count: products.length,
    products,
  }
}

let cachedPayload: WaitroseCatalogPayload | null = null

function loadLocalCatalogue(): WaitroseCatalogPayload {
  if (!cachedPayload) {
    cachedPayload = buildPayload()
    if (cachedPayload.products.length === 0) {
      throw new Error('We couldn\'t load products. Please try again.')
    }
  }
  return cachedPayload
}

/**
 * Load the product catalogue (local CSV bundle).
 * Cached in memory after first call — safe to call from UI handlers repeatedly.
 */
export async function loadWaitroseGroceriesCatalog(): Promise<WaitroseCatalogPayload> {
  try {
    return loadLocalCatalogue()
  } catch (error) {
    console.error('[catalogue] failed to load CSV catalogue', error)
    throw new Error('We couldn\'t load products. Please try again.')
  }
}

/**
 * Build-shop retrieval: local CSV catalogue as primary.
 * No network / Supabase dependency.
 */
export async function loadCatalogForBuildShop(): Promise<BuildShopCatalogPayload> {
  const primary = await loadWaitroseGroceriesCatalog()
  return { primary, fallback: null }
}

/** Map catalog rows into essentials. */
export function mapWaitroseCatalogToEssentials(
  products: WaitroseCatalogItem[],
  maxItems = 4000,
): EssentialFromCatalog[] {
  return products.slice(0, maxItems).map((p, i) => ({
    id: String(p.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120) || `row-${i}`,
    name: p.name,
    price: Math.max(0, p.price),
    unitPrice: p.unitPrice?.trim() || '—',
    qty: 1,
    selected: true,
    image: catalogProductImage(p.imageUrl),
  }))
}

/** Multi-field search text for a catalog item (name + type + categories). */
export function catalogItemSearchText(product: WaitroseCatalogItem): string {
  return [
    product.name,
    product.productType,
    product.category3,
    product.category2,
    product.category,
    product.grouping,
    product.catalogType ?? product.popmasType,
  ]
    .filter(Boolean)
    .join(' ')
}

export { catalogueSearchText, getCsvCatalogueStats }
