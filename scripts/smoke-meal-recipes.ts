/**
 * Local smoke test: meal → ingredients → CSV catalogue matches.
 * Run: npx vite-node scripts/smoke-meal-recipes.ts
 */
import { resolveMealIngredients } from '../src/lib/resolveMealIngredients'
import { isRecipeCatalogHit } from '../src/lib/recipeIngredientMatch'
import { topCatalogMatches } from '../src/lib/catalogMatch'
import { loadCatalogForBuildShop } from '../src/lib/waitroseCatalog'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

const meals = [
  'Chilli Con Carne',
  'Spaghetti Bolognese',
  'Sunday Roast',
  'Fish Pie',
  'Burger and Chips',
  'Bircher Muesli',
]

const { primary } = await loadCatalogForBuildShop()
assert(primary.products.length > 0, 'catalogue empty')

for (const meal of meals) {
  const resolved = resolveMealIngredients(meal)
  assert(resolved.status === 'resolved', `unresolved ${meal}`)
  if (resolved.status !== 'resolved') continue
  let ok = 0
  for (const ing of resolved.ingredients) {
    const hits = topCatalogMatches(ing.name, primary.products, 20).filter((h) =>
      isRecipeCatalogHit(ing, h),
    )
    if (hits[0]) ok += 1
  }
  console.log(meal, `${ok}/${resolved.ingredients.length}`)
  assert(ok > 0, `no matches for ${meal}`)
}

console.log('ALL_MEAL_RECIPE_SMOKES_PASSED')
