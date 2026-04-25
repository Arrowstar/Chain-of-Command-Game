import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { join } from 'path'
import { tmpdir } from 'os'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  cacheDir: join(tmpdir(), 'vite-coc-cache'),
})
