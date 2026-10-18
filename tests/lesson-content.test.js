import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { getLessons, lessonUrl, resolveLessonLink } from '../src/lesson-content.js';

test('lessons use YAML metadata, nested slugs, and numeric ordering', () => {
  const lessons = getLessons({
    '../lessons/grammar/nouns.md': '---\ntitle: اسم\ndescription: دربارهٔ اسم\norder: 2\n---\n# متن درس',
    '../lessons/index.md': '---\ntitle: آغاز\norder: 1\n---\nمتن',
    '../lessons/plain.md': '# بدون فراداده\n\nمتن',
  });

  assert.deepEqual(lessons.map(({ slug }) => slug), ['index', 'grammar/nouns', 'plain']);
  assert.equal(lessons[1].title, 'اسم');
  assert.equal(lessons[1].description, 'دربارهٔ اسم');
  assert.equal(lessons[1].body, '# متن درس');
  assert.equal(lessons[2].title, 'بدون فراداده');
});

test('Windows line endings and UTF-8 BOM do not leak metadata into the lesson', () => {
  const [lesson] = getLessons({ '../lessons/test.md': '\uFEFF---\r\ntitle: عنوان\r\n---\r\n# عنوان' });
  assert.equal(lesson.title, 'عنوان');
  assert.equal(lesson.body, '# عنوان');
});

test('empty front matter and omitted order remain valid', () => {
  const lessons = getLessons({
    '../lessons/empty.md': '---\n---\n# بدون فراداده',
    '../lessons/null.md': '---\norder:\n---\n# بدون ترتیب',
  });
  assert.equal(lessons.length, 2);
  assert.ok(lessons.every((lesson) => lesson.order === Infinity));
  assert.ok(lessons.every((lesson) => lesson.body.startsWith('#')));
});

test('malformed metadata reports the affected Markdown file', () => {
  assert.throws(() => getLessons({ '../lessons/broken.md': '---\ntitle: [broken\n---\nbody' }), /broken\.md/);
  assert.throws(() => getLessons({ '../lessons/unclosed.md': '---\ntitle: broken' }), /unclosed\.md/);
});

test('lesson URLs support Unicode, nested files, and a GitHub Pages subpath', () => {
  assert.equal(lessonUrl('grammar/اسم', '/repo/'), '/repo/lessons.html?lesson=grammar%2F%D8%A7%D8%B3%D9%85');
  assert.equal(resolveLessonLink('../index.md#تمرین', 'grammar/nouns', '/repo/'), '/repo/lessons.html?lesson=index#%D8%AA%D9%85%D8%B1%DB%8C%D9%86');
  assert.equal(resolveLessonLink('verbs.md', 'grammar/nouns'), '/lessons.html?lesson=grammar%2Fverbs');
  assert.equal(resolveLessonLink('https://example.com/lesson.md', 'index'), 'https://example.com/lesson.md');
  assert.equal(resolveLessonLink('#تمرین', 'index'), '#تمرین');
  assert.equal(resolveLessonLink('http://[', 'index'), 'http://[');
  assert.equal(resolveLessonLink('bad%zz.md', 'index'), 'bad%zz.md');
});

test('every repository lesson has valid front matter and content', () => {
  const directory = new URL('../lessons/', import.meta.url);
  const sources = Object.fromEntries(
    readdirSync(directory, { recursive: true })
      .filter((path) => path.endsWith('.md'))
      .map((path) => [`../lessons/${path}`, readFileSync(new URL(path, directory), 'utf8')]),
  );
  const lessons = getLessons(sources);
  assert.ok(lessons.length > 0);
  for (const lesson of lessons) {
    assert.ok(lesson.title.trim(), `${lesson.slug} needs a title`);
    assert.ok(lesson.body.trim(), `${lesson.slug} needs content`);
  }
});
