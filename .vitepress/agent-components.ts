import type { CheerioAPI } from 'cheerio'
import { WORDMARK_STATES, ICON_STATES, SWATCHES } from './theme/data/brand.ts'
import { ECOSYSTEM, TYPES } from './theme/data/ecosystem.ts'
import { LIBRARIES } from './theme/data/libraries.ts'
import { CHALLENGE, LANES, NOTES, ROWS } from './theme/data/wallet-comparison.ts'
import { EXAMPLE, exampleMessage } from './theme/lib/example.ts'

type Content = ReturnType<CheerioAPI>

/** Convert interactive SSR fragments to semantic content before HTML → Markdown.
 * Static prose stays in the rendered page; state-dependent content comes from
 * the same data modules that drive the Vue components. */
export function prepareAgentComponents($: CheerioAPI, root: Content): void {
  const text = (tag: string, value: string) => $(`<${tag}></${tag}>`).text(value)
  const link = (label: string, href: string) => text('a', label).attr('href', href)
  const code = (value: string) => $('<pre></pre>').append(text('code', value))
  const table = (headings: string[], rows: (string | Content)[][]) => {
    const head = $('<tr></tr>')
    for (const heading of headings) head.append(text('th', heading))
    const body = $('<tbody></tbody>')
    for (const values of rows) {
      const row = $('<tr></tr>')
      for (const value of values) row.append($('<td></td>').append(typeof value === 'string' ? text('span', value) : value))
      body.append(row)
    }
    return $('<table></table>').append($('<thead></thead>').append(head), body)
  }

  // These components render each logical line as a span. textContent alone
  // would concatenate them and silently lose the required signed blank lines.
  root.find('pre.msg').each((_, node) => {
    const lines = $(node).find('.msg-line').toArray().map((line) => {
      const value = $(line).clone()
      value.find('.msg-n').remove()
      return value.hasClass('is-blank') ? '' : value.text()
    })
    $(node).replaceWith(code(lines.join('\n')))
  })
  root.find('.blank-lines pre code').each((_, node) => {
    const lines = $(node).children('span').toArray().map((line) => $(line).text())
    $(node).text(lines.join('\n'))
  })
  root.find('.blank-lines__key').remove()
  root.find('.blank-lines figcaption').each((_, node) => {
    const caption = $(node)
    caption.replaceWith(text('p', `${caption.find('strong').text()}: ${caption.find('span').text()}`))
  })

  root.find('.copyline').each((_, node) => {
    const command = $(node).find('code').clone()
    command.find('.copyline-prefix').remove()
    $(node).replaceWith(code(command.text()))
  })
  root.find('.used-by-marquee').each((_, node) => {
    const list = $('<ul></ul>')
    $(node).find('.used-by-set').first().find('a').each((_, anchor) => {
      list.append($('<li></li>').append(link($(anchor).find('.integrator-name').text(), $(anchor).attr('href')!)))
    })
    $(node).replaceWith(list)
  })
  root.find('.overview li > span, .integrate li > div > span').before(': ')
  root.find('.hero-start, .integrate-cta').each((_, node) => {
    const list = $('<ul></ul>')
    $(node).children('a').each((_, anchor) => {
      list.append($('<li></li>').append($(anchor).clone()))
    })
    $(node).replaceWith(list)
  })

  root.find('.bl-list > li').each((_, node) => {
    const post = $(node)
    const anchor = post.children('a')
    const date = post.find('time').text()
    const category = post.find('.bl-meta > span').text()
    const description = post.find('.bl-desc').text()
    const title = text('p', '').append(link(post.find('h3').text(), anchor.attr('href')!))
    const content = [title, text('p', [date, category].filter(Boolean).join(' · '))]
    if (description) content.push(text('p', description))
    post.empty().append(...content)
  })
  root.find('.production li > a').each((_, node) => {
    const title = $(node).find('strong').text()
    const claim = $(node).children('span').not('[aria-hidden="true"]').text()
    $(node).replaceWith($('<p></p>').append(link(title, $(node).attr('href')!), ': ', text('span', claim)))
  })

  root.find('#libraries .install').each((_, node) => {
    const content = $('<div></div>')
    for (const library of LIBRARIES) {
      content.append(text('h3', library.name), text('p', library.note), code(library.install))
      content.append($('<p></p>').append(
        link(library.pkg, library.registry), ' · ',
        link('Documentation', library.docs), ' · ', link('Source', library.repo)
      ))
    }
    $(node).replaceWith(content)
  })

  root.find('#message .stage').each((_, node) => {
    const content = $('<div></div>')
    for (const lane of LANES) {
      const steps = $('<ol></ol>')
      for (const caption of Object.values(lane.captions)) steps.append(text('li', caption))
      content.append(text('h3', lane.verdict), steps)
      if (lane.id === 'adhoc') content.append(code(CHALLENGE), $(node).find('.hex-meta, .alert').clone())
    }
    content.append(text('h3', 'SIWE wallet display'), text('p', EXAMPLE.statement))
    content.append(table(['Field', 'Value'], ROWS.map((row) => [row.label, [row.value, row.check].filter(Boolean).join(' — ')])))
    const foot = $(node).find('.sheet-foot').first().clone()
    if (foot.length) content.append(foot)
    content.append(text('p', `${NOTES.signing} ${NOTES.done}`))
    content.append(text('h3', 'Example SIWE message'), code(exampleMessage()))
    $(node).replaceWith(content)
  })
  root.find('#message .lane-switch, #message .control').remove()

  root.find('.eco').each((_, node) => {
    // The rendered directory already applies its published-story filter.
    const stories = new Set($(node).find('a[href]').toArray().map((anchor) => $(anchor).attr('href')))
    const content = $('<div></div>').append($(node).find('.eco-hero').clone())
    const rows = [...ECOSYSTEM]
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
      .map((entry) => [
        link(entry.name, entry.link),
        TYPES.find((type) => type.key === entry.type)!.label,
        [entry.note, entry.unverified ? 'Unverified integration.' : ''].filter(Boolean).join(' '),
        entry.story && stories.has(entry.story) ? link('Success story', entry.story) : ''
      ])
    content.append(text('h2', 'Integrations'), table(['Name', 'Category', 'Notes', 'Story'], rows))
    $(node).replaceWith(content)
  })

  root.find('.bk-states').each((_, node) => {
    const states = $(node).attr('aria-label') === 'Wordmark states' ? WORDMARK_STATES : ICON_STATES
    const list = $('<ul></ul>')
    for (const state of states) list.append($('<li></li>').append(text('strong', state.label), ': ', text('span', state.note)))
    $(node).next('.bk-note').remove()
    $(node).replaceWith(list)
  })
  root.find('.bk-swatches').replaceWith(table(['Colour', 'Hex', 'Usage'], SWATCHES.map((swatch) => [swatch.name, swatch.hex, swatch.note])))
  root.find('.bk-stage, .bk-icon-stage').remove()
  root.find('.bk-readings figure').each((_, node) => {
    $(node).replaceWith(text('p', $(node).find('figcaption').text()))
  })

  root.find('.bld').each((_, node) => {
    const fields = $(node).find('.bld-field').toArray().map((field) => {
      const control = $(field).find('input, textarea').first()
      return [
        $(field).children('.t-label').text(),
        control.attr('value') || control.text() || 'Empty',
        $(field).find('small').text()
      ]
    })
    const content = $('<div></div>').append(text('h2', 'Inputs'), table(['Field', 'Example value', 'Guidance'], fields))
    content.append(text('h2', 'Example output'), $(node).find('.bld-out pre').clone(), $(node).find('.bld-note').clone())
    $(node).replaceWith(content)
  })
  root.find('.val').replaceWith($('<div></div>').append(
    text('h2', 'Example input'),
    text('p', 'This fixed example illustrates the message format. The interactive tool refreshes its example timestamps when loaded; time-dependent checks can flag the fixed timestamps below.'),
    code(exampleMessage())
  ))

  root.find('.contact-form').each((_, node) => {
    $(node).find('.contact-trap').remove()
    const rows = $(node).find('label').toArray().map((label) => {
      const control = $(label).find('input, textarea').first()
      return [
        $(label).children('span').clone().find('em').remove().end().text().trim(),
        control.is('[required]') ? 'Required' : 'Optional',
        `${control.attr('maxlength')} characters`,
        control.attr('placeholder') || ''
      ]
    })
    $(node).replaceWith($('<div></div>').append(text('h2', 'Contact form inputs'), table(['Field', 'Required', 'Maximum length', 'Guidance'], rows)))
  })
  root.find('.newsletter-form').replaceWith(text('p', 'The website accepts an email address to subscribe and displays a confirmation after a successful submission.'))
}
