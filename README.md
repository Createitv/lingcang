# 灵舱 LingCang

灵舱是一个面向内容创作者和运营团队的多账号隔离浏览器。它把小红书、公众号、知乎、抖音等平台账号放进独立持久会话里，减少反复登录、扫码和切换浏览器的成本。当前支持 macOS、Windows 和 Linux 桌面端自动打包发布。

LingCang is a multi-account workspace browser for creators and operators. It keeps Xiaohongshu, WeChat Official Account, Zhihu, Douyin, and other platform accounts in isolated persistent sessions. macOS, Windows, and Linux desktop builds are packaged and released automatically.

## 下载 / Download

- Landing Page: https://createitv.github.io/lingcang/
- Releases: https://github.com/Createitv/lingcang/releases
- Latest macOS build: https://github.com/Createitv/lingcang/releases/latest/download/LingCang-macOS-x64.zip
- Latest Windows build: https://github.com/Createitv/lingcang/releases/latest/download/LingCang-Windows-x64.zip
- Latest Linux build: https://github.com/Createitv/lingcang/releases/latest/download/LingCang-Linux-x64.tar.gz

GitHub Actions 会在推送到 `main` 后自动打包三端应用，创建或更新对应版本的 GitHub Release，并部署 landing page。

On every push to `main`, GitHub Actions packages the macOS, Windows, and Linux apps, publishes or updates the versioned GitHub Release, and deploys the landing page.

## 本地运行

## Local Development

```bash
pnpm install
pnpm start
```

## 打包 macOS

## Package for macOS

```bash
pnpm run package:mac
```

打包产物会输出到 `release/LingCang-macOS-x64.zip`。

The packaged app is written to `release/LingCang-macOS-x64.zip`.

## 打包 Windows / Linux

## Package for Windows / Linux

```bash
pnpm run package:win
pnpm run package:linux
```

Windows 产物输出到 `release/LingCang-Windows-x64.zip`，Linux 产物输出到 `release/LingCang-Linux-x64.tar.gz`。

The Windows build is written to `release/LingCang-Windows-x64.zip`; the Linux build is written to `release/LingCang-Linux-x64.tar.gz`.

## Landing Page

```bash
pnpm run landing:build
```

静态页面源码在 `landing/index.html`，构建输出在 `public/`。页面内置中文和英文切换，并会自动识别访客系统，推荐 macOS、Windows 或 Linux 对应下载。

The landing page source lives in `landing/index.html`, builds to `public/`, includes Chinese/English switching, and recommends the correct macOS, Windows, or Linux download for the visitor's system.
