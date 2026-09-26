/* Only Vue sections need conversion. Read their rendered prose and shared data
 * so Markdown exports do not introduce a second copy of the website's content. */
import type { CheerioAPI } from 'cheerio'
import TurndownService from 'turndown'
import { WORDMARK_STATES, ICON_STATES, SWATCHES } from './theme/data/brand.ts'
import { ECOSYSTEM, TYPES } from './theme/data/ecosystem.ts'
import { LIBRARIES } from './theme/data/libraries.ts'
import { CHALLENGE, LANES, NOTES, ROWS } from './theme/data/wallet-comparison.ts'
import { EXAMPLE, exampleMessage } from './theme/lib/example.ts'

const converter = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' })
const link = (label: string, url: string) => `[${label.replace(/[[\]\\]/g, '\\$&')}](${url})`
const code = (value: string) => `\`\`\`\n${value}\n\`\`\``
const join = (parts: string[]) => parts.filter(Boolean).join('\n\n')
const table = (head: string[], rows: string[][]) => [head, head.map(() => '---'), ...rows]
  .map((row) => `| ${row.map((cell) => cell.replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ')} |`).join('\n')

export function componentMarkdown($: CheerioAPI, name: string): string {
  function prose(selector: string) {
    const fragment = $(selector).clone()
    if (!fragment.length) throw new Error(`Missing rendered content for ${name}: ${selector}`)
    fragment.find('svg, canvas, button, form, [aria-hidden="true"], .copyline-prefix').remove()
    fragment.find('.overview li > span, .integrate li > div > span').before(': ')
    fragment.find('.copyline').each((_, node) => {
      $(node).replaceWith($('<pre></pre>').append($(node).find('code')))
    })
    return converter.turndown(fragment.toString())
  }

  switch (name) {
    case 'HomeHero': return prose('.hero')
    case 'HomeUsedBy': return join([
      prose('.used-by-label'),
      $('.used-by-set').first().find('a').toArray().map((node) =>
        `- ${link($(node).find('.integrator-name').text(), $(node).attr('href')!)}`
      ).join('\n')
    ])
    case 'HomeWhy': return prose('.overview')
    case 'HomeIntegrate': return prose('.integrate')
    case 'HomeNewsletter': return join([
      prose('.newsletter header'),
      'The website accepts an email address to subscribe and displays a confirmation after a successful submission.'
    ])
    case 'HomeLibraries': return join([
      prose('.libraries-head'),
      ...LIBRARIES.map((library) => join([
        `### ${library.name}`, library.note, code(library.install),
        [link(library.pkg, library.registry), link('Documentation', library.docs), link('Source', library.repo)].join(' · ')
      ])),
      prose('.production header'),
      $('.production li > a').toArray().map((node) =>
        `- ${link($(node).find('strong').text(), $(node).attr('href')!)}: ${$(node).children('span').not('[aria-hidden]').text()}`
      ).join('\n')
    ])
    case 'WalletComparison': return join([
      prose('#message .section-head'),
      ...LANES.map((lane) => join([
        `### ${lane.verdict}`,
        Object.values(lane.captions).map((caption, i) => `${i + 1}. ${caption}`).join('\n'),
        lane.id === 'adhoc' ? join([code(CHALLENGE), prose('#message .hex-meta, #message .alert')]) : ''
      ])),
      '### SIWE wallet display', EXAMPLE.statement,
      table(['Field', 'Value'], ROWS.map((row) => [row.label, [row.value, row.check].filter(Boolean).join(' — ')])),
      prose('#message .sheet-foot'), `${NOTES.signing} ${NOTES.done}`,
      '### Example SIWE message', code(exampleMessage())
    ])
    case 'Ecosystem': {
      const stories = new Set($('.eco a[href]').toArray().map((node) => $(node).attr('href')))
      return join([prose('.eco-hero'), '## Integrations', table(['Name', 'Category', 'Notes', 'Story'],
        [...ECOSYSTEM].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })).map((entry) => [
          link(entry.name, entry.link), TYPES.find((type) => type.key === entry.type)!.label,
          [entry.note, entry.unverified ? 'Unverified integration.' : ''].filter(Boolean).join(' '),
          entry.story && stories.has(entry.story) ? link('Success story', entry.story) : ''
        ]))])
    }
    case 'BrandKit': return join([
      '## The wordmark', WORDMARK_STATES.map((state) => `- **${state.label}**: ${state.note}`).join('\n'),
      '## The icon', prose('.bk-lead'), prose('.bk-readings figcaption'),
      ICON_STATES.map((state) => `- **${state.label}**: ${state.note}`).join('\n'),
      '## Colour', table(['Colour', 'Hex', 'Usage'], SWATCHES.map((swatch) => [swatch.name, swatch.hex, swatch.note]))
    ])
    case 'BlogIndex': return $('.bl-list > li').length ? $('.bl-list > li').toArray().map((node) => join([
      `## ${link($(node).find('h3').text(), $(node).children('a').attr('href')!)}`,
      [$(node).find('time').text(), $(node).find('.bl-meta > span').text()].filter(Boolean).join(' · '),
      $(node).find('.bl-desc').text()
    ])).join('\n\n') : prose('.bl-empty')
    case 'BlankLines': return join([
      ...$('.blank-lines__example').toArray().map((node) => join([
        `${$(node).find('strong').text()}: ${$(node).find('figcaption span').text()}`,
        code($(node).find('pre code > span').toArray().map((line) => $(line).text()).join('\n'))
      ])), prose('.blank-lines__note')
    ])
    case 'Builder': return join([
      '## Inputs', table(['Field', 'Example value', 'Guidance'], $('.bld-field').toArray().map((node) => {
        const control = $(node).find('input, textarea').first()
        return [$(node).children('.t-label').text(), control.attr('value') || control.text() || 'Empty', $(node).find('small').text()]
      })),
      '## Example output', code($('.bld .msg-line').toArray().map((node) =>
        $(node).hasClass('is-blank') ? '' : $(node).clone().find('.msg-n').remove().end().text()
      ).join('\n')), prose('.bld-note')
    ])
    case 'Validator': return join([
      '## Example input',
      'This fixed example illustrates the message format. The interactive tool refreshes its example timestamps when loaded; time-dependent checks can flag the fixed timestamps below.',
      code(exampleMessage())
    ])
    case 'ContactForm': return join([
      '## Contact form inputs', table(['Field', 'Required', 'Maximum length', 'Guidance'],
        $('.contact-form label').not('.contact-trap label').toArray().map((node) => {
          const control = $(node).find('input, textarea').first()
          return [$(node).children('span').clone().find('em').remove().end().text().trim(),
            control.is('[required]') ? 'Required' : 'Optional', `${control.attr('maxlength')} characters`, control.attr('placeholder') || '']
        }))
    ])
    default: throw new Error(`Add a Markdown representation for <${name}>`)
  }
}
