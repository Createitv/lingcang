import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const stagingDir = path.join(root, '.package')

function copyRecursive(source, destination) {
  const stat = fs.statSync(source)

  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true })
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(destination, entry))
    }
    return
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.copyFileSync(source, destination)
}

fs.rmSync(stagingDir, { recursive: true, force: true })
copyRecursive(path.join(root, 'dist'), path.join(stagingDir, 'dist'))

const stagedRendererHtmlPath = path.join(stagingDir, 'dist', 'renderer.html')
const stagedRendererCssPath = path.join(stagingDir, 'dist', 'tailwind.css')
const stagedRendererJsPath = path.join(stagingDir, 'dist', 'renderer.js')
const rendererHtml = fs.readFileSync(stagedRendererHtmlPath, 'utf8')
const rendererCss = fs.readFileSync(stagedRendererCssPath, 'utf8')
const rendererJs = fs.readFileSync(stagedRendererJsPath, 'utf8')
const inlinedRendererHtml = rendererHtml
  .replace('<link rel="stylesheet" href="./tailwind.css" />', `<style>\n${rendererCss}\n</style>`)
  .replace('<script src="./renderer.js"></script>', `<script>\n${rendererJs}\n</script>`)

fs.writeFileSync(stagedRendererHtmlPath, inlinedRendererHtml)
fs.rmSync(stagedRendererCssPath, { force: true })
fs.rmSync(stagedRendererJsPath, { force: true })

for (const asset of ['app-icon.png', 'app-icon.ico', 'app-logo.svg']) {
  copyRecursive(path.join(root, 'assets', asset), path.join(stagingDir, 'assets', asset))
}

const sourcePackage = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const packageJson = {
  name: sourcePackage.name,
  version: sourcePackage.version,
  private: true,
  productName: sourcePackage.productName,
  description: sourcePackage.description,
  main: sourcePackage.main
}

fs.writeFileSync(path.join(stagingDir, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`)
