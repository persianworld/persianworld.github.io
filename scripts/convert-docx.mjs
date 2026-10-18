import { access, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const help = `Convert Word .docx files to Markdown beside the originals.

Usage:
  npm run convert:docx
  npm run convert:docx -- ./lessions
  npm run convert:docx -- "./lessons/My lesson.docx"
  npm run convert:docx -- --overwrite

The default folder is ./lessons. Subfolders are scanned recursively.
Existing Markdown files are skipped unless --overwrite is supplied.
Word temporary files (~$*.docx) are ignored. Older .doc files are not supported.
`;

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function findDocuments(input) {
  const info = await stat(input);
  if (info.isFile()) {
    if (!/\.docx$/i.test(input)) throw new Error(`Expected a .docx file: ${input}`);
    return path.basename(input).startsWith('~$') ? [] : [input];
  }
  if (!info.isDirectory()) throw new Error(`Expected a file or directory: ${input}`);

  const documents = [];
  const entries = await readdir(input, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const entryPath = path.join(input, entry.name);
    if (entry.isDirectory()) {
      documents.push(...await findDocuments(entryPath));
    } else if (entry.isFile() && /\.docx$/i.test(entry.name) && !entry.name.startsWith('~$')) {
      documents.push(entryPath);
    }
  }
  return documents;
}

export async function convertDocument(input, { overwrite = false } = {}) {
  if (!/\.docx$/i.test(input)) throw new Error(`Expected a .docx file: ${input}`);
  const output = input.replace(/\.docx$/i, '.md');

  if (!overwrite && await exists(output)) {
    return { input, output, skipped: true, messages: [] };
  }

  const result = await mammoth.convertToHtml({ path: input }, {
    styleMap: ["p[style-name='Title'] => h1:fresh"],
    externalFileAccess: false,
    // Keep the Markdown self-contained, including any embedded pictures.
    convertImage: mammoth.images.dataUri,
  });

  const converter = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });
  converter.use(gfm);
  const markdown = converter.turndown(result.value).trim() + '\n';

  try {
    // Exclusive creation also protects a Markdown file created during conversion.
    await writeFile(output, markdown, { encoding: 'utf8', flag: overwrite ? 'w' : 'wx' });
  } catch (error) {
    if (error.code === 'EEXIST' && !overwrite) {
      return { input, output, skipped: true, messages: [] };
    }
    throw error;
  }

  return { input, output, skipped: false, messages: result.messages };
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      overwrite: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  if (values.help) {
    console.log(help);
    return;
  }
  if (positionals.length > 1) throw new Error('Provide one folder or .docx file. Use --help for examples.');

  const input = path.resolve(positionals[0] || 'lessons');
  const documents = await findDocuments(input);
  if (!documents.length) {
    console.log(`No .docx files found in ${input}`);
    return;
  }

  let converted = 0;
  let skipped = 0;
  let failed = 0;
  for (const document of documents) {
    try {
      const result = await convertDocument(document, { overwrite: values.overwrite });
      if (result.skipped) {
        skipped++;
        console.log(`Skipped existing Markdown: ${result.output}`);
      } else {
        converted++;
        console.log(`Converted: ${document} -> ${result.output}`);
      }
      for (const message of result.messages) {
        console.warn(`${document}: ${message.type}: ${message.message}`);
      }
    } catch (error) {
      failed++;
      console.error(`Failed: ${document}: ${error.message}`);
    }
  }

  console.log(`${converted} converted, ${skipped} skipped, ${failed} failed.`);
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
