# siwe.xyz

The site for [Sign in with Ethereum](https://eips.ethereum.org/EIPS/eip-4361).
One site, five things: the landing page, the documentation, the libraries, the
blog, and the tools.

Built with [VitePress 2](https://vitepress.dev). The docs use the default theme,
because for reference material it is already the best thing available; everything
else is hand-built on top of it.

```sh
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # → .vitepress/dist
pnpm preview
pnpm typecheck
pnpm check:agent-content # validate the last build's Markdown exports and links
```

Node 22.12 or newer. VitePress 2 dropped Node 20 but ships no `engines` field, so
nothing will warn you.

## What lives where

```
.vitepress/
  config.ts              site config, nav, sidebar
  rss.ts                 feed.rss, generated in buildEnd
  og.ts                  per-page Open Graph images, generated in buildEnd
  agent-content.ts       llms.txt and clean Markdown, generated in buildEnd
  agent-components.ts    semantic exports of interactive component content
  theme/
    index.ts             registers every global component
    Layout.vue           default theme + our slots
    style/               tokens.css, base.css, vp.css, fonts.css
    components/          the landing sections, the tools, the mark
    data/                ecosystem, libraries, stories, categories, posts loader
    lib/siwe/            the ERC-4361 parser, linter and fixer
    lib/example.ts       the one example message the whole site shares
    mark/                the brand engine, vendored — see below
src/
  index.md               the landing page
  contact.md             the contact form, posting to the API below
  docs/                  the documentation
  blog/                  posts, one directory per category
  ecosystem/  tools/  brand.md
  public/                fonts, favicon, the three case-study marks
api/                     the contact/newsletter service — see api/README.md
```

`pnpm build` generates a 1200 × 630 PNG for every Markdown page under the
build output's `og/` directory and writes matching Open Graph and Twitter
metadata into every rendered page. `pnpm og` is a convenient alias for that build.

## Agent-readable content

Every build also writes `/llms.txt`, a concise index prioritizing the quickstart,
security guidance and libraries, and a Markdown counterpart of every content
page. For example, `/` has `/index.md`, `/docs/quickstart/` has
`/docs/quickstart/index.md`, and `/docs/message` has `/docs/message.md`.
Each HTML page advertises its counterpart with `rel="alternate"` and
`type="text/markdown"`, and the index with `rel="describedby"`.

The exporter converts only the rendered article content, keeping Vue-backed
pages synchronized with the website. It restores fenced examples from the source
Markdown so syntax highlighting cannot change their whitespace. Page links point
to the Markdown counterparts, downloads keep their original URLs, and explicit
heading anchors preserve API reference links. `APP_HOST` controls the generated
origin, as it does for the site's page metadata.

Component adapters in `.vitepress/agent-components.ts` omit UI controls and
decorations and expand content hidden behind interaction: all libraries, brand
states and ecosystem entries. Shared data modules drive both Vue and the export.
When adding a component whose initial HTML does not contain its full meaning,
extend its adapter and the output checks. Tools and contact pages can also use
`agentSummary: |` frontmatter for a nonvisual Markdown explanation of their
inputs, outputs and limitations. This is rendered and linked by the exporter.

`pnpm check:agent-content` checks the build's page inventory, discovery metadata,
code examples, local links and anchors, and representative component content.
Run it after `pnpm build`, with the same `APP_HOST` if overridden. The existing
site builds pages marked `draft: true` but omits them from blog listings; their
Markdown counterparts exist too, while `/llms.txt` omits them. The generated 404
page has no Markdown alternate.

For a local nginx serving the build with this repository's configuration, add
`AGENT_CONTENT_BASE_URL=http://127.0.0.1:PORT` to the check command to test HTTP
responses, compression, content types and legacy redirects too.

Production nginx serves `.md` as `text/markdown; charset=utf-8` and `/llms.txt`
as `text/plain; charset=utf-8`, with a `describedby` Link header on Markdown
responses. Missing Markdown URLs remain 404s. No generated exports are committed.

## Two things that are copied on purpose

**The mark engine.** `.vitepress/theme/mark/scanlines.js` and `icon.js` are
byte-for-byte copies from
[signinwithethereum/brand-experiments](https://github.com/signinwithethereum/brand-experiments).
Do not edit them here — change them there and copy again, so the site and the
brand repository cannot drift. `mark/index.ts` is the only local file: it types
the engine and loads it on the client.

**The validator.** `.vitepress/theme/lib/siwe/` is the linter that shipped on
docs.siwe.xyz, moved across unchanged. It was written as framework-free
TypeScript, so all of it ported; only the interface is new. Its Jest suites
(~1,500 lines) were left behind in the old repository and are worth bringing over.

## Adding things

**An ecosystem entry** — one object in `.vitepress/theme/data/ecosystem.ts`. No
logo: third-party marks arrive in mixed polarity and a wall of 90 of them says
less than 90 legible names. Add a `note` if there is something specific to say.

**A blog post** — a markdown file in `src/blog/<category>/`. The category comes
from the directory, so the URL and the category cannot disagree. Frontmatter
needs `title`, `date` and `description`; the byline is rendered by the layout.

**A blog category** — a directory, an `index.md` holding
`<BlogIndex category="the-slug" />`, and an entry in `data/categories.ts`. A
category with no posts is hidden rather than shown with a zero.

**A docs page** — a markdown file under `src/docs/`, plus a sidebar entry in
`.vitepress/config.ts`. Internal links are absolute and extensionless
(`/docs/quickstart/`), and `ignoreDeadLinks` is off, so a wrong one fails the
build rather than shipping.

## Design

Everything comes off the mark. It is a 31 × 9 grid with ink on rows 0, 2, 4, 6
and 8 — so the cell is the unit, section dividers are two hairlines a cell apart
(an ink row and its gap, at page scale), and there are exactly four colour roles.

The tokens are named `--canvas`, `--field`, `--ink` and `--accent` on purpose:
those are the four names the mark engine reads, so a mark inherits whatever
palette it sits in with no mapping layer. A `.screen` panel rebinds them to the
screen palette and a mark inside one follows automatically.

`--accent` is `#7f00f6` in both themes and is for fills. `--accent-ui` is the
readable sibling per theme — 7.4:1 on white, 7.6:1 on black — and is what carries
text and links.

Geist Sans for prose, Geist Mono for labels, values, code and anything a machine
wrote. Both variable, both self-hosted. See [`/brand`](https://siwe.xyz/brand).

## Deploying

Static build → nginx → Kamal, the same shape as the two sites this replaces.

```sh
cp .env.production.example .env.production   # fill it in; it is gitignored
cp .kamal/secrets.example .kamal/secrets

pnpm kamal:setup     # first time
pnpm kamal:deploy
pnpm kamal:logs
```

`config/deploy.yml` claims `APP_HOST` — `siwe.xyz` — plus four retired names
the same container answers on only to redirect them: `www.siwe.xyz`,
`next.siwe.xyz` (the pre-release hostname for this rewrite) and `docs.siwe.xyz`
(the Docusaurus site this replaces), plus `oidc-demo.siwe.xyz`. The legacy docs
host maps known pages directly under `/docs/`, while the retired OIDC demo
lands on the current provider documentation. Each retired hostname still needs
DNS pointing at `DEPLOY_HOST` (directly or through the CDN); the Kamal host list
only routes requests after they reach the server.

The contact form and the newsletter signup post to a small companion service —
plain Node plus PostgreSQL, forwarding contact mail via Resend — that lives in
`api/` and deploys as its own Kamal app (`config/deploy.api.yml`, the
`kamal:api:*` scripts) on the same server under `API_HOST`. The site build
bakes `https://API_HOST` in as the endpoint, so point DNS for it at
`DEPLOY_HOST` before the cutover. See `api/README.md`.

Do not commit `.env.production`. The repository this replaces committed its deploy
host and registry username.

## Licence

MIT. The mark and the wordmark are covered by the brand guidance at `/brand`.
