import { parse } from 'yaml';

export function getLessons(sources) {
  return Object.entries(sources)
    .map(([path, source]) => {
      const slug = path.replace(/^.*?lessons\//, '').replace(/\.md$/, '');
      const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
      const frontMatter = normalized.startsWith('---\n')
        ? normalized.match(/^---\n([\s\S]*?)^(?:---|\.\.\.)[ \t]*(?:\n|$)/m)
        : null;
      let attributes = {};

      try {
        if (normalized.startsWith('---\n') && !frontMatter) {
          throw new Error('Missing closing front matter delimiter');
        }
        if (frontMatter) {
          attributes = parse(frontMatter[1]) || {};
          if (typeof attributes !== 'object' || Array.isArray(attributes)) {
            throw new Error('Front matter must be a YAML mapping');
          }
        }
      } catch (error) {
        throw new Error(`Invalid lesson front matter in ${path}`, { cause: error });
      }

      const body = frontMatter ? normalized.slice(frontMatter[0].length) : normalized;
      const heading = body.match(/^#\s+(.+?)\s*#*\s*$/m)?.[1];
      const rawOrder = attributes.order;
      const numericOrder = typeof rawOrder === 'number' || (typeof rawOrder === 'string' && rawOrder.trim())
        ? Number(rawOrder)
        : Infinity;

      return {
        slug,
        title: typeof attributes.title === 'string' ? attributes.title : heading || slug,
        description: typeof attributes.description === 'string' ? attributes.description : '',
        order: Number.isFinite(numericOrder) ? numericOrder : Infinity,
        body,
      };
    })
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'fa'));
}

export function lessonUrl(slug, base = '/') {
  return `${base}lessons.html?lesson=${encodeURIComponent(slug)}`;
}

// Keep ordinary Markdown links between lessons useful on a static host.
export function resolveLessonLink(href, slug, base = '/') {
  if (href.startsWith('#')) return href;
  const site = new URL(base, 'https://persianworld.invalid');
  const encodedSlug = slug.split('/').map(encodeURIComponent).join('/');
  const current = new URL(`lessons/${encodedSlug}.md`, site);
  let target;
  try {
    target = new URL(href, current);
  } catch {
    return href;
  }
  const lessonPath = `${site.pathname}lessons/`;

  if (target.origin !== site.origin || !target.pathname.startsWith(lessonPath) || !target.pathname.endsWith('.md')) {
    return href;
  }

  try {
    const targetSlug = decodeURIComponent(target.pathname.slice(lessonPath.length, -3));
    return lessonUrl(targetSlug, base) + target.hash;
  } catch {
    return href;
  }
}
