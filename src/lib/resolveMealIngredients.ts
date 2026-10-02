import {
  findMealFamily,
  normalizeMealLookupKey,
  type MealFamily,
} from '../data/mealFamilies'
import {
  findMealRecipeForLine,
  MEAL_RECIPES,
  type MealRecipe,
  type RecipeIngredient,
} from '../data/mealRecipes'
import {
  findWaitroseRecipeReference,
  getWaitroseRecipeById,
  type WaitroseRecipeReference,
} from '../data/waitroseRecipeReferences'

export type ResolvedMealIngredients = {
  status: 'resolved'
  mealName: string
  recipe: MealRecipe
  ingredients: RecipeIngredient[]
  /** Waitrose recipe page when resolved from the recipe-reference registry. */
  sourceUrl?: string
}

export type UnresolvedMealIngredients = {
  status: 'unresolved'
  mealName: string
  reason: 'no-recipe'
}

export type MealIngredientResolution = ResolvedMealIngredients | UnresolvedMealIngredients

function waitroseRefToMealRecipe(ref: WaitroseRecipeReference): MealRecipe {
  return {
    id: ref.id,
    chipLabel: ref.chipLabel,
    fullName: ref.canonicalName,
    cuisine: ref.cuisine,
    ingredients: ref.ingredients,
    methodUrl: ref.sourceUrl,
  }
}

function familyToMealRecipe(family: MealFamily, ingredients: RecipeIngredient[]): MealRecipe {
  return {
    id: family.preferredRecipeId ?? family.id,
    chipLabel: family.displayName,
    fullName: family.displayName,
    cuisine: family.cuisine,
    ingredients,
    methodUrl: family.sourceUrl,
  }
}

function toResolved(
  recipe: MealRecipe,
  sourceUrl?: string,
): ResolvedMealIngredients {
  return {
    status: 'resolved',
    mealName: recipe.fullName,
    recipe,
    ingredients: recipe.ingredients,
    sourceUrl: sourceUrl ?? recipe.methodUrl,
  }
}

function resolveFromFamily(family: MealFamily): ResolvedMealIngredients | null {
  if (family.preferredRecipeId) {
    const preferred = getWaitroseRecipeById(family.preferredRecipeId)
    if (preferred && preferred.ingredients.length > 0) {
      return toResolved(waitroseRefToMealRecipe(preferred), preferred.sourceUrl)
    }
  }
  if (family.fallbackIngredients.length > 0) {
    return toResolved(
      familyToMealRecipe(family, family.fallbackIngredients),
      family.sourceUrl,
    )
  }
  return null
}

/**
 * Meal title → recipe family / Waitrose reference → canonical ingredient requirements.
 *
 * Matching hierarchy:
 * 1. Exact canonical / alias (Waitrose registry)
 * 2. Meal-family alias match
 * 3. Normalised title / fuzzy Waitrose match
 * 4. Token / keyword meal-family similarity
 * 5. Curated local meal recipe templates
 * 6. Unresolved only as a final resort
 *
 * POPMAS must not be queried until this returns a resolved ingredient list.
 */
export function resolveMealIngredients(mealName: string): MealIngredientResolution {
  const trimmed = mealName.trim()
  if (!trimmed) {
    return { status: 'unresolved', mealName: '', reason: 'no-recipe' }
  }

  const key = normalizeMealLookupKey(trimmed)

  // 1) Exact canonical / alias match in Waitrose registry
  const waitroseExact = findWaitroseRecipeReference(trimmed)
  // Prefer exact map hits: findWaitroseRecipeReference already tries exact then fuzzy.
  // Re-check exactness via normalised key equality against returned names/aliases later if needed.
  if (waitroseExact && waitroseExact.ingredients.length > 0) {
    const exactNames = [
      waitroseExact.canonicalName,
      waitroseExact.chipLabel,
      waitroseExact.id.replace(/-/g, ' '),
      ...waitroseExact.aliases,
    ].map(normalizeMealLookupKey)
    if (exactNames.includes(key)) {
      return toResolved(waitroseRefToMealRecipe(waitroseExact), waitroseExact.sourceUrl)
    }
  }

  // 2) Meal-family alias / token match (robust colloquial coverage)
  const family = findMealFamily(trimmed)
  if (family) {
    const fromFamily = resolveFromFamily(family)
    if (fromFamily) return fromFamily
  }

  // 3–4) Normalised / fuzzy Waitrose title match (non-exact)
  if (waitroseExact && waitroseExact.ingredients.length > 0) {
    return toResolved(waitroseRefToMealRecipe(waitroseExact), waitroseExact.sourceUrl)
  }

  // 5) Existing curated meal recipe templates (exact then fuzzy)
  const fromExact = findMealRecipeForLine(trimmed)
  if (fromExact && fromExact.ingredients.length > 0) {
    return toResolved(fromExact)
  }

  for (const recipe of MEAL_RECIPES) {
    const chip = normalizeMealLookupKey(recipe.chipLabel)
    const full = normalizeMealLookupKey(recipe.fullName)
    if (key === chip || key === full) return toResolved(recipe)
    if (key.length >= 8 && (chip.includes(key) || full.includes(key) || key.includes(chip))) {
      if (recipe.ingredients.length > 0) return toResolved(recipe)
    }
  }

  // 6) Unresolved only as a final resort
  return { status: 'unresolved', mealName: trimmed, reason: 'no-recipe' }
}

/** Explicit recipe-first API name. */
export function resolveMealRecipe(mealName: string): MealIngredientResolution {
  return resolveMealIngredients(mealName)
}

export const UNRESOLVED_MEAL_MESSAGE =
  "We couldn't identify enough ingredients for this meal yet."

export function formatIngredientNeedLabel(ingredientName: string): string {
  return ingredientName
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
