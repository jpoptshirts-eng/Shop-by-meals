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

  // Test A — Chilli + Pad Thai must be two meals with recipes
  const chilliPad = classifyMealInput(`Chilli Con Carne
Pad Thai`)
  assert(chilliPad.kind === 'multiple_meals', `chilliPad kind=${chilliPad.kind}`)
  assert(chilliPad.lines.length === 2, `chilliPad lines=${chilliPad.lines.length}`)
  for (const line of chilliPad.lines) {
    const resolved = resolveMealIngredients(line)
    assert(resolved.status === 'resolved', `recipe missing for "${line}"`)
    assert(!/homemade/i.test(resolved.status === 'resolved' ? resolved.mealName : ''), 'no homemade')
  }
  console.log('PASS chilli+pad', chilliPad)

  // Test B — three bowls/fajitas/burger meals
  const three = classifyMealInput(`Beef Burrito Bowl
Sheet Pan Fajitas
Chicken Burger with Fries`)
  assert(three.kind === 'multiple_meals', `three kind=${three.kind}`)
  assert(three.lines.length === 3, `three lines=${three.lines.length}`)
  for (const line of three.lines) {
    assert(resolveMealIngredients(line).status === 'resolved', `recipe for "${line}"`)
  }
  console.log('PASS three meals', three)

  // Test C — ingredient list → Homemade (or inferred title), never multi-meal
  const ings = classifyMealInput(`500g beef mince
1 onion
400g tomatoes
rice`)
  assert(ings.kind === 'ingredient_list', `ings kind=${ings.kind}`)
  console.log('PASS ingredient list', ings)

  // Mixed titles + ingredient block → separate units (segment-first)
  const mixedTitlesBlock = classifyMealInput(`Spaghetti Bolognese
Chicken Curry
Sunday Roast

600g beef mince
1 large onion
3 carrots
2 celery sticks
2 cloves garlic`)
  assert(mixedTitlesBlock.kind === 'mixed', `mixed kind=${mixedTitlesBlock.kind}`)
  assert(mixedTitlesBlock.units.length === 4, `mixed units=${mixedTitlesBlock.units.length}`)
  assert(
    mixedTitlesBlock.units.filter((u) => u.type === 'meal_title').length === 3,
    'mixed titles',
  )
  assert(
    mixedTitlesBlock.units.filter((u) => u.type === 'ingredient_block').length === 1,
    'mixed block',
  )
  console.log('PASS mixed titles+block', mixedTitlesBlock)

  // Shopping list groceries + one meal title → meal title kept; pantry lines may form a block
  const mixedShop = classifyMealInput(`Organic Milk
Eggs
Sourdough Bread
Cereal
OJ
Tomatoes
Onions
Spag Bol`)
  assert(
    mixedShop.units.some(
      (u) => u.type === 'meal_title' && /spag|bolognese/i.test(u.title),
    ),
    `mixedShop missing Spag Bol: ${JSON.stringify(mixedShop.units)}`,
  )
  console.log('PASS mixed shop list', mixedShop)

  // Alias tolerance
  for (const alias of ['chilli', 'chili con carne', 'padthai', 'spag bol', 'fajitas']) {
    const r = resolveMealIngredients(alias)
    assert(r.status === 'resolved', `alias "${alias}" unresolved`)
  }
  console.log('PASS aliases')

  console.log('ALL_CLASSIFICATION_TESTS_PASSED')
}

run()
