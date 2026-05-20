import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const platform = process.argv[2]
const version = process.env.npm_package_version || JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version

const targets = {
  mac: {
    electronPlatform: 'darwin',
    arch: 'x64',
    outDir: 'LingCang-darwin-x64',
    appName: 'LingCang.app',
    artifact: 'LingCang-macOS-x64.zip',
    icon: ''
  },
  win: {
    electronPlatform: 'win32',
    arch: 'x64',
    outDir: 'LingCang-win32-x64',
    appName: 'LingCang.exe',
    artifact: 'LingCang-Windows-x64.zip',
    icon: path.join(root, 'assets', 'app-icon.ico')
  },
  linux: {
    electronPlatform: 'linux',
    arch: 'x64',
    outDir: 'LingCang-linux-x64',
    appName: 'LingCang',
    artifact: 'LingCang-Linux-x64.tar.gz',
    icon: path.join(root, 'assets', 'app-icon.png')
  }
}

const target = targets[platform]
if (!target) {
  throw new Error(`Unknown package target: ${platform || ''}`)
}

function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    ...options
  })
}

function runPnpm(args) {
  if (process.platform === 'win32') {
    execFileSync('pnpm', args, {
      cwd: root,
      stdio: 'inherit',
      shell: true
    })
    return
  }

  run('pnpm', args)
}

function removeIfExists(filePath) {
  fs.rmSync(filePath, { recursive: true, force: true })
}

const releaseDir = path.join(root, 'release')
const appDir = path.join(releaseDir, target.outDir)
const artifactPath = path.join(releaseDir, target.artifact)

removeIfExists(appDir)
removeIfExists(artifactPath)

const packagerArgs = [
  'exec',
  'electron-packager',
  '.package',
  'LingCang',
  `--platform=${target.electronPlatform}`,
  `--arch=${target.arch}`,
  '--out=release',
  '--overwrite',
  '--asar',
  '--prune=true',
  '--app-bundle-id=com.lingcang.browser',
  `--app-version=${version}`,
  '--executable-name=LingCang'
]

if (target.icon) packagerArgs.push(`--icon=${target.icon}`)

runPnpm(packagerArgs)

if (platform === 'mac') {
  runPnpm(['run', 'prune:mac'])
  run('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', path.join(appDir, target.appName), artifactPath])
} else if (platform === 'win') {
  run('powershell', [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path "${appDir}\\*" -DestinationPath "${artifactPath}" -Force`
  ])
} else if (platform === 'linux') {
  run('tar', ['-czf', artifactPath, '-C', releaseDir, target.outDir])
}

console.log(`Packaged ${platform}: ${path.relative(root, artifactPath)}`)
