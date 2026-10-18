# Persian World

A Vite website for [persianworld.github.io](https://persianworld.github.io/), with Persian lessons written in Markdown.

## Local development

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The home page is at `/` and lessons are at `/lessons.html`. Changes to Markdown files reload automatically during development.

```sh
npm test          # Check lesson metadata and links
npm run build    # Produce the static website in dist/
npm run preview  # Preview the production build
```

## Write a lesson

Add a `.md` file to `lessons/`, for example `lessons/persian-grammar.md`:

```md
---
title: دستور زبان فارسی
description: آشنایی با جمله و اجزای آن.
order: 2
---

# دستور زبان فارسی

متن درس را اینجا بنویسید. از **متن پررنگ**، فهرست، جدول و تصویر استفاده کنید.

## تمرین

1. یک جمله بنویسید.
2. فعل آن را مشخص کنید.

[درس آغازین](index.md)
```

Every `.md` file in `lessons/`, including subfolders, automatically appears in the lesson list. No manual registration or HTML editing is needed. YAML front matter is optional: the first `#` heading supplies the title if `title` is absent. `description` is optional; lower `order` numbers appear first, followed by unordered lessons sorted by title. The first lesson opens by default.

The example is available at `/lessons.html?lesson=persian-grammar`. A nested file such as `lessons/grammar/nouns.md` uses `/lessons.html?lesson=grammar%2Fnouns`. These query URLs can be opened and refreshed on GitHub Pages without server routing. Existing links to `/lessonse.html` redirect to the lesson page.

Vite bundles the Markdown files locally. Marked converts the selected lesson to HTML in the browser, and DOMPurify sanitizes it before display. JavaScript must be enabled. There is no runtime Markdown fetch or Markdown-renderer CDN dependency. Publishing an edit requires a new build; the GitHub workflow does this automatically.

Use relative Markdown links between lessons, for example `[اسم](grammar/nouns.md)`. Heading anchors use the heading text with spaces replaced by hyphens, for example `[تمرین](index.md#تمرین)`.

Put images and downloads in `public/uploads/` and reference them with `/uploads/filename.jpg`. Vite copies `public/` directly into the published site. The existing Sveltia CMS remains available at `/admin/`; its configuration is in `public/admin/config.yml` and it edits the same `lessons/` files. Its existing GitHub authentication service is still required to sign in.

## Convert Word documents to Markdown

Put `.docx` files in `lessons/`, then run:

```sh
npm run convert:docx
```

For example, `lessons/my-lesson.docx` produces `lessons/my-lesson.md`. Subfolders are scanned recursively, and the original Word files are kept. Existing Markdown files are skipped so that manual edits are preserved.

You can also choose another folder (including `./lessions`), convert one file, or explicitly replace existing Markdown:

```sh
npm run convert:docx -- ./lessions
npm run convert:docx -- "./lessons/My lesson.docx"
npm run convert:docx -- --overwrite
npm run convert:docx -- --help
```

The converter runs locally in Node.js using [Mammoth](https://github.com/mwilliamson/mammoth.js) and [Turndown](https://github.com/mixmark-io/turndown). It converts headings, paragraphs, bold/italic text, lists, and links. Images are embedded as data URLs in the Markdown, so there are no separate image files to move. Tables are retained as HTML when they cannot be expressed as a Markdown table.

In Word, use **Title**, **Heading 1**, **Heading 2**, and other heading styles for section titles. Conversion preserves content and structure rather than fonts, page layout, or text colors. Older `.doc` files must first be saved as `.docx` in Word. Temporary Word lock files beginning with `~$` are ignored. Conversion errors are reported per file, and the script continues with other documents.

Review the generated Markdown and optionally add the lesson metadata described above. Files under `lessons/` automatically join the website's lesson list after conversion; files under other folders must be moved into `lessons/` to appear there. Conversion is a manual authoring step; the GitHub Pages build uses the resulting `.md` files.

The npm override for Mammoth's `argparse` dependency replaces its legacy CLI parser dependency. This project's converter uses Node's built-in argument parser.

## GitHub Pages

In the repository's **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source. The workflow in `.github/workflows/deploy.yml` installs locked dependencies, tests, builds, and deploys `dist/` on pushes to `main`. It can also be run manually from the Actions tab.

The Vite base is `/`, matching this account site at `https://persianworld.github.io/`. If the site moves to a project repository, set `VITE_BASE_PATH=/repository-name/` in the build environment. See [Vite's GitHub Pages deployment guide](https://vite.dev/guide/static-deploy#github-pages).
