import { findMealRecipeForLine } from '../data/mealRecipes'
import { isLikelyMealLine, getShopListLinesFromUserInput } from './parseShopList'

/** Internal classification labels — not shown in the UI. */
export type MealInputKind =
  | 'single_meal'
  | 'multiple_meals'
  | 'ingredient_list'
  | 'unclear'

export type ClassifiedMealInput = {
  kind: MealInputKind
  /** Lines that should become meal titles (or ingredients when kind is ingredient_list). */
  lines: string[]
}

const DAY_PREFIX =
  /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\s*[–—\-:]\s*/iu

const QUANTITY_PREFIX =
  /^(\d+([.,]\d+)?\s*(g|kg|ml|l|oz|lb|tbsp|tsp|cups?|x)?|\d+\s*x\s*)/iu

function stripInvisibleAndTrim(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF\u00AD\u200E\u200F\u202A-\u202E\u2060]/g, '')
    .replace(/\u00A0/g, ' ')
    .trim()
}

function stripDayPrefix(line: string): string {
  return stripInvisibleAndTrim(line.replace(DAY_PREFIX, ''))
}

/** Split a single segment on commas / semicolons / " and " without breaking "Salmon & veg". */
function splitConjunctions(segment: string): string[] {
  const raw = stripInvisibleAndTrim(segment)
  if (!raw) return []
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

export function looksLikeIngredientLine(line: string): boolean {
  const t = stripInvisibleAndTrim(line)
  if (!t) return false
  if (findMealRecipeForLine(t) || isLikelyMealLine(t)) return false
  if (QUANTITY_PREFIX.test(t)) return true
  // Short produce / pantry tokens without dish cues
  const words = t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length <= 4 && words.every((w) => w.length <= 14)) {
    const pantry = [
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
    ]
    if (words.some((w) => pantry.includes(w))) return true
  }
  return false
}

export function looksLikeMealLine(line: string): boolean {
  const t = stripInvisibleAndTrim(line)
  if (!t) return false
  if (findMealRecipeForLine(t)) return true
  if (isLikelyMealLine(t)) return true
  return false
}

/**
 * Classify free-text (typed, pasted, or OCR) for Shop by Meals generation.
 */
export function classifyMealInput(text: string): ClassifiedMealInput {
  const safe = getShopListLinesFromUserInput(text)
  const candidates =
    safe.length > 0 ? extractCandidateLines(safe.join('\n')) : extractCandidateLines(text)

  if (candidates.length === 0) {
    return { kind: 'unclear', lines: [] }
  }

  const mealCount = candidates.filter(looksLikeMealLine).length
  const ingredientCount = candidates.filter(looksLikeIngredientLine).length

  if (candidates.length === 1) {
    if (looksLikeMealLine(candidates[0]) || !looksLikeIngredientLine(candidates[0])) {
      return { kind: 'single_meal', lines: candidates }
    }
    return { kind: 'ingredient_list', lines: candidates }
  }

  // Strong meal-list signal
  if (mealCount >= 2 && mealCount >= ingredientCount) {
    return { kind: 'multiple_meals', lines: candidates }
  }

  // Ingredient shopping-style list for one meal
  if (ingredientCount >= 2 && ingredientCount > mealCount) {
    return { kind: 'ingredient_list', lines: candidates }
  }

  if (mealCount === 1 && ingredientCount === 0) {
    return candidates.length === 1
      ? { kind: 'single_meal', lines: candidates }
      : { kind: 'multiple_meals', lines: candidates }
  }

  if (mealCount >= 1) {
    return {
      kind: candidates.length === 1 ? 'single_meal' : 'multiple_meals',
      lines: candidates,
    }
  }

  if (ingredientCount >= 1) {
    return { kind: 'ingredient_list', lines: candidates }
  }

  // Ambiguous multi-line text: treat as multiple meal titles if each line is phrase-like
  if (candidates.every((c) => c.split(/\s+/).length >= 2)) {
    return {
      kind: candidates.length === 1 ? 'single_meal' : 'multiple_meals',
      lines: candidates,
    }
  }

  return { kind: 'unclear', lines: candidates }
}

/** Best-effort meal title from an ingredient list. */
export function inferMealTitleFromIngredients(lines: string[]): string {
  const hay = lines.join(' ').toLowerCase()
  if (/spaghetti|bolognese|mince/.test(hay) && /tomato|onion|garlic|pasta|spaghetti/.test(hay)) {
    return 'Spaghetti Bolognese'
  }
  if (/shepherd/.test(hay) || (/lamb/.test(hay) && /potato|pea/.test(hay))) {
    return "Shepherd's Pie"
  }
  if (/salmon/.test(hay)) return 'Salmon with vegetables'
  if (/chicken/.test(hay) && /tikka|curry|masala/.test(hay)) return 'Chicken Tikka Masala'
  if (/lasagn[ae]/.test(hay)) return 'Vegetarian Lasagna'
  if (/casserole|stew|braising/.test(hay)) return 'Beef casserole'
  return 'Homemade meal'
}
