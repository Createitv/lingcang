import { app, BrowserWindow, WebContentsView, ipcMain, session } from 'electron'
import type { IpcMainInvokeEvent, Session, WebContents } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_SIDEBAR_WIDTH = 220
const SIDEBAR_COLLAPSED_WIDTH = 56
const SIDEBAR_MIN_WIDTH = 180
const SIDEBAR_MAX_WIDTH = 420
const TOOLBAR_HEIGHT = 52
const TABBAR_HEIGHT = 36
const DENIED_PERMISSIONS = ['geolocation', 'media', 'notifications', 'midiSysex', 'pointerLock', 'fullscreen']
const APP_ICON_PATH = path.join(__dirname, '../assets/app-icon.png')
const APP_DISPLAY_NAME = '灵舱'

app.setName(APP_DISPLAY_NAME)

const defaultConfig: AppConfig = {
  sidebarCollapsed: false,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  platforms: [
    {
      id: 'xhs',
      name: '小红书',
      homeUrl: 'https://www.xiaohongshu.com',
      iconText: '书',
      iconClass: 'xhs'
    },
    {
      id: 'wechat-mp',
      name: '公众号',
      homeUrl: 'https://mp.weixin.qq.com',
      iconText: '微',
      iconClass: 'wechat'
    },
    {
      id: 'zhihu',
      name: '知乎',
      homeUrl: 'https://www.zhihu.com',
      iconText: '知',
      iconClass: 'zhihu'
    },
    {
      id: 'douyin-creator',
      name: '抖音创作者',
      homeUrl: 'https://creator.douyin.com',
      iconText: '抖',
      iconUrl: 'https://creator.douyin.com/favicon.ico'
    },
    {
      id: 'kuaishou',
      name: '快手',
      homeUrl: 'https://www.kuaishou.com',
      iconText: '快',
      iconUrl: 'https://www.kuaishou.com/favicon.ico'
    },
    {
      id: 'weibo',
      name: '微博',
      homeUrl: 'https://weibo.com',
      iconText: '微',
      iconUrl: 'https://weibo.com/favicon.ico'
    },
    {
      id: 'bilibili',
      name: 'B站',
      homeUrl: 'https://www.bilibili.com',
      iconText: 'B',
      iconUrl: 'https://www.bilibili.com/favicon.ico'
    },
    {
      id: 'youtube-studio',
      name: 'YouTube Studio',
      homeUrl: 'https://studio.youtube.com',
      iconText: 'Y',
      iconUrl: 'https://www.youtube.com/favicon.ico'
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      homeUrl: 'https://www.tiktok.com',
      iconText: 'T',
      iconUrl: 'https://www.tiktok.com/favicon.ico'
    },
    {
      id: 'x-twitter',
      name: 'X',
      homeUrl: 'https://x.com',
      iconText: 'X',
      iconUrl: 'https://x.com/favicon.ico'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      homeUrl: 'https://www.instagram.com',
      iconText: 'I',
      iconUrl: 'https://www.instagram.com/favicon.ico'
    },
    {
      id: 'threads',
      name: 'Threads',
      homeUrl: 'https://www.threads.net',
      iconText: 'T',
      iconUrl: 'https://www.threads.net/favicon.ico'
    },
    {
      id: 'medium',
      name: 'Medium',
      homeUrl: 'https://medium.com',
      iconText: 'M',
      iconUrl: 'https://medium.com/favicon.ico'
    },
    {
      id: 'substack',
      name: 'Substack',
      homeUrl: 'https://substack.com',
      iconText: 'S',
      iconUrl: 'https://substack.com/favicon.ico'
    }
  ],
  accounts: [
    { id: 'account-1', platformId: 'xhs', name: '小红书 1', partition: 'persist:xhs-account-1' },
    {
      id: 'account-2',
      platformId: 'wechat-mp',
      name: '公众号 1',
      partition: 'persist:wechat-mp-account-2'
    },
    { id: 'account-3', platformId: 'zhihu', name: '知乎 1', partition: 'persist:zhihu-account-3' }
  ]
}

interface DetectedIdentity {
  name: string
  title: string
}

let win: BrowserWindow | null = null
let config: AppConfig = clone(defaultConfig)
let configPath = ''
const views = new Map<string, WebContentsView>()
const tabs = new Map<string, BrowserTab>()
const accountTabIds = new Map<string, string[]>()
const activeTabIdByAccount = new Map<string, string>()
const tabIdByWebContentsId = new Map<number, string>()
let activeAccountId: string | null = null
let openingWindow = false

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function normalizeUrl(rawUrl: string): string {
  let url = String(rawUrl || '').trim()
  if (!url) throw new Error('平台网址不能为空')
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`

  try {
    const parsed = new URL(url)
    return parsed.toString()
  } catch {
    throw new Error('平台网址格式不正确')
  }
}

function getFaviconUrl(homeUrl: string): string {
  const parsed = new URL(homeUrl)
  return `${parsed.origin}/favicon.ico`
}

function normalizePlatform(platform: PlatformConfig): PlatformConfig {
  const homeUrl = normalizeUrl(platform.homeUrl)
  return {
    ...platform,
    homeUrl,
    iconText: platform.iconText || platform.name.slice(0, 1).toUpperCase(),
    iconUrl: platform.iconUrl || getFaviconUrl(homeUrl),
    hidden: Boolean(platform.hidden)
  }
}

function mergePlatforms(parsedPlatforms: PlatformConfig[]): PlatformConfig[] {
  const merged = new Map<string, PlatformConfig>()

  for (const platform of defaultConfig.platforms) {
    merged.set(platform.id, normalizePlatform(platform))
  }

  for (const platform of parsedPlatforms) {
    const current = merged.get(platform.id)
    merged.set(platform.id, normalizePlatform({ ...(current || {}), ...platform }))
  }

  return [...merged.values()]
}

function ensureConfig(): void {
  configPath = path.join(app.getPath('userData'), 'browser-data.json')

  if (!fs.existsSync(configPath)) {
    config = clone(defaultConfig)
    config.platforms = mergePlatforms(config.platforms)
    config.accounts = config.accounts.map((account) => normalizeAccount(account))
    saveConfig()
    return
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Partial<AppConfig>
    const parsedPlatforms = Array.isArray(parsed.platforms) ? parsed.platforms : clone(defaultConfig.platforms)

    config = {
      ...clone(defaultConfig),
      ...parsed,
      sidebarWidth: clampSidebarWidth(parsed.sidebarWidth),
      platforms: mergePlatforms(parsedPlatforms),
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : clone(defaultConfig.accounts)
    }
    config.accounts = config.accounts.map((account) => normalizeAccount(account))
    saveConfig()
  } catch {
    config = clone(defaultConfig)
    config.platforms = mergePlatforms(config.platforms)
    config.accounts = config.accounts.map((account) => normalizeAccount(account))
    saveConfig()
  }
}

function saveConfig(): void {
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`)
}

function clampSidebarWidth(width: unknown): number {
  const numericWidth = Number(width)
  if (!Number.isFinite(numericWidth)) return DEFAULT_SIDEBAR_WIDTH
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(numericWidth)))
}

function getSidebarWidth(): number {
  return config?.sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : clampSidebarWidth(config?.sidebarWidth)
}

function getContentBounds(): Electron.Rectangle {
  if (!win) throw new Error('主窗口未初始化')
  const [width = 1280, height = 860] = win.getContentSize()
  const sidebarWidth = getSidebarWidth()

  return {
    x: sidebarWidth,
    y: TOOLBAR_HEIGHT + TABBAR_HEIGHT,
    width: Math.max(320, width - sidebarWidth),
    height: Math.max(240, height - TOOLBAR_HEIGHT - TABBAR_HEIGHT)
  }
}

function send(channel: 'app-data', payload: PublicAppData): void
function send(channel: 'active-account', payload: ActiveAccountEvent): void
function send(channel: 'nav-state', payload: NavState): void
function send(channel: 'tab-title', payload: TabTitleEvent): void
function send(channel: 'tabs-state', payload: TabsState): void
function send(channel: 'sidebar-state', payload: SidebarState): void
function send(channel: string, payload: unknown): void {
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload)
  }
}

function getPublicData(): PublicAppData {
  return {
    platforms: config.platforms,
    accounts: config.accounts,
    tabs: getPublicTabs(),
    activeAccountId,
    activeTabId: getActiveTabId(),
    sidebarCollapsed: config.sidebarCollapsed,
    sidebarWidth: clampSidebarWidth(config.sidebarWidth)
  }
}

function getPublicTabs(): BrowserTab[] {
  return [...tabs.values()]
}

function getActiveTabId(): string | null {
  return activeAccountId ? activeTabIdByAccount.get(activeAccountId) || null : null
}

function sendTabsState(): void {
  send('tabs-state', {
    tabs: getPublicTabs(),
    activeAccountId,
    activeTabId: getActiveTabId()
  })
}

function getPlatformEnvironmentLabel(platformId: string): string {
  const platform =
    config?.platforms?.find((item) => item.id === platformId) ||
    defaultConfig.platforms.find((item) => item.id === platformId)
  return platform ? `${platform.name}默认环境` : '默认环境'
}

function createDefaultEnvironment(platformId: string): AccountEnvironment {
  return {
    profileLabel: getPlatformEnvironmentLabel(platformId),
    acceptLanguage: 'zh-CN,zh;q=0.9,en;q=0.6',
    permissionPolicy: {
      default: 'deny',
      denied: DENIED_PERMISSIONS
    }
  }
}

function normalizeEnvironment(account: AccountConfig): AccountEnvironment {
  const current: Partial<AccountEnvironment> = account.environment || {}
  const defaults = createDefaultEnvironment(account.platformId)

  return {
    ...defaults,
    ...current,
    profileLabel: current.profileLabel || defaults.profileLabel,
    acceptLanguage: current.acceptLanguage || defaults.acceptLanguage,
    permissionPolicy: {
      ...defaults.permissionPolicy,
      ...(current.permissionPolicy || {}),
      denied: Array.isArray(current.permissionPolicy?.denied) ? current.permissionPolicy.denied : defaults.permissionPolicy.denied
    }
  }
}

function normalizeAccount(account: AccountConfig): AccountConfig {
  return {
    ...account,
    environment: normalizeEnvironment(account)
  }
}

function findAccount(accountId: string): AccountConfig | undefined {
  return config.accounts.find((account) => account.id === accountId)
}

function findPlatform(platformId: string): PlatformConfig | undefined {
  return config.platforms.find((platform) => platform.id === platformId)
}

function getAccountStartUrl(account: AccountConfig): string {
  const platform = findPlatform(account.platformId)
  return account.lastUrl || platform?.homeUrl || 'https://www.google.com'
}

function configureAccountSession(account: AccountConfig): Session {
  const accountSession = session.fromPartition(account.partition)
  const environment = normalizeEnvironment(account)

  account.environment = environment

  accountSession.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({
      requestHeaders: {
        ...details.requestHeaders,
        'Accept-Language': environment.acceptLanguage
      }
    })
  })

  accountSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const denied = environment.permissionPolicy.denied || DENIED_PERMISSIONS
    callback(!denied.includes(permission) && environment.permissionPolicy?.default !== 'deny')
  })

  if (typeof accountSession.setPermissionCheckHandler === 'function') {
    accountSession.setPermissionCheckHandler((_webContents, permission) => {
      const denied = environment.permissionPolicy.denied || DENIED_PERMISSIONS
      return !denied.includes(permission) && environment.permissionPolicy?.default !== 'deny'
    })
  }

  return accountSession
}

function detectAccountIdentity(account: AccountConfig, view: WebContentsView): void {
  setTimeout(async () => {
    if (view.webContents.isDestroyed()) return

    try {
      const detected = (await view.webContents.executeJavaScript(`
        (() => {
          const selectors = [
            '.weui-desktop-account__nickname',
            '.account_meta_primary',
            '.account-name',
            '.nickname',
            '.user-name',
            '[class*="nickname"]',
            '[class*="user-name"]',
            '[class*="username"]',
            '[class*="account-name"]',
            '[aria-label*="账号"]',
            '[title*="账号"]'
          ]
          const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim()
          for (const selector of selectors) {
            const element = document.querySelector(selector)
            const text = clean(element?.innerText || element?.textContent || element?.getAttribute?.('aria-label') || element?.getAttribute?.('title'))
            if (text && text.length >= 2 && text.length <= 40) return { name: text, title: document.title }
          }
          return { name: '', title: document.title }
        })()
      `)) as DetectedIdentity

      if (detected?.name) account.detectedName = detected.name
      if (detected?.title) account.pageTitle = detected.title
      saveConfig()
      send('app-data', getPublicData())
    } catch {
      // Some sites block script evaluation; keeping manual naming still works.
    }
  }, 1500)
}

function getTabAccount(tabId: string | undefined): AccountConfig | undefined {
  const tab = tabId ? tabs.get(tabId) : undefined
  return tab ? findAccount(tab.accountId) : undefined
}

function getPopupAccount(opener: WebContents): AccountConfig | undefined {
  return getTabAccount(tabIdByWebContentsId.get(opener.id)) || (activeAccountId ? findAccount(activeAccountId) : undefined)
}

function openPopupAsTab(opener: WebContents, url: string): void {
  if (!url || url === 'about:blank') return

  const account = getPopupAccount(opener)
  if (account) createAccountTab(account, url, true)
}

function installPopupTabHandler(webContents: WebContents): void {
  webContents.setWindowOpenHandler((details) => {
    openPopupAsTab(webContents, details.url)
    return { action: 'deny' }
  })
}

function createAccountTab(account: AccountConfig, url = getAccountStartUrl(account), activate = false): BrowserTab {
  const accountSession = configureAccountSession(account)
  const tabId = `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const tab: BrowserTab = {
    id: tabId,
    accountId: account.id,
    title: account.name,
    url
  }
  const view = new WebContentsView({
    webPreferences: {
      session: accountSession,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  })

  tabs.set(tabId, tab)
  accountTabIds.set(account.id, [...(accountTabIds.get(account.id) || []), tabId])
  views.set(tabId, view)
  tabIdByWebContentsId.set(view.webContents.id, tabId)
  installPopupTabHandler(view.webContents)
  keepViewMounted(view, false)

  view.webContents.on('did-navigate', (_event, url) => {
    tab.url = url
    account.lastUrl = url
    saveConfig()
    if (getActiveTabId() === tabId) send('nav-state', getNavState(tabId, url))
    sendTabsState()
  })

  view.webContents.on('did-navigate-in-page', (_event, url) => {
    tab.url = url
    account.lastUrl = url
    saveConfig()
    if (getActiveTabId() === tabId) send('nav-state', getNavState(tabId, url))
    sendTabsState()
  })

  view.webContents.on('page-title-updated', (_event, title) => {
    tab.title = title || tab.title
    account.pageTitle = title
    saveConfig()
    send('tab-title', { accountId: account.id, tabId, title })
    sendTabsState()
  })

  view.webContents.on('did-finish-load', () => {
    detectAccountIdentity(account, view)
  })

  view.webContents.loadURL(url)
  if (!activeTabIdByAccount.get(account.id) || activate) switchTab(tabId)
  else sendTabsState()
  return tab
}

function getAccountActiveTabId(accountId: string): string | null {
  const currentTabId = activeTabIdByAccount.get(accountId)
  if (currentTabId && tabs.has(currentTabId)) return currentTabId
  return accountTabIds.get(accountId)?.find((tabId) => tabs.has(tabId)) || null
}

function getView(accountId: string): WebContentsView | null {
  const account = findAccount(accountId)
  if (!account) return null
  const tabId = getAccountActiveTabId(accountId) || createAccountTab(account).id
  activeTabIdByAccount.set(accountId, tabId)
  return views.get(tabId) || null
}

function getNavState(tabId: string, url = ''): NavState {
  const view = views.get(tabId)
  const tab = tabs.get(tabId)
  const account = tab ? findAccount(tab.accountId) : undefined
  return {
    accountId: tab?.accountId || activeAccountId || '',
    url: url || view?.webContents.getURL() || tab?.url || (account ? getAccountStartUrl(account) : ''),
    canGoBack: Boolean(view?.webContents.canGoBack()),
    canGoForward: Boolean(view?.webContents.canGoForward())
  }
}

function resizeActiveView(): void {
  const activeTabId = getActiveTabId()
  if (!activeTabId) return
  const activeView = views.get(activeTabId)
  if (activeView) activeView.setBounds(getContentBounds())
}

function keepViewMounted(view: WebContentsView, visible: boolean): void {
  if (!win || view.webContents.isDestroyed()) return

  if (!win.contentView.children.includes(view)) {
    win.contentView.addChildView(view)
  }

  view.setVisible(visible)
  if (!visible) {
    view.setBounds({ x: 0, y: TOOLBAR_HEIGHT + TABBAR_HEIGHT, width: 1, height: 1 })
  }
}

function showTabView(tabId: string, view: WebContentsView): void {
  if (!win) return

  for (const [id, candidateView] of views) {
    if (id !== tabId) keepViewMounted(candidateView, false)
  }

  keepViewMounted(view, true)
  win.contentView.addChildView(view)
  view.setBounds(getContentBounds())
  view.webContents.focus()
}

function switchAccount(accountId: string): void {
  const nextView = getView(accountId)
  if (!nextView || !win) return

  const nextTabId = getAccountActiveTabId(accountId)
  if (!nextTabId) return

  if (activeAccountId === accountId && getActiveTabId() === nextTabId) {
    nextView.setBounds(getContentBounds())
    nextView.webContents.focus()
    send('active-account', { accountId })
    send('nav-state', getNavState(nextTabId))
    sendTabsState()
    return
  }

  activeAccountId = accountId
  activeTabIdByAccount.set(accountId, nextTabId)
  showTabView(nextTabId, nextView)

  send('active-account', { accountId })
  send('nav-state', getNavState(nextTabId))
  sendTabsState()
}

function switchTab(tabId: string): void {
  const tab = tabs.get(tabId)
  const nextView = views.get(tabId)
  if (!tab || !nextView || !win) return

  activeAccountId = tab.accountId
  activeTabIdByAccount.set(tab.accountId, tabId)
  showTabView(tabId, nextView)

  send('active-account', { accountId: tab.accountId })
  send('nav-state', getNavState(tabId))
  sendTabsState()
}

function closeTab(tabId: string): void {
  const tab = tabs.get(tabId)
  const view = views.get(tabId)
  if (!tab) return

  if (view && win) {
    try {
      win.contentView.removeChildView(view)
    } catch {
      // The tab may already be detached from the window.
    }
    view.webContents.close()
  }

  views.delete(tabId)
  tabs.delete(tabId)
  if (view) tabIdByWebContentsId.delete(view.webContents.id)
  accountTabIds.set(
    tab.accountId,
    (accountTabIds.get(tab.accountId) || []).filter((id) => id !== tabId)
  )

  if (activeTabIdByAccount.get(tab.accountId) === tabId) {
    const nextTabId = getAccountActiveTabId(tab.accountId)
    if (nextTabId) {
      switchTab(nextTabId)
    } else {
      const account = findAccount(tab.accountId)
      if (account) switchTab(createAccountTab(account).id)
    }
  } else {
    sendTabsState()
  }
}

function slugify(value: string): string {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function createPlatform({ name, homeUrl }: CreatePlatformPayload): PlatformConfig {
  const platformName = String(name || '').trim()
  const platformUrl = normalizeUrl(homeUrl)
  const platformOrigin = new URL(platformUrl).origin

  if (!platformName) throw new Error('平台名称不能为空')

  const duplicate = config.platforms.find((platform) => {
    try {
      return platform.name === platformName || new URL(platform.homeUrl).origin === platformOrigin
    } catch {
      return platform.name === platformName
    }
  })

  if (duplicate) throw new Error('平台已存在')

  const baseId = slugify(platformName) || `platform-${Date.now()}`
  let id = baseId
  let index = 2
  while (config.platforms.some((platform) => platform.id === id)) {
    id = `${baseId}-${index}`
    index += 1
  }

  const platform = normalizePlatform({
    id,
    name: platformName,
    homeUrl: platformUrl,
    iconText: platformName.slice(0, 1).toUpperCase(),
    iconUrl: getFaviconUrl(platformUrl),
    custom: true
  })

  config.platforms.push(platform)
  saveConfig()
  send('app-data', getPublicData())
  return platform
}

function createAccount({ platformId, name }: CreateAccountPayload): AccountConfig {
  const platform = findPlatform(platformId)
  const accountName = String(name || '').trim()

  if (!platform) throw new Error('平台不存在')
  if (!accountName) throw new Error('账号名称不能为空')

  const id = `account-${Date.now()}`
  const account = {
    id,
    platformId: platform.id,
    name: accountName,
    partition: `persist:${slugify(platform.id)}-${id}`,
    environment: createDefaultEnvironment(platform.id)
  }

  config.accounts.push(account)
  platform.hidden = false
  saveConfig()
  send('app-data', getPublicData())
  return account
}

function setPlatformHidden({ platformId, hidden }: SetPlatformHiddenPayload): PlatformConfig {
  const platform = findPlatform(platformId)

  if (!platform) throw new Error('平台不存在')

  platform.hidden = Boolean(hidden)
  saveConfig()
  send('app-data', getPublicData())
  return platform
}

function renameAccount({ accountId, name }: RenameAccountPayload): AccountConfig {
  const account = findAccount(accountId)
  const accountName = String(name || '').trim()

  if (!account) throw new Error('账号不存在')
  if (!accountName) throw new Error('账号名称不能为空')

  account.name = accountName
  saveConfig()
  send('app-data', getPublicData())
  return account
}

function setSidebarCollapsed(collapsed: boolean): void {
  config.sidebarCollapsed = Boolean(collapsed)
  saveConfig()
  resizeActiveView()
  send('sidebar-state', { collapsed: config.sidebarCollapsed })
  send('app-data', getPublicData())
}

function setSidebarWidth(width: number): { width: number } {
  config.sidebarWidth = clampSidebarWidth(width)
  if (config.sidebarCollapsed) config.sidebarCollapsed = false
  saveConfig()
  resizeActiveView()
  send('sidebar-state', {
    collapsed: config.sidebarCollapsed,
    width: config.sidebarWidth
  })
  send('app-data', getPublicData())
  return { width: config.sidebarWidth }
}

function createWindow(): void {
  ensureConfig()

  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 860,
    minHeight: 560,
    title: APP_DISPLAY_NAME,
    icon: APP_ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  win.loadFile(path.join(__dirname, 'renderer.html'))

  win.on('resize', resizeActiveView)

  win.webContents.once('did-finish-load', () => {
    send('app-data', getPublicData())
    if (config.accounts[0]) switchAccount(config.accounts[0].id)
  })
}

async function openWindowWhenReady(): Promise<void> {
  if (openingWindow || BrowserWindow.getAllWindows().length > 0) return

  openingWindow = true
  await app.whenReady()

  try {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  } finally {
    openingWindow = false
  }
}

ipcMain.handle('get-data', () => getPublicData())

ipcMain.handle('create-platform', (_event: IpcMainInvokeEvent, payload: CreatePlatformPayload) => createPlatform(payload))

ipcMain.handle('create-account', (_event: IpcMainInvokeEvent, payload: CreateAccountPayload) => createAccount(payload))

ipcMain.handle('rename-account', (_event: IpcMainInvokeEvent, payload: RenameAccountPayload) => renameAccount(payload))

ipcMain.handle('set-platform-hidden', (_event: IpcMainInvokeEvent, payload: SetPlatformHiddenPayload) =>
  setPlatformHidden(payload)
)

ipcMain.handle('set-sidebar-collapsed', (_event: IpcMainInvokeEvent, collapsed: boolean) => {
  setSidebarCollapsed(collapsed)
})

ipcMain.handle('set-sidebar-width', (_event: IpcMainInvokeEvent, width: number) => setSidebarWidth(width))

ipcMain.handle('switch-account', (_event: IpcMainInvokeEvent, accountId: string) => {
  switchAccount(accountId)
})

ipcMain.handle('switch-tab', (_event: IpcMainInvokeEvent, tabId: string) => {
  switchTab(tabId)
})

ipcMain.handle('close-tab', (_event: IpcMainInvokeEvent, tabId: string) => {
  closeTab(tabId)
})

ipcMain.handle('navigate', (_event: IpcMainInvokeEvent, rawUrl: string) => {
  const activeTabId = getActiveTabId()
  const view = activeTabId ? views.get(activeTabId) : undefined
  if (!view) return

  let url = String(rawUrl || '').trim()
  if (!url) return
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`

  view.webContents.loadURL(url)
})

ipcMain.handle('go-back', () => {
  const activeTabId = getActiveTabId()
  const view = activeTabId ? views.get(activeTabId) : undefined
  if (view?.webContents.canGoBack()) view.webContents.goBack()
})

ipcMain.handle('go-forward', () => {
  const activeTabId = getActiveTabId()
  const view = activeTabId ? views.get(activeTabId) : undefined
  if (view?.webContents.canGoForward()) view.webContents.goForward()
})

ipcMain.handle('reload', () => {
  const activeTabId = getActiveTabId()
  if (activeTabId) views.get(activeTabId)?.webContents.reload()
})

ipcMain.handle('open-devtools', () => {
  const activeTabId = getActiveTabId()
  if (activeTabId) views.get(activeTabId)?.webContents.openDevTools({ mode: 'detach' })
})

app.on('web-contents-created', (_event, webContents) => {
  if (webContents === win?.webContents) return
  installPopupTabHandler(webContents)
})

openWindowWhenReady()

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  openWindowWhenReady()
})
