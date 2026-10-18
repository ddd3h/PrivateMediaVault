#!/usr/bin/env node
/**
 * Copies ffmpeg/ffprobe into resources/bin/ for bundling in the .app
 * Searches Homebrew paths automatically.
 */
const { execSync } = require('child_process')
const { existsSync, copyFileSync, chmodSync } = require('fs')
const { join } = require('path')

const SEARCH_PATHS = [
  '/opt/homebrew/bin',   // Apple Silicon Homebrew
  '/usr/local/bin',      // Intel Homebrew
  '/usr/bin',
]

const OUT_DIR = join(__dirname, '..', 'resources', 'bin')

function findBinary(name) {
  for (const dir of SEARCH_PATHS) {
    const p = join(dir, name)
    if (existsSync(p)) return p
  }
  // Try which
  try {
    return execSync(`which ${name}`, { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

for (const bin of ['ffmpeg', 'ffprobe']) {
  const src = findBinary(bin)
  if (!src) {
    console.error(`❌  ${bin} not found. Install with: brew install ffmpeg`)
    process.exit(1)
  }
  const dest = join(OUT_DIR, bin)
  copyFileSync(src, dest)
  chmodSync(dest, 0o755)
  console.log(`✓  ${bin}: ${src} → resources/bin/${bin}`)
}
console.log('Done.')
