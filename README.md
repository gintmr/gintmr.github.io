# Xinrui Wu · Academic Homepage

Static academic website for [gintmr.github.io](https://gintmr.github.io/), with Home, Publication, Project, and CV pages. The interface reuses the personal site's Noto font families, violet grid, rounded navigation, translucent borders, and script watermark. Academic content is maintained separately from the layout.

## Preview

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/`. The generated HTML files can be served directly by GitHub Pages. No package installation or browser-side framework is required.

## Update content

- `user-data/data.js`: profile, publications, education, research interests, experience, and awards.
- `profile.logo` points to the selected illustrated avatar in `assets/branding/`, shared by the navigation, favicon, and Apple touch icon. It is an unchanged copy of `output/logo-concepts-2026-09-11/01-color-flat.png`. `profile.portrait` independently controls the homepage and social preview photograph, currently the approved 1286 × 1223 AI-enhanced image in `assets/portraits/`. The original `个人照2.jpg` is retained.
- `user-data/projects.js`: project descriptions, official demo URLs, and repository links.
- `build.mjs`: shared page templates and metadata.
- `css/style.css`: the shared UI, mobile layouts, themes, and print styles. Set `--site-max-width` and `--site-inline-padding` in `:root` to change the width and padding of every page, including the navigation and CV preview container.
- `index.js`: theme preference, mobile navigation, page outline, and responsive iframe scaling.

After changing content, templates, CSS, JavaScript, or the logo, regenerate the four HTML pages. The build adds content-based version identifiers to the shared stylesheet, script, and logo URLs so all pages load the updated assets:

```sh
node build.mjs
```

Commit the generated `index.html`, `publication/index.html`, `project/index.html`, and `cv/index.html` along with source changes. The initial theme is light; the header toggle saves the user's choice across pages. The centered content and navigation containers have a maximum width of 75rem (1200px), with responsive side padding on smaller screens. Academic content and desktop navigation also work without JavaScript.

Every page includes an outline with native section anchors and scroll-based highlighting. It follows Embedded-Studio's Fumadocs design: an indented heading rail, accent-colored active segment, and moving dot. When the side margin fits `--outline-width` and `--outline-gap`, the outline sits to the right without narrowing the content. Otherwise it becomes a collapsible bar below the main navigation. Its entries come from `pageOutline()` in `build.mjs`; institution, publication, and project links reuse the content data. The CV outline links to the document section; the embedded PDF keeps its own page controls.

All content headings are self-links. Clicking one updates the URL fragment, smoothly aligns it below the sticky navigation, and gives it keyboard focus. Hovering or focusing a heading expands its gradient underline over 280ms, matching the personal blog; reduced-motion preferences disable the transition and smooth scrolling. Paper resource links remain beneath each paper title.

All four pages share the decorative effects in `css/effects.css` and `effects.js`: a slow background glow, eight softly twinkling points (four on mobile), and short mouse-click particle bursts. The layers pass pointer events through and are hidden from assistive technology. Reduced-motion preferences disable the effects, and hidden pages pause them and clear particles. Click particles are bounded and removed when their animations finish; no continuous JavaScript render loop or animation library is used. Theme colors follow the site's shared palette.

## Content sources

The accompanying CV's `main.tex`, `subfolders/Interests.tex`, and `subfolders/Scholarships-Prizes.tex` supply the September 2026 academic content. Institution logos are copied from that CV directory. Neither the CV nor personal-site source is modified by the build.

Publication content follows the author's latest updates where they differ from the accompanying CV. The Publication page groups first-author and co-first-author papers under **Core Author**; all records with the contributing-author role, including the second-author OCG paper, appear under **Contributing Author**. Each paper retains its own acceptance or submission status.

BudgetThinker and ParaThinker are accepted by EMNLP 2026, and MaskGuide is accepted by IEEE Robotics and Automation Letters. ImageTime is **Submitted to WACV 2027**. HiReT and the action-aware clinical world-model manuscript are submitted to ICLR 2027; HiReT replaces the previous HiCausal entry. The author supplied complete author lists for BudgetThinker and ParaThinker, the updated ParaThinker title, and the OCG entry submitted to NeurIPS 2026 Workshop BeNTo with its alphaXiv link. BudgetThinker marks Hao Wen and Xinrui Wu as equal contributors.

SeaTree: Tracing Marine Creatures through Taxonomic Tree is **Submitted to AAAI 2027** and retains its contributing-author role. Its author list is Yiwei Chen, Zheng Ziqiang, Xinrui Wu, Sai-Kit Yeung. All publication author lists render without hyperlinks, preserving name order, Xinrui Wu's bold emphasis, and any supplied contribution markers. No equal-contribution markers or paper URL are inferred for SeaTree.

HKUST dates follow the CV (July–August 2025). The CV button and navigation open `/cv/`. This page embeds `assets/cv/Xinrui-Wu-CV.pdf`, copied from the accompanying CV project’s `Output/main.pdf`, and offers direct open/download links. To update the document, replace this repository’s PDF with the newly compiled CV; the build does not access the separate CV project.

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
  display and theme styling. `assets/maps/source/` includes the unchanged official
  standard-map JPG and its provenance. Counts appear in a separate country/region
  list; no generic boundary polygons are overlaid on the official artwork.
- `supabase/`: reviewed migration, Edge Function and secret template. See
  [the deployment instructions](supabase/README.md) for reusing the existing
  project. No third Supabase project is needed. Its quotas are shared.

Preview the layout at `http://127.0.0.1:4173/?visitor-demo=1#visitors-heading`.
The sample-data badge is intentional: this mode is available only on localhost,
never records visits, and never substitutes for a production API error. The
normal unconnected page displays dashes, not fabricated counts.

Page views count accepted page loads. Visitor-days sum **daily** deduplicated
visitors, not distinct people over all time. Country locations are approximate;
unavailable locations remain unknown. Historical aggregate counts persist, while
short-lived deduplication and rate-limit records are cleaned up automatically.

Run `npm ci` then `npm test` for client and backend checks, including the SQL
migration executed in PGlite (PostgreSQL/WASM). These do not replace a live
Supabase gateway/CORS/permission check. `node build.mjs` needs no dependencies.
`npm run analytics:bundle` also generates a single-file Edge Function for the
Supabase dashboard editor; it contains no secrets.

## Project previews

The official demo addresses are verified from each project's repository metadata and README:

- [Research OS](https://github.com/gintmr/ResearchOS-Public): [read-only demonstration](https://gintmr.github.io/ResearchOS-Public/), using fictional example research data.
- [FinGraph](https://github.com/gintmr/FinGraph): [interactive dashboard](https://fin-graph-two.vercel.app/).

Both previews load directly in sandboxed iframes. Each panel also provides a link to open the demo separately. Their availability and content are controlled by the respective deployments.

## Fonts and credits

Noto Serif SC Variable and Noto Sans SC Variable are self-hosted copies of the same Fontsource packages used by the personal site. Unicode-range declarations let browsers fetch only required character subsets. Their OFL license files are included under `assets/fonts/`. The watermark uses the personal site's system font stack: Snell Roundhand, Apple Chancery, Segoe Script, Brush Script MT, cursive. Its exact rendering depends on installed system fonts, as on the personal site.

The original academic site was forked from [Vinay Somawat](https://vinaysomawat.github.io/); its MIT license is retained.
