export const ELECTRON_FETCH_CHANNEL_PREFIX = "electron-fetch:"

export type InteralRequestPayload = {
  id: string
  url: string
  init?: Omit<RequestInit, "signal">
}

export type InternalAPI = {
  request: (payload: InteralRequestPayload) => void
  onStreamChannel: (id: string, callback: (port: MessagePort) => void) => void
  abort: (id: string) => void
}

export const createAbortChannel = (id: string) =>
  `${ELECTRON_FETCH_CHANNEL_PREFIX}abort:${id}`
