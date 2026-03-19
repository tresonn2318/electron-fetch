export const ELECTRON_FETCH_CHANNEL_PREFIX = "electron-fetch:"

export type InteralRequestPayload = {
  id: string
  url: string
  init?: RequestInit
}

export type InternalAPI = {
  request: (payload: InteralRequestPayload) => void
  onStreamChannel: (id: string, callback: (port: MessagePort) => void) => void
}
