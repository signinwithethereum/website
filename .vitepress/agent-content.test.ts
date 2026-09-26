/** Validate the built artifacts independently of the exporter.
 * Run after `pnpm build`: node --experimental-strip-types .vitepress/agent-content.test.ts
 * APP_HOST must match the build when it is overridden.
 * Optionally set AGENT_CONTENT_BASE_URL to a loopback nginx URL to check serving.
 */
import assert from 'node:assert/strict'
import { readdir, readFile, stat } from 'node:fs/promises'
import { request } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { load } from 'cheerio'
import { createMarkdownRenderer } from 'vitepress'
import { ECOSYSTEM } from './theme/data/ecosystem.ts'
import { ICON_STATES, SWATCHES, WORDMARK_STATES } from './theme/data/brand.ts'
import { exampleMessage } from './theme/lib/example.ts'

const root = fileURLToPath(new URL('../', import.meta.url))
const srcDir = path.join(root, 'src')
const outDir = path.join(root, '.vitepress/dist')
const origin = `https://${process.env.APP_HOST ?? 'siwe.xyz'}`
const markdown = await createMarkdownRenderer(srcDir)
type Token = ReturnType<typeof markdown.parse>[number]
const failures: string[] = []
let checks = 0
let checkedLinks = 0
let checkedExamples = 0
let checkedRows = 0

function check(condition: unknown, message: string) {
  checks++
  if (!condition) failures.push(message)
}

async function filesIn(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const groups = await Promise.all(entries.map(async (entry) => {
    const filename = path.join(directory, entry.name)
    return entry.isDirectory() ? filesIn(filename) : [filename]
  }))
  return groups.flat().sort()
}

function flatten(tokens: Token[]): Token[] {
  return tokens.flatMap((token) => [token, ...flatten(token.children ?? [])])
}

function normalized(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function textContent(tokens: Token[]): string {
  return normalized(tokens
    .filter((token) => ['text', 'code_inline', 'fence', 'code_block'].includes(token.type))
    .map((token) => token.content).join(' '))
}

function tableRows(tokens: Token[]): string[] {
  const rows: string[] = []
  let cells: string[] = []
  let content: string[] | undefined
  for (const token of tokens) {
    if (token.type === 'tr_open') cells = []
    if (token.type === 'td_open' || token.type === 'th_open') content = []
    if (content && ['text', 'code_inline'].includes(token.type)) content.push(token.content)
    if (token.type === 'softbreak' || token.type === 'hardbreak') content?.push(' ')
    if (token.type === 'td_close' || token.type === 'th_close') {
      cells.push(normalized(content?.join('') ?? ''))
      content = undefined
    }
    if (token.type === 'tr_close') rows.push(JSON.stringify(cells))
  }
  return rows
}

function linksIn(tokens: Token[]): string[] {
  return tokens.flatMap((token) => {
    // VitePress's parser injects heading permalinks. They are not links in the
    // exported Markdown; only validate links authored in the actual artifact.
    if (token.type === 'link_open') return token.attrGet('class') === 'header-anchor'
      ? [] : [token.attrGet('href') ?? '']
    if (token.type === 'image') return [token.attrGet('src') ?? '']
    if (token.type === 'html_inline' || token.type === 'html_block') {
      const fragment = load(token.content)
      return fragment('[href], [src]').toArray().flatMap((element) =>
        [fragment(element).attr('href'), fragment(element).attr('src')]
          .filter((value): value is string => value !== undefined))
    }
    return []
  }).filter(Boolean)
}

async function isFile(filename: string): Promise<boolean> {
  try { return (await stat(filename)).isFile() } catch { return false }
}

const sourceFiles = (await filesIn(srcDir)).filter((filename) => {
  const relative = path.relative(srcDir, filename)
  return relative.endsWith('.md') && !relative.split(path.sep).some((part) =>
    part.startsWith('_') || part === 'README.md' || part === 'public')
})
const expectedPages = sourceFiles.map((filename) => path.relative(srcDir, filename))
const actualHtml = (await filesIn(outDir))
  .filter((filename) => filename.endsWith('.html') && path.basename(filename) !== '404.html')
  .map((filename) => path.relative(outDir, filename).replace(/\.html$/, '.md'))
check(JSON.stringify(actualHtml.sort()) === JSON.stringify([...expectedPages].sort()),
  'Source page inventory and built HTML page inventory differ')

interface Page {
  source: string
  body: string
  tokens: Token[]
  text: string
  links: string[]
}
const pages = new Map<string, Page>()
for (const relative of expectedPages) {
  const source = await readFile(path.join(srcDir, relative), 'utf8')
  if (!await isFile(path.join(outDir, relative))) {
    check(false, `${relative}: missing Markdown output`)
    continue
  }
  const body = await readFile(path.join(outDir, relative), 'utf8')
  const tokens = flatten(markdown.parse(body, {}))
  const text = textContent(tokens)
  pages.set(relative, { source, body, tokens, text, links: linksIn(tokens) })
  check(/^# .+/m.test(body), `${relative}: missing first-level content heading`)
  check(text.length >= 100, `${relative}: content is unexpectedly empty (${text.length} characters)`)
  check(!/^---\r?\n/.test(body), `${relative}: raw source frontmatter leaked into the output`)
  check(!tokens.some((token) => ['html_inline', 'html_block'].includes(token.type) &&
    /<(?:\/?(?:Home\w*|Ecosystem|BrandKit|Validator|Builder|ContactForm|BlankLines|BlogIndex|PostMeta|MessageBlock)|script|style|nav|button|input|select|textarea)\b/i.test(token.content)),
  `${relative}: frontend components or interface scaffolding leaked into the output`)

  const html = load(await readFile(path.join(outDir, relative.replace(/\.md$/, '.html')), 'utf8'))
  const alternate = html('head link[rel="alternate"][type="text/markdown"]')
  check(alternate.length === 1 && alternate.attr('href') === `${origin}/${relative}`,
    `${relative}: missing or incorrect Markdown alternate metadata`)
  check(html('head link[rel="describedby"]').toArray().some((element) =>
    html(element).attr('href') === `${origin}/llms.txt` || html(element).attr('href') === '/llms.txt'),
  `${relative}: missing llms.txt discovery metadata`)

  const sourceTokens = flatten(markdown.parse(source, {}))
  const sourceFences = sourceTokens.filter((token) => token.type === 'fence')
  const outputFences = tokens.filter((token) => token.type === 'fence')
  for (const [index, fence] of sourceFences.entries()) {
    checkedExamples++
    check(outputFences.some((output) => output.content === fence.content),
      `${relative}: code example ${index + 1} changed, including whitespace or angle brackets`)
  }
  const outputRows = tableRows(tokens)
  for (const [index, row] of tableRows(sourceTokens).entries()) {
    checkedRows++
    check(outputRows.includes(row), `${relative}: table row ${index + 1} changed its cells: ${row}`)
  }
}

const anchorCache = new Map<string, Set<string>>()
async function hasAnchor(filename: string, anchor: string): Promise<boolean> {
  if (!anchorCache.has(filename)) {
    const body = await readFile(filename, 'utf8')
    const tokens = filename.endsWith('.md') ? flatten(markdown.parse(body, {})) : []
    const fragments = filename.endsWith('.md')
      ? tokens
        .filter((token) => ['html_inline', 'html_block'].includes(token.type))
        .map((token) => token.content).join('\n')
      : body
    const document = load(fragments)
    const explicit = document('[id], a[name]').toArray().flatMap((element) =>
      [document(element).attr('id'), document(element).attr('name')])
    const headings = tokens.filter((token) => token.type === 'heading_open').map((token) => token.attrGet('id'))
    anchorCache.set(filename, new Set([...explicit, ...headings].filter((value): value is string => !!value)))
  }
  return anchorCache.get(filename)!.has(anchor)
}

async function checkLinks(relative: string, links: string[]) {
  for (const href of links) {
    if (/^(?:mailto|tel|data):/.test(href)) continue
    let url: URL
    try { url = new URL(href, `${origin}/${relative}`) } catch {
      check(false, `${relative}: invalid URL ${href}`)
      continue
    }
    if (url.origin !== origin) continue
    checkedLinks++
    const filename = path.join(outDir, decodeURIComponent(url.pathname))
    const candidates = [filename, `${filename}.html`, path.join(filename, 'index.html')]
    let target: string | undefined
    for (const candidate of candidates) {
      if (await isFile(candidate)) { target = candidate; break }
    }
    check(target !== undefined, `${relative}: broken local link ${href}`)
    if (target && url.hash && /\.(?:md|html)$/.test(target)) {
      check(await hasAnchor(target, decodeURIComponent(url.hash.slice(1))),
        `${relative}: missing target anchor ${href}`)
    }
  }
}
for (const [relative, page] of pages) await checkLinks(relative, page.links)

const llms = await readFile(path.join(outDir, 'llms.txt'), 'utf8')
const indexLinks = linksIn(flatten(markdown.parse(llms, {})))
check(/^# .+/m.test(llms) && llms.length > 300, 'llms.txt needs a substantive overview and linked index')
await checkLinks('llms.txt', indexLinks)
for (const required of ['docs/quickstart/index.md', 'docs/libraries/index.md', 'docs/security-considerations.md']) {
  check(indexLinks.some((href) => new URL(href, origin).pathname === `/${required}`),
    `llms.txt is missing its priority reference ${required}`)
}
check(indexLinks.some((href) => new URL(href, origin).pathname.startsWith('/docs/')) &&
  indexLinks.findIndex((href) => new URL(href, origin).pathname.startsWith('/docs/')) <
    indexLinks.findIndex((href) => new URL(href, origin).pathname.startsWith('/blog/')),
'llms.txt should prioritize documentation before blog content')
for (const [relative, page] of pages) {
  const isDraft = /^draft:\s*true\s*$/m.test(page.source.split('---')[1] ?? '')
  const indexed = indexLinks.some((href) => new URL(href, origin).pathname === `/${relative}`)
  check(isDraft ? !indexed : indexed,
    `${relative}: ${isDraft ? 'draft page is exposed in' : 'public page is missing from'} llms.txt`)
  if (!relative.startsWith('blog/') || relative.endsWith('/index.md')) continue
  const listingPages = ['blog/index.md', `${path.dirname(relative)}/index.md`]
  for (const listing of new Set(listingPages)) {
    const listed = pages.get(listing)?.links.some((href) =>
      new URL(href, `${origin}/${listing}`).pathname === `/${relative}`)
    check(isDraft ? !listed : listed, `${listing}: ${isDraft ? 'includes draft' : 'omits published post'} ${relative}`)
  }
}

const ecosystem = pages.get('ecosystem.md')!
for (const [relative, page] of pages) {
  if (!relative.startsWith('blog/') || !/^draft:\s*true\s*$/m.test(page.source.split('---')[1] ?? '')) continue
  check(!ecosystem.links.some((href) => new URL(href, origin).pathname === `/${relative}`),
    `ecosystem.md exposes a story link hidden on the website: ${relative}`)
}
for (const entry of ECOSYSTEM) {
  check(ecosystem.text.includes(entry.name), `ecosystem.md omits ${entry.name}`)
  check(ecosystem.links.includes(entry.link), `ecosystem.md omits ${entry.name}'s website`)
  if (entry.note) check(ecosystem.text.includes(normalized(entry.note)), `ecosystem.md omits ${entry.name}'s description`)
}
const brand = pages.get('brand.md')!
for (const state of [...WORDMARK_STATES, ...ICON_STATES]) {
  check(brand.text.includes(state.label) && brand.text.includes(normalized(state.note)),
    `brand.md omits the full ${state.id} state description`)
}
for (const swatch of SWATCHES) {
  check(brand.text.includes(swatch.name) && brand.text.includes(swatch.hex) && brand.text.includes(normalized(swatch.note)),
    `brand.md omits the full ${swatch.name} palette entry`)
}

function requireText(relative: string, patterns: RegExp[]) {
  const page = pages.get(relative)!
  for (const pattern of patterns) check(pattern.test(page.text), `${relative}: missing substantive content matching ${pattern}`)
}
requireText('index.md', [/Sign in with Ethereum/i, /ERC-4361/, /nonce/i, /sign.*verif/i, /libraries/i])
requireText('contact.md', [/contact@siwe\.xyz/, /name/i, /email/i, /message/i, /maintainers/i])
requireText('tools/builder.md', [/domain/i, /address/i, /nonce/i, /timestamp/i, /resources/i, /server/i, /sign/i, /verif/i])
requireText('tools/validator.md', [/format/i, /compliance/i, /security/i, /strict/i, /signature/i, /verif/i, /browser/i])
requireText('docs/message.md', [/blank lines/i, /statement/i, /Resources/])
check(pages.get('index.md')!.tokens.some((token) => token.type === 'fence' && token.content.trimEnd() === exampleMessage()),
  'index.md omits or changes the shared example SIWE message and its blank lines')

if (process.env.AGENT_CONTENT_BASE_URL) {
  const base = new URL(process.env.AGENT_CONTENT_BASE_URL)
  assert(base.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname),
    'The optional nginx check must target a loopback HTTP server')
  async function get(route: string, host = new URL(origin).host, gzip = false) {
    return new Promise<{ status: number; headers: import('node:http').IncomingHttpHeaders; body: string }>((resolve, reject) => {
      const req = request(new URL(route, base), {
        headers: { Host: host, ...(gzip ? { 'Accept-Encoding': 'gzip' } : {}) }
      }, (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer) => chunks.push(chunk))
        response.on('error', reject)
        response.on('end', () => {
          const bytes = Buffer.concat(chunks)
          resolve({ status: response.statusCode ?? 0, headers: response.headers,
            body: (response.headers['content-encoding'] === 'gzip' ? gunzipSync(bytes) : bytes).toString('utf8') })
        })
      })
      req.setTimeout(10_000, () => req.destroy(new Error(`Request timed out: ${route}`)))
      req.on('error', reject)
      req.end()
    })
  }
  for (const relative of ['index.md', 'docs/quickstart/index.md', 'docs/message.md', 'ecosystem.md', 'brand.md', 'tools/validator.md', 'llms.txt']) {
    const response = await get(`/${relative}`, undefined, true)
    check(response.status === 200, `nginx: /${relative} returned ${response.status}`)
    check(response.headers['content-type'] === `${relative.endsWith('.md') ? 'text/markdown' : 'text/plain'}; charset=utf-8`,
      `nginx: /${relative} has incorrect Content-Type ${response.headers['content-type']}`)
    check(response.headers['content-encoding'] === 'gzip', `nginx: /${relative} is not compressed`)
    check(response.body === await readFile(path.join(outDir, relative), 'utf8'), `nginx: /${relative} changed the generated body`)
    if (relative.endsWith('.md')) check(response.headers.link === '</llms.txt>; rel="describedby"; type="text/plain"',
      `nginx: /${relative} omits the llms.txt Link header`)
  }
  const missing = await get('/not-an-agent-page.md')
  check(missing.status === 404 && missing.headers['content-type']?.startsWith('text/html'), 'nginx: missing Markdown must return the HTML 404 page')
  for (const [route, type] of [['/', 'text/html'], ['/docs/message', 'text/html'], ['/docs/quickstart/', 'text/html'],
    ['/brand/wordmark.svg', 'image/svg+xml'], ['/feed.rss', 'application/rss+xml'], ['/sitemap.xml', 'text/xml']]) {
    const response = await get(route!)
    check(response.status === 200 && response.headers['content-type']?.startsWith(type!), `nginx: existing route ${route} regressed`)
  }
  const asset = (await filesIn(path.join(outDir, 'assets'))).find((filename) => filename.endsWith('.css'))!
  const assetResponse = await get(`/${path.relative(outDir, asset)}`)
  check(assetResponse.status === 200 && assetResponse.headers['cache-control']?.includes('immutable'), 'nginx: fingerprinted asset caching regressed')
  for (const [route, host, location] of [
    ['/quickstart/frontend.md', 'siwe.xyz', '/docs/quickstart/frontend.md'],
    ['/libraries/index.md', 'siwe.xyz', '/docs/libraries/index.md'],
    ['/security-considerations', 'siwe.xyz', '/docs/security-considerations'],
    ['/validator/anything.md', 'siwe.xyz', '/tools/validator'],
    ['/media-kit', 'siwe.xyz', '/brand'],
    ['/docs/quickstart/retrieve-onchain-data/', 'siwe.xyz', '/docs/quickstart/'],
    ['/docs/quickstart/frontend/', 'siwe.xyz', '/docs/quickstart/frontend'],
    ['/', 'docs.siwe.xyz', 'https://siwe.xyz/docs/'],
    ['/quickstart/frontend.md', 'docs.siwe.xyz', 'https://siwe.xyz/docs/quickstart/frontend.md'],
    ['/quickstart/frontend/', 'docs.siwe.xyz', 'https://siwe.xyz/docs/quickstart/frontend'],
    ['/quickstart/retrieve-onchain-data/', 'docs.siwe.xyz', 'https://siwe.xyz/docs/quickstart/'],
    ['/integrations/auth0/', 'docs.siwe.xyz', 'https://siwe.xyz/docs/integrations/'],
    ['/', 'oidc-demo.siwe.xyz', 'https://siwe.xyz/docs/oidc-provider/'],
    ['/docs/message.md', 'next.siwe.xyz', 'https://siwe.xyz/docs/message.md'],
    ['/docs/message.md', 'www.siwe.xyz', 'https://siwe.xyz/docs/message.md']
  ]) {
    const response = await get(route!, host)
    check(response.status === 301 && response.headers.location === location, `nginx: legacy redirect ${host}${route} changed`)
  }
  check((await get('/', '127.0.0.1')).status === 200, 'nginx: IP-based healthcheck no longer reaches the homepage')
}

assert.equal(failures.length, 0, `${failures.length} agent-content checks failed:\n${failures.join('\n')}`)
console.log(`Agent content verified: ${pages.size} pages, ${checkedExamples} exact code examples, ${checkedRows} table rows, ${checkedLinks} local links, ${ECOSYSTEM.length} ecosystem entries (${checks} checks).`)
if (process.env.AGENT_CONTENT_BASE_URL) console.log('Local nginx verified: Markdown/text MIME types, UTF-8, gzip, discovery headers, bodies, 404s, existing routes, assets, and legacy hosts/redirects.')
