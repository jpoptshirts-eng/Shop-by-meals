import { IconBin, IconChevronMeal } from './shopping-list-pods'

export type MealTag = {
  label: string
  tone?: 'kcal' | 'default' | 'allergen'
}

export type MealAccordionHeaderProps = {
  title: string
  expanded: boolean
  tags: MealTag[]
  preparationTime: string
  itemCount: number
  priceLabel: string
  ratingLabel: string
  servingsLabel: string
  onToggle: () => void
  onDelete: () => void
}

function tagClass(tone: MealTag['tone']): string {
  if (tone === 'kcal') return 'bg-[#e5f1fc] text-[#0074e8]'
  if (tone === 'allergen') return 'bg-[#fce8ec] text-[#a6192e]'
  return 'bg-[#eeeeee] text-[#53565A]'
}

function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 4.5V8l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconStar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 1.8 9.76 5.7l4.24.4-3.2 2.86.94 4.16L8 11.1l-3.74 2.02.94-4.16-3.2-2.86 4.24-.4L8 1.8Z"
        fill="#F5A623"
        stroke="#F5A623"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconPerson() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="5" r="2.4" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M3.5 13.2c.6-2.2 2.2-3.4 4.5-3.4s3.9 1.2 4.5 3.4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function MealAccordionHeader({
  title,
  expanded,
  tags,
  preparationTime,
  itemCount,
  priceLabel,
  ratingLabel,
  servingsLabel,
  onToggle,
  onDelete,
}: MealAccordionHeaderProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 md:items-center md:gap-4 md:px-5 md:py-3.5">
      <button
        type="button"
        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#53565A] md:mt-0"
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${title}`}
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <IconChevronMeal expanded={expanded} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-[16px] font-normal leading-snug text-[#333]">{title}</p>
          {tags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <span
                  key={`${tag.label}-${tag.tone ?? 'default'}`}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] leading-4 ${tagClass(tag.tone)}`}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] font-light leading-5 text-[#53565A] md:text-[16px] md:leading-6">
          <span className="inline-flex items-center gap-1.5">
            <IconClock />
            <span>{preparationTime}</span>
          </span>
          <span aria-hidden="true">•</span>
          <span>
            {itemCount} item{itemCount === 1 ? '' : 's'}
          </span>
          <span aria-hidden="true">•</span>
          <span>{priceLabel}</span>
          <span aria-hidden="true">•</span>
          <span className="inline-flex items-center gap-1.5">
            <IconStar />
            <span>{ratingLabel}</span>
          </span>
          <span aria-hidden="true">•</span>
          <span className="inline-flex items-center gap-1.5">
            <IconPerson />
            <span>{servingsLabel}</span>
          </span>
        </div>
      </div>

      <button
        type="button"
        className="mt-0.5 inline-flex shrink-0 items-center justify-center p-0.5 text-[#757575] md:mt-0"
        aria-label={`Delete ${title}`}
        onClick={onDelete}
      >
        <IconBin />
      </button>
    </div>
  )
}
