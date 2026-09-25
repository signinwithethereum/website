/* Export the rendered article, so prose, Vue components and their data share
 * the website's canonical sources. Only this build output is converted; the
 * HTML sent to browsers is never modified. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { load } from 'cheerio'
import TurndownService from 'turndown'
import { tables, strikethrough } from 'turndown-plugin-gfm'
import { createContentLoader, createMarkdownRenderer, type SiteConfig } from 'vitepress'
import { prepareAgentComponents } from './agent-components.ts'
import { routeForPage } from './og.ts'

interface AgentPage {
  route: string
  markdown: string
  title: string
  description: string
  frontmatter: Record<string, unknown>
  source: string
  summaryHtml?: string
  codeBlocks?: { content: string; info: string }[]
}

export function markdownForPage(page: string) {
  return `/${page.replace(/\.(?:html|md)$/, '.md')}`
}

export async function generateAgentContent(config: SiteConfig, host: string) {
  const sources = config.pages.filter((page) => page !== '404.md')
  const content = await createContentLoader(sources, { includeSrc: true }).load(
    sources.map((page) => path.join(config.srcDir, page))
  )
  const byRoute = new Map(content.map((page) => [page.url, page]))
  const pages: AgentPage[] = sources.map((source) => {
    const output = config.rewrites.map[source] ?? source
    const route = routeForPage(output)
    const canonical = byRoute.get(route)
    if (!canonical) throw new Error(`Missing source content for ${route}`)
    const frontmatter = canonical.frontmatter
    return {
      route,
      markdown: markdownForPage(output),
      title: String(frontmatter.title ?? ''),
      description: String(frontmatter.description ?? ''),
      frontmatter,
      source: canonical.src ?? ''
    }
  })
  const routes = new Map<string, string>()
  for (const page of pages) {
    routes.set(page.route, page.markdown)
    routes.set(page.markdown.replace(/\.md$/, '.html'), page.markdown)
    if (page.route.endsWith('/') && page.route !== '/') {
      routes.set(page.route.slice(0, -1), page.markdown)
    }
  }

  const renderer = await createMarkdownRenderer(config.srcDir, config.markdown)
  for (const page of pages) {
    page.codeBlocks = renderer.parse(page.source, {}).filter((token) => token.type === 'fence')
    if (typeof page.frontmatter.agentSummary === 'string') {
      page.summaryHtml = await renderer.renderAsync(page.frontmatter.agentSummary)
    }
    const htmlPath = path.join(config.outDir, page.markdown.replace(/\.md$/, '.html'))
    const html = readFileSync(htmlPath, 'utf8')
    const markdown = renderAgentMarkdown(html, page, routes, host)
    const target = path.join(config.outDir, page.markdown)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, markdown)
  }
  writeFileSync(path.join(config.outDir, 'llms.txt'), agentIndex(pages, host))
  config.logger.info(`Generated llms.txt and ${pages.length} Markdown pages.`)
}

export function renderAgentMarkdown(
  html: string,
  page: AgentPage,
  routes: Map<string, string>,
  host: string
) {
  const $ = load(html)
  // VitePress's page layout has no main element; its content is in VPPage.
  const root = $('.vp-doc, .VPPage').first()
  if (!root.length) throw new Error(`No article content for ${page.route}`)

  // Syntax highlighting can trim trailing blank lines. Restore source fences
  // before conversion so copied code and signed-message fixtures stay exact.
  const blocks = root.find('div[class*="language-"] pre')
  if (blocks.length !== page.codeBlocks?.length) {
    throw new Error(`Code block coverage changed for ${page.route}`)
  }
  blocks.each((index, element) => {
    $(element).empty().append($('<code></code>').text(page.codeBlocks![index].content))
  })
  prepareAgentComponents($, root)
  if (page.summaryHtml) root.append(page.summaryHtml)
  root.find('script, style, svg, canvas, button, input, textarea, select, .header-anchor, [aria-hidden="true"]').remove()
  root.find('div[class*="language-"]').each((_, element) => {
    const block = $(element)
    const language = block.attr('class')?.match(/(?:^|\s)language-([^\s]+)/)?.[1] ?? ''
    block.find('pre').attr('data-agent-language', language)
    block.children('.lang, .copy, .line-numbers-wrapper').remove()
  })
  root.find('.custom-block-title').each((_, element) => {
    $(element).wrapInner('<strong></strong>')
  })
  root.find('a[href], img[src]').each((_, element) => {
    const node = $(element)
    const attr = node.is('a') ? 'href' : 'src'
    const value = node.attr(attr)!
    if (value.startsWith('#')) return
    const url = new URL(value, `${host}${page.route}`)
    if (url.origin === new URL(host).origin) {
      // Keep image/download URLs intact. Rewrite known page links only.
      if (attr === 'href') url.pathname = routes.get(url.pathname) ?? url.pathname
      node.attr(attr, url.href)
    }
  })

  const converter = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*'
  })
  converter.use([tables, strikethrough])
  converter.addRule('tableCells', {
    filter: ['th', 'td'],
    replacement(content, node) {
      const prefix = node.previousSibling ? ' ' : '| '
      return `${prefix}${content.trim().replace(/(?<!\\)\|/g, '\\|').replace(/\n+/g, ' ')} |`
    }
  })
  converter.addRule('codeBlocks', {
    filter: 'pre',
    replacement(_content, node) {
      const code = node.textContent ?? ''
      const runs = code.match(/`+/g) ?? []
      const fence = '`'.repeat(Math.max(3, ...runs.map((run) => run.length + 1)))
      const language = node.getAttribute('data-agent-language') ??
        node.firstElementChild?.getAttribute('class')?.match(/language-(\S+)/)?.[1] ?? ''
      return `\n\n${fence}${language}\n${code.replace(/\n$/, '')}\n${fence}\n\n`
    }
  })
  converter.addRule('headingAnchors', {
    filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    replacement(content, node) {
      const id = node.getAttribute('id')
      // Explicit anchors preserve links to API headings whose visible labels
      // would produce different slugs in other Markdown renderers.
      const anchor = id ? `<a id="${escapeAttribute(id)}"></a>\n\n` : ''
      return `\n\n${anchor}${'#'.repeat(Number(node.nodeName[1]))} ${content}\n\n`
    }
  })

  let body = converter.turndown(root.html() ?? '').trim()
  if (!/^# /m.test(body)) body = `# ${page.title}\n\n${body}`
  const metadata = [`Source: ${host}${page.route}`]
  if (page.frontmatter.date) {
    metadata.push(`Published: ${new Date(String(page.frontmatter.date)).toISOString().slice(0, 10)}`)
  }
  if (page.frontmatter.author) metadata.push(`Author: ${page.frontmatter.author}`)
  body = body.replace(/^(# .+)$/m, `$1\n\n${metadata.join('  \n')}`)
  if (body.length < 100) throw new Error(`Empty Markdown export for ${page.route}`)
  return `${body}\n`
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function agentIndex(pages: AgentPage[], host: string) {
  const published = pages.filter((page) => !page.frontmatter.draft)
  const used = new Set<string>()
  const groups: [string, string[]][] = [
    ['Start here', ['/docs/quickstart/', '/docs/quickstart/frontend', '/docs/quickstart/backend', '/docs/', '/docs/message']],
    ['Security and sessions', ['/docs/security-considerations', '/docs/smart-accounts', '/docs/sessions']],
    ['Libraries', published.filter((page) => page.route.startsWith('/docs/libraries/')).map((page) => page.route)],
    ['Integrations', published.filter((page) => /^\/docs\/(integrations|oidc-provider)\//.test(page.route)).map((page) => page.route)]
  ]
  function section(title: string, routes: string[]) {
    const entries = routes.map((route) => {
      const page = published.find((item) => item.route === route)
      if (!page) throw new Error(`Missing llms.txt entry: ${route}`)
      used.add(route)
      const title = page.title.replace(/[[\]\\]/g, '\\$&')
      const description = page.description.replace(/\s+/g, ' ').trim()
      return `- [${title}](${host}${page.markdown})${description ? `: ${description}` : ''}`
    })
    return `## ${title}\n\n${entries.join('\n')}`
  }
  const sections = groups.map(([title, routes]) => section(title, routes))
  sections.push(section('Tools', published.filter((page) => page.route.startsWith('/tools/')).map((page) => page.route)))
  sections.push(section('Optional', published.filter((page) => !used.has(page.route)).map((page) => page.route)))

  return `# Sign in with Ethereum\n\n> SIWE (ERC-4361) is the open standard for signing into apps with an Ethereum account. Users sign a readable message; the server verifies it.\n\nStart with the quickstart and security guidance. Choose a library for your stack, verify the server-issued nonce and expected domain, and handle sessions in your application. The message tools explain and lint the format; they do not authenticate a user.\n\nThese Markdown pages are generated from the same content and components as ${host}. Documentation covers current implementation guidance; blog posts are dated case studies and commentary.\n\n${sections.join('\n\n')}\n`
}
