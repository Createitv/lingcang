# 灵舱 LingCang

灵舱是一个面向内容创作者和运营团队的多账号隔离浏览器。它把小红书、公众号、知乎、抖音等平台账号放进独立持久会话里，减少反复登录、扫码和切换浏览器的成本。

LingCang is a multi-account workspace browser for creators and operators. It keeps Xiaohongshu, WeChat Official Account, Zhihu, Douyin, and other platform accounts in isolated persistent sessions.

## 下载 / Download

- Landing Page: https://createitv.github.io/lingcang/
- Releases: https://github.com/Createitv/lingcang/releases
- Latest macOS build: https://github.com/Createitv/lingcang/releases/latest

GitHub Actions 会在推送到 `main` 后自动打包 macOS 应用，创建或更新对应版本的 GitHub Release，并部署 landing page。

On every push to `main`, GitHub Actions packages the macOS app, publishes or updates the versioned GitHub Release, and deploys the landing page.

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

打包产物会输出到 `release/LingCang-darwin-x64.zip`。

The packaged app is written to `release/LingCang-darwin-x64.zip`.

## Landing Page

```bash
pnpm run landing:build
```

静态页面源码在 `landing/index.html`，构建输出在 `public/`。页面内置中文和英文切换。

The landing page source lives in `landing/index.html`, builds to `public/`, and includes Chinese/English switching.
