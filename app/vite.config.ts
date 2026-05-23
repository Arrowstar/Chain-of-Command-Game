import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { join } from 'path'
import { tmpdir } from 'os'

let gitHash = 'unknown';
try {
  gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
} catch { /* git not available during CI or export */ }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  cacheDir: join(tmpdir(), 'vite-coc-cache'),
  build: {
    emptyOutDir: false,
  },
  define: {
    __APP_VERSION__: JSON.stringify('0.7'),
    __GIT_HASH__: JSON.stringify(gitHash),
  },
})
