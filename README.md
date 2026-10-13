# Shop by Meals

Prototype built from a clean duplicate of the Waitrose **AI Shopping Lists** app.

## Local development

```bash
npm install
npm run dev
```

## Product catalogue

Product data is bundled from the Quick Shop CSV files in `src/data/catalog/`.  
No Supabase / POPMAS connection is required for meal generation, Add Item, Swap, or pricing.

## Environment

Copy `.env.example` to `.env` if you need optional server-side OCR. Never commit secrets.

## Branches

- `main` — untouched Shopping Lists baseline
- `shop-by-meals-lvp` — Shop by Meals desktop LVP
