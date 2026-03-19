export const ELECTRON_FETCH_CHANNEL_PREFIX = "electron-fetch:"

export type InteralRequestPayload = {
  id: string
  url: string
  init?: Omit<RequestInit, "signal">
}

export type InternalAPI = {
  request: (payload: InteralRequestPayload) => void
  onStream: (id: string, callback: (message: StreamMessage) => void) => void
  abort: (id: string) => void
}

export type StreamMessage =
  | {
      type: "error"
      error: unknown
    }
  | {
      type: "response"
      status: number
      statusText: string
      headers: HeadersInit
    }
  | {
      type: "chunk"
      value: Uint8Array
    }
  | {
      type: "end"
    }

export const createAbortChannel = (id: string) =>
  `${ELECTRON_FETCH_CHANNEL_PREFIX}abort:${id}`
