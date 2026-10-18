import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { getLessons, lessonUrl, resolveLessonLink } from './lesson-content.js';
import './styles/lessons.css';

const sources = import.meta.glob('../lessons/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const base = import.meta.env.BASE_URL;
const content = document.getElementById('lesson-content');
const list = document.getElementById('lesson-list');
const menuButton = document.getElementById('menu-button');
const siteLinks = document.getElementById('site-links');

menuButton.addEventListener('click', () => {
  const isOpen = siteLinks.classList.toggle('show');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});

function showMessage(title, message) {
  const heading = document.createElement('h1');
  heading.textContent = title;
  const paragraph = document.createElement('p');
  paragraph.textContent = message;
  content.replaceChildren(heading, paragraph);
  document.title = `${title} | دنیای فارسی`;
}

function renderLessons() {
  const lessons = getLessons(sources);
  const requested = new URLSearchParams(window.location.search).get('lesson');
  const selected = requested === null
    ? lessons[0]
    : lessons.find((lesson) => lesson.slug === requested);

  for (const lesson of lessons) {
    const link = document.createElement('a');
    link.href = lessonUrl(lesson.slug, base);
    const title = document.createElement('span');
    title.textContent = lesson.title;
    link.append(title);

    if (lesson.description) {
      const description = document.createElement('small');
      description.textContent = lesson.description;
      link.append(description);
    }

    if (lesson === selected) link.setAttribute('aria-current', 'page');
    list.append(link);
  }

  if (!lessons.length) {
    showMessage('هنوز درسی منتشر نشده است', 'درس‌های تازه به‌زودی در این بخش قرار می‌گیرند.');
    return;
  }

  if (!selected) {
    showMessage('درس پیدا نشد', 'برای ادامه، یکی از درس‌های فهرست را انتخاب کنید.');
    return;
  }

  // Markdown may contain HTML. Sanitize before inserting it into the page.
  content.innerHTML = DOMPurify.sanitize(marked.parse(selected.body), {
    USE_PROFILES: { html: true },
  });

  if (!content.querySelector('h1')) {
    const heading = document.createElement('h1');
    heading.textContent = selected.title;
    content.prepend(heading);
  }

  const usedIds = new Set();
  content.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
    const stem = heading.id || heading.textContent.trim().replace(/\s+/g, '-');
    let id = stem;
    let suffix = 2;
    while (usedIds.has(id)) id = `${stem}-${suffix++}`;
    heading.id = id;
    usedIds.add(id);
  });

  content.querySelectorAll('a[href]').forEach((link) => {
    link.setAttribute('href', resolveLessonLink(link.getAttribute('href'), selected.slug, base));
  });

  content.querySelectorAll('img[src]').forEach((image) => {
    // The CMS stores media in public/uploads, which Vite copies into dist/uploads.
    const src = image.getAttribute('src');
    if (src.startsWith('/uploads/')) image.setAttribute('src', `${base}${src.slice(1)}`);
    image.loading = 'lazy';
  });

  document.title = `${selected.title} | دنیای فارسی`;
  if (selected.description) {
    document.querySelector('meta[name="description"]').content = selected.description;
  }

  if (window.location.hash) {
    let anchor = window.location.hash.slice(1);
    try {
      anchor = decodeURIComponent(anchor);
    } catch {
      // An invalid URL fragment should not prevent the lesson from displaying.
    }
    document.getElementById(anchor)?.scrollIntoView();
  }
}

try {
  renderLessons();
} catch (error) {
  console.error(error);
  showMessage('نمایش درس انجام نشد', 'لطفاً دوباره تلاش کنید.');
}
