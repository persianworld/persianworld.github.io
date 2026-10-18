import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  // This repository is served at https://persianworld.github.io/.
  base: process.env.VITE_BASE_PATH || '/',
  build: {
    rollupOptions: {
      input: {
        home: fileURLToPath(new URL('./index.html', import.meta.url)),
        lessons: fileURLToPath(new URL('./lessons.html', import.meta.url)),
        legacyLessons: fileURLToPath(new URL('./lessonse.html', import.meta.url)),
      },
    },
  },
});
