import { findMealFamily } from '../data/mealFamilies'
import { findMealRecipeForLine, MEAL_RECIPES } from '../data/mealRecipes'
import {
  WAITROSE_RECIPE_REFERENCES,
  findWaitroseRecipeExact,
  findWaitroseRecipeReference,
} from '../data/waitroseRecipeReferences'
import { isLikelyMealLine, getShopListLinesFromUserInput } from './parseShopList'

/** Internal classification labels — not shown in the UI. */
export type MealInputKind =
  | 'single_meal'
  | 'multiple_meals'
  | 'ingredient_list'
  | 'mixed'
  | 'unclear'

/** One independently generated meal candidate after segmentation. */
export type MealInputUnit =
  | { type: 'meal_title'; title: string }
  | { type: 'ingredient_block'; lines: string[]; title: string }

export type ClassifiedMealInput = {
  kind: MealInputKind
  /**
   * Ordered generation units. Meal titles and ingredient blocks are kept
   * separate so mixed textarea input creates the correct number of meals.
   */
  units: MealInputUnit[]
  /**
   * Flat lines for backwards-compatible callers / chip shortcuts.
   * For mixed input this is only the meal-title lines (not ingredient lines).
   */
  lines: string[]
}

const DAY_PREFIX =
  /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\s*[–—\-:]\s*/iu

const QUANTITY_PREFIX =
  /^(\d+([.,]\d+)?\s*(g|kg|ml|l|oz|lb|tbsp|tsp|cups?|cloves?|sticks?|large|small|medium|x)?|\d+\s*x\s*)/iu

/** Strong dish-structure signals (not exhaustive recipe titles). */
const DISH_STRUCTURE_SIGNALS = [
  'bowl',
  'burrito',
  'fajita',
  'taco',
  'burger',
  'fries',
  'chips',
  'curry',
  'risotto',
  'pasta',
  'lasagne',
  'lasagna',
  'casserole',
  'pie',
  'omelette',
  'omelet',
  'noodle',
  'noodles',
  'stir fry',
  'stir-fry',
  'salad',
  'soup',
  'stew',
  'roast',
  'pizza',
  'sandwich',
  'wrap',
  'kebab',
  'biryani',
  'paella',
  'ramen',
  'dhal',
  'dahl',
  'dal',
  'chilli',
  'chili',
  'bolognese',
  'carbonara',
  'pad thai',
  'padthai',
  'masala',
  'tikka',
  'korma',
  'mac and cheese',
  'macaroni',
  'sheet pan',
  'traybake',
  'tray bake',
  'with fries',
  'with chips',
  'with rice',
  'with vegetables',
  'with veg',
  'bircher',
  'muesli',
  'overnight oats',
  'overnight bircher',
]

const PANTRY_WORDS = new Set([
  'onion',
  'onions',
  'carrot',
  'carrots',
  'garlic',
  'tomato',
  'tomatoes',
  'mince',
  'beef',
  'chicken',
  'pasta',
  'spaghetti',
  'rice',
  'parmesan',
  'cheese',
  'butter',
  'oil',
  'stock',
  'herbs',
  'pepper',
  'salt',
  'lemon',
  'cream',
  'milk',
  'flour',
  'potato',
  'potatoes',
  'celery',
  'mushroom',
  'mushrooms',
  'paneer',
  'olive',
  'stick',
  'sticks',
  'clove',
  'cloves',
  'large',
  'small',
  'medium',
  'leek',
  'leeks',
  'pea',
  'peas',
  'bean',
  'beans',
  'prawn',
  'prawns',
])

function stripInvisibleAndTrim(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF\u00AD\u200E\u200F\u202A-\u202E\u2060]/g, '')
    .replace(/\u00A0/g, ' ')
    .trim()
}

function stripDayPrefix(line: string): string {
  return stripInvisibleAndTrim(line.replace(DAY_PREFIX, ''))
}

/** Dish titles that legitimately contain "and" / "&" must stay as one candidate. */
function isProtectedAndPhrase(line: string): boolean {
  const t = stripInvisibleAndTrim(line)
  if (!t) return false
  if (findMealFamily(t)) return true
  if (findWaitroseRecipeReference(t)) return true
  if (findMealRecipeForLine(t)) return true
  if (/\bmac\s*(?:and|&)\s*cheese\b/i.test(t)) return true
  if (/\bsausage\s*(?:and|&)\s*mash\b/i.test(t)) return true
  if (/\bburger\s*(?:and|&)\s*(chips|fries)\b/i.test(t)) return true
  if (/\bfish\s*(?:and|&)\s*chips\b/i.test(t)) return true
  return false
}

/** Split a single segment on commas / semicolons / " and " without breaking dish titles. */
function splitConjunctions(segment: string): string[] {
  const raw = stripInvisibleAndTrim(segment)
  if (!raw) return []
  if (isProtectedAndPhrase(raw)) return [raw]
  // Ingredient lines with quantities should stay whole ("2 celery sticks").
  if (QUANTITY_PREFIX.test(raw)) return [raw]
  return raw
    .split(/\s*(?:,|;|\band\b)\s*/iu)
    .map((s) => stripInvisibleAndTrim(s))
    .filter((s) => s.length > 0)
}

/**
 * Expand free text into candidate lines for meal / ingredient classification.
 * Supports newlines, commas, semicolons, "and", and day-prefixed meal lists.
 */
export function extractCandidateLines(text: string): string[] {
  const raw = stripInvisibleAndTrim(text)
  if (!raw) return []

  const newlineParts = raw
    .split(/\n+/u)
    .map((line) => stripDayPrefix(line))
    .filter(Boolean)

  const expanded: string[] = []
  for (const part of newlineParts) {
    const pieces = splitConjunctions(part)
    if (pieces.length > 1) {
      expanded.push(...pieces)
    } else {
      expanded.push(part)
    }
  }

  // Deduplicate while preserving order
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of expanded) {
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(line)
  }
  return out
}

function hasDishStructure(line: string): boolean {
  const lower = line.toLowerCase()
  if (DISH_STRUCTURE_SIGNALS.some((s) => lower.includes(s))) return true
  // "X with Y" dish phrasing (e.g. chicken burger with fries)
  if (/\bwith\b/.test(lower) && lower.split(/\s+/).filter(Boolean).length >= 3) return true
  return false
}

export function looksLikeIngredientLine(line: string): boolean {
  const t = stripInvisibleAndTrim(line)
  if (!t) return false
  // Meal / recipe titles are never ingredients — check before pantry heuristics.
  if (looksLikeMealLine(t)) return false
  if (QUANTITY_PREFIX.test(t)) return true
  if (hasDishStructure(t)) return false

  const words = t
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  // Single grocery noun / short pantry phrase only.
  if (words.length === 1 && PANTRY_WORDS.has(words[0])) return true
  if (words.length <= 4 && words.every((w) => PANTRY_WORDS.has(w) || /^\d/.test(w))) return true

  return false
}

export function looksLikeMealLine(line: string): boolean {
  const t = stripInvisibleAndTrim(line)
  if (!t) return false

  const words = t
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const pantryOnly =
    words.length >= 1 &&
    words.length <= 2 &&
    words.every((w) => PANTRY_WORDS.has(w))

  // Quantity-led grocery lines are ingredients even if they contain dish words ("1 pie dish").
  if (
    QUANTITY_PREFIX.test(t) &&
    !findMealFamily(t) &&
    !findWaitroseRecipeExact(t) &&
    !findMealRecipeForLine(t)
  ) {
    return false
  }

  // Exact local template / Waitrose alias.
  if (findMealRecipeForLine(t)) return true
  if (findWaitroseRecipeExact(t)) return true

  // Short pantry nouns like "spaghetti" / "parmesan" must not fuzzy-match full recipes.
  if (pantryOnly) return false

  if (findWaitroseRecipeReference(t)) return true
  if (findMealFamily(t)) return true
  if (isLikelyMealLine(t)) return true
  if (hasDishStructure(t) && !QUANTITY_PREFIX.test(t)) return true
  return false
}

type LineKind = 'meal' | 'ingredient' | 'other'

function classifyLineKind(line: string): LineKind {
  if (looksLikeMealLine(line)) return 'meal'
  if (looksLikeIngredientLine(line)) return 'ingredient'
  return 'other'
}

function normalizeIngredientToken(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u2019\u2018']/g, "'")
    .replace(/&/g, ' and ')
    .replace(QUANTITY_PREFIX, '')
    .replace(/\b(large|small|medium|fresh|chopped|diced|sliced|cloves?|sticks?|tin|can|pack)\b/gi, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Best-effort meal title from an ingredient list.
 * Scores Waitrose recipe references / local templates against normalised ingredients.
 * `Homemade meal` is ONLY appropriate when no recipe identity can be inferred.
 */
export function inferMealTitleFromIngredients(lines: string[]): string {
  const tokens = lines
    .map(normalizeIngredientToken)
    .filter(Boolean)
  if (tokens.length === 0) return 'Homemade meal'

  const hay = tokens.join(' ')

  type Candidate = { title: string; ingredients: string[] }
  const candidates: Candidate[] = []

  for (const ref of WAITROSE_RECIPE_REFERENCES) {
    candidates.push({
      title: ref.canonicalName,
      ingredients: ref.ingredients.map((i) => i.name.toLowerCase()),
    })
  }
  for (const recipe of MEAL_RECIPES) {
    candidates.push({
      title: recipe.fullName,
      ingredients: recipe.ingredients.map((i) => i.name.toLowerCase()),
    })
  }

  let bestTitle = 'Homemade meal'
  let bestScore = 0

  const hasPastaSignal = /\b(spaghetti|pasta|tagliatelle|penne|linguine)\b/.test(hay)
  const hasTomatoSignal = /\b(tomato|tomatoes|passata|puree|purée)\b/.test(hay)
  const hasMinceBase =
    /\b(beef|lamb)?\s*mince\b|\bminced\s+(beef|lamb)\b|\bbeef\s+mince\b/.test(hay) ||
    (/\bmince\b/.test(hay) && /\bbeef\b/.test(hay))
  const hasPieVeg = /\b(onion|carrot|carrots|celery|garlic|potato|potatoes|pea|peas)\b/.test(hay)

  for (const candidate of candidates) {
    let hits = 0
    for (const need of candidate.ingredients) {
      const needKey = need.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
      if (!needKey) continue
      if (hay.includes(needKey) || tokens.some((t) => t.includes(needKey) || needKey.includes(t))) {
        hits += 1
      }
    }
    if (candidate.ingredients.length === 0) continue
    const coverage = hits / candidate.ingredients.length
    // Prefer recipes where several customer ingredients overlap.
    let score = hits * 2 + coverage * 3

    // Penalise pasta dishes when the customer list has no pasta/tomato.
    if (/bolognese|spag/i.test(candidate.title) && !hasPastaSignal && !hasTomatoSignal) {
      score -= 4
    }
    // Boost cottage pie for mince + soffritto-style veg without pasta.
    if (/cottage pie/i.test(candidate.title) && hasMinceBase && hasPieVeg && !hasPastaSignal) {
      score += 3
    }

    if (score > bestScore) {
      bestScore = score
      bestTitle = candidate.title
    }
  }

  // Explicit mince + veg block without pasta/tomato → Cottage Pie family.
  if (hasMinceBase && hasPieVeg && !hasPastaSignal && !hasTomatoSignal) {
    return 'Cottage Pie'
  }

  // Require a meaningful overlap before accepting a library title.
  if (bestScore < 3.5) return 'Homemade meal'
  return bestTitle
}

/**
 * Segment textarea content into ordered meal-title / ingredient-block units.
 * Blank lines are strong separators; within a paragraph, contiguous runs of the
 * same line type become separate units.
 */
export function segmentMealInput(text: string): MealInputUnit[] {
  const raw = String(text ?? '')
  if (!stripInvisibleAndTrim(raw)) return []

  // Prefer OCR-/UI-cleaned lines when available, but rebuild from raw so blank
  // lines still act as separators for mixed title + ingredient submissions.
  const source =
    getShopListLinesFromUserInput(raw).length > 0 && !/\n\s*\n/.test(raw)
      ? getShopListLinesFromUserInput(raw).join('\n')
      : raw

  const physicalLines = source.split(/\n/).map((line) => stripDayPrefix(line))
  const paragraphs: string[][] = []
  let current: string[] = []
  for (const line of physicalLines) {
    if (!line) {
      if (current.length > 0) {
        paragraphs.push(current)
        current = []
      }
      continue
    }
    const pieces = splitConjunctions(line)
    current.push(...(pieces.length > 0 ? pieces : [line]))
  }
  if (current.length > 0) paragraphs.push(current)

  const units: MealInputUnit[] = []

  const flushIngredientRun = (run: string[]) => {
    if (run.length === 0) return
    units.push({
      type: 'ingredient_block',
      lines: run,
      title: inferMealTitleFromIngredients(run),
    })
  }

  for (const paragraph of paragraphs) {
    let ingredientRun: string[] = []
    for (const line of paragraph) {
      const kind = classifyLineKind(line)
      if (kind === 'meal') {
        flushIngredientRun(ingredientRun)
        ingredientRun = []
        units.push({ type: 'meal_title', title: line })
        continue
      }
      if (kind === 'ingredient') {
        ingredientRun.push(line)
        continue
      }
      // Ambiguous short lines after ingredients stay in the block; otherwise ignore.
      if (ingredientRun.length > 0) {
        ingredientRun.push(line)
      }
    }
    flushIngredientRun(ingredientRun)
  }

  return units
}

/**
 * Classify free-text (typed, pasted, or OCR) for Shop by Meals generation.
 *
 * Pipeline: RAW → SEGMENT → CLASSIFY EACH UNIT → generate independently.
 */
export function classifyMealInput(text: string): ClassifiedMealInput {
  const units = segmentMealInput(text)
  if (units.length === 0) {
    return { kind: 'unclear', units: [], lines: [] }
  }

  const mealTitles = units.filter((u): u is Extract<MealInputUnit, { type: 'meal_title' }> => u.type === 'meal_title')
  const ingredientBlocks = units.filter(
    (u): u is Extract<MealInputUnit, { type: 'ingredient_block' }> => u.type === 'ingredient_block',
  )

  const lines = [
    ...mealTitles.map((u) => u.title),
    // Keep title-only lines for chip / simple callers; ingredient blocks use units.
  ]

  if (mealTitles.length > 0 && ingredientBlocks.length > 0) {
    return { kind: 'mixed', units, lines }
  }
  if (ingredientBlocks.length === 1 && mealTitles.length === 0) {
    return {
      kind: 'ingredient_list',
      units,
      lines: ingredientBlocks[0].lines,
    }
  }
  if (ingredientBlocks.length > 1 && mealTitles.length === 0) {
    return { kind: 'mixed', units, lines: [] }
  }
  if (mealTitles.length === 1) {
    return { kind: 'single_meal', units, lines }
  }
  if (mealTitles.length >= 2) {
    return { kind: 'multiple_meals', units, lines }
  }

  return { kind: 'unclear', units: [], lines: [] }
}
