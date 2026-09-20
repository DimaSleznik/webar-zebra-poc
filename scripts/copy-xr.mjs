// Копирует движок 8th Wall в public/xr, чтобы он раздавался со своего origin (без CDN).
// xr-face.js (7 МБ) и face-модели не нужны — только SLAM.
// copyFileSync вместо cpSync: cpSync в Node 24 падает на Windows при перезаписи в пути с кириллицей.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'

const src = 'node_modules/@8thwall/engine-binary'
const dst = 'public/xr'

mkdirSync(`${dst}/resources`, { recursive: true })
copyFileSync(`${src}/dist/xr.js`, `${dst}/xr.js`)
copyFileSync(`${src}/dist/xr-slam.js`, `${dst}/xr-slam.js`)
copyFileSync(`${src}/LICENSE`, `${dst}/LICENSE`)
for (const f of readdirSync(`${src}/dist/resources`)) {
  if (f.startsWith('face-')) continue
  copyFileSync(`${src}/dist/resources/${f}`, `${dst}/resources/${f}`)
}
console.log('8th Wall engine -> public/xr')
