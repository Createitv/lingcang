# 灵舱 LingCang

灵舱是一个面向内容创作者和运营团队的多账号隔离浏览器。它把小红书、公众号、知乎、抖音等平台账号放进独立持久会话里，减少反复登录、扫码和切换浏览器的成本。

## 本地运行

```bash
pnpm install
pnpm start
```

## 打包 macOS

```bash
pnpm run package:mac
```

打包产物会输出到 `release/LingCang-darwin-x64.zip`。

## Landing Page

```bash
pnpm run landing:build
```

静态页面源码在 `landing/index.html`，构建输出在 `public/`。GitHub Actions 会在推送到 `main` 后部署 GitHub Pages，并上传 macOS 打包产物。
