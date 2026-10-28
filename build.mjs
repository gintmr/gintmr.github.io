import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { profile, researchAreas, publications, experience, education, awards } from './user-data/data.js';
import { projects } from './user-data/projects.js';
import { visitorConfig } from './user-data/visitors.js';
import { visitorMarkup, visitorHistoryMarkup } from './visitor-markup.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));

// 组件库以本地工作副本挂在 vendor/gintmr-ui，构建时把 dist/ 拷进仓库根的 ui/。
//
// 这一份副本【故意不跟踪】、不进仓库：GitHub Pages 的构建会递归拉 submodule，
// 而组件库是私有仓库、Actions 的令牌拿不到，构建会直接卡在 checkout
// （annotations: repository 'https://github.com/gintmr/gintmr-ui.git/' not found）。
// 线上真正被引用的就是下面这份 ui/ 拷贝，所以只要它进了仓库，Pages 就能直发。
const libraryDist = `${root}vendor/gintmr-ui/dist/`;
if (!existsSync(libraryDist)) {
  throw new Error(
    `找不到组件库产物：${libraryDist}\n` +
      '学术站的 vendor/gintmr-ui 是本地工作副本，不随仓库走。新克隆后先放好它：\n' +
      '  git clone git@github.com:gintmr/gintmr-ui.git vendor/gintmr-ui\n' +
      '  (cd vendor/gintmr-ui && node build.mjs)'
  );
}
await mkdir(`${root}ui`, { recursive: true });
for (const file of ['gintmr-ui.css', 'gintmr-ui.js', 'theme-preload.js']) {
  await copyFile(`${libraryDist}${file}`, `${root}ui/${file}`);
}

// All generated pages reference the same asset versions, so layout edits cannot
// leave individual subpages using a previously cached stylesheet, script, logo, or CV.
const [libraryStyleUrl, opportunityStyleUrl, libraryScriptUrl, logoUrl, visitorStyleUrl, visitorScriptUrl, historyScriptUrl, cvPdfUrl] = await Promise.all(['/ui/gintmr-ui.css', '/css/home-opportunity.css', '/ui/gintmr-ui.js', profile.logo, '/css/visitors.css', '/visitors.js', '/visit-history.js', profile.cvPdfUrl].map(async path => {
  const version = createHash('sha256').update(await readFile(`${root}${path.slice(1)}`)).digest('hex').slice(0, 12);
  return `${path}?v=${version}`;
}));
const themePreload = (await readFile(`${root}ui/theme-preload.js`, 'utf8')).trim();

const escape = (text = '') => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const arrow = '<span aria-hidden="true">↗</span>';
const external = (url, label, className = '') => `<a href="${escape(url)}" class="${className}" target="_blank" rel="noopener noreferrer">${label} ${arrow}</a>`;
const icon = (name) => {
  const paths = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    moon: '<path d="M20 14.4A8.5 8.5 0 0 1 9.6 4a8.5 8.5 0 1 0 10.4 10.4Z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    outline: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    cv: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    scholar: '<path d="m2 9 10-5 10 5-10 5Z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6"/>',
    paper: '<path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2Z"/><path d="M22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7Z"/>',
    github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  };
  return `<svg class="gintmr_ui-icon gintmr_ui-icon-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};
const pages = [{ id: 'home', label: 'Home', path: '/' }, { id: 'publication', label: 'Publications', path: '/publication/' }, { id: 'project', label: 'Projects', path: '/project/' }, { id: 'cv', label: 'CV', path: profile.cvUrl }];
// This page is deliberately absent from the public navigation and page outlines.
const historyPage = { id: 'visit-history', label: 'Visit history', path: '/visit-history/' };
const linkedHeading = (tag, id, title, className = '') => `<${tag} class="${className}" id="${id}" tabindex="-1"><a class="gintmr_ui-heading-anchor" href="#${id}">${title}</a></${tag}>`;
// Only the accent word is tinted, so the color change never lands mid-word. By default it is
// the lead phrase before a colon, comma, or question mark (up to five words), else the first word.
const accented = (text, accent) => {
  if (!accent) {
    const lead = text.match(/^(.+?)([:,?])\s/);
    accent = lead && lead[1].split(' ').length <= 5 ? `${lead[1]}${lead[2] === '?' ? '?' : ''}` : text.split(' ')[0];
  }
  const start = text.indexOf(accent);
  return `${escape(text.slice(0, start))}<span class="gintmr_ui-heading-accent">${escape(accent)}</span>${escape(text.slice(start + accent.length))}`;
};
const heading = (id, title) => linkedHeading('h2', `${id}-heading`, accented(title), 'gintmr_ui-section-title');
const logo = (url, name) => `<div class="gintmr_ui-institution-logo"><img src="${url}" alt="${escape(name)} logo" width="48" height="48" loading="lazy" /></div>`;
// The timeline reads top to bottom, so experience is ordered by start date (newest first).
const startOf = item => Date.parse(`1 ${item.period.split(' – ')[0]}`);
const timeline = [...experience].sort((a, b) => startOf(b) - startOf(a));
// Award level and rank come from the title; each level gets its own badge color.
const awardLevel = title => /Scholarship/.test(title) ? 'scholarship' : /Provincial/.test(title) ? 'provincial' : 'national';
const awardLabel = { national: 'National', provincial: 'Provincial', scholarship: 'Scholarship' };
const awardTitle = title => escape(title).replace(/(First|Second|Third) Prize/, (prize, rank) => `<span class="gintmr_ui-award-rank" data-rank="${rank.toLowerCase()}">${prize}</span>`);
const awardYears = [...new Set(awards.map(item => item.year))].sort((a, b) => b - a);
const updated = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

function pageOutline(page) {
  const entries = {
    home: [
      { id: 'about', label: 'About' },
      { id: 'education', label: 'Education' },
      { id: 'research', label: 'Research Interests' },
      { id: 'experience', label: 'Research Experience' },
      ...timeline.map(item => ({ id: item.id, label: item.shortName, depth: 1 })),
      { id: 'awards', label: 'Honors & Awards' },
      { id: 'visitors', label: 'Visitors' },
    ],
    publication: publications.map(item => ({ id: item.id, label: item.shortName })),
    project: projects.map(item => ({ id: item.id, label: item.name })),
    cv: [{ id: 'cv-heading', label: 'Curriculum Vitae' }],
    'visit-history': [{ id: 'visitor-activity-heading', label: 'Visit history' }],
  }[page.id];
  return `<aside class="gintmr_ui-outline" aria-label="Page outline" data-gintmr_ui-form="inline">
    <div class="gintmr_ui-outline-shell">
      <button class="gintmr_ui-outline-toggle" id="outline-toggle" type="button" aria-expanded="false" aria-controls="outline-panel">
        ${icon('outline')}<span>On this page</span><span class="gintmr_ui-outline-current" aria-hidden="true">${escape(entries[0].label)}</span>${icon('chevron')}
      </button>
      <nav class="gintmr_ui-outline-panel" id="outline-panel" aria-labelledby="outline-heading" data-gintmr_ui-open="false">
        <p class="gintmr_ui-outline-heading" id="outline-heading">${icon('outline')}On this page</p>
        <div class="gintmr_ui-outline-scroll"><div class="gintmr_ui-outline-items">
          <svg class="gintmr_ui-outline-track" width="24" aria-hidden="true"><path class="gintmr_ui-outline-rail"/><path class="gintmr_ui-outline-segment"/><circle class="gintmr_ui-outline-dot" r="2"/></svg>
          <ol class="gintmr_ui-outline-list">${entries.map(item => `<li data-depth="${item.depth || 0}"><a href="#${item.id}">${escape(item.label)}</a></li>`).join('')}</ol>
        </div></div>
      </nav>
    </div>
  </aside>`;
}

function home() {
  const mbzuaiAdvisor = experience.find(item => item.id === 'mbzuai').advisors[0];
  const airAdvisor = experience.find(item => item.id === 'tsinghua-air').advisors[0];
  const introduction = escape(profile.intro[0])
    .replace(mbzuaiAdvisor.name, external(mbzuaiAdvisor.url, escape(mbzuaiAdvisor.name)))
    .replace(airAdvisor.name, external(airAdvisor.url, escape(airAdvisor.name)));
  return `<section class="gintmr_ui-profile" id="about" aria-labelledby="name-heading">
    <div class="gintmr_ui-profile-copy">
      ${linkedHeading('h1', 'name-heading', `${accented(profile.name)} <span lang="zh-CN">${escape(profile.chineseName)}</span>`)}
      <p>${introduction}</p>
      <p>${escape(profile.intro[1])}</p>
      <p class="gintmr_ui-opportunity-line"><span class="gintmr_ui-opportunity-pulse" aria-hidden="true"></span><span>${escape(profile.opportunities)} <a href="mailto:${escape(profile.email)}">${escape(profile.email)}</a></span></p>
    </div>
    <img class="gintmr_ui-portrait" src="${profile.portrait}" width="1286" height="1223" alt="Xinrui Wu" fetchpriority="high" />
    <div class="gintmr_ui-profile-links"><a href="${profile.cvUrl}">${icon('cv')}Curriculum Vitae</a>${[[profile.scholarUrl, 'Google Scholar', 'scholar'], [profile.alphaXivUrl, 'alphaXiv', 'paper'], [profile.githubUrl, 'GitHub', 'github']].map(([url, label, name]) => `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${icon(name)}${label}</a>`).join('')}<a href="mailto:${escape(profile.email)}">${icon('mail')}Email</a></div>
  </section>
  <section class="gintmr_ui-section" id="education" aria-labelledby="education-heading">
    ${heading('education', 'Education')}
    ${education.map((item, index) => `<article class="gintmr_ui-entry gintmr_ui-education-entry">${logo(item.logo, 'UESTC')}<div>${linkedHeading('h3', `education-${index + 1}-heading`, `${accented(item.institution, item.accent)}${item.designation ? ` <span class="gintmr_ui-institution-badge">${escape(item.designation)}</span>` : ''}`)}<p>${escape(item.degree)}</p><p class="gintmr_ui-meta">${escape(item.period)} <span class="gintmr_ui-separator">·</span> ${escape(item.detail)}</p></div></article>`).join('')}
  </section>
  <section class="gintmr_ui-section" id="research" aria-labelledby="research-heading">
    ${heading('research', 'Research Interests')}
    <ul class="gintmr_ui-interest-list">${researchAreas.map(area => `<li><strong>${escape(area.title)}:</strong> ${escape(area.description)}</li>`).join('')}</ul>
  </section>
  <section class="gintmr_ui-section" id="experience" aria-labelledby="experience-heading">
    ${heading('experience', 'Research Experience')}
    <ol class="gintmr_ui-timeline">${timeline.map(item => {
      const [start, end] = item.period.split(' – ');
      return `<li class="gintmr_ui-timeline-item" data-gintmr_ui-current="${end === 'Present'}">
      <p class="gintmr_ui-timeline-date"><time>${escape(start)}</time><span>${end === 'Present' ? 'Present' : escape(end)}</span></p>
      <span class="gintmr_ui-timeline-dot" aria-hidden="true"></span>
      <article class="gintmr_ui-entry gintmr_ui-experience-entry" id="${item.id}">
      ${logo(item.logo, item.shortName)}<div class="gintmr_ui-entry-content">
        <div class="gintmr_ui-entry-heading">${linkedHeading('h3', `${item.id}-heading`, accented(item.organization, item.accent))}</div>
        <p class="gintmr_ui-role">${escape(item.role)} <span class="gintmr_ui-separator">·</span> <span class="gintmr_ui-meta">${escape(item.location)}</span></p>
        <p class="gintmr_ui-advisors">${item.advisors.length > 1 ? 'Advisors' : 'Advisor'}: ${item.advisors.map(person => person.url ? external(person.url, escape(person.name)) : escape(person.name)).join(', ')}</p>
        <p class="gintmr_ui-experience-description">${escape(item.description)}</p>
      </div></article></li>`;
    }).join('')}</ol>
  </section>
  <section class="gintmr_ui-section" id="awards" aria-labelledby="awards-heading">
    ${heading('awards', 'Honors & Awards')}
    <div class="gintmr_ui-awards">${awardYears.map(year => `<section class="gintmr_ui-award-year" aria-label="${year}">
      <p class="gintmr_ui-award-year-label">${year}</p>
      <ul class="gintmr_ui-awards-list">${awards.filter(item => item.year === year).map(item => {
        const level = awardLevel(item.title);
        return `<li data-level="${level}"><div><strong>${awardTitle(item.title)}</strong><p class="gintmr_ui-meta">${escape(item.detail)}</p></div><span class="gintmr_ui-award-badge">${awardLabel[level]}</span></li>`;
      }).join('')}</ul>
    </section>`).join('')}</div>
  </section>
  ${visitorMarkup()}`;
}

function publicationPage() {
  const authors = (paper) => escape(paper.authors).replace('Xinrui Wu', '<strong>Xinrui Wu</strong>').replaceAll('*', '<sup>*</sup>').replaceAll('Ma+', 'Ma<sup>+</sup>');
  return `<div class="gintmr_ui-page-heading">${linkedHeading('h1', 'publication-heading', accented('Publications'))}${external(profile.scholarUrl, 'Google Scholar', 'gintmr_ui-heading-link')}</div>
    <p class="gintmr_ui-publication-note">* Equal contribution.</p>
    <div class="gintmr_ui-publication-list">${publications.map(paper => `<article class="gintmr_ui-paper gintmr_ui-entry${paper.teaser ? ' gintmr_ui-paper--teaser' : ''}" id="${paper.id}">
        ${paper.teaser ? `<div class="gintmr_ui-paper-teaser"><img src="${escape(paper.teaser)}" alt="" width="720" height="450" loading="lazy" /></div>` : ''}<div class="gintmr_ui-paper-body">
        ${linkedHeading('h3', `${paper.id}-heading`, accented(paper.title, paper.accent))}
        <p class="gintmr_ui-authors">${authors(paper)}</p>
        <div class="gintmr_ui-paper-meta"><span class="gintmr_ui-venue" data-status="${escape(paper.status)}">${paper.status === 'submitted' ? 'Submitted to ' : ''}${escape(paper.venue)}${/\b20\d{2}\b/.test(paper.venue) ? '' : ` · ${paper.year}`}</span><span class="gintmr_ui-meta">${escape(paper.roleLabel)}</span></div>
        ${paper.links.length ? `<div class="gintmr_ui-paper-links">${paper.links.map(link => external(link.url, escape(link.label))).join('')}</div>` : ''}
      </div></article>`).join('')}</div>`;
}

function projectPage() {
  return `<div class="gintmr_ui-page-heading">${linkedHeading('h1', 'project-heading', accented('Projects'))}</div>
    <div class="gintmr_ui-projects">${projects.map(project => `<article class="gintmr_ui-project-panel" id="${project.id}" aria-labelledby="${project.id}-heading">
      <div class="gintmr_ui-project-copy">${linkedHeading('h2', `${project.id}-heading`, accented(project.name, project.accent))}<p>${escape(project.description)}</p>
        <div class="gintmr_ui-project-links">${external(project.previewUrl, 'Open preview')}${external(project.repositoryUrl, 'GitHub repository')}</div>
      </div>
      <div class="gintmr_ui-project-preview"><div class="gintmr_ui-preview-bar"><span>${project.previewLabel}</span>${external(project.previewUrl, 'Open in new tab')}</div>
        <div class="gintmr_ui-preview-viewport"><iframe src="${project.previewUrl}" title="${project.name} — interactive project preview" loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
      </div>
    </article>`).join('')}</div>`;
}

function cvPage() {
  return `<div class="gintmr_ui-page-heading gintmr_ui-cv-heading">${linkedHeading('h1', 'cv-heading', accented('Curriculum Vitae'))}
    <div class="gintmr_ui-cv-actions">${external(cvPdfUrl, 'Open PDF')}<a href="${escape(cvPdfUrl)}" download="Xinrui-Wu-CV.pdf">Download PDF <span aria-hidden="true">↓</span></a></div>
  </div>
  <object class="gintmr_ui-cv-document" data="${escape(cvPdfUrl)}#view=FitH&amp;navpanes=0" type="application/pdf" aria-label="Xinrui Wu's curriculum vitae" title="Xinrui Wu's curriculum vitae">
    <p>Your browser cannot display this PDF inline. ${external(cvPdfUrl, 'Open the CV PDF')} or <a href="${escape(cvPdfUrl)}" download>download a copy</a>.</p>
  </object>`;
}

function layout(page, content) {
  const description = {
    home: 'Xinrui Wu (吴欣锐), undergraduate at UESTC, visiting student at MBZUAI, and research intern at Tsinghua AIR. Research interests, education, academic experience, and awards.',
    publication: 'Publications by Xinrui Wu in efficient reasoning, computer vision, clinical AI, and world models.',
    project: 'Papertone, Research OS, FinGraph, and UESTC SISE Embedded Studio: project websites, interactive previews, and source repositories.',
    cv: 'Curriculum vitae of Xinrui Wu. View or download the PDF, including education, research experience, publications, and awards.',
    'visit-history': 'Visit history for the academic homepage.',
  }[page.id];
  return `<!doctype html>
<!-- Generated by build.mjs. Edit user-data/ or the build templates, then run node build.mjs. -->
<html lang="en" data-gintmr_ui-effects="on" data-gintmr_ui-outline="reserve">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="theme-color" content="#fffaff" />
  <title>${page.id === 'home' ? 'Xinrui Wu · Academic Homepage' : `${page.label} · Xinrui Wu`}</title>
  <meta name="description" content="${description}" />
  <meta name="author" content="Xinrui Wu" />
  ${page.id === 'visit-history' ? '<meta name="robots" content="noindex, nofollow, noarchive" />' : ''}
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${page.label} · Xinrui Wu" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="https://gintmr.github.io${page.path}" />
  <meta property="og:image" content="https://gintmr.github.io${profile.portrait}" />
  <link rel="canonical" href="https://gintmr.github.io${page.path}" />
  <link rel="icon" href="${escape(logoUrl)}" type="image/png" />
  <link rel="apple-touch-icon" href="${escape(logoUrl)}" />
  <link rel="preload" href="/assets/fonts/noto-serif-sc/files/noto-serif-sc-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin />
  <script>
    ${themePreload.replace(/\n\s*/g, '\n    ').replace(/^\n\s*/, '')}
  </script>
  <link rel="stylesheet" href="/assets/fonts/noto-serif-sc/index.css" />
  <link rel="stylesheet" href="/assets/fonts/noto-sans-sc/index.css" />
  <link rel="stylesheet" href="${libraryStyleUrl}" />${page.id === 'home' ? `
  <link rel="stylesheet" href="${opportunityStyleUrl}" />` : ''}
  <!-- visitors.js 必须排在库脚本之前：库的 boot() 会在 DOMContentLoaded 之前就初始化访客卡，
       那时取数函数还没定义，卡片会停在「尚未接入」。两者都是 defer，按文档顺序执行。
       只读的那个历史页不挂它，那里走自己的只读脚本。 -->
  ${page.id === 'visit-history' ? '' : `<script src="${visitorScriptUrl}" type="module"></script>
  <script id="visitor-config" type="application/json">${JSON.stringify(visitorConfig).replaceAll('<', '\\u003c')}</script>`}
  <script src="${libraryScriptUrl}" defer></script>
  ${page.id === 'home' || page.id === 'visit-history' ? `<link rel="stylesheet" href="${visitorStyleUrl}" />` : ''}
  ${page.id === 'visit-history' ? `<script src="${historyScriptUrl}" type="module"></script>` : ''}
  <script>if (location.pathname === '/' && location.hash === '#publications') location.replace('/publication/');</script>
  ${page.id === 'home' ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Person', name: profile.name, alternateName: profile.chineseName, url: 'https://gintmr.github.io/', sameAs: [profile.scholarUrl, profile.alphaXivUrl, profile.githubUrl], knowsAbout: researchAreas.map(a => a.title) })}</script>` : ''}
</head>
<body data-page="${page.id}" data-gintmr_ui-watermark="Xinrui Wu">
  <a class="gintmr_ui-skip-link" href="#main-content">Skip to content</a>
  <header class="gintmr_ui-header gintmr_ui-header--flat">
    <div class="gintmr_ui-nav-container"><div class="gintmr_ui-header-shell">
      <a class="gintmr_ui-brand" href="/" aria-label="Xinrui Wu — Home"><img class="gintmr_ui-brand-mark" src="${escape(logoUrl)}" width="40" height="40" alt="" /><span>Xinrui Wu</span></a>
      <nav class="gintmr_ui-nav" id="site-nav" aria-label="Main navigation" data-gintmr_ui-open="false">${pages.map(item => `<a href="${item.path}"${page.id === item.id ? ' aria-current="page"' : ''}>${item.label}</a>`).join('')}</nav>
      <div class="gintmr_ui-controls">
        <button class="gintmr_ui-theme-toggle" id="theme-toggle" type="button" aria-label="Switch to dark theme" title="Switch to dark theme">${icon('sun')}${icon('moon')}</button>
        <button class="gintmr_ui-menu-toggle" id="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="site-nav">${icon('menu')}${icon('close')}</button>
      </div>
    </div></div>
  </header>
  ${pageOutline(page)}
  <main class="gintmr_ui-shell" id="main-content">${content}</main>
  <footer class="gintmr_ui-footer gintmr_ui-shell">
    <p class="gintmr_ui-footer-sign" aria-hidden="true">Xinrui Wu</p>
    <div class="gintmr_ui-footer-row">
      <p>© 2026 Xinrui Wu <span class="gintmr_ui-separator">·</span> Last updated ${updated}</p>
      <nav class="gintmr_ui-footer-links" aria-label="Elsewhere">${[[profile.scholarUrl, 'Google Scholar', 'scholar'], [profile.githubUrl, 'GitHub', 'github'], [`mailto:${profile.email}`, 'Email', 'mail']].map(([url, label, name]) => `<a href="${escape(url)}" aria-label="${label}" title="${label}"${url.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener noreferrer"'}>${icon(name)}</a>`).join('')}</nav>
    </div>
  </footer>
</body>
</html>
`;
}

for (const page of [...pages, historyPage]) {
  const directory = page.id === 'home' ? root : `${root}${page.id}/`;
  await mkdir(directory, { recursive: true });
  const html = layout(page, { home, publication: publicationPage, project: projectPage, cv: cvPage, 'visit-history': visitorHistoryMarkup }[page.id]());
  await writeFile(`${directory}index.html`, html.replace(/[\t ]+$/gm, ''));
}
console.log('Generated Home, Publications, Projects, CV, and unlisted visit-history pages.');
