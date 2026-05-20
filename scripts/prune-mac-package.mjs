import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const appDir = path.join(root, 'release', 'LingCang-darwin-x64', 'LingCang.app')
const electronResourcesDir = path.join(
  appDir,
  'Contents',
  'Frameworks',
  'Electron Framework.framework',
  'Versions',
  'A',
  'Resources'
)
const appResourcesDir = path.join(appDir, 'Contents', 'Resources')
const plistPath = path.join(appDir, 'Contents', 'Info.plist')
const keptLocales = new Set(['en.lproj', 'zh_CN.lproj', 'zh_TW.lproj'])

if (fs.existsSync(electronResourcesDir)) {
  for (const entry of fs.readdirSync(electronResourcesDir)) {
    if (entry.endsWith('.lproj') && !keptLocales.has(entry)) {
      fs.rmSync(path.join(electronResourcesDir, entry), { recursive: true, force: true })
    }
  }
}

for (const file of ['LICENSE', 'LICENSES.chromium.html']) {
  fs.rmSync(path.join(root, 'release', 'LingCang-darwin-x64', file), { force: true })
}

fs.copyFileSync(path.join(root, 'assets', 'app-icon.icns'), path.join(appResourcesDir, 'app-icon.icns'))
execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Set :CFBundleIconFile app-icon.icns', plistPath])
execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Set :CFBundleDisplayName 灵舱', plistPath])
execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Set :CFBundleName LingCang', plistPath])
