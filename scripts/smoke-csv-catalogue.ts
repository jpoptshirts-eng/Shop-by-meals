/**
 * CSV catalogue smoke: load, dedupe stats, and search relevance.
 * Run: npx vite-node scripts/smoke-csv-catalogue.ts
 */
import { getCsvCatalogue, getCsvCatalogueStats } from '../src/lib/csvCatalogue'
import { loadCatalogForBuildShop } from '../src/lib/waitroseCatalog'
import { bestCatalogMatch, topCatalogMatches } from '../src/lib/catalogMatch'
import { resolveMealIngredients } from '../src/lib/resolveMealIngredients'
import { isRecipeCatalogHit } from '../src/lib/recipeIngredientMatch'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

const catalogue = getCsvCatalogue()
const stats = getCsvCatalogueStats()
console.log('STATS', stats)
assert(stats.rawRows > 1000, `rawRows too low: ${stats.rawRows}`)
assert(stats.uniqueProducts > 100, `unique too low: ${stats.uniqueProducts}`)
assert(catalogue.length === stats.uniqueProducts, 'length mismatch')

const payload = await loadCatalogForBuildShop()
const products = payload.primary.products
assert(products.length > 0, 'payload empty')
assert(!/supabase/i.test(payload.primary.source), `source still supabase: ${payload.primary.source}`)
console.log('SOURCE', payload.primary.source)

const queries = [
  'milk',
  'eggs',
  'beef mince',
  'onions',
  'garlic',
  'chopped tomatoes',
  'rice',
  'spaghetti',
  'kidney beans',
  'carrots',
]

for (const q of queries) {
  const hit = bestCatalogMatch(q, products, 0.15)
  assert(hit != null, `no match for "${q}"`)
  const hay = `${hit!.name} ${hit!.productType ?? ''} ${hit!.category3 ?? ''}`.toLowerCase()
  const token = q.split(/\s+/).sort((a, b) => b.length - a.length)[0]!.toLowerCase()
  const stem = token.replace(/s$/, '')
  const ok = hay.includes(token) || hay.includes(stem)
  assert(ok, `weak match for "${q}": ${hit!.name}`)
  console.log('SEARCH', q, '→', hit!.name)
}

const meals = [
  'Chilli Con Carne',
  'Spaghetti Bolognese',
  'Sunday Roast',
  'Fish Pie',
  'Burger and Chips',
  'Bircher Muesli',
]

for (const meal of meals) {
  const resolved = resolveMealIngredients(meal)
  assert(resolved.status === 'resolved', `recipe unresolved: ${meal}`)
  if (resolved.status !== 'resolved') continue
  let matched = 0
  for (const ing of resolved.ingredients) {
    const candidates = topCatalogMatches(ing.name, products, 40)
    const hit = candidates.find((c) => isRecipeCatalogHit(ing, c))
    if (hit) matched += 1
  }
  assert(matched > 0, `no catalogue matches for ${meal}`)
  console.log('MEAL', meal, `${matched}/${resolved.ingredients.length} matched`)
}

const mince = bestCatalogMatch('beef mince', products)
assert(mince, 'beef mince missing')
const alts = topCatalogMatches('beef mince', products, 4, mince!.name, mince!.productType)
assert(alts.length > 0, 'no swap alts')
for (const alt of alts) {
  const hay = `${alt.name} ${alt.productType ?? ''}`.toLowerCase()
  assert(/mince|beef|steak/.test(hay), `bad swap: ${alt.name}`)
}
console.log(
  'SWAP beef mince →',
  alts.map((a) => a.name).join(' | '),
)

console.log('ALL_CSV_CATALOGUE_SMOKES_PASSED')
