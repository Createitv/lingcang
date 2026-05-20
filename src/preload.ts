import { contextBridge, ipcRenderer } from 'electron'

const browserApi: BrowserApi = {
  getData: () => ipcRenderer.invoke('get-data'),
  createPlatform: (payload: CreatePlatformPayload) => ipcRenderer.invoke('create-platform', payload),
  createAccount: (payload: CreateAccountPayload) => ipcRenderer.invoke('create-account', payload),
  renameAccount: (payload: RenameAccountPayload) => ipcRenderer.invoke('rename-account', payload),
  setPlatformHidden: (payload: SetPlatformHiddenPayload) => ipcRenderer.invoke('set-platform-hidden', payload),
  setSidebarCollapsed: (collapsed: boolean) => ipcRenderer.invoke('set-sidebar-collapsed', collapsed),
  setSidebarWidth: (width: number) => ipcRenderer.invoke('set-sidebar-width', width),
  switchAccount: (accountId: string) => ipcRenderer.invoke('switch-account', accountId),
  switchTab: (tabId: string) => ipcRenderer.invoke('switch-tab', tabId),
  closeTab: (tabId: string) => ipcRenderer.invoke('close-tab', tabId),
  navigate: (url: string) => ipcRenderer.invoke('navigate', url),
  goBack: () => ipcRenderer.invoke('go-back'),
  goForward: () => ipcRenderer.invoke('go-forward'),
  reload: () => ipcRenderer.invoke('reload'),
  openDevtools: () => ipcRenderer.invoke('open-devtools'),
  onData: (callback: (data: PublicAppData) => void) => {
    ipcRenderer.on('app-data', (_event, data: PublicAppData) => callback(data))
  },
  onActiveAccount: (callback: (data: ActiveAccountEvent) => void) => {
    ipcRenderer.on('active-account', (_event, data: ActiveAccountEvent) => callback(data))
  },
  onNavState: (callback: (data: NavState) => void) => {
    ipcRenderer.on('nav-state', (_event, data: NavState) => callback(data))
  },
  onTabTitle: (callback: (data: TabTitleEvent) => void) => {
    ipcRenderer.on('tab-title', (_event, data: TabTitleEvent) => callback(data))
  },
  onTabsState: (callback: (data: TabsState) => void) => {
    ipcRenderer.on('tabs-state', (_event, data: TabsState) => callback(data))
  },
  onSidebarState: (callback: (data: SidebarState) => void) => {
    ipcRenderer.on('sidebar-state', (_event, data: SidebarState) => callback(data))
  }
}

contextBridge.exposeInMainWorld('browserApi', browserApi)
