import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { load } from 'cheerio'
import { createContentLoader, createMarkdownRenderer, type SiteConfig } from 'vitepress'
import { componentMarkdown } from './agent-components.ts'

interface AgentPage {
  route: string
  markdown: string
  title: string
  description: string
  frontmatter: Record<string, unknown>
  source: string
}

export function markdownForPage(page: string) {
  return `/${page.replace(/\.(?:html|md)$/, '.md')}`
}

export async function generateAgentContent(config: SiteConfig, host: string) {
  const sources = config.pages.filter((page) => page !== '404.md')
  const content = await createContentLoader(sources, { includeSrc: true }).load(
    sources.map((page) => path.join(config.srcDir, page))
  )
  const pages: AgentPage[] = content.map(({ url, frontmatter, src }) => ({
    route: url,
    markdown: `${url}${url.endsWith('/') ? 'index' : ''}.md`,
    title: String(frontmatter.title ?? ''),
    description: String(frontmatter.description ?? ''),
    frontmatter,
    source: src ?? ''
  }))
  const routes = new Map<string, string>()
  for (const page of pages) {
    routes.set(page.route, page.markdown)
    routes.set(page.markdown.replace(/\.md$/, '.html'), page.markdown)
    if (page.route.endsWith('/') && page.route !== '/') routes.set(page.route.slice(0, -1), page.markdown)
  }

  const renderer = await createMarkdownRenderer(config.srcDir, config.markdown)
  // Work on prose lines only. Code examples remain verbatim, including blank
  // lines and strings that happen to contain Markdown or Vue syntax.
  function editProse(source: string, edit: (line: string) => string) {
    const protectedLines = new Set<number>()
    for (const token of renderer.parse(source, {})) {
      if (!token.map) continue
      if (['fence', 'code_block'].includes(token.type)) {
        for (let line = token.map[0]; line < token.map[1]; line++) protectedLines.add(line)
      }
    }
    return source.split('\n').map((line, i) => protectedLines.has(i) ? line : edit(line)).join('\n')
  }

  for (const page of pages) {
    let document: ReturnType<typeof load> | undefined
    let body = page.source.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')
    body = editProse(body, (line) => {
      const component = line.match(/^<([A-Z]\w*)\b[^>]*\/>\s*$/)
      if (component) {
        document ??= load(readFileSync(path.join(config.outDir, page.markdown.replace(/\.md$/, '.html')), 'utf8'))
        return componentMarkdown(document, component[1])
      }
      if (/^<div class="home-page">|^<\/div>\s*$/.test(line)) return ''
      // VitePress callouts become ordinary Markdown with their label intact.
      return line.replace(/^::: ?(\w+)?\s*(.*)$/, (_, kind: string, title: string) =>
        kind ? `**${kind[0].toUpperCase() + kind.slice(1)}${title ? `: ${title}` : ''}**\n` : '')
    })
    if (typeof page.frontmatter.agentSummary === 'string') body += `\n${page.frontmatter.agentSummary}`
    body = editProse(body, (line) => {
      // Skip inline code as well as fenced examples when rewriting page links.
      line = line.replace(/(`+)(.*?)\1|\]\(([^)\s]+)(?=[ )])/g, (match, ticks, _code, href: string) => {
        if (ticks || href.startsWith('#')) return match
        const url = new URL(href, `${host}${page.route}`)
        if (url.origin !== new URL(host).origin) return match
        url.pathname = routes.get(url.pathname) ?? url.pathname
        return `](${url.href}`
      })
      // Plain headings stay plain; keep only explicitly authored API anchors.
      return line.replace(/^(#{1,6} .+?)\s+\{#([^}]+)\}\s*$/, (_, heading: string, id: string) =>
        `<a id="${id.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></a>\n\n${heading}`)
    })
    const metadata = [`Source: ${host}${page.route}`]
    if (page.frontmatter.date) metadata.push(`Published: ${new Date(String(page.frontmatter.date)).toISOString().slice(0, 10)}`)
    if (page.frontmatter.author) metadata.push(`Author: ${page.frontmatter.author}`)
    body = body.replace(/^(# .+)$/m, `$1\n\n${metadata.join('  \n')}`)
    if (!/^# /m.test(body) || body.length < 100) throw new Error(`Empty Markdown export for ${page.route}`)
    const target = path.join(config.outDir, page.markdown)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, `${body.trim()}\n`)
  }
  writeFileSync(path.join(config.outDir, 'llms.txt'), agentIndex(pages, host))
  config.logger.info(`Generated llms.txt and ${pages.length} Markdown pages.`)
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
