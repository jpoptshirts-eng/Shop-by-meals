#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if ! gh auth status >/dev/null 2>&1; then
  echo "Run: gh auth login"
  exit 1
fi

OWNER="$(gh api user --jq .login)"
REPO="shop-by-meals"

if ! gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
  gh repo create "$REPO" --private --source=. --remote=origin --description "Waitrose Shop by Meals prototype"
else
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/$OWNER/$REPO.git"
fi

# Push untouched baseline first, then LVP branch
git push -u origin main
git push -u origin shop-by-meals-lvp

echo "GitHub: https://github.com/$OWNER/$REPO"

# Vercel
npx vercel link --yes --project shop-by-meals || npx vercel project add shop-by-meals
# Copy env from local .env without printing values
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  npx vercel env add VITE_SUPABASE_URL production <<< "${VITE_SUPABASE_URL}" || true
  npx vercel env add VITE_SUPABASE_ANON_KEY production <<< "${VITE_SUPABASE_ANON_KEY}" || true
fi

npx vercel --prod --yes
