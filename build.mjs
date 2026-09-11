import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { profile, researchAreas, publications, experience, education, awards } from './user-data/data.js';
import { projects } from './user-data/projects.js';
import { visitorConfig } from './user-data/visitors.js';
import { visitorMarkup } from './visitor-markup.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
// All generated pages reference the same asset versions, so layout edits cannot
// leave individual subpages using a previously cached stylesheet, script, or logo.
const [stylesheetUrl, scriptUrl, logoUrl, visitorStyleUrl, visitorScriptUrl] = await Promise.all(['/css/style.css', '/index.js', profile.logo, '/css/visitors.css', '/visitors.js'].map(async path => {
  const version = createHash('sha256').update(await readFile(`${root}${path.slice(1)}`)).digest('hex').slice(0, 12);
  return `${path}?v=${version}`;
}));
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
  };
  return `<svg class="icon icon-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};
const pages = [{ id: 'home', label: 'Home', path: '/' }, { id: 'publication', label: 'Publication', path: '/publication/' }, { id: 'project', label: 'Project', path: '/project/' }, { id: 'cv', label: 'CV', path: profile.cvUrl }];
const publicationGroups = [
  { id: 'core-author', label: 'Core Author', papers: publications.filter(paper => paper.role === 'first') },
  { id: 'contributing-author', label: 'Contributing Author', papers: publications.filter(paper => paper.role === 'contributor') },
];
const linkedHeading = (tag, id, title, className = '') => `<${tag} class="${className}" id="${id}" tabindex="-1"><a class="heading-anchor" href="#${id}">${title}</a></${tag}>`;
const heading = (id, title) => linkedHeading('h2', `${id}-heading`, title, 'section-title');
const logo = (url, name) => `<div class="institution-logo"><img src="${url}" alt="${escape(name)} logo" width="80" height="64" loading="lazy" /></div>`;

function pageOutline(page) {
  const entries = {
    home: [
      { id: 'about', label: 'About' },
      { id: 'education', label: 'Education' },
      { id: 'research', label: 'Research Interests' },
      { id: 'experience', label: 'Research & Internships' },
      ...experience.map(item => ({ id: item.id, label: item.shortName, depth: 1 })),
      { id: 'awards', label: 'Honors & Awards' },
      { id: 'visitors', label: 'Visitors' },
    ],
    publication: publicationGroups.flatMap(group => [
      { id: group.id, label: group.label },
      ...group.papers.map(item => ({ id: item.id, label: item.shortName, depth: 1 })),
    ]),
    project: projects.map(item => ({ id: item.id, label: item.name })),
    cv: [{ id: 'cv-heading', label: 'Curriculum Vitae' }],
  }[page.id];
  return `<aside class="page-outline" aria-label="Page outline">
    <div class="outline-shell">
      <button class="outline-toggle" id="outline-toggle" type="button" aria-expanded="false" aria-controls="outline-panel">
        ${icon('outline')}<span>On this page</span><span class="outline-current" aria-hidden="true">${escape(entries[0].label)}</span>${icon('chevron')}
      </button>
      <nav class="outline-panel" id="outline-panel" aria-labelledby="outline-heading">
        <p class="outline-heading" id="outline-heading">${icon('outline')}On this page</p>
        <div class="outline-scroll"><div class="outline-items">
          <svg class="outline-track" width="24" aria-hidden="true"><path class="outline-rail"/><path class="outline-segment"/><circle class="outline-dot" r="2"/></svg>
          <ol class="outline-list">${entries.map(item => `<li data-depth="${item.depth || 0}"><a href="#${item.id}">${escape(item.label)}</a></li>`).join('')}</ol>
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
  return `<section class="profile" id="about" aria-labelledby="name-heading">
    <div class="profile-copy">
      ${linkedHeading('h1', 'name-heading', `${escape(profile.name)} <span lang="zh-CN">${escape(profile.chineseName)}</span>`)}
      <p>${introduction}</p>
      <p>${escape(profile.intro[1])}</p>
      <p>${escape(profile.opportunities)} Please contact me at <a href="mailto:${escape(profile.email)}">${escape(profile.email)}</a>.</p>
    </div>
    <img class="portrait" src="${profile.portrait}" width="1286" height="1223" alt="Xinrui Wu" fetchpriority="high" />
    <div class="profile-links"><a href="${profile.cvUrl}">Curriculum Vitae</a>${external(profile.scholarUrl, 'Google Scholar')}${external(profile.alphaXivUrl, 'alphaXiv')}${external(profile.githubUrl, 'GitHub')}<a href="mailto:${profile.email}">Email ${arrow}</a></div>
  </section>
  <section class="section" id="education" aria-labelledby="education-heading">
    ${heading('education', 'Education')}
    ${education.map((item, index) => `<article class="entry education-entry">${logo(item.logo, 'UESTC')}<div>${linkedHeading('h3', `education-${index + 1}-heading`, `${escape(item.institution)}${item.designation ? ` <span class="institution-badge">${escape(item.designation)}</span>` : ''}`)}<p>${escape(item.degree)}</p><p class="meta">${escape(item.period)} <span class="separator">·</span> ${escape(item.detail)}</p></div></article>`).join('')}
  </section>
  <section class="section" id="research" aria-labelledby="research-heading">
    ${heading('research', 'Research Interests')}
    <ul class="interest-list">${researchAreas.map(area => `<li><strong>${escape(area.title)}:</strong> ${escape(area.description)}</li>`).join('')}</ul>
  </section>
  <section class="section" id="experience" aria-labelledby="experience-heading">
    ${heading('experience', 'Research &amp; Internship Experience')}
    <div class="entry-list">${experience.map(item => `<article class="entry experience-entry" id="${item.id}">
      ${logo(item.logo, item.shortName)}<div class="entry-content">
        <div class="entry-heading">${linkedHeading('h3', `${item.id}-heading`, escape(item.organization))}<span class="date">${escape(item.period)}</span></div>
        <p class="role">${escape(item.role)} <span class="separator">·</span> <span class="meta">${escape(item.location)}</span></p>
        <p class="advisors">${item.id === 'megvii' ? 'Mentor' : item.advisors.length > 1 ? 'Advisors' : 'Advisor'}: ${item.advisors.map(person => person.url ? external(person.url, escape(person.name)) : escape(person.name)).join(', ')}</p>
        <p class="experience-description">${escape(item.description)}</p>
      </div></article>`).join('')}</div>
  </section>
  <section class="section" id="awards" aria-labelledby="awards-heading">
    ${heading('awards', 'Honors &amp; Awards')}
    <ul class="awards-list">${awards.map(item => `<li><span class="date">${item.year}</span><div><strong>${escape(item.title)}</strong><p class="meta">${escape(item.detail)}</p></div></li>`).join('')}</ul>
  </section>
  ${visitorMarkup()}`;
}

function publicationPage() {
  const authors = (paper) => paper.authors.split(', ').map(name => {
    const label = escape(name).replace('Xinrui Wu', '<strong>Xinrui Wu</strong>').replaceAll('*', '<sup>*</sup>').replaceAll('Ma+', 'Ma<sup>+</sup>');
    const url = paper.authorLinks?.[name];
    return url ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
  }).join(', ');
  return `<div class="page-heading">${linkedHeading('h1', 'publication-heading', 'Publication')}${external(profile.scholarUrl, 'Google Scholar', 'heading-link')}</div>
    <p class="publication-note">* Equal contribution.</p>
    ${publicationGroups.map(group => `<section class="section publication-section" id="${group.id}" aria-labelledby="${group.id}-heading">
      ${heading(group.id, `${group.label} <sup class="count">${group.papers.length}</sup>`)}
      <div class="publication-list">${group.papers.map(paper => `<article class="paper entry" id="${paper.id}">
        ${linkedHeading('h3', `${paper.id}-heading`, escape(paper.title))}
        <p class="authors">${authors(paper)}</p>
        <div class="paper-meta"><span class="venue">${paper.status === 'submitted' ? 'Submitted to ' : ''}${escape(paper.venue)}${/\b20\d{2}\b/.test(paper.venue) ? '' : ` · ${paper.year}`}</span><span class="meta">${escape(paper.roleLabel)}</span></div>
        ${paper.links.length ? `<div class="paper-links">${paper.links.map(link => external(link.url, escape(link.label))).join('')}</div>` : ''}
      </article>`).join('')}</div>
    </section>`).join('')}`;
}

function projectPage() {
  return `<div class="page-heading">${linkedHeading('h1', 'project-heading', 'Project')}</div>
    <div class="projects">${projects.map(project => `<article class="project-panel" id="${project.id}" aria-labelledby="${project.id}-heading">
      <div class="project-copy">${linkedHeading('h2', `${project.id}-heading`, escape(project.name))}<p>${escape(project.description)}</p>
        <div class="project-links">${external(project.previewUrl, 'Open preview')}${external(project.repositoryUrl, 'GitHub repository')}</div>
      </div>
      <div class="project-preview"><div class="preview-bar"><span>${project.previewLabel}</span>${external(project.previewUrl, 'Open in new tab')}</div>
        <div class="preview-viewport"><iframe src="${project.previewUrl}" title="${project.name} — interactive project preview" loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
      </div>
    </article>`).join('')}</div>`;
}

function cvPage() {
  return `<div class="page-heading cv-heading">${linkedHeading('h1', 'cv-heading', 'Curriculum Vitae')}
    <div class="cv-actions">${external(profile.cvPdfUrl, 'Open PDF')}<a href="${profile.cvPdfUrl}" download="Xinrui-Wu-CV.pdf">Download PDF <span aria-hidden="true">↓</span></a></div>
  </div>
  <object class="cv-document" data="${profile.cvPdfUrl}#view=FitH&amp;navpanes=0" type="application/pdf" aria-label="Xinrui Wu's curriculum vitae" title="Xinrui Wu's curriculum vitae">
    <p>Your browser cannot display this PDF inline. ${external(profile.cvPdfUrl, 'Open the CV PDF')} or <a href="${profile.cvPdfUrl}" download>download a copy</a>.</p>
  </object>`;
}

function layout(page, content) {
  const description = {
    home: 'Xinrui Wu (吴欣锐), undergraduate at UESTC, visiting student at MBZUAI, and research intern at Tsinghua AIR. Research interests, education, academic experience, and awards.',
    publication: 'Research publications by Xinrui Wu, grouped by core and contributing authorship, in clinical AI, world models, efficient reasoning, and computer vision.',
    project: 'Research OS and FinGraph: personal projects by Xinrui Wu, with interactive previews and source repositories.',
    cv: 'Curriculum vitae of Xinrui Wu. View or download the PDF, including education, research experience, publications, and awards.',
  }[page.id];
  return `<!doctype html>
<!-- Generated by build.mjs. Edit user-data/ or the build templates, then run node build.mjs. -->
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="theme-color" content="#fffaff" />
  <title>${page.id === 'home' ? 'Xinrui Wu · Academic Homepage' : `${page.label} · Xinrui Wu`}</title>
  <meta name="description" content="${description}" />
  <meta name="author" content="Xinrui Wu" />
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
    document.documentElement.classList.add('js');
    try {
      const saved = localStorage.getItem('xinrui-academic-theme');
      const theme = saved === 'dark' ? 'dark' : 'light';
      document.documentElement.dataset.theme = theme;
      document.querySelector('meta[name="theme-color"]').content = theme === 'light' ? '#fffaff' : '#191919';
    } catch (_) {}
  </script>
  <link rel="stylesheet" href="${stylesheetUrl}" />
  <script src="${scriptUrl}" defer></script>
  ${page.id === 'home' ? `<link rel="stylesheet" href="${visitorStyleUrl}" />` : ''}
  <script id="visitor-config" type="application/json">${JSON.stringify(visitorConfig).replaceAll('<', '\\u003c')}</script>
  <script src="${visitorScriptUrl}" type="module"></script>
  ${page.id === 'home' ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Person', name: profile.name, alternateName: profile.chineseName, url: 'https://gintmr.github.io/', sameAs: [profile.scholarUrl, profile.alphaXivUrl, profile.githubUrl], knowsAbout: researchAreas.map(a => a.title) })}</script>` : ''}
</head>
<body data-page="${page.id}" data-site-watermark="Xinrui Wu">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="site-header"><div class="nav-container"><div class="header-shell">
    <a class="brand" href="/" aria-label="Xinrui Wu — Home"><img src="${escape(logoUrl)}" width="40" height="40" alt="" /><span>Xinrui Wu</span></a>
    <nav class="site-nav" id="site-nav" aria-label="Main navigation">${pages.map(item => `<a href="${item.path}"${page.id === item.id ? ' aria-current="page"' : ''}>${item.label}</a>`).join('')}</nav>
    <div class="header-controls"><button class="theme-toggle" id="theme-toggle" type="button" aria-label="Switch to dark theme" title="Switch to dark theme">${icon('sun')}${icon('moon')}</button><button class="menu-toggle" id="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="site-nav">${icon('menu')}${icon('close')}</button></div>
  </div></div></header>
  ${pageOutline(page)}
  <main class="page-shell" id="main-content">${content}</main>
  <footer class="site-footer page-shell"><span>© 2026 Xinrui Wu</span><a href="mailto:${profile.email}">${profile.email}</a></footer>
</body>
</html>
`;
}

for (const page of pages) {
  const directory = page.id === 'home' ? root : `${root}${page.id}/`;
  await mkdir(directory, { recursive: true });
  const html = layout(page, { home, publication: publicationPage, project: projectPage, cv: cvPage }[page.id]());
  await writeFile(`${directory}index.html`, html.replace(/[\t ]+$/gm, ''));
}
console.log('Generated Home, Publication, Project, and CV pages.');
