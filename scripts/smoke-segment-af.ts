/**
 * Segmentation smoke for Tests A–C (+ inference).
 * Run: npx vite-node scripts/smoke-segment-af.ts
 */
import {
  classifyMealInput,
  inferMealTitleFromIngredients,
} from '../src/lib/mealInputClassification'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

const A = `600g beef mince
1 large onion
3 carrots
2 celery sticks
2 cloves garlic`

const B = `Spaghetti Bolognese
Chicken Curry
Sunday Roast`

const C = `Spaghetti Bolognese
Chicken Curry
Sunday Roast

600g beef mince
1 large onion
3 carrots
2 celery sticks
2 cloves garlic`

const a = classifyMealInput(A)
assert(a.kind === 'ingredient_list', `A kind=${a.kind}`)
assert(a.units.length === 1, `A units=${a.units.length}`)
assert(a.units[0].type === 'ingredient_block', 'A unit type')
console.log('PASS A', a.units[0].type === 'ingredient_block' ? a.units[0].title : '')

const b = classifyMealInput(B)
assert(b.kind === 'multiple_meals', `B kind=${b.kind}`)
assert(b.units.length === 3, `B units=${b.units.length}`)
assert(b.units.every((u) => u.type === 'meal_title'), 'B all titles')
console.log('PASS B', b.lines)

const c = classifyMealInput(C)
assert(c.kind === 'mixed', `C kind=${c.kind}`)
assert(c.units.length === 4, `C units=${c.units.length}`)
assert(c.units.filter((u) => u.type === 'meal_title').length === 3, 'C titles')
assert(c.units.filter((u) => u.type === 'ingredient_block').length === 1, 'C block')
console.log(
  'PASS C',
  c.units.map((u) => (u.type === 'meal_title' ? u.title : u.title)),
)

const title = inferMealTitleFromIngredients(A.split('\n'))
assert(/cottage pie|homemade meal/i.test(title), `infer=${title}`)
console.log('PASS infer', title)

console.log('ALL_SEGMENT_AF_PASSED')
