# Xinrui Wu · Academic Homepage

Static academic website for [gintmr.github.io](https://gintmr.github.io/), with Home, Publications, Projects, and CV pages. The interface reuses the personal site's Noto font families, violet grid, rounded navigation, translucent borders, and script watermark. Academic content is maintained separately from the layout.

## Preview

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/`. The generated HTML files can be served directly by GitHub Pages. No package installation or browser-side framework is required.

## LaTeX CV template

This repository includes a reusable [LaTeX CV template](cv-template/main.tex) and a [PDF preview](cv-template/cv-template-preview.pdf).

## Update content

- `user-data/data.js`: profile, publications, education, research interests, experience, and awards.
- `profile.logo` points to the selected illustrated avatar in `assets/branding/`, shared by the navigation, favicon, and Apple touch icon. It is an unchanged copy of `output/logo-concepts-2026-09-11/01-color-flat.png`. `profile.portrait` independently controls the homepage and social preview photograph, currently the approved 1286 × 1223 AI-enhanced image in `assets/portraits/`. The original `个人照2.jpg` is retained.
- `user-data/projects.js`: project descriptions, official demo URLs, and repository links.
- `build.mjs`: shared page templates and metadata.
- `vendor/gintmr-ui`: the shared UI library used by this site and the personal blog. It owns the design tokens, navigation, page outline, decorative effects, and content cards. Edit styles or behaviour there, not here. **This directory is a local working copy and is deliberately untracked** — see below.
- `css/visitors.css` and `visitors.js`: the visitor card, its table controls, and the analytics data contract, which stay local to this repository.

The library is not tracked here on purpose. GitHub Pages' build checks out submodules recursively, and the library is a private repository, so the checkout step fails outright (`repository 'https://github.com/gintmr/gintmr-ui.git/' not found`) and nothing gets deployed. Instead the build copies the library's `dist/` into this repository's own `ui/` directory, and that committed copy is what ships. Every page references `/ui/gintmr-ui.css` and `/ui/gintmr-ui.js`.

A fresh clone therefore needs the library placed manually — and so does the build, which stops with an explicit message if it is missing:

```sh
git clone git@github.com:gintmr/gintmr-ui.git vendor/gintmr-ui
(cd vendor/gintmr-ui && node build.mjs)   # 产出 dist/
``` Set `--gintmr_ui-max-width` and `--gintmr_ui-inline-padding` in the library to change the width and padding of every page, including the navigation and CV preview container.

After changing content, templates, or the CV PDF — and after every library update — regenerate the four public navigation pages and the unlisted history page. The build re-copies `ui/` from the library working copy and adds content-based version identifiers to the stylesheet, script, logo, and CV PDF URLs so all pages load the updated assets:

```sh
git -C vendor/gintmr-ui pull        # 更新这份本地副本
node build.mjs
```

Commit the generated `index.html`, `publication/index.html`, `project/index.html`, `cv/index.html`, and `visit-history/index.html` along with source changes. The initial theme is light; the header toggle saves the user's choice across pages. The centered content and navigation containers have a maximum width of 75rem (1200px), with responsive side padding on smaller screens. Academic content and desktop navigation also work without JavaScript.

Every page includes an outline with native section anchors and scroll-based highlighting. It follows Embedded-Studio's Fumadocs design: an indented heading rail, accent-colored active segment, and moving dot. When the side margin fits `--outline-width` and `--outline-gap`, the outline sits to the right without narrowing the content. Otherwise it becomes a collapsible bar below the main navigation. Its entries come from `pageOutline()` in `build.mjs`; institution, publication, and project links reuse the content data. The CV outline links to the document section; the embedded PDF keeps its own page controls.

All content headings are self-links. Clicking one updates the URL fragment, smoothly aligns it below the sticky navigation, and gives it keyboard focus. A small purple accent fades into the heading's normal text color; hovering or focusing gently extends that gradient over 320ms. Reduced-motion preferences disable the transition and smooth scrolling; forced-colors and print modes use solid text. Paper resource links remain beneath each paper title.

All four pages share the decorative effects owned by the library: a slow background glow, eight softly twinkling points (four on mobile), and short mouse-click particle bursts. The layers pass pointer events through and are hidden from assistive technology. Reduced-motion preferences disable the effects, and hidden pages pause them and clear particles. Click particles are bounded and removed when their animations finish; no continuous JavaScript render loop or animation library is used. Theme colors follow the library palette, which derives every surface from eight input colors.

## Content sources

The supplied `XinruiWu-27fall-CV.pdf` is the current source for CV content and section names. It is copied to `assets/cv/Xinrui-Wu-CV.pdf`; the site build embeds that file and does not modify it.

The **Publications** page follows the five papers listed in the CV: BudgetThinker, MaskGuide, ImageTime, Hierarchical Relational Trajectory Modeling for Longitudinal Clinical Prognosis, and BiDeMem. The page uses a single list, matching the CV's author order, titles, equal-contribution marks, and statuses.

The home page's matching section headings are Education, Research Interests, Research Experience, and Honors & Awards. The research-interest entries follow the CV's order, with Clinical AI last. The CV button and navigation open `/cv/`; that page embeds the PDF and offers direct open/download links.

To update the document, replace this repository’s PDF with the newly compiled CV, then run `node build.mjs`; the build does not access the separate CV project. It hashes the PDF's content and applies one shared `?v=` version to the embedded document, Open PDF link, download links, and fallback links. Updating the PDF therefore gives the browser a new URL while all CV entrypoints refer to the same document version.

## Visitor statistics

The Home page has a custom Visitors card and country map. All four pages share a
small collector. The site continues to run on GitHub Pages; the collector and
aggregate API run in a Supabase Edge Function.

The selected existing Supabase project is `gjofwuihpzjfqeaysuuy`, which also serves
the personal blog. Academic statistics use the independent `visitor_analytics`
schema and namespaced functions, so `/` visits cannot merge with the blog's `/`
records. No blog source, tables, credentials or grants are modified.

- `user-data/visitors.js`: public endpoint, allowed production origins and enable
  switch. **Enabled after test cleanup and a real browser read check.**
  SQL and the Edge Function are deployed; the verified
  IP and country.is configuration is saved. Live anonymous collection, retries,
  cross-page deduplication and country aggregation passed. See `supabase/README.md`
  for deployment and validation details. The three synthetic pageviews were
  removed on 11 September 2026; SQL, the public API and the local page confirmed
  zero real counts. Localhost reads totals but never records visits.
- `visitor-markup.mjs`, `visitors.js`, `css/visitors.css`: component, collector,
  display and theme styling. The main card shows three totals and the simplified
  SVG country map with no visible map labels. A compact, always-visible analysis
  card immediately below the map contains today's totals and country pageviews
  and visitor-days. Home has no expandable panel or individual visit records.
  `assets/maps/source/` archives the earlier official standard-map artwork; it is
  not the displayed map.
- `supabase/`: reviewed migration, Edge Function and secret template. See
  [the deployment instructions](supabase/README.md) for reusing the existing
  project. No third Supabase project is needed. Its quotas are shared.

Preview the layout at `http://127.0.0.1:4173/?visitor-demo=1#visitors-heading`.
The standalone history preview is `/visit-history/?visitor-demo=1` on localhost.
The sample-data badge is intentional: this mode is available only on localhost,
never records visits, and never substitutes for a production API error. The
normal unconnected page displays dashes, not fabricated counts.

Page views count accepted page loads. Visitor-days sum **daily** deduplicated
visitors, not distinct people over all time. Country locations are approximate;
unavailable locations remain unknown. Historical aggregate counts persist, while
short-lived deduplication and rate-limit records are cleaned up automatically.
Visit history records server time, approximate country/region and one of the four
allowed page paths; it contains no raw IP address or visitor identifier. The
unlisted `/visit-history/` page loads 20 records per page, with Previous/Next controls
and a direct page-number jump. Page navigation reuses a maximum-record-ID snapshot
so newly arriving visits do not shift records between pages; Refresh starts at
the newest page. At the owner's request, all academic visitor statistics and
history were reset at 01:28:29 on 12 September 2026 (Asia/Dubai), equivalent to
21:28:29 UTC on 11 September. SQL verified zero pageviews, visitor-days, countries
and history rows. The collector remains enabled and records new visits normally.
This supersedes the earlier cleanup of 71 timestamp-only legacy records.

`visit-history.js` is loaded only on the standalone history page. That page does
not record visits or fetch the summary, has `noindex, nofollow, noarchive` metadata,
and has no entrypoint in public navigation or any other page. There is no sitemap
entry. This is intentionally an unlisted public page, not authenticated access;
the owner accepted direct-URL/source discovery. Existing Supabase storage and
the public read-only activity API continue to serve the records; no new database,
password system, repository visibility change, or server deployment is involved.

Run `npm ci` then `npm test` for client and backend checks, including the SQL
migration executed in PGlite (PostgreSQL/WASM). These do not replace a live
Supabase gateway/CORS/permission check. `node build.mjs` needs no dependencies.
`npm run analytics:bundle` also generates a single-file Edge Function for the
Supabase dashboard editor; it contains no secrets.

## Project previews

The project website addresses are verified from each project's repository metadata and source:

- [Papertone](https://github.com/gintmr/Papertone): [bilingual paper-podcast listening library](https://gintmr.github.io/Papertone/).
- [Research OS](https://github.com/gintmr/ResearchOS-Public): [read-only demonstration](https://gintmr.github.io/ResearchOS-Public/), using fictional example research data.
- [FinGraph](https://github.com/gintmr/FinGraph): [interactive dashboard](https://fin-graph-two.vercel.app/).
- [UESTC SISE Embedded Studio](https://github.com/UESTC404/Embedded-Studio): [official website and knowledge hub](https://uestc404.github.io/Embedded-Studio/).

All four previews load directly in sandboxed iframes. Each panel also provides a link to open the website separately. Their availability and content are controlled by the respective deployments.

## Fonts and credits

Noto Serif SC Variable and Noto Sans SC Variable are self-hosted copies of the same Fontsource packages used by the personal site. Unicode-range declarations let browsers fetch only required character subsets. Their OFL license files are included under `assets/fonts/`. The watermark uses the personal site's system font stack: Snell Roundhand, Apple Chancery, Segoe Script, Brush Script MT, cursive. Its exact rendering depends on installed system fonts, as on the personal site.

The original academic site was forked from [Vinay Somawat](https://vinaysomawat.github.io/); its MIT license is retained.
