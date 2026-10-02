import type { Cuisine, RecipeIngredient } from './mealRecipes'

/**
 * Meal-family registry: colloquial dish names → preferred Waitrose recipe
 * reference (by id) + curated fallback ingredients.
 *
 * Used when exact Waitrose titles are too specific
 * (e.g. "Clementine, cranberry & pecan Bircher muesli").
 */
export type MealFamily = {
  id: string
  /** Stable family key, e.g. "fish-pie". */
  family: string
  displayName: string
  cuisine: Cuisine
  aliases: string[]
  /** High-signal tokens; presence strongly indicates this family. */
  strongTokens: string[]
  /** Extra tokens that boost confidence when combined with strong tokens. */
  supportingTokens?: string[]
  /** If any of these appear, skip this family (protein/diet disambiguation). */
  excludeTokens?: string[]
  /** Prefer this WaitroseRecipeReference.id when present. */
  preferredRecipeId?: string
  sourceUrl?: string
  fallbackIngredients: RecipeIngredient[]
}

function ing(name: string, required = true, synonyms?: string[]): RecipeIngredient {
  return { name, required, ...(synonyms ? { synonyms } : {}) }
}

export const MEAL_FAMILIES: MealFamily[] = [
  {
    id: 'family-bircher-muesli',
    family: 'bircher-muesli',
    displayName: 'Bircher Muesli',
    cuisine: 'British',
    aliases: [
      'bircher muesli',
      'bircher',
      'bircher breakfast',
      'overnight bircher',
      'overnight bircher muesli',
      'bircher oats',
      'clementine cranberry pecan bircher muesli',
      'clementine cranberry and pecan bircher muesli',
    ],
    strongTokens: ['bircher'],
    supportingTokens: ['muesli', 'oats', 'overnight', 'breakfast', 'cranberry', 'pecan'],
    preferredRecipeId: 'bircher-muesli',
    sourceUrl: 'https://www.waitrose.com/ecom/recipe/clementine-cranberry-pecan-bircher-muesli',
    fallbackIngredients: [
      ing('porridge oats', true, ['rolled oats', 'oats', 'jumbo oats']),
      ing('apple', true, ['eating apple', 'braeburn apple']),
      ing('milk', true, ['semi skimmed milk', 'whole milk']),
      ing('natural yoghurt', true, ['greek yoghurt', 'yogurt', 'natural yogurt']),
      ing('pumpkin seeds', true, ['mixed seeds']),
      ing('dried cranberries', true, ['dried fruit', 'raisins', 'sultanas']),
      ing('pecan nuts', false, ['pecans', 'mixed nuts', 'walnuts']),
      ing('ground cinnamon', false, ['cinnamon']),
    ],
  },
  {
    id: 'family-fish-pie',
    family: 'fish-pie',
    displayName: 'Fish Pie',
    cuisine: 'British',
    aliases: [
      'fish pie',
      'classic fish pie',
      'easy fish pie',
      'fish and potato pie',
      'fish potato pie',
      'the best fish pie',
      'creamy fish pie',
    ],
    strongTokens: ['fish pie'],
    supportingTokens: ['pie', 'fish', 'prawn', 'salmon', 'haddock', 'cod'],
    // Avoid matching plain "fish and chips"
    excludeTokens: ['chips', 'fries', 'battered'],
    preferredRecipeId: 'fish-pie',
    sourceUrl: 'https://www.waitrose.com/ecom/recipe/fish-pie',
    fallbackIngredients: [
      ing('potatoes', true, ['floury potatoes', 'maris piper potatoes', 'mashed potatoes']),
      ing('fish pie mix', true, ['smoked fish pie mix', 'fish mix', 'white fish']),
      ing('prawns', false, ['king prawns', 'cooked prawns']),
      ing('leeks', true, ['leek']),
      ing('garlic', false),
      ing('milk', true, ['semi skimmed milk']),
      ing('butter', true),
      ing('plain flour', false, ['flour']),
      ing('cheddar cheese', true, ['mature cheddar', 'cheese']),
      ing('dijon mustard', false, ['mustard', 'english mustard']),
    ],
  },
  {
    id: 'family-burger-and-chips',
    family: 'burger-and-chips',
    displayName: 'Burger and Chips',
    cuisine: 'British',
    aliases: [
      'burger and chips',
      'burger with chips',
      'burger and fries',
      'burger with fries',
      'burger chips',
      'burger fries',
      'beef burger',
      'beef burger and chips',
      'beef burger with chips',
      'beef burger and fries',
      'beef burger with fries',
      'cheeseburger',
      'cheeseburger with fries',
      'cheeseburger with chips',
      'cheeseburger and chips',
      'cheeseburger and fries',
      'essential burger',
      'burger',
      'burgers',
    ],
    strongTokens: ['burger', 'cheeseburger'],
    supportingTokens: ['chips', 'fries', 'bun', 'beef', 'cheese'],
    excludeTokens: ['chicken', 'veggie', 'vegetarian', 'plant', 'turkey', 'lamb'],
    preferredRecipeId: 'burger-and-chips',
    sourceUrl: 'https://www.waitrose.com/ecom/recipe/essential-burger',
    fallbackIngredients: [
      ing('beef mince', true, ['minced beef', 'burger patties', 'beef burgers', '4oz beef burgers']),
      ing('burger buns', true, ['brioche burger buns', 'sesame burger buns']),
      ing('cheddar cheese', false, ['burger cheese slices', 'cheese slices', 'mature cheddar']),
      ing('lettuce', true, ['iceberg lettuce']),
      ing('tomato', true, ['tomatoes']),
      ing('onion', false, ['red onion']),
      ing('tomato ketchup', false, ['ketchup', 'burger sauce', 'mayonnaise']),
      ing('oven chips', true, ['chips', 'fries', 'potato fries', 'french fries']),
    ],
  },
  {
    id: 'family-chicken-burger',
    family: 'chicken-burger',
    displayName: 'Chicken Burger with Fries',
    cuisine: 'British',
    aliases: [
      'chicken burger',
      'chicken burger and chips',
      'chicken burger with chips',
      'chicken burger and fries',
      'chicken burger with fries',
      'chicken cheeseburger',
    ],
    strongTokens: ['chicken burger'],
    supportingTokens: ['chicken', 'burger', 'chips', 'fries'],
    preferredRecipeId: 'chicken-burger-fries',
    sourceUrl: 'https://www.waitrose.com/ecom/recipe/chicken-burger',
    fallbackIngredients: [
      ing('chicken burger', true, ['chicken breast', 'breaded chicken', 'chicken fillets']),
      ing('burger buns', true, ['brioche burger buns']),
      ing('lettuce', true, ['iceberg lettuce']),
      ing('tomato', true, ['tomatoes']),
      ing('mayonnaise', false, ['mayo', 'burger sauce']),
      ing('oven chips', true, ['chips', 'fries']),
    ],
  },
  {
    id: 'family-veggie-burger',
    family: 'veggie-burger',
    displayName: 'Veggie Burger',
    cuisine: 'British',
    aliases: [
      'veggie burger',
      'vegetarian burger',
      'plant based burger',
      'plant-based burger',
      'bean burger',
      'veggie burger and chips',
      'veggie burger with fries',
    ],
    strongTokens: ['veggie burger', 'vegetarian burger'],
    supportingTokens: ['veggie', 'vegetarian', 'plant', 'burger', 'chips', 'fries'],
    preferredRecipeId: 'veggie-burger',
    sourceUrl: 'https://www.waitrose.com/ecom/recipe/veggie-burger',
    fallbackIngredients: [
      ing('veggie burgers', true, ['vegetarian burgers', 'plant based burgers', 'bean burgers']),
      ing('burger buns', true, ['brioche burger buns', 'sesame burger buns']),
      ing('lettuce', true, ['iceberg lettuce']),
      ing('tomato', true, ['tomatoes']),
      ing('onion', false, ['red onion']),
      ing('mayonnaise', false, ['burger sauce', 'mayo']),
      ing('oven chips', true, ['chips', 'fries']),
    ],
  },
  {
    id: 'family-sunday-roast',
    family: 'sunday-roast',
    displayName: 'Sunday Roast',
    cuisine: 'British',
    aliases: ['sunday roast', 'roast dinner', 'sunday dinner'],
    strongTokens: ['sunday roast', 'roast dinner'],
    supportingTokens: ['roast', 'sunday', 'yorkshire'],
    excludeTokens: ['beef', 'lamb', 'pork'],
    preferredRecipeId: 'sunday-roast',
    fallbackIngredients: [
      ing('whole chicken', true, ['roast chicken']),
      ing('potatoes', true, ['roasting potatoes']),
      ing('carrots', true),
      ing('parsnips', true),
      ing('broccoli', true),
      ing('stuffing', true, ['stuffing mix']),
      ing('yorkshire puddings', true, ['yorkshire pudding']),
      ing('gravy granules', true, ['gravy']),
    ],
  },
  {
    id: 'family-spag-bol',
    family: 'spaghetti-bolognese',
    displayName: 'Spaghetti Bolognese',
    cuisine: 'Italian',
    aliases: ['spag bol', 'spagbol', 'spaghetti bolognese', 'bolognese'],
    strongTokens: ['bolognese', 'spag bol', 'spagbol'],
    supportingTokens: ['spaghetti', 'pasta', 'mince'],
    preferredRecipeId: 'spag-bol',
    fallbackIngredients: [
      ing('spaghetti', true),
      ing('beef mince', true, ['minced beef']),
      ing('onion', true),
      ing('garlic', true),
      ing('chopped tomatoes', true, ['passata']),
      ing('tomato puree', true, ['tomato purée']),
    ],
  },
  {
    id: 'family-chilli',
    family: 'chilli-con-carne',
    displayName: 'Chilli Con Carne',
    cuisine: 'Mexican',
    aliases: ['chilli con carne', 'chili con carne', 'chilli', 'chili'],
    strongTokens: ['chilli con carne', 'chili con carne'],
    supportingTokens: ['chilli', 'chili', 'kidney', 'mince'],
    preferredRecipeId: 'chilli-con-carne',
    fallbackIngredients: [
      ing('beef mince', true, ['minced beef']),
      ing('onion', true),
      ing('garlic', true),
      ing('red kidney beans', true, ['kidney beans']),
      ing('chopped tomatoes', true),
      ing('chilli powder', true, ['chilli seasoning']),
    ],
  },
]

const FILLER_TOKENS = new Set([
  'a',
  'an',
  'the',
  'with',
  'and',
  'or',
  'of',
  'for',
  'classic',
  'easy',
  'best',
  'homemade',
  'recipe',
  'recipes',
  'dish',
  'meal',
  'dinner',
  'lunch',
  'my',
  'our',
  'some',
])

export function normalizeMealLookupKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u2019\u2018']/g, "'")
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(chips?|fries|fry)\b/g, (m) => (m.startsWith('fr') ? 'fries' : 'chips'))
    .replace(/\bburgers\b/g, 'burger')
    .replace(/\bpies\b/g, 'pie')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(key: string): string[] {
  return key
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !FILLER_TOKENS.has(t))
}

function singularizeToken(token: string): string {
  if (token.length <= 3) return token
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`
  if (token.endsWith('oes') && token.length > 4) return token.slice(0, -2)
  if (token.endsWith('ses') || token.endsWith('xes') || token.endsWith('zes')) return token.slice(0, -2)
  if (token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1)
  return token
}

function tokenSet(key: string): Set<string> {
  const out = new Set<string>()
  for (const t of tokenize(key)) {
    out.add(t)
    out.add(singularizeToken(t))
  }
  return out
}

function hasPhrase(haystack: string, phrase: string): boolean {
  const p = normalizeMealLookupKey(phrase)
  if (!p) return false
  if (haystack === p) return true
  return (` ${haystack} `).includes(` ${p} `) || haystack.includes(p)
}

function familyExcluded(family: MealFamily, key: string, tokens: Set<string>): boolean {
  for (const ex of family.excludeTokens ?? []) {
    const e = normalizeMealLookupKey(ex)
    if (!e) continue
    if (e.includes(' ')) {
      if (hasPhrase(key, e)) return true
    } else if (tokens.has(e) || tokens.has(singularizeToken(e))) {
      return true
    }
  }
  return false
}

function scoreFamily(family: MealFamily, key: string): number {
  const tokens = tokenSet(key)
  if (familyExcluded(family, key, tokens)) return 0

  for (const alias of family.aliases) {
    const a = normalizeMealLookupKey(alias)
    if (a && key === a) return 1000 + a.length
  }

  let score = 0
  for (const alias of family.aliases) {
    const a = normalizeMealLookupKey(alias)
    if (!a || a.length < 4) continue
    if (key.includes(a) || a.includes(key)) {
      score = Math.max(score, 500 + Math.min(key.length, a.length))
    }
  }

  for (const strong of family.strongTokens) {
    const s = normalizeMealLookupKey(strong)
    if (!s) continue
    if (s.includes(' ')) {
      if (hasPhrase(key, s) || key.includes(s)) score += 220
    } else if (tokens.has(s) || tokens.has(singularizeToken(s))) {
      score += 180
    }
  }

  for (const support of family.supportingTokens ?? []) {
    const s = normalizeMealLookupKey(support)
    if (!s) continue
    if (s.includes(' ')) {
      if (hasPhrase(key, s) || key.includes(s)) score += 40
    } else if (tokens.has(s) || tokens.has(singularizeToken(s))) {
      score += 35
    }
  }

  // Require at least one strong-token hit for pure token matches.
  const strongHit = family.strongTokens.some((strong) => {
    const s = normalizeMealLookupKey(strong)
    if (!s) return false
    if (s.includes(' ')) return hasPhrase(key, s) || key.includes(s)
    return tokens.has(s) || tokens.has(singularizeToken(s))
  })
  if (!strongHit && score < 500) return 0

  return score
}

/**
 * Resolve a customer meal title to a meal family.
 * Prefers exact aliases, then normalised / token similarity.
 */
export function findMealFamily(mealName: string): MealFamily | null {
  const key = normalizeMealLookupKey(mealName)
  if (!key) return null

  let best: { family: MealFamily; score: number } | null = null
  for (const family of MEAL_FAMILIES) {
    const score = scoreFamily(family, key)
    if (score <= 0) continue
    if (!best || score > best.score) best = { family, score }
  }

  // Minimum confidence: exact/near alias (500+) or strong-token match (~180+)
  if (!best || best.score < 160) return null
  return best.family
}
