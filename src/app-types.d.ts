type PermissionPolicyMode = 'allow' | 'deny'

interface PermissionPolicy {
  default: PermissionPolicyMode
  denied: string[]
}

interface AccountEnvironment {
  profileLabel: string
  acceptLanguage: string
  permissionPolicy: PermissionPolicy
}

interface PlatformConfig {
  id: string
  name: string
  homeUrl: string
  iconText?: string
  iconClass?: string
  iconUrl?: string
  custom?: boolean
  hidden?: boolean
}

interface AccountConfig {
  id: string
  platformId: string
  name: string
  partition: string
  environment?: AccountEnvironment
  lastUrl?: string
  detectedName?: string
  pageTitle?: string
}

interface BrowserTab {
  id: string
  accountId: string
  title: string
  url: string
}

interface AppConfig {
  sidebarCollapsed: boolean
  sidebarWidth: number
  platforms: PlatformConfig[]
  accounts: AccountConfig[]
}

interface PublicAppData {
  platforms: PlatformConfig[]
  accounts: AccountConfig[]
  tabs: BrowserTab[]
  activeAccountId: string | null
  activeTabId: string | null
  sidebarCollapsed: boolean
  sidebarWidth: number
}

interface CreateAccountPayload {
  platformId: string
  name: string
}

interface RenameAccountPayload {
  accountId: string
  name: string
}

interface SetPlatformHiddenPayload {
  platformId: string
  hidden: boolean
}

interface CreatePlatformPayload {
  name: string
  homeUrl: string
}

interface ActiveAccountEvent {
  accountId: string
}

interface NavState {
  accountId: string
  url: string
  canGoBack: boolean
  canGoForward: boolean
}

interface TabTitleEvent {
  accountId: string
  tabId: string
  title: string
}

interface TabsState {
  tabs: BrowserTab[]
  activeTabId: string | null
  activeAccountId: string | null
}

interface SidebarState {
  collapsed: boolean
  width?: number
}

interface BrowserApi {
  getData: () => Promise<PublicAppData>
  createPlatform: (payload: CreatePlatformPayload) => Promise<PlatformConfig>
  createAccount: (payload: CreateAccountPayload) => Promise<AccountConfig>
  renameAccount: (payload: RenameAccountPayload) => Promise<AccountConfig>
  setPlatformHidden: (payload: SetPlatformHiddenPayload) => Promise<PlatformConfig>
  setSidebarCollapsed: (collapsed: boolean) => Promise<void>
  setSidebarWidth: (width: number) => Promise<{ width: number }>
  switchAccount: (accountId: string) => Promise<void>
  switchTab: (tabId: string) => Promise<void>
  closeTab: (tabId: string) => Promise<void>
  navigate: (url: string) => Promise<void>
  goBack: () => Promise<void>
  goForward: () => Promise<void>
  reload: () => Promise<void>
  openDevtools: () => Promise<void>
  onData: (callback: (data: PublicAppData) => void) => void
  onActiveAccount: (callback: (data: ActiveAccountEvent) => void) => void
  onNavState: (callback: (data: NavState) => void) => void
  onTabTitle: (callback: (data: TabTitleEvent) => void) => void
  onTabsState: (callback: (data: TabsState) => void) => void
  onSidebarState: (callback: (data: SidebarState) => void) => void
}

interface Window {
  browserApi: BrowserApi
}
