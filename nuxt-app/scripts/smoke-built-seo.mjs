import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const storefrontRoot = fileURLToPath(new URL('../', import.meta.url))
const outputEntry = path.join(storefrontRoot, '.output/server/index.mjs')

const listen = (server, port = 0) => new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(port, '127.0.0.1', () => {
    server.removeListener('error', reject)
    resolve(server.address().port)
  })
})

const close = (server) => new Promise((resolve) => server.close(resolve))
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

let feedMode = 'fail'
let feedRequests = 0

const apiServer = createServer((request, response) => {
  if (request.url !== '/api/seo/sitemap') {
    response.writeHead(404, { 'content-type': 'application/json' })
    response.end('{"message":"Not found"}')
    return
  }

  feedRequests += 1

  if (feedMode === 'fail') {
    response.writeHead(503, { 'content-type': 'application/json' })
    response.end('{"message":"Temporarily unavailable"}')
    return
  }

  response.writeHead(200, {
    'content-type': 'application/json',
    'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
  })
  response.end(JSON.stringify({
    categories: [
      { slug: 'bearings', updated_at: '2026-07-20T10:15:30+00:00' },
    ],
    products: [
      { slug: 'bearing-6204', updated_at: '2026-07-24T08:30:45+00:00' },
    ],
  }))
})

const apiPort = await listen(apiServer)

const portProbe = createServer()
const storefrontPort = await listen(portProbe)
await close(portProbe)

let serverLogs = ''
const storefront = spawn(process.execPath, [outputEntry], {
  cwd: storefrontRoot,
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    NITRO_HOST: '127.0.0.1',
    NITRO_PORT: String(storefrontPort),
    NODE_ENV: 'production',
    NUXT_PUBLIC_API_BASE: `http://127.0.0.1:${apiPort}`,
    NUXT_PUBLIC_SITE_URL: 'https://avinaq.com',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})

storefront.stdout.on('data', (chunk) => {
  serverLogs += chunk
})
storefront.stderr.on('data', (chunk) => {
  serverLogs += chunk
})

const request = (pathname) => fetch(`http://127.0.0.1:${storefrontPort}${pathname}`, {
  redirect: 'manual',
  headers: {
    host: 'avinaq.com',
    'x-forwarded-host': 'avinaq.com',
    'x-forwarded-proto': 'https',
  },
})

try {
  let robotsResponse
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    if (storefront.exitCode != null) {
      throw new Error(`The built storefront exited before smoke tests started.\n${serverLogs}`)
    }

    try {
      robotsResponse = await request('/robots.txt')
      break
    } catch {
      await delay(100)
    }
  }

  assert.ok(robotsResponse, `The built storefront did not start.\n${serverLogs}`)
  assert.equal(robotsResponse.status, 200)
  assert.match(robotsResponse.headers.get('content-type') || '', /^text\/plain\b/)
  assert.equal(
    await robotsResponse.text(),
    'User-agent: *\nAllow: /\n\nSitemap: https://avinaq.com/sitemap.xml\n'
  )

  const failedSitemap = await request('/sitemap.xml')
  assert.equal(failedSitemap.status, 502, 'An unavailable upstream must not return a partial sitemap.')

  feedMode = 'success'
  const sitemapResponse = await request('/sitemap.xml')
  const sitemap = await sitemapResponse.text()

  assert.equal(sitemapResponse.status, 200)
  assert.match(sitemapResponse.headers.get('content-type') || '', /^application\/xml\b/)
  assert.match(sitemap, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/)
  assert.match(sitemap, /<loc>https:\/\/avinaq\.com\/product\/bearing-6204<\/loc>/)
  assert.match(sitemap, /<loc>https:\/\/avinaq\.com\/ar\/product\/bearing-6204<\/loc>/)
  assert.match(sitemap, /hreflang="en-OM"/)
  assert.match(sitemap, /hreflang="ar-OM"/)
  assert.match(sitemap, /<lastmod>2026-07-24T08:30:45\.000Z<\/lastmod>/)

  const requestsAfterSuccess = feedRequests
  feedMode = 'fail'
  await delay(100)

  const cachedSitemap = await request('/sitemap.xml')
  assert.equal(cachedSitemap.status, 200, 'A complete cached sitemap should remain available.')
  assert.equal(feedRequests, requestsAfterSuccess, 'The fresh cached response should avoid another API request.')

  console.log('Built SEO smoke checks passed.')
} finally {
  storefront.kill('SIGTERM')
  if (storefront.exitCode == null) {
    await Promise.race([once(storefront, 'exit'), delay(2_000)])
  }
  await close(apiServer)
}
