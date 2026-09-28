import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react'
import { ProductAutocomplete } from './product-autocomplete'
import type { ProductSuggestion } from '../lib/inputExperience'
import { searchProductSuggestions } from '../lib/productAutocomplete'
import type { WaitroseCatalogItem } from '../lib/waitroseCatalog'

type Props = {
  mealId: string
  mealTitle: string
  catalog: WaitroseCatalogItem[]
  disabled?: boolean
  onAddProduct: (mealId: string, suggestion: ProductSuggestion, query: string) => void
}

/**
 * Reuses Shopping Lists POPMAS autocomplete inside a single meal accordion.
 * Scoped to that meal only — never the top meal textarea.
 */
export function MealAddItem({
  mealId,
  mealTitle,
  catalog,
  disabled = false,
  onAddProduct,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(-1)
  const listId = useId()

  const suggestions = useMemo(
    () => (query.trim().length >= 1 ? searchProductSuggestions(query, catalog, 8) : []),
    [query, catalog],
  )
  const showPanel = open && query.trim().length >= 1 && suggestions.length > 0

  useEffect(() => {
    if (!open) {
      setQuery('')
      setHighlight(-1)
    }
  }, [open])

  function close() {
    setOpen(false)
    setQuery('')
    setHighlight(-1)
  }

  function select(suggestion: ProductSuggestion) {
    onAddProduct(mealId, suggestion, query.trim())
    close()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    if (!showPanel) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((i) => {
        const next = i < 0 ? 0 : Math.min(i + 1, suggestions.length - 1)
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && highlight >= 0) {
      e.preventDefault()
      const pick = suggestions[highlight]
      if (pick) select(pick)
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[#ddd] bg-white px-4 py-3 md:px-5">
        <span className="text-[14px] leading-5 text-[#53565A]">Need anything else?</span>
        <button
          type="button"
          className="text-[14px] leading-5 text-[#333] underline decoration-solid underline-offset-[3px] disabled:opacity-50"
          disabled={disabled}
          aria-label={`Add item to ${mealTitle}`}
          onClick={() => setOpen(true)}
        >
          Add item
        </button>
      </div>
    )
  }

  return (
    <div className="border-t border-[#ddd] bg-white px-4 py-3 md:px-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[14px] leading-5 text-[#53565A]">Need anything else?</span>
        <button
          type="button"
          className="text-[14px] leading-5 text-[#53565A] underline decoration-solid underline-offset-[3px]"
          onClick={close}
          aria-label="Cancel add item"
        >
          Cancel
        </button>
      </div>
      <div className="relative">
        <input
          type="search"
          autoComplete="off"
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setHighlight(-1)
          }}
          onKeyDown={onKeyDown}
          placeholder="Search for an item"
          aria-label={`Search for an item to add to ${mealTitle}`}
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={showPanel ? listId : undefined}
          className="w-full border border-[#a9a9a9] bg-[#fafafa] px-3 py-2.5 text-[16px] leading-6 text-[#333] placeholder:text-[#53565A] focus:outline focus:outline-2 focus:outline-[#154734]"
        />
        <ProductAutocomplete
          query={query}
          suggestions={suggestions}
          highlightedIndex={highlight}
          open={showPanel}
          onHighlight={setHighlight}
          onSelect={select}
          listId={listId}
        />
      </div>
    </div>
  )
}
