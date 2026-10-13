import type { ViteDevServer } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/** Dev-only: fetches live Waitrose browse HTML (no CORS) and returns parsed products JSON */
function waitroseGroceriesApi() {
  return {
    name: 'waitrose-groceries-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/waitrose/groceries', async (_req, res) => {
        try {
          const { parseWaitroseBrowseHtml, WAITROSE_GROCERIES_BROWSE } = await import(
            new URL('./scripts/waitrose/parseBrowseHtml.mjs', import.meta.url).href
          )
          const r = await fetch(WAITROSE_GROCERIES_BROWSE, {
            headers: {
              Accept: 'text/html,application/xhtml+xml',
              'Accept-Language': 'en-GB,en;q=0.9',
              'User-Agent': BROWSER_UA,
            },
            redirect: 'follow',
          })
          if (!r.ok) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: `Waitrose HTTP ${r.status}` }))
            return
          }
          const html = await r.text()
          const products = parseWaitroseBrowseHtml(html)
          const payload = {
            source: WAITROSE_GROCERIES_BROWSE,
            fetchedAt: new Date().toISOString(),
            count: products.length,
            products,
          }
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(payload))
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: String(e) }))
        }
      })
    },
  }
}

function noStoreDevHeaders() {
  return {
    name: 'no-store-dev-headers',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (
          req.url &&
          (req.url === '/' ||
            req.url.startsWith('/src/') ||
            req.url.startsWith('/@vite') ||
            req.url.startsWith('/node_modules/.vite/'))
        ) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
          res.setHeader('Pragma', 'no-cache')
          res.setHeader('Expires', '0')
          res.setHeader('Surrogate-Control', 'no-store')
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), noStoreDevHeaders(), waitroseGroceriesApi()],
  server: {
    port: 5180,
    strictPort: true,
  },
})
