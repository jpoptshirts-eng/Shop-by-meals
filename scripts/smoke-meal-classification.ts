/**
 * Classification smoke tests for Shop by Meals input.
 * Run: npx vite-node scripts/smoke-meal-classification.ts
 */
import {
  classifyMealInput,
  looksLikeIngredientLine,
  looksLikeMealLine,
} from '../src/lib/mealInputClassification'
import { resolveMealIngredients } from '../src/lib/resolveMealIngredients'

function assert( cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

function run() {
  // Test A — multiple meals (exact user example)
  const a = classifyMealInput(`beef Burrito Bowl
Sheet pan fajitas
chicken burger with fries`)
  assert(a.kind === 'multiple_meals', `A kind=${a.kind}`)
  assert(a.lines.length === 3, `A lines=${a.lines.length}`)
  assert(!a.lines.some((l) => /homemade/i.test(l)), 'A must not include Homemade meal')
  for (const line of a.lines) {
    const resolved = resolveMealIngredients(line)
    assert(resolved.status === 'resolved', `A resolve failed for "${line}"`)
  }
  console.log('PASS A', a)

  // Test B — ingredients
  const b = classifyMealInput(`500g beef mince
1 onion
400g chopped tomatoes
spaghetti
parmesan`)
  assert(b.kind === 'ingredient_list', `B kind=${b.kind}`)
  console.log('PASS B', b)

  // Test C — single meal
  const c = classifyMealInput('Chicken Tikka Masala')
  assert(c.kind === 'single_meal', `C kind=${c.kind}`)
  assert(c.lines.length === 1, 'C lines')
  console.log('PASS C', c)

  // Test D — comma-separated meals
  const d = classifyMealInput('Spaghetti Bolognese, Paneer Curry, Fish Tacos')
  assert(d.kind === 'multiple_meals', `D kind=${d.kind}`)
  assert(d.lines.length === 3, `D lines=${d.lines.length}`)
  console.log('PASS D', d)

  // Heuristic sanity
  assert(looksLikeMealLine('beef Burrito Bowl'), 'meal: burrito bowl')
  assert(looksLikeMealLine('Sheet pan fajitas'), 'meal: fajitas')
  assert(looksLikeMealLine('chicken burger with fries'), 'meal: burger')
  assert(!looksLikeIngredientLine('beef Burrito Bowl'), 'not ingredient: burrito')
  assert(looksLikeIngredientLine('500g beef mince'), 'ingredient: mince')
  assert(looksLikeIngredientLine('garlic'), 'ingredient: garlic')

  console.log('ALL_CLASSIFICATION_TESTS_PASSED')
}

run()
