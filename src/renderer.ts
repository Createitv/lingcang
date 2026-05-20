function getElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing element: ${selector}`)
  return element
}

type Locale = 'zh' | 'en'

const locale: Locale = navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
const messages: Record<Locale, Record<string, string>> = {
  zh: {
    appName: '灵舱',
    addAccount: '新增账号',
    addPlatform: '新增平台',
    addAccountMenu: '新增账户',
    hidePlatform: '隐藏平台',
    platform: '平台',
    platformName: '平台名称',
    platformUrl: '平台网址',
    accountName: '账号名称',
    cancel: '取消',
    create: '创建',
    createFailed: '创建失败',
    unopened: '未打开',
    closeTab: '关闭标签',
    collapseSidebar: '折叠侧栏',
    expandSidebar: '展开侧栏',
    resizeSidebar: '拖动调整宽度',
    back: '后退',
    forward: '前进',
    reload: '刷新',
    newTab: '新建标签页',
    loadExtension: '扩展',
    extensionLoaded: '扩展已加载'
  },
  en: {
    appName: 'LingCang',
    addAccount: 'Add account',
    addPlatform: 'Add platform',
    addAccountMenu: 'Add account',
    hidePlatform: 'Hide platform',
    platform: 'Platform',
    platformName: 'Platform name',
    platformUrl: 'Platform URL',
    accountName: 'Account name',
    cancel: 'Cancel',
    create: 'Create',
    createFailed: 'Create failed',
    unopened: 'Not opened',
    closeTab: 'Close tab',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar',
    resizeSidebar: 'Drag to resize',
    back: 'Back',
    forward: 'Forward',
    reload: 'Reload',
    newTab: 'New tab',
    loadExtension: 'Extensions',
    extensionLoaded: 'Extension loaded'
  }
}

function t(key: string): string {
  return messages[locale][key] || messages.zh[key] || key
}

function applyLocale(): void {
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
  document.title = t('appName')

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n || '')
  })

  document.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((element) => {
    element.title = t(element.dataset.i18nTitle || '')
  })
}

const toolbarEl = getElement<HTMLElement>('#toolbar')
const tabbarEl = getElement<HTMLElement>('#tabbar')
const platformsEl = getElement<HTMLElement>('#platforms')
const addressForm = getElement<HTMLFormElement>('#addressForm')
const addressInput = getElement<HTMLInputElement>('#address')
const backButton = getElement<HTMLButtonElement>('#back')
const forwardButton = getElement<HTMLButtonElement>('#forward')
const reloadButton = getElement<HTMLButtonElement>('#reload')
const newTabButton = getElement<HTMLButtonElement>('#newTab')
const loadExtensionButton = getElement<HTMLButtonElement>('#loadExtension')
const addAccountButton = getElement<HTMLButtonElement>('#addAccount')
const addPlatformButton = getElement<HTMLButtonElement>('#addPlatform')
const collapseSidebarButton = getElement<HTMLButtonElement>('#collapseSidebar')
const expandSidebarButton = getElement<HTMLButtonElement>('#expandSidebar')
const accountForm = getElement<HTMLFormElement>('#accountForm')
const platformForm = getElement<HTMLFormElement>('#platformForm')
const platformSelect = getElement<HTMLSelectElement>('#platformSelect')
const accountNameInput = getElement<HTMLInputElement>('#accountName')
const platformNameInput = getElement<HTMLInputElement>('#platformName')
const platformUrlInput = getElement<HTMLInputElement>('#platformUrl')
const cancelAccountButton = getElement<HTMLButtonElement>('#cancelAccount')
const cancelPlatformButton = getElement<HTMLButtonElement>('#cancelPlatform')
const formError = getElement<HTMLElement>('#formError')
const platformFormError = getElement<HTMLElement>('#platformFormError')
const sidebarResizeHandle = getElement<HTMLElement>('#sidebarResizeHandle')
const platformContextMenu = document.createElement('div')

let platforms: PlatformConfig[] = []
let accounts: AccountConfig[] = []
let tabs: BrowserTab[] = []
let activeAccountId: string | null = null
let activeTabId: string | null = null
let sidebarCollapsed = false
let sidebarWidth = 220
let editingAccountId: string | null = null
const titles = new Map<string, string>()
const collapsedPlatformIds = new Set<string>()
let contextPlatformId: string | null = null

platformContextMenu.className = 'context-menu hidden'
platformContextMenu.innerHTML = `
  <button class="context-menu-item" type="button" data-action="add-account">${t('addAccountMenu')}</button>
  <button class="context-menu-item danger" type="button" data-action="hide-platform">${t('hidePlatform')}</button>
`
document.body.append(platformContextMenu)
applyLocale()

function iconText(value: string): string {
  return String(value || '?').trim().slice(0, 1).toUpperCase()
}

function escapeAttribute(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeText(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function setInlineFormOpen(form: HTMLFormElement, open: boolean): void {
  form.classList.toggle('hidden', !open)
}

function setAccountFormOpen(open: boolean): void {
  setInlineFormOpen(accountForm, open)
  if (open) {
    setInlineFormOpen(platformForm, false)
    formError.textContent = ''
    accountNameInput.focus()
  }
}

function setPlatformFormOpen(open: boolean): void {
  setInlineFormOpen(platformForm, open)
  if (open) {
    setInlineFormOpen(accountForm, false)
    platformFormError.textContent = ''
    platformNameInput.focus()
  }
}

function closePlatformContextMenu(): void {
  contextPlatformId = null
  platformContextMenu.classList.add('hidden')
}

function openPlatformContextMenu(platform: PlatformConfig, event: MouseEvent): void {
  event.preventDefault()
  event.stopPropagation()
  contextPlatformId = platform.id

  platformContextMenu.classList.remove('hidden')
  const menuWidth = platformContextMenu.offsetWidth || 150
  const menuHeight = platformContextMenu.offsetHeight || 84
  const left = Math.min(event.clientX, window.innerWidth - menuWidth - 8)
  const top = Math.min(event.clientY, window.innerHeight - menuHeight - 8)

  platformContextMenu.style.left = `${Math.max(8, left)}px`
  platformContextMenu.style.top = `${Math.max(8, top)}px`
}

function applySidebarWidth(): void {
  document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`)
}

function applySidebarState(): void {
  applySidebarWidth()
  document.body.classList.toggle('sidebar-collapsed', sidebarCollapsed)
  collapseSidebarButton.classList.toggle('hidden', sidebarCollapsed)
  expandSidebarButton.classList.toggle('hidden', !sidebarCollapsed)
  toolbarEl.classList.toggle('collapsed', sidebarCollapsed)
}

function getAccountStatus(account: AccountConfig): string {
  let status = ''

  if (account.detectedName && account.detectedName !== account.name) status = account.detectedName
  if (!status && account.pageTitle && account.pageTitle !== account.name) status = account.pageTitle

  const title = titles.get(account.id)
  if (!status && title && title !== account.name) status = title

  if (!status) {
    try {
      const url = account.lastUrl || platforms.find((platform) => platform.id === account.platformId)?.homeUrl
      status = url ? new URL(url).hostname.replace(/^www\./, '') : t('unopened')
    } catch {
      status = t('unopened')
    }
  }

  const environmentLabel = account.environment?.profileLabel
  return environmentLabel ? `${status} · ${environmentLabel}` : status
}

function getPlatformIconMarkup(platform: PlatformConfig): string {
  const fallbackText = platform.iconText || iconText(platform.name)
  const iconClass = escapeAttribute(platform.iconClass || '')

  if (platform.iconUrl) {
    return `
      <span class="avatar platform-icon ${iconClass}">
        <img class="platform-logo" src="${escapeAttribute(platform.iconUrl)}" alt="" data-fallback="${escapeAttribute(fallbackText)}" />
      </span>
    `
  }

  return `<span class="avatar platform-icon ${iconClass}">${escapeText(fallbackText)}</span>`
}

function beginRename(account: AccountConfig): void {
  if (sidebarCollapsed) {
    window.browserApi.setSidebarCollapsed(false)
    sidebarCollapsed = false
    applySidebarState()
  }
  editingAccountId = account.id
  renderPlatforms()
}

async function commitRename(accountId: string, value: string): Promise<void> {
  const nextName = String(value || '').trim()
  const account = accounts.find((item) => item.id === accountId)

  if (!account || !nextName || nextName === account.name) {
    editingAccountId = null
    renderPlatforms()
    return
  }

  await window.browserApi.renameAccount({ accountId, name: nextName })
  editingAccountId = null
}

function renderPlatformOptions(): void {
  platformSelect.innerHTML = ''

  for (const platform of platforms) {
    const option = document.createElement('option')
    option.value = platform.id
    option.textContent = platform.name
    platformSelect.append(option)
  }
}

function renderPlatforms(): void {
  platformsEl.innerHTML = ''

  for (const platform of platforms) {
    const platformAccounts = accounts.filter((account) => account.platformId === platform.id)
    if (platform.hidden || platformAccounts.length === 0) continue

    const section = document.createElement('section')
    section.className = 'platform-section'

    const header = document.createElement('button')
    header.className = 'platform-header'
    header.type = 'button'
    header.title = platform.name
    header.innerHTML = `
      ${getPlatformIconMarkup(platform)}
      <span class="platform-name">${escapeText(platform.name)}</span>
      <span class="platform-count">${platformAccounts.length}</span>
    `
    const logo = header.querySelector<HTMLImageElement>('.platform-logo')
    logo?.addEventListener('error', () => {
      const fallback = logo.dataset.fallback || iconText(platform.name)
      const parent = logo.parentElement
      logo.remove()
      if (parent) parent.textContent = fallback
    })
    header.addEventListener('click', () => {
      if (sidebarCollapsed) return
      if (collapsedPlatformIds.has(platform.id)) {
        collapsedPlatformIds.delete(platform.id)
      } else {
        collapsedPlatformIds.add(platform.id)
      }
      renderPlatforms()
    })
    header.addEventListener('contextmenu', (event) => {
      openPlatformContextMenu(platform, event)
    })

    const list = document.createElement('div')
    list.className = 'account-list'
    if (collapsedPlatformIds.has(platform.id) && !sidebarCollapsed) list.classList.add('hidden')

    for (const account of platformAccounts) {
      const button = document.createElement('button')
      button.className = `account-button${account.id === activeAccountId ? ' active' : ''}`
      button.type = 'button'
      button.title = account.name

      if (editingAccountId === account.id) {
        button.classList.add('editing')
        button.innerHTML = `
          <span class="avatar small">${escapeText(iconText(account.name))}</span>
          <input class="rename-input" value="${escapeAttribute(account.name)}" />
        `

        const input = button.querySelector<HTMLInputElement>('.rename-input')
        if (!input) return
        input.addEventListener('click', (event) => event.stopPropagation())
        input.addEventListener('keydown', (event: KeyboardEvent) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commitRename(account.id, input.value)
          }
          if (event.key === 'Escape') {
            editingAccountId = null
            renderPlatforms()
          }
        })
        input.addEventListener('blur', () => commitRename(account.id, input.value))
        queueMicrotask(() => {
          input.focus()
          input.select()
        })
      } else {
        button.innerHTML = `
          <span class="avatar small">${escapeText(iconText(account.name))}</span>
          <span class="account-text">
            <span class="account-name">${escapeText(account.name)}</span>
            <span class="account-status">${escapeText(getAccountStatus(account))}</span>
          </span>
        `
        button.addEventListener('click', () => {
          window.browserApi.switchAccount(account.id)
        })
        button.addEventListener('dblclick', (event) => {
          event.preventDefault()
          event.stopPropagation()
          beginRename(account)
        })
        button.addEventListener('contextmenu', (event) => {
          event.preventDefault()
          beginRename(account)
        })
      }
      list.append(button)
    }

    section.append(header, list)
    platformsEl.append(section)
  }
}

function renderTabs(): void {
  tabbarEl.innerHTML = ''
  const accountTabs = tabs.filter((tab) => tab.accountId === activeAccountId)

  for (const tab of accountTabs) {
    const button = document.createElement('button')
    button.className = `tab-button${tab.id === activeTabId ? ' active' : ''}`
    button.type = 'button'
    button.title = tab.title || tab.url
    button.innerHTML = `
      <span class="tab-title">${escapeText(tab.title || new URL(tab.url || 'https://example.com').hostname)}</span>
      <span class="tab-close" title="${escapeAttribute(t('closeTab'))}">×</span>
    `
    button.addEventListener('click', () => {
      window.browserApi.switchTab(tab.id)
    })
    button.querySelector('.tab-close')?.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      window.browserApi.closeTab(tab.id)
    })
    tabbarEl.append(button)
  }
}

function renderAll(): void {
  applySidebarState()
  renderPlatformOptions()
  renderPlatforms()
  renderTabs()
}

function setData(data: PublicAppData): void {
  platforms = data.platforms || []
  accounts = data.accounts || []
  tabs = data.tabs || []
  activeAccountId = data.activeAccountId || activeAccountId
  activeTabId = data.activeTabId || activeTabId
  sidebarCollapsed = Boolean(data.sidebarCollapsed)
  sidebarWidth = Number(data.sidebarWidth) || sidebarWidth
  renderAll()
}

function openAccountDialog(platformId?: string): void {
  formError.textContent = ''
  accountNameInput.value = ''
  renderPlatformOptions()
  if (platformId && platforms.some((platform) => platform.id === platformId)) {
    platformSelect.value = platformId
  }
  if (sidebarCollapsed) {
    window.browserApi.setSidebarCollapsed(false)
    sidebarCollapsed = false
    applySidebarState()
  }
  setAccountFormOpen(true)
}

function openPlatformDialog(): void {
  platformFormError.textContent = ''
  platformNameInput.value = ''
  platformUrlInput.value = ''
  if (sidebarCollapsed) {
    window.browserApi.setSidebarCollapsed(false)
    sidebarCollapsed = false
    applySidebarState()
  }
  setPlatformFormOpen(true)
}

window.browserApi.getData().then(setData)
window.browserApi.onData(setData)

platformContextMenu.addEventListener('click', async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]')
  if (!button || !contextPlatformId) return

  const platformId = contextPlatformId
  closePlatformContextMenu()

  if (button.dataset.action === 'add-account') {
    openAccountDialog(platformId)
    return
  }

  if (button.dataset.action === 'hide-platform') {
    await window.browserApi.setPlatformHidden({ platformId, hidden: true })
  }
})

document.addEventListener('click', (event) => {
  if (!platformContextMenu.contains(event.target as Node)) closePlatformContextMenu()
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closePlatformContextMenu()
})

window.addEventListener('blur', closePlatformContextMenu)
window.addEventListener('resize', closePlatformContextMenu)

window.browserApi.onActiveAccount(({ accountId }) => {
  activeAccountId = accountId
  renderPlatforms()
  renderTabs()
})

window.browserApi.onSidebarState((state) => {
  sidebarCollapsed = Boolean(state.collapsed)
  if (state.width) sidebarWidth = Number(state.width)
  applySidebarState()
  renderPlatforms()
})

window.browserApi.onNavState((state) => {
  if (state.accountId !== activeAccountId) return
  addressInput.value = state.url
  backButton.disabled = !state.canGoBack
  forwardButton.disabled = !state.canGoForward
})

window.browserApi.onTabTitle(({ accountId, title }) => {
  if (title) titles.set(accountId, title)
  renderPlatforms()
})

window.browserApi.onTabsState((state) => {
  tabs = state.tabs
  activeTabId = state.activeTabId
  activeAccountId = state.activeAccountId || activeAccountId
  renderTabs()
})

addressForm.addEventListener('submit', (event) => {
  event.preventDefault()
  window.browserApi.navigate(addressInput.value)
})

accountForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  formError.textContent = ''

  try {
    const account = await window.browserApi.createAccount({
      platformId: platformSelect.value,
      name: accountNameInput.value
    })
    setAccountFormOpen(false)
    await window.browserApi.switchAccount(account.id)
  } catch (error) {
    formError.textContent = error instanceof Error ? error.message : t('createFailed')
  }
})

platformForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  platformFormError.textContent = ''

  try {
    const platform = await window.browserApi.createPlatform({
      name: platformNameInput.value,
      homeUrl: platformUrlInput.value
    })
    if (!platforms.some((item) => item.id === platform.id)) {
      platforms = [...platforms, platform]
      renderAll()
    }
    setPlatformFormOpen(false)
    platformSelect.value = platform.id
  } catch (error) {
    platformFormError.textContent = error instanceof Error ? error.message : t('createFailed')
  }
})

addAccountButton.addEventListener('click', () => openAccountDialog())
addPlatformButton.addEventListener('click', openPlatformDialog)
cancelAccountButton.addEventListener('click', () => setAccountFormOpen(false))
cancelPlatformButton.addEventListener('click', () => setPlatformFormOpen(false))
collapseSidebarButton.addEventListener('click', () => window.browserApi.setSidebarCollapsed(true))
expandSidebarButton.addEventListener('click', () => window.browserApi.setSidebarCollapsed(false))
backButton.addEventListener('click', () => window.browserApi.goBack())
forwardButton.addEventListener('click', () => window.browserApi.goForward())
reloadButton.addEventListener('click', () => window.browserApi.reload())
newTabButton.addEventListener('click', () => window.browserApi.newTab())
loadExtensionButton.addEventListener('click', async () => {
  const result = await window.browserApi.loadExtension()
  if (!result) return
  loadExtensionButton.textContent = result.loaded ? t('extensionLoaded') : t('loadExtension')
  loadExtensionButton.title = result.error || result.name
  window.setTimeout(() => {
    loadExtensionButton.textContent = t('loadExtension')
  }, 1800)
})

sidebarResizeHandle.addEventListener('pointerdown', (event: PointerEvent) => {
  event.preventDefault()
  sidebarResizeHandle.setPointerCapture(event.pointerId)
  document.body.classList.add('resizing-sidebar')

  const move = (moveEvent: PointerEvent): void => {
    sidebarCollapsed = false
    sidebarWidth = Math.min(420, Math.max(180, moveEvent.clientX))
    applySidebarState()
    window.browserApi.setSidebarWidth(sidebarWidth)
  }

  const stop = (): void => {
    document.body.classList.remove('resizing-sidebar')
    sidebarResizeHandle.removeEventListener('pointermove', move)
    sidebarResizeHandle.removeEventListener('pointerup', stop)
    sidebarResizeHandle.removeEventListener('pointercancel', stop)
  }

  sidebarResizeHandle.addEventListener('pointermove', move)
  sidebarResizeHandle.addEventListener('pointerup', stop)
  sidebarResizeHandle.addEventListener('pointercancel', stop)
})
