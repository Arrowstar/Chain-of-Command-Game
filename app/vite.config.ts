import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { join } from 'path'
import { tmpdir } from 'os'
import { readFileSync } from 'fs'

let gitHash = 'unknown';
try {
  gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
} catch { /* git not available during CI or export */ }

// Extract version from the Android build.gradle
let appVersion = '0.7';
try {
  const buildGradlePath = join(__dirname, '../android/app/build.gradle');
  const buildGradle = readFileSync(buildGradlePath, 'utf-8');
  const match = buildGradle.match(/versionName\s+['"]([^'"]+)['"]/);
  if (match) {
    appVersion = match[1];
  }
} catch (e) {
  console.warn('Could not read version from build.gradle, falling back to 0.7');
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  cacheDir: join(tmpdir(), 'vite-coc-cache'),
  build: {
    emptyOutDir: false,
  },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __GIT_HASH__: JSON.stringify(gitHash),
  },
})
