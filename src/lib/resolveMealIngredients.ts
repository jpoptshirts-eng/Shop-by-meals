import {
  findMealRecipeForLine,
  MEAL_RECIPES,
  type MealRecipe,
  type RecipeIngredient,
} from '../data/mealRecipes'

export type ResolvedMealIngredients = {
  status: 'resolved'
  mealName: string
  recipe: MealRecipe
  ingredients: RecipeIngredient[]
}

export type UnresolvedMealIngredients = {
  status: 'unresolved'
  mealName: string
  reason: 'no-recipe'
}

export type MealIngredientResolution = ResolvedMealIngredients | UnresolvedMealIngredients

function normalizeMealKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u2019\u2018']/g, "'")
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Alias patterns → recipe id. Order matters: more specific first. */
const MEAL_ALIASES: Array<{ pattern: RegExp; recipeId: string }> = [
  { pattern: /^(spag(\s*bol)?|spagbol|spaghetti\s*bol(ognese)?)$/, recipeId: 'spag-bol' },
  {
    pattern: /^(chill?i(\s+con\s+carne)?|chili\s+con\s+carne|con\s+carne)$/,
    recipeId: 'chilli-con-carne',
  },
  { pattern: /^(pad\s*thai|padthai)$/, recipeId: 'pad-thai' },
  { pattern: /^(veggie|vegetarian|veg)\s+lasagn[ae]$/, recipeId: 'veg-lasagne' },
  { pattern: /^lasagn[ae]$/, recipeId: 'veg-lasagne' },
  { pattern: /^shepherd'?s?\s*pie$/, recipeId: 'shepherds-pie' },
  { pattern: /^cottage\s*pie$/, recipeId: 'cottage-pie' },
  { pattern: /^salmon\s*(and|&)?\s*veg(etables?)?$/, recipeId: 'salmon-veg' },
  { pattern: /^beef\s*casserole$/, recipeId: 'beef-casserole' },
  { pattern: /^beef\s*burrito\s*bowls?$/, recipeId: 'beef-burrito-bowl' },
  { pattern: /^black\s*bean\s*burrito\s*bowls?$/, recipeId: 'black-bean-burrito' },
  { pattern: /^burrito\s*bowls?$/, recipeId: 'black-bean-burrito' },
  { pattern: /^sheet\s*pan\s*fajitas?$/, recipeId: 'sheet-pan-fajitas' },
  { pattern: /^fajitas?$/, recipeId: 'sheet-pan-fajitas' },
  {
    pattern: /^chicken\s*burger(\s*(with|and|&)\s*(fries|chips))?$/,
    recipeId: 'chicken-burger-fries',
  },
  { pattern: /^mushroom\s*risotto$/, recipeId: 'mushroom-risotto' },
  { pattern: /^risotto$/, recipeId: 'mushroom-risotto' },
  { pattern: /^spanish\s*omelett?e$/, recipeId: 'spanish-omelette' },
  { pattern: /^tortilla\s*(de\s*)?patatas$/, recipeId: 'spanish-omelette' },
  { pattern: /^omelett?e$/, recipeId: 'spanish-omelette' },
  { pattern: /^paneer\s*(curry|masala|tikka)?$/, recipeId: 'paneer-curry' },
  { pattern: /^chicken\s*curry$/, recipeId: 'chicken-curry' },
  { pattern: /^thai\s*green\s*curry$/, recipeId: 'thai-green-curry' },
  { pattern: /^green\s*thai\s*curry$/, recipeId: 'thai-green-curry' },
  { pattern: /^fish\s*tacos?$/, recipeId: 'fish-tacos' },
  { pattern: /^(spaghetti\s*)?carbonara$/, recipeId: 'carbonara' },
  { pattern: /^(mac\s*(and|&)?\s*cheese|macaroni\s*cheese)$/, recipeId: 'mac-and-cheese' },
  { pattern: /^chicken\s*stir[\s-]*fry$/, recipeId: 'chicken-stir-fry' },
  { pattern: /^beef\s*stir[\s-]*fry$/, recipeId: 'beef-stir-fry' },
  { pattern: /^(veg(etable)?\s*)?stir[\s-]*fry$/, recipeId: 'vegetable-stir-fry' },
  { pattern: /^chicken\s*caesar(\s*salad)?$/, recipeId: 'chicken-caesar-salad' },
  { pattern: /^greek\s*salad$/, recipeId: 'greek-salad' },
  { pattern: /^chicken\s*biryani$/, recipeId: 'chicken-biryani' },
  { pattern: /^(veg(etable)?\s*)?biryani$/, recipeId: 'vegetable-biryani' },
  { pattern: /^(chana\s*)?(dal|dhal|dahl)$/, recipeId: 'chana-dal' },
  { pattern: /^pizza$/, recipeId: 'pizza' },
  { pattern: /^chicken\s*pasta$/, recipeId: 'chicken-pasta' },
  { pattern: /^(tomato|tomatoes)\s*pasta$/, recipeId: 'tomato-pasta' },
  { pattern: /^chicken\s*tikka(\s*masala)?$/, recipeId: 'chicken-tikka' },
]

function recipeById(id: string): MealRecipe | null {
  return MEAL_RECIPES.find((r) => r.id === id) ?? null
}

function resolveAlias(normalized: string): MealRecipe | null {
  // Meat-specified burrito bowls: prefer dedicated templates.
  if (/\bburrito\b/.test(normalized) && /\bbowl/.test(normalized)) {
    if (/\bbeef\b/.test(normalized)) return recipeById('beef-burrito-bowl')
    if (/\bchicken\b/.test(normalized)) return recipeById('chicken-tacos')
    if (/\bblack\s*bean\b/.test(normalized)) return recipeById('black-bean-burrito')
  }

  for (const alias of MEAL_ALIASES) {
    if (alias.pattern.test(normalized)) {
      return recipeById(alias.recipeId)
    }
  }
  return null
}

function toResolved(recipe: MealRecipe): ResolvedMealIngredients {
  return {
    status: 'resolved',
    mealName: recipe.fullName,
    recipe,
    ingredients: recipe.ingredients,
  }
}

/**
 * Meal title → canonical ingredient requirements.
 * POPMAS must not be queried until this returns a resolved ingredient list.
 *
 * Conceptual alias: resolveMealRecipe(mealName)
 */
export function resolveMealIngredients(mealName: string): MealIngredientResolution {
  const trimmed = mealName.trim()
  if (!trimmed) {
    return { status: 'unresolved', mealName: '', reason: 'no-recipe' }
  }

  const fromExact = findMealRecipeForLine(trimmed)
  if (fromExact) return toResolved(fromExact)

  const key = normalizeMealKey(trimmed)
  const fromAlias = resolveAlias(key)
  if (fromAlias) return toResolved(fromAlias)

  // Fuzzy contains-match against known recipe titles (prototype-safe).
  for (const recipe of MEAL_RECIPES) {
    const chip = normalizeMealKey(recipe.chipLabel)
    const full = normalizeMealKey(recipe.fullName)
    if (key === chip || key === full) return toResolved(recipe)
    if (key.length >= 8 && (chip.includes(key) || full.includes(key) || key.includes(chip))) {
      return toResolved(recipe)
    }
  }

  return { status: 'unresolved', mealName: trimmed, reason: 'no-recipe' }
}

/** Same as resolveMealIngredients — explicit recipe-first API name. */
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
