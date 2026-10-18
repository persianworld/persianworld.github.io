import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { convertDocument, findDocuments } from '../scripts/convert-docx.mjs';
import { getLessons } from '../src/lesson-content.js';

const fixture = new URL('./fixtures/lesson.docx', import.meta.url);
const script = fileURLToPath(new URL('../scripts/convert-docx.mjs', import.meta.url));

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'persianworld-docx-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test('converts an actual DOCX beside the original, preserving Persian text and structure', async (t) => {
  const directory = await temporaryDirectory(t);
  const input = path.join(directory, 'درس تازه.DOCX');
  await copyFile(fixture, input);

  const result = await convertDocument(input);
  assert.equal(result.skipped, false);
  assert.equal(result.output, path.join(directory, 'درس تازه.md'));
  const markdown = await readFile(result.output, 'utf8');
  assert.match(markdown, /^# درس آزمایشی/m);
  assert.match(markdown, /^## نمونه‌ها/m);
  assert.match(markdown, /\*\*پررنگ\*\*/);
  assert.match(markdown, /_مورب_|\*مورب\*/);
  assert.match(markdown, /\[پیوند نمونه\]\(https:\/\/example.com\/\)/);
  assert.match(markdown, /^-\s+فهرست ساده/m);
  assert.match(markdown, /^1\.\s+فهرست شماره‌دار/m);
  assert.match(markdown, /<table>|\| واژه \|/);
  assert.match(markdown, /سلام/);
  assert.match(markdown, /!\[تصویر نمونه\]\(data:image\/png;base64,/);
  assert.deepEqual(await readFile(input), await readFile(fixture));
  assert.equal(getLessons({ '../lessons/converted.md': markdown })[0].title, 'درس آزمایشی');
});

test('preserves existing Markdown unless overwrite is explicitly requested', async (t) => {
  const directory = await temporaryDirectory(t);
  const input = path.join(directory, 'lesson.docx');
  const output = path.join(directory, 'lesson.md');
  await copyFile(fixture, input);
  await writeFile(output, '# Edited by hand\n');

  assert.equal((await convertDocument(input)).skipped, true);
  assert.equal(await readFile(output, 'utf8'), '# Edited by hand\n');
  assert.equal((await convertDocument(input, { overwrite: true })).skipped, false);
  assert.match(await readFile(output, 'utf8'), /درس آزمایشی/);
});

test('scans subfolders, supports .DOCX, and ignores Word lock files and other formats', async (t) => {
  const directory = await temporaryDirectory(t);
  await mkdir(path.join(directory, 'nested'));
  for (const file of ['a.docx', '~$locked.docx', 'old.doc', 'notes.md', 'nested/b.DOCX']) {
    await copyFile(fixture, path.join(directory, file));
  }

  assert.deepEqual(await findDocuments(directory), [path.join(directory, 'a.docx'), path.join(directory, 'nested/b.DOCX')]);
  assert.deepEqual(await findDocuments(path.join(directory, '~$locked.docx')), []);
  await assert.rejects(convertDocument(path.join(directory, 'old.doc')), /Expected a \.docx/);
});

test('CLI defaults to lessons and accepts a custom folder with spaces', async (t) => {
  const directory = await temporaryDirectory(t);
  for (const folder of ['lessons', 'lessions with spaces']) {
    await mkdir(path.join(directory, folder));
    await copyFile(fixture, path.join(directory, folder, 'word.docx'));
    const args = folder === 'lessons' ? [] : [folder];
    const result = spawnSync(process.execPath, [script, ...args], { cwd: directory, encoding: 'utf8' });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /1 converted, 0 skipped, 0 failed/);
    assert.match(await readFile(path.join(directory, folder, 'word.md'), 'utf8'), /درس آزمایشی/);
  }
});

test('a corrupt DOCX reports failure while other files still convert', async (t) => {
  const directory = await temporaryDirectory(t);
  await writeFile(path.join(directory, 'broken.docx'), 'not a Word document');
  await copyFile(fixture, path.join(directory, 'valid.docx'));

  const result = spawnSync(process.execPath, [script, directory], { encoding: 'utf8' });
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Failed: .*broken\.docx/);
  assert.match(result.stdout, /1 converted, 0 skipped, 1 failed/);
  assert.match(await readFile(path.join(directory, 'valid.md'), 'utf8'), /درس آزمایشی/);
  await assert.rejects(readFile(path.join(directory, 'broken.md')), { code: 'ENOENT' });
});
