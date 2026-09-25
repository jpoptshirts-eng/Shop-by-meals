# Shop by Meals

Prototype built from a clean duplicate of the Waitrose **AI Shopping Lists** app.

## Local development

```bash
npm install
npm run dev
```

## Environment

Copy `.env.example` to `.env` (already gitignored):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

These are the same Supabase POPMAS catalog credentials used by Shopping Lists. Never commit secrets.

## Branches

- `main` — untouched Shopping Lists baseline
- `shop-by-meals-lvp` — Shop by Meals desktop LVP
