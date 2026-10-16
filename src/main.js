import { marked } from "marked";
import "./style.css";

// Vite discovers every Markdown file in the lessons folder.
// When you add a new .md file, it will appear in the lesson list automatically.
const lessonFiles = import.meta.glob("../lessons/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});

const lessons = Object.entries(lessonFiles)
  .map(([path, markdown]) => {
    const fileName = path.split("/").pop().replace(/\.md$/i, "");
    const firstHeading = markdown.match(/^#\s+(.+)$/m);
    return {
      id: fileName,
      title: firstHeading ? firstHeading[1].trim() : fileName,
      markdown,
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));

const app = document.querySelector("#app");

function renderLesson(lesson) {
  return `
    <article class="lesson-content">
      <div class="lesson-label">درس آموزشی</div>
      <h1>${escapeHtml(lesson.title)}</h1>
      ${marked.parse(lesson.markdown)}
    </article>
  `;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);
}

function render() {
  const selectedId = new URLSearchParams(location.search).get("lesson");
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedId) || lessons[0];

  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="./">
        <span class="brand-mark">ف</span>
        <span>
          <strong>دنیای فارسی</strong>
          <small>Persian World</small>
        </span>
      </a>
      <span class="top-note">یادگیری فارسی، ساده و شیرین</span>
    </header>

    <main class="layout">
      <aside class="sidebar">
        <p class="eyebrow">کتابخانهٔ درس‌ها</p>
        <h2>درس‌ها</h2>
        <p class="sidebar-hint">فایل‌های Markdown به‌صورت خودکار اینجا فهرست می‌شوند.</p>
        <nav aria-label="فهرست درس‌ها">
          ${lessons.map((lesson, index) => `
            <a class="lesson-link ${selectedLesson?.id === lesson.id ? "active" : ""}"
               href="?lesson=${encodeURIComponent(lesson.id)}">
              <span class="lesson-number">${String(index + 1).padStart(2, "0")}</span>
              <span>${escapeHtml(lesson.title)}</span>
            </a>
          `).join("")}
        </nav>
        <div class="sidebar-tip">
          <span class="tip-icon">✦</span>
          <p><strong>نکته</strong><br />برای افزودن درس جدید، فقط یک فایل با پسوند <code>.md</code> در پوشهٔ <code>lessons</code> بساز.</p>
        </div>
      </aside>

      <section class="main-panel">
        ${selectedLesson ? renderLesson(selectedLesson) : `
          <div class="empty-state">
            <h1>به دنیای فارسی خوش آمدی!</h1>
            <p>هنوز درسی اضافه نشده است. یک فایل Markdown در پوشهٔ lessons بساز.</p>
          </div>
        `}
        <footer class="page-footer">ساخته‌شده با 💚 برای دنیای فارسی</footer>
      </section>
    </main>
  `;
}

render();
